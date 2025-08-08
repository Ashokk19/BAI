"""
BAI Backend Payment Service

This module contains the payment service for handling payment business logic.
"""

from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from models.payment import Payment, PaymentLog
from schemas.payment_schema import PaymentCreate, PaymentUpdate

class PaymentService:
    """Service class for payment operations."""
    
    def __init__(self):
        """Initialize payment service."""
        pass
    
    def validate_payment_data(self, payment_data: PaymentCreate) -> bool:
        """
        Validate payment data before creation.
        
        Args:
            payment_data: Payment creation data
            
        Returns:
            bool: True if valid, False otherwise
        """
        try:
            # Validate amount
            if payment_data.amount <= 0:
                return False
            
            # Validate payment type
            valid_types = ["invoice_payment", "vendor_payment", "refund"]
            if payment_data.payment_type not in valid_types:
                return False
            
            # Validate payment direction
            valid_directions = ["incoming", "outgoing"]
            if payment_data.payment_direction not in valid_directions:
                return False
            
            # Validate payment status
            valid_statuses = ["pending", "completed", "failed", "cancelled"]
            if payment_data.payment_status not in valid_statuses:
                return False
            
            # Validate payment method
            valid_methods = ["cash", "check", "bank_transfer", "credit_card", "debit_card", "upi", "net_banking"]
            if payment_data.payment_method not in valid_methods:
                return False
            
            return True
            
        except Exception:
            return False
    
    def can_update_payment(self, payment: Payment, new_status: str) -> bool:
        """
        Check if payment can be updated to new status.
        
        Args:
            payment: Payment object
            new_status: New status to set
            
        Returns:
            bool: True if update is allowed, False otherwise
        """
        # Cannot update completed payments to pending
        if payment.payment_status == "completed" and new_status == "pending":
            return False
        
        # Cannot update cancelled payments
        if payment.payment_status == "cancelled":
            return False
        
        return True
    
    def can_delete_payment(self, payment: Payment) -> bool:
        """
        Check if payment can be deleted.
        
        Args:
            payment: Payment object
            
        Returns:
            bool: True if deletion is allowed, False otherwise
        """
        # Cannot delete completed payments
        if payment.payment_status == "completed":
            return False
        
        return True
    
    def get_payment_summary(self, payment: Payment) -> dict:
        """
        Get payment summary information.
        
        Args:
            payment: Payment object
            
        Returns:
            dict: Payment summary
        """
        return {
            "id": payment.id,
            "payment_number": payment.payment_number,
            "customer_name": payment.customer.name if payment.customer else None,
            "vendor_name": payment.vendor.name if payment.vendor else None,
            "payment_date": payment.payment_date,
            "amount": payment.amount,
            "payment_method": payment.payment_method,
            "payment_status": payment.payment_status
        }
    
    def calculate_payment_statistics(self, db: Session, days: int = 30) -> dict:
        """
        Calculate payment statistics for the given period.
        
        Args:
            db: Database session
            days: Number of days to look back
            
        Returns:
            dict: Payment statistics
        """
        try:
            start_date = datetime.utcnow() - datetime.timedelta(days=days)
            
            # Total payments in period
            total_payments = db.query(Payment).filter(
                Payment.payment_date >= start_date
            ).count()
            
            # Total amount by direction
            incoming_total = db.query(db.func.sum(Payment.amount)).filter(
                Payment.payment_direction == "incoming",
                Payment.payment_date >= start_date
            ).scalar() or 0
            
            outgoing_total = db.query(db.func.sum(Payment.amount)).filter(
                Payment.payment_direction == "outgoing",
                Payment.payment_date >= start_date
            ).scalar() or 0
            
            # Payments by status
            status_counts = db.query(
                Payment.payment_status,
                db.func.count(Payment.id)
            ).filter(
                Payment.payment_date >= start_date
            ).group_by(Payment.payment_status).all()
            
            return {
                "period_days": days,
                "total_payments": total_payments,
                "total_incoming": float(incoming_total),
                "total_outgoing": float(outgoing_total),
                "net_amount": float(incoming_total - outgoing_total),
                "status_breakdown": dict(status_counts)
            }
            
        except Exception as e:
            raise Exception(f"Failed to calculate payment statistics: {str(e)}")
    
    def create_payment_log(self, db: Session, payment_id: int, action: str, 
                          old_status: Optional[str] = None, new_status: Optional[str] = None,
                          description: Optional[str] = None, changed_by: int = None) -> PaymentLog:
        """
        Create a payment log entry.
        
        Args:
            db: Database session
            payment_id: Payment ID
            action: Action performed
            old_status: Previous status
            new_status: New status
            description: Change description
            changed_by: User ID who made the change
            
        Returns:
            PaymentLog: Created payment log
        """
        try:
            payment_log = PaymentLog(
                payment_id=payment_id,
                action=action,
                old_status=old_status,
                new_status=new_status,
                description=description,
                changed_by=changed_by
            )
            
            db.add(payment_log)
            db.commit()
            db.refresh(payment_log)
            
            return payment_log
            
        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to create payment log: {str(e)}")
    
    def get_payment_by_number(self, db: Session, payment_number: str) -> Optional[Payment]:
        """
        Get payment by payment number.
        
        Args:
            db: Database session
            payment_number: Payment number
            
        Returns:
            Optional[Payment]: Payment object if found, None otherwise
        """
        return db.query(Payment).filter(Payment.payment_number == payment_number).first()
    
    def get_payments_by_customer(self, db: Session, customer_id: int, 
                                limit: int = 100) -> List[Payment]:
        """
        Get payments for a specific customer.
        
        Args:
            db: Database session
            customer_id: Customer ID
            limit: Maximum number of payments to return
            
        Returns:
            List[Payment]: List of payments
        """
        return db.query(Payment).filter(
            Payment.customer_id == customer_id
        ).order_by(Payment.payment_date.desc()).limit(limit).all()
    
    def get_payments_by_vendor(self, db: Session, vendor_id: int, 
                              limit: int = 100) -> List[Payment]:
        """
        Get payments for a specific vendor.
        
        Args:
            db: Database session
            vendor_id: Vendor ID
            limit: Maximum number of payments to return
            
        Returns:
            List[Payment]: List of payments
        """
        return db.query(Payment).filter(
            Payment.vendor_id == vendor_id
        ).order_by(Payment.payment_date.desc()).limit(limit).all() 