"""PostgreSQL-backed vendors router."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


# Pydantic Models
class VendorBase(BaseModel):
    vendor_code: str = Field(..., max_length=50)
    vendor_name: str = Field(..., max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    mobile: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=200)
    gst_number: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: str = Field("India", max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    payment_terms: Optional[str] = Field(None, max_length=100)
    credit_limit: Decimal = Field(default=Decimal("0.00"))
    opening_balance: Decimal = Field(default=Decimal("0.00"))
    is_active: bool = True
    notes: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = Field(None, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    mobile: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=200)
    gst_number: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class VendorResponse(VendorBase):
    id: int
    account_id: str
    current_balance: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def _generate_vendor_code(cursor: RealDictCursor, account_id: str) -> str:
    """Generate the next vendor code for an account."""
    cursor.execute(
        "SELECT vendor_code FROM vendors WHERE account_id = %s ORDER BY id DESC LIMIT 1",
        (account_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get("vendor_code"):
        return f"VEN-{datetime.now().year}-001"
    
    last_code = row["vendor_code"]
    try:
        suffix = int(str(last_code).split("-")[-1])
    except ValueError:
        suffix = 0
    next_suffix = suffix + 1
    return f"VEN-{datetime.now().year}-{next_suffix:03d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor: VendorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new vendor."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Check if vendor code already exists
            cursor.execute(
                "SELECT id FROM vendors WHERE account_id = %s AND vendor_code = %s",
                (account_id, vendor.vendor_code)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vendor code {vendor.vendor_code} already exists"
                )
            
            # Insert vendor
            cursor.execute("""
                INSERT INTO vendors (
                    account_id, vendor_code, vendor_name, contact_person, email,
                    phone, mobile, website, gst_number, pan_number,
                    billing_address, shipping_address, city, state, country,
                    postal_code, payment_terms, credit_limit, opening_balance,
                    current_balance, is_active, notes, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, NOW()
                )
                RETURNING *
            """, (
                account_id, vendor.vendor_code, vendor.vendor_name, vendor.contact_person,
                vendor.email, vendor.phone, vendor.mobile, vendor.website,
                vendor.gst_number, vendor.pan_number, vendor.billing_address,
                vendor.shipping_address, vendor.city, vendor.state, vendor.country,
                vendor.postal_code, vendor.payment_terms, vendor.credit_limit,
                vendor.opening_balance, vendor.opening_balance, vendor.is_active,
                vendor.notes
            ))
            
            new_vendor = cursor.fetchone()
            conn.commit()
            
            return {
                "message": "Vendor created successfully",
                "vendor": dict(new_vendor)
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create vendor: {str(e)}"
            )
        finally:
            cursor.close()


@router.get("/")
async def get_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all vendors with optional filtering."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Build WHERE clause
            where_parts = ["account_id = %s"]
            params = [account_id]
            
            if search:
                where_parts.append("(vendor_name ILIKE %s OR vendor_code ILIKE %s OR contact_person ILIKE %s)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])
            
            if is_active is not None:
                where_parts.append("is_active = %s")
                params.append(is_active)
            
            where_clause = " AND ".join(where_parts)
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM vendors WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            # Get vendors
            query = f"""
                SELECT * FROM vendors
                WHERE {where_clause}
                ORDER BY created_at DESC, id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            vendors = cursor.fetchall()
            
            # Convert Decimal to float
            result = []
            for vendor in vendors:
                vendor_dict = dict(vendor)
                for key, value in vendor_dict.items():
                    if isinstance(value, Decimal):
                        vendor_dict[key] = float(value)
                result.append(vendor_dict)
            
            return {
                "total": total,
                "vendors": result,
                "skip": skip,
                "limit": limit
            }
            
        finally:
            cursor.close()


@router.get("/{vendor_id}")
async def get_vendor(
    vendor_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific vendor by ID."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute(
                "SELECT * FROM vendors WHERE account_id = %s AND id = %s",
                (account_id, vendor_id)
            )
            vendor = cursor.fetchone()
            
            if not vendor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vendor {vendor_id} not found"
                )
            
            vendor_dict = dict(vendor)
            for key, value in vendor_dict.items():
                if isinstance(value, Decimal):
                    vendor_dict[key] = float(value)
            
            return vendor_dict
            
        finally:
            cursor.close()


