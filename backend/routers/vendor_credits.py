"""
BAI Backend Vendor Credits Router

This module contains the vendor credits routes for vendor credit management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil
from datetime import datetime
import uuid

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.vendor import Vendor
from schemas.purchase_schema import (
    VendorCreditCreate,
    VendorCreditUpdate,
    VendorCreditResponse,
    VendorCreditList
)

router = APIRouter()

@router.get("/", response_model=VendorCreditList)
async def get_vendor_credits(
    skip: int = Query(0, ge=0, description="Number of vendor credits to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of vendor credits to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    credit_type: Optional[str] = Query(None, description="Filter by credit type"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor credits list with pagination and filters."""
    
    # For now, we'll return empty list since we don't have a VendorCredit model yet
    # In a real implementation, you would query the VendorCredit model
    query = db.query(Vendor).filter(Vendor.id == 0)  # Placeholder query
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Vendor.company_name.ilike(search_term),
                Vendor.vendor_code.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(Vendor.is_active == (status == "active"))
    
    # Apply vendor filter
    if vendor_id:
        query = query.filter(Vendor.id == vendor_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    vendors = query.order_by(Vendor.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to vendor credit format (placeholder)
    vendor_credits = []
    for vendor in vendors:
        # Create placeholder vendor credit data
        vendor_credit = VendorCreditResponse(
            id=vendor.id,
            vendor_id=vendor.id,
            credit_type="refund",
            amount=0.00,
            reason="Placeholder credit",
            reference_number=f"VC-{vendor.vendor_code}",
            expiry_date=None,
            status="active",
            notes="Placeholder vendor credit",
            created_by=current_user.id,
            created_at=vendor.created_at,
            updated_at=vendor.updated_at
        )
        vendor_credits.append(vendor_credit)
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return VendorCreditList(
        vendor_credits=vendor_credits,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{credit_id}", response_model=VendorCreditResponse)
async def get_vendor_credit(
    credit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific vendor credit by ID."""
    
    # For now, we'll return a placeholder since we don't have a VendorCredit model yet
    # In a real implementation, you would query the VendorCredit model
    vendor = db.query(Vendor).filter(Vendor.id == credit_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor credit not found")
    
    return VendorCreditResponse(
        id=vendor.id,
        vendor_id=vendor.id,
        credit_type="refund",
        amount=0.00,
        reason="Placeholder credit",
        reference_number=f"VC-{vendor.vendor_code}",
        expiry_date=None,
        status="active",
        notes="Placeholder vendor credit",
        created_by=current_user.id,
        created_at=vendor.created_at,
        updated_at=vendor.updated_at
    )

@router.post("/", response_model=VendorCreditResponse)
async def create_vendor_credit(
    credit_data: VendorCreditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor credit."""
    
    # Validate vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == credit_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate credit amount
    if credit_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Credit amount must be greater than 0")
    
    # Generate reference number if not provided
    if not credit_data.reference_number:
        credit_data.reference_number = f"VC-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    # For now, we'll create a placeholder vendor credit
    # In a real implementation, you would create a VendorCredit record
    vendor_credit = VendorCreditResponse(
        id=vendor.id,
        vendor_id=credit_data.vendor_id,
        credit_type=credit_data.credit_type,
        amount=credit_data.amount,
        reason=credit_data.reason,
        reference_number=credit_data.reference_number,
        expiry_date=credit_data.expiry_date,
        status=credit_data.status,
        notes=credit_data.notes,
        created_by=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    return vendor_credit

@router.put("/{credit_id}", response_model=VendorCreditResponse)
async def update_vendor_credit(
    credit_id: int,
    credit_data: VendorCreditUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a vendor credit."""
    
    # For now, we'll return a placeholder since we don't have a VendorCredit model yet
    vendor = db.query(Vendor).filter(Vendor.id == credit_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor credit not found")
    
    # Update fields
    update_data = credit_data.dict(exclude_unset=True)
    
    return VendorCreditResponse(
        id=vendor.id,
        vendor_id=vendor.id,
        credit_type=update_data.get("credit_type", "refund"),
        amount=update_data.get("amount", 0.00),
        reason=update_data.get("reason", "Updated credit"),
        reference_number=update_data.get("reference_number", f"VC-{vendor.vendor_code}"),
        expiry_date=update_data.get("expiry_date"),
        status=update_data.get("status", "active"),
        notes=update_data.get("notes", "Updated vendor credit"),
        created_by=current_user.id,
        created_at=vendor.created_at,
        updated_at=datetime.now()
    )

@router.delete("/{credit_id}")
async def delete_vendor_credit(
    credit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a vendor credit."""
    
    # For now, we'll return a placeholder since we don't have a VendorCredit model yet
    vendor = db.query(Vendor).filter(Vendor.id == credit_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor credit not found")
    
    return {"message": "Vendor credit deleted successfully"}

@router.get("/summary/stats")
async def get_vendor_credits_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor credits summary statistics."""
    
    # For now, we'll return placeholder statistics
    # In a real implementation, you would query the VendorCredit model
    total_credits = db.query(Vendor).count()
    active_credits = db.query(Vendor).filter(Vendor.is_active == True).count()
    inactive_credits = db.query(Vendor).filter(Vendor.is_active == False).count()
    
    return {
        "total_credits": total_credits,
        "active_credits": active_credits,
        "inactive_credits": inactive_credits,
        "total_amount": 0.00,
        "used_amount": 0.00,
        "available_amount": 0.00
    } 