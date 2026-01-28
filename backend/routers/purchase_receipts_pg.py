"""PostgreSQL-backed purchase receipts (Purchase Received) router."""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class ReceiptItemCreate(BaseModel):
    po_item_id: Optional[int] = None
    item_id: int
    item_name: str
    quantity_received: Decimal
    quantity_accepted: Decimal = Decimal("0.00")
    quantity_rejected: Decimal = Decimal("0.00")
    unit_price: Optional[Decimal] = None
    notes: Optional[str] = None


class ReceiptCreate(BaseModel):
    po_id: int
    vendor_id: int
    receipt_date: date
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[str] = None
    items: List[ReceiptItemCreate] = Field(default_factory=list)


def _generate_receipt_number(cursor: RealDictCursor, account_id: str) -> str:
    cursor.execute(
        "SELECT receipt_number FROM purchase_receipts WHERE account_id = %s ORDER BY id DESC LIMIT 1",
        (account_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get("receipt_number"):
        return f"REC-{datetime.now().year}-001"

    last_number = str(row["receipt_number"])
    try:
        suffix = int(last_number.split("-")[-1])
    except ValueError:
        suffix = 0
    return f"REC-{datetime.now().year}-{suffix + 1:03d}"


def _decimal_to_float(row: dict) -> dict:
    out = dict(row)
    for key, value in out.items():
        if isinstance(value, Decimal):
            out[key] = float(value)
    return out


@router.get("/")
async def list_purchase_receipts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """List purchase receipts, including PO + vendor context and progress."""

    account_id = current_user["account_id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            where_parts = ["pr.account_id = %s"]
            params = [account_id]

            if search:
                where_parts.append(
                    "(pr.receipt_number ILIKE %s OR po.po_number ILIKE %s OR v.vendor_name ILIKE %s)"
                )
                pattern = f"%{search}%"
                params.extend([pattern, pattern, pattern])

            if status_filter and status_filter != "all":
                where_parts.append("po.status = %s")
                params.append(status_filter)

            where_clause = " AND ".join(where_parts)

            cursor.execute(f"SELECT COUNT(*) AS total FROM purchase_receipts pr LEFT JOIN purchase_orders po ON pr.account_id = po.account_id AND pr.po_id = po.id LEFT JOIN vendors v ON pr.account_id = v.account_id AND pr.vendor_id = v.id WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]

            query = f"""
                WITH po_progress AS (
                    SELECT
                        poi.account_id,
                        poi.po_id,
                        COUNT(*) AS total_items,
                        SUM(CASE WHEN poi.received_quantity >= poi.quantity THEN 1 ELSE 0 END) AS received_items
                    FROM purchase_order_items poi
                    GROUP BY poi.account_id, poi.po_id
                ),
                receipt_amounts AS (
                    SELECT
                        pri.account_id,
                        pri.receipt_id,
                        COALESCE(SUM(pri.quantity_accepted * COALESCE(pri.unit_price, 0)), 0) AS received_amount
                    FROM purchase_receipt_items pri
                    GROUP BY pri.account_id, pri.receipt_id
                )
                SELECT
                    pr.id,
                    pr.receipt_number,
                    pr.receipt_date,
                    pr.po_id,
                    po.po_number,
                    po.status AS po_status,
                    po.total_amount,
                    pr.vendor_id,
                    v.vendor_name,
                    pr.status AS receipt_status,
                    pr.received_by,
                    pr.notes,
                    COALESCE(ra.received_amount, 0) AS received_amount,
                    COALESCE(pp.total_items, 0) AS total_items,
                    COALESCE(pp.received_items, 0) AS received_items
                FROM purchase_receipts pr
                LEFT JOIN purchase_orders po
                  ON pr.account_id = po.account_id AND pr.po_id = po.id
                LEFT JOIN vendors v
                  ON pr.account_id = v.account_id AND pr.vendor_id = v.id
                LEFT JOIN receipt_amounts ra
                  ON pr.account_id = ra.account_id AND pr.id = ra.receipt_id
                LEFT JOIN po_progress pp
                  ON pr.account_id = pp.account_id AND pr.po_id = pp.po_id
                WHERE {where_clause}
                ORDER BY pr.receipt_date DESC, pr.id DESC
                LIMIT %s OFFSET %s
            """
            params_with_page = params + [limit, skip]
            cursor.execute(query, params_with_page)
            rows = cursor.fetchall()

            receipts = [_decimal_to_float(dict(r)) for r in rows]

            return {
                "total": total,
                "receipts": receipts,
                "skip": skip,
                "limit": limit,
            }
        finally:
            cursor.close()


@router.get("/{receipt_id}")
async def get_purchase_receipt(
    receipt_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a purchase receipt with line items."""

    account_id = current_user["account_id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                SELECT pr.*, po.po_number, po.status AS po_status, po.total_amount, v.vendor_name
                FROM purchase_receipts pr
                LEFT JOIN purchase_orders po ON pr.account_id = po.account_id AND pr.po_id = po.id
                LEFT JOIN vendors v ON pr.account_id = v.account_id AND pr.vendor_id = v.id
                WHERE pr.account_id = %s AND pr.id = %s
                """,
                (account_id, receipt_id),
            )
            header = cursor.fetchone()
            if not header:
                raise HTTPException(status_code=404, detail="Purchase receipt not found")

            cursor.execute(
                """
                SELECT *
                FROM purchase_receipt_items
                WHERE account_id = %s AND receipt_id = %s
                ORDER BY id
                """,
                (account_id, receipt_id),
            )
            items = cursor.fetchall()

            out = _decimal_to_float(dict(header))
            out["items"] = [_decimal_to_float(dict(it)) for it in items]
            return out
        finally:
            cursor.close()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_purchase_receipt(
    payload: ReceiptCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a purchase receipt and update PO received quantities + status."""

    account_id = current_user["account_id"]

    created_at = datetime.now()

    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Validate PO exists
            cursor.execute(
                "SELECT id, vendor_id, po_number, status FROM purchase_orders WHERE account_id = %s AND id = %s",
                (account_id, payload.po_id),
            )
            po = cursor.fetchone()
            if not po:
                raise HTTPException(status_code=404, detail="Purchase order not found")

            # Vendor safety: enforce vendor from PO
            po_vendor_id = int(po["vendor_id"])
            if int(payload.vendor_id) != po_vendor_id:
                payload_vendor = int(payload.vendor_id)
                raise HTTPException(
                    status_code=400,
                    detail=f"Vendor mismatch for PO. Expected vendor_id={po_vendor_id}, got {payload_vendor}",
                )

            receipt_number = _generate_receipt_number(cursor, account_id)

            cursor.execute(
                """
                INSERT INTO purchase_receipts (
                    account_id, receipt_number, po_id, vendor_id, receipt_date,
                    reference_number, status, notes, received_by, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, 'received', %s, %s, NOW()
                )
                RETURNING id
                """,
                (
                    account_id,
                    receipt_number,
                    payload.po_id,
                    payload.vendor_id,
                    payload.receipt_date,
                    payload.reference_number,
                    payload.notes,
                    payload.received_by or current_user.get("username"),
                ),
            )
            receipt_id = cursor.fetchone()["id"]

            # Insert items + update PO item received_quantity
            for item in payload.items:
                if item.quantity_received <= 0:
                    raise HTTPException(status_code=400, detail="Quantity received must be > 0")
                if item.quantity_accepted < 0 or item.quantity_rejected < 0:
                    raise HTTPException(status_code=400, detail="Accepted/rejected quantities must be >= 0")
                if item.quantity_accepted + item.quantity_rejected != item.quantity_received:
                    raise HTTPException(
                        status_code=400,
                        detail="Accepted + rejected must equal received quantity",
                    )

                po_item_id = item.po_item_id
                if po_item_id is not None:
                    cursor.execute(
                        """
                        SELECT id, quantity, received_quantity
                        FROM purchase_order_items
                        WHERE account_id = %s AND id = %s AND po_id = %s
                        """,
                        (account_id, po_item_id, payload.po_id),
                    )
                    poi = cursor.fetchone()
                    if not poi:
                        raise HTTPException(status_code=404, detail=f"PO item {po_item_id} not found")

                    ordered_qty = Decimal(str(poi["quantity"]))
                    already_received = Decimal(str(poi.get("received_quantity") or 0))
                    new_received = already_received + item.quantity_accepted
                    if new_received > ordered_qty:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Accepted quantity exceeds remaining for PO item {po_item_id}",
                        )

                    cursor.execute(
                        """
                        UPDATE purchase_order_items
                        SET received_quantity = %s
                        WHERE account_id = %s AND id = %s
                        """,
                        (new_received, account_id, po_item_id),
                    )

                cursor.execute(
                    """
                    INSERT INTO purchase_receipt_items (
                        account_id, receipt_id, po_item_id, item_id, item_name,
                        quantity_received, quantity_accepted, quantity_rejected, unit_price, notes
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        account_id,
                        receipt_id,
                        po_item_id,
                        item.item_id,
                        item.item_name,
                        item.quantity_received,
                        item.quantity_accepted,
                        item.quantity_rejected,
                        item.unit_price,
                        item.notes,
                    ),
                )

                # Add accepted stock to inventory items and log movement.
                if item.quantity_accepted and item.quantity_accepted > 0:
                    cursor.execute(
                        """
                        UPDATE items
                        SET current_stock = COALESCE(current_stock, 0) + %s,
                            stock_quantity = COALESCE(stock_quantity, 0) + %s,
                            updated_at = %s
                        WHERE id = %s AND account_id = %s
                        """,
                        (
                            item.quantity_accepted,
                            item.quantity_accepted,
                            created_at,
                            item.item_id,
                            account_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise HTTPException(status_code=404, detail=f"Item {item.item_id} not found")

                    cursor.execute(
                        """
                        INSERT INTO inventory_logs (
                            item_id,
                            item_account_id,
                            action,
                            notes,
                            recorded_by,
                            recorded_by_account_id,
                            created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            item.item_id,
                            account_id,
                            "purchase_received",
                            f"Stock added for receipt {receipt_number} (PO {po.get('po_number')})",
                            current_user.get("id"),
                            account_id,
                            created_at,
                        ),
                    )

            # Update PO status based on received quantities
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_items,
                    SUM(CASE WHEN received_quantity >= quantity THEN 1 ELSE 0 END) AS received_items,
                    SUM(CASE WHEN received_quantity > 0 THEN 1 ELSE 0 END) AS any_received
                FROM purchase_order_items
                WHERE account_id = %s AND po_id = %s
                """,
                (account_id, payload.po_id),
            )
            agg = cursor.fetchone() or {}
            total_items = int(agg.get("total_items") or 0)
            received_items = int(agg.get("received_items") or 0)
            any_received = int(agg.get("any_received") or 0)

            new_status: Optional[str] = None
            if total_items > 0 and received_items == total_items:
                new_status = "received"
            elif any_received > 0:
                new_status = "partially_received"

            if new_status:
                cursor.execute(
                    "UPDATE purchase_orders SET status = %s, updated_at = NOW() WHERE account_id = %s AND id = %s",
                    (new_status, account_id, payload.po_id),
                )

            conn.commit()

            return {
                "message": "Purchase receipt created successfully",
                "receipt_id": receipt_id,
                "receipt_number": receipt_number,
            }
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cursor.close()
