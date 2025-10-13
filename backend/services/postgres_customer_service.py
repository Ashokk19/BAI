"""
PostgreSQL Customer Service - Direct database operations without SQLAlchemy.
"""

from typing import List, Dict, Optional
from database.postgres_db import postgres_db
from datetime import datetime

class PostgresCustomerService:
    """Customer service using direct PostgreSQL operations."""
    
    @staticmethod
    def get_customers_list(account_id: str, limit: int = 50, offset: int = 0, search: str | None = None, status: str | None = None, state: str | None = None) -> List[Dict]:
        """Get list of customers using direct PostgreSQL with optional filters."""
        
        base = """
        SELECT * FROM customers 
        WHERE account_id = %s
        """
        params: list = [account_id]
        if search:
            base += " AND (LOWER(name) LIKE %s OR LOWER(email) LIKE %s)"
            like = f"%{search.lower()}%"
            params.extend([like, like])
        if status in ("active", "inactive"):
            base += " AND COALESCE(is_active, TRUE) = %s"
            params.append(True if status == "active" else False)
        if state:
            base += " AND LOWER(state) = %s"
            params.append(state.lower())
        base += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        try:
            customers = postgres_db.execute_query(base, tuple(params))
            return customers or []
        except Exception as e:
            print(f"Error getting customers: {e}")
            return []
    
    @staticmethod
    def get_customer_by_id(customer_id: int, account_id: str) -> Optional[Dict]:
        """Get customer by ID using direct PostgreSQL."""
        
        query = """
        SELECT * FROM customers 
        WHERE id = %s AND account_id = %s
        """
        
        try:
            return postgres_db.execute_single(query, (customer_id, account_id))
        except Exception as e:
            print(f"Error getting customer: {e}")
            return None
    
    @staticmethod
    def create_customer(customer_data: Dict, account_id: str) -> Optional[Dict]:
        """Create a new customer using direct PostgreSQL."""
        
        insert_query = """
        INSERT INTO customers (
            account_id, name, email, phone, address, 
            created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """
        
        params = (
            account_id,
            customer_data.get('name'),
            customer_data.get('email'),
            customer_data.get('phone'),
            customer_data.get('address'),
            datetime.now(),
            datetime.now()
        )
        
        try:
            return postgres_db.execute_single(insert_query, params)
        except Exception as e:
            print(f"Error creating customer: {e}")
            return None

    @staticmethod
    def count_customers(account_id: str, search: str | None = None, status: str | None = None, state: str | None = None) -> int:
        """Count customers with same filter set as list."""
        base = "SELECT COUNT(*) AS count FROM customers WHERE account_id = %s"
        params: list = [account_id]
        if search:
            base += " AND (LOWER(name) LIKE %s OR LOWER(email) LIKE %s)"
            like = f"%{search.lower()}%"
            params.extend([like, like])
        if status in ("active", "inactive"):
            base += " AND COALESCE(is_active, TRUE) = %s"
            params.append(True if status == "active" else False)
        if state:
            base += " AND LOWER(state) = %s"
            params.append(state.lower())
        try:
            row = postgres_db.execute_single(base, tuple(params))
            return int(row["count"]) if row else 0
        except Exception as e:
            print(f"Error counting customers: {e}")
            return 0

    @staticmethod
    def toggle_customer_status(customer_id: int, account_id: str) -> Optional[Dict]:
        """Toggle is_active field and return updated row."""
        query = """
        UPDATE customers
        SET is_active = NOT COALESCE(is_active, TRUE), updated_at = NOW()
        WHERE id = %s AND account_id = %s
        RETURNING *
        """
        try:
            return postgres_db.execute_single(query, (customer_id, account_id))
        except Exception as e:
            print(f"Error toggling customer status: {e}")
            return None

    @staticmethod
    def get_customer_summary(account_id: str) -> Dict:
        """Return basic counts for customers."""
        total = PostgresCustomerService.count_customers(account_id)
        active = PostgresCustomerService.count_customers(account_id, status="active")
        inactive = PostgresCustomerService.count_customers(account_id, status="inactive")
        return {"total": total, "active": active, "inactive": inactive}

    @staticmethod
    def get_customer_credit_info(customer_id: int, account_id: str) -> Dict:
        """Placeholder credit info until credit tables are migrated to Postgres services."""
        # Returning neutral defaults to unblock UI
        customer = PostgresCustomerService.get_customer_by_id(customer_id, account_id)
        name = customer.get("name") if customer else ""
        return {
            "customer_id": customer_id,
            "customer_name": name,
            "credit_limit": 0,
            "total_available_credit": 0,
            "number_of_active_credits": 0,
            "credits": [],
        }
    
    @staticmethod
    def update_customer(customer_id: int, customer_data: Dict, account_id: str) -> Optional[Dict]:
        """Update customer using direct PostgreSQL."""
        
        # Build dynamic update query
        update_fields = []
        params = []
        
        for field, value in customer_data.items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        if not update_fields:
            return None
        
        update_fields.append("updated_at = %s")
        params.append(datetime.now())
        params.extend([customer_id, account_id])
        
        update_query = f"""
        UPDATE customers 
        SET {', '.join(update_fields)}
        WHERE id = %s AND account_id = %s
        RETURNING *
        """
        
        try:
            return postgres_db.execute_single(update_query, params)
        except Exception as e:
            print(f"Error updating customer: {e}")
            return None
    
    @staticmethod
    def delete_customer(customer_id: int, account_id: str) -> bool:
        """Delete customer using direct PostgreSQL."""
        
        delete_query = """
        DELETE FROM customers 
        WHERE id = %s AND account_id = %s
        """
        
        try:
            with postgres_db.get_cursor() as cursor:
                cursor.execute(delete_query, (customer_id, account_id))
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting customer: {e}")
            return False
