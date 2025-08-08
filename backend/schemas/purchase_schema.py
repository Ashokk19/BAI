"""
BAI Backend Purchase Schemas

This module contains Pydantic schemas for purchase operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

# Purchase Order Schemas
class PurchaseOrderItemBase(BaseModel):
    """Base purchase order item schema."""
    item_id: int = Field(..., description="Item ID")
    item_name: str = Field(..., max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    item_sku: str = Field(..., max_length=50, description="Item SKU")
    quantity_ordered: Decimal = Field(..., ge=0, description="Quantity ordered")
    unit_price: Decimal = Field(..., ge=0, description="Unit price")
    discount_rate: Decimal = Field(default=0, ge=0, le=100, description="Discount rate percentage")
    tax_rate: Decimal = Field(default=0, ge=0, le=100, description="Tax rate percentage")

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    """Schema for creating a purchase order item."""
    pass

class PurchaseOrderItemUpdate(BaseModel):
    """Schema for updating a purchase order item."""
    item_id: Optional[int] = Field(None, description="Item ID")
    item_name: Optional[str] = Field(None, max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    item_sku: Optional[str] = Field(None, max_length=50, description="Item SKU")
    quantity_ordered: Optional[Decimal] = Field(None, ge=0, description="Quantity ordered")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="Unit price")
    discount_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="Discount rate percentage")
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="Tax rate percentage")

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    """Schema for purchase order item response."""
    id: int
    purchase_order_id: int
    quantity_received: Decimal = Field(default=0, ge=0, description="Quantity received")
    discount_amount: Decimal = Field(default=0, ge=0, description="Discount amount")
    tax_amount: Decimal = Field(default=0, ge=0, description="Tax amount")
    line_total: Decimal = Field(..., ge=0, description="Line total")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    """Base purchase order schema."""
    po_number: str = Field(..., max_length=50, description="Purchase order number")
    po_date: datetime = Field(..., description="Purchase order date")
    expected_delivery_date: Optional[datetime] = Field(None, description="Expected delivery date")
    vendor_id: int = Field(..., description="Vendor ID")
    status: str = Field(default="draft", description="Purchase order status")
    priority: str = Field(default="normal", description="Priority level")
    subtotal: Decimal = Field(default=0, ge=0, description="Subtotal amount")
    tax_amount: Decimal = Field(default=0, ge=0, description="Tax amount")
    discount_amount: Decimal = Field(default=0, ge=0, description="Discount amount")
    total_amount: Decimal = Field(default=0, ge=0, description="Total amount")
    payment_terms: str = Field(default="net_30", description="Payment terms")
    currency: str = Field(default="INR", description="Currency")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    shipping_method: Optional[str] = Field(None, max_length=50, description="Shipping method")
    shipping_cost: Decimal = Field(default=0, ge=0, description="Shipping cost")
    notes: Optional[str] = Field(None, description="Notes")
    terms_conditions: Optional[str] = Field(None, description="Terms and conditions")

class PurchaseOrderCreate(PurchaseOrderBase):
    """Schema for creating a purchase order."""
    items: List[PurchaseOrderItemCreate] = Field(..., min_items=1, description="Purchase order items")

class PurchaseOrderUpdate(BaseModel):
    """Schema for updating a purchase order."""
    po_number: Optional[str] = Field(None, max_length=50, description="Purchase order number")
    po_date: Optional[datetime] = Field(None, description="Purchase order date")
    expected_delivery_date: Optional[datetime] = Field(None, description="Expected delivery date")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    status: Optional[str] = Field(None, description="Purchase order status")
    priority: Optional[str] = Field(None, description="Priority level")
    subtotal: Optional[Decimal] = Field(None, ge=0, description="Subtotal amount")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="Tax amount")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="Discount amount")
    total_amount: Optional[Decimal] = Field(None, ge=0, description="Total amount")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    currency: Optional[str] = Field(None, description="Currency")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    shipping_method: Optional[str] = Field(None, max_length=50, description="Shipping method")
    shipping_cost: Optional[Decimal] = Field(None, ge=0, description="Shipping cost")
    notes: Optional[str] = Field(None, description="Notes")
    terms_conditions: Optional[str] = Field(None, description="Terms and conditions")

class PurchaseOrderResponse(PurchaseOrderBase):
    """Schema for purchase order response."""
    id: int
    created_by: int
    items: List[PurchaseOrderItemResponse] = Field(default=[], description="Purchase order items")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PurchaseOrderList(BaseModel):
    """Schema for paginated purchase order list response."""
    purchase_orders: List[PurchaseOrderResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# Bill Schemas
class BillBase(BaseModel):
    """Base bill schema."""
    bill_number: str = Field(..., max_length=50, description="Bill number")
    bill_date: datetime = Field(..., description="Bill date")
    due_date: datetime = Field(..., description="Due date")
    vendor_id: int = Field(..., description="Vendor ID")
    purchase_order_id: Optional[int] = Field(None, description="Related purchase order ID")
    status: str = Field(default="pending", description="Bill status")
    subtotal: Decimal = Field(default=0, ge=0, description="Subtotal amount")
    tax_amount: Decimal = Field(default=0, ge=0, description="Tax amount")
    discount_amount: Decimal = Field(default=0, ge=0, description="Discount amount")
    total_amount: Decimal = Field(default=0, ge=0, description="Total amount")
    paid_amount: Decimal = Field(default=0, ge=0, description="Paid amount")
    currency: str = Field(default="INR", description="Currency")
    payment_terms: str = Field(default="net_30", description="Payment terms")
    notes: Optional[str] = Field(None, description="Notes")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")

class BillCreate(BillBase):
    """Schema for creating a bill."""
    pass

class BillUpdate(BaseModel):
    """Schema for updating a bill."""
    bill_number: Optional[str] = Field(None, max_length=50, description="Bill number")
    bill_date: Optional[datetime] = Field(None, description="Bill date")
    due_date: Optional[datetime] = Field(None, description="Due date")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    purchase_order_id: Optional[int] = Field(None, description="Related purchase order ID")
    status: Optional[str] = Field(None, description="Bill status")
    subtotal: Optional[Decimal] = Field(None, ge=0, description="Subtotal amount")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="Tax amount")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="Discount amount")
    total_amount: Optional[Decimal] = Field(None, ge=0, description="Total amount")
    paid_amount: Optional[Decimal] = Field(None, ge=0, description="Paid amount")
    currency: Optional[str] = Field(None, description="Currency")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    notes: Optional[str] = Field(None, description="Notes")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")

class BillResponse(BillBase):
    """Schema for bill response."""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BillList(BaseModel):
    """Schema for paginated bill list response."""
    bills: List[BillResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# Purchase Received Schemas
class PurchaseReceivedBase(BaseModel):
    """Base purchase received schema."""
    receipt_number: str = Field(..., max_length=50, description="Receipt number")
    receipt_date: datetime = Field(..., description="Receipt date")
    purchase_order_id: int = Field(..., description="Purchase order ID")
    purchase_order_item_id: int = Field(..., description="Purchase order item ID")
    item_id: int = Field(..., description="Item ID")
    quantity_received: Decimal = Field(..., ge=0, description="Quantity received")
    quantity_accepted: Decimal = Field(..., ge=0, description="Quantity accepted")
    quantity_rejected: Decimal = Field(default=0, ge=0, description="Quantity rejected")
    quality_status: str = Field(default="pending", description="Quality status")
    quality_notes: Optional[str] = Field(None, description="Quality notes")
    storage_location: Optional[str] = Field(None, max_length=100, description="Storage location")
    batch_number: Optional[str] = Field(None, max_length=50, description="Batch number")
    expiry_date: Optional[datetime] = Field(None, description="Expiry date")

class PurchaseReceivedCreate(PurchaseReceivedBase):
    """Schema for creating a purchase received record."""
    pass

class PurchaseReceivedUpdate(BaseModel):
    """Schema for updating a purchase received record."""
    receipt_number: Optional[str] = Field(None, max_length=50, description="Receipt number")
    receipt_date: Optional[datetime] = Field(None, description="Receipt date")
    purchase_order_id: Optional[int] = Field(None, description="Purchase order ID")
    purchase_order_item_id: Optional[int] = Field(None, description="Purchase order item ID")
    item_id: Optional[int] = Field(None, description="Item ID")
    quantity_received: Optional[Decimal] = Field(None, ge=0, description="Quantity received")
    quantity_accepted: Optional[Decimal] = Field(None, ge=0, description="Quantity accepted")
    quantity_rejected: Optional[Decimal] = Field(None, ge=0, description="Quantity rejected")
    quality_status: Optional[str] = Field(None, description="Quality status")
    quality_notes: Optional[str] = Field(None, description="Quality notes")
    storage_location: Optional[str] = Field(None, max_length=100, description="Storage location")
    batch_number: Optional[str] = Field(None, max_length=50, description="Batch number")
    expiry_date: Optional[datetime] = Field(None, description="Expiry date")

class PurchaseReceivedResponse(PurchaseReceivedBase):
    """Schema for purchase received response."""
    id: int
    received_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PurchaseReceivedList(BaseModel):
    """Schema for paginated purchase received list response."""
    purchase_received: List[PurchaseReceivedResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# Vendor Credit Schemas
class VendorCreditBase(BaseModel):
    """Base vendor credit schema."""
    vendor_id: int = Field(..., description="Vendor ID")
    credit_type: str = Field(..., description="Credit type")
    amount: Decimal = Field(..., ge=0, description="Credit amount")
    reason: str = Field(..., description="Credit reason")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    expiry_date: Optional[datetime] = Field(None, description="Expiry date")
    status: str = Field(default="active", description="Credit status")
    notes: Optional[str] = Field(None, description="Notes")

class VendorCreditCreate(VendorCreditBase):
    """Schema for creating a vendor credit."""
    pass

class VendorCreditUpdate(BaseModel):
    """Schema for updating a vendor credit."""
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    credit_type: Optional[str] = Field(None, description="Credit type")
    amount: Optional[Decimal] = Field(None, ge=0, description="Credit amount")
    reason: Optional[str] = Field(None, description="Credit reason")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    expiry_date: Optional[datetime] = Field(None, description="Expiry date")
    status: Optional[str] = Field(None, description="Credit status")
    notes: Optional[str] = Field(None, description="Notes")

class VendorCreditResponse(VendorCreditBase):
    """Schema for vendor credit response."""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VendorCreditList(BaseModel):
    """Schema for paginated vendor credit list response."""
    vendor_credits: List[VendorCreditResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# Purchase Payment Schemas
class PurchasePaymentBase(BaseModel):
    """Base purchase payment schema."""
    payment_number: str = Field(..., max_length=50, description="Payment number")
    payment_date: datetime = Field(..., description="Payment date")
    vendor_id: int = Field(..., description="Vendor ID")
    bill_id: Optional[int] = Field(None, description="Related bill ID")
    payment_method: str = Field(..., description="Payment method")
    payment_status: str = Field(default="pending", description="Payment status")
    amount: Decimal = Field(..., ge=0, description="Payment amount")
    currency: str = Field(default="INR", description="Currency")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    transaction_id: Optional[str] = Field(None, max_length=100, description="Transaction ID")
    notes: Optional[str] = Field(None, description="Notes")

class PurchasePaymentCreate(PurchasePaymentBase):
    """Schema for creating a purchase payment."""
    pass

class PurchasePaymentUpdate(BaseModel):
    """Schema for updating a purchase payment."""
    payment_number: Optional[str] = Field(None, max_length=50, description="Payment number")
    payment_date: Optional[datetime] = Field(None, description="Payment date")
    vendor_id: Optional[int] = Field(None, description="Vendor ID")
    bill_id: Optional[int] = Field(None, description="Related bill ID")
    payment_method: Optional[str] = Field(None, description="Payment method")
    payment_status: Optional[str] = Field(None, description="Payment status")
    amount: Optional[Decimal] = Field(None, ge=0, description="Payment amount")
    currency: Optional[str] = Field(None, description="Currency")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    transaction_id: Optional[str] = Field(None, max_length=100, description="Transaction ID")
    notes: Optional[str] = Field(None, description="Notes")

class PurchasePaymentResponse(PurchasePaymentBase):
    """Schema for purchase payment response."""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PurchasePaymentList(BaseModel):
    """Schema for paginated purchase payment list response."""
    payments: List[PurchasePaymentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int 