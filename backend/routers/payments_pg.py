"""PostgreSQL-backed payments router."""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from schemas.payment_schema import PaymentCreate, PaymentResponse
from utils.postgres_auth_deps import get_current_user

router = APIRouter()

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a payment using direct PostgreSQL queries."""

    account_id = current_user["account_id"]
    user_id = current_user["id"]

    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # 1. Generate a unique payment number
            payment_number = f"PAY-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
            created_at = datetime.utcnow()

            # 2. Insert the new payment record
            cursor.execute(
                """
                INSERT INTO payments (
                    account_id, payment_number, payment_date, payment_type, payment_direction,
                    amount, currency, payment_method, payment_status, reference_number,
                    notes, invoice_id, customer_id, recorded_by, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING *
                """,
                (
                    account_id, payment_number, payment_data.payment_date, payment_data.payment_type, 'incoming',
                    payment_data.amount, payment_data.currency or 'INR', payment_data.payment_method, payment_data.payment_status,
                    payment_data.reference_number, payment_data.notes, payment_data.invoice_id, payment_data.customer_id,
                    user_id, created_at
                )
            )
            new_payment = cursor.fetchone()

            # 3. If payment method is credit, deduct from customer credits
            if payment_data.payment_method == "credit" and payment_data.customer_id and payment_data.invoice_id:
                payment_amount = Decimal(str(payment_data.amount))
                remaining_to_pay = payment_amount
                
                # Get active credits for customer ordered by date (FIFO)
                cursor.execute("""
                    SELECT id, remaining_amount
                    FROM customer_credits
                    WHERE customer_id = %s 
                    AND account_id = %s
                    AND status = 'active'
                    AND remaining_amount > 0
                    AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
                    ORDER BY credit_date ASC
                """, (payment_data.customer_id, account_id))
                
                credits = cursor.fetchall()
                
                # Process each credit until payment is covered
                for credit in credits:
                    if remaining_to_pay <= 0:
                        break
                    
                    credit_id = credit["id"]
                    available = Decimal(str(credit["remaining_amount"]))
                    amount_to_use = min(available, remaining_to_pay)
                    
                    # Update credit amounts
                    cursor.execute("""
                        UPDATE customer_credits
                        SET used_amount = used_amount + %s,
                            remaining_amount = remaining_amount - %s,
                            status = CASE 
                                WHEN remaining_amount - %s <= 0 THEN 'used'
                                ELSE status
                            END
                        WHERE id = %s AND account_id = %s
                    """, (amount_to_use, amount_to_use, amount_to_use, credit_id, account_id))
                    
                    # Create credit transaction
                    cursor.execute("""
                        INSERT INTO credit_transactions (
                            account_id, credit_id, transaction_type, transaction_date,
                            invoice_id, amount, running_balance, description,
                            reference_number, performed_by
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        account_id,
                        credit_id,
                        'usage',
                        payment_data.payment_date,
                        payment_data.invoice_id,
                        amount_to_use,
                        available - amount_to_use,
                        f"Payment for invoice via credit",
                        payment_number,
                        user_id
                    ))
                    
                    remaining_to_pay -= amount_to_use
                    print(f"✅ Used ₹{amount_to_use} from credit {credit_id}, remaining to pay: ₹{remaining_to_pay}")

            # 4. If an invoice is associated, update its paid_amount and status
            if new_payment and new_payment.get("invoice_id"):
                cursor.execute(
                    "SELECT total_amount, paid_amount FROM invoices WHERE id = %s AND account_id = %s",
                    (new_payment["invoice_id"], account_id)
                )
                invoice = cursor.fetchone()

                if invoice:
                    new_paid_amount = (invoice.get("paid_amount") or Decimal("0")) + new_payment["amount"]
                    
                    new_status = invoice.get("status")
                    if new_paid_amount >= invoice["total_amount"]:
                        new_status = "paid"
                    elif new_paid_amount > 0:
                        new_status = "partially_paid"

                    cursor.execute(
                        """
                        UPDATE invoices
                        SET paid_amount = %s, status = %s, updated_at = %s
                        WHERE id = %s AND account_id = %s
                        """,
                        (new_paid_amount, new_status, created_at, new_payment["invoice_id"], account_id)
                    )

            conn.commit()
            
            # Convert Decimal fields to float for JSON serialization
            for key, value in new_payment.items():
                if isinstance(value, Decimal):
                    new_payment[key] = float(value)

            return new_payment

        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create payment: {e}"
            )


@router.get("/")
async def get_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    invoice_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get payments with optional filters. Returns paginated response matching frontend expectations."""
    
    account_id = current_user["account_id"]
    
    try:
        with postgres_db.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Build query with optional filters
            query = "SELECT * FROM payments WHERE account_id = %s"
            count_query = "SELECT COUNT(*) as total FROM payments WHERE account_id = %s"
            params = [account_id]
            count_params = [account_id]
            
            if invoice_id is not None:
                query += " AND invoice_id = %s"
                count_query += " AND invoice_id = %s"
                params.append(invoice_id)
                count_params.append(invoice_id)
            
            if customer_id is not None:
                query += " AND customer_id = %s"
                count_query += " AND customer_id = %s"
                params.append(customer_id)
                count_params.append(customer_id)
            
            # Get total count
            cursor.execute(count_query, count_params)
            total = cursor.fetchone()['total']
            
            # Get paginated results
            query += " ORDER BY payment_date DESC, id DESC LIMIT %s OFFSET %s"
            params.extend([limit, skip])
            
            cursor.execute(query, params)
            payments = cursor.fetchall()
            
            # Convert Decimal fields to float for JSON serialization
            result = []
            for payment in payments:
                payment_dict = dict(payment)
                for key, value in payment_dict.items():
                    if isinstance(value, Decimal):
                        payment_dict[key] = float(value)
                result.append(payment_dict)
            
            # Calculate pagination metadata
            total_pages = (total + limit - 1) // limit if limit > 0 else 1
            current_page = (skip // limit) + 1 if limit > 0 else 1
            
            # Return response matching frontend expectations
            return {
                "payments": result,
                "total": total,
                "page": current_page,
                "per_page": limit,
                "total_pages": total_pages
            }
            
    except Exception as e:
        # If table doesn't exist, return empty response matching frontend expectations
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg or "undefined" in error_msg:
            print(f"Payments table doesn't exist yet, returning empty response")
            return {
                "payments": [],
                "total": 0,
                "page": 1,
                "per_page": limit,
                "total_pages": 0
            }
        
        # Log the error but return empty response for now to prevent frontend crashes
        print(f"Error fetching payments: {e}")
        return {
            "payments": [],
            "total": 0,
            "page": 1,
            "per_page": limit,
            "total_pages": 0
        }
