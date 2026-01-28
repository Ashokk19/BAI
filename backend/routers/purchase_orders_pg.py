"""PostgreSQL-backed purchase orders router."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


# Pydantic Models
class POItemBase(BaseModel):
    item_id: int
    item_name: str
    description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    discount_percentage: Decimal = Decimal("0.00")


class PurchaseOrderBase(BaseModel):
    vendor_id: int
    po_date: date
    expected_delivery_date: Optional[date] = None
    reference_number: Optional[str] = None
    status: str = "draft"
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    items: List[POItemBase]


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(BaseModel):
    vendor_id: Optional[int] = None
    po_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    reference_number: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    items: Optional[List[POItemBase]] = None


def _generate_po_number(cursor: RealDictCursor, account_id: str) -> str:
    """Generate the next PO number."""
    cursor.execute(
        "SELECT po_number FROM purchase_orders WHERE account_id = %s ORDER BY id DESC LIMIT 1",
        (account_id,),
    )
    row = cursor.fetchone()
    if not row:
        return f"PO-{datetime.now().year}-001"
    
    last_number = row["po_number"]
    try:
        suffix = int(last_number.split("-")[-1])
    except ValueError:
        suffix = 0
    return f"PO-{datetime.now().year}-{suffix + 1:03d}"


def _calculate_po_totals(items: List[POItemBase]):
    """Calculate PO totals from items."""
    subtotal = Decimal("0.00")
    tax_amount = Decimal("0.00")
    discount_amount = Decimal("0.00")
    
    for item in items:
        line_subtotal = item.quantity * item.unit_price
        item_discount = (line_subtotal * item.discount_percentage) / Decimal("100")
        line_subtotal_after_discount = line_subtotal - item_discount
        item_tax = (line_subtotal_after_discount * item.tax_rate) / Decimal("100")
        
        subtotal += line_subtotal
        discount_amount += item_discount
        tax_amount += item_tax
    
    total_amount = subtotal - discount_amount + tax_amount
    return subtotal, tax_amount, discount_amount, total_amount


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    po: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new purchase order."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Generate PO number
            po_number = _generate_po_number(cursor, account_id)
            
            # Calculate totals
            subtotal, tax_amount, discount_amount, total_amount = _calculate_po_totals(po.items)
            
            # Insert PO header
            cursor.execute("""
                INSERT INTO purchase_orders (
                    account_id, po_number, vendor_id, po_date, expected_delivery_date,
                    reference_number, status, subtotal, tax_amount, discount_amount,
                    total_amount, notes, terms_and_conditions, created_by, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                RETURNING id
            """, (
                account_id, po_number, po.vendor_id, po.po_date, po.expected_delivery_date,
                po.reference_number, po.status, subtotal, tax_amount, discount_amount,
                total_amount, po.notes, po.terms_and_conditions, current_user["username"]
            ))
            
            po_id = cursor.fetchone()["id"]
            
            # Insert PO items
            for item in po.items:
                line_subtotal = item.quantity * item.unit_price
                item_discount = (line_subtotal * item.discount_percentage) / Decimal("100")
                line_subtotal_after_discount = line_subtotal - item_discount
                item_tax = (line_subtotal_after_discount * item.tax_rate) / Decimal("100")
                line_total = line_subtotal_after_discount + item_tax
                
                cursor.execute("""
                    INSERT INTO purchase_order_items (
                        account_id, po_id, item_id, item_name, description, quantity,
                        unit_price, tax_rate, tax_amount, discount_percentage,
                        discount_amount, line_total
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    account_id, po_id, item.item_id, item.item_name, item.description,
                    item.quantity, item.unit_price, item.tax_rate, item_tax,
                    item.discount_percentage, item_discount, line_total
                ))
            
            conn.commit()
            
            return {
                "message": "Purchase order created successfully",
                "po_number": po_number,
                "po_id": po_id
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create purchase order: {str(e)}"
            )
        finally:
            cursor.close()


