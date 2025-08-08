"""
BAI Backend Inventory Router

This module contains the inventory routes for items, categories, and inventory management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.item import Item, ItemCategory
from models.inventory import InventoryLog
from pydantic import BaseModel
import csv
import io
from datetime import datetime
from decimal import Decimal

router = APIRouter()

# Pydantic schemas for API responses
class ItemCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    sku: str
    barcode: Optional[str]
    category_id: int
    unit_price: float
    cost_price: Optional[float]
    selling_price: float
    current_stock: int
    minimum_stock: int
    maximum_stock: Optional[int]
    unit_of_measure: str
    weight: Optional[float]
    dimensions: Optional[str]
    has_expiry: bool
    shelf_life_days: Optional[int]
    is_active: bool
    is_serialized: bool
    tax_rate: float
    tax_type: str
    created_at: datetime
    is_low_stock: bool
    stock_value: float
    
    class Config:
        from_attributes = True

class InventoryLogResponse(BaseModel):
    id: int
    item_id: int
    item_name: str
    item_sku: str
    action: str
    user_id: int
    user_name: str
    quantity_before: Optional[float] = None
    quantity_after: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/")
async def get_inventory_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inventory summary with key metrics."""
    
    # Get total items count
    total_items = db.query(Item).count()
    
    # Get low stock items
    low_stock_items = db.query(Item).filter(Item.current_stock <= Item.minimum_stock).count()
    
    # Get total stock value
    items = db.query(Item).all()
    total_stock_value = sum(item.stock_value for item in items)
    
    # Get active categories
    active_categories = db.query(ItemCategory).filter(ItemCategory.is_active == True).count()
    
    return {
        "total_items": total_items,
        "low_stock_items": low_stock_items,
        "total_stock_value": float(total_stock_value),
        "active_categories": active_categories,
        "total_value_formatted": f"${total_stock_value:,.2f}"
    }

