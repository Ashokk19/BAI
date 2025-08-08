"""
BAI Backend Customer Model

This module contains the Customer model for sales management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.sql import func
from database.database import Base

class Customer(Base):
    """Customer model for sales management."""
    
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    customer_code = Column(String(50), unique=True, nullable=False)
    company_name = Column(String(200), nullable=True)
    contact_person = Column(String(100), nullable=True)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    
    # Contact information
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Address information
    billing_address = Column(Text, nullable=True)
    shipping_address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    
    # Business information
    customer_type = Column(String(20), default="individual")  # individual, business
    tax_number = Column(String(50), nullable=True)
    gst_number = Column(String(50), nullable=True)
    
    # Credit and payment terms
    credit_limit = Column(Decimal(12, 2), default=0.00)
    payment_terms = Column(String(50), default="immediate")  # immediate, net_30, net_60
    currency = Column(String(10), default="USD")
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of Customer."""
        return f"<Customer(id={self.id}, customer_code='{self.customer_code}', email='{self.email}')>"
    
    @property
    def display_name(self):
        """Get customer display name."""
        if self.company_name:
            return self.company_name
        elif self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.contact_person:
            return self.contact_person
        else:
            return self.customer_code 