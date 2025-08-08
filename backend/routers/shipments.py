"""
BAI Backend Shipments Router

This module contains the shipments routes for shipment and delivery note management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil
from decimal import Decimal
from datetime import datetime, timedelta

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.customer import Customer
from models.invoice import Invoice
from models.shipment import Shipment, DeliveryNote
from schemas.shipment_schema import (
    ShipmentCreate,
    ShipmentUpdate,
    ShipmentResponse,
    ShipmentList,
    ShipmentSummary,
    DeliveryNoteCreate,
    DeliveryNoteUpdate,
    DeliveryNoteResponse,
    DeliveryNoteList,
    DeliveryNoteSummary
)

router = APIRouter()

def generate_shipment_number(db: Session) -> str:
    """Generate a new shipment number."""
    last_shipment = db.query(Shipment).order_by(Shipment.id.desc()).first()
    if last_shipment:
        try:
            last_number = int(last_shipment.shipment_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    current_year = datetime.now().year
    return f"SHP-{current_year}-{next_number:03d}"

def generate_delivery_note_number(db: Session) -> str:
    """Generate a new delivery note number."""
    last_note = db.query(DeliveryNote).order_by(DeliveryNote.id.desc()).first()
    if last_note:
        try:
            last_number = int(last_note.delivery_note_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    current_year = datetime.now().year
    return f"DN-{current_year}-{next_number:03d}"

def generate_tracking_number() -> str:
    """Generate a tracking number."""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

# Delivery Note endpoints (must come before shipment endpoints to avoid conflicts)
@router.get("/delivery-notes", response_model=DeliveryNoteList)
async def get_delivery_notes(
    skip: int = Query(0, ge=0, description="Number of delivery notes to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of delivery notes to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get delivery notes list with pagination and filters."""
    
    query = db.query(DeliveryNote)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                DeliveryNote.delivery_note_number.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term),
                DeliveryNote.received_by.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(DeliveryNote.delivery_status == status)
    
    # Apply customer filter
    if customer_id:
        query = query.filter(DeliveryNote.customer_id == customer_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    delivery_notes = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return DeliveryNoteList(
        delivery_notes=delivery_notes,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.post("/delivery-notes", response_model=DeliveryNoteResponse)
async def create_delivery_note(
    note_data: DeliveryNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new delivery note."""
    
    # Verify shipment exists
    shipment = db.query(Shipment).filter(Shipment.id == note_data.shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == note_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate delivery note number
    note_number = generate_delivery_note_number(db)
    
    # Create delivery note
    delivery_note = DeliveryNote(
        delivery_note_number=note_number,
        shipment_id=note_data.shipment_id,
        customer_id=note_data.customer_id,
        invoice_id=note_data.invoice_id,
        delivery_date=note_data.delivery_date,
        delivery_time=note_data.delivery_time,
        delivery_status=note_data.delivery_status,
        received_by=note_data.received_by,
        recipient_signature=note_data.recipient_signature,
        delivery_address=note_data.delivery_address,
        packages_delivered=note_data.packages_delivered,
        condition_on_delivery=note_data.condition_on_delivery,
        photo_proof=note_data.photo_proof,
        delivery_notes=note_data.delivery_notes,
        special_instructions=note_data.special_instructions,
        recorded_by=current_user.id
    )
    
    db.add(delivery_note)
    
    # Update shipment status if delivered
    if note_data.delivery_status == "delivered":
        shipment.status = "delivered"
        shipment.actual_delivery_date = note_data.delivery_date
    
    db.commit()
    db.refresh(delivery_note)
    
    return delivery_note

# Shipment endpoints
@router.get("/", response_model=ShipmentList)
async def get_shipments(
    skip: int = Query(0, ge=0, description="Number of shipments to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of shipments to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    carrier: Optional[str] = Query(None, description="Filter by carrier"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shipments list with pagination and filters."""
    
    query = db.query(Shipment)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                Shipment.shipment_number.ilike(search_term),
                Shipment.tracking_number.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term),
                Shipment.carrier.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(Shipment.status == status)
    
    # Apply customer filter
    if customer_id:
        query = query.filter(Shipment.customer_id == customer_id)
    
    # Apply carrier filter
    if carrier:
        query = query.filter(Shipment.carrier.ilike(f"%{carrier}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    shipments = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return ShipmentList(
        shipments=shipments,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific shipment by ID."""
    
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return shipment

@router.post("/", response_model=ShipmentResponse)
async def create_shipment(
    shipment_data: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new shipment."""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == shipment_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify invoice exists if provided
    if shipment_data.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == shipment_data.invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate shipment number and tracking number
    shipment_number = generate_shipment_number(db)
    tracking_number = generate_tracking_number()
    
    # Create shipment
    shipment = Shipment(
        shipment_number=shipment_number,
        tracking_number=tracking_number,
        customer_id=shipment_data.customer_id,
        invoice_id=shipment_data.invoice_id,
        status=shipment_data.status,
        priority=shipment_data.priority,
        ship_date=shipment_data.ship_date,
        expected_delivery_date=shipment_data.expected_delivery_date,
        actual_delivery_date=shipment_data.actual_delivery_date,
        shipping_method=shipment_data.shipping_method,
        carrier=shipment_data.carrier,
        service_type=shipment_data.service_type,
        shipping_address=shipment_data.shipping_address,
        billing_address=shipment_data.billing_address,
        package_count=shipment_data.package_count,
        total_weight=shipment_data.total_weight,
        dimensions=shipment_data.dimensions,
        shipping_cost=shipment_data.shipping_cost,
        insurance_cost=shipment_data.insurance_cost,
        special_instructions=shipment_data.special_instructions,
        notes=shipment_data.notes,
        created_by=current_user.id
    )
    
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    
    return shipment

@router.put("/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: int,
    shipment_data: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing shipment."""
    
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Update fields
    update_data = shipment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shipment, field, value)
    
    db.commit()
    db.refresh(shipment)
    
    return shipment

@router.delete("/{shipment_id}")
async def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a shipment."""
    
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    db.delete(shipment)
    db.commit()
    
    return {"message": "Shipment deleted successfully"}



@router.get("/summary/list", response_model=List[ShipmentSummary])
async def get_shipments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shipments summary."""
    
    shipments = db.query(Shipment).join(Customer).all()
    
    shipment_summaries = []
    for shipment in shipments:
        customer_name = shipment.customer.display_name
        shipment_summaries.append(
            ShipmentSummary(
                id=shipment.id,
                shipment_number=shipment.shipment_number,
                customer_name=customer_name,
                tracking_number=shipment.tracking_number,
                status=shipment.status,
                ship_date=shipment.ship_date,
                expected_delivery_date=shipment.expected_delivery_date,
                carrier=shipment.carrier
            )
        )
    
    return shipment_summaries

@router.post("/seed-sample-shipments")
async def seed_sample_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed sample shipments for testing."""
    
    # Get some existing customers and invoices
    customers = db.query(Customer).limit(3).all()
    invoices = db.query(Invoice).limit(3).all()
    
    if not customers:
        raise HTTPException(status_code=400, detail="No customers found. Create customers first.")
    
    sample_shipments = []
    
    carriers = ["Blue Dart", "DTDC", "FedEx", "DHL", "India Post"]
    statuses = ["pending", "shipped", "in_transit", "delivered"]
    
    for i, customer in enumerate(customers):
        shipment_number = generate_shipment_number(db)
        tracking_number = generate_tracking_number()
        
        ship_date = datetime.now() - timedelta(days=i+1)
        expected_delivery = ship_date + timedelta(days=3)
        
        shipment_data = {
            "shipment_number": shipment_number,
            "tracking_number": tracking_number,
            "customer_id": customer.id,
            "invoice_id": invoices[i].id if i < len(invoices) else None,
            "status": statuses[i % len(statuses)],
            "priority": "normal",
            "ship_date": ship_date,
            "expected_delivery_date": expected_delivery,
            "shipping_method": "courier",
            "carrier": carriers[i % len(carriers)],
            "service_type": "standard",
            "shipping_address": customer.billing_address or f"Sample address for {customer.display_name}",
            "package_count": i + 1,
            "total_weight": Decimal(2.5 * (i + 1)),
            "shipping_cost": Decimal(500 * (i + 1)),
            "created_by": current_user.id
        }
        
        shipment = Shipment(**shipment_data)
        db.add(shipment)
        sample_shipments.append(shipment_number)
    
    db.commit()
    
    return {
        "message": f"Successfully created {len(sample_shipments)} sample shipments",
        "created_shipments": sample_shipments
    } 