"""
Sales Returns Router - PostgreSQL Version
Handles sales returns with direct PostgreSQL queries
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from typing import Optional
from datetime import datetime
from decimal import Decimal
import psycopg2.extras
from database.postgres_db import postgres_db
from utils.auth_deps import get_current_user
from utils.postgres_auth_deps import get_current_user as pg_get_current_user

router = APIRouter()

def generate_return_number(account_id: str) -> str:
    """Generate a new return number for the account"""
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT return_number FROM sales_returns 
                WHERE account_id = %s 
                ORDER BY id DESC LIMIT 1
            """, (account_id,))
            result = cur.fetchone()
            
            if result:
                try:
                    last_number = int(result[0].split('-')[-1])
                    next_number = last_number + 1
                except:
                    next_number = 1
            else:
                next_number = 1
            
            current_year = datetime.now().year
            return f"RET-{account_id}-{current_year}-{next_number:03d}"
        finally:
            cur.close()


@router.get("/")
async def get_sales_returns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated list of sales returns"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Build query with filters
            where_clauses = ["sr.account_id = %s"]
            params = [account_id]
            
            if search:
                where_clauses.append("""(
                    sr.return_number ILIKE %s OR
                    c.first_name ILIKE %s OR
                    c.last_name ILIKE %s OR
                    c.company_name ILIKE %s OR
                    sr.return_reason ILIKE %s OR
                    i.invoice_number ILIKE %s
                )""")
                search_term = f"%{search}%"
                params.extend([search_term] * 6)
            
            if status:
                where_clauses.append("sr.status = %s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("sr.customer_id = %s")
                params.append(customer_id)
            
            where_sql = " AND ".join(where_clauses)
            
            # Get total count
            cur.execute(f"""
                SELECT COUNT(*) as total
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE {where_sql}
            """, params)
            total = cur.fetchone()["total"]
            
            # Get paginated data with calculated return amount
            cur.execute(f"""
                SELECT 
                    sr.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    i.invoice_number,
                    COALESCE(NULLIF(sr.total_return_amount, 0), NULLIF(sr.refund_amount, 0), i.total_amount, 0) as calculated_return_amount
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE {where_sql}
                ORDER BY sr.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, skip])
            
            returns = cur.fetchall()
            
            # Calculate pagination
            total_pages = (total + limit - 1) // limit if total > 0 else 0
            current_page = (skip // limit) + 1
            
            return {
                "returns": returns,
                "total": total,
                "page": current_page,
                "per_page": limit,
                "total_pages": total_pages
            }
        finally:
            cur.close()


@router.post("/")
async def create_sales_return(
    return_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new sales return"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]  # Fixed: use 'id' not 'user_id'
    
    print(f"🔍 Creating sales return for account: {account_id}")
    print(f"📦 Return data: {return_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Generate return number
            return_number = generate_return_number(account_id)
            print(f"📝 Generated return number: {return_number}")
            
            # Get invoice total if refund_amount not provided
            invoice_id = return_data.get("invoice_id")
            refund_amount = return_data.get("refund_amount") or return_data.get("total_return_amount")
            
            if not refund_amount and invoice_id:
                # Fetch invoice total amount (including tax)
                cur.execute("""
                    SELECT total_amount FROM invoices 
                    WHERE id = %s AND account_id = %s
                """, (invoice_id, account_id))
                invoice = cur.fetchone()
                if invoice:
                    refund_amount = float(invoice.get('total_amount', 0))
                    print(f"💰 Calculated refund amount from invoice: {refund_amount}")
            
            refund_amount = refund_amount or 0
            
            # Insert sales return with total_return_amount
            cur.execute("""
                INSERT INTO sales_returns (
                    account_id, return_number, invoice_id, customer_id,
                    return_date, return_reason, status, refund_amount,
                    total_return_amount, refund_method, notes, created_by, updated_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id, return_number, created_at
            """, (
                account_id,
                return_number,
                invoice_id,
                return_data.get("customer_id"),
                return_data.get("return_date", datetime.now().date()),
                return_data.get("return_reason"),
                return_data.get("status", "Pending"),
                refund_amount,
                refund_amount,  # total_return_amount = refund_amount
                return_data.get("refund_method"),
                return_data.get("notes"),
                user_id,
                user_id
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            print(f"✅ Sales return created: {result['id']}")
            
            return {
                "id": result["id"],
                "return_number": result["return_number"],
                "message": "Sales return created successfully"
            }
        except Exception as e:
            print(f"❌ Error creating sales return: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            cur.close()


@router.get("/{return_id}")
async def get_sales_return(
    return_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single sales return by ID"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute("""
                SELECT 
                    sr.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    i.invoice_number
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE sr.id = %s AND sr.account_id = %s
            """, (return_id, account_id))
            
            return_data = cur.fetchone()
            
            if not return_data:
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            return return_data
        finally:
            cur.close()


@router.put("/{return_id}")
async def update_sales_return(
    return_id: int,
    return_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a sales return"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]  # Fixed: use 'id' not 'user_id'
    
    print(f"🔄 Updating sales return {return_id} with data: {return_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Get current return status and invoice_id
            cur.execute(
                "SELECT id, status, invoice_id, return_number FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            existing_return = cur.fetchone()
            if not existing_return:
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            old_status = existing_return['status']
            new_status = return_data.get("status")
            invoice_id = existing_return['invoice_id']
            return_number = existing_return['return_number']
            
            # Update sales return
            cur.execute("""
                UPDATE sales_returns SET
                    return_reason = COALESCE(%s, return_reason),
                    status = COALESCE(%s, status),
                    refund_status = COALESCE(%s, refund_status),
                    refund_amount = COALESCE(%s, refund_amount),
                    refund_method = COALESCE(%s, refund_method),
                    notes = COALESCE(%s, notes),
                    updated_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND account_id = %s
            """, (
                return_data.get("return_reason"),
                return_data.get("status"),
                return_data.get("refund_status"),
                return_data.get("refund_amount"),
                return_data.get("refund_method"),
                return_data.get("notes"),
                user_id,
                return_id,
                account_id
            ))
            
            # If status changed to 'processed', add items back to inventory
            if new_status and new_status.lower() == 'processed' and old_status.lower() != 'processed':
                print(f"📦 Status changed to processed, restoring inventory for return {return_id}")
                
                # Get invoice items to restore
                cur.execute("""
                    SELECT ii.item_id, ii.quantity, ii.item_name, i.current_stock
                    FROM invoice_items ii
                    LEFT JOIN items i ON i.id = ii.item_id AND i.account_id = %s
                    WHERE ii.invoice_id = %s AND ii.item_id IS NOT NULL
                """, (account_id, invoice_id))
                invoice_items = cur.fetchall()
                
                for item in invoice_items:
                    item_id = item['item_id']
                    quantity = int(item.get('quantity', 0))
                    item_name = item.get('item_name', 'Unknown')
                    current_stock = int(item.get('current_stock', 0) or 0)
                    new_stock = current_stock + quantity
                    
                    # Update item stock
                    cur.execute("""
                        UPDATE items SET
                            current_stock = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s AND account_id = %s
                    """, (new_stock, item_id, account_id))
                    
                    # Create inventory log
                    cur.execute("""
                        INSERT INTO inventory_logs (
                            item_account_id, item_id, action, 
                            notes, recorded_by, recorded_by_account_id, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, (
                        account_id, item_id, 'return',
                        f"Stock returned from sales return {return_number} - Item: {item_name} - Qty: {quantity} (Stock: {current_stock} -> {new_stock})",
                        user_id,
                        account_id
                    ))
                    
                    print(f"📦 Restored {quantity} units of {item_name}: {current_stock} -> {new_stock}")
            
            conn.commit()
            print(f"✅ Successfully updated sales return {return_id}")
            return {"message": "Sales return updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error updating sales return: {str(e)}")
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.delete("/{return_id}")
async def delete_sales_return(
    return_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sales return"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            # Check if return exists
            cur.execute(
                "SELECT id FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            # Delete the return
            cur.execute(
                "DELETE FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            
            conn.commit()
            return {"message": "Sales return deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.get("/{return_id}/credit-report")
async def download_credit_report(
    return_id: int,
    current_user: dict = Depends(pg_get_current_user)
):
    """Generate and download credit report for a sales return."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Get the sales return
            cur.execute("""
                SELECT sr.*, 
                       c.first_name, c.last_name, c.company_name as customer_company,
                       c.email as customer_email, c.phone as customer_phone,
                       c.address as customer_address, c.city as customer_city,
                       c.state as customer_state, c.postal_code as customer_postal_code,
                       c.gst_number as customer_gst,
                       i.invoice_number, i.invoice_date
                FROM sales_returns sr
                LEFT JOIN customers c ON sr.customer_id = c.id
                LEFT JOIN invoices i ON sr.invoice_id = i.id
                WHERE sr.id = %s AND sr.account_id = %s
            """, (return_id, account_id))
            
            sales_return = cur.fetchone()
            if not sales_return:
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            # Get invoice items for this return (items from the original invoice)
            invoice_id = sales_return.get('invoice_id')
            cur.execute("""
                SELECT ii.*, ii.item_name, i.sku as item_sku
                FROM invoice_items ii
                LEFT JOIN items i ON ii.item_id = i.id
                WHERE ii.invoice_id = %s
            """, (invoice_id,))
            return_items = cur.fetchall()
            
            # Get organization data
            cur.execute("""
                SELECT * FROM organizations
                WHERE account_id = %s
                LIMIT 1
            """, (account_id,))
            org = cur.fetchone()
            
            # Generate HTML content
            html_content = generate_credit_note_html(sales_return, return_items, org)
            
            return HTMLResponse(content=html_content)
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            print(f"Error generating credit report: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


def generate_credit_note_html(sales_return: dict, return_items: list, organization: dict = None):
    """Generate HTML content for credit note from PostgreSQL data."""
    
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
    
    # Customer display name
    customer_name = sales_return.get('customer_company') or f"{sales_return.get('first_name', '')} {sales_return.get('last_name', '')}".strip()
    
    # Current date
    current_date = datetime.now()
    return_date = sales_return.get('return_date', current_date)
    if isinstance(return_date, str):
        try:
            return_date = datetime.fromisoformat(return_date.replace('Z', '+00:00'))
        except:
            return_date = current_date
    
    # Build items table rows
    items_html = ""
    return_reason = sales_return.get('return_reason', '')
    
    # Calculate totals from invoice items (including tax)
    calculated_subtotal = 0.0
    calculated_tax = 0.0
    calculated_total = 0.0
    
    for item in return_items:
        # Map invoice_items fields to credit note display
        item_name = item.get('item_name') or item.get('description', 'Unknown Item')
        item_sku = item.get('item_sku') or item.get('hsn_code', '-')
        quantity = float(item.get('quantity', 0))
        unit_price = float(item.get('unit_price', 0) or item.get('rate', 0))
        base_amount = float(item.get('base_amount', 0) or (quantity * unit_price))
        tax_amount = float(item.get('tax_amount', 0))
        line_total = float(item.get('line_total', 0) or (base_amount + tax_amount))
        gst_rate = float(item.get('gst_rate', 0) or item.get('tax_rate', 0))
        
        calculated_subtotal += base_amount
        calculated_tax += tax_amount
        calculated_total += line_total
        
        items_html += f"""
                  <tr>
                    <td>
                      <div class="item-name">{item_name}</div>
                      {"<div class='item-sku'>Reason: " + return_reason + "</div>" if return_reason else ""}
                    </td>
                    <td>{item_sku}</td>
                    <td style="text-align: center;">{quantity:g}</td>
                    <td style="text-align: right;">₹{unit_price:,.2f}</td>
                    <td style="text-align: right;">₹{base_amount:,.2f}</td>
                    <td style="text-align: right;">{gst_rate:g}%<br><small>₹{tax_amount:,.2f}</small></td>
                    <td style="text-align: right;">₹{line_total:,.2f}</td>
                  </tr>
        """
    
    # Use calculated totals (which include tax)
    subtotal = calculated_subtotal
    total_tax = calculated_tax
    restocking_fee = float(sales_return.get('restocking_fee', 0) or 0)
    total_credit = calculated_total - restocking_fee
    
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
            
              .header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #dc2626;
                padding-bottom: 12px;
                margin-bottom: 15px;
              }}
              
              .company-info h1 {{
                font-size: 22px;
                color: #dc2626;
                margin-bottom: 4px;
              }}
              
              .company-info p {{
                font-size: 10px;
                color: #666;
                margin: 1px 0;
              }}
              
              .credit-title {{
                text-align: right;
              }}
              
              .credit-title h2 {{
                font-size: 24px;
                color: #dc2626;
                margin-bottom: 4px;
              }}
              
              .credit-title p {{
                font-size: 10px;
                color: #666;
              }}
              
              .parties-section {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                gap: 20px;
              }}
              
              .party-box {{
                flex: 1;
                padding: 10px;
                background: #fef2f2;
                border-radius: 4px;
                border-left: 3px solid #dc2626;
              }}
              
              .party-box h3 {{
                font-size: 11px;
                color: #dc2626;
                margin-bottom: 6px;
                text-transform: uppercase;
              }}
              
              .party-box p {{
                font-size: 10px;
                margin: 2px 0;
              }}
              
              .items-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 10px;
              }}
              
              .items-table th {{
                background: #dc2626;
                color: white;
                padding: 8px 6px;
                text-align: left;
                font-weight: 600;
              }}
              
              .items-table td {{
                padding: 6px;
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .items-table tr:nth-child(even) {{
                background: #fef2f2;
              }}
              
              .item-name {{
                font-weight: 500;
              }}
              
              .item-sku {{
                font-size: 9px;
                color: #666;
              }}
              
              .summary-section {{
                display: flex;
                justify-content: flex-end;
                margin-bottom: 15px;
              }}
              
              .summary-box {{
                width: 250px;
              }}
              
              .summary-row {{
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 10px;
                border-bottom: 1px solid #e5e7eb;
              }}
              
              .summary-row.total {{
                font-size: 14px;
                font-weight: bold;
                color: #dc2626;
                border-bottom: 2px solid #dc2626;
                padding: 8px 0;
              }}
              
              .footer {{
                text-align: center;
                font-size: 9px;
                color: #666;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
              }}
              
              @media print {{
                body {{ padding: 0; }}
                .credit-container {{ max-width: 100%; }}
                
                @page {{
                  margin: 10mm;
                  margin-bottom: 15mm;
                }}
                
                .footer {{
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  background: white;
                  padding: 8px 10mm;
                  border-top: 1px solid #e5e7eb;
                }}
              }}
              
              .print-footer {{
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 9px;
                color: #666;
                padding: 10px;
                background: white;
                border-top: 1px solid #e5e7eb;
              }}
            </style>
          </head>
          <body>
            <div class="credit-container">
              <div class="header">
                <div class="company-info">
                  <h1>{organization.get('company_name', 'Your Company')}</h1>
                  <p>{organization.get('address', '')}</p>
                  <p>{organization.get('city', '')}, {organization.get('state', '')} - {organization.get('postal_code', '')}</p>
                  <p>Phone: {organization.get('phone', '')} | Email: {organization.get('email', '')}</p>
                  <p>GSTIN: {organization.get('gst_number', '')}</p>
                </div>
                <div class="credit-title">
                  <h2>CREDIT NOTE</h2>
                  <p><strong>Credit Note #:</strong> {sales_return.get('return_number', '')}</p>
                  <p><strong>Date:</strong> {return_date.strftime('%d/%m/%Y') if hasattr(return_date, 'strftime') else return_date}</p>
                  <p><strong>Original Invoice:</strong> {sales_return.get('invoice_number', '')}</p>
                </div>
              </div>
              
              <div class="parties-section">
                <div class="party-box">
                  <h3>Credit To</h3>
                  <p><strong>{customer_name}</strong></p>
                  <p>{sales_return.get('customer_address', '')}</p>
                  <p>{sales_return.get('customer_city', '')}, {sales_return.get('customer_state', '')} - {sales_return.get('customer_postal_code', '')}</p>
                  <p>Phone: {sales_return.get('customer_phone', '')}</p>
                  <p>GSTIN: {sales_return.get('customer_gst', '') or 'N/A'}</p>
                </div>
                <div class="party-box">
                  <h3>Return Details</h3>
                  <p><strong>Return Reason:</strong> {sales_return.get('return_reason', '')}</p>
                  <p><strong>Status:</strong> {sales_return.get('status', '').replace('_', ' ').title()}</p>
                  <p><strong>Refund Method:</strong> {sales_return.get('refund_method', 'N/A')}</p>
                  <p><strong>Refund Status:</strong> {sales_return.get('refund_status', '').replace('_', ' ').title()}</p>
                </div>
              </div>
              
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>SKU</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Base Amt</th>
                    <th style="text-align: right;">GST</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items_html}
                </tbody>
              </table>
              
              <div class="summary-section">
                <div class="summary-box">
                  <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₹{subtotal:,.2f}</span>
                  </div>
                  <div class="summary-row">
                    <span>GST Amount:</span>
                    <span>₹{total_tax:,.2f}</span>
                  </div>
                  <div class="summary-row">
                    <span>Restocking Fee:</span>
                    <span>-₹{restocking_fee:,.2f}</span>
                  </div>
                  <div class="summary-row total">
                    <span>Total Credit:</span>
                    <span>₹{total_credit:,.2f}</span>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p>This is a computer-generated credit note and does not require a signature.</p>
                <p>Thank you for your business!</p>
              </div>
              
              <div class="print-footer">
                This is a computer-generated credit note and does not require a signature. | Thank you for your business!
              </div>
            </div>
            
            <script>
              window.onload = function() {{
                window.print();
              }}
            </script>
          </body>
        </html>
    """
    
    return html_content
