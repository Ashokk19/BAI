"""
PostgreSQL Inventory Service - Direct database operations without SQLAlchemy.
"""

from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
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
            dimensions, is_service, track_inventory, has_expiry, shelf_life_days, expiry_date,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
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
            item_data.get('expiry_date'),
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
    def get_inventory_logs(account_id: str, limit: int = 50, offset: int = 0, item_id: Optional[int] = None, transaction_type: Optional[str] = None) -> List[Dict]:
        """Fetch inventory logs with optional filters and join item info."""
        base = """
        SELECT il.id, il.item_id, il.item_account_id, il.action, il.notes, il.recorded_by, il.created_at,
               i.name AS item_name, i.item_code AS item_sku,
               COALESCE(u.full_name, u.username, 'User #' || il.recorded_by::text) AS user_name
        FROM inventory_logs il
        LEFT JOIN items i ON i.id = il.item_id AND i.account_id = il.item_account_id
        LEFT JOIN users u ON u.id = il.recorded_by AND u.account_id = il.recorded_by_account_id
        WHERE il.item_account_id = %s
        """
        params: list = [account_id]
        if item_id is not None:
            base += " AND il.item_id = %s"
            params.append(item_id)
        if transaction_type:
            base += " AND il.action = %s"
            params.append(transaction_type)
        base += " ORDER BY il.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        try:
            rows = postgres_db.execute_query(base, tuple(params))
            # Normalize field names to match frontend expectations
            logs: List[Dict[str, Any]] = []
            for r in rows:
                created_val = r.get("created_at")
                try:
                    created_iso = created_val.isoformat() if hasattr(created_val, "isoformat") else str(created_val)
                except Exception:
                    created_iso = str(created_val) if created_val is not None else None

                # Normalize action values for UI
                raw_action = str(r.get("action") or "").strip().lower()
                # unify separators
                norm = raw_action.replace("-", "_").replace(" ", "_")
                if norm in ("", "none", "null"):
                    norm = "unknown"
                # handle compact variants
                if norm == "stockin":
                    norm = "stock_in"
                if norm == "stockout":
                    norm = "stock_out"
                # synonyms mapping
                synonyms = {
                    "item_created": "added",
                    "created": "added",
                    "create": "added",
                    "item_updated": "updated",
                    "update": "updated",
                    "deleted": "removed",
                    "delete": "removed",
                    "remove": "removed",
                }
                action_val = synonyms.get(norm, norm)

                logs.append({
                    "id": r.get("id"),
                    "item_id": r.get("item_id"),
                    "item_name": r.get("item_name"),
                    "item_sku": r.get("item_sku"),
                    "action": action_val,
                    "user_id": r.get("recorded_by"),
                    "user_name": r.get("user_name") or (f"User #{r.get('recorded_by')}" if r.get('recorded_by') is not None else "Unknown"),
                    "quantity_before": None,
                    "quantity_after": None,
                    "notes": r.get("notes"),
                    "created_at": created_iso,
                })
            return logs
        except Exception as e:
            print(f"Error getting inventory logs: {e}")
            return []

    @staticmethod
    def get_expiry_tracking(account_id: str) -> List[Dict]:
        """Return items with expiry information where available."""
        query = """
        SELECT id, name, item_code AS sku, category_id, current_stock, has_expiry, shelf_life_days, created_at, expiry_date
        FROM items
        WHERE account_id = %s AND COALESCE(has_expiry, FALSE) = TRUE
        ORDER BY created_at DESC
        """
        try:
            items = postgres_db.execute_query(query, (account_id,))
            results: List[Dict[str, Any]] = []
            now = datetime.now()
            for it in items:
                expiry_date = it.get("expiry_date")
                shelf = it.get("shelf_life_days")
                computed_expiry = None
                if expiry_date:
                    try:
                        # psycopg returns datetime, leave as-is
                        computed_expiry = expiry_date
                    except Exception:
                        computed_expiry = None
                elif shelf:
                    try:
                        computed_expiry = it.get("created_at") + timedelta(days=int(shelf))
                    except Exception:
                        computed_expiry = None
                days_until = None
                status = "unknown"
                if computed_expiry:
                    try:
                        delta = computed_expiry - now
                        days_until = delta.days
                        status = "expired" if days_until < 0 else ("expiring_soon" if days_until <= 30 else "ok")
                    except Exception:
                        pass
                results.append({
                    "id": it.get("id"),
                    "name": it.get("name"),
                    "sku": it.get("sku"),
                    "category_id": it.get("category_id"),
                    "current_stock": float(it.get("current_stock")) if it.get("current_stock") is not None else 0,
                    "has_expiry": True,
                    "shelf_life_days": it.get("shelf_life_days"),
                    "created_at": it.get("created_at"),
                    "days_until_expiry": days_until if days_until is not None else 0,
                    "expiry_date": computed_expiry.isoformat() if computed_expiry else None,
                    "status": status,
                })
            return results
        except Exception as e:
            print(f"Error getting expiry tracking: {e}")
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
            return result is not None
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

    @staticmethod
    def get_categories(account_id: str) -> List[Dict]:
        """Return categories for an account.

        Merges explicitly created categories (categories table) with
        distinct category names derived from items.
        """
        try:
            # 1) Fetch explicit categories (ensure table exists)
            PostgresInventoryService._ensure_categories_table()
            cat_rows = postgres_db.execute_query(
                """
                SELECT id, name, description, COALESCE(is_active, TRUE) AS is_active, created_at
                FROM categories
                WHERE account_id = %s
                ORDER BY name
                """,
                (account_id,)
            )

            categories_by_name: Dict[str, Dict[str, Any]] = {}
            for r in cat_rows:
                key = (r.get("name") or "General").strip().lower()
                categories_by_name[key] = {
                    "id": r.get("id"),
                    "name": r.get("name") or "General",
                    "description": r.get("description") or "",
                    "is_active": bool(r.get("is_active", True)),
                    "created_at": r.get("created_at"),
                }

            # 2) Add derived names from items (that don't already exist)
            derived_rows = postgres_db.execute_query(
                """
                SELECT DISTINCT category AS name
                FROM items
                WHERE account_id = %s AND category IS NOT NULL
                """,
                (account_id,)
            )
            for r in derived_rows:
                name = (r.get("name") or "General").strip()
                key = name.lower()
                if key not in categories_by_name:
                    categories_by_name[key] = {
                        "id": 0,
                        "name": name,
                        "description": "",
                        "is_active": True,
                        "created_at": datetime.now().isoformat(),
                    }

            categories = list(categories_by_name.values())
            if not categories:
                categories = [{
                    "id": 1,
                    "name": "General",
                    "description": "",
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                }]
            # Sort by name
            categories.sort(key=lambda c: (c.get("name") or "").lower())
            return categories
        except Exception as e:
            print(f"Error getting categories: {e}")
            return [{
                "id": 1,
                "name": "General",
                "description": "",
                "is_active": True,
                "created_at": datetime.now().isoformat(),
            }]

    @staticmethod
    def get_categories_with_stats(account_id: str) -> List[Dict]:
        """Return categories with aggregated stats. Include explicit categories with zero items."""
        try:
            # Aggregated stats from items by category name
            stats_rows = postgres_db.execute_query(
                """
                SELECT 
                    category AS name,
                    COUNT(*) AS total_items,
                    SUM(CASE WHEN COALESCE(is_active, TRUE) THEN 1 ELSE 0 END) AS active_items,
                    COALESCE(SUM(COALESCE(current_stock,0) * COALESCE(cost_price,0)), 0) AS total_stock_value,
                    COALESCE(SUM(COALESCE(current_stock,0)), 0) AS total_current_stock,
                    SUM(CASE WHEN COALESCE(current_stock,0) <= COALESCE(minimum_stock,0) THEN 1 ELSE 0 END) AS low_stock_items,
                    SUM(CASE WHEN COALESCE(current_stock,0) = 0 THEN 1 ELSE 0 END) AS out_of_stock_items,
                    SUM(CASE WHEN COALESCE(has_expiry, FALSE) THEN 1 ELSE 0 END) AS expiry_items,
                    MAX(created_at) AS created_at
                FROM items
                WHERE account_id = %s AND category IS NOT NULL
                GROUP BY category
                """,
                (account_id,)
            )

            stats_by_name: Dict[str, Dict[str, Any]] = {}
            for r in stats_rows:
                name = (r.get("name") or "General").strip()
                stats_by_name[name.lower()] = {
                    "id": 0,
                    "name": name,
                    "description": "",
                    "is_active": True,
                    "created_at": r.get("created_at"),
                    "total_items": int(r.get("total_items", 0) or 0),
                    "active_items": int(r.get("active_items", 0) or 0),
                    "total_stock_value": float(r.get("total_stock_value", 0) or 0),
                    "total_current_stock": float(r.get("total_current_stock", 0) or 0),
                    "low_stock_items": int(r.get("low_stock_items", 0) or 0),
                    "out_of_stock_items": int(r.get("out_of_stock_items", 0) or 0),
                    "expiry_items": int(r.get("expiry_items", 0) or 0),
                }

            # Bring in explicit categories; if missing in stats, add zeros
            PostgresInventoryService._ensure_categories_table()
            cat_rows = postgres_db.execute_query(
                """
                SELECT id, name, description, COALESCE(is_active, TRUE) AS is_active, created_at
                FROM categories
                WHERE account_id = %s
                """,
                (account_id,)
            )
            for r in cat_rows:
                name = (r.get("name") or "General").strip()
                key = name.lower()
                if key not in stats_by_name:
                    stats_by_name[key] = {
                        "id": r.get("id"),
                        "name": name,
                        "description": r.get("description") or "",
                        "is_active": bool(r.get("is_active", True)),
                        "created_at": r.get("created_at"),
                        "total_items": 0,
                        "active_items": 0,
                        "total_stock_value": 0.0,
                        "total_current_stock": 0.0,
                        "low_stock_items": 0,
                        "out_of_stock_items": 0,
                        "expiry_items": 0,
                    }

            result = list(stats_by_name.values())
            if not result:
                result = [{
                    "id": 1,
                    "name": "General",
                    "description": "",
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                    "total_items": 0,
                    "active_items": 0,
                    "total_stock_value": 0.0,
                    "total_current_stock": 0.0,
                    "low_stock_items": 0,
                    "out_of_stock_items": 0,
                    "expiry_items": 0,
                }]
            # Sort by name
            result.sort(key=lambda c: (c.get("name") or "").lower())
            return result
        except Exception as e:
            print(f"Error getting categories with stats: {e}")
            return []

    @staticmethod
    def _ensure_categories_table() -> None:
        """Create categories table if it doesn't exist (idempotent)."""
        try:
            with postgres_db.get_cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS public.categories (
                        id BIGSERIAL PRIMARY KEY,
                        account_id VARCHAR(100) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        description TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_account_name
                    ON public.categories(account_id, name)
                    """
                )
                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_categories_account
                    ON public.categories(account_id)
                    """
                )
        except Exception as e:
            print(f"Error ensuring categories table: {e}")

    @staticmethod
    def create_category(category_data: Dict, account_id: str) -> Optional[Dict]:
        """Create a category for an account."""
        try:
            PostgresInventoryService._ensure_categories_table()
            result = postgres_db.execute_single(
                """
                INSERT INTO categories (account_id, name, description, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, description, is_active, created_at
                """,
                (
                    account_id,
                    category_data.get("name"),
                    category_data.get("description"),
                    category_data.get("is_active", True),
                    datetime.now(),
                ),
            )
            if result:
                return {
                    "id": result.get("id"),
                    "name": result.get("name"),
                    "description": result.get("description") or "",
                    "is_active": bool(result.get("is_active", True)),
                    "created_at": result.get("created_at"),
                }
            return None
        except Exception as e:
            print(f"Error creating category: {e}")
            return None

    @staticmethod
    def get_category_by_id(category_id: int, account_id: str) -> Optional[Dict]:
        """Get a single category by id for an account."""
        try:
            PostgresInventoryService._ensure_categories_table()
            result = postgres_db.execute_single(
                """
                SELECT id, name, description, COALESCE(is_active, TRUE) AS is_active, created_at
                FROM categories
                WHERE account_id = %s AND id = %s
                """,
                (account_id, category_id),
            )
            if result:
                return {
                    "id": result.get("id"),
                    "name": result.get("name"),
                    "description": result.get("description") or "",
                    "is_active": bool(result.get("is_active", True)),
                    "created_at": result.get("created_at"),
                }
            return None
        except Exception as e:
            print(f"Error getting category: {e}")
            return None

    @staticmethod
    def update_category(category_id: int, category_data: Dict, account_id: str) -> Optional[Dict]:
        """Update a category and return the updated record."""
        try:
            PostgresInventoryService._ensure_categories_table()
            set_clauses = []
            params: List[Any] = []
            for field in ("name", "description", "is_active"):
                if field in category_data:
                    set_clauses.append(f"{field} = %s")
                    params.append(category_data.get(field))
            set_clauses.append("updated_at = %s")
            params.append(datetime.now())
            params.extend([account_id, category_id])
            query = f"""
                UPDATE categories
                SET {', '.join(set_clauses)}
                WHERE account_id = %s AND id = %s
                RETURNING id
            """
            result = postgres_db.execute_single(query, tuple(params))
            if result:
                return PostgresInventoryService.get_category_by_id(category_id, account_id)
            return None
        except Exception as e:
            print(f"Error updating category: {e}")
            return None

    @staticmethod
    def delete_category(category_id: int, account_id: str) -> bool:
        """Delete a category. Does not touch items; they will keep their text category name."""
        try:
            PostgresInventoryService._ensure_categories_table()
            result = postgres_db.execute_single(
                """
                DELETE FROM categories
                WHERE account_id = %s AND id = %s
                RETURNING id
                """,
                (account_id, category_id),
            )
            return bool(result)
        except Exception as e:
            print(f"Error deleting category: {e}")
            return False
