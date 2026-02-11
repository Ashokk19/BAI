"""
Proforma Invoice Router - Direct PostgreSQL implementation
Mirrors the sales_invoices_pg.py structure for proforma invoices
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


# =====================================================
# PYDANTIC SCHEMAS
# =====================================================

class ProformaInvoiceItemBase(BaseModel):
    """Base proforma invoice item schema."""
    item_id: int = Field(..., description="Item ID")
    item_name: str = Field(..., max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    item_sku: str = Field(..., max_length=50, description="Item SKU")
    hsn_code: Optional[str] = Field(None, max_length=50, description="HSN/SAC code")
    quantity: Decimal = Field(..., gt=0, description="Quantity")
    unit_price: Decimal = Field(..., ge=0, description="Unit price")
    discount_rate: Optional[Decimal] = Field(default=0.00, ge=0, le=100, description="Discount rate percentage")
    discount_amount: Optional[Decimal] = Field(default=0.00, ge=0, description="Discount amount")
    gst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="GST rate percentage")
    cgst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="CGST rate percentage")
    sgst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="SGST rate percentage")
    igst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="IGST rate percentage")


class ProformaInvoiceItemCreate(ProformaInvoiceItemBase):
    """Schema for creating proforma invoice items."""
    pass


class ProformaInvoiceItemResponse(ProformaInvoiceItemBase):
    """Schema for proforma invoice item response."""
    id: int
    proforma_invoice_id: int
    tax_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    line_total: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProformaInvoiceBase(BaseModel):
    """Base proforma invoice schema."""
    account_id: str = Field(..., description="Account ID for organization isolation")
    customer_id: int = Field(..., description="Customer ID")
    proforma_date: datetime = Field(..., description="Proforma invoice date")
    valid_until: Optional[datetime] = Field(None, description="Valid until date")
    status: str = Field(default="draft", description="Proforma invoice status")
    payment_terms: str = Field(default="immediate", description="Payment terms")
    currency: str = Field(default="INR", description="Currency")
    billing_address: Optional[str] = Field(None, description="Billing address")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    notes: Optional[str] = Field(None, description="Additional notes")
    terms_conditions: Optional[str] = Field(None, description="Terms and conditions")
    customer_state: Optional[str] = Field(None, description="Customer state for GST calculation")
    company_state: str = Field(default="Tamil Nadu", description="Company state for GST calculation")


class ProformaInvoiceCreate(ProformaInvoiceBase):
    """Schema for creating proforma invoices."""
    items: List[ProformaInvoiceItemCreate] = Field(..., description="Proforma invoice items")


class ProformaInvoiceUpdate(BaseModel):
    """Schema for updating proforma invoices."""
    customer_id: Optional[int] = Field(None)
    proforma_date: Optional[datetime] = Field(None)
    valid_until: Optional[datetime] = Field(None)
    status: Optional[str] = Field(None)
    payment_terms: Optional[str] = Field(None)
    currency: Optional[str] = Field(None)
    billing_address: Optional[str] = Field(None)
    shipping_address: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)
    terms_conditions: Optional[str] = Field(None)
    customer_state: Optional[str] = Field(None)
    company_state: Optional[str] = Field(None)


class ProformaInvoiceResponse(ProformaInvoiceBase):
    """Schema for proforma invoice response."""
    id: int
    proforma_number: str
    subtotal: Decimal
    tax_amount: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[ProformaInvoiceItemResponse] = []

    class Config:
        from_attributes = True


class ProformaInvoiceList(BaseModel):
    """Schema for proforma invoice list response."""
    proforma_invoices: List[ProformaInvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def _ensure_proforma_tables_exist():
    """Ensure proforma invoice tables exist in the database."""
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor()
        try:
            # Create proforma_invoices table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS proforma_invoices (
                    account_id VARCHAR(50) NOT NULL,
                    id SERIAL NOT NULL,
                    proforma_number VARCHAR(100) NOT NULL,
                    proforma_date DATE NOT NULL,
                    valid_until DATE,
                    customer_id INTEGER NOT NULL,
                    customer_name VARCHAR(255),
                    customer_address TEXT,
                    customer_gstin VARCHAR(50),
                    customer_state VARCHAR(100),
                    customer_email VARCHAR(255),
                    customer_phone VARCHAR(50),
                    company_name VARCHAR(255),
                    company_address TEXT,
                    company_gstin VARCHAR(50),
                    company_state VARCHAR(100),
                    company_email VARCHAR(255),
                    company_phone VARCHAR(50),
                    subtotal DECIMAL(15, 2) DEFAULT 0.00,
                    total_cgst DECIMAL(15, 2) DEFAULT 0.00,
                    total_sgst DECIMAL(15, 2) DEFAULT 0.00,
                    total_igst DECIMAL(15, 2) DEFAULT 0.00,
                    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
                    discount_amount DECIMAL(15, 2) DEFAULT 0.00,
                    total_amount DECIMAL(15, 2) DEFAULT 0.00,
                    status VARCHAR(50) DEFAULT 'draft',
                    payment_terms VARCHAR(100),
                    currency VARCHAR(10) DEFAULT 'INR',
                    billing_address TEXT,
                    shipping_address TEXT,
                    notes TEXT,
                    terms_conditions TEXT,
                    created_by INTEGER,
                    updated_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (account_id, id)
                )
            """)

            # Create proforma_invoice_items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS proforma_invoice_items (
                    account_id VARCHAR(50) NOT NULL,
                    id SERIAL NOT NULL,
                    proforma_invoice_id INTEGER NOT NULL,
                    item_id INTEGER,
                    item_name VARCHAR(255) NOT NULL,
                    item_description TEXT,
                    item_sku VARCHAR(50),
                    hsn_code VARCHAR(50),
                    quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.000,
                    unit VARCHAR(50) DEFAULT 'pcs',
                    unit_price DECIMAL(15, 2) NOT NULL,
                    discount_rate DECIMAL(5, 2) DEFAULT 0.00,
                    discount_amount DECIMAL(15, 2) DEFAULT 0.00,
                    base_amount DECIMAL(15, 2) DEFAULT 0.00,
                    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
                    gst_rate DECIMAL(5, 2) DEFAULT 0.00,
                    cgst_rate DECIMAL(5, 2) DEFAULT 0.00,
                    sgst_rate DECIMAL(5, 2) DEFAULT 0.00,
                    igst_rate DECIMAL(5, 2) DEFAULT 0.00,
                    cgst_amount DECIMAL(15, 2) DEFAULT 0.00,
                    sgst_amount DECIMAL(15, 2) DEFAULT 0.00,
                    igst_amount DECIMAL(15, 2) DEFAULT 0.00,
                    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
                    line_total DECIMAL(15, 2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (account_id, id)
                )
            """)

            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoices_account_id ON proforma_invoices(account_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer_id ON proforma_invoices(account_id, customer_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoices_number ON proforma_invoices(account_id, proforma_number)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(account_id, status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_account_id ON proforma_invoice_items(account_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_proforma_invoice_items_proforma_id ON proforma_invoice_items(account_id, proforma_invoice_id)")

            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Error ensuring proforma tables: {e}")
            raise


def _generate_proforma_number(account_id: str, cursor) -> str:
    """Generate next proforma invoice number for the account.
    
    Uses last_proforma_number from organizations table as the authoritative source.
    Falls back to scanning proforma_invoices table if org setting is 0 or missing.
    """
    # First check the organization's last_proforma_number
    cursor.execute(
        "SELECT last_proforma_number FROM organizations WHERE account_id = %s LIMIT 1",
        (account_id,),
    )
    org_row = cursor.fetchone()
    org_last = (org_row.get("last_proforma_number") or 0) if org_row else 0

    # Also check the last proforma in the proforma_invoices table
    cursor.execute(
        """
        SELECT proforma_number FROM proforma_invoices 
        WHERE account_id = %s 
        ORDER BY id DESC LIMIT 1
        """,
        (account_id,),
    )
    result = cursor.fetchone()
    db_last = 0
    if result:
        try:
            db_last = int(result["proforma_number"].replace("PI-", ""))
        except (ValueError, AttributeError):
            db_last = 0

    # Use whichever is higher
    next_num = max(org_last, db_last) + 1

    # Update the organization's last_proforma_number
    cursor.execute(
        "UPDATE organizations SET last_proforma_number = %s, updated_at = NOW() WHERE account_id = %s",
        (next_num, account_id),
    )

    return f"PI-{next_num:06d}"


def _calculate_gst_amounts(item_data: dict, customer_state: str, company_state: str) -> dict:
    """Calculate GST amounts for an item based on states."""
    quantity = Decimal(str(item_data.get("quantity", 0)))
    unit_price = Decimal(str(item_data.get("unit_price", 0)))
    discount_amount = Decimal(str(item_data.get("discount_amount", 0)))
    gst_rate = Decimal(str(item_data.get("gst_rate", 0)))
    
    base_amount = (quantity * unit_price) - discount_amount
    is_inter_state = customer_state.lower() != company_state.lower() if customer_state and company_state else False
    
    if is_inter_state:
        igst_amount = (base_amount * gst_rate) / 100
        cgst_amount = Decimal("0")
        sgst_amount = Decimal("0")
        cgst_rate = Decimal("0")
        sgst_rate = Decimal("0")
        igst_rate = gst_rate
    else:
        half_rate = gst_rate / 2
        cgst_amount = (base_amount * half_rate) / 100
        sgst_amount = (base_amount * half_rate) / 100
        igst_amount = Decimal("0")
        cgst_rate = half_rate
        sgst_rate = half_rate
        igst_rate = Decimal("0")
    
    tax_amount = cgst_amount + sgst_amount + igst_amount
    line_total = base_amount + tax_amount
    
    return {
        "base_amount": base_amount,
        "cgst_rate": cgst_rate,
        "sgst_rate": sgst_rate,
        "igst_rate": igst_rate,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "igst_amount": igst_amount,
        "tax_amount": tax_amount,
        "line_total": line_total
    }


def _to_decimal(val) -> Decimal:
    """Convert value to Decimal safely."""
    return Decimal(str(val)) if val is not None else Decimal("0")


# =====================================================
# API ENDPOINTS
# =====================================================

@router.get("/")
async def list_proforma_invoices(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
):
    """List proforma invoices with pagination and filters."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query
        query = """
            SELECT pi.*, c.first_name, c.last_name, c.company_name, c.email as customer_email_lookup
            FROM proforma_invoices pi
            LEFT JOIN customers c ON pi.customer_id = c.id AND pi.account_id = c.account_id
            WHERE pi.account_id = %s
        """
        params = [account_id]
        
        if status:
            query += " AND pi.status = %s"
            params.append(status)
        
        if customer_id:
            query += " AND pi.customer_id = %s"
            params.append(customer_id)
        
        if search:
            query += " AND (pi.proforma_number ILIKE %s OR c.first_name ILIKE %s OR c.last_name ILIKE %s OR c.company_name ILIKE %s)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term, search_term])
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()["total"]
        
        # Add pagination
        query += " ORDER BY pi.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, skip])
        
        cursor.execute(query, params)
        proforma_invoices = cursor.fetchall()
        
        # Format response
        result = []
        for pi in proforma_invoices:
            # Get items for this proforma invoice
            cursor.execute(
                """
                SELECT * FROM proforma_invoice_items 
                WHERE account_id = %s AND proforma_invoice_id = %s
                ORDER BY id
                """,
                (account_id, pi["id"])
            )
            items = cursor.fetchall()
            
            customer_name = pi.get("customer_name") or f"{pi.get('first_name', '')} {pi.get('last_name', '')}".strip() or pi.get("company_name", "")
            
            result.append({
                "id": pi["id"],
                "account_id": pi["account_id"],
                "proforma_number": pi["proforma_number"],
                "proforma_date": pi["proforma_date"],
                "valid_until": pi.get("valid_until"),
                "customer_id": pi["customer_id"],
                "customer_name": customer_name,
                "status": pi.get("status", "draft"),
                "subtotal": _to_decimal(pi.get("subtotal")),
                "tax_amount": _to_decimal(pi.get("tax_amount")),
                "total_cgst": _to_decimal(pi.get("total_cgst")),
                "total_sgst": _to_decimal(pi.get("total_sgst")),
                "total_igst": _to_decimal(pi.get("total_igst")),
                "discount_amount": _to_decimal(pi.get("discount_amount")),
                "total_amount": _to_decimal(pi.get("total_amount")),
                "payment_terms": pi.get("payment_terms"),
                "currency": pi.get("currency", "INR"),
                "billing_address": pi.get("billing_address"),
                "shipping_address": pi.get("shipping_address"),
                "notes": pi.get("notes"),
                "terms_conditions": pi.get("terms_conditions"),
                "customer_state": pi.get("customer_state"),
                "company_state": pi.get("company_state"),
                "created_by": pi.get("created_by"),
                "created_at": pi.get("created_at"),
                "updated_at": pi.get("updated_at"),
                "items": [
                    {
                        "id": item["id"],
                        "proforma_invoice_id": item["proforma_invoice_id"],
                        "item_id": item["item_id"],
                        "item_name": item.get("item_name"),
                        "item_description": item.get("item_description"),
                        "item_sku": item.get("item_sku"),
                        "hsn_code": item.get("hsn_code"),
                        "quantity": _to_decimal(item.get("quantity")),
                        "unit_price": _to_decimal(item.get("unit_price")),
                        "discount_rate": _to_decimal(item.get("discount_rate")),
                        "discount_amount": _to_decimal(item.get("discount_amount")),
                        "gst_rate": _to_decimal(item.get("gst_rate") or item.get("tax_rate")),
                        "cgst_rate": _to_decimal(item.get("cgst_rate")),
                        "sgst_rate": _to_decimal(item.get("sgst_rate")),
                        "igst_rate": _to_decimal(item.get("igst_rate")),
                        "tax_amount": _to_decimal(item.get("tax_amount")),
                        "cgst_amount": _to_decimal(item.get("cgst_amount")),
                        "sgst_amount": _to_decimal(item.get("sgst_amount")),
                        "igst_amount": _to_decimal(item.get("igst_amount")),
                        "line_total": _to_decimal(item.get("line_total")),
                        "created_at": item.get("created_at"),
                        "updated_at": item.get("updated_at"),
                    }
                    for item in items
                ]
            })
        
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        
        return {
            "proforma_invoices": result,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "per_page": limit,
            "total_pages": total_pages
        }


