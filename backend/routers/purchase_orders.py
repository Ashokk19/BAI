"""
BAI Backend Purchase Order Router

This module contains the purchase order routes for purchase order management.
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
from models.purchase import PurchaseOrder, PurchaseOrderItem
from models.vendor import Vendor
from models.item import Item
from schemas.purchase_schema import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderList,
    PurchaseOrderItemCreate,
    PurchaseOrderItemUpdate,
    PurchaseOrderItemResponse
)

router = APIRouter()

@router.get("/", response_model=PurchaseOrderList)
async def get_purchase_orders(
    skip: int = Query(0, ge=0, description="Number of purchase orders to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of purchase orders to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get purchase orders list with pagination and filters."""
    
    query = db.query(PurchaseOrder)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                PurchaseOrder.po_number.ilike(search_term),
                PurchaseOrder.notes.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(PurchaseOrder.status == status)
    
    # Apply vendor filter
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)
    
    # Apply priority filter
    if priority:
        query = query.filter(PurchaseOrder.priority == priority)
    
    # Apply date filters
    if start_date:
        query = query.filter(PurchaseOrder.po_date >= start_date)
    if end_date:
        query = query.filter(PurchaseOrder.po_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    purchase_orders = query.order_by(PurchaseOrder.po_date.desc()).offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    return PurchaseOrderList(
        purchase_orders=purchase_orders,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{purchase_order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific purchase order by ID."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return purchase_order

@router.post("/", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    purchase_order_data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new purchase order."""
    
    # Validate vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == purchase_order_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Generate PO number if not provided
    if not purchase_order_data.po_number:
        purchase_order_data.po_number = f"PO-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate totals
    subtotal = 0
    tax_amount = 0
    discount_amount = 0
    
    # Create purchase order
    purchase_order = PurchaseOrder(
        po_number=purchase_order_data.po_number,
        po_date=purchase_order_data.po_date,
        expected_delivery_date=purchase_order_data.expected_delivery_date,
        vendor_id=purchase_order_data.vendor_id,
        status=purchase_order_data.status,
        priority=purchase_order_data.priority,
        payment_terms=purchase_order_data.payment_terms,
        currency=purchase_order_data.currency,
        shipping_address=purchase_order_data.shipping_address,
        shipping_method=purchase_order_data.shipping_method,
        shipping_cost=purchase_order_data.shipping_cost,
        notes=purchase_order_data.notes,
        terms_conditions=purchase_order_data.terms_conditions,
        created_by=current_user.id
    )
    
    db.add(purchase_order)
    db.flush()  # Get the ID
    
    # Create purchase order items
    for item_data in purchase_order_data.items:
        # Validate item exists
        item = db.query(Item).filter(Item.id == item_data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item with ID {item_data.item_id} not found")
        
        # Calculate line totals
        line_subtotal = item_data.quantity_ordered * item_data.unit_price
        line_discount = line_subtotal * (item_data.discount_rate / 100)
        line_tax = (line_subtotal - line_discount) * (item_data.tax_rate / 100)
        line_total = line_subtotal - line_discount + line_tax
        
        purchase_order_item = PurchaseOrderItem(
            purchase_order_id=purchase_order.id,
            item_id=item_data.item_id,
            item_name=item_data.item_name,
            item_description=item_data.item_description,
            item_sku=item_data.item_sku,
            quantity_ordered=item_data.quantity_ordered,
            unit_price=item_data.unit_price,
            discount_rate=item_data.discount_rate,
            tax_rate=item_data.tax_rate,
            discount_amount=line_discount,
            tax_amount=line_tax,
            line_total=line_total
        )
        
        db.add(purchase_order_item)
        
        # Update totals
        subtotal += line_subtotal
        tax_amount += line_tax
        discount_amount += line_discount
    
    # Update purchase order totals
    purchase_order.subtotal = subtotal
    purchase_order.tax_amount = tax_amount
    purchase_order.discount_amount = discount_amount
    purchase_order.total_amount = subtotal + tax_amount - discount_amount + purchase_order.shipping_cost
    
    db.commit()
    db.refresh(purchase_order)
    
    return purchase_order

@router.put("/{purchase_order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    purchase_order_id: int,
    purchase_order_data: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase order."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Check if purchase order can be updated (not received or cancelled)
    if purchase_order.status in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot update purchase order in received or cancelled status")
    
    # Update fields
    update_data = purchase_order_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(purchase_order, field, value)
    
    # Recalculate totals if items were updated
    if "items" in update_data:
        subtotal = 0
        tax_amount = 0
        discount_amount = 0
        
        # Delete existing items
        db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == purchase_order_id).delete()
        
        # Create new items
        for item_data in update_data["items"]:
            item = db.query(Item).filter(Item.id == item_data.item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"Item with ID {item_data.item_id} not found")
            
            line_subtotal = item_data.quantity_ordered * item_data.unit_price
            line_discount = line_subtotal * (item_data.discount_rate / 100)
            line_tax = (line_subtotal - line_discount) * (item_data.tax_rate / 100)
            line_total = line_subtotal - line_discount + line_tax
            
            purchase_order_item = PurchaseOrderItem(
                purchase_order_id=purchase_order.id,
                item_id=item_data.item_id,
                item_name=item_data.item_name,
                item_description=item_data.item_description,
                item_sku=item_data.item_sku,
                quantity_ordered=item_data.quantity_ordered,
                unit_price=item_data.unit_price,
                discount_rate=item_data.discount_rate,
                tax_rate=item_data.tax_rate,
                discount_amount=line_discount,
                tax_amount=line_tax,
                line_total=line_total
            )
            
            db.add(purchase_order_item)
            
            subtotal += line_subtotal
            tax_amount += line_tax
            discount_amount += line_discount
        
        purchase_order.subtotal = subtotal
        purchase_order.tax_amount = tax_amount
        purchase_order.discount_amount = discount_amount
        purchase_order.total_amount = subtotal + tax_amount - discount_amount + purchase_order.shipping_cost
    
    db.commit()
    db.refresh(purchase_order)
    
    return purchase_order

@router.delete("/{purchase_order_id}")
async def delete_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a purchase order."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Check if purchase order can be deleted
    if purchase_order.status not in ["draft"]:
        raise HTTPException(status_code=400, detail="Can only delete purchase orders in draft status")
    
    db.delete(purchase_order)
    db.commit()
    
    return {"message": "Purchase order deleted successfully"}

@router.get("/{purchase_order_id}/items", response_model=List[PurchaseOrderItemResponse])
async def get_purchase_order_items(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get items for a specific purchase order."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return purchase_order.items

@router.post("/{purchase_order_id}/items", response_model=PurchaseOrderItemResponse)
async def add_purchase_order_item(
    purchase_order_id: int,
    item_data: PurchaseOrderItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an item to a purchase order."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Check if purchase order can be modified
    if purchase_order.status in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot modify purchase order in received or cancelled status")
    
    # Validate item exists
    item = db.query(Item).filter(Item.id == item_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Calculate line totals
    line_subtotal = item_data.quantity_ordered * item_data.unit_price
    line_discount = line_subtotal * (item_data.discount_rate / 100)
    line_tax = (line_subtotal - line_discount) * (item_data.tax_rate / 100)
    line_total = line_subtotal - line_discount + line_tax
    
    purchase_order_item = PurchaseOrderItem(
        purchase_order_id=purchase_order_id,
        item_id=item_data.item_id,
        item_name=item_data.item_name,
        item_description=item_data.item_description,
        item_sku=item_data.item_sku,
        quantity_ordered=item_data.quantity_ordered,
        unit_price=item_data.unit_price,
        discount_rate=item_data.discount_rate,
        tax_rate=item_data.tax_rate,
        discount_amount=line_discount,
        tax_amount=line_tax,
        line_total=line_total
    )
    
    db.add(purchase_order_item)
    
    # Update purchase order totals
    purchase_order.subtotal += line_subtotal
    purchase_order.tax_amount += line_tax
    purchase_order.discount_amount += line_discount
    purchase_order.total_amount = purchase_order.subtotal + purchase_order.tax_amount - purchase_order.discount_amount + purchase_order.shipping_cost
    
    db.commit()
    db.refresh(purchase_order_item)
    
    return purchase_order_item

@router.put("/{purchase_order_id}/items/{item_id}", response_model=PurchaseOrderItemResponse)
async def update_purchase_order_item(
    purchase_order_id: int,
    item_id: int,
    item_data: PurchaseOrderItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a purchase order item."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    purchase_order_item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == purchase_order_id,
        PurchaseOrderItem.id == item_id
    ).first()
    
    if not purchase_order_item:
        raise HTTPException(status_code=404, detail="Purchase order item not found")
    
    # Check if purchase order can be modified
    if purchase_order.status in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot modify purchase order in received or cancelled status")
    
    # Update fields
    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(purchase_order_item, field, value)
    
    # Recalculate line totals
    line_subtotal = purchase_order_item.quantity_ordered * purchase_order_item.unit_price
    line_discount = line_subtotal * (purchase_order_item.discount_rate / 100)
    line_tax = (line_subtotal - line_discount) * (purchase_order_item.tax_rate / 100)
    line_total = line_subtotal - line_discount + line_tax
    
    purchase_order_item.discount_amount = line_discount
    purchase_order_item.tax_amount = line_tax
    purchase_order_item.line_total = line_total
    
    # Recalculate purchase order totals
    subtotal = sum(item.line_total + item.discount_amount - item.tax_amount for item in purchase_order.items)
    tax_amount = sum(item.tax_amount for item in purchase_order.items)
    discount_amount = sum(item.discount_amount for item in purchase_order.items)
    
    purchase_order.subtotal = subtotal
    purchase_order.tax_amount = tax_amount
    purchase_order.discount_amount = discount_amount
    purchase_order.total_amount = subtotal + tax_amount - discount_amount + purchase_order.shipping_cost
    
    db.commit()
    db.refresh(purchase_order_item)
    
    return purchase_order_item

@router.delete("/{purchase_order_id}/items/{item_id}")
async def delete_purchase_order_item(
    purchase_order_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a purchase order item."""
    
    purchase_order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not purchase_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    purchase_order_item = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == purchase_order_id,
        PurchaseOrderItem.id == item_id
    ).first()
    
    if not purchase_order_item:
        raise HTTPException(status_code=404, detail="Purchase order item not found")
    
    # Check if purchase order can be modified
    if purchase_order.status in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot modify purchase order in received or cancelled status")
    
    # Update purchase order totals
    purchase_order.subtotal -= purchase_order_item.line_total + purchase_order_item.discount_amount - purchase_order_item.tax_amount
    purchase_order.tax_amount -= purchase_order_item.tax_amount
    purchase_order.discount_amount -= purchase_order_item.discount_amount
    purchase_order.total_amount = purchase_order.subtotal + purchase_order.tax_amount - purchase_order.discount_amount + purchase_order.shipping_cost
    
    db.delete(purchase_order_item)
    db.commit()
    
    return {"message": "Purchase order item deleted successfully"} 