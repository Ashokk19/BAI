"""
BAI Backend User Management Router

This module contains the user management routes for listing existing users within an organization.
These are the same users who can login to the system, filtered by account_id.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.database import get_db
from schemas.auth_schema import UserResponse, UserRegister
from utils.auth_deps import get_current_user, get_current_admin_user
from models.user import User
from services.auth_service import auth_service
from pydantic import BaseModel

router = APIRouter(tags=["user-management"])

@router.get("/users", response_model=List[UserResponse])
async def get_organization_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users registered for the current user's account/organization.
    These are existing users who can login to the system.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of users in the same organization (account_id)
    """
    users = db.query(User).filter(User.account_id == current_user.account_id).all()
    return [UserResponse.model_validate(user) for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_organization_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific user in the organization.
    
    Args:
        user_id: ID of the user to retrieve
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        User information
        
    Raises:
        HTTPException: If user not found or not in same organization
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user belongs to the same organization
    if user.account_id != current_user.account_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access user from different organization"
        )
    
    return UserResponse.model_validate(user)

# Admin-only schemas
class UserStatusUpdate(BaseModel):
    """Schema for updating user status."""
    is_active: bool

class AdminUserCreate(BaseModel):
    """Schema for admin to create new users."""
    email: str
    username: str
    password: str
    first_name: str
    last_name: str
    phone: str = None
    mobile: str = None
    address: str = None
    city: str = None
    state: str = None
    postal_code: str = None
    company: str = None
    designation: str = None
    is_admin: bool = False

# Admin-only endpoints
@router.post("/admin/users", response_model=UserResponse)
async def create_user_by_admin(
    user_data: AdminUserCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user in the organization (Admin only).
    
    Args:
        user_data: User creation data
        current_admin: Current admin user
        db: Database session
        
    Returns:
        Created user information
        
    Raises:
        HTTPException: If user creation fails
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    try:
        # Create user data dict for auth service
        user_dict = {
            "email": user_data.email,
            "username": user_data.username,
            "password": user_data.password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "account_id": current_admin.account_id,  # Same account as admin
            "phone": user_data.phone,
            "mobile": user_data.mobile,
            "address": user_data.address,
            "city": user_data.city,
            "state": user_data.state,
            "postal_code": user_data.postal_code,
            "company": user_data.company,
            "designation": user_data.designation,
            "is_admin": user_data.is_admin
        }
        
        # Create the user
        new_user = auth_service.create_user(db, user_dict)
        return UserResponse.model_validate(new_user)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User creation failed: {str(e)}"
        )

@router.patch("/admin/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update user active/inactive status (Admin only).
    
    Args:
        user_id: ID of user to update
        status_update: New status data
        current_admin: Current admin user
        db: Database session
        
    Returns:
        Updated user information
        
    Raises:
        HTTPException: If user not found or operation fails
    """
    # Get the user to update
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user belongs to the same organization
    if user.account_id != current_admin.account_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify user from different organization"
        )
    
    # Prevent admin from deactivating themselves
    if user.id == current_admin.id and not status_update.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    try:
        # Update the user status
        user.is_active = status_update.is_active
        db.commit()
        db.refresh(user)
        
        return UserResponse.model_validate(user)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status update failed: {str(e)}"
        )

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user from the organization (Admin only).
    
    Args:
        user_id: ID of user to delete
        current_admin: Current admin user
        db: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If user not found or operation fails
    """
    # Import Organization model here to avoid circular imports
    from models.organization import Organization
    
    # Get the user to delete
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user belongs to the same organization
    if user.account_id != current_admin.account_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete user from different organization"
        )
    
    # Prevent admin from deleting themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        # Delete the user - organization relationship is now handled manually
        # so no foreign key constraints to worry about
        db.delete(user)
        db.commit()
        
        return {
            "message": f"User {user.username} has been deleted successfully",
            "deleted_user_id": user_id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User deletion failed: {str(e)}"
        )
