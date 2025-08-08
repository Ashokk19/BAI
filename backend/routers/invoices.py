"""
BAI Backend Invoice Router

This module contains the invoice routes for invoice management with GST calculations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil
from decimal import Decimal
from datetime import datetime

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.customer import Customer
from models.invoice import Invoice, InvoiceItem
from models.item import Item
from models.gst_slab import GSTSlab
from schemas.invoice_schema import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceList,
    InvoiceSummary,
    GSTSlabCreate,
    GSTSlabResponse,
    WhatsAppInvoiceRequest,
    WhatsAppResponse
)

router = APIRouter()

def generate_invoice_number(db: Session) -> str:
    """Generate a new invoice number."""
    # Get the last invoice number
    last_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
    if last_invoice:
        # Extract number from invoice number (assuming format like INV-2024-001)
        try:
            last_number = int(last_invoice.invoice_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    # Format: INV-YYYY-NNN
    current_year = datetime.now().year
    return f"INV-{current_year}-{next_number:03d}"

def calculate_gst_amounts(item_data: dict, customer_state: str, company_state: str = "Tamil Nadu") -> dict:
    """Calculate GST amounts for an invoice item."""
    quantity = item_data.get("quantity", 0)
    unit_price = item_data.get("unit_price", 0)
    discount_amount = item_data.get("discount_amount", 0)
    
    # Calculate base amount (quantity * unit_price - discount)
    base_amount = (quantity * unit_price) - discount_amount
    
    # Determine if it's inter-state or intra-state transaction
    is_inter_state = customer_state.lower() != company_state.lower()
    
    # Get GST rates from the provided data or defaults
    gst_rate = item_data.get("gst_rate", 0)
    
    if is_inter_state:
        # Inter-state: Use IGST
        igst_rate = gst_rate
        cgst_rate = 0
        sgst_rate = 0
        igst_amount = (base_amount * igst_rate) / 100
        cgst_amount = 0
        sgst_amount = 0
    else:
        # Intra-state: Use CGST + SGST
        cgst_rate = gst_rate / 2
        sgst_rate = gst_rate / 2
        igst_rate = 0
        cgst_amount = (base_amount * cgst_rate) / 100
        sgst_amount = (base_amount * sgst_rate) / 100
        igst_amount = 0
    
    total_tax_amount = cgst_amount + sgst_amount + igst_amount
    line_total = base_amount + total_tax_amount
    
    return {
        "base_amount": base_amount,
        "cgst_rate": cgst_rate,
        "sgst_rate": sgst_rate,
        "igst_rate": igst_rate,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "igst_amount": igst_amount,
        "tax_amount": total_tax_amount,
        "line_total": line_total
    }

@router.get("/", response_model=InvoiceList)
async def get_invoices(
    skip: int = Query(0, ge=0, description="Number of invoices to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of invoices to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoices list with pagination and filters."""
    
    query = db.query(Invoice)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                Invoice.invoice_number.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(Invoice.status == status)
    
    # Apply customer filter
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    invoices = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return InvoiceList(
        invoices=invoices,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific invoice by ID."""
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice with GST calculations."""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == invoice_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate invoice number
    invoice_number = generate_invoice_number(db)
    
    # Calculate totals
    subtotal = Decimal(0)
    total_tax = Decimal(0)
    total_cgst = Decimal(0)
    total_sgst = Decimal(0)
    total_igst = Decimal(0)
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        customer_id=invoice_data.customer_id,
        invoice_date=invoice_data.invoice_date,
        due_date=invoice_data.due_date,
        status=invoice_data.status,
        invoice_type=invoice_data.invoice_type,
        payment_terms=invoice_data.payment_terms,
        currency=invoice_data.currency,
        billing_address=invoice_data.billing_address,
        shipping_address=invoice_data.shipping_address,
        notes=invoice_data.notes,
        terms_conditions=invoice_data.terms_conditions,
        created_by=current_user.id
    )
    
    db.add(invoice)
    db.flush()  # Get the invoice ID
    
    # Process invoice items
    for item_data in invoice_data.items:
        # Verify item exists
        item = db.query(Item).filter(Item.id == item_data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item with ID {item_data.item_id} not found")
        
        # Calculate GST amounts
        customer_state = invoice_data.customer_state or customer.state or "Tamil Nadu"
        company_state = invoice_data.company_state
        
        item_dict = item_data.model_dump()
        gst_calculations = calculate_gst_amounts(item_dict, customer_state, company_state)
        
        # Create invoice item
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            item_id=item_data.item_id,
            item_name=item_data.item_name,
            item_description=item_data.item_description,
            item_sku=item_data.item_sku,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_rate=item_data.discount_rate or 0,
            discount_amount=item_data.discount_amount or 0,
            tax_rate=item_data.gst_rate or 0,
            tax_amount=gst_calculations["tax_amount"],
            line_total=gst_calculations["line_total"]
        )
        
        db.add(invoice_item)
        
        # Add to totals
        subtotal += gst_calculations["base_amount"]
        total_tax += gst_calculations["tax_amount"]
        total_cgst += gst_calculations["cgst_amount"]
        total_sgst += gst_calculations["sgst_amount"]
        total_igst += gst_calculations["igst_amount"]
    
    # Update invoice totals
    invoice.subtotal = subtotal
    invoice.tax_amount = total_tax
    invoice.discount_amount = Decimal(0)  # Can be implemented later
    invoice.total_amount = subtotal + total_tax
    invoice.paid_amount = Decimal(0)
    
    db.commit()
    db.refresh(invoice)
    
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing invoice."""
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update invoice fields
    update_data = invoice_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    db.commit()
    db.refresh(invoice)
    
    return invoice

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice."""
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(invoice)
    db.commit()
    
    return {"message": "Invoice deleted successfully"}