@router.put("/{vendor_id}")
async def update_vendor(
    vendor_id: int,
    vendor_update: VendorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a vendor."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Check if vendor exists
            cursor.execute(
                "SELECT id FROM vendors WHERE account_id = %s AND id = %s",
                (account_id, vendor_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vendor {vendor_id} not found"
                )
            
            # Build UPDATE query dynamically
            update_data = vendor_update.model_dump(exclude_unset=True)
            if not update_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )
            
            set_clause = ", ".join([f"{key} = %s" for key in update_data.keys()])
            set_clause += ", updated_at = NOW()"
            values = list(update_data.values())
            values.extend([account_id, vendor_id])
            
            cursor.execute(f"""
                UPDATE vendors
                SET {set_clause}
                WHERE account_id = %s AND id = %s
                RETURNING *
            """, values)
            
            updated_vendor = cursor.fetchone()
            conn.commit()
            
            vendor_dict = dict(updated_vendor)
            for key, value in vendor_dict.items():
                if isinstance(value, Decimal):
                    vendor_dict[key] = float(value)
            
            return {
                "message": "Vendor updated successfully",
                "vendor": vendor_dict
            }
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update vendor: {str(e)}"
            )
        finally:
            cursor.close()


@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Hard-delete a vendor.

    Note: Purchases tables use `ON DELETE RESTRICT` for vendor FKs, so we must
    delete dependent purchase records first.
    """
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Check if vendor exists
            cursor.execute(
                "SELECT id FROM vendors WHERE account_id = %s AND id = %s",
                (account_id, vendor_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vendor {vendor_id} not found"
                )
            
            # Delete dependent purchase records (children first)
            # 1) Purchase receipts + items
            cursor.execute(
                """
                DELETE FROM purchase_receipt_items pri
                WHERE pri.account_id = %s
                  AND pri.receipt_id IN (
                      SELECT pr.id FROM purchase_receipts pr
                      WHERE pr.account_id = %s AND pr.vendor_id = %s
                  )
                """,
                (account_id, account_id, vendor_id),
            )
            cursor.execute(
                "DELETE FROM purchase_receipts WHERE account_id = %s AND vendor_id = %s",
                (account_id, vendor_id),
            )

            # 2) Purchase orders + items (items cascade, but safe to delete explicitly)
            cursor.execute(
                """
                DELETE FROM purchase_order_items poi
                WHERE poi.account_id = %s
                  AND poi.po_id IN (
                      SELECT po.id FROM purchase_orders po
                      WHERE po.account_id = %s AND po.vendor_id = %s
                  )
                """,
                (account_id, account_id, vendor_id),
            )
            cursor.execute(
                "DELETE FROM purchase_orders WHERE account_id = %s AND vendor_id = %s",
                (account_id, vendor_id),
            )

            # 3) Vendor payments + allocations
            cursor.execute(
                """
                DELETE FROM vendor_payment_allocations vpa
                WHERE vpa.account_id = %s
                  AND vpa.payment_id IN (
                      SELECT vp.id FROM vendor_payments vp
                      WHERE vp.account_id = %s AND vp.vendor_id = %s
                  )
                """,
                (account_id, account_id, vendor_id),
            )
            cursor.execute(
                "DELETE FROM vendor_payments WHERE account_id = %s AND vendor_id = %s",
                (account_id, vendor_id),
            )

            # 4) Vendor credits + allocations
            cursor.execute(
                """
                DELETE FROM vendor_credit_allocations vca
                WHERE vca.account_id = %s
                  AND vca.credit_id IN (
                      SELECT vc.id FROM vendor_credits vc
                      WHERE vc.account_id = %s AND vc.vendor_id = %s
                  )
                """,
                (account_id, account_id, vendor_id),
            )
            cursor.execute(
                "DELETE FROM vendor_credits WHERE account_id = %s AND vendor_id = %s",
                (account_id, vendor_id),
            )

            # 5) Bills + items (allocations already removed above by payment/credit deletes; also cascade via bill delete)
            cursor.execute(
                """
                DELETE FROM bill_items bi
                WHERE bi.account_id = %s
                  AND bi.bill_id IN (
                      SELECT b.id FROM bills b
                      WHERE b.account_id = %s AND b.vendor_id = %s
                  )
                """,
                (account_id, account_id, vendor_id),
            )
            cursor.execute(
                "DELETE FROM bills WHERE account_id = %s AND vendor_id = %s",
                (account_id, vendor_id),
            )

            # Finally delete vendor
            cursor.execute(
                "DELETE FROM vendors WHERE account_id = %s AND id = %s",
                (account_id, vendor_id),
            )
            
            conn.commit()
            
            return {"message": f"Vendor {vendor_id} deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete vendor: {str(e)}"
            )
        finally:
            cursor.close()


@router.get("/generate-code/next")
async def generate_vendor_code(current_user: dict = Depends(get_current_user)):
    """Generate the next available vendor code."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            vendor_code = _generate_vendor_code(cursor, account_id)
            return {"vendor_code": vendor_code}
        finally:
            cursor.close()
