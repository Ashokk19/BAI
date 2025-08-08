"""
BAI Backend Invoice Schemas

This module contains Pydantic schemas for invoice operations including GST calculations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class InvoiceItemBase(BaseModel):
    """Base invoice item schema."""
    item_id: int = Field(..., description="Item ID")
    item_name: str = Field(..., max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    item_sku: str = Field(..., max_length=50, description="Item SKU")
    quantity: Decimal = Field(..., gt=0, description="Quantity")
    unit_price: Decimal = Field(..., ge=0, description="Unit price")
    discount_rate: Optional[Decimal] = Field(default=0.00, ge=0, le=100, description="Discount rate percentage")
    discount_amount: Optional[Decimal] = Field(default=0.00, ge=0, description="Discount amount")
    gst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="GST rate percentage")
    cgst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="CGST rate percentage")
    sgst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="SGST rate percentage")
    igst_rate: Optional[Decimal] = Field(default=0.00, ge=0, description="IGST rate percentage")

class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating invoice items."""
    pass

class InvoiceItemResponse(InvoiceItemBase):
    """Schema for invoice item response."""
    id: int
    invoice_id: int
    tax_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    line_total: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    """Base invoice schema."""
    customer_id: int = Field(..., description="Customer ID")
    invoice_date: datetime = Field(..., description="Invoice date")
    due_date: Optional[datetime] = Field(None, description="Due date")
    status: str = Field(default="draft", description="Invoice status")
    invoice_type: str = Field(default="sale", description="Invoice type")
    payment_terms: str = Field(default="immediate", description="Payment terms")
    currency: str = Field(default="INR", description="Currency")
    billing_address: Optional[str] = Field(None, description="Billing address")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    notes: Optional[str] = Field(None, description="Additional notes")
    terms_conditions: Optional[str] = Field(None, description="Terms and conditions")
    
    # State information for inter-state GST calculation
    customer_state: Optional[str] = Field(None, description="Customer state for GST calculation")
    company_state: str = Field(default="Tamil Nadu", description="Company state for GST calculation")

class InvoiceCreate(InvoiceBase):
    """Schema for creating invoices."""
    items: List[InvoiceItemCreate] = Field(..., description="Invoice items")

class InvoiceUpdate(BaseModel):
    """Schema for updating invoices."""
    customer_id: Optional[int] = Field(None)
    invoice_date: Optional[datetime] = Field(None)
    due_date: Optional[datetime] = Field(None)
    status: Optional[str] = Field(None)
    invoice_type: Optional[str] = Field(None)
    payment_terms: Optional[str] = Field(None)
    currency: Optional[str] = Field(None)
    billing_address: Optional[str] = Field(None)
    shipping_address: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)
    terms_conditions: Optional[str] = Field(None)
    customer_state: Optional[str] = Field(None)
    company_state: Optional[str] = Field(None)

class InvoiceResponse(InvoiceBase):
    """Schema for invoice response."""
    id: int
    invoice_number: str
    subtotal: Decimal
    tax_amount: Decimal
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    is_paid: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []
    
    class Config:
        from_attributes = True

class InvoiceList(BaseModel):
    """Schema for invoice list response."""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class InvoiceSummary(BaseModel):
    """Schema for invoice summary."""
    id: int
    invoice_number: str
    customer_name: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    status: str
    
    class Config:
        from_attributes = True

class GSTSlabBase(BaseModel):
    """Base GST slab schema."""
    name: str = Field(..., max_length=50, description="GST slab name")
    rate: Decimal = Field(..., ge=0, le=100, description="GST rate percentage")
    hsn_code: Optional[str] = Field(None, max_length=20, description="HSN code")
    description: Optional[str] = Field(None, description="Description")
    cgst_rate: Decimal = Field(..., ge=0, description="CGST rate percentage")
    sgst_rate: Decimal = Field(..., ge=0, description="SGST rate percentage")
    igst_rate: Decimal = Field(..., ge=0, description="IGST rate percentage")
    is_active: bool = Field(default=True, description="Active status")

class GSTSlabCreate(GSTSlabBase):
    """Schema for creating GST slabs."""
    pass

class GSTSlabUpdate(BaseModel):
    """Schema for updating GST slabs."""
    name: Optional[str] = Field(None, max_length=50)
    rate: Optional[Decimal] = Field(None, ge=0, le=100)
    hsn_code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field(None)
    cgst_rate: Optional[Decimal] = Field(None, ge=0)
    sgst_rate: Optional[Decimal] = Field(None, ge=0)
    igst_rate: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = Field(None)

class GSTSlabResponse(GSTSlabBase):
    """Schema for GST slab response."""
    id: int
    total_tax_rate: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WhatsAppInvoiceRequest(BaseModel):
    """Schema for WhatsApp invoice sending request."""
    invoice_id: int = Field(..., description="Invoice ID to send")
    phone_number: str = Field(..., description="WhatsApp phone number")
    message: Optional[str] = Field(None, description="Custom message")
    
class WhatsAppResponse(BaseModel):
    """Schema for WhatsApp response."""
    success: bool
    message: str
    whatsapp_message_id: Optional[str] = None 