@router.get("/{proforma_id}")
async def get_proforma_invoice(
    proforma_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific proforma invoice by ID."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute(
            """
            SELECT pi.*, c.first_name, c.last_name, c.company_name
            FROM proforma_invoices pi
            LEFT JOIN customers c ON pi.customer_id = c.id AND pi.account_id = c.account_id
            WHERE pi.account_id = %s AND pi.id = %s
            """,
            (account_id, proforma_id)
        )
        pi = cursor.fetchone()
        
        if not pi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proforma invoice not found"
            )
        
        # Get items
        cursor.execute(
            """
            SELECT * FROM proforma_invoice_items 
            WHERE account_id = %s AND proforma_invoice_id = %s
            ORDER BY id
            """,
            (account_id, proforma_id)
        )
        items = cursor.fetchall()
        
        customer_name = pi.get("customer_name") or f"{pi.get('first_name', '')} {pi.get('last_name', '')}".strip() or pi.get("company_name", "")
        
        return {
            "id": pi["id"],
            "account_id": pi["account_id"],
            "proforma_number": pi["proforma_number"],
            "proforma_date": pi["proforma_date"],
            "valid_until": pi.get("valid_until"),
            "customer_id": pi["customer_id"],
            "customer_name": customer_name,
            "status": pi.get("status", "draft"),
            "subtotal": _to_decimal(pi.get("subtotal")),
            "tax_amount": _to_decimal(pi.get("tax_amount")),
            "total_cgst": _to_decimal(pi.get("total_cgst")),
            "total_sgst": _to_decimal(pi.get("total_sgst")),
            "total_igst": _to_decimal(pi.get("total_igst")),
            "discount_amount": _to_decimal(pi.get("discount_amount")),
            "total_amount": _to_decimal(pi.get("total_amount")),
            "payment_terms": pi.get("payment_terms"),
            "currency": pi.get("currency", "INR"),
            "billing_address": pi.get("billing_address"),
            "shipping_address": pi.get("shipping_address"),
            "notes": pi.get("notes"),
            "terms_conditions": pi.get("terms_conditions"),
            "customer_state": pi.get("customer_state"),
            "company_state": pi.get("company_state"),
            "created_by": pi.get("created_by"),
            "created_at": pi.get("created_at"),
            "updated_at": pi.get("updated_at"),
            "items": [
                {
                    "id": item["id"],
                    "proforma_invoice_id": item["proforma_invoice_id"],
                    "item_id": item["item_id"],
                    "item_name": item.get("item_name"),
                    "item_description": item.get("item_description"),
                    "item_sku": item.get("item_sku"),
                    "hsn_code": item.get("hsn_code"),
                    "quantity": _to_decimal(item.get("quantity")),
                    "unit_price": _to_decimal(item.get("unit_price")),
                    "discount_rate": _to_decimal(item.get("discount_rate")),
                    "discount_amount": _to_decimal(item.get("discount_amount")),
                    "gst_rate": _to_decimal(item.get("gst_rate") or item.get("tax_rate")),
                    "cgst_rate": _to_decimal(item.get("cgst_rate")),
                    "sgst_rate": _to_decimal(item.get("sgst_rate")),
                    "igst_rate": _to_decimal(item.get("igst_rate")),
                    "tax_amount": _to_decimal(item.get("tax_amount")),
                    "cgst_amount": _to_decimal(item.get("cgst_amount")),
                    "sgst_amount": _to_decimal(item.get("sgst_amount")),
                    "igst_amount": _to_decimal(item.get("igst_amount")),
                    "line_total": _to_decimal(item.get("line_total")),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                }
                for item in items
            ]
        }


