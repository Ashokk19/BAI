"""PostgreSQL-backed shipments router."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from psycopg2.extras import RealDictCursor

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user
from templates.shipment_document_template import get_shipment_document_html

router = APIRouter()


def _generate_shipment_number(cursor: RealDictCursor, account_id: str) -> str:
    """Generate the next shipment number for an account."""
    cursor.execute(
        "SELECT shipment_number FROM shipments WHERE account_id = %s ORDER BY id DESC LIMIT 1",
        (account_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get("shipment_number"):
        return f"SHP-{account_id}-{datetime.now().year}-001"
    
    last_number = row["shipment_number"]
    try:
        suffix = int(str(last_number).split("-")[-1])
    except ValueError:
        suffix = 0
    next_suffix = suffix + 1
    return f"SHP-{account_id}-{datetime.now().year}-{next_suffix:03d}"


def _generate_delivery_note_number(cursor: RealDictCursor, account_id: str) -> str:
    """Generate the next delivery note number for an account."""
    cursor.execute(
        "SELECT delivery_note_number FROM delivery_notes WHERE account_id = %s ORDER BY id DESC LIMIT 1",
        (account_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get("delivery_note_number"):
        return f"DN-{account_id}-{datetime.now().year}-001"
    
    last_number = row["delivery_note_number"]
    try:
        suffix = int(str(last_number).split("-")[-1])
    except ValueError:
        suffix = 0
    next_suffix = suffix + 1
    return f"DN-{account_id}-{datetime.now().year}-{next_suffix:03d}"


@router.post("/")
async def create_shipment(
    shipment_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Create a new shipment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Generate shipment number
            shipment_number = _generate_shipment_number(cursor, account_id)
            
            # Map frontend field names to database column names
            shipment_date = shipment_data.get("shipment_date") or shipment_data.get("ship_date") or datetime.now().date()
            expected_delivery = shipment_data.get("expected_delivery") or shipment_data.get("expected_delivery_date")
            weight_kg = shipment_data.get("weight_kg") or shipment_data.get("total_weight")
            
            # Insert shipment
            cursor.execute(
                """
                INSERT INTO shipments (
                    account_id, shipment_number, customer_id, invoice_id, shipment_date,
                    carrier, tracking_number, shipping_method, expected_delivery,
                    actual_delivery, status, weight_kg, shipping_cost,
                    shipping_address, package_count, dimensions, insurance_cost, 
                    special_instructions, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, shipment_number, created_at
                """,
                (
                    account_id,
                    shipment_number,
                    shipment_data.get("customer_id"),
                    shipment_data.get("invoice_id"),
                    shipment_date,
                    shipment_data.get("carrier"),
                    shipment_data.get("tracking_number"),
                    shipment_data.get("shipping_method"),
                    expected_delivery,
                    shipment_data.get("actual_delivery") or shipment_data.get("actual_delivery_date"),
                    shipment_data.get("status", "pending"),
                    weight_kg,
                    shipment_data.get("shipping_cost", 0),
                    shipment_data.get("shipping_address"),
                    shipment_data.get("package_count", 1),
                    shipment_data.get("dimensions"),
                    shipment_data.get("insurance_cost", 0),
                    shipment_data.get("special_instructions"),
                    shipment_data.get("notes"),
                ),
            )
            
            result = cursor.fetchone()
            conn.commit()
            
            return {
                "id": result["id"],
                "shipment_number": result["shipment_number"],
                "message": "Shipment created successfully",
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create shipment: {e}",
            )
        finally:
            cursor.close()


@router.get("/")
async def get_shipments(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=1000),
    invoice_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get paginated list of shipments."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            where_clause = "account_id = %s"
            params = [account_id]
            
            if invoice_id:
                where_clause += " AND invoice_id = %s"
                params.append(invoice_id)
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM shipments WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            # Get shipments
            query = f"""
                SELECT * FROM shipments
                WHERE {where_clause}
                ORDER BY shipment_date DESC, id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            shipments = cursor.fetchall()
            
            # Convert Decimal to float and map field names for frontend
            result = []
            for ship in shipments:
                ship_dict = dict(ship)
                for key, value in ship_dict.items():
                    if isinstance(value, Decimal):
                        ship_dict[key] = float(value)
                
                # Map database field names to frontend expected names
                ship_dict['ship_date'] = ship_dict.get('shipment_date')
                ship_dict['expected_delivery_date'] = ship_dict.get('expected_delivery')
                ship_dict['actual_delivery_date'] = ship_dict.get('actual_delivery')
                ship_dict['total_weight'] = ship_dict.get('weight_kg')
                
                result.append(ship_dict)
            
            return {
                "shipments": result,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch shipments: {e}",
            )
        finally:
            cursor.close()


# Delivery Notes endpoints (must come before /{shipment_id} routes)

@router.post("/delivery-notes/")
async def create_delivery_note(
    note_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Create a new delivery note."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Generate delivery note number
            note_number = _generate_delivery_note_number(cursor, account_id)
            
            cursor.execute(
                """
                INSERT INTO delivery_notes (
                    account_id, delivery_note_number, invoice_id, shipment_id,
                    delivery_date, recipient_name, status, notes, recipient_signature
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, delivery_note_number, created_at
                """,
                (
                    account_id,
                    note_number,
                    note_data.get("invoice_id"),
                    note_data.get("shipment_id"),
                    note_data.get("delivery_date") or datetime.now().date(),
                    note_data.get("received_by"),  # Maps to recipient_name
                    note_data.get("status", "pending"),
                    note_data.get("notes"),
                    note_data.get("signature_url"),  # Maps to recipient_signature
                ),
            )
            
            result = cursor.fetchone()
            conn.commit()
            
            return {
                "id": result["id"],
                "delivery_note_number": result["delivery_note_number"],
                "message": "Delivery note created successfully",
            }
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create delivery note: {e}",
            )
        finally:
            cursor.close()


@router.get("/delivery-notes/")
async def get_delivery_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=1000),
    invoice_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get paginated list of delivery notes."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            where_clause = "account_id = %s"
            params = [account_id]
            
            if invoice_id:
                where_clause += " AND invoice_id = %s"
                params.append(invoice_id)
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as total FROM delivery_notes WHERE {where_clause}", params)
            total = cursor.fetchone()["total"]
            
            # Get delivery notes
            query = f"""
                SELECT * FROM delivery_notes
                WHERE {where_clause}
                ORDER BY delivery_date DESC, id DESC
                LIMIT %s OFFSET %s
            """
            params.extend([limit, skip])
            cursor.execute(query, params)
            notes = cursor.fetchall()
            
            # Map database fields to frontend field names
            mapped_notes = []
            for note in notes:
                note_dict = dict(note)
                # Map status -> delivery_status
                note_dict['delivery_status'] = note_dict.pop('status', 'pending')
                # Map recipient_name -> received_by
                if 'recipient_name' in note_dict:
                    note_dict['received_by'] = note_dict.pop('recipient_name')
                mapped_notes.append(note_dict)
            
            return {
                "delivery_notes": mapped_notes,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch delivery notes: {e}",
            )
        finally:
            cursor.close()


