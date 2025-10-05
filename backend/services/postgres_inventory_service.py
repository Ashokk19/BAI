"""
PostgreSQL Inventory Service - Direct database operations without SQLAlchemy.
"""

from typing import Optional, Dict, List, Any
from datetime import datetime
from decimal import Decimal
from database.postgres_db import postgres_db

class PostgresInventoryService:
    """Inventory operations using direct PostgreSQL queries."""
    
    @staticmethod
    def create_item(item_data: Dict, account_id: str) -> Optional[Dict]:
        """Create a new inventory item using direct PostgreSQL."""
        
        insert_query = """
        INSERT INTO items (
            account_id, item_code, name, selling_price, description, category, 
            unit, purchase_price, tax_rate, stock_quantity, reorder_level, 
            is_active, current_stock, cost_price, minimum_stock, maximum_stock, 
            sku, barcode, category_account_id, category_id, mrp, weight, 
            dimensions, is_service, track_inventory, has_expiry, shelf_life_days,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id, created_at
        """
        
        params = (
            account_id,
            item_data.get('item_code'),
            item_data.get('name'),
            item_data.get('selling_price'),
            item_data.get('description', ''),
            item_data.get('category', 'General'),
            item_data.get('unit', 'pcs'),
            item_data.get('purchase_price'),
            item_data.get('tax_rate', 18.0),
            item_data.get('stock_quantity', 0.0),
            item_data.get('reorder_level', 0.0),
            item_data.get('is_active', True),
            item_data.get('current_stock', 0.0),
            item_data.get('cost_price'),
            item_data.get('minimum_stock', 0.0),
            item_data.get('maximum_stock'),
            item_data.get('sku'),
            item_data.get('barcode'),
            item_data.get('category_account_id'),
            item_data.get('category_id'),
            item_data.get('mrp'),
            item_data.get('weight'),
            item_data.get('dimensions'),
            item_data.get('is_service', False),
            item_data.get('track_inventory', True),
            item_data.get('has_expiry', False),
            item_data.get('shelf_life_days'),
            datetime.now(),
            datetime.now()
        )
        
        try:
            print(f"Executing insert query with params: {params}")
            result = postgres_db.execute_single(insert_query, params)
            print(f"Insert result: {result}")
            if result:
                # Get the full item data
                return PostgresInventoryService.get_item_by_id(result['id'], account_id)
            return None
        except Exception as e:
            print(f"Error creating item: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def get_item_by_id(item_id: int, account_id: str) -> Optional[Dict]:
        """Get item by ID using direct PostgreSQL."""
        
        query = """
        SELECT * FROM items 
        WHERE id = %s AND account_id = %s
        """
        
        try:
            return postgres_db.execute_single(query, (item_id, account_id))
        except Exception as e:
            print(f"Error getting item: {e}")
            return None
    
    @staticmethod
    def get_items_list(account_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get list of items using direct PostgreSQL."""
        
        query = """
        SELECT * FROM items 
        WHERE account_id = %s 
        ORDER BY created_at DESC 
        LIMIT %s OFFSET %s
        """
        
        try:
            return postgres_db.execute_query(query, (account_id, limit, offset))
        except Exception as e:
            print(f"Error getting items list: {e}")
            return []
    
    @staticmethod
    def update_item(item_id: int, item_data: Dict, account_id: str) -> Optional[Dict]:
        """Update item using direct PostgreSQL."""
        
        # Build dynamic UPDATE query based on provided fields
        set_clauses = []
        params = []
        
        for field, value in item_data.items():
            if value is not None:
                set_clauses.append(f"{field} = %s")
                params.append(value)
        
        if not set_clauses:
            return PostgresInventoryService.get_item_by_id(item_id, account_id)
        
        # Add updated_at
        set_clauses.append("updated_at = %s")
        params.append(datetime.now())
        
        # Add WHERE conditions
        params.extend([item_id, account_id])
        
        query = f"""
        UPDATE items 
        SET {', '.join(set_clauses)}
        WHERE id = %s AND account_id = %s
        RETURNING id
        """
        
        try:
            result = postgres_db.execute_single(query, tuple(params))
            if result:
                return PostgresInventoryService.get_item_by_id(item_id, account_id)
            return None
        except Exception as e:
            print(f"Error updating item: {e}")
            return None
    
    @staticmethod
    def delete_item(item_id: int, account_id: str) -> bool:
        """Delete item and related logs using direct PostgreSQL transaction."""
        
        operations = [
            {
                'query': "DELETE FROM inventory_logs WHERE item_id = %s AND item_account_id = %s",
                'params': (item_id, account_id)
            },
            {
                'query': "DELETE FROM items WHERE id = %s AND account_id = %s",
                'params': (item_id, account_id)
            }
        ]
        
        try:
            return postgres_db.execute_transaction(operations)
        except Exception as e:
            print(f"Error deleting item: {e}")
            return False
    
    @staticmethod
    def check_item_exists(sku: str, account_id: str) -> bool:
        """Check if item with SKU exists using direct PostgreSQL."""
        
        query = """
        SELECT 1 FROM items 
        WHERE item_code = %s AND account_id = %s 
        LIMIT 1
        """
        
        try:
            result = postgres_db.execute_single(query, (sku, account_id))
        except Exception as e:
            print(f"Error checking item existence: {e}")
            return False
    
    @staticmethod
    def get_inventory_summary(account_id: str) -> Dict:
        """Get inventory summary statistics using direct PostgreSQL."""
        
        try:
            # Get total items count
            total_items_query = "SELECT COUNT(*) as count FROM items WHERE account_id = %s"
            total_items_result = postgres_db.execute_single(total_items_query, (account_id,))
            total_items = total_items_result['count'] if total_items_result else 0
            
            # Get low stock items count
            low_stock_query = """
            SELECT COUNT(*) as count FROM items 
            WHERE account_id = %s AND current_stock <= minimum_stock
            """
            low_stock_result = postgres_db.execute_single(low_stock_query, (account_id,))
            low_stock_items = low_stock_result['count'] if low_stock_result else 0
            
            # Get total stock value
            stock_value_query = """
            SELECT SUM(current_stock * cost_price) as total_value 
            FROM items 
            WHERE account_id = %s AND current_stock IS NOT NULL AND cost_price IS NOT NULL
            """
            stock_value_result = postgres_db.execute_single(stock_value_query, (account_id,))
            total_stock_value = float(stock_value_result['total_value']) if stock_value_result and stock_value_result['total_value'] else 0.0
            
            # Get active categories count (assuming categories table exists)
            categories_query = """
            SELECT COUNT(DISTINCT category) as count 
            FROM items 
            WHERE account_id = %s AND category IS NOT NULL
            """
            categories_result = postgres_db.execute_single(categories_query, (account_id,))
            active_categories = categories_result['count'] if categories_result else 0
            
            return {
                "total_items": total_items,
                "low_stock_items": low_stock_items,
                "total_stock_value": total_stock_value,
                "active_categories": active_categories
            }
            
        except Exception as e:
            print(f"Error getting inventory summary: {e}")
            return {
                "total_items": 0,
                "low_stock_items": 0,
                "total_stock_value": 0.0,
                "active_categories": 0
            }

    @staticmethod
    def log_inventory_action(item_id: int, account_id: str, action: str, notes: str = None, user_id: int = None) -> bool:
        """Log an inventory action using direct PostgreSQL."""
        
        insert_query = """
        INSERT INTO inventory_logs (
            item_id, item_account_id, action, notes, recorded_by, recorded_by_account_id, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            item_id,
            account_id,
            action,
            notes,
            user_id,
            account_id,
            datetime.now()
        )
        
        try:
            with postgres_db.get_cursor() as cursor:
                cursor.execute(insert_query, params)
            return True
        except Exception as e:
            print(f"Error logging inventory action: {e}")
            return False
