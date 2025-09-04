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

def generate_shipment_number(db: Session, account_id: str) -> str:
    """Generate a new shipment number."""
    last_shipment = db.query(Shipment).filter(Shipment.account_id == account_id).order_by(Shipment.id.desc()).first()
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

def generate_delivery_note_number(db: Session, account_id: str) -> str:
    """Generate a new delivery note number."""
    last_note = db.query(DeliveryNote).filter(DeliveryNote.account_id == account_id).order_by(DeliveryNote.id.desc()).first()
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
    """Generate a random tracking number."""
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
    
    query = db.query(DeliveryNote).filter(DeliveryNote.account_id == current_user.account_id)
    
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
    
    # Verify customer exists and belongs to the same account
    customer = db.query(Customer).filter(
        Customer.id == note_data.customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify shipment exists and belongs to the same account (if provided)
    shipment = None
    if note_data.shipment_id:
        shipment = db.query(Shipment).filter(
            Shipment.id == note_data.shipment_id,
            Shipment.account_id == current_user.account_id
        ).first()
        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Generate delivery note number
    delivery_note_number = generate_delivery_note_number(db, current_user.account_id)
    
    # Create delivery note
    delivery_note = DeliveryNote(
        account_id=current_user.account_id,
        delivery_note_number=delivery_note_number,
        shipment_id=note_data.shipment_id,
        invoice_id=note_data.invoice_id,
        customer_id=note_data.customer_id,
        delivery_date=note_data.delivery_date,
        delivery_time=note_data.delivery_time,
        delivery_status=note_data.delivery_status or "Pending",
        received_by=note_data.received_by,
        recipient_signature=note_data.recipient_signature,
        delivery_address=note_data.delivery_address,
        packages_delivered=note_data.packages_delivered or 1,
        condition_on_delivery=note_data.condition_on_delivery or "good",
        photo_proof=note_data.photo_proof,
        delivery_notes=note_data.delivery_notes,
        special_instructions=note_data.special_instructions,
        recorded_by=current_user.id
    )
    
    db.add(delivery_note)
    db.commit()
    db.refresh(delivery_note)
    
    return delivery_note

@router.put("/delivery-notes/{delivery_note_id}", response_model=DeliveryNoteResponse)
async def update_delivery_note(
    delivery_note_id: int,
    note_data: DeliveryNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a delivery note."""
    
    # Get the delivery note
    delivery_note = db.query(DeliveryNote).filter(
        DeliveryNote.id == delivery_note_id,
        DeliveryNote.account_id == current_user.account_id
    ).first()
    if not delivery_note:
        raise HTTPException(status_code=404, detail="Delivery note not found")
    
    # Update fields
    old_status = delivery_note.delivery_status
    for field, value in note_data.dict(exclude_unset=True).items():
        setattr(delivery_note, field, value)
    
    delivery_note.updated_at = func.now()
    
    db.commit()
    db.refresh(delivery_note)
    
    # Log status change if delivery_status was updated
    if old_status != delivery_note.delivery_status:
        print(f"Delivery note {delivery_note.delivery_note_number} status changed from {old_status} to {delivery_note.delivery_status}")
        # The frontend invoice history will automatically pick up this change when it refreshes
    
    return delivery_note

@router.delete("/delivery-notes/{delivery_note_id}")
async def delete_delivery_note(
    delivery_note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a delivery note."""
    
    # Get the delivery note
    delivery_note = db.query(DeliveryNote).filter(
        DeliveryNote.id == delivery_note_id,
        DeliveryNote.account_id == current_user.account_id
    ).first()
    if not delivery_note:
        raise HTTPException(status_code=404, detail="Delivery note not found")
    
    # Delete the delivery note
    db.delete(delivery_note)
    db.commit()
    
    return {"message": "Delivery note deleted successfully"}

@router.get("/delivery-notes/by-invoice/{invoice_id}", response_model=List[DeliveryNoteResponse])
async def get_delivery_notes_by_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get delivery notes for a specific invoice."""
    
    delivery_notes = db.query(DeliveryNote).filter(
        DeliveryNote.invoice_id == invoice_id,
        DeliveryNote.account_id == current_user.account_id
    ).all()
    
    return delivery_notes

@router.get("/by-invoice/{invoice_id}", response_model=List[ShipmentResponse])
async def get_shipments_by_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shipments for a specific invoice."""
    
    shipments = db.query(Shipment).filter(
        Shipment.invoice_id == invoice_id,
        Shipment.account_id == current_user.account_id
    ).all()
    
    return shipments

@router.post("/fix-unlinked-delivery-notes")
async def fix_unlinked_delivery_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fix unlinked delivery notes by linking them to existing shipments."""
    
    # Find all delivery notes that have invoice_id but no shipment_id
    unlinked_delivery_notes = db.query(DeliveryNote).filter(
        DeliveryNote.account_id == current_user.account_id,
        DeliveryNote.invoice_id.isnot(None),
        DeliveryNote.shipment_id.is_(None)
    ).all()
    
    fixed_count = 0
    for delivery_note in unlinked_delivery_notes:
        # Find shipment for this invoice
        shipment = db.query(Shipment).filter(
            Shipment.invoice_id == delivery_note.invoice_id,
            Shipment.account_id == current_user.account_id
        ).first()
        
        if shipment:
            delivery_note.shipment_id = shipment.id
            fixed_count += 1
            print(f"Fixed: Linked {delivery_note.delivery_note_number} to {shipment.shipment_number}")
    
    if fixed_count > 0:
        db.commit()
        return {"message": f"Fixed {fixed_count} unlinked delivery note(s)"}
    else:
        return {"message": "No unlinked delivery notes found"}

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
    
    query = db.query(Shipment).filter(Shipment.account_id == current_user.account_id)
    
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
    
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.account_id == current_user.account_id
    ).first()
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
    
    # Verify customer exists and belongs to the same account
    customer = db.query(Customer).filter(
        Customer.id == shipment_data.customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify invoice exists and belongs to the same account if provided
    if shipment_data.invoice_id:
        invoice = db.query(Invoice).filter(
            Invoice.id == shipment_data.invoice_id,
            Invoice.account_id == current_user.account_id
        ).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate shipment number
    shipment_number = generate_shipment_number(db, current_user.account_id)
    
    # Use provided tracking number or generate one if not provided
    tracking_number = shipment_data.tracking_number or generate_tracking_number()
    
    # Create shipment
    shipment = Shipment(
        account_id=current_user.account_id,
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
    
    # Auto-link existing delivery notes for this invoice
    if shipment.invoice_id:
        existing_delivery_notes = db.query(DeliveryNote).filter(
            DeliveryNote.invoice_id == shipment.invoice_id,
            DeliveryNote.account_id == current_user.account_id,
            DeliveryNote.shipment_id.is_(None)  # Only link unlinked delivery notes
        ).all()
        
        for delivery_note in existing_delivery_notes:
            delivery_note.shipment_id = shipment.id
            print(f"Auto-linked delivery note {delivery_note.delivery_note_number} to shipment {shipment.shipment_number}")
        
        if existing_delivery_notes:
            db.commit()
            print(f"Auto-linked {len(existing_delivery_notes)} delivery note(s) to shipment {shipment.shipment_number}")
    
    return shipment

@router.put("/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: int,
    shipment_data: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a shipment."""
    
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.account_id == current_user.account_id
    ).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Update fields
    update_data = shipment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shipment, field, value)
    
    db.commit()
    db.refresh(shipment)
    
    # Auto-link existing delivery notes for this invoice if invoice_id was updated
    if shipment.invoice_id and 'invoice_id' in update_data:
        existing_delivery_notes = db.query(DeliveryNote).filter(
            DeliveryNote.invoice_id == shipment.invoice_id,
            DeliveryNote.account_id == current_user.account_id,
            DeliveryNote.shipment_id.is_(None)  # Only link unlinked delivery notes
        ).all()
        
        for delivery_note in existing_delivery_notes:
            delivery_note.shipment_id = shipment.id
            print(f"Auto-linked delivery note {delivery_note.delivery_note_number} to shipment {shipment.shipment_number}")
        
        if existing_delivery_notes:
            db.commit()
            print(f"Auto-linked {len(existing_delivery_notes)} delivery note(s) to shipment {shipment.shipment_number}")
    
    return shipment

