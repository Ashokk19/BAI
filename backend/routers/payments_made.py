"""
BAI Backend Payments Made Router

This module contains the payments made routes for tracking payments to vendors.
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
from models.payment import Payment
from models.vendor import Vendor
from models.purchase import PurchaseOrder
from schemas.purchase_schema import (
    PurchasePaymentCreate,
    PurchasePaymentUpdate,
    PurchasePaymentResponse,
    PurchasePaymentList
)

router = APIRouter()

@router.get("/", response_model=PurchasePaymentList)
async def get_payments_made(
    skip: int = Query(0, ge=0, description="Number of payments to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of payments to return"),
    search: Optional[str] = Query(None, description="Search term"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    bill_id: Optional[int] = Query(None, description="Filter by bill ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments made list with pagination and filters."""
    
    # Query payments made to vendors (vendor_id is not null)
    query = db.query(Payment).filter(Payment.vendor_id.isnot(None))
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Payment.payment_number.ilike(search_term),
                Payment.reference_number.ilike(search_term),
                Payment.transaction_id.ilike(search_term),
                Payment.notes.ilike(search_term)
            )
        )
    
    # Apply payment status filter
    if payment_status:
        query = query.filter(Payment.payment_status == payment_status)
    
    # Apply payment method filter
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    
    # Apply vendor filter
    if vendor_id:
        query = query.filter(Payment.vendor_id == vendor_id)
    
    # Apply bill filter
    if bill_id:
        query = query.filter(Payment.invoice_id == bill_id)  # Using invoice_id for bill_id
    
    # Apply date filters
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return PurchasePaymentList(
        payments=payments,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{payment_id}", response_model=PurchasePaymentResponse)
async def get_payment_made(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific payment made by ID."""
    
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id.isnot(None)
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment made not found")
    
    return payment

@router.post("/", response_model=PurchasePaymentResponse)
async def create_payment_made(
    payment_data: PurchasePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new payment made to vendor."""
    
    # Validate vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == payment_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate bill exists if provided
    if payment_data.bill_id:
        purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == payment_data.bill_id).first()
        if not purchase_order:
            raise HTTPException(status_code=404, detail="Bill not found")
    
    # Validate payment amount
    if payment_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")
    
    # Generate payment number if not provided
    if not payment_data.payment_number:
        payment_data.payment_number = f"PAY-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment = Payment(
        payment_number=payment_data.payment_number,
        payment_date=payment_data.payment_date,
        vendor_id=payment_data.vendor_id,
        invoice_id=payment_data.bill_id,  # Using invoice_id for bill_id
        payment_method=payment_data.payment_method,
        payment_status=payment_data.payment_status,
        amount=payment_data.amount,
        currency=payment_data.currency,
        reference_number=payment_data.reference_number,
        transaction_id=payment_data.transaction_id,
        notes=payment_data.notes,
        payment_direction="outgoing",  # Payments made are outgoing
        payment_type="vendor_payment",
        created_by=current_user.id
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment

@router.put("/{payment_id}", response_model=PurchasePaymentResponse)
async def update_payment_made(
    payment_id: int,
    payment_data: PurchasePaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a payment made."""
    
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id.isnot(None)
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment made not found")
    
    # Check if payment can be updated
    if payment.payment_status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot update payment in completed or cancelled status")
    
    # Update fields
    update_data = payment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(payment, field):
            setattr(payment, field, value)
    
    db.commit()
    db.refresh(payment)
    
    return payment

@router.delete("/{payment_id}")
async def delete_payment_made(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a payment made."""
    
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id.isnot(None)
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment made not found")
    
    # Check if payment can be deleted
    if payment.payment_status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot delete payment in completed or cancelled status")
    
    db.delete(payment)
    db.commit()
    
    return {"message": "Payment made deleted successfully"}

@router.get("/summary/stats")
async def get_payments_made_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payments made summary statistics."""
    
    # Get total payments made
    total_payments = db.query(Payment).filter(Payment.vendor_id.isnot(None)).count()
    
    # Get payments by status
    pending_payments = db.query(Payment).filter(
        Payment.vendor_id.isnot(None),
        Payment.payment_status == "pending"
    ).count()
    
    completed_payments = db.query(Payment).filter(
        Payment.vendor_id.isnot(None),
        Payment.payment_status == "completed"
    ).count()
    
    failed_payments = db.query(Payment).filter(
        Payment.vendor_id.isnot(None),
        Payment.payment_status == "failed"
    ).count()
    
    # Get total amounts
    total_amount = db.query(func.sum(Payment.amount)).filter(
        Payment.vendor_id.isnot(None),
        Payment.payment_status == "completed"
    ).scalar() or 0
    
    # Get payments by method
    payment_methods = db.query(
        Payment.payment_method,
        func.count(Payment.id).label("count"),
        func.sum(Payment.amount).label("total")
    ).filter(
        Payment.vendor_id.isnot(None),
        Payment.payment_status == "completed"
    ).group_by(Payment.payment_method).all()
    
    method_breakdown = {}
    for method in payment_methods:
        method_breakdown[method.payment_method] = {
            "count": method.count,
            "total": float(method.total) if method.total else 0
        }
    
    return {
        "total_payments": total_payments,
        "pending_payments": pending_payments,
        "completed_payments": completed_payments,
        "failed_payments": failed_payments,
        "total_amount": float(total_amount),
        "payment_methods": method_breakdown
    } 