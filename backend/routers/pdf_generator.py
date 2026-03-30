"""
PDF Generator Router - Generate professional PDF invoices

This module handles PDF generation for tax invoices using reportlab.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
from io import BytesIO
import base64
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas
import tempfile
import os

from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class InvoiceItem(BaseModel):
    """Invoice item model."""
    item_name: str
    hsn_code: Optional[str] = None
    quantity: float
    unit_price: float
    discount_amount: Optional[float] = 0
    gst_rate: Optional[float] = 0
    cgst_rate: Optional[float] = 0
    sgst_rate: Optional[float] = 0
    igst_rate: Optional[float] = 0


class CustomerInfo(BaseModel):
    """Customer information model."""
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None


class OrganizationInfo(BaseModel):
    """Organization information model."""
    company_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    bank_account_holder_name: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    tax_invoice_color: Optional[str] = "#4c1d95"
    rcm_applicable: Optional[bool] = False
    logo_data: Optional[str] = None


class GeneratePDFRequest(BaseModel):
    """Request model for generating PDF invoice."""
    invoice_number: str
    invoice_date: str
    due_date: Optional[str] = None
    payment_terms: Optional[str] = "Immediate"
    notes: Optional[str] = None
    freight_charges: Optional[float] = 0
    freight_gst_rate: Optional[float] = 0
    items: List[InvoiceItem]
    customer: CustomerInfo
    organization: OrganizationInfo
    signature_name: Optional[str] = None
    signature_style: Optional[str] = "handwritten"


def convert_number_to_words(amount: float) -> str:
    """Convert a number to words (Indian numbering system)."""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    def convert(n: int) -> str:
        if n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + (' ' + ones[n % 10] if n % 10 else '')
        elif n < 1000:
            return ones[n // 100] + ' Hundred' + (' and ' + convert(n % 100) if n % 100 else '')
        elif n < 100000:
            return convert(n // 1000) + ' Thousand' + (' ' + convert(n % 1000) if n % 1000 else '')
        elif n < 10000000:
            return convert(n // 100000) + ' Lakh' + (' ' + convert(n % 100000) if n % 100000 else '')
        else:
            return convert(n // 10000000) + ' Crore' + (' ' + convert(n % 10000000) if n % 10000000 else '')
    
    rupees = int(amount)
    paise = round((amount - rupees) * 100)
    
    result = convert(rupees) + ' Rupees'
    if paise > 0:
        result += ' and ' + convert(paise) + ' Paise'
    
    return result


def get_signature_style_css(style: str) -> str:
    """Get CSS for signature style."""
    styles = {
        'cursive': "font-family: cursive; font-size: 26px;",
        'print': "font-family: 'Times New Roman', Times, serif; font-size: 24px; font-weight: 600;",
        'mono': "font-family: 'Courier New', monospace; font-size: 22px; font-weight: 600;",
        'elegant': "font-family: Georgia, serif; font-size: 26px; font-style: italic; font-weight: 500;",
        'calligraphy': "font-family: cursive; font-size: 28px; font-weight: 400;",
        'bold-script': "font-family: cursive; font-size: 28px; font-weight: 700;",
        'italic-serif': "font-family: Georgia, serif; font-size: 24px; font-style: italic; font-weight: 600;",
        'handwritten': "font-family: cursive; font-size: 28px; font-weight: 500;",
    }
    return styles.get(style, styles['handwritten'])


def generate_invoice_html(data: GeneratePDFRequest) -> str:
    """Generate HTML for the invoice."""
    
    # Get accent color
    accent_color = data.organization.tax_invoice_color or "#4c1d95"
    
    # Calculate darker border color
    hex_color = accent_color.replace('#', '')
    r = max(0, int(hex_color[0:2], 16) - 30)
    g = max(0, int(hex_color[2:4], 16) - 30)
    b = max(0, int(hex_color[4:6], 16) - 30)
    darker_border = f"#{r:02x}{g:02x}{b:02x}"
    
    # Customer name
    customer = data.customer
    customer_name = customer.company_name or f"{customer.first_name or ''} {customer.last_name or ''}".strip() or "Customer"
    
    # Determine GST type
    customer_state = (customer.state or '').lower()
    org_state = (data.organization.state or '').lower()
    is_inter_state = customer_state != org_state and customer_state and org_state
    
    # Calculate item totals with GST breakdown
    items_data = []
    subtotal = 0
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    
    for item in data.items:
        base_amount = (item.quantity * item.unit_price) - (item.discount_amount or 0)
        subtotal += base_amount
        
        gst_rate = item.gst_rate or 0
        if not gst_rate and item.igst_rate:
            gst_rate = item.igst_rate
        elif not gst_rate and item.cgst_rate and item.sgst_rate:
            gst_rate = item.cgst_rate + item.sgst_rate
        
        if gst_rate > 0:
            if is_inter_state:
                igst_amount = (base_amount * gst_rate) / 100
                total_igst += igst_amount
            else:
                cgst_amount = (base_amount * (gst_rate / 2)) / 100
                sgst_amount = (base_amount * (gst_rate / 2)) / 100
                total_cgst += cgst_amount
                total_sgst += sgst_amount
        
        items_data.append({
            'name': item.item_name,
            'hsn': item.hsn_code or '-',
            'qty': item.quantity,
            'rate': item.unit_price,
            'amount': base_amount,
            'gst_rate': gst_rate
        })
    
    # Freight calculations
    freight_charges = data.freight_charges or 0
    freight_gst_rate = data.freight_gst_rate or 0
    freight_gst = (freight_charges * freight_gst_rate) / 100
    
    if is_inter_state:
        total_igst += freight_gst
    else:
        total_cgst += freight_gst / 2
        total_sgst += freight_gst / 2
    
    total_tax = total_cgst + total_sgst + total_igst
    total_amount = subtotal + freight_charges + total_tax
    
    # Calculate effective GST percentages
    gst_base = subtotal + (freight_charges if freight_gst_rate > 0 else 0)
    effective_igst_pct = (total_igst / gst_base * 100) if gst_base > 0 else 0
    effective_cgst_pct = (total_cgst / gst_base * 100) if gst_base > 0 else 0
    effective_sgst_pct = (total_sgst / gst_base * 100) if gst_base > 0 else 0
    
    # Round all values
    subtotal = round(subtotal, 2)
    total_cgst = round(total_cgst, 2)
    total_sgst = round(total_sgst, 2)
    total_igst = round(total_igst, 2)
    total_tax = round(total_tax, 2)
    total_amount = round(total_amount, 2)
    
    # Format dates
    invoice_date = data.invoice_date
    try:
        dt = datetime.fromisoformat(invoice_date.replace('Z', '+00:00'))
        invoice_date_formatted = dt.strftime('%d %b %Y')
    except:
        invoice_date_formatted = invoice_date
    
    due_date = data.due_date or invoice_date
    try:
        dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        due_date_formatted = dt.strftime('%d %b %Y')
    except:
        due_date_formatted = due_date
    
    # Signature
    signature_name = data.signature_name or ''
    signature_css = get_signature_style_css(data.signature_style or 'handwritten')
    
    # Organization info
    org = data.organization
    
    # Build items rows
    items_html = ""
    for idx, item in enumerate(items_data, 1):
        items_html += f"""
        <tr>
            <td style="text-align: center;">{idx}</td>
            <td><div style="font-weight: bold;">{item['name']}</div></td>
            <td style="text-align: center;">{item['hsn']}</td>
            <td style="text-align: center;">{item['qty']}</td>
            <td style="text-align: right;">₹{item['rate']:,.2f}</td>
            <td style="text-align: right;">₹{item['amount']:,.2f}</td>
        </tr>
        """
    
    # Build GST rows
    gst_rows = ""
    if is_inter_state:
        pct_display = f"{effective_igst_pct:.0f}" if effective_igst_pct % 1 == 0 else f"{effective_igst_pct:.1f}"
        gst_rows = f"""
        <tr>
            <td style="font-weight: bold; color: #555;">Add : IGST ({pct_display}%)</td>
            <td style="text-align: right; font-weight: bold;">₹{total_igst:,.2f}</td>
        </tr>
        """
    else:
        cgst_pct = f"{effective_cgst_pct:.0f}" if effective_cgst_pct % 1 == 0 else f"{effective_cgst_pct:.1f}"
        sgst_pct = f"{effective_sgst_pct:.0f}" if effective_sgst_pct % 1 == 0 else f"{effective_sgst_pct:.1f}"
        gst_rows = f"""
        <tr>
            <td style="font-weight: bold; color: #555;">Add : CGST ({cgst_pct}%)</td>
            <td style="text-align: right; font-weight: bold;">₹{total_cgst:,.2f}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; color: #555;">Add : SGST ({sgst_pct}%)</td>
            <td style="text-align: right; font-weight: bold;">₹{total_sgst:,.2f}</td>
        </tr>
        """
    
    # Bank details HTML
    bank_html = ""
    if org.bank_name or org.bank_account_number or org.bank_ifsc_code:
        bank_items = ""
        if org.bank_name:
            bank_items += f'<div style="flex: 1; font-size: 11px;"><strong>Bank Name:</strong><br>{org.bank_name}</div>'
        if org.bank_account_number:
            bank_items += f'<div style="flex: 1; font-size: 11px;"><strong>Account Number:</strong><br>{org.bank_account_number}</div>'
        if org.bank_ifsc_code:
            bank_items += f'<div style="flex: 1; font-size: 11px;"><strong>IFSC Code:</strong><br>{org.bank_ifsc_code}</div>'
        
        account_holder = ""
        if org.bank_account_holder_name:
            account_holder = f'<div style="margin-top: 4px; font-size: 11px; color: #666;"><strong>Account Holder:</strong> {org.bank_account_holder_name}</div>'
        
        bank_html = f"""
        <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 4px; border: 1px solid #e9ecef; margin-bottom: 12px;">
            <div style="font-size: 12px; font-weight: bold; color: {accent_color}; margin-bottom: 4px; text-transform: uppercase;">Bank Details for Payment</div>
            <div style="display: flex; gap: 20px;">
                {bank_items}
            </div>
            {account_holder}
        </div>
        """
    
    # Freight HTML
    freight_html = ""
    if freight_charges > 0:
        freight_html = f"""
        <tr>
            <td style="font-weight: bold; color: #555;">Freight Charges</td>
            <td style="text-align: right; font-weight: bold;">₹{freight_charges:,.2f}</td>
        </tr>
        """
    
    # Notes HTML
    notes_html = ""
    if data.notes:
        notes_html = f"""
        <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 2px solid {accent_color}; margin-bottom: 12px;">
            <div style="font-weight: bold; margin-bottom: 3px; color: {accent_color}; font-size: 11px;">Notes:</div>
            <div style="color: #555; font-size: 11px; line-height: 1.3;">{data.notes}</div>
        </div>
        """
    
    # Logo HTML
    logo_html = ""
    if org.logo_data:
        logo_html = f'<img src="{org.logo_data}" alt="Logo" style="height: 50px; width: auto; margin-right: 12px;" />'
    
    # Build address strings
    org_address = ', '.join(filter(None, [org.address, org.city, org.state, org.postal_code])) or 'Address not set'
    customer_address = ', '.join(filter(None, [customer.city, customer.state, customer.postal_code]))
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Tax Invoice - {data.invoice_number}</title>
        <style>
            @page {{
                size: A4;
                margin: 10mm;
            }}
            body {{
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.3;
                color: #333;
                margin: 0;
                padding: 10px;
            }}
            .header {{
                border-bottom: 2px solid {accent_color};
                padding-bottom: 10px;
                margin-bottom: 15px;
            }}
            .company-name {{
                font-size: 24px;
                font-weight: bold;
                color: {accent_color};
                margin-bottom: 4px;
            }}
            .company-details {{
                font-size: 12px;
                color: #666;
            }}
            .invoice-title {{
                font-size: 28px;
                font-weight: bold;
                color: #333;
                text-align: right;
            }}
            .invoice-number {{
                font-size: 15px;
                color: {accent_color};
                font-weight: bold;
                text-align: right;
            }}
            .details-box {{
                background: #f8f9fa;
                padding: 8px 12px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                margin-bottom: 15px;
            }}
            .section-title {{
                font-size: 12px;
                font-weight: bold;
                color: {accent_color};
                text-transform: uppercase;
                margin-bottom: 6px;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 2px;
            }}
            .customer-name {{
                font-size: 16px;
                font-weight: bold;
                color: #333;
                margin-bottom: 6px;
            }}
            table.items {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                border: 2px solid {accent_color};
            }}
            table.items th {{
                background: {accent_color};
                color: white;
                padding: 8px 6px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                border: 1px solid {darker_border};
            }}
            table.items td {{
                padding: 6px;
                font-size: 11px;
                border: 1px solid #e5e7eb;
            }}
            table.items tr:nth-child(even) {{
                background-color: #f8fafc;
            }}
            table.items tr.total-row {{
                background-color: #f1f5f9;
                font-weight: bold;
            }}
            table.summary {{
                width: 280px;
                margin-left: auto;
                border-collapse: collapse;
                border: 2px solid {accent_color};
            }}
            table.summary td {{
                padding: 6px 10px;
                font-size: 12px;
                border: 1px solid #e5e7eb;
            }}
            table.summary tr.total {{
                background: {accent_color};
            }}
            table.summary tr.total td {{
                color: white;
                font-weight: bold;
                font-size: 14px;
                padding: 8px 10px;
            }}
            .amount-words {{
                background: #f8f9fa;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px dashed #ccc;
                margin-bottom: 12px;
                text-align: center;
            }}
            .footer {{
                margin-top: 20px;
                padding-top: 10px;
                border-top: 2px solid #e9ecef;
                font-size: 11px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <!-- Header -->
        <table width="100%" style="border-bottom: 2px solid {accent_color}; padding-bottom: 10px; margin-bottom: 15px;">
            <tr>
                <td width="60%">
                    <div style="display: flex; align-items: center;">
                        {logo_html}
                        <span class="company-name">{org.company_name or 'Your Company Name'}</span>
                    </div>
                    <div class="company-details">
                        <div>{org_address}</div>
                        <div>Phone: {org.phone or '+91 XXXXX-XXXXX'} | Email: {org.email or 'contact@company.com'}</div>
                        <div>GST: {org.gst_number or 'XXAXXXXXXXX'}</div>
                        {f'<div><strong>Place of Supply:</strong> {org.state}</div>' if org.state else ''}
                    </div>
                </td>
                <td width="40%" style="text-align: right;">
                    <div class="invoice-title">TAX INVOICE</div>
                    <div class="invoice-number">{data.invoice_number}</div>
                </td>
            </tr>
        </table>
        
        <!-- Invoice Details -->
        <div class="details-box">
            <table width="100%">
                <tr>
                    <td width="33%" style="text-align: center;">
                        <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Invoice Date</div>
                        <div style="font-size: 14px; font-weight: bold;">{invoice_date_formatted}</div>
                    </td>
                    <td width="33%" style="text-align: center;">
                        <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Due Date</div>
                        <div style="font-size: 14px; font-weight: bold;">{due_date_formatted}</div>
                    </td>
                    <td width="33%" style="text-align: center;">
                        <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Payment Terms</div>
                        <div style="font-size: 14px; font-weight: bold;">{data.payment_terms or 'Immediate'}</div>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Customer Information -->
        <table width="100%" style="margin-bottom: 15px;">
            <tr>
                <td width="48%" style="vertical-align: top; padding: 10px; border: 1px solid #e9ecef; border-radius: 4px; background: #fafafa;">
                    <div class="section-title">Bill To</div>
                    <div class="customer-name">{customer_name}</div>
                    {f'<div style="font-size: 12px; color: #555;"><strong>Address:</strong> {customer.billing_address}</div>' if customer.billing_address else ''}
                    {f'<div style="font-size: 12px; color: #555;">{customer_address}</div>' if customer_address else ''}
                    {f'<div style="font-size: 12px; color: #555;"><strong>Email:</strong> {customer.email}</div>' if customer.email else ''}
                    {f'<div style="font-size: 12px; color: #555;"><strong>GST:</strong> {customer.gst_number}</div>' if customer.gst_number else ''}
                </td>
                <td width="4%"></td>
                <td width="48%" style="vertical-align: top; padding: 10px; border: 1px solid #e9ecef; border-radius: 4px; background: #fafafa;">
                    <div class="section-title">Ship To</div>
                    <div class="customer-name">{customer_name}</div>
                    {f'<div style="font-size: 12px; color: #555;"><strong>Address:</strong> {customer.shipping_address or customer.billing_address or "Same as billing"}</div>'}
                    {f'<div style="font-size: 12px; color: #555;"><strong>Location:</strong> {customer_address}</div>' if customer_address else ''}
                </td>
            </tr>
        </table>
        
        <!-- Items Table -->
        <table class="items">
            <thead>
                <tr>
                    <th style="width: 5%; text-align: center;">SR. NO.</th>
                    <th style="width: 40%;">NAME OF PRODUCT / SERVICE</th>
                    <th style="width: 15%; text-align: center;">HSN / SAC</th>
                    <th style="width: 10%; text-align: center;">QTY</th>
                    <th style="width: 15%; text-align: right;">RATE</th>
                    <th style="width: 15%; text-align: right;">TAXABLE VALUE</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
                <tr class="total-row">
                    <td colspan="5" style="text-align: center;">Total</td>
                    <td style="text-align: right;">₹{subtotal:,.2f}</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Summary Section -->
        <table class="summary">
            {freight_html}
            <tr>
                <td style="font-weight: bold; color: #555;">Taxable Amount</td>
                <td style="text-align: right; font-weight: bold;">₹{(subtotal + freight_charges):,.2f}</td>
            </tr>
            {gst_rows}
            <tr>
                <td style="font-weight: bold; color: #555;">Total Tax</td>
                <td style="text-align: right; font-weight: bold;">₹{total_tax:,.2f}</td>
            </tr>
            <tr class="total">
                <td>Total Amount After Tax</td>
                <td style="text-align: right;">₹{total_amount:,.2f}</td>
            </tr>
            <tr>
                <td colspan="2" style="font-size: 11px; color: #333; background: #f8f9fa;">
                    <strong>Whether tax is payable on reverse charge:</strong> {'Yes' if org.rcm_applicable else 'No'}
                </td>
            </tr>
        </table>
        
        {notes_html}
        
        <!-- Amount in Words -->
        <div class="amount-words">
            <div style="font-size: 11px; color: #666;">Amount in Words:</div>
            <div style="font-size: 14px; font-weight: bold;">{convert_number_to_words(total_amount)} Only</div>
        </div>
        
        {bank_html}
        
        <!-- Terms and Signature -->
        <table width="100%" style="margin-top: 10px;">
            <tr>
                <td width="65%" style="vertical-align: top; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <div style="font-weight: 700; color: {accent_color}; margin-bottom: 6px;">Terms and Conditions :</div>
                    <div style="font-style: italic; color: #555; font-size: 11px; line-height: 1.35;">{org.terms_and_conditions or ''}</div>
                </td>
                <td width="2%"></td>
                <td width="33%" style="vertical-align: top; padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; text-align: center;">
                    <div style="font-size: 12px; color: #444;">For <strong>{org.company_name or ''}</strong></div>
                    <div style="padding: 20px 0; {signature_css}">{signature_name}</div>
                    <div style="font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 4px;">Authorized Signatory</div>
                </td>
            </tr>
        </table>
        
        <!-- Footer -->
        <div class="footer">
            <table width="100%">
                <tr>
                    <td>
                        <strong>Thank you for your business!</strong><br>
                        For any queries: {org.email or 'contact@company.com'}
                    </td>
                    <td style="text-align: right;">
                        Generated: {datetime.now().strftime('%d/%m/%Y')}<br>
                        This is a computer generated invoice
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    """
    
    return html


