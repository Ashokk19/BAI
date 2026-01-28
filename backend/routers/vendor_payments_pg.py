"""PostgreSQL-backed vendor payments router."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class PaymentAllocation(BaseModel):
    bill_id: int
    amount_allocated: Decimal


class CreditApplication(BaseModel):
    amount: Decimal = Decimal("0.00")


class VendorPaymentCreate(BaseModel):
    vendor_id: int
    payment_date: date
    payment_mode: str = "cash"
    reference_number: Optional[str] = None
    amount: Decimal
    bank_charges: Decimal = Decimal("0.00")
    tds_amount: Decimal = Decimal("0.00")
    notes: Optional[str] = None
    allocations: List[PaymentAllocation] = []
    apply_vendor_credit_amount: Decimal = Decimal("0.00")


def _generate_payment_number(cursor, account_id: str) -> str:
    """Generate payment number."""
    cursor.execute("SELECT payment_number FROM vendor_payments WHERE account_id = %s ORDER BY id DESC LIMIT 1", (account_id,))
    row = cursor.fetchone()
    if not row:
        return f"VPAY-{datetime.now().year}-001"
    try:
        suffix = int(row["payment_number"].split("-")[-1])
    except ValueError:
        suffix = 0
    return f"VPAY-{datetime.now().year}-{suffix + 1:03d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vendor_payment(payment: VendorPaymentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new vendor payment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            payment_number = _generate_payment_number(cursor, account_id)
            
            cursor.execute("""
                INSERT INTO vendor_payments (
                    account_id, payment_number, vendor_id, payment_date, payment_mode,
                    reference_number, amount, bank_charges, tds_amount, notes, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
            """, (
                account_id, payment_number, payment.vendor_id, payment.payment_date,
                payment.payment_mode, payment.reference_number, payment.amount,
                payment.bank_charges, payment.tds_amount, payment.notes
            ))
            
            payment_id = cursor.fetchone()["id"]
            
            # Create allocations
            for alloc in payment.allocations:
                cursor.execute("""
                    INSERT INTO vendor_payment_allocations (
                        account_id, payment_id, bill_id, amount_allocated, created_at
                    ) VALUES (%s, %s, %s, %s, NOW())
                """, (account_id, payment_id, alloc.bill_id, alloc.amount_allocated))

                if alloc.amount_allocated and alloc.amount_allocated != Decimal("0.00"):
                    # Update bill paid amount and status for cash/actual payment allocations
                    cursor.execute("""
                        UPDATE bills
                        SET paid_amount = paid_amount + %s,
                            balance_due = GREATEST(total_amount - (paid_amount + %s), 0),
                            status = CASE
                                WHEN (paid_amount + %s) >= total_amount THEN 'payment_completed'
                                WHEN (paid_amount + %s) > 0 THEN 'partially_paid'
                                ELSE status
                            END,
                            updated_at = NOW()
                        WHERE account_id = %s AND id = %s
                    """, (
                        alloc.amount_allocated,
                        alloc.amount_allocated,
                        alloc.amount_allocated,
                        alloc.amount_allocated,
                        account_id,
                        alloc.bill_id,
                    ))

            # Apply vendor credits (optional)
            credit_to_apply = Decimal(str(payment.apply_vendor_credit_amount or 0))
            if credit_to_apply > 0:
                if len(payment.allocations) != 1:
                    raise HTTPException(
                        status_code=400,
                        detail="Credit application currently requires exactly one bill allocation",
                    )

                bill_id = int(payment.allocations[0].bill_id)

                cursor.execute(
                    """
                    SELECT id, vendor_id, balance_due
                    FROM bills
                    WHERE account_id = %s AND id = %s
                    """,
                    (account_id, bill_id),
                )
                bill_row = cursor.fetchone()
                if not bill_row:
                    raise HTTPException(status_code=404, detail="Bill not found")
                if int(bill_row["vendor_id"]) != int(payment.vendor_id):
                    raise HTTPException(status_code=400, detail="Bill vendor does not match payment vendor")

                bill_balance_due = Decimal(str(bill_row.get("balance_due") or 0))
                if credit_to_apply > bill_balance_due:
                    raise HTTPException(status_code=400, detail="Credit amount exceeds bill balance due")

                cursor.execute(
                    """
                    SELECT id, balance_amount
                    FROM vendor_credits
                    WHERE account_id = %s
                      AND vendor_id = %s
                      AND balance_amount > 0
                    ORDER BY credit_date ASC, id ASC
                    FOR UPDATE
                    """,
                    (account_id, payment.vendor_id),
                )
                credits = cursor.fetchall()
                remaining = credit_to_apply
                for credit in credits:
                    if remaining <= 0:
                        break

                    credit_id = int(credit["id"])
                    credit_balance = Decimal(str(credit.get("balance_amount") or 0))
                    if credit_balance <= 0:
                        continue

                    use_amount = credit_balance if credit_balance <= remaining else remaining

                    cursor.execute(
                        """
                        INSERT INTO vendor_credit_allocations (account_id, credit_id, bill_id, amount_allocated, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                        """,
                        (account_id, credit_id, bill_id, use_amount),
                    )

                    cursor.execute(
                        """
                        UPDATE vendor_credits
                        SET used_amount = used_amount + %s,
                            balance_amount = GREATEST(balance_amount - %s, 0),
                            status = CASE
                                WHEN (balance_amount - %s) <= 0 THEN 'closed'
                                WHEN (used_amount + %s) > 0 THEN 'applied'
                                ELSE status
                            END,
                            updated_at = NOW()
                        WHERE account_id = %s AND id = %s
                        """,
                        (use_amount, use_amount, use_amount, use_amount, account_id, credit_id),
                    )

                    remaining -= use_amount

                if remaining > 0:
                    raise HTTPException(status_code=400, detail="Insufficient vendor credit balance")

                # Update bill as settled via credit
                cursor.execute(
                    """
                    UPDATE bills
                    SET paid_amount = paid_amount + %s,
                        balance_due = GREATEST(total_amount - (paid_amount + %s), 0),
                        status = CASE
                            WHEN (paid_amount + %s) >= total_amount THEN 'payment_completed'
                            WHEN (paid_amount + %s) > 0 THEN 'partially_paid'
                            ELSE status
                        END,
                        updated_at = NOW()
                    WHERE account_id = %s AND id = %s
                    """,
                    (credit_to_apply, credit_to_apply, credit_to_apply, credit_to_apply, account_id, bill_id),
                )
            
            conn.commit()
            return {
                "message": "Payment created successfully",
                "payment_id": payment_id,
                "payment_number": payment_number,
                "credit_applied_amount": float(credit_to_apply) if credit_to_apply else 0,
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.get("/")
async def get_vendor_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    vendor_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all vendor payments."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            where_parts = ["vp.account_id = %s"]
            params = [account_id]
            
            if vendor_id:
                where_parts.append("vp.vendor_id = %s")
                params.append(vendor_id)
            
            where_clause = " AND ".join(where_parts)
            
            cursor.execute(f"SELECT COUNT(*) as total FROM vendor_payments vp WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            query = f"""
                SELECT
                    vp.*, v.vendor_name, v.vendor_code,
                    fb.bill_id AS first_bill_id,
                    fb.bill_number AS first_bill_number,
                    COALESCE(allocs.allocated_amount, 0) AS allocated_amount,
                    COALESCE(credit_used.credit_used_amount, 0) AS credit_used_amount
                FROM vendor_payments vp
                LEFT JOIN vendors v ON vp.account_id = v.account_id AND vp.vendor_id = v.id
                LEFT JOIN LATERAL (
                    SELECT b.id AS bill_id, b.bill_number
                    FROM vendor_payment_allocations vpa
                    JOIN bills b ON vpa.account_id = b.account_id AND vpa.bill_id = b.id
                    WHERE vpa.account_id = vp.account_id AND vpa.payment_id = vp.id
                    ORDER BY vpa.id ASC
                    LIMIT 1
                ) fb ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(vpa.amount_allocated), 0) AS allocated_amount
                    FROM vendor_payment_allocations vpa
                    WHERE vpa.account_id = vp.account_id AND vpa.payment_id = vp.id
                ) allocs ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(vca.amount_allocated), 0) AS credit_used_amount
                    FROM vendor_credit_allocations vca
                    WHERE vca.account_id = vp.account_id
                      AND fb.bill_id IS NOT NULL
                      AND vca.bill_id = fb.bill_id
                      AND vca.created_at >= vp.created_at
                      AND vca.created_at <= (vp.created_at + INTERVAL '10 seconds')
                ) credit_used ON TRUE
                WHERE {where_clause}
                ORDER BY vp.payment_date DESC, vp.id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            payments = cursor.fetchall()
            
            result = [{k: float(v) if isinstance(v, Decimal) else v for k, v in dict(p).items()} for p in payments]
            
            return {"total": total, "payments": result, "skip": skip, "limit": limit}
            
        finally:
            cursor.close()


