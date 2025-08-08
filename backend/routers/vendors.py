"""
BAI Backend Vendor Router

This module contains the vendor routes for vendor management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.vendor import Vendor
from schemas.vendor_schema import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorList,
    VendorSummary
)

router = APIRouter()

@router.get("/", response_model=VendorList)
async def get_vendors(
    skip: int = Query(0, ge=0, description="Number of vendors to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of vendors to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_type: Optional[str] = Query(None, description="Filter by vendor type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendors list with pagination and filters."""
    
    query = db.query(Vendor)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Vendor.company_name.ilike(search_term),
                Vendor.contact_person.ilike(search_term),
                Vendor.email.ilike(search_term),
                Vendor.vendor_code.ilike(search_term),
                Vendor.phone.ilike(search_term),
                Vendor.gst_number.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        if status == "active":
            query = query.filter(Vendor.is_active == True)
        elif status == "inactive":
            query = query.filter(Vendor.is_active == False)
    
    # Apply vendor type filter
    if vendor_type:
        query = query.filter(Vendor.vendor_type == vendor_type)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    vendors = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return VendorList(
        vendors=vendors,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific vendor by ID."""
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return vendor

@router.post("/", response_model=VendorResponse)
async def create_vendor(
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor."""
    
    # Check if vendor code already exists
    existing_vendor = db.query(Vendor).filter(
        Vendor.vendor_code == vendor_data.vendor_code
    ).first()
    if existing_vendor:
        raise HTTPException(
            status_code=400,
            detail="Vendor code already exists"
        )
    
    # Check if email already exists
    existing_email = db.query(Vendor).filter(
        Vendor.email == vendor_data.email
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )
    
    # Create new vendor
    vendor = Vendor(**vendor_data.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    
    return vendor

@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing vendor."""
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if vendor code already exists (if being changed)
    if vendor_data.vendor_code and vendor_data.vendor_code != vendor.vendor_code:
        existing_vendor = db.query(Vendor).filter(
            Vendor.vendor_code == vendor_data.vendor_code
        ).first()
        if existing_vendor:
            raise HTTPException(
                status_code=400,
                detail="Vendor code already exists"
            )
    
    # Check if email already exists (if being changed)
    if vendor_data.email and vendor_data.email != vendor.email:
        existing_email = db.query(Vendor).filter(
            Vendor.email == vendor_data.email
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )
    
    # Update vendor fields
    for field, value in vendor_data.model_dump(exclude_unset=True).items():
        setattr(vendor, field, value)
    
    db.commit()
    db.refresh(vendor)
    
    return vendor

@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a vendor."""
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db.delete(vendor)
    db.commit()
    
    return {"message": "Vendor deleted successfully"}

@router.get("/summary/stats", response_model=VendorSummary)
async def get_vendor_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor summary statistics."""
    
    total_vendors = db.query(Vendor).count()
    active_vendors = db.query(Vendor).filter(Vendor.is_active == True).count()
    inactive_vendors = db.query(Vendor).filter(Vendor.is_active == False).count()
    
    # Get vendor types distribution
    vendor_types = db.query(
        Vendor.vendor_type,
        func.count(Vendor.id).label('count')
    ).group_by(Vendor.vendor_type).all()
    
    vendor_type_distribution = {vt.vendor_type: vt.count for vt in vendor_types}
    
    return VendorSummary(
        total_vendors=total_vendors,
        active_vendors=active_vendors,
        inactive_vendors=inactive_vendors,
        vendor_type_distribution=vendor_type_distribution
    ) 