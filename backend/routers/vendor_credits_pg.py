"""PostgreSQL-backed vendor credits router."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class VendorCreditCreate(BaseModel):
    vendor_id: int
    bill_id: Optional[int] = None
    credit_date: date
    reason: Optional[str] = None
    credit_amount: Decimal
    notes: Optional[str] = None


class VendorCreditUpdate(BaseModel):
    vendor_id: Optional[int] = None
    bill_id: Optional[int] = None
    credit_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    credit_amount: Optional[Decimal] = None
    notes: Optional[str] = None


def _generate_credit_number(cursor, account_id: str) -> str:
    """Generate credit note number."""
    cursor.execute("SELECT credit_note_number FROM vendor_credits WHERE account_id = %s ORDER BY id DESC LIMIT 1", (account_id,))
    row = cursor.fetchone()
    if not row:
        return f"VCN-{datetime.now().year}-001"
    try:
        suffix = int(row["credit_note_number"].split("-")[-1])
    except ValueError:
        suffix = 0
    return f"VCN-{datetime.now().year}-{suffix + 1:03d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vendor_credit(credit: VendorCreditCreate, current_user: dict = Depends(get_current_user)):
    """Create a new vendor credit note."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            credit_number = _generate_credit_number(cursor, account_id)
            
            cursor.execute("""
                INSERT INTO vendor_credits (
                    account_id, credit_note_number, vendor_id, bill_id, credit_date,
                    reason, status, credit_amount, used_amount, balance_amount, notes, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'open', %s, 0, %s, %s, NOW())
                RETURNING id
            """, (
                account_id, credit_number, credit.vendor_id, credit.bill_id,
                credit.credit_date, credit.reason, credit.credit_amount,
                credit.credit_amount, credit.notes
            ))
            
            credit_id = cursor.fetchone()["id"]
            
            conn.commit()
            return {"message": "Credit note created successfully", "credit_note_number": credit_number, "credit_id": credit_id}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.put("/{credit_id}")
async def update_vendor_credit(
    credit_id: int,
    credit: VendorCreditUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a vendor credit.

    Safety rules:
    - If used_amount > 0, credit_amount cannot be set below used_amount.
    - If used_amount > 0, vendor_id cannot be changed.
    """
    account_id = current_user["account_id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute(
                "SELECT id, vendor_id, used_amount, credit_amount, status FROM vendor_credits WHERE account_id = %s AND id = %s",
                (account_id, credit_id),
            )
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Credit note not found")

            used_amount = existing.get("used_amount") or Decimal("0")
            existing_vendor_id = existing.get("vendor_id")

            if credit.vendor_id is not None and used_amount > 0 and credit.vendor_id != existing_vendor_id:
                raise HTTPException(status_code=400, detail="Cannot change vendor for a credit that has been used")

            new_credit_amount = credit.credit_amount
            if new_credit_amount is not None:
                if new_credit_amount < used_amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"credit_amount cannot be less than used_amount ({used_amount})",
                    )

            fields = []
            params: List[object] = []

            if credit.vendor_id is not None:
                fields.append("vendor_id = %s")
                params.append(credit.vendor_id)

            if credit.bill_id is not None:
                fields.append("bill_id = %s")
                params.append(credit.bill_id)

            if credit.credit_date is not None:
                fields.append("credit_date = %s")
                params.append(credit.credit_date)

            if credit.reason is not None:
                fields.append("reason = %s")
                params.append(credit.reason)

            if credit.status is not None:
                fields.append("status = %s")
                params.append(credit.status)

            if credit.notes is not None:
                fields.append("notes = %s")
                params.append(credit.notes)

            if new_credit_amount is not None:
                # Keep balance consistent with used_amount
                fields.append("credit_amount = %s")
                params.append(new_credit_amount)
                fields.append("balance_amount = %s")
                params.append(new_credit_amount - used_amount)

            if not fields:
                return {"message": "No changes", "credit_id": credit_id}

            fields.append("updated_at = NOW()")
            params.extend([account_id, credit_id])

            cursor.execute(
                f"UPDATE vendor_credits SET {', '.join(fields)} WHERE account_id = %s AND id = %s",
                params,
            )

            conn.commit()
            return {"message": "Credit note updated successfully", "credit_id": credit_id}

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.get("/")
async def get_vendor_credits(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all vendor credits."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            where_parts = ["vc.account_id = %s"]
            params = [account_id]
            
            if vendor_id:
                where_parts.append("vc.vendor_id = %s")
                params.append(vendor_id)
            
            if status_filter:
                where_parts.append("vc.status = %s")
                params.append(status_filter)
            
            where_clause = " AND ".join(where_parts)
            
            cursor.execute(f"SELECT COUNT(*) as total FROM vendor_credits vc WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            query = f"""
                SELECT vc.*, v.vendor_name, v.vendor_code
                FROM vendor_credits vc
                LEFT JOIN vendors v ON vc.account_id = v.account_id AND vc.vendor_id = v.id
                WHERE {where_clause}
                ORDER BY vc.credit_date DESC, vc.id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            credits = cursor.fetchall()
            
            result = [{k: float(v) if isinstance(v, Decimal) else v for k, v in dict(c).items()} for c in credits]
            
            return {"total": total, "credits": result, "skip": skip, "limit": limit}
            
        finally:
            cursor.close()


@router.get("/{credit_id}")
async def get_vendor_credit(credit_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific vendor credit."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT vc.*, v.vendor_name, v.vendor_code
                FROM vendor_credits vc
                LEFT JOIN vendors v ON vc.account_id = v.account_id AND vc.vendor_id = v.id
                WHERE vc.account_id = %s AND vc.id = %s
            """, (account_id, credit_id))
            
            credit = cursor.fetchone()
            if not credit:
                raise HTTPException(status_code=404, detail="Credit note not found")
            
            credit_dict = {k: float(v) if isinstance(v, Decimal) else v for k, v in dict(credit).items()}
            
            return credit_dict
            
        finally:
            cursor.close()


@router.delete("/{credit_id}")
async def delete_vendor_credit(credit_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a vendor credit."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("DELETE FROM vendor_credits WHERE account_id = %s AND id = %s", (account_id, credit_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Credit note not found")
            
            conn.commit()
            return {"message": "Credit note deleted successfully"}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