def create_pdf_with_reportlab(data: GeneratePDFRequest) -> bytes:
    """Generate PDF using reportlab."""
    buffer = BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#4c1d95'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    # Add title
    elements.append(Paragraph("TAX INVOICE", title_style))
    elements.append(Spacer(1, 12))
    
    # Company and invoice info
    org = data.organization
    company_data = [
        [Paragraph(f"<b>{org.company_name or 'Company Name'}</b>", styles['Normal'])],
        [Paragraph(f"{org.address or ''}, {org.city or ''}, {org.state or ''} - {org.postal_code or ''}", styles['Normal'])],
        [Paragraph(f"Phone: {org.phone or ''} | Email: {org.email or ''}", styles['Normal'])],
        [Paragraph(f"GST: {org.gst_number or ''}", styles['Normal'])],
    ]
    
    company_table = Table(company_data, colWidths=[500])
    company_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(company_table)
    elements.append(Spacer(1, 12))
    
    # Invoice details
    invoice_info = [
        ['Invoice Number:', data.invoice_number, 'Invoice Date:', data.invoice_date],
        ['Due Date:', data.due_date or '', 'Payment Terms:', data.payment_terms or 'Immediate']
    ]
    invoice_table = Table(invoice_info, colWidths=[100, 150, 100, 150])
    invoice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(invoice_table)
    elements.append(Spacer(1, 12))
    
    # Customer info
    customer = data.customer
    customer_name = customer.company_name or f"{customer.first_name or ''} {customer.last_name or ''}".strip() or "Customer"
    
    customer_data = [
        [Paragraph("<b>Bill To:</b>", styles['Normal'])],
        [Paragraph(f"<b>{customer_name}</b>", styles['Normal'])],
        [Paragraph(f"{customer.billing_address or ''}", styles['Normal'])],
        [Paragraph(f"{customer.city or ''}, {customer.state or ''} - {customer.postal_code or ''}", styles['Normal'])],
        [Paragraph(f"GST: {customer.gst_number or 'N/A'}", styles['Normal'])],
    ]
    
    customer_table = Table(customer_data, colWidths=[500])
    customer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 12))
    
    # Items table
    items_data = [['#', 'Item', 'HSN', 'Qty', 'Rate', 'Amount']]
    
    subtotal = 0
    for idx, item in enumerate(data.items, 1):
        amount = (item.quantity * item.unit_price) - (item.discount_amount or 0)
        subtotal += amount
        items_data.append([
            str(idx),
            item.item_name,
            item.hsn_code or '-',
            str(item.quantity),
            f"₹{item.unit_price:,.2f}",
            f"₹{amount:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[30, 200, 80, 50, 80, 80])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4c1d95')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 12))
    
    # Calculate GST
    customer_state = (customer.state or '').lower()
    org_state = (org.state or '').lower()
    is_inter_state = customer_state != org_state and customer_state and org_state
    
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    
    for item in data.items:
        base_amount = (item.quantity * item.unit_price) - (item.discount_amount or 0)
        gst_rate = item.gst_rate or 0
        
        if gst_rate > 0:
            if is_inter_state:
                total_igst += (base_amount * gst_rate) / 100
            else:
                total_cgst += (base_amount * (gst_rate / 2)) / 100
                total_sgst += (base_amount * (gst_rate / 2)) / 100
    
    freight_charges = data.freight_charges or 0
    freight_gst = (freight_charges * (data.freight_gst_rate or 0)) / 100
    
    if is_inter_state:
        total_igst += freight_gst
    else:
        total_cgst += freight_gst / 2
        total_sgst += freight_gst / 2
    
    total_tax = total_cgst + total_sgst + total_igst
    total_amount = subtotal + freight_charges + total_tax
    
    # Summary table
    summary_data = []
    if freight_charges > 0:
        summary_data.append(['Freight Charges', f"₹{freight_charges:,.2f}"])
    summary_data.append(['Taxable Amount', f"₹{(subtotal + freight_charges):,.2f}"])
    
    if is_inter_state:
        summary_data.append([f'IGST', f"₹{total_igst:,.2f}"])
    else:
        summary_data.append([f'CGST', f"₹{total_cgst:,.2f}"])
        summary_data.append([f'SGST', f"₹{total_sgst:,.2f}"])
    
    summary_data.append(['Total Tax', f"₹{total_tax:,.2f}"])
    summary_data.append(['Total Amount', f"₹{total_amount:,.2f}"])
    
    summary_table = Table(summary_data, colWidths=[150, 100])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#4c1d95')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 12))
    
    # Amount in words
    amount_words = convert_number_to_words(total_amount)
    elements.append(Paragraph(f"<b>Amount in Words:</b> {amount_words} Only", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Bank details
    if org.bank_name or org.bank_account_number:
        bank_text = f"<b>Bank Details:</b><br/>"
        if org.bank_name:
            bank_text += f"Bank: {org.bank_name}<br/>"
        if org.bank_account_number:
            bank_text += f"Account: {org.bank_account_number}<br/>"
        if org.bank_ifsc_code:
            bank_text += f"IFSC: {org.bank_ifsc_code}"
        elements.append(Paragraph(bank_text, styles['Normal']))
        elements.append(Spacer(1, 12))
    
    # Terms and signature
    if org.terms_and_conditions:
        elements.append(Paragraph(f"<b>Terms and Conditions:</b><br/>{org.terms_and_conditions}", styles['Normal']))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"<b>For {org.company_name or 'Company'}</b>", styles['Normal']))
    elements.append(Spacer(1, 30))
    if data.signature_name:
        elements.append(Paragraph(f"<i>{data.signature_name}</i>", styles['Normal']))
    elements.append(Paragraph("Authorized Signatory", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    
    return buffer.getvalue()


@router.post("/generate-invoice-pdf")
async def generate_invoice_pdf(request: GeneratePDFRequest, current_user: dict = Depends(get_current_user)):
    """
    Generate a PDF invoice and return it as base64.
    """
    try:
        # Generate PDF using reportlab
        pdf_bytes = create_pdf_with_reportlab(request)
        
        # Encode to base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "success": True,
            "pdf_base64": pdf_base64,
            "filename": f"Invoice-{request.invoice_number}.pdf"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF"
        )
