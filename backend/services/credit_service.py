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
        account_id: str,
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
                account_id=account_id,
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
        account_id: str,
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
            account_id=account_id,
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
            account_id=account_id,
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
        account_id: str,
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
                account_id=account_id,
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

    @staticmethod
    def create_initial_credit_limit(
        db: Session,
        customer_id: int,
        credit_amount: Decimal,
        user_id: int,
        account_id: str
    ) -> CustomerCredit:
        """Create initial credit limit for a new customer."""
        
        # Verify customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Generate credit number
        existing_credits = db.query(CustomerCredit).filter(
            CustomerCredit.credit_number.like("CR-%")
        ).count()
        next_number = existing_credits + 1
        
        current_year = datetime.now().year
        credit_number = f"CR-{current_year}-{next_number:03d}"
        
        # Create credit
        credit = CustomerCredit(
            credit_number=credit_number,
            customer_id=customer_id,
            credit_date=datetime.now(),
            credit_type="initial_limit",
            credit_reason="Initial credit limit for new customer",
            original_amount=credit_amount,
            remaining_amount=credit_amount,
            used_amount=Decimal(0),
            status="active",
            description=f"Initial credit limit of {credit_amount} for customer {customer.company_name or customer.first_name + ' ' + customer.last_name}",
            account_id=account_id,
            created_by=user_id,
            auto_expire=False  # Initial credit limits don't expire
        )
        
        db.add(credit)
        
        # Create initial transaction record
        transaction = CreditTransaction(
            credit_id=credit.id,
            account_id=account_id,
            transaction_type="credit_issued",
            transaction_date=datetime.now(),
            amount=credit_amount,
            running_balance=credit_amount,
            description="Initial credit limit established",
            reference_number=credit_number,
            performed_by=user_id
        )
        
        # We'll add the transaction after credit is committed to get the credit.id
        db.flush()  # Flush to get the credit.id
        transaction.credit_id = credit.id
        db.add(transaction)
        
        return credit

    @staticmethod
    def update_customer_credit_limit(
        db: Session,
        customer_id: int,
        new_credit_limit: Decimal,
        user_id: int,
        account_id: str
    ) -> Optional[CustomerCredit]:
        """Update customer credit limit and sync with credit management."""
        
        # Get customer to verify existence
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Find existing initial credit limit record
        existing_credit = db.query(CustomerCredit).filter(
            CustomerCredit.customer_id == customer_id,
            CustomerCredit.credit_type == "initial_limit",
            CustomerCredit.account_id == account_id
        ).first()
        
        if new_credit_limit <= 0:
            # If new limit is 0 or negative, deactivate existing credit
            if existing_credit:
                existing_credit.status = "cancelled"
                existing_credit.remaining_amount = Decimal(0)
                
                # Create cancellation transaction
                transaction = CreditTransaction(
                    credit_id=existing_credit.id,
                    account_id=account_id,
                    transaction_type="cancelled",
                    transaction_date=datetime.now(),
                    amount=existing_credit.used_amount,
                    running_balance=Decimal(0),
                    description="Credit limit removed - customer limit set to 0",
                    performed_by=user_id
                )
                db.add(transaction)
            return existing_credit
        
        if existing_credit:
            # Update existing credit limit
            old_limit = existing_credit.original_amount
            difference = new_credit_limit - old_limit
            
            # Update credit amounts
            existing_credit.original_amount = new_credit_limit
            existing_credit.remaining_amount = existing_credit.remaining_amount + difference
            existing_credit.description = f"Updated credit limit from {old_limit} to {new_credit_limit} for customer {customer.company_name or customer.first_name + ' ' + customer.last_name}"
            
            # Create adjustment transaction
            transaction_type = "limit_increased" if difference > 0 else "limit_decreased"
            transaction = CreditTransaction(
                credit_id=existing_credit.id,
                account_id=account_id,
                transaction_type=transaction_type,
                transaction_date=datetime.now(),
                amount=abs(difference),
                running_balance=existing_credit.remaining_amount,
                description=f"Credit limit updated from ${old_limit} to ${new_credit_limit}",
                performed_by=user_id
            )
            db.add(transaction)
            
            return existing_credit
        else:
            # Create new initial credit if none exists
            return CreditService.create_initial_credit_limit(
                db=db,
                customer_id=customer_id,
                credit_amount=new_credit_limit,
                user_id=user_id,
                account_id=account_id
            )

    @staticmethod
    def process_credit_purchase(
        db: Session,
        customer_id: int,
        purchase_amount: Decimal,
        user_id: int,
        account_id: str,
        invoice_id: Optional[int] = None,
        reference_number: Optional[str] = None,
        notes: Optional[str] = None
    ) -> List[CreditTransaction]:
        """Process a credit purchase (customer buying on credit/loan)."""
        
        # Verify customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # If invoice_id is provided, verify it exists, otherwise proceed without invoice validation
        if invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if not invoice:
                raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get available credits for the customer
        available_credits = CreditService.get_available_customer_credits(db, customer_id)
        
        if not available_credits:
            raise HTTPException(status_code=400, detail="No available credits for customer")
        
        total_available = sum(credit.remaining_amount for credit in available_credits)
        if total_available < purchase_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient credit balance. Available: {total_available}, Required: {purchase_amount}"
            )
        
        # Use credits in FIFO order (oldest first)
        remaining_amount = purchase_amount
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
                account_id=account_id,
                transaction_type="usage",
                transaction_date=datetime.now(),
                amount=usage_amount,
                running_balance=credit.remaining_amount,
                description=f"Credit used for purchase {reference_number or 'Credit Purchase'}",
                reference_number=reference_number,
                invoice_id=invoice_id,
                performed_by=user_id
            )
            
            db.add(transaction)
            transactions.append(transaction)
            
            remaining_amount -= usage_amount
        
        return transactions

    @staticmethod
    def get_customer_available_credit_info(
        db: Session,
        customer_id: int,
        account_id: str
    ) -> dict:
        """Get detailed credit information for a customer."""
        
        # Get all active credits
        active_credits = db.query(CustomerCredit).filter(
            CustomerCredit.customer_id == customer_id,
            CustomerCredit.account_id == account_id,
            CustomerCredit.status == "active",
            CustomerCredit.remaining_amount > 0
        ).all()
        
        total_available = sum(credit.remaining_amount for credit in active_credits)
        
        return {
            "total_available_credit": total_available,
            "number_of_active_credits": len(active_credits),
            "credits": [
                {
                    "credit_number": credit.credit_number,
                    "credit_type": credit.credit_type,
                    "original_amount": credit.original_amount,
                    "remaining_amount": credit.remaining_amount,
                    "credit_date": credit.credit_date
                }
                for credit in active_credits
            ]
        }

    @staticmethod
    def process_payment_against_credit_invoice(
        db: Session,
        customer_id: int,
        payment_amount: Decimal,
        user_id: int,
        account_id: str,
        invoice_id: Optional[int] = None,
        reference_number: Optional[str] = None,
        notes: Optional[str] = None
    ) -> List[CreditTransaction]:
        """Process a real payment against a credit invoice - reduce used amount."""
        
        # Verify customer exists
        customer = db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.account_id == account_id
        ).first()
        
        if not customer:
            raise ValueError(f"Customer with ID {customer_id} not found")
        
        # Get all active credits for this customer
        active_credits = db.query(CustomerCredit).filter(
            CustomerCredit.customer_id == customer_id,
            CustomerCredit.account_id == account_id,
            CustomerCredit.status == "active"
        ).order_by(CustomerCredit.created_at.asc()).all()
        
        if not active_credits:
            raise ValueError(f"No active credits found for customer {customer_id}")
        
        # Check if there's enough used amount to reduce
        total_used_amount = sum(credit.used_amount for credit in active_credits)
        if total_used_amount < payment_amount:
            raise ValueError(f"Insufficient used credit amount. Available: {total_used_amount}, Required: {payment_amount}")
        
        transactions = []
        remaining_payment = payment_amount
        
        # Process credits in FIFO order (oldest first)
        for credit in active_credits:
            if remaining_payment <= 0:
                break
                
            if credit.used_amount <= 0:
                continue
            
            # Calculate how much to reduce from this credit
            reduction_amount = min(remaining_payment, credit.used_amount)
            
            # Update credit record
            credit.used_amount -= reduction_amount
            credit.remaining_amount = credit.original_amount - credit.used_amount
            
            # Update status to "complete" if used amount is 0 (fully paid back)
            if credit.used_amount <= 0:
                credit.status = "complete"
                credit.remaining_amount = 0  # When fully paid back, remaining should be 0
            
            # Create transaction record
            transaction = CreditTransaction(
                account_id=account_id,
                credit_id=credit.id,
                transaction_type="payment_received",
                transaction_date=datetime.now(),
                amount=reduction_amount,
                running_balance=credit.remaining_amount,
                description=f"Payment received against credit invoice - {reference_number or 'N/A'}",
                reference_number=reference_number,
                invoice_id=invoice_id,
                performed_by=user_id
            )
            
            db.add(transaction)
            transactions.append(transaction)
            
            remaining_payment -= reduction_amount
        
        return transactions