@router.get("/{payment_id}")
async def get_vendor_payment(payment_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific vendor payment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT vp.*, v.vendor_name, v.vendor_code
                FROM vendor_payments vp
                LEFT JOIN vendors v ON vp.account_id = v.account_id AND vp.vendor_id = v.id
                WHERE vp.account_id = %s AND vp.id = %s
            """, (account_id, payment_id))
            
            payment = cursor.fetchone()
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            cursor.execute("""
                SELECT vpa.*, b.bill_number
                FROM vendor_payment_allocations vpa
                LEFT JOIN bills b ON vpa.account_id = b.account_id AND vpa.bill_id = b.id
                WHERE vpa.account_id = %s AND vpa.payment_id = %s
            """, (account_id, payment_id))
            
            allocations = cursor.fetchall()
            
            payment_dict = {k: float(v) if isinstance(v, Decimal) else v for k, v in dict(payment).items()}
            payment_dict['allocations'] = [{k: float(v) if isinstance(v, Decimal) else v for k, v in dict(a).items()} for a in allocations]
            
            return payment_dict
            
        finally:
            cursor.close()


@router.delete("/{payment_id}")
async def delete_vendor_payment(payment_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a vendor payment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("DELETE FROM vendor_payments WHERE account_id = %s AND id = %s", (account_id, payment_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Payment not found")
            
            conn.commit()
            return {"message": "Payment deleted successfully"}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
