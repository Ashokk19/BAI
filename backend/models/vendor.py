"""
BAI Backend Vendor Model

This module contains the Vendor model for purchase management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.sql import func
from database.database import Base

class Vendor(Base):
    """Vendor model for purchase management."""
    
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    vendor_code = Column(String(50), unique=True, nullable=False)
    company_name = Column(String(200), nullable=False)
    contact_person = Column(String(100), nullable=True)
    
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
    vendor_type = Column(String(20), default="supplier")  # supplier, manufacturer, distributor
    tax_number = Column(String(50), nullable=True)
    gst_number = Column(String(50), nullable=True)
    
    # Payment terms
    payment_terms = Column(String(50), default="net_30")  # immediate, net_30, net_60
    currency = Column(String(10), default="USD")
    
    # Bank details
    bank_name = Column(String(100), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    routing_number = Column(String(50), nullable=True)
    swift_code = Column(String(20), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Rating and performance
    rating = Column(Decimal(3, 2), default=0.00)  # 0.00 to 5.00
    performance_score = Column(Decimal(5, 2), default=0.00)  # 0.00 to 100.00
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of Vendor."""
        return f"<Vendor(id={self.id}, vendor_code='{self.vendor_code}', company_name='{self.company_name}')>"
    
    @property
    def display_name(self):
        """Get vendor display name."""
        return self.company_name or self.vendor_code 