"""PostgreSQL-backed invoice router without SQLAlchemy."""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from schemas.invoice_schema import InvoiceCreate, InvoiceItemResponse, InvoiceResponse
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


def _ensure_invoice_items_hsn_code_column() -> None:
    """Ensure invoice_items table has hsn_code column."""
    try:
        with postgres_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                ALTER TABLE invoice_items
                ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50)
                """
            )
            conn.commit()
    except Exception as e:
        print(f"Error ensuring invoice_items.hsn_code column: {e}")


def _ensure_invoices_freight_charges_column() -> None:
    """Ensure invoices table has freight_charges and freight_gst_rate columns."""
    try:
        with postgres_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                ALTER TABLE invoices
                ADD COLUMN IF NOT EXISTS freight_charges NUMERIC(12,2) DEFAULT 0.00
                """
            )
            cursor.execute(
                """
                ALTER TABLE invoices
                ADD COLUMN IF NOT EXISTS freight_gst_rate NUMERIC(5,2) DEFAULT 0.00
                """
            )
            conn.commit()
    except Exception as e:
        print(f"Error ensuring invoices.freight_charges/freight_gst_rate columns: {e}")


def _generate_invoice_number(cursor: RealDictCursor, account_id: str) -> str:
    """Generate the next invoice number for an account.
    
    Uses last_invoice_number from organizations table as the authoritative source.
    Falls back to scanning invoices table if org setting is 0 or missing.
    """
    # First check the organization's last_invoice_number
    cursor.execute(
        "SELECT last_invoice_number FROM organizations WHERE account_id = %s LIMIT 1",
        (account_id,),
    )
    org_row = cursor.fetchone()
    org_last = (org_row.get("last_invoice_number") or 0) if org_row else 0

    # Also check the last invoice in the invoices table
    cursor.execute(
        """
        SELECT invoice_number
        FROM invoices
        WHERE account_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (account_id,),
    )
    row = cursor.fetchone()
    db_suffix = 0
    if row and row.get("invoice_number"):
        try:
            db_suffix = int(str(row["invoice_number"]).split("-")[-1])
        except ValueError:
            db_suffix = 0

    # Use whichever is higher
    next_suffix = max(org_last, db_suffix) + 1

    # Update the organization's last_invoice_number
    cursor.execute(
        "UPDATE organizations SET last_invoice_number = %s, updated_at = NOW() WHERE account_id = %s",
        (next_suffix, account_id),
    )

    return f"INV-{account_id}-{datetime.now().year}-{next_suffix:03d}"


def _calculate_gst_amounts(
    item: Dict[str, Decimal], customer_state: str, company_state: str
) -> Dict[str, Decimal]:
    """Calculate GST breakdown for an invoice item."""
    quantity = Decimal(item.get("quantity", 0))
    unit_price = Decimal(item.get("unit_price", 0))
    discount_amount = Decimal(item.get("discount_amount", 0))
    gst_rate = Decimal(item.get("gst_rate", 0))

    base_amount = (quantity * unit_price) - discount_amount
    if base_amount < 0:
        base_amount = Decimal("0")

    is_inter_state = (customer_state or "").strip().lower() != (
        company_state or ""
    ).strip().lower()

    igst_rate = Decimal("0")
    cgst_rate = Decimal("0")
    sgst_rate = Decimal("0")
    igst_amount = Decimal("0")
    cgst_amount = Decimal("0")
    sgst_amount = Decimal("0")

    if is_inter_state:
        igst_rate = gst_rate
        igst_amount = (base_amount * igst_rate) / Decimal("100")
    else:
        cgst_rate = gst_rate / Decimal("2")
        sgst_rate = gst_rate / Decimal("2")
        cgst_amount = (base_amount * cgst_rate) / Decimal("100")
        sgst_amount = (base_amount * sgst_rate) / Decimal("100")

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
        "line_total": line_total,
    }


@router.get("/")
async def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=10000),
    sort_by: str = Query("id"),
    sort_order: str = Query("desc"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get paginated list of invoices."""
    
    account_id = current_user["account_id"]
    
    # Validate sort_by to prevent SQL injection
    allowed_sort_fields = ["id", "invoice_number", "invoice_date", "total_amount", "status", "customer_id"]
    if sort_by not in allowed_sort_fields:
        sort_by = "id"
    
    # Validate sort_order
    if sort_order.lower() not in ["asc", "desc"]:
        sort_order = "desc"
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Build WHERE clause
            where_conditions = ["i.account_id = %s"]
            params = [account_id]
            
            if search:
                where_conditions.append("(i.invoice_number ILIKE %s OR c.name ILIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            if status:
                where_conditions.append("i.status = %s")
                params.append(status)
            
            if date_from:
                where_conditions.append("i.invoice_date >= %s")
                params.append(date_from)
            
            if date_to:
                where_conditions.append("i.invoice_date <= %s")
                params.append(date_to)
            
            where_clause = " AND ".join(where_conditions)
            
            # Get total count - count distinct invoices to avoid duplicates from joins
            count_query = f"""
                SELECT COUNT(DISTINCT i.id) as total
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id AND i.account_id = c.account_id
                WHERE {where_clause}
            """
            print(f"🔍 DEBUG: Executing count query: {count_query}")
            print(f"🔍 DEBUG: With params: {params}")
            cursor.execute(count_query, params)
            result = cursor.fetchone()
            print(f"🔍 DEBUG: Count query result: {result}")
            total = result["total"]
            print(f"📊 Invoice count query returned: {total} invoices for account {account_id}")
            
            # Get paginated invoices
            query = f"""
                SELECT 
                    i.id, i.account_id, i.invoice_number, i.customer_id,
                    i.invoice_date, i.due_date, i.status, i.invoice_type,
                    i.subtotal, i.tax_amount, i.total_cgst, i.total_sgst, i.total_igst,
                    i.discount_amount, i.freight_charges, i.freight_gst_rate, i.total_amount, i.paid_amount,
                    i.payment_terms, i.currency, i.created_at, i.updated_at,
                    c.name as customer_name
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id AND i.account_id = c.account_id
                WHERE {where_clause}
                ORDER BY i.{sort_by} {sort_order.upper()}
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            invoices = cursor.fetchall()
            
            # Convert Decimal to float for JSON serialization
            result_invoices = []
            for inv in invoices:
                inv_dict = dict(inv)
                for key, value in inv_dict.items():
                    if isinstance(value, Decimal):
                        inv_dict[key] = float(value)
                
                # Calculate balance_due
                invoice_total = float(inv_dict.get("total_amount") or 0)
                paid = float(inv_dict.get("paid_amount") or 0)
                inv_dict["balance_due"] = invoice_total - paid
                inv_dict["is_paid"] = paid >= invoice_total
                
                result_invoices.append(inv_dict)
            
            print(f"🔍 DEBUG: Returning response with total={total}, invoices count={len(result_invoices)}")
            return {
                "invoices": result_invoices,
                "total": total,
                "skip": skip,
                "limit": limit
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch invoices: {e}"
            )
        finally:
            cursor.close()


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a single invoice by ID with its items."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Get invoice
            cursor.execute(
                """
                SELECT * FROM invoices
                WHERE id = %s AND account_id = %s
                """,
                (invoice_id, account_id),
            )
            invoice = cursor.fetchone()
            
            if not invoice:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found"
                )
            
            # Get invoice items
            cursor.execute(
                """
                SELECT * FROM invoice_items
                WHERE invoice_id = %s AND account_id = %s
                ORDER BY id
                """,
                (invoice_id, account_id),
            )
            items = cursor.fetchall()
            
            # Convert to dict and add items
            invoice_dict = dict(invoice)
            invoice_dict["items"] = [dict(item) for item in items]
            
            return invoice_dict
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch invoice: {e}"
            )
        finally:
            cursor.close()


@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create an invoice using direct PostgreSQL queries."""

    # Ensure required columns exist
    _ensure_invoice_items_hsn_code_column()
    _ensure_invoices_freight_charges_column()

    account_id = current_user["account_id"]

    if not invoice_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice must contain at least one item",
        )

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                SELECT id, account_id, state
                FROM customers
                WHERE id = %s AND account_id = %s
                """,
                (invoice_data.customer_id, account_id),
            )
            customer = cursor.fetchone()
            if not customer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

            customer_state = (
                invoice_data.customer_state
                or customer.get("state")
                or "Tamil Nadu"
            )
            company_state = invoice_data.company_state or "Tamil Nadu"

            subtotal = Decimal("0")
            total_tax = Decimal("0")
            total_cgst = Decimal("0")
            total_sgst = Decimal("0")
            total_igst = Decimal("0")
            total_discount = Decimal("0")

            item_rows: List[Dict[str, Decimal]] = []

            for payload_item in invoice_data.items:
                cursor.execute(
                    """
                    SELECT id, account_id, name, description, sku, current_stock
                    FROM items
                    WHERE id = %s AND account_id = %s
                    """,
                    (payload_item.item_id, account_id),
                )
                db_item = cursor.fetchone()
                if not db_item:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Item {payload_item.item_id} not found",
                    )

                quantity = Decimal(payload_item.quantity)
                current_stock = db_item.get("current_stock")
                if current_stock is not None and Decimal(current_stock) < quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for item {db_item['name']}",
                    )

                item_dict = {
                    "quantity": Decimal(payload_item.quantity),
                    "unit_price": Decimal(payload_item.unit_price),
                    "discount_amount": Decimal(payload_item.discount_amount or 0),
                    "gst_rate": Decimal(payload_item.gst_rate or 0),
                }
                gst_values = _calculate_gst_amounts(item_dict, customer_state, company_state)

                subtotal += gst_values["base_amount"]
                total_tax += gst_values["tax_amount"]
                total_cgst += gst_values["cgst_amount"]
                total_sgst += gst_values["sgst_amount"]
                total_igst += gst_values["igst_amount"]
                total_discount += Decimal(payload_item.discount_amount or 0)

                item_rows.append(
                    {
                        "db_item": db_item,
                        "payload": payload_item,
                        "gst": gst_values,
                    }
                )

            invoice_number = _generate_invoice_number(cursor, account_id)
            created_at = datetime.utcnow()

            cursor.execute(
                """
                INSERT INTO invoices (
                    account_id,
                    invoice_number,
                    customer_id,
                    invoice_date,
                    due_date,
                    status,
                    invoice_type,
                    subtotal,
                    tax_amount,
                    total_cgst,
                    total_sgst,
                    total_igst,
                    discount_amount,
                    freight_charges,
                    freight_gst_rate,
                    total_amount,
                    paid_amount,
                    payment_terms,
                    currency,
                    billing_address,
                    shipping_address,
                    notes,
                    terms_conditions,
                    created_by,
                    created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    account_id,
                    invoice_number,
                    invoice_data.customer_id,
                    invoice_data.invoice_date,
                    invoice_data.due_date,
                    invoice_data.status or "draft",
                    invoice_data.invoice_type or "sale",
                    subtotal,
                    total_tax,
                    total_cgst,
                    total_sgst,
                    total_igst,
                    total_discount,
                    Decimal(str(invoice_data.freight_charges or 0)),
                    Decimal(str(invoice_data.freight_gst_rate or 0)),
                    subtotal + total_tax + Decimal(str(invoice_data.freight_charges or 0)) + (Decimal(str(invoice_data.freight_charges or 0)) * Decimal(str(invoice_data.freight_gst_rate or 0)) / Decimal('100')),
                    Decimal("0"),
                    invoice_data.payment_terms or "immediate",
                    invoice_data.currency or "INR",
                    invoice_data.billing_address,
                    invoice_data.shipping_address,
                    invoice_data.notes,
                    invoice_data.terms_conditions,
                    current_user["id"],
                    created_at,
                ),
            )
            invoice_row = cursor.fetchone()
            invoice_id = invoice_row["id"]

            for row in item_rows:
                payload = row["payload"]
                db_item = row["db_item"]
                gst = row["gst"]

                cursor.execute(
                    """
                    INSERT INTO invoice_items (
                        account_id,
                        invoice_id,
                        item_id,
                        item_name,
                        item_description,
                        item_sku,
                        hsn_code,
                        quantity,
                        unit_price,
                        discount_rate,
                        discount_amount,
                        tax_rate,
                        tax_amount,
                        cgst_rate,
                        sgst_rate,
                        igst_rate,
                        cgst_amount,
                        sgst_amount,
                        igst_amount,
                        line_total,
                        created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        account_id,
                        invoice_id,
                        db_item["id"],
                        payload.item_name or db_item.get("name"),
                        payload.item_description or db_item.get("description"),
                        payload.item_sku or db_item.get("sku"),
                        payload.hsn_code or db_item.get("hsn_code"),
                        Decimal(payload.quantity),
                        Decimal(payload.unit_price),
                        Decimal(payload.discount_rate or 0),
                        Decimal(payload.discount_amount or 0),
                        Decimal(payload.gst_rate or 0),
                        gst["tax_amount"],
                        gst["cgst_rate"],
                        gst["sgst_rate"],
                        gst["igst_rate"],
                        gst["cgst_amount"],
                        gst["sgst_amount"],
                        gst["igst_amount"],
                        gst["line_total"],
                        created_at,
                    ),
                )

                # Get current stock before update
                current_stock_before = float(db_item.get("current_stock") or 0)
                current_stock_after = current_stock_before - float(payload.quantity)
                
                cursor.execute(
                    """
                    UPDATE items
                    SET current_stock = COALESCE(current_stock, 0) - %s,
                        stock_quantity = COALESCE(stock_quantity, 0) - %s,
                        updated_at = %s
                    WHERE id = %s AND account_id = %s
                    """,
                    (
                        Decimal(payload.quantity),
                        Decimal(payload.quantity),
                        created_at,
                        db_item["id"],
                        account_id,
                    ),
                )

                cursor.execute(
                    """
                    INSERT INTO inventory_logs (
                        item_id,
                        item_account_id,
                        action,
                        notes,
                        recorded_by,
                        recorded_by_account_id,
                        quantity_before,
                        quantity_after,
                        created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        db_item["id"],
                        account_id,
                        "stock_out",
                        f"Stock reduced for invoice {invoice_number}",
                        current_user["id"],
                        account_id,
                        current_stock_before,
                        current_stock_after,
                        created_at,
                    ),
                )

            conn.commit()

            cursor.execute(
                """
                SELECT *
                FROM invoices
                WHERE id = %s AND account_id = %s
                """,
                (invoice_id, account_id),
            )
            invoice_record = cursor.fetchone()

            cursor.execute(
                """
                SELECT *
                FROM invoice_items
                WHERE invoice_id = %s AND account_id = %s
                ORDER BY id
                """,
                (invoice_id, account_id),
            )
            invoice_items = cursor.fetchall()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:  # pragma: no cover - unexpected errors
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create invoice: {exc}",
            )
        finally:
            cursor.close()

    if not invoice_record:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invoice not created")

    def _to_decimal(val) -> Decimal:
        return Decimal(val) if val is not None else Decimal("0")

    invoice_response = {
        "id": invoice_record["id"],
        "account_id": invoice_record["account_id"],
        "customer_id": invoice_record["customer_id"],
        "invoice_number": invoice_record["invoice_number"],
        "invoice_date": invoice_record["invoice_date"],
        "due_date": invoice_record.get("due_date"),
        "status": invoice_record.get("status"),
        "invoice_type": invoice_record.get("invoice_type"),
        "subtotal": _to_decimal(invoice_record.get("subtotal")),
        "tax_amount": _to_decimal(invoice_record.get("tax_amount")),
        "total_cgst": _to_decimal(invoice_record.get("total_cgst")),
        "total_sgst": _to_decimal(invoice_record.get("total_sgst")),
        "total_igst": _to_decimal(invoice_record.get("total_igst")),
        "discount_amount": _to_decimal(invoice_record.get("discount_amount")),
        "freight_charges": _to_decimal(invoice_record.get("freight_charges")),
        "freight_gst_rate": _to_decimal(invoice_record.get("freight_gst_rate")),
        "total_amount": _to_decimal(invoice_record.get("total_amount")),
        "paid_amount": _to_decimal(invoice_record.get("paid_amount")),
        "payment_terms": invoice_record.get("payment_terms"),
        "currency": invoice_record.get("currency"),
        "billing_address": invoice_record.get("billing_address"),
        "shipping_address": invoice_record.get("shipping_address"),
        "notes": invoice_record.get("notes"),
        "terms_conditions": invoice_record.get("terms_conditions"),
        "created_by": invoice_record.get("created_by"),
        "created_at": invoice_record.get("created_at"),
        "updated_at": invoice_record.get("updated_at"),
        "balance_due": _to_decimal(invoice_record.get("total_amount")) - _to_decimal(invoice_record.get("paid_amount")),
        "is_paid": _to_decimal(invoice_record.get("paid_amount")) >= _to_decimal(invoice_record.get("total_amount")),
        "items": [],
    }

    items_response: List[InvoiceItemResponse] = []
    for item in invoice_items:
        items_response.append(
            InvoiceItemResponse(
                id=item["id"],
                invoice_id=item["invoice_id"],
                item_id=item["item_id"],
                item_name=item.get("item_name"),
                item_description=item.get("item_description"),
                item_sku=item.get("item_sku"),
                hsn_code=item.get("hsn_code"),
                quantity=_to_decimal(item.get("quantity")),
                unit_price=_to_decimal(item.get("unit_price")),
                discount_rate=_to_decimal(item.get("discount_rate")),
                discount_amount=_to_decimal(item.get("discount_amount")),
                gst_rate=_to_decimal(item.get("tax_rate")),
                cgst_rate=_to_decimal(item.get("cgst_rate")),
                sgst_rate=_to_decimal(item.get("sgst_rate")),
                igst_rate=_to_decimal(item.get("igst_rate")),
                tax_amount=_to_decimal(item.get("tax_amount")),
                cgst_amount=_to_decimal(item.get("cgst_amount")),
                sgst_amount=_to_decimal(item.get("sgst_amount")),
                igst_amount=_to_decimal(item.get("igst_amount")),
                line_total=_to_decimal(item.get("line_total")),
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at"),
            )
        )

    invoice_response["items"] = items_response
    return InvoiceResponse(**invoice_response)


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    """Update an existing invoice."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Check if invoice exists
            cursor.execute(
                "SELECT id FROM invoices WHERE id = %s AND account_id = %s",
                (invoice_id, account_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found"
                )
            
            # Get customer info
            cursor.execute(
                "SELECT state FROM customers WHERE id = %s AND account_id = %s",
                (invoice_data.customer_id, account_id)
            )
            customer = cursor.fetchone()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Customer not found"
                )
            
            customer_state = invoice_data.customer_state or customer.get("state") or "Tamil Nadu"
            company_state = invoice_data.company_state or "Tamil Nadu"
            
            # Calculate totals
            subtotal = Decimal("0")
            total_tax = Decimal("0")
            total_cgst = Decimal("0")
            total_sgst = Decimal("0")
            total_igst = Decimal("0")
            
            items_to_insert = []
            for item in invoice_data.items:
                gst_calc = _calculate_gst_amounts(
                    {
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "discount_amount": item.discount_amount or 0,
                        "gst_rate": item.gst_rate or 0
                    },
                    customer_state,
                    company_state
                )
                
                subtotal += gst_calc["base_amount"]
                total_cgst += gst_calc["cgst_amount"]
                total_sgst += gst_calc["sgst_amount"]
                total_igst += gst_calc["igst_amount"]
                total_tax += gst_calc["tax_amount"]
                
                items_to_insert.append({
                    "item_id": item.item_id,
                    "item_name": item.item_name,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit": item.unit or "pcs",
                    "unit_price": item.unit_price,
                    "discount_amount": item.discount_amount or 0,
                    "gst_rate": item.gst_rate or 0,
                    **gst_calc
                })
            
            total_amount = subtotal + total_tax
            
            # Update invoice
            cursor.execute("""
                UPDATE invoices SET
                    customer_id = %s,
                    invoice_date = %s,
                    due_date = %s,
                    customer_name = %s,
                    customer_state = %s,
                    company_state = %s,
                    subtotal = %s,
                    total_cgst = %s,
                    total_sgst = %s,
                    total_igst = %s,
                    total_tax = %s,
                    total_amount = %s,
                    status = %s,
                    notes = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND account_id = %s
            """, (
                invoice_data.customer_id,
                invoice_data.invoice_date,
                invoice_data.due_date,
                invoice_data.customer_name,
                customer_state,
                company_state,
                subtotal,
                total_cgst,
                total_sgst,
                total_igst,
                total_tax,
                total_amount,
                invoice_data.status or "draft",
                invoice_data.notes,
                invoice_id,
                account_id
            ))
            
            # Delete old items and insert new ones
            cursor.execute(
                "DELETE FROM invoice_items WHERE invoice_id = %s AND account_id = %s",
                (invoice_id, account_id)
            )
            
            for item in items_to_insert:
                cursor.execute("""
                    INSERT INTO invoice_items (
                        account_id, invoice_id, item_id, item_name, description,
                        quantity, unit, unit_price, discount_amount, base_amount,
                        gst_rate, cgst_rate, sgst_rate, igst_rate,
                        cgst_amount, sgst_amount, igst_amount, tax_amount, line_total
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    account_id, invoice_id, item["item_id"], item["item_name"],
                    item["description"], item["quantity"], item["unit"],
                    item["unit_price"], item["discount_amount"], item["base_amount"],
                    item["gst_rate"], item["cgst_rate"], item["sgst_rate"], item["igst_rate"],
                    item["cgst_amount"], item["sgst_amount"], item["igst_amount"],
                    item["tax_amount"], item["line_total"]
                ))
            
            conn.commit()
            return {"message": "Invoice updated successfully", "id": invoice_id}
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update invoice: {e}"
            )
        finally:
            cursor.close()


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete an invoice and its items."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Check if invoice exists
            cursor.execute(
                "SELECT id FROM invoices WHERE id = %s AND account_id = %s",
                (invoice_id, account_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found"
                )
            
            # Delete invoice (items will cascade delete)
            cursor.execute(
                "DELETE FROM invoices WHERE id = %s AND account_id = %s",
                (invoice_id, account_id)
            )
            
            conn.commit()
            return {"message": "Invoice deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete invoice: {e}"
            )
        finally:
            cursor.close()