@router.get("/items", response_model=List[ItemResponse])
async def get_items(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get items list with optional filtering."""
    
    query = db.query(Item)
    
    if search:
        query = query.filter(Item.name.contains(search) | Item.sku.contains(search))
    
    if category_id:
        query = query.filter(Item.category_id == category_id)
    
    items = query.offset(skip).limit(limit).all()
    return items

@router.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific item by ID."""
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return item

@router.get("/categories", response_model=List[ItemCategoryResponse])
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get item categories."""
    
    categories = db.query(ItemCategory).filter(ItemCategory.is_active == True).all()
    return categories

@router.get("/expiry-tracking")
async def get_expiry_tracking(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get items with expiry tracking."""
    
    from datetime import datetime, timedelta
    
    expiry_items = db.query(Item).filter(Item.has_expiry == True).all()
    
    # Calculate expiry status for items
    expiry_data = []
    for item in expiry_items:
        if item.shelf_life_days:
            # Calculate expiry date based on creation date + shelf life
            expiry_date = item.created_at + timedelta(days=item.shelf_life_days)
            days_until_expiry = (expiry_date - datetime.now()).days
            
            # Determine status based on days until expiry
            if days_until_expiry < 0:
                status = "expired"
            elif days_until_expiry <= 7:
                status = "expiring-soon"
            elif days_until_expiry <= 30:
                status = "warning"
            else:
                status = "good"
            
            expiry_data.append({
                "id": item.id,
                "name": item.name,
                "sku": item.sku,
                "category_id": item.category_id,
                "current_stock": item.current_stock,
                "has_expiry": item.has_expiry,
                "shelf_life_days": item.shelf_life_days,
                "created_at": item.created_at.isoformat(),
                "days_until_expiry": days_until_expiry,
                "expiry_date": expiry_date.isoformat(),
                "status": status
            })
    
    return expiry_data

@router.get("/logs")
async def get_inventory_logs(
    skip: int = 0,
    limit: int = 50,
    item_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inventory logs with formatted data for frontend."""
    
    query = db.query(InventoryLog).join(Item).join(User, InventoryLog.recorded_by == User.id)
    
    if item_id:
        query = query.filter(InventoryLog.item_id == item_id)
    
    if transaction_type:
        query = query.filter(InventoryLog.transaction_type == transaction_type)
    
    logs = query.order_by(InventoryLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format logs for frontend
    formatted_logs = []
    for log in logs:
        # Get item and user details
        item = db.query(Item).filter(Item.id == log.item_id).first()
        user = db.query(User).filter(User.id == log.recorded_by).first()
        
        # Map transaction_type to action
        action_mapping = {
            "purchase": "stock_in",
            "sale": "stock_out", 
            "adjustment": "updated",
            "initial_stock": "created",
            "transfer": "updated",
            "return": "stock_in",
            "damage": "stock_out",
            "expired": "removed"
        }
        
        formatted_logs.append({
            "id": log.id,
            "item_id": log.item_id,
            "item_name": item.name if item else "Unknown Item",
            "item_sku": item.sku if item else "Unknown",
            "action": action_mapping.get(log.transaction_type, "updated"),
            "user_id": log.recorded_by,
            "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown User",
            "quantity_before": float(log.quantity_before) if log.quantity_before else None,
            "quantity_after": float(log.quantity_after) if log.quantity_after else None,
            "notes": log.notes,
            "created_at": log.created_at.isoformat()
        })
    
    return formatted_logs

@router.get("/low-stock")
async def get_low_stock_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get items that are low in stock."""
    
    low_stock_items = db.query(Item).filter(Item.current_stock <= Item.minimum_stock).all()
    
    items_data = []
    for item in low_stock_items:
        items_data.append({
            "id": item.id,
            "name": item.name,
            "sku": item.sku,
            "current_stock": item.current_stock,
            "minimum_stock": item.minimum_stock,
            "stock_deficit": item.minimum_stock - item.current_stock
        })
    
    return {
        "low_stock_count": len(items_data),
        "items": items_data
    }

# Request schemas
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    category_id: int
    unit_price: float
    cost_price: Optional[float] = None
    selling_price: float
    current_stock: int = 0
    minimum_stock: int = 0
    maximum_stock: Optional[int] = None
    unit_of_measure: str = "pcs"
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    has_expiry: bool = False
    shelf_life_days: Optional[int] = None
    is_active: bool = True
    is_serialized: bool = False
    tax_rate: float = 0.0
    tax_type: str = "inclusive"

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[int] = None
    minimum_stock: Optional[int] = None
    maximum_stock: Optional[int] = None
    unit_of_measure: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    has_expiry: Optional[bool] = None
    shelf_life_days: Optional[int] = None
    is_active: Optional[bool] = None
    is_serialized: Optional[bool] = None
    tax_rate: Optional[float] = None
    tax_type: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# CRUD endpoints for items
@router.post("/items", response_model=ItemResponse)
async def create_item(
    item_data: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new item."""
    
    # Check if SKU already exists
    existing_item = db.query(Item).filter(Item.sku == item_data.sku).first()
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with SKU '{item_data.sku}' already exists"
        )
    
    # Verify category exists
    category = db.query(ItemCategory).filter(ItemCategory.id == item_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Create new item
    item = Item(
        name=item_data.name,
        description=item_data.description,
        sku=item_data.sku,
        barcode=item_data.barcode,
        category_id=item_data.category_id,
        unit_price=Decimal(str(item_data.unit_price)),
        cost_price=Decimal(str(item_data.cost_price)) if item_data.cost_price else None,
        selling_price=Decimal(str(item_data.selling_price)),
        current_stock=item_data.current_stock,
        minimum_stock=item_data.minimum_stock,
        maximum_stock=item_data.maximum_stock,
        unit_of_measure=item_data.unit_of_measure,
        weight=item_data.weight,
        dimensions=item_data.dimensions,
        has_expiry=item_data.has_expiry,
        shelf_life_days=item_data.shelf_life_days,
        is_active=item_data.is_active,
        is_serialized=item_data.is_serialized,
        tax_rate=Decimal(str(item_data.tax_rate)),
        tax_type=item_data.tax_type
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Create inventory log entry for new item (always create, even if stock is 0)
    log_entry = InventoryLog(
        item_id=item.id,
        transaction_type="initial_stock",
        quantity_before=0,
        quantity_change=item.current_stock,
        quantity_after=item.current_stock,
        unit_cost=item.cost_price,
        transaction_date=func.now(),
        recorded_by=current_user.id,
        notes=f"New item created: {item.name}" + (f" with {item.current_stock} units" if item.current_stock > 0 else " with no initial stock")
    )
    db.add(log_entry)
    db.commit()
    
    return item

@router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_data: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing item."""
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    # Check if SKU already exists (if being updated)
    if item_data.sku and item_data.sku != item.sku:
        existing_item = db.query(Item).filter(Item.sku == item_data.sku).first()
        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item with SKU '{item_data.sku}' already exists"
            )
    
    # Verify category exists (if being updated)
    if item_data.category_id:
        category = db.query(ItemCategory).filter(ItemCategory.id == item_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
    
    # Check if stock is being updated
    old_stock = item.current_stock
    
    # Update item fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['unit_price', 'cost_price', 'selling_price', 'tax_rate'] and value is not None:
            setattr(item, field, Decimal(str(value)))
        else:
            setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    # Create inventory log entry if stock changed
    if 'current_stock' in update_data and item.current_stock != old_stock:
        stock_change = item.current_stock - old_stock
        log_entry = InventoryLog(
            item_id=item.id,
            transaction_type="adjustment",
            quantity_before=old_stock,
            quantity_change=stock_change,
            quantity_after=item.current_stock,
            unit_cost=item.cost_price,
            transaction_date=func.now(),
            recorded_by=current_user.id,
            notes=f"Stock adjustment for {item.name}",
            reason="Manual adjustment"
        )
        db.add(log_entry)
        db.commit()
    
    return item

@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an item."""
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    db.delete(item)
    db.commit()
    
    return {"message": "Item deleted successfully"}

# CRUD endpoints for categories
@router.post("/categories", response_model=ItemCategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new category."""
    
    # Check if category name already exists
    existing_category = db.query(ItemCategory).filter(ItemCategory.name == category_data.name).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{category_data.name}' already exists"
        )
    
    category = ItemCategory(
        name=category_data.name,
        description=category_data.description,
        is_active=category_data.is_active
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return category

@router.put("/categories/{category_id}", response_model=ItemCategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing category."""
    
    category = db.query(ItemCategory).filter(ItemCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category name already exists (if being updated)
    if category_data.name and category_data.name != category.name:
        existing_category = db.query(ItemCategory).filter(ItemCategory.name == category_data.name).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with name '{category_data.name}' already exists"
            )
    
    # Update category fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return category

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category."""
    
    category = db.query(ItemCategory).filter(ItemCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has items
    items_count = db.query(Item).filter(Item.category_id == category_id).count()
    if items_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category. It has {items_count} items associated with it."
        )
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}

@router.get("/items/export")
async def export_items(
    format: str = "csv",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export items to CSV format."""
    
    # Get all items with category names
    items = db.query(Item).join(ItemCategory).all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    headers = [
        'ID', 'Name', 'SKU', 'Description', 'Category', 'Unit Price', 'Cost Price', 
        'Selling Price', 'Current Stock', 'Minimum Stock', 'Maximum Stock', 
        'Unit of Measure', 'Weight', 'Dimensions', 'Has Expiry', 'Shelf Life Days',
        'Is Active', 'Is Serialized', 'Tax Rate', 'Tax Type', 'Barcode', 'Created At'
    ]
    writer.writerow(headers)
    
    # Write data rows
    for item in items:
        category_name = item.category.name if item.category else 'N/A'
        row = [
            item.id,
            item.name,
            item.sku,
            item.description or '',
            category_name,
            float(item.unit_price) if item.unit_price else 0,
            float(item.cost_price) if item.cost_price else 0,
            float(item.selling_price) if item.selling_price else 0,
            item.current_stock,
            item.minimum_stock,
            item.maximum_stock or '',
            item.unit_of_measure,
            item.weight or '',
            item.dimensions or '',
            item.has_expiry,
            item.shelf_life_days or '',
            item.is_active,
            item.is_serialized,
            float(item.tax_rate) if item.tax_rate else 0,
            item.tax_type,
            item.barcode or '',
            item.created_at.isoformat() if item.created_at else ''
        ]
        writer.writerow(row)
    
    # Create response
    output.seek(0)
    content = output.getvalue()
    output.close()
    
    # Return as streaming response
    response = StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=items_export.csv"}
    )
    
    return response 