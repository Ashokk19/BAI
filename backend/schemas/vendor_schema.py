"""
BAI Backend Vendor Schemas

This module contains Pydantic schemas for vendor operations.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

class VendorBase(BaseModel):
    """Base vendor schema with common fields."""
    vendor_code: str = Field(..., max_length=50, description="Unique vendor code")
    company_name: str = Field(..., max_length=200, description="Company name")
    contact_person: Optional[str] = Field(None, max_length=100, description="Contact person name")
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
    vendor_type: str = Field(default="supplier", description="Vendor type")
    tax_number: Optional[str] = Field(None, max_length=50, description="Tax number")
    gst_number: Optional[str] = Field(None, max_length=50, description="GST number")
    payment_terms: str = Field(default="net_30", description="Payment terms")
    currency: str = Field(default="INR", description="Currency")
    bank_name: Optional[str] = Field(None, max_length=100, description="Bank name")
    bank_account_number: Optional[str] = Field(None, max_length=50, description="Bank account number")
    routing_number: Optional[str] = Field(None, max_length=50, description="Routing number")
    swift_code: Optional[str] = Field(None, max_length=20, description="SWIFT code")
    is_active: bool = Field(default=True, description="Active status")
    is_verified: bool = Field(default=False, description="Verified status")
    rating: Optional[Decimal] = Field(default=0.00, ge=0, le=5, description="Vendor rating")
    performance_score: Optional[Decimal] = Field(default=0.00, ge=0, le=100, description="Performance score")
    notes: Optional[str] = Field(None, description="Additional notes")

class VendorCreate(VendorBase):
    """Schema for creating a new vendor."""
    pass

class VendorUpdate(BaseModel):
    """Schema for updating a vendor."""
    vendor_code: Optional[str] = Field(None, max_length=50, description="Unique vendor code")
    company_name: Optional[str] = Field(None, max_length=200, description="Company name")
    contact_person: Optional[str] = Field(None, max_length=100, description="Contact person name")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=20, description="Mobile number")
    website: Optional[str] = Field(None, max_length=255, description="Website URL")
    billing_address: Optional[str] = Field(None, description="Billing address")
    shipping_address: Optional[str] = Field(None, description="Shipping address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    vendor_type: Optional[str] = Field(None, description="Vendor type")
    tax_number: Optional[str] = Field(None, max_length=50, description="Tax number")
    gst_number: Optional[str] = Field(None, max_length=50, description="GST number")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    currency: Optional[str] = Field(None, description="Currency")
    bank_name: Optional[str] = Field(None, max_length=100, description="Bank name")
    bank_account_number: Optional[str] = Field(None, max_length=50, description="Bank account number")
    routing_number: Optional[str] = Field(None, max_length=50, description="Routing number")
    swift_code: Optional[str] = Field(None, max_length=20, description="SWIFT code")
    is_active: Optional[bool] = Field(None, description="Active status")
    is_verified: Optional[bool] = Field(None, description="Verified status")
    rating: Optional[Decimal] = Field(None, ge=0, le=5, description="Vendor rating")
    performance_score: Optional[Decimal] = Field(None, ge=0, le=100, description="Performance score")
    notes: Optional[str] = Field(None, description="Additional notes")

class VendorResponse(VendorBase):
    """Schema for vendor response."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VendorList(BaseModel):
    """Schema for paginated vendor list response."""
    vendors: List[VendorResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class VendorSummary(BaseModel):
    """Schema for vendor summary statistics."""
    total_vendors: int
    active_vendors: int
    inactive_vendors: int
    vendor_type_distribution: Dict[str, int] 