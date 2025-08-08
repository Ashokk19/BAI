"""
BAI Backend Item Models

This module contains the Item and ItemCategory models for inventory management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class ItemCategory(Base):
    """Item category model for organizing inventory items."""
    
    __tablename__ = "item_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    items = relationship("Item", back_populates="category")
    
    def __repr__(self):
        """String representation of ItemCategory."""
        return f"<ItemCategory(id={self.id}, name='{self.name}')>"

class Item(Base):
    """Item model for inventory management."""
    
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    sku = Column(String(50), unique=True, nullable=False)
    barcode = Column(String(50), unique=True, nullable=True)
    
    # Category relationship
    category_id = Column(Integer, ForeignKey("item_categories.id"), nullable=False)
    category = relationship("ItemCategory", back_populates="items")
    
    # GST slab relationship
    gst_slab_id = Column(Integer, ForeignKey("gst_slabs.id"), nullable=True)
    gst_slab = relationship("GSTSlab", back_populates="items")
    
    # Pricing
    unit_price = Column(Decimal(10, 2), nullable=False)
    cost_price = Column(Decimal(10, 2), nullable=True)
    selling_price = Column(Decimal(10, 2), nullable=False)
    
    # Inventory tracking
    current_stock = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=0)
    maximum_stock = Column(Integer, nullable=True)
    
    # Physical properties
    unit_of_measure = Column(String(20), nullable=False)  # pcs, kg, ltr, etc.
    weight = Column(Decimal(8, 3), nullable=True)
    dimensions = Column(String(100), nullable=True)  # L x W x H
    
    # Expiry tracking
    has_expiry = Column(Boolean, default=False)
    shelf_life_days = Column(Integer, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_serialized = Column(Boolean, default=False)
    
    # Tax information
    tax_rate = Column(Decimal(5, 2), default=0.00)
    tax_type = Column(String(20), default="percentage")  # percentage, fixed
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of Item."""
        return f"<Item(id={self.id}, name='{self.name}', sku='{self.sku}')>"
    
    @property
    def is_low_stock(self):
        """Check if item is low on stock."""
        return self.current_stock <= self.minimum_stock
    
    @property
    def stock_value(self):
        """Calculate current stock value."""
        return self.current_stock * self.cost_price if self.cost_price else 0 