@router.post("/")
async def create_proforma_invoice(
    proforma_data: ProformaInvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new proforma invoice."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Get customer info
            cursor.execute(
                "SELECT * FROM customers WHERE id = %s AND account_id = %s",
                (proforma_data.customer_id, account_id)
            )
            customer = cursor.fetchone()
            if not customer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Customer not found"
                )
            
            customer_state = proforma_data.customer_state or customer.get("state") or "Tamil Nadu"
            company_state = proforma_data.company_state or "Tamil Nadu"
            
            # Calculate totals
            subtotal = Decimal("0")
            total_tax = Decimal("0")
            total_cgst = Decimal("0")
            total_sgst = Decimal("0")
            total_igst = Decimal("0")
            total_discount = Decimal("0")
            
            items_to_insert = []
            for item in proforma_data.items:
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
                total_tax += gst_calc["tax_amount"]
                total_cgst += gst_calc["cgst_amount"]
                total_sgst += gst_calc["sgst_amount"]
                total_igst += gst_calc["igst_amount"]
                total_discount += Decimal(str(item.discount_amount or 0))
                
                items_to_insert.append({
                    "item": item,
                    "gst_calc": gst_calc
                })
            
            total_amount = subtotal + total_tax
            
            # Generate proforma number
            proforma_number = _generate_proforma_number(account_id, cursor)
            
            # Insert proforma invoice
            cursor.execute(
                """
                INSERT INTO proforma_invoices (
                    account_id, proforma_number, proforma_date, valid_until,
                    customer_id, customer_name, customer_state, company_state,
                    subtotal, total_cgst, total_sgst, total_igst, tax_amount,
                    discount_amount, total_amount, status, payment_terms, currency,
                    billing_address, shipping_address, notes, terms_conditions,
                    created_by, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id, created_at
                """,
                (
                    account_id,
                    proforma_number,
                    proforma_data.proforma_date,
                    proforma_data.valid_until,
                    proforma_data.customer_id,
                    f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or customer.get("company_name", ""),
                    customer_state,
                    company_state,
                    subtotal,
                    total_cgst,
                    total_sgst,
                    total_igst,
                    total_tax,
                    total_discount,
                    total_amount,
                    proforma_data.status or "draft",
                    proforma_data.payment_terms,
                    proforma_data.currency,
                    proforma_data.billing_address,
                    proforma_data.shipping_address,
                    proforma_data.notes,
                    proforma_data.terms_conditions,
                    current_user["id"],
                    datetime.now(),
                    datetime.now()
                )
            )
            proforma_record = cursor.fetchone()
            proforma_id = proforma_record["id"]
            
            # Insert items
            proforma_items = []
            for item_data in items_to_insert:
                item = item_data["item"]
                gst_calc = item_data["gst_calc"]
                
                # Get item details from inventory
                cursor.execute(
                    "SELECT * FROM items WHERE id = %s AND account_id = %s",
                    (item.item_id, account_id)
                )
                db_item = cursor.fetchone() or {}
                
                cursor.execute(
                    """
                    INSERT INTO proforma_invoice_items (
                        account_id, proforma_invoice_id, item_id, item_name, item_description,
                        item_sku, hsn_code, quantity, unit_price, discount_rate, discount_amount,
                        base_amount, tax_rate, gst_rate, cgst_rate, sgst_rate, igst_rate,
                        cgst_amount, sgst_amount, igst_amount, tax_amount, line_total,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING *
                    """,
                    (
                        account_id,
                        proforma_id,
                        item.item_id,
                        item.item_name or db_item.get("name"),
                        item.item_description or db_item.get("description"),
                        item.item_sku or db_item.get("sku"),
                        item.hsn_code or db_item.get("hsn_code"),
                        Decimal(str(item.quantity)),
                        Decimal(str(item.unit_price)),
                        Decimal(str(item.discount_rate or 0)),
                        Decimal(str(item.discount_amount or 0)),
                        gst_calc["base_amount"],
                        Decimal(str(item.gst_rate or 0)),
                        Decimal(str(item.gst_rate or 0)),
                        gst_calc["cgst_rate"],
                        gst_calc["sgst_rate"],
                        gst_calc["igst_rate"],
                        gst_calc["cgst_amount"],
                        gst_calc["sgst_amount"],
                        gst_calc["igst_amount"],
                        gst_calc["tax_amount"],
                        gst_calc["line_total"],
                        datetime.now(),
                        datetime.now()
                    )
                )
                proforma_items.append(cursor.fetchone())
            
            conn.commit()
            
            # Build response
            return {
                "id": proforma_id,
                "account_id": account_id,
                "proforma_number": proforma_number,
                "proforma_date": proforma_data.proforma_date,
                "valid_until": proforma_data.valid_until,
                "customer_id": proforma_data.customer_id,
                "customer_name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or customer.get("company_name", ""),
                "status": proforma_data.status or "draft",
                "subtotal": subtotal,
                "tax_amount": total_tax,
                "total_cgst": total_cgst,
                "total_sgst": total_sgst,
                "total_igst": total_igst,
                "discount_amount": total_discount,
                "total_amount": total_amount,
                "payment_terms": proforma_data.payment_terms,
                "currency": proforma_data.currency,
                "billing_address": proforma_data.billing_address,
                "shipping_address": proforma_data.shipping_address,
                "notes": proforma_data.notes,
                "terms_conditions": proforma_data.terms_conditions,
                "customer_state": customer_state,
                "company_state": company_state,
                "created_by": current_user["id"],
                "created_at": proforma_record["created_at"],
                "updated_at": None,
                "items": [
                    {
                        "id": pi_item["id"],
                        "proforma_invoice_id": proforma_id,
                        "item_id": pi_item["item_id"],
                        "item_name": pi_item.get("item_name"),
                        "item_description": pi_item.get("item_description"),
                        "item_sku": pi_item.get("item_sku"),
                        "hsn_code": pi_item.get("hsn_code"),
                        "quantity": _to_decimal(pi_item.get("quantity")),
                        "unit_price": _to_decimal(pi_item.get("unit_price")),
                        "discount_rate": _to_decimal(pi_item.get("discount_rate")),
                        "discount_amount": _to_decimal(pi_item.get("discount_amount")),
                        "gst_rate": _to_decimal(pi_item.get("gst_rate")),
                        "cgst_rate": _to_decimal(pi_item.get("cgst_rate")),
                        "sgst_rate": _to_decimal(pi_item.get("sgst_rate")),
                        "igst_rate": _to_decimal(pi_item.get("igst_rate")),
                        "tax_amount": _to_decimal(pi_item.get("tax_amount")),
                        "cgst_amount": _to_decimal(pi_item.get("cgst_amount")),
                        "sgst_amount": _to_decimal(pi_item.get("sgst_amount")),
                        "igst_amount": _to_decimal(pi_item.get("igst_amount")),
                        "line_total": _to_decimal(pi_item.get("line_total")),
                        "created_at": pi_item.get("created_at"),
                        "updated_at": pi_item.get("updated_at"),
                    }
                    for pi_item in proforma_items
                ]
            }
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            print(f"Error creating proforma invoice: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create proforma invoice: {str(e)}"
            )