@router.delete("/{shipment_id}")
async def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a shipment."""
    
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.account_id == current_user.account_id
    ).first()
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
    """Get shipments summary list."""
    
    shipments = db.query(Shipment).join(Customer).filter(
        Shipment.account_id == current_user.account_id
    ).all()
    
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
    
    # Get some existing customers and invoices for this account
    customers = db.query(Customer).filter(
        Customer.account_id == current_user.account_id
    ).limit(3).all()
    invoices = db.query(Invoice).filter(
        Invoice.account_id == current_user.account_id
    ).limit(3).all()
    
    if not customers:
        raise HTTPException(status_code=400, detail="No customers found. Create customers first.")
    
    sample_shipments = []
    
    carriers = ["Blue Dart", "DTDC", "FedEx", "DHL", "India Post"]
    statuses = ["pending", "shipped", "in_transit", "delivered"]
    
    for i, customer in enumerate(customers):
        shipment_number = generate_shipment_number(db, current_user.account_id)
        tracking_number = generate_tracking_number()
        
        ship_date = datetime.now() - timedelta(days=i+1)
        expected_delivery = ship_date + timedelta(days=3)
        
        shipment_data = {
            "account_id": current_user.account_id,
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

@router.post("/create-delivery-notes-for-invoices")
async def create_delivery_notes_for_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create delivery note records for all invoices that don't have delivery notes.
    This is useful for existing invoices that were created before this feature was implemented.
    """
    try:
        from datetime import datetime
        import uuid
        
        # Get all invoices for this account
        invoices = db.query(Invoice).filter(Invoice.account_id == current_user.account_id).all()
        
        created_count = 0
        for invoice in invoices:
            # Check if there's already a delivery note for this invoice
            existing_delivery_note = db.query(DeliveryNote).filter(
                DeliveryNote.invoice_id == invoice.id,
                DeliveryNote.account_id == current_user.account_id
            ).first()
            
            if not existing_delivery_note:
                # Generate unique delivery note number
                delivery_note_number = f"DN-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
                
                # Create delivery note record
                delivery_note = DeliveryNote(
                    delivery_note_number=delivery_note_number,
                    customer_id=invoice.customer_id,
                    invoice_id=invoice.id,
                    delivery_date=invoice.invoice_date,
                    delivery_address=invoice.shipping_address or invoice.billing_address or "Address not specified",
                    delivery_status="Delivered",
                    delivery_notes=f"Automatically generated delivery note for invoice {invoice.invoice_number}",
                    recorded_by=current_user.id,
                    account_id=current_user.account_id
                )
                
                db.add(delivery_note)
                created_count += 1
        
        if created_count > 0:
            db.commit()
            return {"message": f"Created {created_count} delivery note records for existing invoices"}
        else:
            return {"message": "All invoices already have delivery note records"}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create delivery notes: {str(e)}") 

