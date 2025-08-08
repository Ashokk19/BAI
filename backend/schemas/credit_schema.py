"""
BAI Backend Credit Schemas

This module contains Pydantic schemas for credit management operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class CreditTransactionBase(BaseModel):
    """Base credit transaction schema."""
    transaction_type: str = Field(..., max_length=20, description="Transaction type")
    transaction_date: datetime = Field(..., description="Transaction date")
    amount: Decimal = Field(..., description="Transaction amount")
    description: Optional[str] = Field(None, description="Transaction description")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")

class CreditTransactionCreate(CreditTransactionBase):
    """Schema for creating credit transactions."""
    pass

class CreditTransactionResponse(CreditTransactionBase):
    """Schema for credit transaction response."""
    id: int
    credit_id: int
    running_balance: Decimal
    performed_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CustomerCreditBase(BaseModel):
    """Base customer credit schema."""
    customer_id: int = Field(..., description="Customer ID")
    credit_date: datetime = Field(..., description="Credit date")
    credit_type: str = Field(..., max_length=30, description="Credit type")
    credit_reason: str = Field(..., max_length=100, description="Credit reason")
    original_amount: Decimal = Field(..., gt=0, description="Original credit amount")
    remaining_amount: Decimal = Field(..., ge=0, description="Remaining credit amount")
    expiry_date: Optional[datetime] = Field(None, description="Credit expiry date")
    auto_expire: bool = Field(default=True, description="Auto expire on date")
    minimum_order_amount: Optional[Decimal] = Field(None, ge=0, description="Minimum order amount")
    usage_limit_per_order: Optional[Decimal] = Field(None, ge=0, description="Usage limit per order")
    description: Optional[str] = Field(None, description="Credit description")
    internal_notes: Optional[str] = Field(None, description="Internal notes")
    customer_notes: Optional[str] = Field(None, description="Customer notes")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")
    sales_return_id: Optional[int] = Field(None, description="Related sales return ID")

class CustomerCreditCreate(CustomerCreditBase):
    """Schema for creating customer credits."""
    pass

class CustomerCreditUpdate(BaseModel):
    """Schema for updating customer credits."""
    credit_reason: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None)
    expiry_date: Optional[datetime] = Field(None)
    auto_expire: Optional[bool] = Field(None)
    minimum_order_amount: Optional[Decimal] = Field(None, ge=0)
    usage_limit_per_order: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = Field(None)
    internal_notes: Optional[str] = Field(None)
    customer_notes: Optional[str] = Field(None)

class CustomerCreditResponse(CustomerCreditBase):
    """Schema for customer credit response."""
    id: int
    credit_number: str
    status: str
    used_amount: Decimal
    is_expired: bool
    is_usable: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    transactions: List[CreditTransactionResponse] = []
    
    class Config:
        from_attributes = True

class CustomerCreditList(BaseModel):
    """Schema for customer credit list response."""
    credits: List[CustomerCreditResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class CustomerCreditSummary(BaseModel):
    """Schema for customer credit summary."""
    id: int
    credit_number: str
    customer_name: str
    credit_type: str
    original_amount: Decimal
    remaining_amount: Decimal
    status: str
    expiry_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CreditNoteBase(BaseModel):
    """Base credit note schema."""
    customer_id: int = Field(..., description="Customer ID")
    credit_note_date: datetime = Field(..., description="Credit note date")
    credit_note_type: str = Field(..., max_length=30, description="Credit note type")
    reason: str = Field(..., max_length=100, description="Credit note reason")
    subtotal: Decimal = Field(..., ge=0, description="Subtotal amount")
    tax_amount: Decimal = Field(default=0.00, ge=0, description="Tax amount")
    total_amount: Decimal = Field(..., ge=0, description="Total amount")
    description: Optional[str] = Field(None, description="Credit note description")
    notes: Optional[str] = Field(None, description="Additional notes")
    terms_conditions: Optional[str] = Field(None, description="Terms and conditions")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")
    sales_return_id: Optional[int] = Field(None, description="Related sales return ID")
    customer_credit_id: Optional[int] = Field(None, description="Related customer credit ID")

class CreditNoteCreate(CreditNoteBase):
    """Schema for creating credit notes."""
    pass

class CreditNoteUpdate(BaseModel):
    """Schema for updating credit notes."""
    credit_note_type: Optional[str] = Field(None, max_length=30)
    reason: Optional[str] = Field(None, max_length=100)
    subtotal: Optional[Decimal] = Field(None, ge=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    total_amount: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)
    terms_conditions: Optional[str] = Field(None)

class CreditNoteResponse(CreditNoteBase):
    """Schema for credit note response."""
    id: int
    credit_note_number: str
    status: str
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CreditNoteList(BaseModel):
    """Schema for credit note list response."""
    credit_notes: List[CreditNoteResponse]
    total: int
    page: int
    per_page: int
    total_pages: int 