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

@router.get("/", response_model=List[CustomerResponse])
async def get_customers(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """Get list of customers using PostgreSQL."""
    
    customers = PostgresCustomerService.get_customers_list(
        account_id=current_user["account_id"],
        limit=limit,
        offset=offset
    )
    
    return customers

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
