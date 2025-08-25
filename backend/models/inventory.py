"""
BAI Backend Inventory Models

This module contains the inventory-related models for tracking inventory changes and movements.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class InventoryLog(Base):
    """Inventory log model for tracking inventory changes and movements."""
    
    __tablename__ = "inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Customer identification for multi-tenant support
    account_id = Column(String(100), nullable=False, default="TestAccount", index=True)
    
    # Item relationship
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item = relationship("Item")
    
    # Transaction details
    transaction_type = Column(String(50), nullable=False)  # purchase, sale, adjustment, transfer, return
    transaction_reference = Column(String(100), nullable=True)  # invoice number, PO number, etc.
    
    # Quantity changes
    quantity_before = Column(Decimal(10, 3), nullable=False)
    quantity_change = Column(Decimal(10, 3), nullable=False)  # positive for increase, negative for decrease
    quantity_after = Column(Decimal(10, 3), nullable=False)
    
    # Unit cost at time of transaction
    unit_cost = Column(Decimal(10, 2), nullable=True)
    
    # Location information
    location_from = Column(String(100), nullable=True)
    location_to = Column(String(100), nullable=True)
    
    # Batch and expiry information
    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Transaction date
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    
    # Related entities
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    purchase_order = relationship("PurchaseOrder")
    
    # Additional information
    notes = Column(Text, nullable=True)
    reason = Column(String(100), nullable=True)  # For adjustments
    
    # User who recorded the transaction
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorder = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of InventoryLog."""
        return f"<InventoryLog(id={self.id}, item_id={self.item_id}, transaction_type='{self.transaction_type}', quantity_change={self.quantity_change})>" 