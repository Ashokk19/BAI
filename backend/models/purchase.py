"""
BAI Backend Purchase Models

This module contains the purchase-related models for purchase management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class PurchaseOrder(Base):
    """Purchase order model for purchase management."""
    
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Purchase order identification
    po_number = Column(String(50), unique=True, nullable=False)
    po_date = Column(DateTime(timezone=True), nullable=False)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # Vendor relationship
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    vendor = relationship("Vendor")
    
    # Purchase order details
    status = Column(String(20), default="draft")  # draft, sent, confirmed, partial_received, received, cancelled
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Financial details
    subtotal = Column(Decimal(12, 2), default=0.00)
    tax_amount = Column(Decimal(12, 2), default=0.00)
    discount_amount = Column(Decimal(12, 2), default=0.00)
    total_amount = Column(Decimal(12, 2), default=0.00)
    
    # Payment terms
    payment_terms = Column(String(50), default="net_30")
    currency = Column(String(10), default="USD")
    
    # Shipping information
    shipping_address = Column(Text, nullable=True)
    shipping_method = Column(String(50), nullable=True)
    shipping_cost = Column(Decimal(10, 2), default=0.00)
    
    # Additional information
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    
    # User who created the purchase order
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    
    def __repr__(self):
        """String representation of PurchaseOrder."""
        return f"<PurchaseOrder(id={self.id}, po_number='{self.po_number}', total_amount={self.total_amount})>"

class PurchaseOrderItem(Base):
    """Purchase order item model for individual line items in a purchase order."""
    
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Purchase order relationship
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    
    # Item relationship
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item = relationship("Item")
    
    # Item details (snapshot at time of purchase order)
    item_name = Column(String(200), nullable=False)
    item_description = Column(Text, nullable=True)
    item_sku = Column(String(50), nullable=False)
    
    # Quantity and pricing
    quantity_ordered = Column(Decimal(10, 3), nullable=False)
    quantity_received = Column(Decimal(10, 3), default=0.00)
    unit_price = Column(Decimal(10, 2), nullable=False)
    discount_rate = Column(Decimal(5, 2), default=0.00)
    discount_amount = Column(Decimal(10, 2), default=0.00)
    
    # Tax information
    tax_rate = Column(Decimal(5, 2), default=0.00)
    tax_amount = Column(Decimal(10, 2), default=0.00)
    
    # Calculated amounts
    line_total = Column(Decimal(12, 2), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of PurchaseOrderItem."""
        return f"<PurchaseOrderItem(id={self.id}, item_name='{self.item_name}', quantity_ordered={self.quantity_ordered})>"
    
    @property
    def quantity_pending(self):
        """Calculate pending quantity to be received."""
        return self.quantity_ordered - self.quantity_received
    
    @property
    def is_fully_received(self):
        """Check if item is fully received."""
        return self.quantity_received >= self.quantity_ordered

class PurchaseReceived(Base):
    """Purchase received model for tracking received items."""
    
    __tablename__ = "purchase_received"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Purchase order relationship
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    purchase_order = relationship("PurchaseOrder")
    
    # Purchase order item relationship
    purchase_order_item_id = Column(Integer, ForeignKey("purchase_order_items.id"), nullable=False)
    purchase_order_item = relationship("PurchaseOrderItem")
    
    # Receipt details
    receipt_number = Column(String(50), unique=True, nullable=False)
    receipt_date = Column(DateTime(timezone=True), nullable=False)
    
    # Item relationship
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item = relationship("Item")
    
    # Received quantities
    quantity_received = Column(Decimal(10, 3), nullable=False)
    quantity_accepted = Column(Decimal(10, 3), nullable=False)
    quantity_rejected = Column(Decimal(10, 3), default=0.00)
    
    # Quality control
    quality_status = Column(String(20), default="pending")  # pending, passed, failed, partial
    quality_notes = Column(Text, nullable=True)
    
    # Storage information
    storage_location = Column(String(100), nullable=True)
    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # User who recorded the receipt
    received_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of PurchaseReceived."""
        return f"<PurchaseReceived(id={self.id}, receipt_number='{self.receipt_number}', quantity_received={self.quantity_received})>" 