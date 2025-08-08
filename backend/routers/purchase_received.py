"""
BAI Backend Purchase Received Router

This module contains the purchase received routes for receipt tracking and quality control.
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
from models.purchase import PurchaseReceived, PurchaseOrder, PurchaseOrderItem
from models.item import Item
from models.inventory import InventoryLog
from schemas.purchase_schema import (
    PurchaseReceivedCreate,
    PurchaseReceivedUpdate,
    PurchaseReceivedResponse,
    PurchaseReceivedList
)

router = APIRouter()

@router.get("/", response_model=PurchaseReceivedList)
async def get_purchase_received(
    skip: int = Query(0, ge=0, description="Number of receipts to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of receipts to return"),
    search: Optional[str] = Query(None, description="Search term"),
    quality_status: Optional[str] = Query(None, description="Filter by quality status"),
    purchase_order_id: Optional[int] = Query(None, description="Filter by purchase order ID"),
    item_id: Optional[int] = Query(None, description="Filter by item ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get purchase received list with pagination and filters."""
    
    query = db.query(PurchaseReceived)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                PurchaseReceived.receipt_number.ilike(search_term),
                PurchaseReceived.quality_notes.ilike(search_term),
                PurchaseReceived.storage_location.ilike(search_term),
                PurchaseReceived.batch_number.ilike(search_term)
            )
        )
    
    # Apply quality status filter
    if quality_status:
        query = query.filter(PurchaseReceived.quality_status == quality_status)
    
    # Apply purchase order filter
    if purchase_order_id:
        query = query.filter(PurchaseReceived.purchase_order_id == purchase_order_id)
    
    # Apply item filter
    if item_id:
        query = query.filter(PurchaseReceived.item_id == item_id)
    
    # Apply date filters
    if start_date:
        query = query.filter(PurchaseReceived.receipt_date >= start_date)
    if end_date:
        query = query.filter(PurchaseReceived.receipt_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    receipts = query.order_by(PurchaseReceived.receipt_date.desc()).offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return PurchaseReceivedList(
        purchase_received=receipts,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{receipt_id}", response_model=PurchaseReceivedResponse)
async def get_purchase_received_by_id(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific purchase received record by ID."""
    
    receipt = db.query(PurchaseReceived).filter(PurchaseReceived.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Purchase received record not found")
    
    return receipt

@router.post("/", response_model=PurchaseReceivedResponse)
async def create_purchase_received(
    receipt_data: PurchaseReceivedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase received record."""
    
    # Validate purchase order exists
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == receipt_data.purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Validate purchase order item exists
    purchase_order_item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.id == receipt_data.purchase_order_item_id,
        PurchaseOrderItem.purchase_order_id == receipt_data.purchase_order_id
    ).first()
    if not purchase_order_item:
        raise HTTPException(status_code=404, detail="Purchase order item not found")
    
    # Validate item exists
    item = db.query(Item).filter(Item.id == receipt_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Generate receipt number if not provided
    if not receipt_data.receipt_number:
        receipt_data.receipt_number = f"REC-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Validate quantities
    if receipt_data.quantity_received <= 0:
        raise HTTPException(status_code=400, detail="Quantity received must be greater than 0")
    
    if receipt_data.quantity_accepted > receipt_data.quantity_received:
        raise HTTPException(status_code=400, detail="Quantity accepted cannot exceed quantity received")
    
    if receipt_data.quantity_rejected > receipt_data.quantity_received:
        raise HTTPException(status_code=400, detail="Quantity rejected cannot exceed quantity received")
    
    if receipt_data.quantity_accepted + receipt_data.quantity_rejected != receipt_data.quantity_received:
        raise HTTPException(status_code=400, detail="Sum of accepted and rejected quantities must equal received quantity")
    
    # Create purchase received record
    receipt = PurchaseReceived(
        receipt_number=receipt_data.receipt_number,
        receipt_date=receipt_data.receipt_date,
        purchase_order_id=receipt_data.purchase_order_id,
        purchase_order_item_id=receipt_data.purchase_order_item_id,
        item_id=receipt_data.item_id,
        quantity_received=receipt_data.quantity_received,
        quantity_accepted=receipt_data.quantity_accepted,
        quantity_rejected=receipt_data.quantity_rejected,
        quality_status=receipt_data.quality_status,
        quality_notes=receipt_data.quality_notes,
        storage_location=receipt_data.storage_location,
        batch_number=receipt_data.batch_number,
        expiry_date=receipt_data.expiry_date,
        received_by=current_user.id
    )
    
    db.add(receipt)
    db.flush()  # Get the ID
    
    # Update purchase order item received quantity
    purchase_order_item.quantity_received += receipt_data.quantity_accepted
    
    # Update purchase order status
    total_items = len(purchase_order.items)
    received_items = sum(1 for item in purchase_order.items if item.quantity_received >= item.quantity_ordered)
    
    if received_items == total_items:
        purchase_order.status = "received"
    elif received_items > 0:
        purchase_order.status = "partial_received"
    
    # Create inventory log for accepted items
    if receipt_data.quantity_accepted > 0:
        inventory_log = InventoryLog(
            item_id=receipt_data.item_id,
            movement_type="purchase_received",
            quantity=receipt_data.quantity_accepted,
            reference_id=receipt.id,
            reference_type="purchase_received",
            notes=f"Received from PO {purchase_order.po_number}",
            created_by=current_user.id
        )
        db.add(inventory_log)
        
        # Update item stock
        item.current_stock += receipt_data.quantity_accepted
    
    db.commit()
    db.refresh(receipt)
    
    return receipt

@router.put("/{receipt_id}", response_model=PurchaseReceivedResponse)
async def update_purchase_received(
    receipt_id: int,
    receipt_data: PurchaseReceivedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase received record."""
    
    receipt = db.query(PurchaseReceived).filter(PurchaseReceived.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Purchase received record not found")
    
    # Check if receipt can be updated
    if receipt.quality_status in ["passed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot update receipt with passed or failed quality status")
    
    # Update fields
    update_data = receipt_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(receipt, field, value)
    
    # Validate quantities if updated
    if "quantity_received" in update_data or "quantity_accepted" in update_data or "quantity_rejected" in update_data:
        if receipt.quantity_accepted + receipt.quantity_rejected != receipt.quantity_received:
            raise HTTPException(status_code=400, detail="Sum of accepted and rejected quantities must equal received quantity")
    
    db.commit()
    db.refresh(receipt)
    
    return receipt

@router.delete("/{receipt_id}")
async def delete_purchase_received(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a purchase received record."""
    
    receipt = db.query(PurchaseReceived).filter(PurchaseReceived.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Purchase received record not found")
    
    # Check if receipt can be deleted
    if receipt.quality_status in ["passed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot delete receipt with passed or failed quality status")
    
    # Update purchase order item received quantity
    purchase_order_item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.id == receipt.purchase_order_item_id
    ).first()
    if purchase_order_item:
        purchase_order_item.quantity_received -= receipt.quantity_accepted
    
    # Remove inventory log
    inventory_log = db.query(InventoryLog).filter(
        InventoryLog.reference_id == receipt.id,
        InventoryLog.reference_type == "purchase_received"
    ).first()
    if inventory_log:
        db.delete(inventory_log)
        
        # Update item stock
        item = db.query(Item).filter(Item.id == receipt.item_id).first()
        if item:
            item.current_stock -= receipt.quantity_accepted
    
    db.delete(receipt)
    db.commit()
    
    return {"message": "Purchase received record deleted successfully"}

@router.get("/summary/stats")
async def get_purchase_received_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get purchase received summary statistics."""
    
    # Get total receipts
    total_receipts = db.query(PurchaseReceived).count()
    
    # Get receipts by quality status
    pending_receipts = db.query(PurchaseReceived).filter(PurchaseReceived.quality_status == "pending").count()
    passed_receipts = db.query(PurchaseReceived).filter(PurchaseReceived.quality_status == "passed").count()
    failed_receipts = db.query(PurchaseReceived).filter(PurchaseReceived.quality_status == "failed").count()
    
    # Get total quantities
    total_received = db.query(func.sum(PurchaseReceived.quantity_received)).scalar() or 0
    total_accepted = db.query(func.sum(PurchaseReceived.quantity_accepted)).scalar() or 0
    total_rejected = db.query(func.sum(PurchaseReceived.quantity_rejected)).scalar() or 0
    
    return {
        "total_receipts": total_receipts,
        "pending_receipts": pending_receipts,
        "passed_receipts": passed_receipts,
        "failed_receipts": failed_receipts,
        "total_received": float(total_received),
        "total_accepted": float(total_accepted),
        "total_rejected": float(total_rejected),
        "acceptance_rate": float(total_accepted / total_received * 100) if total_received > 0 else 0
    } 