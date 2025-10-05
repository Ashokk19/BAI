"""
PostgreSQL Inventory Router - Direct database operations without SQLAlchemy.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from services.postgres_inventory_service import PostgresInventoryService
from utils.postgres_auth_deps import get_current_user

router = APIRouter()

# Pydantic models for requests/responses (keeping these for API validation)
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    sku: str
    category_id: int
    unit_price: float
    cost_price: Optional[float] = None
    selling_price: float
    current_stock: float = 0.0
    minimum_stock: float = 0.0
    maximum_stock: Optional[float] = None
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
    description: Optional[str] = None
    barcode: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[float] = None
    minimum_stock: Optional[float] = None
    maximum_stock: Optional[float] = None
    unit_of_measure: Optional[str] = None
    weight: Optional[float] = None
    dimensions: Optional[str] = None
    has_expiry: Optional[bool] = None
    shelf_life_days: Optional[int] = None
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    tax_rate: Optional[float] = None

@router.post("/items")
async def create_item(
    item_data: ItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new inventory item using PostgreSQL."""
    
    # Check if item with same SKU exists
    if PostgresInventoryService.check_item_exists(item_data.sku, current_user["account_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with SKU '{item_data.sku}' already exists"
        )
    
    # Convert Pydantic model to dict and map fields for PostgreSQL
    item_dict = item_data.model_dump()
    
    # Map frontend fields to PostgreSQL database fields
    mapped_data = {
        'item_code': item_dict.get('sku'),
        'name': item_dict.get('name'),
        'selling_price': item_dict.get('selling_price'),
        'description': item_dict.get('description', ''),
        'category': 'General',  # Default category
        'unit': item_dict.get('unit_of_measure', 'pcs'),
        'purchase_price': item_dict.get('cost_price') or item_dict.get('unit_price'),
        'tax_rate': item_dict.get('tax_rate', 18.0),
        'stock_quantity': item_dict.get('current_stock', 0.0),
        'reorder_level': item_dict.get('minimum_stock', 0.0),
        'is_active': item_dict.get('is_active', True),
        'current_stock': item_dict.get('current_stock', 0.0),
        'cost_price': item_dict.get('cost_price') or item_dict.get('unit_price'),
        'minimum_stock': item_dict.get('minimum_stock', 0.0),
        'maximum_stock': item_dict.get('maximum_stock'),
        'sku': item_dict.get('sku'),
        'barcode': item_dict.get('barcode'),
        'category_account_id': current_user["account_id"] if item_dict.get('category_id') else None,
        'category_id': item_dict.get('category_id'),
        'mrp': item_dict.get('selling_price'),
        'weight': item_dict.get('weight'),
        'dimensions': item_dict.get('dimensions'),
        'is_service': False,
        'track_inventory': True,
        'has_expiry': item_dict.get('has_expiry', False),
        'shelf_life_days': item_dict.get('shelf_life_days')
    }
    
    # Validate required fields
    if not mapped_data['item_code']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SKU is required"
        )
    
    if not mapped_data['name']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )
    
    if not mapped_data['selling_price']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selling price is required"
        )
    
    # Create the item
    created_item = PostgresInventoryService.create_item(mapped_data, current_user["account_id"])
    
    if not created_item:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create item"
        )
    
    # Log the creation
    PostgresInventoryService.log_inventory_action(
        item_id=created_item['id'],
        account_id=current_user["account_id"],
        action="item_created",
        notes=f"Item '{created_item['name']}' created",
        user_id=current_user["id"]
    )
    
    return created_item

@router.get("/items")
async def get_items(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """Get list of inventory items using PostgreSQL."""
    
    items = PostgresInventoryService.get_items_list(
        account_id=current_user["account_id"],
        limit=limit,
        offset=offset
    )
    
    return {"items": items, "total": len(items)}

@router.get("/items/{item_id}")
async def get_item(
    item_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific inventory item using PostgreSQL."""
    
    item = PostgresInventoryService.get_item_by_id(item_id, current_user["account_id"])
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    return item

@router.put("/items/{item_id}")
async def update_item(
    item_id: int,
    item_data: ItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an inventory item using PostgreSQL."""
    
    # Check if item exists
    existing_item = PostgresInventoryService.get_item_by_id(item_id, current_user["account_id"])
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    # Convert update data and map fields
    update_dict = item_data.model_dump(exclude_unset=True)
    
    mapped_update_data = {}
    for field, value in update_dict.items():
        if field == 'sku':
            mapped_update_data['item_code'] = value
            mapped_update_data['sku'] = value
        elif field == 'unit_of_measure':
            mapped_update_data['unit'] = value
        elif field == 'unit_price':
            mapped_update_data['purchase_price'] = value
            if 'cost_price' not in update_dict:
                mapped_update_data['cost_price'] = value
        elif field == 'cost_price':
            mapped_update_data['cost_price'] = value
            if 'purchase_price' not in mapped_update_data:
                mapped_update_data['purchase_price'] = value
        elif field in ['tax_type', 'is_serialized']:
            # Skip frontend-only fields
            continue
        else:
            mapped_update_data[field] = value
    
    # Update the item
    updated_item = PostgresInventoryService.update_item(
        item_id=item_id,
        item_data=mapped_update_data,
        account_id=current_user["account_id"]
    )
    
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item"
        )
    
    # Log the update
    PostgresInventoryService.log_inventory_action(
        item_id=item_id,
        account_id=current_user["account_id"],
        action="item_updated",
        notes=f"Item '{updated_item['name']}' updated",
        user_id=current_user["id"]
    )
    
    return updated_item

@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete an inventory item using PostgreSQL."""
    
    # Check if item exists
    existing_item = PostgresInventoryService.get_item_by_id(item_id, current_user["account_id"])
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    # Delete the item (this will also delete related logs in transaction)
    success = PostgresInventoryService.delete_item(item_id, current_user["account_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete item"
        )
    
    return {"message": f"Item '{existing_item['name']}' deleted successfully"}
