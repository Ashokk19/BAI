"""
BAI Backend Sales Return Schemas

This module contains Pydantic schemas for sales return operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class SalesReturnItemBase(BaseModel):
    """Base sales return item schema."""
    invoice_item_id: int = Field(..., description="Original invoice item ID")
    item_id: int = Field(..., description="Item ID")
    item_name: str = Field(..., max_length=200, description="Item name")
    item_sku: str = Field(..., max_length=50, description="Item SKU")
    original_quantity: Decimal = Field(..., gt=0, description="Original quantity sold")
    return_quantity: Decimal = Field(..., gt=0, description="Quantity being returned")
    unit_price: Decimal = Field(..., ge=0, description="Unit price")
    return_amount: Decimal = Field(..., ge=0, description="Return amount")
    refund_amount: Decimal = Field(..., ge=0, description="Refund amount")
    condition_on_return: str = Field(default="good", description="Condition of returned item")
    return_reason: Optional[str] = Field(None, max_length=100, description="Reason for return")
    restockable: bool = Field(default=True, description="Whether item can be restocked")
    notes: Optional[str] = Field(None, description="Additional notes")

class SalesReturnItemCreate(SalesReturnItemBase):
    """Schema for creating sales return items."""
    pass

class SalesReturnItemResponse(SalesReturnItemBase):
    """Schema for sales return item response."""
    id: int
    sales_return_id: int
    restocked: bool
    restock_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SalesReturnBase(BaseModel):
    """Base sales return schema."""
    invoice_id: int = Field(..., description="Invoice ID")
    customer_id: int = Field(..., description="Customer ID")
    return_date: datetime = Field(..., description="Return date")
    return_reason: str = Field(..., max_length=100, description="Return reason")
    return_type: str = Field(default="full", description="Return type")
    status: str = Field(default="pending", description="Return status")
    total_return_amount: Decimal = Field(..., ge=0, description="Total return amount")
    refund_amount: Decimal = Field(..., ge=0, description="Refund amount")
    restocking_fee: Optional[Decimal] = Field(default=0.00, ge=0, description="Restocking fee")
    refund_method: str = Field(default="credit_note", description="Refund method")
    refund_status: str = Field(default="pending", description="Refund status")
    refund_date: Optional[datetime] = Field(None, description="Refund date")
    refund_reference: Optional[str] = Field(None, max_length=100, description="Refund reference")
    return_reason_details: Optional[str] = Field(None, description="Detailed return reason")
    internal_notes: Optional[str] = Field(None, description="Internal notes")
    customer_notes: Optional[str] = Field(None, description="Customer notes")
    items_condition: str = Field(default="good", description="Overall condition of items")
    quality_check_notes: Optional[str] = Field(None, description="Quality check notes")

class SalesReturnCreate(SalesReturnBase):
    """Schema for creating sales returns."""
    items: List[SalesReturnItemCreate] = Field(..., description="Return items")

class SalesReturnUpdate(BaseModel):
    """Schema for updating sales returns."""
    return_reason: Optional[str] = Field(None, max_length=100)
    return_type: Optional[str] = Field(None)
    status: Optional[str] = Field(None)
    refund_amount: Optional[Decimal] = Field(None, ge=0)
    restocking_fee: Optional[Decimal] = Field(None, ge=0)
    refund_method: Optional[str] = Field(None)
    refund_status: Optional[str] = Field(None)
    refund_date: Optional[datetime] = Field(None)
    refund_reference: Optional[str] = Field(None, max_length=100)
    return_reason_details: Optional[str] = Field(None)
    internal_notes: Optional[str] = Field(None)
    customer_notes: Optional[str] = Field(None)
    items_condition: Optional[str] = Field(None)
    quality_check_notes: Optional[str] = Field(None)

class SalesReturnResponse(SalesReturnBase):
    """Schema for sales return response."""
    id: int
    return_number: str
    processed_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[SalesReturnItemResponse] = []
    
    class Config:
        from_attributes = True

class SalesReturnList(BaseModel):
    """Schema for sales return list response."""
    returns: List[SalesReturnResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class SalesReturnSummary(BaseModel):
    """Schema for sales return summary."""
    id: int
    return_number: str
    customer_name: str
    invoice_number: str
    return_date: datetime
    total_return_amount: Decimal
    refund_amount: Decimal
    status: str
    refund_status: str
    
    class Config:
        from_attributes = True 