"""
BAI Backend Inventory Router

This module contains the inventory routes for items, categories, and inventory management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.item import Item, ItemCategory
from models.inventory import InventoryLog
from services.inventory_service import InventoryService
from pydantic import BaseModel
import csv
import io
import pandas as pd
from datetime import datetime
from decimal import Decimal
import re

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

class ItemCategoryWithStatsResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    # Statistics from items table
    total_items: int
    active_items: int
    total_stock_value: float
    total_current_stock: int
    low_stock_items: int
    out_of_stock_items: int
    expiry_items: int
    
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
    expiry_date: Optional[datetime]
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
    
    # Create a bytes buffer from the string content
    bytes_buffer = io.BytesIO(content.encode('utf-8'))
    
    # Log the export operation
    InventoryService.log_export_operation(
        db=db,
        exported_items_count=len(items),
        user_id=current_user.id,
        export_format=format,
        notes=f"Exported {len(items)} items to {format.upper()} format"
    )
    db.commit()
    
    # Return as streaming response
    response = StreamingResponse(
        bytes_buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=items_export.csv"}
    )
    
    return response

@router.post("/items/import")
async def import_items(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import items from CSV file."""
    
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:  # xlsx
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate required columns
        required_columns = ['Name', 'SKU', 'Category', 'Unit Price', 'Selling Price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        imported_count = 0
        errors = []
        
        # Get category mapping
        categories = db.query(ItemCategory).all()
        category_map = {cat.name: cat.id for cat in categories}
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Validate required fields
                if pd.isna(row['Name']) or pd.isna(row['SKU']):
                    errors.append(f"Row {index + 2}: Name and SKU are required")
                    continue
                
                # Check if SKU already exists
                existing_item = db.query(Item).filter(Item.sku == row['SKU']).first()
                if existing_item:
                    errors.append(f"Row {index + 2}: SKU '{row['SKU']}' already exists")
                    continue
                
                # Get category ID
                category_name = row['Category']
                category_id = category_map.get(category_name)
                if not category_id:
                    errors.append(f"Row {index + 2}: Category '{category_name}' not found")
                    continue
                
                # Create item
                item = Item(
                    name=row['Name'],
                    sku=row['SKU'],
                    description=row.get('Description', ''),
                    category_id=category_id,
                    unit_price=Decimal(str(row['Unit Price'])),
                    cost_price=Decimal(str(row.get('Cost Price', 0))) if pd.notna(row.get('Cost Price')) else None,
                    selling_price=Decimal(str(row['Selling Price'])),
                    current_stock=int(row.get('Current Stock', 0)) if pd.notna(row.get('Current Stock')) else 0,
                    minimum_stock=int(row.get('Minimum Stock', 0)) if pd.notna(row.get('Minimum Stock')) else 0,
                    maximum_stock=int(row.get('Maximum Stock')) if pd.notna(row.get('Maximum Stock')) else None,
                    unit_of_measure=row.get('Unit of Measure', 'pcs'),
                    weight=float(row.get('Weight')) if pd.notna(row.get('Weight')) else None,
                    dimensions=row.get('Dimensions', ''),
                    has_expiry=bool(row.get('Has Expiry', False)),
                    shelf_life_days=int(row.get('Shelf Life Days')) if pd.notna(row.get('Shelf Life Days')) else None,
                    is_active=bool(row.get('Is Active', True)),
                    is_serialized=bool(row.get('Is Serialized', False)),
                    tax_rate=Decimal(str(row.get('Tax Rate', 0))),
                    tax_type=row.get('Tax Type', 'inclusive'),
                    barcode=row.get('Barcode', '')
                )
                
                db.add(item)
                db.flush()  # Get the ID without committing
                
                # Create inventory log
                log_entry = InventoryLog(
                    item_id=item.id,
                    transaction_type="initial_stock",
                    quantity_before=0,
                    quantity_change=item.current_stock,
                    quantity_after=item.current_stock,
                    unit_cost=item.cost_price,
                    transaction_date=func.now(),
                    recorded_by=current_user.id,
                    notes=f"Item imported from {file.filename}"
                )
                db.add(log_entry)
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                continue
        
        # Commit all changes
        db.commit()
        
        # Log the import operation for successfully imported items
        if imported_count > 0:
            # Create a summary log entry for the import operation
            InventoryService.create_inventory_log(
                db=db,
                item_id=1,  # Using first item as reference for bulk operations
                transaction_type="bulk_import",
                quantity_before=0,
                quantity_after=imported_count,
                user_id=current_user.id,
                notes=f"Bulk import completed: {imported_count} items imported from file '{file.filename}', {len(errors)} errors",
                transaction_reference=file.filename
            )
            db.commit()
        
        # Prepare response
        response_data = {
            "success": True,
            "message": f"Successfully imported {imported_count} items",
            "imported_count": imported_count,
            "total_rows": len(df),
            "errors": errors
        }
        
        if errors:
            response_data["message"] += f" with {len(errors)} errors"
        
        return response_data
        
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty"
        )
    except pd.errors.ParserError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing file: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )

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

