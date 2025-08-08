"""
BAI Backend Shipment Schemas

This module contains Pydantic schemas for shipment and delivery note operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class ShipmentBase(BaseModel):
    """Base shipment schema."""
    customer_id: int = Field(..., description="Customer ID")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")
    status: str = Field(default="pending", description="Shipment status")
    priority: str = Field(default="normal", description="Shipment priority")
    ship_date: Optional[datetime] = Field(None, description="Ship date")
    expected_delivery_date: Optional[datetime] = Field(None, description="Expected delivery date")
    actual_delivery_date: Optional[datetime] = Field(None, description="Actual delivery date")
    shipping_method: Optional[str] = Field(None, max_length=50, description="Shipping method")
    carrier: Optional[str] = Field(None, max_length=100, description="Carrier")
    service_type: Optional[str] = Field(None, max_length=50, description="Service type")
    shipping_address: str = Field(..., description="Shipping address")
    billing_address: Optional[str] = Field(None, description="Billing address")
    package_count: int = Field(default=1, ge=1, description="Number of packages")
    total_weight: Optional[Decimal] = Field(None, ge=0, description="Total weight")
    dimensions: Optional[str] = Field(None, max_length=100, description="Package dimensions")
    shipping_cost: Decimal = Field(default=0.00, ge=0, description="Shipping cost")
    insurance_cost: Decimal = Field(default=0.00, ge=0, description="Insurance cost")
    special_instructions: Optional[str] = Field(None, description="Special instructions")
    notes: Optional[str] = Field(None, description="Additional notes")

class ShipmentCreate(ShipmentBase):
    """Schema for creating shipments."""
    pass

class ShipmentUpdate(BaseModel):
    """Schema for updating shipments."""
    status: Optional[str] = Field(None)
    priority: Optional[str] = Field(None)
    ship_date: Optional[datetime] = Field(None)
    expected_delivery_date: Optional[datetime] = Field(None)
    actual_delivery_date: Optional[datetime] = Field(None)
    shipping_method: Optional[str] = Field(None, max_length=50)
    carrier: Optional[str] = Field(None, max_length=100)
    service_type: Optional[str] = Field(None, max_length=50)
    shipping_address: Optional[str] = Field(None)
    billing_address: Optional[str] = Field(None)
    package_count: Optional[int] = Field(None, ge=1)
    total_weight: Optional[Decimal] = Field(None, ge=0)
    dimensions: Optional[str] = Field(None, max_length=100)
    shipping_cost: Optional[Decimal] = Field(None, ge=0)
    insurance_cost: Optional[Decimal] = Field(None, ge=0)
    special_instructions: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)

class ShipmentResponse(ShipmentBase):
    """Schema for shipment response."""
    id: int
    shipment_number: str
    tracking_number: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ShipmentList(BaseModel):
    """Schema for shipment list response."""
    shipments: List[ShipmentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ShipmentSummary(BaseModel):
    """Schema for shipment summary."""
    id: int
    shipment_number: str
    customer_name: str
    tracking_number: Optional[str] = None
    status: str
    ship_date: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    carrier: Optional[str] = None
    
    class Config:
        from_attributes = True

class DeliveryNoteBase(BaseModel):
    """Base delivery note schema."""
    shipment_id: int = Field(..., description="Shipment ID")
    customer_id: int = Field(..., description="Customer ID")
    invoice_id: Optional[int] = Field(None, description="Related invoice ID")
    delivery_date: datetime = Field(..., description="Delivery date")
    delivery_time: Optional[str] = Field(None, max_length=20, description="Delivery time")
    delivery_status: str = Field(default="delivered", description="Delivery status")
    received_by: Optional[str] = Field(None, max_length=100, description="Received by")
    recipient_signature: Optional[str] = Field(None, description="Recipient signature")
    delivery_address: str = Field(..., description="Delivery address")
    packages_delivered: int = Field(default=1, ge=1, description="Packages delivered")
    condition_on_delivery: str = Field(default="good", description="Condition on delivery")
    photo_proof: Optional[str] = Field(None, description="Photo proof")
    delivery_notes: Optional[str] = Field(None, description="Delivery notes")
    special_instructions: Optional[str] = Field(None, description="Special instructions")

class DeliveryNoteCreate(DeliveryNoteBase):
    """Schema for creating delivery notes."""
    pass

class DeliveryNoteUpdate(BaseModel):
    """Schema for updating delivery notes."""
    delivery_date: Optional[datetime] = Field(None)
    delivery_time: Optional[str] = Field(None, max_length=20)
    delivery_status: Optional[str] = Field(None)
    received_by: Optional[str] = Field(None, max_length=100)
    recipient_signature: Optional[str] = Field(None)
    delivery_address: Optional[str] = Field(None)
    packages_delivered: Optional[int] = Field(None, ge=1)
    condition_on_delivery: Optional[str] = Field(None)
    photo_proof: Optional[str] = Field(None)
    delivery_notes: Optional[str] = Field(None)
    special_instructions: Optional[str] = Field(None)

class DeliveryNoteResponse(DeliveryNoteBase):
    """Schema for delivery note response."""
    id: int
    delivery_note_number: str
    recorded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DeliveryNoteList(BaseModel):
    """Schema for delivery note list response."""
    delivery_notes: List[DeliveryNoteResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class DeliveryNoteSummary(BaseModel):
    """Schema for delivery note summary."""
    id: int
    delivery_note_number: str
    customer_name: str
    delivery_date: datetime
    delivery_status: str
    packages_delivered: int
    
    class Config:
        from_attributes = True 