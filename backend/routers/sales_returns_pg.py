"""
Sales Returns Router - PostgreSQL Version
Handles sales returns with direct PostgreSQL queries
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
from decimal import Decimal
import psycopg2.extras
from database.postgres_db import postgres_db
from utils.auth_deps import get_current_user

router = APIRouter()

def generate_return_number(account_id: str) -> str:
    """Generate a new return number for the account"""
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT return_number FROM sales_returns 
                WHERE account_id = %s 
                ORDER BY id DESC LIMIT 1
            """, (account_id,))
            result = cur.fetchone()
            
            if result:
                try:
                    last_number = int(result[0].split('-')[-1])
                    next_number = last_number + 1
                except:
                    next_number = 1
            else:
                next_number = 1
            
            current_year = datetime.now().year
            return f"RET-{account_id}-{current_year}-{next_number:03d}"
        finally:
            cur.close()


@router.get("/")
async def get_sales_returns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated list of sales returns"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Build query with filters
            where_clauses = ["sr.account_id = %s"]
            params = [account_id]
            
            if search:
                where_clauses.append("""(
                    sr.return_number ILIKE %s OR
                    c.first_name ILIKE %s OR
                    c.last_name ILIKE %s OR
                    c.company_name ILIKE %s OR
                    sr.return_reason ILIKE %s OR
                    i.invoice_number ILIKE %s
                )""")
                search_term = f"%{search}%"
                params.extend([search_term] * 6)
            
            if status:
                where_clauses.append("sr.status = %s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("sr.customer_id = %s")
                params.append(customer_id)
            
            where_sql = " AND ".join(where_clauses)
            
            # Get total count
            cur.execute(f"""
                SELECT COUNT(*) as total
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE {where_sql}
            """, params)
            total = cur.fetchone()["total"]
            
            # Get paginated data
            cur.execute(f"""
                SELECT 
                    sr.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    i.invoice_number
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE {where_sql}
                ORDER BY sr.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, skip])
            
            returns = cur.fetchall()
            
            # Calculate pagination
            total_pages = (total + limit - 1) // limit if total > 0 else 0
            current_page = (skip // limit) + 1
            
            return {
                "returns": returns,
                "total": total,
                "page": current_page,
                "per_page": limit,
                "total_pages": total_pages
            }
        finally:
            cur.close()


@router.post("/")
async def create_sales_return(
    return_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new sales return"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]  # Fixed: use 'id' not 'user_id'
    
    print(f"🔍 Creating sales return for account: {account_id}")
    print(f"📦 Return data: {return_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Generate return number
            return_number = generate_return_number(account_id)
            print(f"📝 Generated return number: {return_number}")
            
            # Insert sales return
            cur.execute("""
                INSERT INTO sales_returns (
                    account_id, return_number, invoice_id, customer_id,
                    return_date, return_reason, status, refund_amount,
                    refund_method, notes, created_by, updated_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id, return_number, created_at
            """, (
                account_id,
                return_number,
                return_data.get("invoice_id"),
                return_data.get("customer_id"),
                return_data.get("return_date", datetime.now().date()),
                return_data.get("return_reason"),
                return_data.get("status", "Pending"),
                return_data.get("refund_amount", 0),
                return_data.get("refund_method"),
                return_data.get("notes"),
                user_id,
                user_id
            ))
            
            result = cur.fetchone()
            conn.commit()
            
            print(f"✅ Sales return created: {result['id']}")
            
            return {
                "id": result["id"],
                "return_number": result["return_number"],
                "message": "Sales return created successfully"
            }
        except Exception as e:
            print(f"❌ Error creating sales return: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            cur.close()


@router.get("/{return_id}")
async def get_sales_return(
    return_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a single sales return by ID"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cur.execute("""
                SELECT 
                    sr.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    i.invoice_number
                FROM sales_returns sr
                LEFT JOIN customers c ON c.id = sr.customer_id AND c.account_id = sr.account_id
                LEFT JOIN invoices i ON i.id = sr.invoice_id AND i.account_id = sr.account_id
                WHERE sr.id = %s AND sr.account_id = %s
            """, (return_id, account_id))
            
            return_data = cur.fetchone()
            
            if not return_data:
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            return return_data
        finally:
            cur.close()


@router.put("/{return_id}")
async def update_sales_return(
    return_id: int,
    return_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a sales return"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]  # Fixed: use 'id' not 'user_id'
    
    print(f"🔄 Updating sales return {return_id} with data: {return_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            # Check if return exists
            cur.execute(
                "SELECT id FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            # Update sales return
            cur.execute("""
                UPDATE sales_returns SET
                    return_reason = COALESCE(%s, return_reason),
                    status = COALESCE(%s, status),
                    refund_status = COALESCE(%s, refund_status),
                    refund_amount = COALESCE(%s, refund_amount),
                    refund_method = COALESCE(%s, refund_method),
                    notes = COALESCE(%s, notes),
                    updated_by = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND account_id = %s
            """, (
                return_data.get("return_reason"),
                return_data.get("status"),
                return_data.get("refund_status"),
                return_data.get("refund_amount"),
                return_data.get("refund_method"),
                return_data.get("notes"),
                user_id,
                return_id,
                account_id
            ))
            
            conn.commit()
            print(f"✅ Successfully updated sales return {return_id}")
            return {"message": "Sales return updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error updating sales return: {str(e)}")
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.delete("/{return_id}")
async def delete_sales_return(
    return_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sales return"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            # Check if return exists
            cur.execute(
                "SELECT id FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Sales return not found")
            
            # Delete the return
            cur.execute(
                "DELETE FROM sales_returns WHERE id = %s AND account_id = %s",
                (return_id, account_id)
            )
            
            conn.commit()
            return {"message": "Sales return deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()