@router.get("/categories/with-stats", response_model=List[ItemCategoryWithStatsResponse])
async def get_categories_with_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get item categories with statistics from items table."""
    
    categories = db.query(ItemCategory).filter(ItemCategory.is_active == True).all()
    categories_with_stats = []
    
    for category in categories:
        # Get all items in this category
        items_query = db.query(Item).filter(Item.category_id == category.id)
        all_items = items_query.all()
        
        # Calculate statistics
        total_items = len(all_items)
        active_items = len([item for item in all_items if item.is_active])
        
        # Stock and value calculations
        total_stock_value = sum(item.current_stock * item.unit_price for item in all_items if item.unit_price)
        total_current_stock = sum(item.current_stock for item in all_items)
        
        # Low stock and out of stock items
        low_stock_items = len([item for item in all_items if item.current_stock <= item.minimum_stock and item.current_stock > 0])
        out_of_stock_items = len([item for item in all_items if item.current_stock == 0])
        
        # Expiry items count
        expiry_items = len([item for item in all_items if item.has_expiry])
        
        # Create response object
        category_stats = ItemCategoryWithStatsResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            is_active=category.is_active,
            created_at=category.created_at,
            total_items=total_items,
            active_items=active_items,
            total_stock_value=float(total_stock_value),
            total_current_stock=total_current_stock,
            low_stock_items=low_stock_items,
            out_of_stock_items=out_of_stock_items,
            expiry_items=expiry_items
        )
        
        categories_with_stats.append(category_stats)
    
    return categories_with_stats

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
        expiry_date = None
        
        # Use expiry_date if set, otherwise calculate from shelf_life_days
        if item.expiry_date:
            expiry_date = item.expiry_date
        elif item.shelf_life_days:
            # Calculate expiry date based on creation date + shelf life
            expiry_date = item.created_at + timedelta(days=item.shelf_life_days)
        
        if expiry_date:
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
    
    # Use left join to include logs even when items are deleted
    query = db.query(InventoryLog).join(User, InventoryLog.recorded_by == User.id)
    
    if item_id:
        query = query.filter(InventoryLog.item_id == item_id)
    
    if transaction_type:
        query = query.filter(InventoryLog.transaction_type == transaction_type)
    
    logs = query.order_by(InventoryLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format logs for frontend
    formatted_logs = []
    for log in logs:
        # Get item details (may be None if item was deleted)
        item = db.query(Item).filter(Item.id == log.item_id).first()
        user = db.query(User).filter(User.id == log.recorded_by).first()
        
        # Map transaction_type to action
        action_mapping = {
            "purchase": "stock_in",
            "sale": "stock_out", 
            "adjustment": "updated",
            "initial_stock": "added",
            "item_created": "added",
            "item_updated": "updated",
            "item_deleted": "removed",
            "bulk_import": "added",
            "bulk_export": "updated",
            "transfer": "updated",
            "return": "stock_in",
            "damage": "stock_out",
            "expired": "removed"
        }
        
        # For deleted items, extract info from notes if available
        item_name = "Unknown Item"
        item_sku = "Unknown"
        
        if item:
            item_name = item.name
            item_sku = item.sku
        elif log.transaction_type == "item_deleted" and log.notes:
            # Try to extract item name from deletion notes
            # Notes format: "Item 'ItemName' (SKU: SKUValue) deleted"
            name_match = re.search(r"Item '([^']+)'", log.notes)
            sku_match = re.search(r"SKU: ([^)]+)", log.notes)
            if name_match:
                item_name = name_match.group(1)
            if sku_match:
                item_sku = sku_match.group(1)
        
        formatted_logs.append({
            "id": log.id,
            "item_id": log.item_id,
            "item_name": item_name,
            "item_sku": item_sku,
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
    expiry_date: Optional[datetime] = None
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
    expiry_date: Optional[datetime] = None
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
        expiry_date=item_data.expiry_date,
        is_active=item_data.is_active,
        is_serialized=item_data.is_serialized,
        tax_rate=Decimal(str(item_data.tax_rate)),
        tax_type=item_data.tax_type
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Log item creation
    InventoryService.log_item_creation(
        db=db,
        item=item,
        user_id=current_user.id,
        notes=f"New item '{item.name}' created with {item.current_stock} units"
    )
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
    
    # Track changes for logging
    old_stock = item.current_stock
    changes = []
    
    # Fields to exclude from automatic change logging
    excluded_fields = ['weight', 'dimensions']
    
    # Update item fields and track changes
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        # Skip logging for excluded fields
        if field in excluded_fields:
            setattr(item, field, value)
            continue
            
        old_value = getattr(item, field)
        if field in ['unit_price', 'cost_price', 'selling_price', 'tax_rate'] and value is not None:
            new_value = Decimal(str(value))
            setattr(item, field, new_value)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} → {new_value}")
        else:
            setattr(item, field, value)
            if old_value != value:
                changes.append(f"{field}: {old_value} → {value}")
    
    db.commit()
    db.refresh(item)
    
    # Log the update if any changes were made
    if changes:
        InventoryService.log_item_update(
            db=db,
            item=item,
            old_stock=old_stock,
            user_id=current_user.id,
            changes=changes
        )
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
    
    # Store item details for logging before deletion
    item_name = item.name
    item_sku = item.sku
    final_stock = item.current_stock
    
    # Log the deletion before actually deleting
    InventoryService.log_item_deletion(
        db=db,
        item_id=item.id,
        item_name=item_name,
        item_sku=item_sku,
        final_stock=final_stock,
        user_id=current_user.id
    )
    
    # Commit the log entry
    db.commit()
    
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