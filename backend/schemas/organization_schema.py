from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OrganizationBase(BaseModel):
    """Base organization schema with common fields."""
    
    company_name: str = Field(..., description="Company name", max_length=255)
    business_type: Optional[str] = Field(None, description="Business type", max_length=100)
    industry: Optional[str] = Field(None, description="Industry", max_length=100)
    founded_year: Optional[str] = Field(None, description="Founded year", max_length=10)
    employee_count: Optional[str] = Field(None, description="Employee count range", max_length=50)
    
    # Legal & Tax Information
    registration_number: Optional[str] = Field(None, description="Registration number", max_length=100)
    tax_id: Optional[str] = Field(None, description="Tax ID", max_length=100)
    gst_number: Optional[str] = Field(None, description="GST number", max_length=100)
    pan_number: Optional[str] = Field(None, description="PAN number", max_length=100)
    
    # Contact Information
    phone: Optional[str] = Field(None, description="Phone number", max_length=50)
    email: Optional[str] = Field(None, description="Email address", max_length=255)
    website: Optional[str] = Field(None, description="Website URL", max_length=255)
    
    # Business Settings
    currency: Optional[str] = Field("INR", description="Currency code", max_length=10)
    timezone: Optional[str] = Field("Asia/Kolkata", description="Timezone", max_length=100)
    fiscal_year_start: Optional[str] = Field(None, description="Fiscal year start (MM-DD)", max_length=10)
    
    # Address Information
    address: Optional[str] = Field(None, description="Address")
    city: Optional[str] = Field(None, description="City", max_length=100)
    state: Optional[str] = Field(None, description="State", max_length=100)
    postal_code: Optional[str] = Field(None, description="Postal code", max_length=20)
    country: Optional[str] = Field("India", description="Country", max_length=100)
    
    # Banking Information
    bank_name: Optional[str] = Field(None, description="Bank name", max_length=255)
    bank_account_number: Optional[str] = Field(None, description="Bank account number", max_length=50)
    bank_account_holder_name: Optional[str] = Field(None, description="Account holder name", max_length=255)
    bank_ifsc_code: Optional[str] = Field(None, description="IFSC code", max_length=20)
    bank_branch_name: Optional[str] = Field(None, description="Branch name", max_length=255)
    bank_branch_address: Optional[str] = Field(None, description="Branch address")
    bank_account_type: Optional[str] = Field(None, description="Account type (Savings, Current, etc.)", max_length=50)
    bank_swift_code: Optional[str] = Field(None, description="SWIFT code", max_length=20)
    
    # Additional Information
    description: Optional[str] = Field(None, description="Company description")
    logo_url: Optional[str] = Field(None, description="Logo URL", max_length=500)
    is_verified: Optional[bool] = Field(False, description="Verification status")

class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""
    pass

class OrganizationUpdate(BaseModel):
    """Schema for updating organization information."""
    
    company_name: Optional[str] = Field(None, description="Company name", max_length=255)
    business_type: Optional[str] = Field(None, description="Business type", max_length=100)
    industry: Optional[str] = Field(None, description="Industry", max_length=100)
    founded_year: Optional[str] = Field(None, description="Founded year", max_length=10)
    employee_count: Optional[str] = Field(None, description="Employee count range", max_length=50)
    
    # Legal & Tax Information
    registration_number: Optional[str] = Field(None, description="Registration number", max_length=100)
    tax_id: Optional[str] = Field(None, description="Tax ID", max_length=100)
    gst_number: Optional[str] = Field(None, description="GST number", max_length=100)
    pan_number: Optional[str] = Field(None, description="PAN number", max_length=100)
    
    # Contact Information
    phone: Optional[str] = Field(None, description="Phone number", max_length=50)
    email: Optional[str] = Field(None, description="Email address", max_length=255)
    website: Optional[str] = Field(None, description="Website URL", max_length=255)
    
    # Business Settings
    currency: Optional[str] = Field(None, description="Currency code", max_length=10)
    timezone: Optional[str] = Field(None, description="Timezone", max_length=100)
    fiscal_year_start: Optional[str] = Field(None, description="Fiscal year start (MM-DD)", max_length=10)
    
    # Address Information
    address: Optional[str] = Field(None, description="Address")
    city: Optional[str] = Field(None, description="City", max_length=100)
    state: Optional[str] = Field(None, description="State", max_length=100)
    postal_code: Optional[str] = Field(None, description="Postal code", max_length=20)
    country: Optional[str] = Field(None, description="Country", max_length=100)
    
    # Banking Information
    bank_name: Optional[str] = Field(None, description="Bank name", max_length=255)
    bank_account_number: Optional[str] = Field(None, description="Bank account number", max_length=50)
    bank_account_holder_name: Optional[str] = Field(None, description="Account holder name", max_length=255)
    bank_ifsc_code: Optional[str] = Field(None, description="IFSC code", max_length=20)
    bank_branch_name: Optional[str] = Field(None, description="Branch name", max_length=255)
    bank_branch_address: Optional[str] = Field(None, description="Branch address")
    bank_account_type: Optional[str] = Field(None, description="Account type (Savings, Current, etc.)", max_length=50)
    bank_swift_code: Optional[str] = Field(None, description="SWIFT code", max_length=20)
    
    # Additional Information
    description: Optional[str] = Field(None, description="Company description")
    logo_url: Optional[str] = Field(None, description="Logo URL", max_length=500)
    is_verified: Optional[bool] = Field(None, description="Verification status")

class OrganizationResponse(OrganizationBase):
    """Schema for organization response."""
    
    id: int
    account_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
