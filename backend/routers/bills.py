"""
BAI Backend Bills Router

This module contains the bills routes for bill management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil
from datetime import datetime
import uuid

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.purchase import PurchaseOrder
from models.vendor import Vendor
from schemas.purchase_schema import (
    BillCreate,
    BillUpdate,
    BillResponse,
    BillList
)

router = APIRouter()

@router.get("/", response_model=BillList)
async def get_bills(
    skip: int = Query(0, ge=0, description="Number of bills to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of bills to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    purchase_order_id: Optional[int] = Query(None, description="Filter by purchase order ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bills list with pagination and filters."""
    
    query = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_(["confirmed", "partial_received", "received"]))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                PurchaseOrder.po_number.ilike(search_term),
                PurchaseOrder.notes.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(PurchaseOrder.status == status)
    
    # Apply vendor filter
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    
    # Apply purchase order filter
    if purchase_order_id:
        query = query.filter(PurchaseOrder.id == purchase_order_id)
    
    # Apply date filters
    if start_date:
        query = query.filter(PurchaseOrder.po_date >= start_date)
    if end_date:
        query = query.filter(PurchaseOrder.po_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    bills = query.order_by(PurchaseOrder.po_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to bill format
    bill_responses = []
    for po in bills:
        # Calculate paid amount (this would come from payments table in real implementation)
        paid_amount = 0  # TODO: Calculate from payments table
        
        bill_response = BillResponse(
            id=po.id,
            bill_number=po.po_number,
            bill_date=po.po_date,
            due_date=po.po_date,  # TODO: Calculate based on payment terms
            vendor_id=po.vendor_id,
            purchase_order_id=po.id,
            status=po.status,
            subtotal=po.subtotal,
            tax_amount=po.tax_amount,
            discount_amount=po.discount_amount,
            total_amount=po.total_amount,
            paid_amount=paid_amount,
            currency=po.currency,
            payment_terms=po.payment_terms,
            notes=po.notes,
            reference_number=po.po_number,
            created_by=po.created_by,
            created_at=po.created_at,
            updated_at=po.updated_at
        )
        bill_responses.append(bill_response)
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return BillList(
        bills=bill_responses,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific bill by ID."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == bill_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Calculate paid amount (this would come from payments table in real implementation)
    paid_amount = 0  # TODO: Calculate from payments table
    
    return BillResponse(
        id=purchase_order.id,
        bill_number=purchase_order.po_number,
        bill_date=purchase_order.po_date,
        due_date=purchase_order.po_date,  # TODO: Calculate based on payment terms
        vendor_id=purchase_order.vendor_id,
        purchase_order_id=purchase_order.id,
        status=purchase_order.status,
        subtotal=purchase_order.subtotal,
        tax_amount=purchase_order.tax_amount,
        discount_amount=purchase_order.discount_amount,
        total_amount=purchase_order.total_amount,
        paid_amount=paid_amount,
        currency=purchase_order.currency,
        payment_terms=purchase_order.payment_terms,
        notes=purchase_order.notes,
        reference_number=purchase_order.po_number,
        created_by=purchase_order.created_by,
        created_at=purchase_order.created_at,
        updated_at=purchase_order.updated_at
    )

@router.post("/", response_model=BillResponse)
async def create_bill(
    bill_data: BillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bill from purchase order."""
    
    # Validate vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == bill_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate purchase order exists if provided
    if bill_data.purchase_order_id:
        purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == bill_data.purchase_order_id).first()
        if not purchase_order:
            raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Generate bill number if not provided
    if not bill_data.bill_number:
        bill_data.bill_number = f"BILL-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    # For now, we'll create a bill based on a purchase order
    # In a real implementation, you might have a separate Bill model
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == bill_data.purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Update purchase order status to confirmed
    purchase_order.status = "confirmed"
    
    db.commit()
    db.refresh(purchase_order)
    
    # Return bill response
    return BillResponse(
        id=purchase_order.id,
        bill_number=bill_data.bill_number,
        bill_date=bill_data.bill_date,
        due_date=bill_data.due_date,
        vendor_id=purchase_order.vendor_id,
        purchase_order_id=purchase_order.id,
        status="pending",
        subtotal=purchase_order.subtotal,
        tax_amount=purchase_order.tax_amount,
        discount_amount=purchase_order.discount_amount,
        total_amount=purchase_order.total_amount,
        paid_amount=0,
        currency=purchase_order.currency,
        payment_terms=purchase_order.payment_terms,
        notes=bill_data.notes,
        reference_number=bill_data.reference_number,
        created_by=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: int,
    bill_data: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a bill."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == bill_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Update fields
    update_data = bill_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(purchase_order, field):
            setattr(purchase_order, field, value)
    
    db.commit()
    db.refresh(purchase_order)
    
    # Return updated bill response
    return BillResponse(
        id=purchase_order.id,
        bill_number=purchase_order.po_number,
        bill_date=purchase_order.po_date,
        due_date=purchase_order.po_date,  # TODO: Calculate based on payment terms
        vendor_id=purchase_order.vendor_id,
        purchase_order_id=purchase_order.id,
        status=purchase_order.status,
        subtotal=purchase_order.subtotal,
        tax_amount=purchase_order.tax_amount,
        discount_amount=purchase_order.discount_amount,
        total_amount=purchase_order.total_amount,
        paid_amount=0,  # TODO: Calculate from payments table
        currency=purchase_order.currency,
        payment_terms=purchase_order.payment_terms,
        notes=purchase_order.notes,
        reference_number=purchase_order.po_number,
        created_by=purchase_order.created_by,
        created_at=purchase_order.created_at,
        updated_at=purchase_order.updated_at
    )

@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a bill."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == bill_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Check if bill can be deleted
    if purchase_order.status in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot delete bill in received or cancelled status")
    
    # Reset purchase order status
    purchase_order.status = "draft"
    
    db.commit()
    
    return {"message": "Bill deleted successfully"}

@router.get("/summary/stats")
async def get_bills_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bills summary statistics."""
    
    # Get total bills
    total_bills = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_(["confirmed", "partial_received", "received"])
    ).count()
    
    # Get pending bills
    pending_bills = db.query(PurchaseOrder).filter(
        PurchaseOrder.status == "confirmed"
    ).count()
    
    # Get total amount
    total_amount = db.query(func.sum(PurchaseOrder.total_amount)).filter(
        PurchaseOrder.status.in_(["confirmed", "partial_received", "received"])
    ).scalar() or 0
    
    # Get paid amount (this would come from payments table in real implementation)
    paid_amount = 0  # TODO: Calculate from payments table
    
    return {
        "total_bills": total_bills,
        "pending_bills": pending_bills,
        "total_amount": float(total_amount),
        "paid_amount": paid_amount,
        "outstanding_amount": float(total_amount - paid_amount)
    } 