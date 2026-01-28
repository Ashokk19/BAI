"""PostgreSQL-backed bills router."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class BillItemBase(BaseModel):
    item_id: Optional[int] = None
    item_name: str
    description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")


class BillCreate(BaseModel):
    vendor_id: int
    vendor_invoice_number: Optional[str] = None
    po_id: Optional[int] = None
    bill_date: date
    due_date: date
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    items: List[BillItemBase]


class BillUpdate(BaseModel):
    vendor_id: int
    vendor_invoice_number: Optional[str] = None
    po_id: Optional[int] = None
    bill_date: date
    due_date: date
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    items: List[BillItemBase]


def _generate_bill_number(cursor, account_id: str) -> str:
    """Generate bill number."""
    cursor.execute("SELECT bill_number FROM bills WHERE account_id = %s ORDER BY id DESC LIMIT 1", (account_id,))
    row = cursor.fetchone()
    if not row:
        return f"BILL-{datetime.now().year}-001"
    try:
        suffix = int(row["bill_number"].split("-")[-1])
    except ValueError:
        suffix = 0
    return f"BILL-{datetime.now().year}-{suffix + 1:03d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bill(bill: BillCreate, current_user: dict = Depends(get_current_user)):
    """Create a new bill."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            bill_number = _generate_bill_number(cursor, account_id)
            
            # Calculate totals
            subtotal = sum(item.quantity * item.unit_price for item in bill.items)
            discount_amount = sum(item.discount_amount for item in bill.items)
            subtotal_after_discount = subtotal - discount_amount
            tax_amount = sum(
                ((item.quantity * item.unit_price - item.discount_amount) * item.tax_rate / 100)
                for item in bill.items
            )
            total_amount = subtotal_after_discount + tax_amount
            
            # Insert bill
            cursor.execute("""
                INSERT INTO bills (
                    account_id, bill_number, vendor_id, vendor_invoice_number, po_id,
                    bill_date, due_date, payment_terms, status, subtotal, tax_amount,
                    discount_amount, total_amount, paid_amount, balance_due, notes, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, 'unpaid', %s, %s, %s, %s, 0, %s, %s, NOW()
                )
                RETURNING id
            """, (
                account_id, bill_number, bill.vendor_id, bill.vendor_invoice_number,
                bill.po_id, bill.bill_date, bill.due_date, bill.payment_terms,
                subtotal, tax_amount, discount_amount, total_amount, total_amount, bill.notes
            ))
            
            bill_id = cursor.fetchone()["id"]
            
            # Insert bill items
            for item in bill.items:
                line_total = (item.quantity * item.unit_price - item.discount_amount) * (1 + item.tax_rate / 100)
                item_tax = (item.quantity * item.unit_price - item.discount_amount) * item.tax_rate / 100
                
                cursor.execute("""
                    INSERT INTO bill_items (
                        account_id, bill_id, item_id, item_name, description, quantity,
                        unit_price, tax_rate, tax_amount, discount_amount, line_total
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    account_id, bill_id, item.item_id, item.item_name, item.description,
                    item.quantity, item.unit_price, item.tax_rate, item_tax,
                    item.discount_amount, line_total
                ))
            
            conn.commit()
            return {"message": "Bill created successfully", "bill_number": bill_number, "bill_id": bill_id}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.get("/")
async def get_bills(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    po_id: Optional[int] = None,
    purchase_order_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all bills."""
    account_id = current_user["account_id"]

    effective_po_id = po_id or purchase_order_id
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            where_parts = ["b.account_id = %s"]
            params = [account_id]
            
            if vendor_id:
                where_parts.append("b.vendor_id = %s")
                params.append(vendor_id)

            if effective_po_id:
                where_parts.append("b.po_id = %s")
                params.append(effective_po_id)
            
            if status_filter:
                where_parts.append("b.status = %s")
                params.append(status_filter)
            
            where_clause = " AND ".join(where_parts)
            
            cursor.execute(f"SELECT COUNT(*) as total FROM bills b WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            query = f"""
                SELECT b.*, v.vendor_name, v.vendor_code
                FROM bills b
                LEFT JOIN vendors v ON b.account_id = v.account_id AND b.vendor_id = v.id
                WHERE {where_clause}
                ORDER BY b.bill_date DESC, b.id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            bills = cursor.fetchall()
            
            result = [{k: float(v) if isinstance(v, Decimal) else v for k, v in dict(bill).items()} for bill in bills]
            
            return {"total": total, "bills": result, "skip": skip, "limit": limit}
            
        finally:
            cursor.close()


@router.get("/{bill_id}")
async def get_bill(bill_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific bill with items."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT b.*, v.vendor_name, v.vendor_code
                FROM bills b
                LEFT JOIN vendors v ON b.account_id = v.account_id AND b.vendor_id = v.id
                WHERE b.account_id = %s AND b.id = %s
            """, (account_id, bill_id))
            
            bill = cursor.fetchone()
            if not bill:
                raise HTTPException(status_code=404, detail="Bill not found")
            
            cursor.execute("""
                SELECT * FROM bill_items
                WHERE account_id = %s AND bill_id = %s
                ORDER BY id
            """, (account_id, bill_id))
            
            items = cursor.fetchall()
            
            bill_dict = {k: float(v) if isinstance(v, Decimal) else v for k, v in dict(bill).items()}
            bill_dict['items'] = [{k: float(v) if isinstance(v, Decimal) else v for k, v in dict(item).items()} for item in items]
            
            return bill_dict
            
        finally:
            cursor.close()


@router.put("/{bill_id}")
async def update_bill(bill_id: int, bill: BillUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing bill (header + items)."""
    account_id = current_user["account_id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute(
                "SELECT id, paid_amount FROM bills WHERE account_id = %s AND id = %s",
                (account_id, bill_id),
            )
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Bill not found")

            paid_amount = Decimal(str(existing.get("paid_amount") or 0))

            subtotal = sum(item.quantity * item.unit_price for item in bill.items)
            discount_amount = sum(item.discount_amount for item in bill.items)
            subtotal_after_discount = subtotal - discount_amount
            tax_amount = sum(
                ((item.quantity * item.unit_price - item.discount_amount) * item.tax_rate / 100)
                for item in bill.items
            )
            total_amount = subtotal_after_discount + tax_amount
            balance_due = total_amount - paid_amount
            if balance_due < 0:
                balance_due = Decimal("0.00")

            if balance_due <= 0:
                status_value = "payment_completed"
            elif paid_amount > 0:
                status_value = "partially_paid"
            else:
                status_value = "unpaid"

            cursor.execute(
                """
                UPDATE bills
                SET vendor_id = %s,
                    vendor_invoice_number = %s,
                    po_id = %s,
                    bill_date = %s,
                    due_date = %s,
                    payment_terms = %s,
                    notes = %s,
                    status = %s,
                    subtotal = %s,
                    tax_amount = %s,
                    discount_amount = %s,
                    total_amount = %s,
                    balance_due = %s,
                    updated_at = NOW()
                WHERE account_id = %s AND id = %s
                """,
                (
                    bill.vendor_id,
                    bill.vendor_invoice_number,
                    bill.po_id,
                    bill.bill_date,
                    bill.due_date,
                    bill.payment_terms,
                    bill.notes,
                    status_value,
                    subtotal,
                    tax_amount,
                    discount_amount,
                    total_amount,
                    balance_due,
                    account_id,
                    bill_id,
                ),
            )

            cursor.execute(
                "DELETE FROM bill_items WHERE account_id = %s AND bill_id = %s",
                (account_id, bill_id),
            )

            for item in bill.items:
                line_total = (item.quantity * item.unit_price - item.discount_amount) * (1 + item.tax_rate / 100)
                item_tax = (item.quantity * item.unit_price - item.discount_amount) * item.tax_rate / 100
                cursor.execute(
                    """
                    INSERT INTO bill_items (
                        account_id, bill_id, item_id, item_name, description, quantity,
                        unit_price, tax_rate, tax_amount, discount_amount, line_total
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        account_id,
                        bill_id,
                        item.item_id,
                        item.item_name,
                        item.description,
                        item.quantity,
                        item.unit_price,
                        item.tax_rate,
                        item_tax,
                        item.discount_amount,
                        line_total,
                    ),
                )

            conn.commit()
            return {"message": "Bill updated successfully", "bill_id": bill_id}
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.delete("/{bill_id}")
async def delete_bill(bill_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a bill."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("DELETE FROM bills WHERE account_id = %s AND id = %s", (account_id, bill_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Bill not found")
            
            conn.commit()
            return {"message": "Bill deleted successfully"}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
