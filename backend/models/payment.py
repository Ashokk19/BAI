"""
BAI Backend Payment Models

This module contains the payment-related models for tracking payments and payment history.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Payment(Base):
    """Payment model for tracking payments made and received."""
    
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Multi-tenancy
    account_id = Column(String(100), nullable=False, default="TestAccount", index=True)
    
    # Payment identification
    payment_number = Column(String(50), unique=True, nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    
    # Payment type and direction
    payment_type = Column(String(20), nullable=False)  # invoice_payment, vendor_payment, refund
    payment_direction = Column(String(20), nullable=False)  # incoming, outgoing
    
    # Related entities
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer = relationship("Customer")
    
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    vendor = relationship("Vendor")
    
    # Payment details
    amount = Column(Decimal(12, 2), nullable=False)
    currency = Column(String(10), default="USD")
    
    # Payment method
    payment_method = Column(String(50), nullable=False)  # cash, check, bank_transfer, credit_card, etc.
    payment_status = Column(String(20), default="pending")  # pending, completed, failed, cancelled
    
    # Bank/Transaction details
    reference_number = Column(String(100), nullable=True)
    bank_account = Column(String(100), nullable=True)
    check_number = Column(String(50), nullable=True)
    transaction_id = Column(String(100), nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    
    # User who recorded the payment
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorder = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of Payment."""
        return f"<Payment(id={self.id}, payment_number='{self.payment_number}', amount={self.amount})>"

class PaymentLog(Base):
    """Payment log model for tracking payment history and changes."""
    
    __tablename__ = "payment_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Payment relationship
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    payment = relationship("Payment")
    
    # Log details
    action = Column(String(50), nullable=False)  # created, updated, cancelled, refunded
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)
    
    # Change details
    description = Column(Text, nullable=True)
    amount_changed = Column(Decimal(12, 2), nullable=True)
    
    # User who made the change
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changer = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        """String representation of PaymentLog."""
        return f"<PaymentLog(id={self.id}, action='{self.action}', payment_id={self.payment_id})>" 