@router.post("/test-delivery-status-logic")
async def test_delivery_status_logic(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test endpoint to verify delivery status logic for invoices."""
    try:
        from models.invoice import Invoice
        
        # Get all invoices for this account
        invoices = db.query(Invoice).filter(Invoice.account_id == current_user.account_id).all()
        
        if not invoices:
            return {"message": "No invoices found to test", "invoices": []}
        
        test_results = []
        
        for invoice in invoices[:5]:  # Test first 5 invoices
            # Check delivery notes
            delivery_notes = db.query(DeliveryNote).filter(
                DeliveryNote.invoice_id == invoice.id,
                DeliveryNote.account_id == current_user.account_id
            ).all()
            
            # Check shipments
            shipments = db.query(Shipment).filter(
                Shipment.invoice_id == invoice.id,
                Shipment.account_id == current_user.account_id
            ).all()
            
            # Determine delivery status
            delivery_status = "Pending"
            if delivery_notes:
                # Get the most recent delivery note status
                latest_note = sorted(delivery_notes, key=lambda x: x.created_at, reverse=True)[0]
                delivery_status = latest_note.delivery_status or "Pending"
            elif shipments:
                # Map shipment status to delivery status
                latest_shipment = sorted(shipments, key=lambda x: x.created_at, reverse=True)[0]
                if latest_shipment.status.lower() == "delivered":
                    delivery_status = "Delivered"
                elif latest_shipment.status.lower() in ["in_transit", "shipped"]:
                    delivery_status = "In Transit"
                elif latest_shipment.status.lower() == "cancelled":
                    delivery_status = "Failed"
                else:
                    delivery_status = "Pending"
            
            test_results.append({
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "delivery_status": delivery_status,
                "delivery_notes_count": len(delivery_notes),
                "shipments_count": len(shipments),
                "delivery_notes": [
                    {
                        "id": note.id,
                        "delivery_note_number": note.delivery_note_number,
                        "delivery_status": note.delivery_status,
                        "created_at": note.created_at.isoformat()
                    } for note in delivery_notes
                ],
                "shipments": [
                    {
                        "id": shipment.id,
                        "shipment_number": shipment.shipment_number,
                        "status": shipment.status,
                        "created_at": shipment.created_at.isoformat()
                    } for shipment in shipments
                ]
            })
        
        return {
            "message": f"Tested delivery status logic for {len(test_results)} invoices",
            "test_results": test_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test delivery status logic: {str(e)}") 