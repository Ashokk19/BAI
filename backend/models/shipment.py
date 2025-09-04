"""
BAI Backend Shipment Models

This module contains the shipment-related models for tracking shipments and deliveries.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import Numeric as Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Shipment(Base):
    """Shipment model for tracking shipments and deliveries."""
    
    __tablename__ = "shipments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Organization isolation
    account_id = Column(String(50), nullable=False, index=True)
    
    # Shipment identification
    shipment_number = Column(String(50), unique=True, nullable=False)
    tracking_number = Column(String(100), nullable=True)
    
    # Related entities
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Shipment details
    status = Column(String(20), default="pending")  # pending, shipped, in_transit, delivered, cancelled
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Dates
    ship_date = Column(DateTime(timezone=True), nullable=True)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)
    actual_delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # Shipping information
    shipping_method = Column(String(50), nullable=True)  # courier, postal, pickup, etc.
    carrier = Column(String(100), nullable=True)
    service_type = Column(String(50), nullable=True)  # standard, express, overnight
    
    # Address information
    shipping_address = Column(Text, nullable=False)
    billing_address = Column(Text, nullable=True)
    
    # Package information
    package_count = Column(Integer, default=1)
    total_weight = Column(Decimal(8, 3), nullable=True)
    dimensions = Column(String(100), nullable=True)
    
    # Costs
    shipping_cost = Column(Decimal(10, 2), default=0.00)
    insurance_cost = Column(Decimal(10, 2), default=0.00)
    
    # Additional information
    special_instructions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # User who created the shipment
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of Shipment."""
        return f"<Shipment(id={self.id}, shipment_number='{self.shipment_number}', status='{self.status}')>"

class DeliveryNote(Base):
    """Delivery note model for tracking delivery confirmations and proof of delivery."""
    
    __tablename__ = "delivery_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Organization isolation
    account_id = Column(String(50), nullable=False, index=True)
    
    # Delivery note identification
    delivery_note_number = Column(String(50), unique=True, nullable=False)
    
    # Related entities
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True)
    shipment = relationship("Shipment")
    
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice = relationship("Invoice")
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")
    
    # Delivery details
    delivery_date = Column(DateTime(timezone=True), nullable=False)
    delivery_time = Column(String(20), nullable=True)
    delivery_status = Column(String(20), default="delivered")  # delivered, partial, failed, refused
    
    # Recipient information
    received_by = Column(String(100), nullable=True)
    recipient_signature = Column(Text, nullable=True)  # Base64 encoded signature
    
    # Delivery address
    delivery_address = Column(Text, nullable=False)
    
    # Package information
    packages_delivered = Column(Integer, default=1)
    condition_on_delivery = Column(String(50), default="good")  # good, damaged, partial
    
    # Proof of delivery
    photo_proof = Column(Text, nullable=True)  # Base64 encoded image or file path
    
    # Additional information
    delivery_notes = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    
    # User who recorded the delivery
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorder = relationship("User")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        """String representation of DeliveryNote."""
        return f"<DeliveryNote(id={self.id}, delivery_note_number='{self.delivery_note_number}', delivery_status='{self.delivery_status}')>" 