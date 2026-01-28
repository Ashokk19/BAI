"""
Shipment Document HTML Template

Professional shipping document format with sender/recipient details,
package information, and tracking details.
"""

def get_shipment_document_html(shipment, customer, invoice=None, organization=None):
    """Generate HTML content for shipment document."""
    
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
            "website": "www.yourcompany.com"
        }
    
    # Customer display name
    customer_name = customer.get("company_name") or f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
    
    # Format dates
    from datetime import datetime
    
    def format_date(date_str):
        if not date_str:
            return "N/A"
        try:
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                date_obj = date_str
            return date_obj.strftime("%d/%m/%Y")
        except:
            return str(date_str)
    
    shipment_date = format_date(shipment.get("shipment_date"))
    expected_delivery = format_date(shipment.get("expected_delivery"))
    actual_delivery = format_date(shipment.get("actual_delivery"))
    
    # Status styling
    status = shipment.get("status", "pending")
    status_colors = {
        "pending": "#fbbf24",
        "in_transit": "#3b82f6",
        "delivered": "#10b981",
        "cancelled": "#ef4444",
        "failed": "#ef4444"
    }
    status_color = status_colors.get(status.lower().replace(" ", "_"), "#6b7280")
    
    # Invoice info
    invoice_number = invoice.get("invoice_number") if invoice else "N/A"
    
    # Create HTML content
    html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shipment Document - {shipment.get('shipment_number', 'N/A')}</title>
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
                line-height: 1.4;
                color: #333;
                background: #ffffff;
                padding: 15mm;
                margin: 0;
              }}
              
              .shipment-container {{
                max-width: 195mm;
                margin: 0 auto;
                background: white;
              }}
            
              /* Header Section */
              .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }}
              
              .company-info h1 {{
                font-size: 26px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 6px;
              }}
              
              .company-info p {{
                font-size: 13px;
                color: #666;
                margin: 2px 0;
                line-height: 1.3;
              }}
              
              .shipment-title {{
                text-align: right;
              }}
              
              .shipment-title h2 {{
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 6px;
                letter-spacing: -0.5px;
              }}
              
              .shipment-number {{
                font-size: 16px;
                color: #2563eb;
                font-weight: bold;
              }}
              
              .shipment-status {{
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 6px;
                background-color: {status_color};
                color: white;
              }}
              
              /* Tracking Banner */
              .tracking-banner {{
                background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }}
              
              .tracking-info {{
                flex: 1;
              }}
              
              .tracking-label {{
                font-size: 12px;
                opacity: 0.9;
                margin-bottom: 4px;
              }}
              
              .tracking-number {{
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
                font-family: 'Courier New', monospace;
              }}
              
              .carrier-info {{
                text-align: right;
              }}
              
              .carrier-name {{
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 4px;
              }}
              
              .shipping-method {{
                font-size: 14px;
                opacity: 0.9;
              }}
              
              /* Address Section */
              .addresses {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 25px;
                gap: 20px;
              }}
              
              .address-box {{
                flex: 1;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                background: #f9fafb;
                position: relative;
              }}
              
              .address-header {{
                position: absolute;
                top: -12px;
                left: 15px;
                background: white;
                padding: 2px 10px;
                border-radius: 4px;
                border: 2px solid #2563eb;
              }}
              
              .address-header-text {{
                font-size: 12px;
                font-weight: bold;
                color: #2563eb;
                text-transform: uppercase;
              }}
              
              .address-content {{
                margin-top: 8px;
              }}
              
              .address-name {{
                font-size: 18px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 8px;
              }}
              
              .address-details {{
                font-size: 13px;
                color: #4b5563;
                line-height: 1.6;
              }}
              
              .address-details p {{
                margin: 3px 0;
              }}
              
              /* Package Details */
              .package-section {{
                background: #eff6ff;
                border: 2px solid #bfdbfe;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
              }}
              
              .package-header {{
                font-size: 18px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
              }}
              
              .package-icon {{
                display: inline-block;
                width: 24px;
                height: 24px;
                margin-right: 10px;
                background: #2563eb;
                border-radius: 4px;
              }}
              
              .package-grid {{
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
              }}
              
              .package-item {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #dbeafe;
              }}
              
              .package-label {{
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                margin-bottom: 4px;
                font-weight: 600;
              }}
              
              .package-value {{
                font-size: 16px;
                font-weight: bold;
                color: #1f2937;
              }}
              
              /* Shipping Details Table */
              .details-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                border: 2px solid #2563eb;
                border-radius: 8px;
                overflow: hidden;
              }}
              
              .details-table tr {{
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .details-table tr:last-child {{
                border-bottom: none;
              }}
              
              .details-table td {{
                padding: 12px 15px;
                font-size: 14px;
              }}
              
              .details-table td:first-child {{
                font-weight: bold;
                color: #1e40af;
                background: #eff6ff;
                width: 40%;
              }}
              
              .details-table td:last-child {{
                color: #1f2937;
                background: #ffffff;
              }}
              
              /* Cost Breakdown */
              .cost-section {{
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
              }}
              
              .cost-header {{
                font-size: 16px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }}
              
              .cost-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .cost-row:last-child {{
                border-bottom: none;
                font-weight: bold;
                font-size: 18px;
                color: #1e40af;
                padding-top: 15px;
                margin-top: 10px;
                border-top: 2px solid #2563eb;
              }}
              
              .cost-label {{
                color: #4b5563;
              }}
              
              .cost-value {{
                font-weight: 600;
                color: #1f2937;
              }}
              
              /* Instructions */
              .instructions {{
                background: #fef3c7;
                border: 2px dashed #fbbf24;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
              }}
              
              .instructions-header {{
                font-size: 14px;
                font-weight: bold;
                color: #92400e;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
              }}
              
              .instructions-text {{
                font-size: 13px;
                color: #78350f;
                line-height: 1.6;
              }}
              
              /* Notes */
              .notes {{
                background: #f3f4f6;
                border-left: 4px solid #6b7280;
                padding: 15px;
                margin-bottom: 25px;
                border-radius: 4px;
              }}
              
              .notes-header {{
                font-size: 14px;
                font-weight: bold;
                color: #374151;
                margin-bottom: 8px;
              }}
              
              .notes-text {{
                font-size: 13px;
                color: #4b5563;
                line-height: 1.6;
                white-space: pre-wrap;
              }}
              
              /* Footer */
              .footer {{
                border-top: 2px solid #e5e7eb;
                padding-top: 20px;
                margin-top: 30px;
                text-align: center;
              }}
              
              .footer-text {{
                font-size: 12px;
                color: #6b7280;
                margin: 5px 0;
              }}
              
              .footer-contact {{
                font-size: 13px;
                color: #2563eb;
                font-weight: 600;
                margin-top: 10px;
              }}
              
              /* Barcode placeholder */
              .barcode {{
                text-align: center;
                padding: 20px;
                margin: 20px 0;
              }}
              
              .barcode-image {{
                height: 60px;
                background: repeating-linear-gradient(
                  90deg,
                  #000 0px,
                  #000 2px,
                  #fff 2px,
                  #fff 4px
                );
                margin: 0 auto;
                max-width: 300px;
                border-radius: 4px;
              }}
              
              .barcode-text {{
                font-family: 'Courier New', monospace;
                font-size: 14px;
                margin-top: 8px;
                color: #4b5563;
              }}
              
              @media print {{
                body {{
                  padding: 0;
                }}
                
                .shipment-container {{
                  max-width: 100%;
                }}
                
                .no-print {{
                  display: none;
                }}
              }}
            </style>
          </head>
          <body>
            <div class="shipment-container">
              <!-- Header -->
              <div class="header">
                <div class="company-info">
                  <h1>{organization['company_name']}</h1>
                  <p>{organization['address']}</p>
                  <p>{organization['city']}, {organization['state']} - {organization['postal_code']}</p>
                  <p>Phone: {organization['phone']} | Email: {organization['email']}</p>
                  <p>GST: {organization['gst_number']}</p>
                </div>
                <div class="shipment-title">
                  <h2>SHIPMENT</h2>
                  <div class="shipment-number">{shipment.get('shipment_number', 'N/A')}</div>
                  <div class="shipment-status">{status.upper().replace('_', ' ')}</div>
                </div>
              </div>
              
              <!-- Tracking Banner -->
              <div class="tracking-banner">
                <div class="tracking-info">
                  <div class="tracking-label">Tracking Number</div>
                  <div class="tracking-number">{shipment.get('tracking_number') or 'NOT ASSIGNED'}</div>
                </div>
                <div class="carrier-info">
                  <div class="carrier-name">{shipment.get('carrier') or 'Carrier'}</div>
                  <div class="shipping-method">{shipment.get('shipping_method', 'Standard').title()}</div>
                </div>
              </div>
              
              <!-- Addresses -->
              <div class="addresses">
                <div class="address-box">
                  <div class="address-header">
                    <span class="address-header-text">📦 From (Sender)</span>
                  </div>
                  <div class="address-content">
                    <div class="address-name">{organization['company_name']}</div>
                    <div class="address-details">
                      <p>{organization['address']}</p>
                      <p>{organization['city']}, {organization['state']} - {organization['postal_code']}</p>
                      <p><strong>Phone:</strong> {organization['phone']}</p>
                      <p><strong>Email:</strong> {organization['email']}</p>
                    </div>
                  </div>
                </div>
                
                <div class="address-box">
                  <div class="address-header">
                    <span class="address-header-text">📍 To (Recipient)</span>
                  </div>
                  <div class="address-content">
                    <div class="address-name">{customer_name}</div>
                    <div class="address-details">
                      <p>{shipment.get('shipping_address', 'No address provided')}</p>
                      {f"<p><strong>Phone:</strong> {customer.get('phone', 'N/A')}</p>" if customer.get('phone') else ""}
                      {f"<p><strong>Email:</strong> {customer.get('email', 'N/A')}</p>" if customer.get('email') else ""}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Package Details -->
              <div class="package-section">
                <div class="package-header">
                  <span class="package-icon"></span>
                  Package Information
                </div>
                <div class="package-grid">
                  <div class="package-item">
                    <div class="package-label">Packages</div>
                    <div class="package-value">{shipment.get('package_count', 1)}</div>
                  </div>
                  <div class="package-item">
                    <div class="package-label">Weight</div>
                    <div class="package-value">{f"{float(shipment.get('weight_kg', 0)):.2f} kg" if shipment.get('weight_kg') else "N/A"}</div>
                  </div>
                  <div class="package-item">
                    <div class="package-label">Dimensions</div>
                    <div class="package-value">{shipment.get('dimensions', 'N/A')}</div>
                  </div>
                  <div class="package-item">
                    <div class="package-label">Insurance</div>
                    <div class="package-value">{f"₹{float(shipment.get('insurance_cost', 0)):,.2f}" if shipment.get('insurance_cost') else "N/A"}</div>
                  </div>
                </div>
              </div>
              
              <!-- Shipping Details -->
              <table class="details-table">
                <tr>
                  <td>Invoice Reference</td>
                  <td>{invoice_number}</td>
                </tr>
                <tr>
                  <td>Shipment Date</td>
                  <td>{shipment_date}</td>
                </tr>
                <tr>
                  <td>Expected Delivery</td>
                  <td>{expected_delivery}</td>
                </tr>
                {f"<tr><td>Actual Delivery</td><td>{actual_delivery}</td></tr>" if shipment.get('actual_delivery') else ""}
                <tr>
                  <td>Shipping Service</td>
                  <td>{shipment.get('shipping_method', 'Standard').title()}</td>
                </tr>
              </table>
              
              <!-- Cost Breakdown -->
              <div class="cost-section">
                <div class="cost-header">💰 Cost Breakdown</div>
                <div class="cost-row">
                  <span class="cost-label">Base Shipping Cost</span>
                  <span class="cost-value">₹{float(shipment.get('shipping_cost', 0)):,.2f}</span>
                </div>
                <div class="cost-row">
                  <span class="cost-label">Insurance Cost</span>
                  <span class="cost-value">₹{float(shipment.get('insurance_cost', 0)):,.2f}</span>
                </div>
                <div class="cost-row">
                  <span class="cost-label">Total Shipping Charges</span>
                  <span class="cost-value">₹{float(shipment.get('shipping_cost', 0)) + float(shipment.get('insurance_cost', 0)):,.2f}</span>
                </div>
              </div>
              
              <!-- Special Instructions -->
              {f'''
              <div class="instructions">
                <div class="instructions-header">⚠️ Special Instructions</div>
                <div class="instructions-text">{shipment.get('special_instructions')}</div>
              </div>
              ''' if shipment.get('special_instructions') else ''}
              
              <!-- Notes -->
              {f'''
              <div class="notes">
                <div class="notes-header">📝 Additional Notes</div>
                <div class="notes-text">{shipment.get('notes')}</div>
              </div>
              ''' if shipment.get('notes') else ''}
              
              <!-- Barcode -->
              <div class="barcode">
                <div class="barcode-image"></div>
                <div class="barcode-text">{shipment.get('shipment_number', 'N/A')}</div>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <p class="footer-text">This is a computer-generated shipment document.</p>
                <p class="footer-text">For queries, contact us at:</p>
                <p class="footer-contact">{organization['phone']} | {organization['email']}</p>
              </div>
            </div>
          </body>
        </html>
    """
    
    return html_content
