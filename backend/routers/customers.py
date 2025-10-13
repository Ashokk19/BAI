"""
BAI Backend Customer Router - PostgreSQL Version

This module contains the customer routes for customer management.
Now using direct PostgreSQL operations instead of SQLAlchemy.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from utils.auth_deps import get_current_user
from services.postgres_customer_service import PostgresCustomerService

router = APIRouter()

# Pydantic models
class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    account_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

@router.get("/")
async def get_customers(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
):
    """Get paginated customers list in the shape expected by frontend."""
    
    customers = PostgresCustomerService.get_customers_list(
        account_id=current_user["account_id"],
        limit=limit,
        offset=skip,
        search=search,
        status=status,
        state=state,
    )
    total = PostgresCustomerService.count_customers(
        account_id=current_user["account_id"],
        search=search,
        status=status,
        state=state,
    )
    total_pages = (total + limit - 1) // limit if limit else 1
    page = (skip // limit) + 1 if limit else 1
    return {
        "customers": customers,
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": total_pages,
    }

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific customer using PostgreSQL."""
    
    customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return customer

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new customer using PostgreSQL."""
    
    customer_dict = customer_data.model_dump()
    created_customer = PostgresCustomerService.create_customer(customer_dict, current_user["account_id"])
    
    if not created_customer:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )
    
    return created_customer

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a customer using PostgreSQL."""
    
    # Check if customer exists
    existing_customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    if not existing_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    update_dict = customer_data.model_dump(exclude_unset=True)
    updated_customer = PostgresCustomerService.update_customer(customer_id, update_dict, current_user["account_id"])
    
    if not updated_customer:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update customer"
        )
    
    return updated_customer

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a customer using PostgreSQL."""
    
    # Check if customer exists
    existing_customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    if not existing_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    success = PostgresCustomerService.delete_customer(customer_id, current_user["account_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete customer"
        )
    
    return {"message": f"Customer '{existing_customer['name']}' deleted successfully"}

@router.get("/summary")
async def get_customer_summary(
    current_user: dict = Depends(get_current_user)
):
    """Return summary counts for customers."""
    return PostgresCustomerService.get_customer_summary(current_user["account_id"])

@router.get("/{customer_id}/credit-info")
async def get_customer_credit_info(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Return placeholder credit info for customer to unblock UI."""
    return PostgresCustomerService.get_customer_credit_info(customer_id, current_user["account_id"])

@router.patch("/{customer_id}/toggle-status", response_model=CustomerResponse)
async def toggle_customer_status(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Toggle customer's active status and return updated customer."""
    updated = PostgresCustomerService.toggle_customer_status(customer_id, current_user["account_id"])
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return updated
