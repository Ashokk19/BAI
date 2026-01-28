"""
Credits PostgreSQL Router
Handles customer credit operations using direct PostgreSQL connections
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
import psycopg2.extras
from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


def generate_credit_number(account_id: str, conn) -> str:
    """Generate a new credit number"""
    cur = conn.cursor()
    try:
        # Get current year and count
        current_year = datetime.now().year
        cur.execute("""
            SELECT COUNT(*) FROM customer_credits 
            WHERE account_id = %s 
            AND EXTRACT(YEAR FROM credit_date) = %s
        """, (account_id, current_year))
        count = cur.fetchone()[0]
        next_number = count + 1
        return f"CR-{account_id}-{current_year}-{next_number:03d}"
    finally:
        cur.close()


@router.get("/")
async def get_customer_credits(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    credit_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated list of customer credits"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Build query with filters
            where_clauses = ["cc.account_id = %s"]
            params = [account_id]
            
            if search:
                where_clauses.append("""(
                    cc.credit_number ILIKE %s OR
                    c.first_name ILIKE %s OR
                    c.last_name ILIKE %s OR
                    c.company_name ILIKE %s OR
                    cc.credit_reason ILIKE %s
                )""")
                search_term = f"%{search}%"
                params.extend([search_term] * 5)
            
            if status:
                where_clauses.append("cc.status = %s")
                params.append(status)
            
            if customer_id:
                where_clauses.append("cc.customer_id = %s")
                params.append(customer_id)
            
            if credit_type:
                where_clauses.append("cc.credit_type = %s")
                params.append(credit_type)
            
            where_sql = " AND ".join(where_clauses)
            
            # Get total count
            cur.execute(f"""
                SELECT COUNT(*) as total
                FROM customer_credits cc
                LEFT JOIN customers c ON c.id = cc.customer_id AND c.account_id = cc.account_id
                WHERE {where_sql}
            """, params)
            total = cur.fetchone()["total"]
            
            # Get paginated data
            cur.execute(f"""
                SELECT 
                    cc.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    CASE WHEN cc.expiry_date < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END as is_expired,
                    CASE 
                        WHEN cc.status = 'active' 
                        AND cc.remaining_amount > 0 
                        AND (cc.expiry_date IS NULL OR cc.expiry_date > CURRENT_TIMESTAMP) 
                        THEN TRUE 
                        ELSE FALSE 
                    END as is_usable
                FROM customer_credits cc
                LEFT JOIN customers c ON c.id = cc.customer_id AND c.account_id = cc.account_id
                WHERE {where_sql}
                ORDER BY cc.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, skip])
            
            credits = cur.fetchall()
            
            # Calculate pagination
            total_pages = (total + limit - 1) // limit if total > 0 else 0
            current_page = (skip // limit) + 1
            
            return {
                "credits": credits,
                "total": total,
                "page": current_page,
                "per_page": limit,
                "total_pages": total_pages
            }
        finally:
            cur.close()


@router.post("/")
async def create_customer_credit(
    credit_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new customer credit"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]
    
    print(f"🔍 Creating customer credit for account: {account_id}")
    print(f"📦 Credit data: {credit_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Generate credit number
            credit_number = generate_credit_number(account_id, conn)
            print(f"📝 Generated credit number: {credit_number}")
            
            # Insert credit
            cur.execute("""
                INSERT INTO customer_credits (
                    account_id, credit_number, credit_date, customer_id,
                    invoice_id, sales_return_id, credit_type, credit_reason,
                    status, original_amount, used_amount, remaining_amount,
                    expiry_date, auto_expire, minimum_order_amount,
                    usage_limit_per_order, description, internal_notes,
                    customer_notes, created_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                account_id,
                credit_number,
                credit_data.get("credit_date", datetime.now()),
                credit_data["customer_id"],
                credit_data.get("invoice_id"),
                credit_data.get("sales_return_id"),
                credit_data["credit_type"],
                credit_data.get("credit_reason", ""),
                credit_data.get("status", "active"),
                credit_data["original_amount"],
                credit_data.get("used_amount", 0),
                credit_data.get("remaining_amount", credit_data["original_amount"]),
                credit_data.get("expiry_date"),
                credit_data.get("auto_expire", True),
                credit_data.get("minimum_order_amount"),
                credit_data.get("usage_limit_per_order"),
                credit_data.get("description"),
                credit_data.get("internal_notes"),
                credit_data.get("customer_notes"),
                user_id
            ))
            
            credit_id = cur.fetchone()["id"]
            conn.commit()
            
            print(f"✅ Customer credit created: {credit_id}")
            
            # Get the created credit
            cur.execute("""
                SELECT 
                    cc.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    CASE WHEN cc.expiry_date < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END as is_expired,
                    CASE 
                        WHEN cc.status = 'active' 
                        AND cc.remaining_amount > 0 
                        AND (cc.expiry_date IS NULL OR cc.expiry_date > CURRENT_TIMESTAMP) 
                        THEN TRUE 
                        ELSE FALSE 
                    END as is_usable
                FROM customer_credits cc
                LEFT JOIN customers c ON c.id = cc.customer_id AND c.account_id = cc.account_id
                WHERE cc.id = %s AND cc.account_id = %s
            """, (credit_id, account_id))
            
            credit = cur.fetchone()
            return credit
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error creating credit: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.get("/{credit_id}")
async def get_customer_credit(
    credit_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific customer credit"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Get credit with customer info and transactions
            cur.execute("""
                SELECT 
                    cc.*,
                    COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as customer_name,
                    CASE WHEN cc.expiry_date < CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END as is_expired,
                    CASE 
                        WHEN cc.status = 'active' 
                        AND cc.remaining_amount > 0 
                        AND (cc.expiry_date IS NULL OR cc.expiry_date > CURRENT_TIMESTAMP) 
                        THEN TRUE 
                        ELSE FALSE 
                    END as is_usable
                FROM customer_credits cc
                LEFT JOIN customers c ON c.id = cc.customer_id AND c.account_id = cc.account_id
                WHERE cc.id = %s AND cc.account_id = %s
            """, (credit_id, account_id))
            
            credit = cur.fetchone()
            if not credit:
                raise HTTPException(status_code=404, detail="Credit not found")
            
            # Get transactions
            cur.execute("""
                SELECT * FROM credit_transactions
                WHERE credit_id = %s AND account_id = %s
                ORDER BY transaction_date DESC
            """, (credit_id, account_id))
            
            transactions = cur.fetchall()
            credit_dict = dict(credit)
            credit_dict["transactions"] = transactions
            
            return credit_dict
        finally:
            cur.close()


@router.put("/{credit_id}")
async def update_customer_credit(
    credit_id: int,
    credit_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a customer credit"""
    account_id = current_user["account_id"]
    
    print(f"🔄 Updating credit {credit_id} with data: {credit_data}")
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            # Check if credit exists
            cur.execute(
                "SELECT id FROM customer_credits WHERE id = %s AND account_id = %s",
                (credit_id, account_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Credit not found")
            
            # Update credit
            cur.execute("""
                UPDATE customer_credits SET
                    credit_reason = COALESCE(%s, credit_reason),
                    status = COALESCE(%s, status),
                    expiry_date = COALESCE(%s, expiry_date),
                    description = COALESCE(%s, description),
                    internal_notes = COALESCE(%s, internal_notes),
                    customer_notes = COALESCE(%s, customer_notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND account_id = %s
            """, (
                credit_data.get("credit_reason"),
                credit_data.get("status"),
                credit_data.get("expiry_date"),
                credit_data.get("description"),
                credit_data.get("internal_notes"),
                credit_data.get("customer_notes"),
                credit_id,
                account_id
            ))
            
            conn.commit()
            print(f"✅ Successfully updated credit {credit_id}")
            return {"message": "Credit updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error updating credit: {str(e)}")
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.delete("/{credit_id}")
async def delete_customer_credit(
    credit_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a customer credit"""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor()
        try:
            # Check if credit exists
            cur.execute(
                "SELECT id FROM customer_credits WHERE id = %s AND account_id = %s",
                (credit_id, account_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Credit not found")
            
            # Delete credit (transactions will cascade)
            cur.execute(
                "DELETE FROM customer_credits WHERE id = %s AND account_id = %s",
                (credit_id, account_id)
            )
            
            conn.commit()
            return {"message": "Credit deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()


@router.post("/{credit_id}/transactions")
async def create_credit_transaction(
    credit_id: int,
    transaction_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a credit transaction"""
    account_id = current_user["account_id"]
    user_id = current_user["id"]
    
    with postgres_db.get_connection() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            # Get current credit balance
            cur.execute("""
                SELECT remaining_amount FROM customer_credits
                WHERE id = %s AND account_id = %s
            """, (credit_id, account_id))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Credit not found")
            
            current_balance = result["remaining_amount"]
            amount = transaction_data["amount"]
            
            # Calculate new balance
            if transaction_data["transaction_type"] == "usage":
                new_balance = current_balance - amount
                if new_balance < 0:
                    raise HTTPException(status_code=400, detail="Insufficient credit balance")
            else:  # adjustment, refund
                new_balance = current_balance + amount
            
            # Insert transaction
            cur.execute("""
                INSERT INTO credit_transactions (
                    account_id, credit_id, transaction_type, transaction_date,
                    invoice_id, amount, running_balance, description,
                    reference_number, performed_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                account_id,
                credit_id,
                transaction_data["transaction_type"],
                transaction_data.get("transaction_date", datetime.now()),
                transaction_data.get("invoice_id"),
                amount,
                new_balance,
                transaction_data.get("description"),
                transaction_data.get("reference_number"),
                user_id
            ))
            
            transaction_id = cur.fetchone()["id"]
            
            # Update credit balance
            cur.execute("""
                UPDATE customer_credits
                SET remaining_amount = %s,
                    used_amount = used_amount + %s
                WHERE id = %s AND account_id = %s
            """, (new_balance, amount if transaction_data["transaction_type"] == "usage" else 0, credit_id, account_id))
            
            conn.commit()
            
            # Get the created transaction
            cur.execute("""
                SELECT * FROM credit_transactions
                WHERE id = %s AND account_id = %s
            """, (transaction_id, account_id))
            
            return cur.fetchone()
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            cur.close()