@router.put("/{proforma_id}")
async def update_proforma_invoice(
    proforma_id: int,
    proforma_data: ProformaInvoiceUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update an existing proforma invoice."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Check if proforma exists
            cursor.execute(
                "SELECT id FROM proforma_invoices WHERE id = %s AND account_id = %s",
                (proforma_id, account_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proforma invoice not found"
                )
            
            # Build update query
            update_fields = []
            params = []
            
            update_data = proforma_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if value is not None:
                    update_fields.append(f"{field} = %s")
                    params.append(value)
            
            if update_fields:
                update_fields.append("updated_at = %s")
                params.append(datetime.now())
                update_fields.append("updated_by = %s")
                params.append(current_user["id"])
                
                params.extend([proforma_id, account_id])
                
                cursor.execute(
                    f"""
                    UPDATE proforma_invoices 
                    SET {', '.join(update_fields)}
                    WHERE id = %s AND account_id = %s
                    RETURNING *
                    """,
                    params
                )
                
                conn.commit()
            
            # Return updated proforma
            return await get_proforma_invoice(proforma_id, current_user)
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            print(f"Error updating proforma invoice: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update proforma invoice: {str(e)}"
            )


@router.delete("/{proforma_id}")
async def delete_proforma_invoice(
    proforma_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a proforma invoice."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Check if proforma exists
            cursor.execute(
                "SELECT id FROM proforma_invoices WHERE id = %s AND account_id = %s",
                (proforma_id, account_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proforma invoice not found"
                )
            
            # Delete items first
            cursor.execute(
                "DELETE FROM proforma_invoice_items WHERE proforma_invoice_id = %s AND account_id = %s",
                (proforma_id, account_id)
            )
            
            # Delete proforma invoice
            cursor.execute(
                "DELETE FROM proforma_invoices WHERE id = %s AND account_id = %s",
                (proforma_id, account_id)
            )
            
            conn.commit()
            
            return {"message": "Proforma invoice deleted successfully"}
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            print(f"Error deleting proforma invoice: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete proforma invoice: {str(e)}"
            )


@router.post("/{proforma_id}/convert-to-invoice")
async def convert_to_invoice(
    proforma_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Convert a proforma invoice to a regular tax invoice."""
    _ensure_proforma_tables_exist()
    account_id = current_user["account_id"]
    
    # Get the proforma invoice
    proforma = await get_proforma_invoice(proforma_id, current_user)
    
    # Update proforma status to converted
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE proforma_invoices 
            SET status = 'converted', updated_at = %s, updated_by = %s
            WHERE id = %s AND account_id = %s
            """,
            (datetime.now(), current_user["id"], proforma_id, account_id)
        )
        conn.commit()
    
    return {
        "message": "Proforma invoice marked as converted. Please create a new tax invoice with the same details.",
        "proforma_id": proforma_id,
        "proforma_number": proforma["proforma_number"]
    }
