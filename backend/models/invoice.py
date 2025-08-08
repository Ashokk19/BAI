"""
BAI Backend Invoice Models

This module contains the Invoice and InvoiceItem models for sales management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Invoice(Base):
    """Invoice model for sales management."""
    
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Invoice identification
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    
    # Customer relationship
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Invoice details
    status = Column(String(20), default="draft")  # draft, sent, paid, overdue, cancelled
    invoice_type = Column(String(20), default="sale")  # sale, return, credit_note
    
    # Financial details
    subtotal = Column(Decimal(12, 2), default=0.00)
    tax_amount = Column(Decimal(12, 2), default=0.00)
    total_cgst = Column(Decimal(12, 2), default=0.00)
    total_sgst = Column(Decimal(12, 2), default=0.00)
    total_igst = Column(Decimal(12, 2), default=0.00)
    discount_amount = Column(Decimal(12, 2), default=0.00)
    total_amount = Column(Decimal(12, 2), default=0.00)
    paid_amount = Column(Decimal(12, 2), default=0.00)
    
    # Payment terms
    payment_terms = Column(String(50), default="immediate")
    currency = Column(String(10), default="USD")
    
    # Billing information
    billing_address = Column(Text, nullable=True)
    shipping_address = Column(Text, nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    
    # User who created the invoice
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    
    def __repr__(self):
        """String representation of Invoice."""
        return f"<Invoice(id={self.id}, invoice_number='{self.invoice_number}', total_amount={self.total_amount})>"
    
    @property
    def balance_due(self):
        """Calculate balance due amount."""
        return self.total_amount - self.paid_amount
    
    @property
    def is_paid(self):
        """Check if invoice is fully paid."""
        return self.paid_amount >= self.total_amount

class InvoiceItem(Base):
    """Invoice item model for individual line items in an invoice."""
    
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Invoice relationship
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice = relationship("Invoice", back_populates="items")
    
    # Item relationship
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    item = relationship("Item")
    
    # Item details (snapshot at time of invoice)
    item_name = Column(String(200), nullable=False)
    item_description = Column(Text, nullable=True)
    item_sku = Column(String(50), nullable=False)
    
    # Quantity and pricing
    quantity = Column(Decimal(10, 3), nullable=False)
    unit_price = Column(Decimal(10, 2), nullable=False)
    discount_rate = Column(Decimal(5, 2), default=0.00)
    discount_amount = Column(Decimal(10, 2), default=0.00)
    
    # Tax information
    tax_rate = Column(Decimal(5, 2), default=0.00)
    tax_amount = Column(Decimal(10, 2), default=0.00)
    cgst_rate = Column(Decimal(5, 2), default=0.00)
    sgst_rate = Column(Decimal(5, 2), default=0.00)
    igst_rate = Column(Decimal(5, 2), default=0.00)
    cgst_amount = Column(Decimal(10, 2), default=0.00)
    sgst_amount = Column(Decimal(10, 2), default=0.00)
    igst_amount = Column(Decimal(10, 2), default=0.00)
    
    # Calculated amounts
    line_total = Column(Decimal(12, 2), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of InvoiceItem."""
        return f"<InvoiceItem(id={self.id}, item_name='{self.item_name}', quantity={self.quantity})>"
    
    @property
    def subtotal(self):
        """Calculate subtotal before tax."""
        return self.quantity * self.unit_price - self.discount_amount 