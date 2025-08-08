"""
BAI Backend Sales Return Models

This module contains the sales return models for handling product returns and refunds.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class SalesReturn(Base):
    """Sales return model for tracking product returns and refunds."""
    
    __tablename__ = "sales_returns"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Return identification
    return_number = Column(String(50), unique=True, nullable=False)
    return_date = Column(DateTime(timezone=True), nullable=False)
    
    # Related entities
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice = relationship("Invoice")
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Return details
    return_reason = Column(String(100), nullable=False)
    return_type = Column(String(20), default="full")  # full, partial, exchange
    status = Column(String(20), default="pending")  # pending, approved, rejected, processed
    
    # Financial details
    total_return_amount = Column(Decimal(12, 2), nullable=False)
    refund_amount = Column(Decimal(12, 2), nullable=False)
    restocking_fee = Column(Decimal(12, 2), default=0.00)
    
    # Refund information
    refund_method = Column(String(30), default="credit_note")  # credit_note, bank_transfer, cash, original_payment
    refund_status = Column(String(20), default="pending")  # pending, processed, completed
    refund_date = Column(DateTime(timezone=True), nullable=True)
    refund_reference = Column(String(100), nullable=True)
    
    # Additional information
    return_reason_details = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)
    
    # Quality assessment
    items_condition = Column(String(20), default="good")  # good, damaged, defective, used
    quality_check_notes = Column(Text, nullable=True)
    
    # User who processed the return
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    processor = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    items = relationship("SalesReturnItem", back_populates="sales_return", cascade="all, delete-orphan")
    
    def __repr__(self):
        """String representation of SalesReturn."""
        return f"<SalesReturn(id={self.id}, return_number='{self.return_number}', status='{self.status}')>"

class SalesReturnItem(Base):
    """Sales return item model for individual items being returned."""
    
    __tablename__ = "sales_return_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Return relationship
    sales_return_id = Column(Integer, ForeignKey("sales_returns.id"), nullable=False)
    sales_return = relationship("SalesReturn", back_populates="items")
    
    # Original invoice item relationship
    invoice_item_id = Column(Integer, ForeignKey("invoice_items.id"), nullable=False)
    invoice_item = relationship("InvoiceItem")
    
    # Item details (snapshot at time of return)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item = relationship("Item")
    
    item_name = Column(String(200), nullable=False)
    item_sku = Column(String(50), nullable=False)
    
    # Quantity and pricing
    original_quantity = Column(Decimal(10, 3), nullable=False)
    return_quantity = Column(Decimal(10, 3), nullable=False)
    unit_price = Column(Decimal(10, 2), nullable=False)
    
    # Return amounts
    return_amount = Column(Decimal(12, 2), nullable=False)
    refund_amount = Column(Decimal(12, 2), nullable=False)
    
    # Item condition
    condition_on_return = Column(String(20), default="good")  # good, damaged, defective, used
    return_reason = Column(String(100), nullable=True)
    
    # Restocking information
    restockable = Column(Boolean, default=True)
    restocked = Column(Boolean, default=False)
    restock_date = Column(DateTime(timezone=True), nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of SalesReturnItem."""
        return f"<SalesReturnItem(id={self.id}, item_name='{self.item_name}', return_quantity={self.return_quantity})>" 