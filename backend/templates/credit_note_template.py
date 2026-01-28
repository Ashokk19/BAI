"""
Credit Note HTML Template

This module contains the HTML template for generating credit notes
in the same format as invoices.
"""

def get_credit_note_html(sales_return, customer, invoice, return_items, organization=None):
    """Generate HTML content for credit note."""
    
    # Default organization data if not provided
    if not organization:
        organization = {
            "company_name": "Your Company Name",
            "address": "Your Company Address",
            "city": "Your City", 
            "state": "Your State",
            "postal_code": "123456",
            "phone": "+91 9876543210",
            "email": "contact@yourcompany.com",
            "gst_number": "22AAAAA0000A1Z5",
            "bank_name": "Your Bank",
            "bank_account_number": "1234567890",
            "bank_ifsc_code": "BANK0001234"
        }
    
    # Helper function to convert numbers to words
    def convert_number_to_words(amount):
        # Simple implementation - you can enhance this
        return f"{int(amount)} Only"
    
    # Customer display name
    customer_name = customer.company_name or f"{customer.first_name} {customer.last_name}"
    
    # Current date
    from datetime import datetime
    current_date = datetime.now()
    
    # Build items table rows
    items_html = ""
    for item in return_items:
        items_html += f"""
                  <tr>
                    <td>
                      <div class="item-name">{item.item_name}</div>
                      {"<div class='item-sku'>Reason: " + item.return_reason + "</div>" if item.return_reason else ""}
                    </td>
                    <td>{item.item_sku}</td>
                    <td style="text-align: center;">{float(item.return_quantity):g}</td>
                    <td style="text-align: right;">₹{float(item.unit_price):,.2f}</td>
                    <td style="text-align: right;">₹{float(item.return_amount):,.2f}</td>
                    <td style="text-align: center;">{item.condition_on_return.title()}</td>
                    <td style="text-align: right;">₹{float(item.refund_amount):,.2f}</td>
                  </tr>
        """
    
    # Calculate totals
    subtotal = float(sales_return.total_return_amount)
    restocking_fee = float(sales_return.restocking_fee)
    total_credit = float(sales_return.refund_amount)
    
    # Create HTML content
    html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credit Note - {customer_name}</title>
            <style>
              * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }}
              
              body {{
                font-family: 'Arial', sans-serif;
                line-height: 1.3;
                color: #333;
                background: #ffffff;
                padding: 12mm;
                margin: 0;
              }}
              
              .credit-container {{
                max-width: 195mm;
                margin: 0 auto;
                background: white;
              }}
            
              /* Header Section */
              .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #dc2626;
                padding-bottom: 12px;
                margin-bottom: 15px;
              }}
              
              .company-info h1 {{
                font-size: 24px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 4px;
              }}
              
              .company-info p {{
                font-size: 13px;
                color: #666;
                margin: 1px 0;
                line-height: 1.2;
              }}
              
              .credit-title {{
                text-align: right;
              }}
              
              .credit-title h2 {{
                font-size: 28px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 4px;
              }}
              
              .credit-number {{
                font-size: 15px;
                color: #dc2626;
                font-weight: bold;
              }}
              
              /* Credit Details */
              .credit-details {{
                display: flex;
                justify-content: space-between;
                background: #fef2f2;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 15px;
                border: 1px solid #fecaca;
              }}
              
              .detail-group {{
                flex: 1;
                text-align: center;
              }}
              
              .detail-label {{
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
                font-weight: bold;
                margin-bottom: 2px;
              }}
              
              .detail-value {{
                font-size: 14px;
                font-weight: bold;
                color: #333;
              }}
              
              /* Customer Information */
              .customer-section {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
              }}
              
              .bill-to, .company-details {{
                flex: 1;
                padding: 10px;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                background: #fafafa;
              }}
              
              .bill-to {{
                margin-right: 10px;
              }}
              
              .company-details {{
                margin-left: 10px;
              }}
              
              .section-title {{
                font-size: 12px;
                font-weight: bold;
                color: #dc2626;
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
              
              .customer-details p, .company-details p {{
                margin-bottom: 2px;
                font-size: 12px;
                color: #555;
                line-height: 1.3;
              }}
              
              .customer-details strong, .company-details strong {{
                color: #333;
              }}
              
              /* Items Table */
              .items-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                border: 2px solid #dc2626;
                border-radius: 4px;
                overflow: hidden;
              }}
              
              .items-table thead {{
                background: #dc2626;
              }}
              
              .items-table th {{
                padding: 8px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 12px;
                color: white;
                text-transform: uppercase;
                border: 1px solid #b91c1c;
                vertical-align: middle;
              }}
              
              .items-table th:last-child,
              .items-table td:last-child {{
                text-align: right;
              }}
              
              .items-table tbody tr {{
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .items-table tbody tr:nth-child(even) {{
                background-color: #fef2f2;
              }}
              
              .items-table tbody tr:nth-child(odd) {{
                background-color: #ffffff;
              }}
              
              .items-table td {{
                padding: 6px;
                font-size: 12px;
                color: #333;
                line-height: 1.2;
                border: 1px solid #e5e7eb;
                vertical-align: middle;
              }}
              
              .items-table tbody tr:last-child {{
                border-bottom: 2px solid #dc2626;
                background-color: #fef2f2;
                font-weight: bold;
              }}
              
              .item-name {{
                font-weight: bold;
                color: #333;
                margin-bottom: 1px;
              }}
              
              .item-sku {{
                font-size: 10px;
                color: #666;
                font-style: italic;
              }}
              
              /* Summary Section */
              .summary-section {{
                display: flex;
                justify-content: flex-end;
                margin-bottom: 15px;
              }}
              
              .summary-table {{
                width: 280px;
                border-collapse: collapse;
                border: 2px solid #dc2626;
                border-radius: 4px;
                overflow: hidden;
              }}
              
              .summary-table tr {{
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .summary-table tr:last-child {{
                border-bottom: none;
              }}
              
              .summary-table td {{
                padding: 6px 10px;
                font-size: 12px;
                border: 1px solid #e5e7eb;
              }}
              
              .summary-table .label {{
                font-weight: bold;
                color: #555;
              }}
              
              .summary-table .value {{
                text-align: right;
                font-weight: bold;
                color: #333;
              }}
              
              .credit-breakdown {{
                background: #fef2f2;
              }}
              
              .total-row {{
                background: #dc2626;
              }}
              
              .total-row .label,
              .total-row .value {{
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 8px 10px;
                border: 1px solid #b91c1c;
              }}
              
              .amount-words {{
                background: #fef2f2;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px dashed #dc2626;
                margin-bottom: 12px;
                text-align: center;
              }}
              
              .amount-words .label {{
                font-size: 11px;
                color: #666;
                margin-bottom: 2px;
              }}
              
              .amount-words .value {{
                font-size: 14px;
                font-weight: bold;
                color: #333;
              }}
              
              /* Bank Details */
              .bank-details {{
                background: #fef2f2;
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #fecaca;
                margin-bottom: 12px;
              }}
              
              .bank-details .title {{
                font-size: 12px;
                font-weight: bold;
                color: #dc2626;
                margin-bottom: 4px;
                text-transform: uppercase;
              }}
              
              .bank-details .bank-info {{
                display: flex;
                justify-content: space-between;
                gap: 20px;
              }}
              
              .bank-details .bank-item {{
                flex: 1;
                font-size: 11px;
                color: #555;
              }}
              
              .bank-details .bank-item strong {{
                color: #333;
                font-weight: bold;
              }}
              
              /* Footer */
              .footer-info {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 2px solid #e9ecef;
                font-size: 11px;
                color: #666;
              }}
              
              /* Print Styles */
              @media print {{
                body {{ 
                  margin: 0; 
                  padding: 6mm; 
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }}
                .credit-container {{ 
                  margin: 0; 
                  max-width: 100%;
                }}
                .items-table thead {{
                  background: #dc2626 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }}
                .total-row {{
                  background: #dc2626 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }}
                .company-info h1 {{
                  color: #dc2626 !important;
                }}
                .credit-number {{
                  color: #dc2626 !important;
                }}
                .section-title {{
                  color: #dc2626 !important;
                }}
                .bank-details .title {{
                  color: #dc2626 !important;
                }}
              }}
            </style>
          </head>
          <body>
            <div class="credit-container">
              <!-- Header -->
              <div class="header">
                <div class="company-info">
                  <h1>{organization['company_name']}</h1>
                  <p>
                    {organization['address']}<br>
                    {organization['city']}, {organization['state']} - {organization['postal_code']}<br>
                    <strong>Phone:</strong> {organization['phone']} | <strong>Email:</strong> {organization['email']}<br>
                    <strong>GST No:</strong> {organization['gst_number']}
                  </p>
                </div>
                <div class="credit-title">
                  <h2>CREDIT NOTE</h2>
                  <div class="credit-number">Credit No: {sales_return.return_number}</div>
                </div>
              </div>
              
              <!-- Credit Details -->
              <div class="credit-details">
                <div class="detail-group">
                  <div class="detail-label">Credit Date</div>
                  <div class="detail-value">{sales_return.return_date.strftime('%d-%m-%Y')}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Original Invoice</div>
                  <div class="detail-value">{invoice.invoice_number}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Return Reason</div>
                  <div class="detail-value">{sales_return.return_reason}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Refund Method</div>
                  <div class="detail-value">{sales_return.refund_method.replace('_', ' ').title()}</div>
                </div>
              </div>
              
              <!-- Customer Information -->
              <div class="customer-section">
                <div class="bill-to">
                  <div class="section-title">Customer Details</div>
                  <div class="customer-name">{customer_name}</div>
                  <div class="customer-details">
                    {"<p><strong>Email:</strong> " + customer.email + "</p>" if customer.email else ""}
                    {"<p><strong>Phone:</strong> " + (customer.phone or customer.mobile or 'N/A') + "</p>"}
                    {"<p><strong>GST No:</strong> " + customer.gst_number + "</p>" if customer.gst_number else ""}
                    {"<p><strong>Address:</strong><br>" + customer.billing_address + "</p>" if customer.billing_address else ""}
                  </div>
                </div>
                <div class="company-details">
                  <div class="section-title">Original Invoice Details</div>
                  <div class="customer-details">
                    <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                    <p><strong>Invoice Date:</strong> {invoice.invoice_date.strftime('%d-%m-%Y') if hasattr(invoice.invoice_date, 'strftime') else invoice.invoice_date}</p>
                    <p><strong>Invoice Amount:</strong> ₹{float(invoice.total_amount):,.2f}</p>
                    <p><strong>Payment Status:</strong> {"Paid" if invoice.is_paid else "Pending"}</p>
                  </div>
                </div>
              </div>
              
              <!-- Return Items Table -->
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 35%;">Item Description</th>
                    <th style="width: 12%;">SKU</th>
                    <th style="width: 10%;">Returned Qty</th>
                    <th style="width: 12%;">Unit Rate</th>
                    <th style="width: 12%;">Return Amount</th>
                    <th style="width: 10%;">Condition</th>
                    <th style="width: 9%;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items_html}
                </tbody>
              </table>
              
              <!-- Summary Section -->
              <div class="summary-section">
                <table class="summary-table">
                  <tr>
                    <td class="label">Subtotal (Return Amount)</td>
                    <td class="value">₹{subtotal:,.2f}</td>
                  </tr>
                  <tr class="credit-breakdown">
                    <td class="label">Restocking Fee</td>
                    <td class="value">₹{restocking_fee:,.2f}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="label">TOTAL CREDIT</td>
                    <td class="value">₹{total_credit:,.2f}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Amount in Words -->
              <div class="amount-words">
                <div class="label">Credit Amount in Words:</div>
                <div class="value">{convert_number_to_words(total_credit)} Rupees Only</div>
              </div>
              
              <!-- Bank Details -->
              <div class="bank-details">
                <div class="title">Bank Details for Refund Processing</div>
                <div class="bank-info">
                  <div class="bank-item">
                    <strong>Bank Name:</strong><br>
                    {organization['bank_name']}
                  </div>
                  <div class="bank-item">
                    <strong>Account Number:</strong><br>
                    {organization['bank_account_number']}
                  </div>
                  <div class="bank-item">
                    <strong>IFSC Code:</strong><br>
                    {organization['bank_ifsc_code']}
                  </div>
                </div>
              </div>
              
              <!-- Terms & Conditions -->
              <div class="bank-details">
                <div class="title">Terms & Conditions</div>
                <div style="font-size: 11px; line-height: 1.4;">
                  1. This credit note is issued against the return of goods as per our return policy.<br>
                  2. The credit amount will be processed within 7-10 business days via the selected refund method.<br>
                  3. Returned items have been inspected and verified as per our quality standards.<br>
                  4. For any queries regarding this credit note, please contact our customer service.<br>
                  5. This is a computer-generated document and does not require a physical signature.
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer-info">
                <div>
                  <strong>Thank you for your business!</strong><br>
                  For any queries: {organization['email']}
                </div>
                <div style="text-align: right;">
                  Generated: {current_date.strftime('%d-%m-%Y')}<br>
                  This is a computer generated credit note
                </div>
              </div>
            </div>
          </body>
        </html>
    """
    
    return html_content




