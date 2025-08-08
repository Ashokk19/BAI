"""
BAI Backend Credit Models

This module contains the credit models for tracking customer credits and their usage.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class CustomerCredit(Base):
    """Customer credit model for tracking credits issued to customers."""
    
    __tablename__ = "customer_credits"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Credit identification
    credit_number = Column(String(50), unique=True, nullable=False)
    credit_date = Column(DateTime(timezone=True), nullable=False)
    
    # Customer relationship
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Related entities (optional)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    sales_return_id = Column(Integer, ForeignKey("sales_returns.id"), nullable=True)
    sales_return = relationship("SalesReturn")
    
    # Credit details
    credit_type = Column(String(30), nullable=False)  # return_credit, adjustment, promotional, goodwill
    credit_reason = Column(String(100), nullable=False)
    status = Column(String(20), default="active")  # active, used, expired, cancelled
    
    # Financial details
    original_amount = Column(Decimal(12, 2), nullable=False)
    used_amount = Column(Decimal(12, 2), default=0.00)
    remaining_amount = Column(Decimal(12, 2), nullable=False)
    
    # Expiry information
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    auto_expire = Column(Boolean, default=True)
    
    # Usage restrictions
    minimum_order_amount = Column(Decimal(12, 2), nullable=True)
    applicable_categories = Column(Text, nullable=True)  # JSON array of category IDs
    usage_limit_per_order = Column(Decimal(12, 2), nullable=True)
    
    # Additional information
    description = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)
    
    # User who created the credit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("CreditTransaction", back_populates="credit", cascade="all, delete-orphan")
    
    def __repr__(self):
        """String representation of CustomerCredit."""
        return f"<CustomerCredit(id={self.id}, credit_number='{self.credit_number}', remaining_amount={self.remaining_amount})>"
    
    @property
    def is_expired(self):
        """Check if credit is expired."""
        if not self.expiry_date:
            return False
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        # Ensure both dates are timezone-aware for comparison
        if self.expiry_date.tzinfo is None:
            # If expiry_date is naive, assume it's UTC
            expiry_aware = self.expiry_date.replace(tzinfo=timezone.utc)
        else:
            expiry_aware = self.expiry_date
        return now > expiry_aware
    
    @property
    def is_usable(self):
        """Check if credit can be used."""
        return (
            self.status == "active" and
            self.remaining_amount > 0 and
            not self.is_expired
        )

class CreditTransaction(Base):
    """Credit transaction model for tracking credit usage and adjustments."""
    
    __tablename__ = "credit_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Credit relationship
    credit_id = Column(Integer, ForeignKey("customer_credits.id"), nullable=False)
    credit = relationship("CustomerCredit", back_populates="transactions")
    
    # Transaction details
    transaction_type = Column(String(20), nullable=False)  # usage, adjustment, refund, expiry
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    
    # Related entities (for usage transactions)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    # Transaction amounts
    amount = Column(Decimal(12, 2), nullable=False)
    running_balance = Column(Decimal(12, 2), nullable=False)
    
    # Transaction details
    description = Column(Text, nullable=True)
    reference_number = Column(String(100), nullable=True)
    
    # User who performed the transaction
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    performer = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        """String representation of CreditTransaction."""
        return f"<CreditTransaction(id={self.id}, transaction_type='{self.transaction_type}', amount={self.amount})>"

class CreditNote(Base):
    """Credit note model for formal credit note documents."""
    
    __tablename__ = "credit_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Credit note identification
    credit_note_number = Column(String(50), unique=True, nullable=False)
    credit_note_date = Column(DateTime(timezone=True), nullable=False)
    
    # Customer relationship
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Related entities
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    sales_return_id = Column(Integer, ForeignKey("sales_returns.id"), nullable=True)
    sales_return = relationship("SalesReturn")
    
    customer_credit_id = Column(Integer, ForeignKey("customer_credits.id"), nullable=True)
    customer_credit = relationship("CustomerCredit")
    
    # Credit note details
    credit_note_type = Column(String(30), nullable=False)  # return, adjustment, discount, goodwill
    reason = Column(String(100), nullable=False)
    
    # Financial details
    subtotal = Column(Decimal(12, 2), nullable=False)
    tax_amount = Column(Decimal(12, 2), default=0.00)
    total_amount = Column(Decimal(12, 2), nullable=False)
    
    # Status
    status = Column(String(20), default="issued")  # draft, issued, applied, cancelled
    
    # Additional information
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    
    # User who created the credit note
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of CreditNote."""
        return f"<CreditNote(id={self.id}, credit_note_number='{self.credit_note_number}', total_amount={self.total_amount})>" 