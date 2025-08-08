"""
BAI Backend Payments Router

This module contains the payment management routes for handling payment operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from database.database import get_db
from models.payment import Payment, PaymentLog
from models.user import User
from schemas.payment_schema import (
    PaymentCreate, PaymentUpdate, PaymentResponse, PaymentList,
    PaymentLogCreate, PaymentLogResponse, PaymentSummary
)
from routers.auth import get_current_user
from services.payment_service import PaymentService

router = APIRouter()
payment_service = PaymentService()

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new payment record.
    
    Args:
        payment: Payment creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        PaymentResponse: Created payment details
    """
    try:
        # Generate unique payment number
        payment_number = f"PAY-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Create payment record
        db_payment = Payment(
            payment_number=payment_number,
            payment_date=payment.payment_date,
            payment_type=payment.payment_type,
            payment_direction=payment.payment_direction,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            payment_status=payment.payment_status,
            reference_number=payment.reference_number,
            bank_account=payment.bank_account,
            check_number=payment.check_number,
            transaction_id=payment.transaction_id,
            notes=payment.notes,
            invoice_id=payment.invoice_id,
            customer_id=payment.customer_id,
            vendor_id=payment.vendor_id,
            recorded_by=current_user.id
        )
        
        db.add(db_payment)
        db.commit()
        db.refresh(db_payment)
        
        # Create payment log
        payment_log = PaymentLog(
            payment_id=db_payment.id,
            action="created",
            new_status=payment.payment_status,
            description="Payment created",
            changed_by=current_user.id
        )
        db.add(payment_log)
        db.commit()
        
        return db_payment
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")

