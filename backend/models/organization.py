from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Organization(Base):
    """Organization model for storing organization profile and business settings."""
    
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, nullable=False, unique=True, index=True)
    
    # Basic Information
    company_name = Column(String(255), nullable=False)
    business_type = Column(String(100))
    industry = Column(String(100))
    founded_year = Column(String(10))
    employee_count = Column(String(50))
    
    # Legal & Tax Information
    registration_number = Column(String(100))
    tax_id = Column(String(100))
    gst_number = Column(String(100))
    pan_number = Column(String(100))
    
    # Contact Information
    phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(255))
    
    # Business Settings
    currency = Column(String(10), default="INR")
    timezone = Column(String(100), default="Asia/Kolkata")
    fiscal_year_start = Column(String(10))
    
    # Address Information
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="India")
    
    # Banking Information
    bank_name = Column(String(255))
    bank_account_number = Column(String(50))
    bank_account_holder_name = Column(String(255))
    bank_ifsc_code = Column(String(20))
    bank_branch_name = Column(String(255))
    bank_branch_address = Column(Text)
    bank_account_type = Column(String(50))  # Savings, Current, etc.
    bank_swift_code = Column(String(20))  # For international transactions
    
    # Invoice Number Tracking
    last_invoice_number = Column(Integer, default=0)
    last_proforma_number = Column(Integer, default=0)
    
    # Additional Information
    description = Column(Text)
    logo_url = Column(String(500))
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Note: User relationship is handled manually via account_id matching
    # No formal SQLAlchemy relationship to avoid foreign key constraint issues

