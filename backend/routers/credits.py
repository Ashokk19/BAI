"""
BAI Backend Credits Router

This module contains the credits routes for customer credit management.
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
from models.credit import CustomerCredit, CreditTransaction, CreditNote
from schemas.credit_schema import (
    CustomerCreditCreate,
    CustomerCreditUpdate,
    CustomerCreditResponse,
    CustomerCreditList,
    CustomerCreditSummary,
    CreditTransactionCreate,
    CreditNoteCreate,
    CreditNoteResponse
)
from services.credit_service import CreditService

router = APIRouter()

def generate_credit_number(db: Session, account_id: str) -> str:
    """Generate a new account-specific credit number."""
    last_credit = db.query(CustomerCredit).filter(CustomerCredit.account_id == account_id).order_by(CustomerCredit.id.desc()).first()
    if last_credit:
        try:
            last_number = int(last_credit.credit_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    # Account-specific format: CR-ACCOUNT-YYYY-NNN
    current_year = datetime.now().year
    return f"CR-{account_id}-{current_year}-{next_number:03d}"

def generate_credit_note_number(db: Session, account_id: str) -> str:
    """Generate a new account-specific credit note number."""
    last_note = db.query(CreditNote).filter(CreditNote.account_id == account_id).order_by(CreditNote.id.desc()).first()
    if last_note:
        try:
            last_number = int(last_note.credit_note_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    # Account-specific format: CN-ACCOUNT-YYYY-NNN
    current_year = datetime.now().year
    return f"CN-{account_id}-{current_year}-{next_number:03d}"

@router.get("/", response_model=CustomerCreditList)
async def get_customer_credits(
    skip: int = Query(0, ge=0, description="Number of credits to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of credits to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    credit_type: Optional[str] = Query(None, description="Filter by credit type"),
    sort_by: Optional[str] = Query("id", description="Sort by field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer credits list with pagination and filters."""
    
    query = db.query(CustomerCredit)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).filter(
            or_(
                CustomerCredit.credit_number.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term),
                CustomerCredit.credit_reason.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(CustomerCredit.status == status)
    
    # Apply customer filter
    if customer_id:
        query = query.filter(CustomerCredit.customer_id == customer_id)
    
    # Apply credit type filter
    if credit_type:
        query = query.filter(CustomerCredit.credit_type == credit_type)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    if sort_by == "id":
        if sort_order == "desc":
            query = query.order_by(CustomerCredit.id.desc())
        else:
            query = query.order_by(CustomerCredit.id.asc())
    elif sort_by == "created_at":
        if sort_order == "desc":
            query = query.order_by(CustomerCredit.created_at.desc())
        else:
            query = query.order_by(CustomerCredit.created_at.asc())
    elif sort_by == "credit_date":
        if sort_order == "desc":
            query = query.order_by(CustomerCredit.credit_date.desc())
        else:
            query = query.order_by(CustomerCredit.credit_date.asc())
    else:
        # Default to id desc
        query = query.order_by(CustomerCredit.id.desc())
    
    # Apply pagination
    credits = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return CustomerCreditList(
        credits=credits,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{credit_id}", response_model=CustomerCreditResponse)
async def get_customer_credit(
    credit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific customer credit by ID."""
    
    credit = db.query(CustomerCredit).filter(CustomerCredit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="Customer credit not found")
    
    return credit

@router.post("/", response_model=CustomerCreditResponse)
async def create_customer_credit(
    credit_data: CustomerCreditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer credit."""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == credit_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate credit number
    credit_number = generate_credit_number(db, current_user.account_id)
    
    # Create customer credit
    credit = CustomerCredit(
        credit_number=credit_number,
        customer_id=credit_data.customer_id,
        credit_date=credit_data.credit_date,
        credit_type=credit_data.credit_type,
        credit_reason=credit_data.credit_reason,
        original_amount=credit_data.original_amount,
        remaining_amount=credit_data.remaining_amount,
        expiry_date=credit_data.expiry_date,
        auto_expire=credit_data.auto_expire,
        minimum_order_amount=credit_data.minimum_order_amount,
        usage_limit_per_order=credit_data.usage_limit_per_order,
        description=credit_data.description,
        internal_notes=credit_data.internal_notes,
        customer_notes=credit_data.customer_notes,
        invoice_id=credit_data.invoice_id,
        sales_return_id=credit_data.sales_return_id,
        created_by=current_user.id
    )
    
    db.add(credit)
    db.flush()
    
    # Create initial transaction
    initial_transaction = CreditTransaction(
        credit_id=credit.id,
        transaction_type="created",
        transaction_date=credit_data.credit_date,
        amount=credit_data.original_amount,
        running_balance=credit_data.original_amount,
        description="Credit created",
        performed_by=current_user.id
    )
    
    db.add(initial_transaction)
    db.commit()
    db.refresh(credit)
    
    return credit

@router.put("/{credit_id}", response_model=CustomerCreditResponse)
async def update_customer_credit(
    credit_id: int,
    credit_data: CustomerCreditUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing customer credit."""
    
    credit = db.query(CustomerCredit).filter(CustomerCredit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="Customer credit not found")
    
    # Update fields
    update_data = credit_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(credit, field, value)
    
    db.commit()
    db.refresh(credit)
    
    return credit

@router.delete("/{credit_id}")
async def delete_customer_credit(
    credit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a customer credit."""
    
    credit = db.query(CustomerCredit).filter(CustomerCredit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="Customer credit not found")
    
    db.delete(credit)
    db.commit()
    
    return {"message": "Customer credit deleted successfully"}

@router.post("/{credit_id}/transactions")
async def create_credit_transaction(
    credit_id: int,
    transaction_data: CreditTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new credit transaction."""
    
    credit = db.query(CustomerCredit).filter(CustomerCredit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="Customer credit not found")
    
    # Calculate new balance
    if transaction_data.transaction_type == "usage":
        new_balance = credit.remaining_amount - transaction_data.amount
        if new_balance < 0:
            raise HTTPException(status_code=400, detail="Insufficient credit balance")
        credit.used_amount += transaction_data.amount
        credit.remaining_amount = new_balance
    elif transaction_data.transaction_type == "adjustment":
        new_balance = credit.remaining_amount + transaction_data.amount
        credit.remaining_amount = new_balance
    
    # Create transaction
    transaction = CreditTransaction(
        credit_id=credit_id,
        transaction_type=transaction_data.transaction_type,
        transaction_date=transaction_data.transaction_date,
        amount=transaction_data.amount,
        running_balance=new_balance,
        description=transaction_data.description,
        reference_number=transaction_data.reference_number,
        invoice_id=transaction_data.invoice_id,
        performed_by=current_user.id
    )
    
    db.add(transaction)
    
    # Update credit status if fully used
    if credit.remaining_amount <= 0:
        credit.status = "used"
    
    db.commit()
    db.refresh(transaction)
    
    return transaction

@router.get("/summary/list", response_model=List[CustomerCreditSummary])
async def get_customer_credits_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer credits summary."""
    
    credits = db.query(CustomerCredit).join(Customer).all()
    
    credit_summaries = []
    for credit in credits:
        customer_name = credit.customer.display_name
        credit_summaries.append(
            CustomerCreditSummary(
                id=credit.id,
                credit_number=credit.credit_number,
                customer_name=customer_name,
                credit_type=credit.credit_type,
                original_amount=credit.original_amount,
                remaining_amount=credit.remaining_amount,
                status=credit.status,
                expiry_date=credit.expiry_date
            )
        )
    
    return credit_summaries

@router.post("/credit-notes/", response_model=CreditNoteResponse)
async def create_credit_note(
    note_data: CreditNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new credit note."""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == note_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate credit note number
    note_number = generate_credit_note_number(db, current_user.account_id)
    
    # Create credit note
    credit_note = CreditNote(
        credit_note_number=note_number,
        customer_id=note_data.customer_id,
        credit_note_date=note_data.credit_note_date,
        credit_note_type=note_data.credit_note_type,
        reason=note_data.reason,
        subtotal=note_data.subtotal,
        tax_amount=note_data.tax_amount,
        total_amount=note_data.total_amount,
        description=note_data.description,
        notes=note_data.notes,
        terms_conditions=note_data.terms_conditions,
        invoice_id=note_data.invoice_id,
        sales_return_id=note_data.sales_return_id,
        customer_credit_id=note_data.customer_credit_id,
        created_by=current_user.id
    )
    
    db.add(credit_note)
    db.commit()
    db.refresh(credit_note)
    
    return credit_note

@router.post("/seed-sample-credits")
async def seed_sample_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed sample customer credits for testing."""
    
    # Get some existing customers
    customers = db.query(Customer).limit(5).all()
    if not customers:
        raise HTTPException(status_code=400, detail="No customers found. Create customers first.")
    
    sample_credits = []
    
    credit_types = ["return_credit", "adjustment", "promotional", "goodwill"]
    credit_reasons = [
        "Product return refund",
        "Billing adjustment",
        "Promotional offer",
        "Goodwill gesture",
        "Overpayment refund"
    ]
    
    for i, customer in enumerate(customers):
        # Check if credit already exists for this customer
        existing_credit = db.query(CustomerCredit).filter(CustomerCredit.customer_id == customer.id).first()
        if existing_credit:
            continue
            
        credit_number = generate_credit_number(db, current_user.account_id)
        
        expiry_date = datetime.now() + timedelta(days=180)  # 6 months expiry
        
        credit_data = {
            "credit_number": credit_number,
            "customer_id": customer.id,
            "credit_date": datetime.now(),
            "credit_type": credit_types[i % len(credit_types)],
            "credit_reason": credit_reasons[i % len(credit_reasons)],
            "original_amount": Decimal(1000 * (i + 1)),
            "used_amount": Decimal(0),
            "remaining_amount": Decimal(1000 * (i + 1)),
            "expiry_date": expiry_date,
            "auto_expire": True,
            "description": f"Sample credit for {customer.display_name}",
            "created_by": current_user.id
        }
        
        credit = CustomerCredit(**credit_data)
        db.add(credit)
        db.flush()
        
        # Create initial transaction
        transaction = CreditTransaction(
            credit_id=credit.id,
            transaction_type="created",
            transaction_date=datetime.now(),
            amount=credit.original_amount,
            running_balance=credit.original_amount,
            description="Credit created",
            performed_by=current_user.id
        )
        
        db.add(transaction)
        sample_credits.append(credit_number)
    
    db.commit()
    
    return {
        "message": f"Successfully created {len(sample_credits)} sample customer credits",
        "created_credits": sample_credits
    }

@router.get("/customers/{customer_id}/balance")
async def get_customer_credit_balance(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get total available credit balance for a customer."""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    balance = CreditService.get_customer_credit_balance(db, customer_id)
    available_credits = CreditService.get_available_customer_credits(db, customer_id)
    
    return {
        "customer_id": customer_id,
        "customer_name": customer.company_name or f"{customer.first_name} {customer.last_name}",
        "total_balance": balance,
        "available_credits_count": len(available_credits),
        "available_credits": [
            {
                "id": credit.id,
                "credit_number": credit.credit_number,
                "amount": credit.remaining_amount,
                "credit_type": credit.credit_type,
                "expiry_date": credit.expiry_date
            }
            for credit in available_credits
        ]
    }

@router.post("/customers/{customer_id}/use-credit")
async def use_customer_credit(
    customer_id: int,
    invoice_id: int,
    amount: Decimal,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Use customer credit to pay for an invoice."""
    
    try:
        transactions = CreditService.use_credit_for_invoice(
            db=db,
            customer_id=customer_id,
            invoice_id=invoice_id,
            amount=amount,
            user_id=current_user.id
        )
        
        return {
            "message": f"Successfully used {amount} in credits for invoice",
            "transactions_created": len(transactions),
            "transaction_ids": [t.id for t in transactions]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 