@router.get("/", response_model=PaymentList)
async def get_payments(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type"),
    payment_direction: Optional[str] = Query(None, description="Filter by payment direction"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of payments with optional filters.
    
    Args:
        skip: Number of records to skip for pagination
        limit: Number of records to return
        payment_status: Filter by payment status
        payment_type: Filter by payment type
        payment_direction: Filter by payment direction
        customer_id: Filter by customer ID
        vendor_id: Filter by vendor ID
        start_date: Filter by start date
        end_date: Filter by end date
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        PaymentList: Paginated list of payments
    """
    try:
        query = db.query(Payment)
        
        # Apply filters
        if payment_status:
            query = query.filter(Payment.payment_status == payment_status)
        if payment_type:
            query = query.filter(Payment.payment_type == payment_type)
        if payment_direction:
            query = query.filter(Payment.payment_direction == payment_direction)
        if customer_id:
            query = query.filter(Payment.customer_id == customer_id)
        if vendor_id:
            query = query.filter(Payment.vendor_id == vendor_id)
        if start_date:
            query = query.filter(Payment.payment_date >= start_date)
        if end_date:
            query = query.filter(Payment.payment_date <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
        
        total_pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1
        
        return PaymentList(
            payments=payments,
            total=total,
            page=current_page,
            per_page=limit,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payments: {str(e)}")

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific payment by ID.
    
    Args:
        payment_id: Payment ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        PaymentResponse: Payment details
    """
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return payment
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment: {str(e)}")

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a payment record.
    
    Args:
        payment_id: Payment ID
        payment_update: Payment update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        PaymentResponse: Updated payment details
    """
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Store old status for logging
        old_status = payment.payment_status
        
        # Update payment fields
        update_data = payment_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(payment, field, value)
        
        payment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(payment)
        
        # Create payment log if status changed
        if old_status != payment.payment_status:
            payment_log = PaymentLog(
                payment_id=payment.id,
                action="status_updated",
                old_status=old_status,
                new_status=payment.payment_status,
                description=f"Payment status updated from {old_status} to {payment.payment_status}",
                changed_by=current_user.id
            )
            db.add(payment_log)
            db.commit()
        
        return payment
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment: {str(e)}")

@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a payment record.
    
    Args:
        payment_id: Payment ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        dict: Success message
    """
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Check if payment can be deleted (not completed)
        if payment.payment_status == "completed":
            raise HTTPException(status_code=400, detail="Cannot delete completed payment")
        
        # Delete payment logs first
        db.query(PaymentLog).filter(PaymentLog.payment_id == payment_id).delete()
        
        # Delete payment
        db.delete(payment)
        db.commit()
        
        return {"message": "Payment deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete payment: {str(e)}")

@router.get("/{payment_id}/logs", response_model=List[PaymentLogResponse])
async def get_payment_logs(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment history logs for a specific payment.
    
    Args:
        payment_id: Payment ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List[PaymentLogResponse]: List of payment logs
    """
    try:
        # Verify payment exists
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Get payment logs
        logs = db.query(PaymentLog).filter(PaymentLog.payment_id == payment_id).order_by(PaymentLog.created_at.desc()).all()
        
        return logs
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment logs: {str(e)}")

@router.post("/{payment_id}/status")
async def update_payment_status(
    payment_id: int,
    status: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update payment status with logging.
    
    Args:
        payment_id: Payment ID
        status: New payment status
        notes: Optional notes for the status change
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        PaymentResponse: Updated payment details
    """
    try:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        old_status = payment.payment_status
        payment.payment_status = status
        payment.updated_at = datetime.utcnow()
        
        # Create payment log
        payment_log = PaymentLog(
            payment_id=payment.id,
            action="status_updated",
            old_status=old_status,
            new_status=status,
            description=notes or f"Payment status updated from {old_status} to {status}",
            changed_by=current_user.id
        )
        
        db.add(payment_log)
        db.commit()
        db.refresh(payment)
        
        return payment
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment status: {str(e)}")

@router.get("/summary/recent", response_model=List[PaymentSummary])
async def get_recent_payments_summary(
    days: int = Query(7, ge=1, le=365, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary of recent payments.
    
    Args:
        days: Number of days to look back
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List[PaymentSummary]: List of recent payment summaries
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        payments = db.query(Payment).filter(
            Payment.payment_date >= start_date
        ).order_by(Payment.payment_date.desc()).limit(50).all()
        
        return payments
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment summary: {str(e)}")

@router.post("/seed-sample-payments")
async def seed_sample_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Seed sample payment data for testing.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        dict: Seeding results
    """
    try:
        # Sample payment data
        sample_payments = [
            {
                "payment_date": datetime.utcnow() - timedelta(days=1),
                "payment_type": "invoice_payment",
                "payment_direction": "incoming",
                "amount": 1500.00,
                "currency": "INR",
                "payment_method": "bank_transfer",
                "payment_status": "completed",
                "reference_number": "TXN123456",
                "notes": "Sample payment 1",
                "customer_id": 1
            },
            {
                "payment_date": datetime.utcnow() - timedelta(days=2),
                "payment_type": "vendor_payment",
                "payment_direction": "outgoing",
                "amount": 2500.00,
                "currency": "INR",
                "payment_method": "check",
                "payment_status": "pending",
                "check_number": "CHK789012",
                "notes": "Sample vendor payment",
                "vendor_id": 1
            },
            {
                "payment_date": datetime.utcnow() - timedelta(days=3),
                "payment_type": "invoice_payment",
                "payment_direction": "incoming",
                "amount": 3200.00,
                "currency": "INR",
                "payment_method": "cash",
                "payment_status": "completed",
                "notes": "Sample cash payment",
                "customer_id": 2
            }
        ]
        
        created_payments = []
        
        for payment_data in sample_payments:
            payment_number = f"PAY-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            
            payment = Payment(
                payment_number=payment_number,
                recorded_by=current_user.id,
                **payment_data
            )
            
            db.add(payment)
            db.flush()  # Get the ID
            
            # Create payment log
            payment_log = PaymentLog(
                payment_id=payment.id,
                action="created",
                new_status=payment_data["payment_status"],
                description="Sample payment created",
                changed_by=current_user.id
            )
            db.add(payment_log)
            
            created_payments.append(payment)
        
        db.commit()
        
        return {
            "message": "Sample payments seeded successfully",
            "created_payments": [{"id": p.id, "payment_number": p.payment_number} for p in created_payments]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed sample payments: {str(e)}")

@router.get("/stats/overview")
async def get_payment_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment statistics overview.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        dict: Payment statistics
    """
    try:
        # Total payments
        total_payments = db.query(Payment).count()
        
        # Payments by status
        status_counts = db.query(Payment.payment_status, db.func.count(Payment.id)).group_by(Payment.payment_status).all()
        
        # Total amount by direction
        incoming_total = db.query(db.func.sum(Payment.amount)).filter(Payment.payment_direction == "incoming").scalar() or 0
        outgoing_total = db.query(db.func.sum(Payment.amount)).filter(Payment.payment_direction == "outgoing").scalar() or 0
        
        # Recent payments (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_payments = db.query(Payment).filter(Payment.payment_date >= thirty_days_ago).count()
        
        return {
            "total_payments": total_payments,
            "status_breakdown": dict(status_counts),
            "total_incoming": float(incoming_total),
            "total_outgoing": float(outgoing_total),
            "net_amount": float(incoming_total - outgoing_total),
            "recent_payments_30_days": recent_payments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment stats: {str(e)}") 