@router.get("/")
async def get_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all purchase orders."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            where_parts = ["po.account_id = %s"]
            params = [account_id]
            
            if vendor_id:
                where_parts.append("po.vendor_id = %s")
                params.append(vendor_id)
            
            if status_filter:
                where_parts.append("po.status = %s")
                params.append(status_filter)
            
            where_clause = " AND ".join(where_parts)
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM purchase_orders po WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            # Get POs with vendor names
            query = f"""
                SELECT po.*, v.vendor_name, v.vendor_code
                FROM purchase_orders po
                LEFT JOIN vendors v ON po.account_id = v.account_id AND po.vendor_id = v.id
                WHERE {where_clause}
                ORDER BY po.po_date DESC, po.id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            orders = cursor.fetchall()
            
            result = []
            for order in orders:
                order_dict = dict(order)
                for key, value in order_dict.items():
                    if isinstance(value, Decimal):
                        order_dict[key] = float(value)
                result.append(order_dict)
            
            return {
                "total": total,
                "purchase_orders": result,
                "skip": skip,
                "limit": limit
            }
            
        finally:
            cursor.close()


@router.get("/{po_id}")
async def get_purchase_order(
    po_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific purchase order with items."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Get PO header
            cursor.execute("""
                SELECT po.*, v.vendor_name, v.vendor_code
                FROM purchase_orders po
                LEFT JOIN vendors v ON po.account_id = v.account_id AND po.vendor_id = v.id
                WHERE po.account_id = %s AND po.id = %s
            """, (account_id, po_id))
            
            po = cursor.fetchone()
            if not po:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            
            # Get PO items
            cursor.execute("""
                SELECT * FROM purchase_order_items
                WHERE account_id = %s AND po_id = %s
                ORDER BY id
            """, (account_id, po_id))
            
            items = cursor.fetchall()
            
            po_dict = dict(po)
            for key, value in po_dict.items():
                if isinstance(value, Decimal):
                    po_dict[key] = float(value)
            
            po_dict['items'] = [
                {k: float(v) if isinstance(v, Decimal) else v for k, v in dict(item).items()}
                for item in items
            ]
            
            return po_dict
            
        finally:
            cursor.close()


@router.put("/{po_id}/status")
async def update_po_status(
    po_id: int,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Update purchase order status."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute("""
                UPDATE purchase_orders
                SET status = %s, updated_at = NOW()
                WHERE account_id = %s AND id = %s
                RETURNING *
            """, (status, account_id, po_id))
            
            updated_po = cursor.fetchone()
            if not updated_po:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            
            conn.commit()
            
            return {"message": "Status updated successfully"}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.put("/{po_id}")
async def update_purchase_order(
    po_id: int,
    po: PurchaseOrderUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a purchase order (header + optional full item replacement)."""
    account_id = current_user["account_id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute(
                "SELECT id, po_number FROM purchase_orders WHERE account_id = %s AND id = %s",
                (account_id, po_id),
            )
            existing = cursor.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Purchase order not found")

            update_data = po.dict(exclude_unset=True)

            # If items are provided, fully replace items and recompute totals.
            if po.items is not None:
                cursor.execute(
                    "DELETE FROM purchase_order_items WHERE account_id = %s AND po_id = %s",
                    (account_id, po_id),
                )

                subtotal, tax_amount, discount_amount, total_amount = _calculate_po_totals(po.items)
                update_data["subtotal"] = subtotal
                update_data["tax_amount"] = tax_amount
                update_data["discount_amount"] = discount_amount
                update_data["total_amount"] = total_amount

                for item in po.items:
                    line_subtotal = item.quantity * item.unit_price
                    item_discount = (line_subtotal * item.discount_percentage) / Decimal("100")
                    line_subtotal_after_discount = line_subtotal - item_discount
                    item_tax = (line_subtotal_after_discount * item.tax_rate) / Decimal("100")
                    line_total = line_subtotal_after_discount + item_tax

                    cursor.execute(
                        """
                        INSERT INTO purchase_order_items (
                            account_id, po_id, item_id, item_name, description, quantity,
                            unit_price, tax_rate, tax_amount, discount_percentage,
                            discount_amount, line_total
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s
                        )
                        """,
                        (
                            account_id,
                            po_id,
                            item.item_id,
                            item.item_name,
                            item.description,
                            item.quantity,
                            item.unit_price,
                            item.tax_rate,
                            item_tax,
                            item.discount_percentage,
                            item_discount,
                            line_total,
                        ),
                    )

            # Remove items from update_data (handled above)
            update_data.pop("items", None)

            if update_data:
                set_parts = []
                params = []
                for field, value in update_data.items():
                    set_parts.append(f"{field} = %s")
                    params.append(value)
                set_parts.append("updated_at = NOW()")

                sql = f"UPDATE purchase_orders SET {', '.join(set_parts)} WHERE account_id = %s AND id = %s"
                params.extend([account_id, po_id])
                cursor.execute(sql, params)

            conn.commit()

            return {
                "message": "Purchase order updated successfully",
                "po_id": po_id,
                "po_number": existing["po_number"],
            }

        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()


@router.delete("/{po_id}")
async def delete_purchase_order(
    po_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a purchase order."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cursor.execute(
                "DELETE FROM purchase_orders WHERE account_id = %s AND id = %s",
                (account_id, po_id)
            )
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            
            conn.commit()
            return {"message": "Purchase order deleted successfully"}
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
