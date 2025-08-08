"""
BAI Backend GST Slab Model

This module contains the GST slab model for tax management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class GSTSlab(Base):
    """GST slab model for tax management."""
    
    __tablename__ = "gst_slabs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # GST Information
    name = Column(String(50), unique=True, nullable=False)  # e.g., "5% GST", "12% GST"
    rate = Column(Decimal(5, 2), nullable=False)  # GST rate percentage
    hsn_code = Column(String(20), nullable=True)  # HSN code for this slab
    description = Column(Text, nullable=True)
    
    # Tax breakdown
    cgst_rate = Column(Decimal(5, 2), nullable=False)  # Central GST rate
    sgst_rate = Column(Decimal(5, 2), nullable=False)  # State GST rate
    igst_rate = Column(Decimal(5, 2), nullable=False)  # Integrated GST rate
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    items = relationship("Item", back_populates="gst_slab")
    
    def __repr__(self):
        """String representation of GSTSlab."""
        return f"<GSTSlab(id={self.id}, name='{self.name}', rate={self.rate})>"
    
    @property
    def total_tax_rate(self):
        """Calculate total tax rate."""
        return self.cgst_rate + self.sgst_rate + self.igst_rate 