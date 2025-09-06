"""
BAI Backend Inventory Service

This module contains business logic for inventory operations and logging.
"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from models.inventory import InventoryLog
from models.item import Item
from models.user import User
from typing import Optional

class InventoryService:
    """Service class for inventory operations and logging."""
    
    @staticmethod
    def create_inventory_log(
        db: Session,
        item_id: int,
        transaction_type: str,
        quantity_before: float,
        quantity_after: float,
        user_id: int,
        account_id: str,
        notes: Optional[str] = None,
        transaction_reference: Optional[str] = None,
        unit_cost: Optional[float] = None
    ) -> InventoryLog:
        """
        Create an inventory log entry.
        
        Args:
            db: Database session
            item_id: ID of the item
            transaction_type: Type of transaction (created, updated, deleted, exported, imported)
            quantity_before: Quantity before the change
            quantity_after: Quantity after the change
            user_id: ID of the user performing the action
            account_id: Account ID for multi-tenant support
            notes: Optional notes about the transaction
            transaction_reference: Optional reference (e.g., import filename)
            unit_cost: Optional unit cost at time of transaction
            
        Returns:
            Created InventoryLog instance
        """
        quantity_change = quantity_after - quantity_before
        
        log_entry = InventoryLog(
            item_id=item_id,
            account_id=account_id,
            transaction_type=transaction_type,
            transaction_reference=transaction_reference,
            quantity_before=Decimal(str(quantity_before)),
            quantity_change=Decimal(str(quantity_change)),
            quantity_after=Decimal(str(quantity_after)),
            unit_cost=Decimal(str(unit_cost)) if unit_cost else None,
            transaction_date=datetime.now(),
            notes=notes,
            recorded_by=user_id
        )
        
        db.add(log_entry)
        return log_entry
    
    @staticmethod
    def log_item_creation(
        db: Session,
        item: Item,
        user_id: int,
        notes: Optional[str] = None
    ) -> InventoryLog:
        """Log when a new item is created."""
        return InventoryService.create_inventory_log(
            db=db,
            item_id=item.id,
            transaction_type="item_created",
            quantity_before=0,
            quantity_after=item.current_stock,
            user_id=user_id,
            account_id=item.account_id,
            notes=notes or f"New item '{item.name}' created with initial stock",
            unit_cost=float(item.unit_price) if item.unit_price else None
        )
    
    @staticmethod
    def log_item_update(
        db: Session,
        item: Item,
        old_stock: int,
        user_id: int,
        changes: list,
        notes: Optional[str] = None
    ) -> InventoryLog:
        """Log when an item is updated."""
        change_description = ", ".join(changes) if changes else "Item details updated"
        notes_text = notes or f"Item '{item.name}' updated: {change_description}"
        
        return InventoryService.create_inventory_log(
            db=db,
            item_id=item.id,
            transaction_type="item_updated",
            quantity_before=old_stock,
            quantity_after=item.current_stock,
            user_id=user_id,
            account_id=item.account_id,
            notes=notes_text,
            unit_cost=float(item.unit_price) if item.unit_price else None
        )
    
    @staticmethod
    def log_item_deletion(
        db: Session,
        item_id: int,
        item_name: str,
        item_sku: str,
        final_stock: int,
        user_id: int,
        account_id: str,
        notes: Optional[str] = None
    ) -> InventoryLog:
        """Log when an item is deleted."""
        return InventoryService.create_inventory_log(
            db=db,
            item_id=item_id,
            transaction_type="item_deleted",
            quantity_before=final_stock,
            quantity_after=0,
            user_id=user_id,
            account_id=account_id,
            notes=notes or f"Item '{item_name}' (SKU: {item_sku}) deleted",
        )
    
    @staticmethod
    def log_bulk_import(
        db: Session,
        imported_items: list,
        user_id: int,
        filename: str,
        total_imported: int,
        total_failed: int = 0
    ):
        """Log bulk import operation."""
        for item_data in imported_items:
            InventoryService.create_inventory_log(
                db=db,
                item_id=item_data['item_id'],
                transaction_type="bulk_import",
                quantity_before=0,
                quantity_after=item_data.get('stock', 0),
                user_id=user_id,
                account_id=item_data.get('account_id', ''),
                notes=f"Item imported from file '{filename}' - Total: {total_imported} success, {total_failed} failed",
                transaction_reference=filename,
                unit_cost=item_data.get('unit_cost')
            )
    
    @staticmethod
    def log_export_operation(
        db: Session,
        exported_items_count: int,
        user_id: int,
        account_id: str,
        export_format: str = "csv",
        notes: Optional[str] = None
    ):
        """Log export operation - create a general log entry."""
        log_entry = InventoryLog(
            item_id=1,  # Using first item as reference
            account_id=account_id,
            transaction_type="bulk_export", 
            transaction_reference=f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{export_format}",
            quantity_before=Decimal('0'),
            quantity_change=Decimal('0'),
            quantity_after=Decimal('0'),
            transaction_date=datetime.now(),
            notes=notes or f"Exported {exported_items_count} items to {export_format.upper()} format",
            recorded_by=user_id
        )
        
        db.add(log_entry)
        return log_entry
    
    @staticmethod
    def validate_invoice_items_stock(db: Session, items: list, account_id: str) -> dict:
        """
        Validate that all items have sufficient stock for invoice creation.
        
        Args:
            db: Database session
            items: List of invoice items with item_id and quantity
            account_id: Account ID for filtering items
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "all_valid": True,
            "errors": []
        }
        
        for item_data in items:
            item = db.query(Item).filter(
                Item.id == item_data.item_id,
                Item.account_id == account_id
            ).first()
            
            if not item:
                validation_result["all_valid"] = False
                validation_result["errors"].append(f"Item with ID {item_data.item_id} not found")
                continue
            
            if item.current_stock < item_data.quantity:
                validation_result["all_valid"] = False
                validation_result["errors"].append(
                    f"Insufficient stock for {item.name}. Available: {item.current_stock}, Required: {item_data.quantity}"
                )
        
        return validation_result
    
    @staticmethod
    def reduce_stock_for_sale(
        db: Session,
        item_id: int,
        quantity_sold: float,
        user_id: int,
        account_id: str,
        invoice_id: int = None,
        transaction_reference: str = None,
        notes: str = None
    ) -> dict:
        """
        Reduce stock for a sale and log the transaction.
        
        Args:
            db: Database session
            item_id: ID of the item
            quantity_sold: Quantity being sold
            user_id: ID of the user performing the action
            account_id: Account ID for filtering items
            invoice_id: Optional invoice ID for reference
            transaction_reference: Optional reference (e.g., invoice number)
            notes: Optional notes
            
        Returns:
            Dictionary with operation results
        """
        item = db.query(Item).filter(
            Item.id == item_id,
            Item.account_id == account_id
        ).first()
        
        if not item:
            return {
                "success": False,
                "error": f"Item with ID {item_id} not found"
            }
        
        if item.current_stock < quantity_sold:
            return {
                "success": False,
                "error": f"Insufficient stock for {item.name}. Available: {item.current_stock}, Required: {quantity_sold}"
            }
        
        # Record original stock
        original_stock = item.current_stock
        
        # Reduce stock
        item.current_stock -= quantity_sold
        
        # Log the transaction
        InventoryService.create_inventory_log(
            db=db,
            item_id=item_id,
            transaction_type="sale",
            quantity_before=original_stock,
            quantity_after=item.current_stock,
            user_id=user_id,
            account_id=account_id,
            notes=notes or f"Stock reduced for sale - Invoice: {transaction_reference or invoice_id}",
            transaction_reference=transaction_reference,
            unit_cost=float(item.unit_price) if item.unit_price else None
        )
        
        return {
            "success": True,
            "original_stock": original_stock,
            "new_stock": item.current_stock,
            "quantity_sold": quantity_sold
        }