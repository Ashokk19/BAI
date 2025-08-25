"""
BAI Backend Organization Router

This module contains the organization routes for managing organization profiles and settings.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from database.database import get_db
from models.organization import Organization
from models.user import User
from schemas.organization_schema import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from utils.auth_deps import get_current_user

router = APIRouter(tags=["organization"])

@router.get("/profile", response_model=OrganizationResponse)
async def get_organization_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organization profile for the current user's account."""
    
    organization = db.query(Organization).filter(
        Organization.account_id == current_user.account_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization profile not found for this account"
        )
    
    return organization

@router.post("/profile", response_model=OrganizationResponse)
async def create_organization_profile(
    organization_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create organization profile for the current user's account."""
    
    # Check if organization already exists for this account
    existing_org = db.query(Organization).filter(
        Organization.account_id == current_user.account_id
    ).first()
    
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization profile already exists for this account"
        )
    
    # Create new organization
    organization = Organization(
        account_id=current_user.account_id,
        **organization_data.model_dump()
    )
    
    db.add(organization)
    db.commit()
    db.refresh(organization)
    
    return organization

@router.put("/profile", response_model=OrganizationResponse)
async def update_organization_profile(
    organization_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update organization profile for the current user's account."""
    
    organization = db.query(Organization).filter(
        Organization.account_id == current_user.account_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization profile not found for this account"
        )
    
    # Update only provided fields
    update_data = organization_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return organization

@router.delete("/profile")
async def delete_organization_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete organization profile for the current user's account."""
    
    organization = db.query(Organization).filter(
        Organization.account_id == current_user.account_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization profile not found for this account"
        )
    
    db.delete(organization)
    db.commit()
    
    return {"message": "Organization profile deleted successfully"}