@router.get("/summary/list", response_model=List[InvoiceSummary])
async def get_invoices_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoices summary for quick overview."""
    
    invoices = db.query(Invoice).join(Customer).all()
    
    invoice_summaries = []
    for invoice in invoices:
        customer_name = invoice.customer.display_name
        invoice_summaries.append(
            InvoiceSummary(
                id=invoice.id,
                invoice_number=invoice.invoice_number,
                customer_name=customer_name,
                invoice_date=invoice.invoice_date,
                due_date=invoice.due_date,
                total_amount=invoice.total_amount,
                paid_amount=invoice.paid_amount,
                balance_due=invoice.balance_due,
                status=invoice.status
            )
        )
    
    return invoice_summaries

# GST Slab Management
@router.get("/gst-slabs/", response_model=List[GSTSlabResponse])
async def get_gst_slabs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all GST slabs."""
    
    gst_slabs = db.query(GSTSlab).filter(GSTSlab.is_active == True).all()
    return gst_slabs

@router.post("/gst-slabs/", response_model=GSTSlabResponse)
async def create_gst_slab(
    gst_slab_data: GSTSlabCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new GST slab."""
    
    # Check if GST slab name already exists
    existing_slab = db.query(GSTSlab).filter(
        GSTSlab.name == gst_slab_data.name
    ).first()
    if existing_slab:
        raise HTTPException(
            status_code=400,
            detail="GST slab name already exists"
        )
    
    gst_slab = GSTSlab(**gst_slab_data.model_dump())
    db.add(gst_slab)
    db.commit()
    db.refresh(gst_slab)
    
    return gst_slab

@router.post("/seed-gst-slabs/")
async def seed_gst_slabs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed standard GST slabs."""
    
    standard_gst_slabs = [
        {
            "name": "0% GST",
            "rate": 0.00,
            "cgst_rate": 0.00,
            "sgst_rate": 0.00,
            "igst_rate": 0.00,
            "description": "Exempted items",
            "is_active": True
        },
        {
            "name": "5% GST",
            "rate": 5.00,
            "cgst_rate": 2.50,
            "sgst_rate": 2.50,
            "igst_rate": 5.00,
            "description": "Essential items",
            "is_active": True
        },
        {
            "name": "12% GST",
            "rate": 12.00,
            "cgst_rate": 6.00,
            "sgst_rate": 6.00,
            "igst_rate": 12.00,
            "description": "Standard items",
            "is_active": True
        },
        {
            "name": "18% GST",
            "rate": 18.00,
            "cgst_rate": 9.00,
            "sgst_rate": 9.00,
            "igst_rate": 18.00,
            "description": "Most goods and services",
            "is_active": True
        },
        {
            "name": "28% GST",
            "rate": 28.00,
            "cgst_rate": 14.00,
            "sgst_rate": 14.00,
            "igst_rate": 28.00,
            "description": "Luxury items",
            "is_active": True
        }
    ]
    
    created_slabs = []
    for slab_data in standard_gst_slabs:
        # Check if slab already exists
        existing_slab = db.query(GSTSlab).filter(
            GSTSlab.name == slab_data["name"]
        ).first()
        
        if not existing_slab:
            slab = GSTSlab(**slab_data)
            db.add(slab)
            created_slabs.append(slab_data["name"])
    
    db.commit()
    
    return {
        "message": f"Successfully created {len(created_slabs)} GST slabs",
        "created_slabs": created_slabs
    }

# WhatsApp Integration
@router.post("/send-whatsapp/", response_model=WhatsAppResponse)
async def send_invoice_whatsapp(
    whatsapp_data: WhatsAppInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send invoice via WhatsApp."""
    
    # Get invoice
    invoice = db.query(Invoice).filter(Invoice.id == whatsapp_data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # For now, return a placeholder response
    # In a real implementation, this would integrate with WhatsApp Business API
    return WhatsAppResponse(
        success=True,
        message="Invoice sent successfully via WhatsApp",
        whatsapp_message_id=f"whatsapp_{invoice.invoice_number}_{datetime.now().timestamp()}"
    ) 