@router.get("/delivery-notes/by-invoice/{invoice_id}")
async def get_delivery_notes_by_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get delivery notes for a specific invoice."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                SELECT * FROM delivery_notes
                WHERE account_id = %s AND invoice_id = %s
                ORDER BY delivery_date DESC
                """,
                (account_id, invoice_id),
            )
            notes = cursor.fetchall()
            
            # Map database fields to frontend field names
            mapped_notes = []
            for note in notes:
                note_dict = dict(note)
                # Map status -> delivery_status
                note_dict['delivery_status'] = note_dict.pop('status', 'pending')
                # Map recipient_name -> received_by
                if 'recipient_name' in note_dict:
                    note_dict['received_by'] = note_dict.pop('recipient_name')
                mapped_notes.append(note_dict)
            
            return mapped_notes
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch delivery notes: {e}",
            )
        finally:
            cursor.close()


@router.put("/delivery-notes/{note_id}")
async def update_delivery_note(
    note_id: int,
    note_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Update a delivery note."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            update_fields = []
            params = []
            
            # Map frontend field names to database column names
            field_mapping = {
                "received_by": "recipient_name",
                "signature_url": "recipient_signature",
                "delivery_status": "status",  # Frontend uses delivery_status
                "status": "status",
                "notes": "notes"
            }
            
            for frontend_field, db_field in field_mapping.items():
                if frontend_field in note_data:
                    update_fields.append(f"{db_field} = %s")
                    params.append(note_data[frontend_field])
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update",
                )
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.extend([account_id, note_id])
            
            query = f"""
                UPDATE delivery_notes
                SET {', '.join(update_fields)}
                WHERE account_id = %s AND id = %s
                RETURNING id, delivery_note_number
            """
            
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Delivery note not found",
                )
            
            conn.commit()
            
            return {
                "id": result["id"],
                "delivery_note_number": result["delivery_note_number"],
                "message": "Delivery note updated successfully",
            }
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update delivery note: {e}",
            )
        finally:
            cursor.close()


@router.delete("/delivery-notes/{note_id}")
async def delete_delivery_note(
    note_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a delivery note."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                "DELETE FROM delivery_notes WHERE account_id = %s AND id = %s RETURNING id",
                (account_id, note_id),
            )
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Delivery note not found",
                )
            
            conn.commit()
            
            return {"message": "Delivery note deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete delivery note: {e}",
            )
        finally:
            cursor.close()


@router.get("/by-invoice/{invoice_id}")
async def get_shipments_by_invoice(
    invoice_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get shipments for a specific invoice."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                """
                SELECT * FROM shipments
                WHERE account_id = %s AND invoice_id = %s
                ORDER BY shipment_date DESC
                """,
                (account_id, invoice_id),
            )
            shipments = cursor.fetchall()
            
            result = []
            for ship in shipments:
                ship_dict = dict(ship)
                for key, value in ship_dict.items():
                    if isinstance(value, Decimal):
                        ship_dict[key] = float(value)
                
                # Map database field names to frontend expected names
                ship_dict['ship_date'] = ship_dict.get('shipment_date')
                ship_dict['expected_delivery_date'] = ship_dict.get('expected_delivery')
                ship_dict['actual_delivery_date'] = ship_dict.get('actual_delivery')
                ship_dict['total_weight'] = ship_dict.get('weight_kg')
                
                result.append(ship_dict)
            
            return result
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch shipments: {e}",
            )
        finally:
            cursor.close()


@router.put("/{shipment_id}")
async def update_shipment(
    shipment_id: int,
    shipment_data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Update a shipment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Map frontend field names to database column names
            field_mapping = {
                "carrier": "carrier",
                "tracking_number": "tracking_number",
                "shipping_method": "shipping_method",
                "expected_delivery": "expected_delivery",
                "expected_delivery_date": "expected_delivery",
                "actual_delivery": "actual_delivery",
                "actual_delivery_date": "actual_delivery",
                "status": "status",
                "weight_kg": "weight_kg",
                "total_weight": "weight_kg",
                "shipping_cost": "shipping_cost",
                "shipping_address": "shipping_address",
                "package_count": "package_count",
                "dimensions": "dimensions",
                "insurance_cost": "insurance_cost",
                "special_instructions": "special_instructions",
                "notes": "notes",
            }
            
            # Build update query dynamically
            update_fields = []
            params = []
            
            for frontend_field, db_field in field_mapping.items():
                if frontend_field in shipment_data:
                    update_fields.append(f"{db_field} = %s")
                    params.append(shipment_data[frontend_field])
            
            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update",
                )
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.extend([account_id, shipment_id])
            
            query = f"""
                UPDATE shipments
                SET {', '.join(update_fields)}
                WHERE account_id = %s AND id = %s
                RETURNING id, shipment_number
            """
            
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Shipment not found",
                )
            
            conn.commit()
            
            return {
                "id": result["id"],
                "shipment_number": result["shipment_number"],
                "message": "Shipment updated successfully",
            }
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update shipment: {e}",
            )
        finally:
            cursor.close()


@router.delete("/{shipment_id}")
async def delete_shipment(
    shipment_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a shipment."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cursor.execute(
                "DELETE FROM shipments WHERE account_id = %s AND id = %s RETURNING id",
                (account_id, shipment_id),
            )
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Shipment not found",
                )
            
            conn.commit()
            
            return {"message": "Shipment deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete shipment: {e}",
            )
        finally:
            cursor.close()


@router.get("/{shipment_id}/download")
async def download_shipment(
    shipment_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Generate and download shipment document."""
    account_id = current_user["account_id"]
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Get shipment details
            cursor.execute(
                """
                SELECT * FROM shipments
                WHERE account_id = %s AND id = %s
                """,
                (account_id, shipment_id),
            )
            shipment = cursor.fetchone()
            
            if not shipment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Shipment not found",
                )
            
            # Get customer details
            cursor.execute(
                """
                SELECT * FROM customers
                WHERE account_id = %s AND id = %s
                """,
                (account_id, shipment["customer_id"]),
            )
            customer = cursor.fetchone()
            
            # Get invoice details if available
            invoice = None
            if shipment.get("invoice_id"):
                cursor.execute(
                    """
                    SELECT * FROM invoices
                    WHERE account_id = %s AND id = %s
                    """,
                    (account_id, shipment["invoice_id"]),
                )
                invoice = cursor.fetchone()
            
            # Convert to dict for template
            shipment_dict = dict(shipment) if shipment else {}
            customer_dict = dict(customer) if customer else {}
            invoice_dict = dict(invoice) if invoice else None
            
            # Generate HTML content
            html_content = get_shipment_document_html(
                shipment_dict,
                customer_dict,
                invoice_dict
            )
            
            return HTMLResponse(content=html_content)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate shipment document: {e}",
            )
        finally:
            cursor.close()
