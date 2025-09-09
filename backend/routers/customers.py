"""
BAI Backend Customer Router

This module contains the customer routes for customer management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.customer import Customer
from services.credit_service import CreditService
from schemas.customer_schema import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerList,
    CustomerSummary
)

router = APIRouter()

@router.get("/", response_model=CustomerList)
async def get_customers(
    skip: int = Query(0, ge=0, description="Number of customers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of customers to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    state: Optional[str] = Query(None, description="Filter by state"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customers list with pagination and filters."""
    
    # Filter by account_id from current user
    query = db.query(Customer).filter(Customer.account_id == current_user.account_id)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.customer_code.ilike(search_term),
                Customer.phone.ilike(search_term),
                Customer.gst_number.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        if status == "active":
            query = query.filter(Customer.is_active == True)
        elif status == "inactive":
            query = query.filter(Customer.is_active == False)
    
    # Apply state filter
    if state:
        query = query.filter(Customer.state.ilike(f"%{state}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    customers = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return CustomerList(
        customers=customers,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific customer by ID."""
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer."""
    
    # Check if customer code already exists for this account
    existing_customer = db.query(Customer).filter(
        Customer.customer_code == customer_data.customer_code,
        Customer.account_id == current_user.account_id
    ).first()
    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer code already exists"
        )
    
    # Check if email already exists for this account
    existing_email = db.query(Customer).filter(
        Customer.email == customer_data.email,
        Customer.account_id == current_user.account_id
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )
    
    # Create new customer with account_id
    customer_data_dict = customer_data.model_dump()
    customer_data_dict['account_id'] = current_user.account_id
    customer = Customer(**customer_data_dict)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    # Create initial credit record if credit_limit > 0
    if customer.credit_limit and customer.credit_limit > 0:
        try:
            CreditService.create_initial_credit_limit(
                db=db,
                customer_id=customer.id,
                credit_amount=customer.credit_limit,
                user_id=current_user.id,
                account_id=current_user.account_id
            )
            db.commit()
        except Exception as e:
            # Log the error but don't fail customer creation
            print(f"Warning: Failed to create initial credit for customer {customer.id}: {str(e)}")
    
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing customer."""
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer code already exists (if being updated)
    if customer_data.customer_code and customer_data.customer_code != customer.customer_code:
        existing_customer = db.query(Customer).filter(
            Customer.customer_code == customer_data.customer_code,
            Customer.account_id == current_user.account_id
        ).first()
        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Customer code already exists"
            )
    
    # Check if email already exists (if being updated)
    if customer_data.email and customer_data.email != customer.email:
        existing_email = db.query(Customer).filter(
            Customer.email == customer_data.email,
            Customer.account_id == current_user.account_id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )
    
    # Store old credit limit for comparison
    old_credit_limit = customer.credit_limit
    
    # Update customer fields
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    # Sync credit limit changes with credit management
    if customer_data.credit_limit is not None and customer_data.credit_limit != old_credit_limit:
        try:
            CreditService.update_customer_credit_limit(
                db=db,
                customer_id=customer.id,
                new_credit_limit=customer.credit_limit,
                user_id=current_user.id,
                account_id=current_user.account_id
            )
            db.commit()
        except Exception as e:
            # Log the error but don't fail customer update
            print(f"Warning: Failed to sync credit limit for customer {customer.id}: {str(e)}")
    
    return customer

@router.get("/{customer_id}/credit-info")
async def get_customer_credit_info(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer's available credit information."""
    
    # Verify customer exists and belongs to current account
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get credit information
    credit_info = CreditService.get_customer_available_credit_info(
        db=db,
        customer_id=customer_id,
        account_id=current_user.account_id
    )
    
    return {
        "customer_id": customer_id,
        "customer_name": customer.company_name or f"{customer.first_name} {customer.last_name}",
        "credit_limit": customer.credit_limit,
        **credit_info
    }

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a customer."""
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(customer)
    db.commit()
    
    return {"message": "Customer deleted successfully"}

@router.patch("/{customer_id}/toggle-status")
async def toggle_customer_status(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle customer active status."""
    
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.account_id == current_user.account_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.is_active = not customer.is_active
    db.commit()
    db.refresh(customer)
    
    return customer

@router.get("/summary/list", response_model=List[CustomerSummary])
async def get_customers_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customers summary for dropdowns and quick selection."""
    
    customers = db.query(Customer).filter(
        Customer.is_active == True,
        Customer.account_id == current_user.account_id
    ).all()
    
    customer_summaries = []
    for customer in customers:
        display_name = customer.display_name
        customer_summaries.append(
            CustomerSummary(
                id=customer.id,
                customer_code=customer.customer_code,
                display_name=display_name,
                email=customer.email,
                phone=customer.phone,
                city=customer.city,
                state=customer.state,
                gst_number=customer.gst_number,
                is_active=customer.is_active
            )
        )
    
    return customer_summaries

@router.get("/summary", response_model=dict)
async def get_customers_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customers summary statistics."""
    
    total_customers = db.query(Customer).filter(
        Customer.account_id == current_user.account_id
    ).count()
    
    active_customers = db.query(Customer).filter(
        Customer.is_active == True,
        Customer.account_id == current_user.account_id
    ).count()
    
    business_customers = db.query(Customer).filter(
        Customer.customer_type == "business",
        Customer.account_id == current_user.account_id
    ).count()
    
    individual_customers = db.query(Customer).filter(
        Customer.customer_type == "individual",
        Customer.account_id == current_user.account_id
    ).count()
    
    verified_customers = db.query(Customer).filter(
        Customer.is_verified == True,
        Customer.account_id == current_user.account_id
    ).count()
    
    return {
        "total": total_customers,
        "active": active_customers,
        "business": business_customers,
        "individual": individual_customers,
        "verified": verified_customers
    }

@router.get("/tamil-nadu/list", response_model=List[CustomerResponse])
async def get_tamil_nadu_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customers from Tamil Nadu."""
    
    customers = db.query(Customer).filter(
        Customer.state.ilike("%Tamil Nadu%"),
        Customer.account_id == current_user.account_id
    ).all()
    
    return customers

@router.post("/seed-tamil-nadu-customers")
async def seed_tamil_nadu_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed 10 sample customers from Tamil Nadu."""
    
    tamil_nadu_customers = [
        {
            "customer_code": "TN001",
            "company_name": "Chennai Electronics Pvt Ltd",
            "contact_person": "Rajesh Kumar",
            "first_name": "Rajesh",
            "last_name": "Kumar",
            "email": "rajesh.kumar@chennaielectronics.com",
            "phone": "+91 44 2851 9876",
            "mobile": "+91 98410 12345",
            "billing_address": "45, Anna Salai, T. Nagar",
            "shipping_address": "45, Anna Salai, T. Nagar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "600017",
            "customer_type": "business",
            "gst_number": "33AABCC1234C1Z5",
            "credit_limit": 50000.00,
            "payment_terms": "net_30",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Leading electronics dealer in Chennai"
        },
        {
            "customer_code": "TN002",
            "company_name": "Coimbatore Textiles Ltd",
            "contact_person": "Priya Sharma",
            "first_name": "Priya",
            "last_name": "Sharma",
            "email": "priya.sharma@coimbatoretextiles.com",
            "phone": "+91 422 234 5678",
            "mobile": "+91 98765 43210",
            "billing_address": "123, Avinashi Road, Peelamedu",
            "shipping_address": "123, Avinashi Road, Peelamedu",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "641004",
            "customer_type": "business",
            "gst_number": "33DEFGH5678D2Z9",
            "credit_limit": 75000.00,
            "payment_terms": "net_30",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Textile manufacturer and exporter"
        },
        {
            "customer_code": "TN003",
            "first_name": "Arjun",
            "last_name": "Patel",
            "email": "arjun.patel@gmail.com",
            "phone": "+91 44 2345 6789",
            "mobile": "+91 98765 12345",
            "billing_address": "67, Velachery Main Road",
            "shipping_address": "67, Velachery Main Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "600042",
            "customer_type": "individual",
            "gst_number": "33IJKLM9012E3Z1",
            "credit_limit": 25000.00,
            "payment_terms": "immediate",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Regular retail customer"
        },
        {
            "customer_code": "TN004",
            "company_name": "Madurai Spices & Co",
            "contact_person": "Lakshmi Narayanan",
            "first_name": "Lakshmi",
            "last_name": "Narayanan",
            "email": "lakshmi@maduraispices.com",
            "phone": "+91 452 234 5678",
            "mobile": "+91 98765 67890",
            "billing_address": "89, East Masi Street, Madurai",
            "shipping_address": "89, East Masi Street, Madurai",
            "city": "Madurai",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "625001",
            "customer_type": "business",
            "gst_number": "33NOPQR3456F4Z2",
            "credit_limit": 40000.00,
            "payment_terms": "net_15",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Spices and condiments wholesaler"
        },
        {
            "customer_code": "TN005",
            "company_name": "Tiruchirappalli Auto Parts",
            "contact_person": "Murugan Selvam",
            "first_name": "Murugan",
            "last_name": "Selvam",
            "email": "murugan@trichyautoparts.com",
            "phone": "+91 431 234 5678",
            "mobile": "+91 98765 11111",
            "billing_address": "45, Collector Office Road",
            "shipping_address": "45, Collector Office Road",
            "city": "Tiruchirappalli",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "620001",
            "customer_type": "business",
            "gst_number": "33STUVW7890G5Z3",
            "credit_limit": 60000.00,
            "payment_terms": "net_30",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Auto parts distributor"
        },
        {
            "customer_code": "TN006",
            "first_name": "Kavya",
            "last_name": "Raman",
            "email": "kavya.raman@yahoo.com",
            "phone": "+91 44 2876 5432",
            "mobile": "+91 98765 22222",
            "billing_address": "23, Kodambakkam High Road",
            "shipping_address": "23, Kodambakkam High Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "600024",
            "customer_type": "individual",
            "credit_limit": 15000.00,
            "payment_terms": "immediate",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Frequent buyer of electronics"
        },
        {
            "customer_code": "TN007",
            "company_name": "Salem Steel Works",
            "contact_person": "Venkatesh Raj",
            "first_name": "Venkatesh",
            "last_name": "Raj",
            "email": "venkatesh@salemsteelworks.com",
            "phone": "+91 427 234 5678",
            "mobile": "+91 98765 33333",
            "billing_address": "78, Steel Plant Road",
            "shipping_address": "78, Steel Plant Road",
            "city": "Salem",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "636001",
            "customer_type": "business",
            "gst_number": "33XYZAB1234H6Z4",
            "credit_limit": 100000.00,
            "payment_terms": "net_45",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Steel fabrication and trading"
        },
        {
            "customer_code": "TN008",
            "first_name": "Divya",
            "last_name": "Krishnan",
            "email": "divya.krishnan@hotmail.com",
            "phone": "+91 422 345 6789",
            "mobile": "+91 98765 44444",
            "billing_address": "56, Race Course Road",
            "shipping_address": "56, Race Course Road",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "641018",
            "customer_type": "individual",
            "credit_limit": 20000.00,
            "payment_terms": "net_15",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Interior designer, buys furniture hardware"
        },
        {
            "customer_code": "TN009",
            "company_name": "Erode Agro Products",
            "contact_person": "Selvakumar Ramasamy",
            "first_name": "Selvakumar",
            "last_name": "Ramasamy",
            "email": "selvakumar@erodeagro.com",
            "phone": "+91 424 234 5678",
            "mobile": "+91 98765 55555",
            "billing_address": "34, Perundurai Road",
            "shipping_address": "34, Perundurai Road",
            "city": "Erode",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "638001",
            "customer_type": "business",
            "gst_number": "33CDEFG2345I7Z5",
            "credit_limit": 80010.00,
            "payment_terms": "net_30",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "Agricultural products supplier"
        },
        {
            "customer_code": "TN010",
            "first_name": "Arun",
            "last_name": "Vijay",
            "email": "arun.vijay@gmail.com",
            "phone": "+91 44 2987 6543",
            "mobile": "+91 98765 66666",
            "billing_address": "12, Besant Nagar Beach Road",
            "shipping_address": "12, Besant Nagar Beach Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "600090",
            "customer_type": "individual",
            "credit_limit": 30000.00,
            "payment_terms": "net_15",
            "currency": "INR",
            "is_active": True,
            "is_verified": True,
            "notes": "IT professional, tech enthusiast"
        }
    ]
    
    created_customers = []
    for customer_data in tamil_nadu_customers:
        # Check if customer already exists for this account
        existing_customer = db.query(Customer).filter(
            Customer.customer_code == customer_data["customer_code"],
            Customer.account_id == current_user.account_id
        ).first()
        
        if not existing_customer:
            # Add account_id to customer data
            customer_data_with_account = customer_data.copy()
            customer_data_with_account["account_id"] = current_user.account_id
            customer = Customer(**customer_data_with_account)
            db.add(customer)
            created_customers.append(customer_data["customer_code"])
    
    db.commit()
    
    return {
        "message": f"Successfully created {len(created_customers)} Tamil Nadu customers",
        "created_customers": created_customers
    } 