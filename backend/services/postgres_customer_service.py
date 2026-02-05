"""
PostgreSQL Customer Service - Direct database operations without SQLAlchemy.
"""

from typing import List, Dict, Optional, Any
from database.postgres_db import postgres_db
from datetime import datetime, timedelta
import psycopg2.extras

class PostgresCustomerService:
    """Customer service using direct PostgreSQL operations."""
    
    @staticmethod
    def _ensure_customer_columns() -> None:
        """Ensure rich customer columns exist (idempotent)."""
        ddl_statements = [
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(200)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile VARCHAR(20)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(255)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10)",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN",
            "ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT"
        ]
        try:
            with postgres_db.get_cursor() as cursor:
                for ddl in ddl_statements:
                    cursor.execute(ddl)
        except Exception as e:
            print(f"Error ensuring customers columns: {e}")
    
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
    def create_customer(customer_data: Dict[str, Any], account_id: str) -> Optional[Dict]:
        """Create a new customer using direct PostgreSQL with rich fields."""
        
        PostgresCustomerService._ensure_customer_columns()
        now = datetime.now()
        # Allowed columns in customers table
        allowed = {
            "account_id", "name", "email", "phone", "address", "state",
            "customer_code", "company_name", "contact_person", "first_name", "last_name",
            "mobile", "website", "billing_address", "shipping_address", "city", "country",
            "postal_code", "customer_type", "tax_number", "gst_number", "credit_limit",
            "payment_terms", "currency", "is_active", "is_verified", "notes", "created_at", "updated_at"
        }
        data: Dict[str, Any] = dict(customer_data or {})
        data.update({
            "account_id": account_id,
            "created_at": now,
            "updated_at": now,
        })
        # Ensure minimal required field
        if not data.get("name"):
            return None
        # Filter to allowed columns and non-None values
        columns: List[str] = []
        values: List[Any] = []
        for k, v in data.items():
            if k in allowed and v is not None:
                columns.append(k)
                values.append(v)
        if not columns:
            return None
        placeholders = ", ".join(["%s"] * len(values))
        insert_query = f"INSERT INTO customers ({', '.join(columns)}) VALUES ({placeholders}) RETURNING *"
        try:
            # Create the customer
            customer = postgres_db.execute_single(insert_query, tuple(values))
            
            # If credit_limit is provided and > 0, create an initial credit entry
            if customer and data.get("credit_limit") and float(data["credit_limit"]) > 0:
                try:
                    with postgres_db.get_connection() as conn:
                        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                        
                        # Generate credit number
                        cursor.execute("SELECT COUNT(*) as count FROM customer_credits WHERE account_id = %s", (account_id,))
                        count_result = cursor.fetchone()
                        count = count_result["count"] if count_result else 0
                        credit_number = f"CR-{account_id}-{datetime.now().year}-{(count + 1):04d}"
                        
                        # Create initial credit entry
                        cursor.execute("""
                            INSERT INTO customer_credits (
                                account_id, credit_number, credit_date, customer_id,
                                credit_type, credit_reason, status, original_amount, 
                                used_amount, remaining_amount, expiry_date, auto_expire,
                                description, created_by
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """, (
                            account_id,
                            credit_number,
                            datetime.now(),
                            customer["id"],
                            "manual",
                            "Initial credit limit",
                            "active",
                            float(data["credit_limit"]),
                            0,
                            float(data["credit_limit"]),
                            datetime.now() + timedelta(days=365),  # 1 year expiry
                            True,
                            f"Initial credit of {data['credit_limit']} for new customer",
                            1  # System created
                        ))
                        
                        conn.commit()
                        cursor.close()
                        print(f"✅ Created initial credit of {data['credit_limit']} for customer {customer['id']}")
                except Exception as credit_error:
                    print(f"⚠️ Failed to create initial credit: {credit_error}")
                    import traceback
                    traceback.print_exc()
                    # Don't fail customer creation if credit creation fails
            
            return customer
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
        """Get customer credit information from customer_credits table."""
        with postgres_db.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Get customer name
                customer = PostgresCustomerService.get_customer_by_id(customer_id, account_id)
                name = customer.get("name") if customer else ""
                
                # Get customer's credit limit from customers table
                cursor.execute("""
                    SELECT COALESCE(credit_limit, 0) as credit_limit
                    FROM customers
                    WHERE id = %s AND account_id = %s
                """, (customer_id, account_id))
                result = cursor.fetchone()
                credit_limit = float(result[0]) if result else 0
                
                # Get active credits with remaining balance
                print(f"🔍 Fetching credits for customer_id={customer_id}, account_id={account_id}")
                cursor.execute("""
                    SELECT 
                        id,
                        credit_number,
                        credit_type,
                        original_amount,
                        remaining_amount,
                        used_amount,
                        expiry_date,
                        status,
                        credit_date,
                        CASE 
                            WHEN expiry_date IS NOT NULL AND expiry_date < CURRENT_TIMESTAMP THEN TRUE 
                            ELSE FALSE 
                        END as is_expired
                    FROM customer_credits
                    WHERE customer_id = %s 
                    AND account_id = %s 
                    AND status = 'active'
                    AND remaining_amount > 0
                    AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
                    ORDER BY credit_date ASC
                """, (customer_id, account_id))
                
                print(f"📊 Query executed, fetching results...")
                
                credits = []
                total_available = 0
                
                for row in cursor.fetchall():
                    credit = {
                        "id": row[0],
                        "credit_number": row[1],
                        "credit_type": row[2],
                        "original_amount": float(row[3]),
                        "remaining_amount": float(row[4]),
                        "used_amount": float(row[5]),
                        "expiry_date": row[6].isoformat() if row[6] else None,
                        "status": row[7],
                        "credit_date": row[8].isoformat() if row[8] else None,
                        "is_expired": row[9]
                    }
                    credits.append(credit)
                    total_available += float(row[4])
                    print(f"💳 Credit {row[1]} ({row[2]}): remaining={row[4]}, running_total={total_available}")
                
                print(f"💰 Total available credit for customer {customer_id}: {total_available} from {len(credits)} credits")
                
                return {
                    "customer_id": customer_id,
                    "customer_name": name,
                    "credit_limit": credit_limit,
                    "total_available_credit": total_available,
                    "number_of_active_credits": len(credits),
                    "credits": credits,
                }
            finally:
                cursor.close()
    
    @staticmethod
    def update_customer(customer_id: int, customer_data: Dict[str, Any], account_id: str) -> Optional[Dict]:
        """Update customer using direct PostgreSQL (rich fields supported)."""
        
        PostgresCustomerService._ensure_customer_columns()
        allowed = {
            "name", "email", "phone", "address", "state",
            "customer_code", "company_name", "contact_person", "first_name", "last_name",
            "mobile", "website", "billing_address", "shipping_address", "city", "country",
            "postal_code", "customer_type", "tax_number", "gst_number", "credit_limit",
            "payment_terms", "currency", "is_active", "is_verified", "notes"
        }
        # Build dynamic update query
        update_fields: List[str] = []
        params: List[Any] = []
        for field, value in (customer_data or {}).items():
            if field in allowed and value is not None:
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
            return postgres_db.execute_single(update_query, tuple(params))
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
