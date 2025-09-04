"""
BAI Backend Credit Service

This module contains business logic for credit management operations.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import HTTPException

from models.credit import CustomerCredit, CreditTransaction
from models.customer import Customer
from models.invoice import Invoice
from models.payment import Payment


class CreditService:
    """Service class for handling credit operations."""
    
    @staticmethod
    def get_available_customer_credits(
        db: Session, 
        customer_id: int, 
        minimum_amount: Optional[Decimal] = None
    ) -> List[CustomerCredit]:
        """Get all available credits for a customer."""
        query = db.query(CustomerCredit).filter(
            and_(
                CustomerCredit.customer_id == customer_id,
                CustomerCredit.status == "active",
                CustomerCredit.remaining_amount > 0
            )
        )
        
        if minimum_amount:
            query = query.filter(CustomerCredit.remaining_amount >= minimum_amount)
        
        return query.order_by(CustomerCredit.credit_date.asc()).all()
    
    @staticmethod
    def get_customer_credit_balance(db: Session, customer_id: int) -> Decimal:
        """Get total available credit balance for a customer."""
        credits = CreditService.get_available_customer_credits(db, customer_id)
        return sum(credit.remaining_amount for credit in credits)
    
    @staticmethod
    def use_credit_for_invoice(
        db: Session,
        customer_id: int,
        invoice_id: int,
        amount: Decimal,
        user_id: int,
        payment_reference: Optional[str] = None
    ) -> List[CreditTransaction]:
        """Use customer credits to pay for an invoice."""
        
        # Verify customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Verify invoice exists
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get available credits
        available_credits = CreditService.get_available_customer_credits(db, customer_id)
        
        if not available_credits:
            raise HTTPException(status_code=400, detail="No available credits for customer")
        
        total_available = sum(credit.remaining_amount for credit in available_credits)
        if total_available < amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient credit balance. Available: {total_available}, Required: {amount}"
            )
        
        # Use credits in FIFO order (oldest first)
        remaining_amount = amount
        transactions = []
        
        for credit in available_credits:
            if remaining_amount <= 0:
                break
            
            # Calculate how much to use from this credit
            usage_amount = min(remaining_amount, credit.remaining_amount)
            
            # Update credit balances
            credit.used_amount += usage_amount
            credit.remaining_amount -= usage_amount
            
            # Mark credit as used if fully depleted
            if credit.remaining_amount <= 0:
                credit.status = "used"
            
            # Create transaction record
            transaction = CreditTransaction(
                credit_id=credit.id,
                transaction_type="usage",
                transaction_date=datetime.now(),
                amount=usage_amount,
                running_balance=credit.remaining_amount,
                description=f"Credit used for invoice {invoice.invoice_number}",
                reference_number=payment_reference,
                invoice_id=invoice_id,
                performed_by=user_id
            )
            
            db.add(transaction)
            transactions.append(transaction)
            
            remaining_amount -= usage_amount
        
        db.commit()
        return transactions
    
    @staticmethod
    def add_credit_for_payment(
        db: Session,
        customer_id: int,
        amount: Decimal,
        user_id: int,
        payment_reference: Optional[str] = None,
        description: Optional[str] = None
    ) -> CustomerCredit:
        """Add credit when customer makes a payment."""
        
        # Verify customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Generate credit number
        last_credit = db.query(CustomerCredit).order_by(CustomerCredit.id.desc()).first()
        if last_credit:
            try:
                last_number = int(last_credit.credit_number.split('-')[-1])
                next_number = last_number + 1
            except:
                next_number = 1
        else:
            next_number = 1
        
        current_year = datetime.now().year
        credit_number = f"CR-{current_year}-{next_number:03d}"
        
        # Create credit
        credit = CustomerCredit(
            credit_number=credit_number,
            customer_id=customer_id,
            credit_date=datetime.now(),
            credit_type="payment",
            credit_reason="Customer payment received",
            original_amount=amount,
            remaining_amount=amount,
            used_amount=Decimal(0),
            status="active",
            description=description or f"Credit from payment - {payment_reference}",
            created_by=user_id
        )
        
        db.add(credit)
        db.flush()  # Get the credit ID
        
        # Create initial transaction
        transaction = CreditTransaction(
            credit_id=credit.id,
            transaction_type="created",
            transaction_date=datetime.now(),
            amount=amount,
            running_balance=amount,
            description="Credit created from customer payment",
            reference_number=payment_reference,
            performed_by=user_id
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(credit)
        
        return credit
    
    @staticmethod
    def adjust_credit_for_payment(
        db: Session,
        customer_id: int,
        payment_amount: Decimal,
        user_id: int,
        payment_id: Optional[int] = None,
        payment_reference: Optional[str] = None
    ) -> List[CreditTransaction]:
        """Adjust credit balances when customer makes a payment (subtract from used amount)."""
        
        # Get credits with used amounts that can be adjusted
        credits_with_usage = db.query(CustomerCredit).filter(
            and_(
                CustomerCredit.customer_id == customer_id,
                CustomerCredit.used_amount > 0
            )
        ).order_by(CustomerCredit.credit_date.desc()).all()  # Most recent first for payments
        
        if not credits_with_usage:
            # If no credits have been used, create a new credit
            return [CreditService.add_credit_for_payment(
                db, customer_id, payment_amount, user_id, payment_reference,
                "Credit from payment (no previous usage to adjust)"
            )]
        
        # Adjust used amounts (most recent usage first)
        remaining_payment = payment_amount
        transactions = []
        
        for credit in credits_with_usage:
            if remaining_payment <= 0:
                break
            
            # Calculate how much to restore to this credit
            restoration_amount = min(remaining_payment, credit.used_amount)
            
            # Update credit balances
            credit.used_amount -= restoration_amount
            credit.remaining_amount += restoration_amount
            
            # Reactivate credit if it was marked as used
            if credit.status == "used" and credit.remaining_amount > 0:
                credit.status = "active"
            
            # Create adjustment transaction
            transaction = CreditTransaction(
                credit_id=credit.id,
                transaction_type="adjustment",
                transaction_date=datetime.now(),
                amount=restoration_amount,
                running_balance=credit.remaining_amount,
                description=f"Credit restored from customer payment",
                reference_number=payment_reference,
                performed_by=user_id
            )
            
            db.add(transaction)
            transactions.append(transaction)
            
            remaining_payment -= restoration_amount
        
        # If there's still remaining payment amount, create a new credit
        if remaining_payment > 0:
            new_credit = CreditService.add_credit_for_payment(
                db, customer_id, remaining_payment, user_id, payment_reference,
                "Additional credit from payment"
            )
            # Get the initial transaction for this new credit
            new_transaction = db.query(CreditTransaction).filter(
                CreditTransaction.credit_id == new_credit.id
            ).first()
            if new_transaction:
                transactions.append(new_transaction)
        
        db.commit()
        return transactions


