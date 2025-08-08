"""
BAI Backend Customer Schemas

This module contains Pydantic schemas for customer operations.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class CustomerBase(BaseModel):
    """Base customer schema with common fields."""
    customer_code: str = Field(..., max_length=50, description="Unique customer code")
    company_name: Optional[str] = Field(None, max_length=200, description="Company name")
    contact_person: Optional[str] = Field(None, max_length=100, description="Contact person name")
    first_name: Optional[str] = Field(None, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, max_length=50, description="Last name")
    email: EmailStr = Field(..., description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=20, description="Mobile number")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")
    billing_address: Optional[str] = Field(None, description="Billing address")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    customer_type: str = Field(default="individual", description="Customer type")
    tax_number: Optional[str] = Field(None, max_length=50, description="Tax number")
    gst_number: Optional[str] = Field(None, max_length=50, description="GST number")
    credit_limit: Optional[Decimal] = Field(default=0.00, description="Credit limit")
    payment_terms: str = Field(default="immediate", description="Payment terms")
    currency: str = Field(default="INR", description="Currency")
    is_active: bool = Field(default=True, description="Active status")
    is_verified: bool = Field(default=False, description="Verified status")
    notes: Optional[str] = Field(None, description="Additional notes")

class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""
    pass

class CustomerUpdate(BaseModel):
    """Schema for updating customer information."""
    customer_code: Optional[str] = Field(None, max_length=50)
    company_name: Optional[str] = Field(None, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = Field(None)
    phone: Optional[str] = Field(None, max_length=20)
    mobile: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    billing_address: Optional[str] = Field(None)
    shipping_address: Optional[str] = Field(None)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    customer_type: Optional[str] = Field(None)
    tax_number: Optional[str] = Field(None, max_length=50)
    gst_number: Optional[str] = Field(None, max_length=50)
    credit_limit: Optional[Decimal] = Field(None)
    payment_terms: Optional[str] = Field(None)
    currency: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)
    is_verified: Optional[bool] = Field(None)
    notes: Optional[str] = Field(None)

class CustomerResponse(CustomerBase):
    """Schema for customer response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CustomerList(BaseModel):
    """Schema for customer list response."""
    customers: List[CustomerResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class CustomerSummary(BaseModel):
    """Schema for customer summary."""
    id: int
    customer_code: str
    display_name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True 