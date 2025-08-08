"""
BAI Backend Payment Schemas

This module contains Pydantic schemas for payment management operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class PaymentLogBase(BaseModel):
    """Base payment log schema."""
    payment_id: int = Field(..., description="Payment ID")
    action: str = Field(..., max_length=50, description="Action performed")
    old_status: Optional[str] = Field(None, max_length=20, description="Previous status")
    new_status: Optional[str] = Field(None, max_length=20, description="New status")
    description: Optional[str] = Field(None, description="Change description")
    amount_changed: Optional[Decimal] = Field(None, description="Amount changed")

class PaymentLogCreate(PaymentLogBase):
    """Schema for creating payment logs."""
    pass

class PaymentLogResponse(PaymentLogBase):
    """Schema for payment log response."""
    id: int
    changed_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    """Base payment schema."""
    payment_date: datetime = Field(..., description="Payment date")
    payment_type: str = Field(..., max_length=20, description="Payment type")
    payment_direction: str = Field(..., max_length=20, description="Payment direction")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="INR", max_length=10, description="Currency")
    payment_method: str = Field(..., max_length=50, description="Payment method")
    payment_status: str = Field(default="pending", max_length=20, description="Payment status")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    bank_account: Optional[str] = Field(None, max_length=100, description="Bank account")
    check_number: Optional[str] = Field(None, max_length=50, description="Check number")
    transaction_id: Optional[str] = Field(None, max_length=100, description="Transaction ID")
    notes: Optional[str] = Field(None, description="Payment notes")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")
    customer_id: Optional[int] = Field(None, description="Related customer ID")
    vendor_id: Optional[int] = Field(None, description="Related vendor ID")

class PaymentCreate(PaymentBase):
    """Schema for creating payments."""
    pass

class PaymentUpdate(BaseModel):
    """Schema for updating payments."""
    payment_date: Optional[datetime] = Field(None)
    payment_method: Optional[str] = Field(None, max_length=50)
    payment_status: Optional[str] = Field(None, max_length=20)
    reference_number: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    transaction_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None)

class PaymentResponse(PaymentBase):
    """Schema for payment response."""
    id: int
    payment_number: str
    recorded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaymentList(BaseModel):
    """Schema for payment list response."""
    payments: List[PaymentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class PaymentSummary(BaseModel):
    """Schema for payment summary."""
    id: int
    payment_number: str
    customer_name: Optional[str] = None
    vendor_name: Optional[str] = None
    payment_date: datetime
    amount: Decimal
    payment_method: str
    payment_status: str
    
    class Config:
        from_attributes = True 