"""
BAI Backend Customer Router - PostgreSQL Version

This module contains the customer routes for customer management.
Now using direct PostgreSQL operations instead of SQLAlchemy.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from utils.auth_deps import get_current_user
from services.postgres_customer_service import PostgresCustomerService
from schemas.customer_schema import CustomerCreate as CustomerCreateSchema
from schemas.customer_schema import CustomerUpdate as CustomerUpdateSchema

router = APIRouter()

# Pydantic models
class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    account_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

@router.get("/")
async def get_customers(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
):
    """Get paginated customers list in the shape expected by frontend."""
    
    customers = PostgresCustomerService.get_customers_list(
        account_id=current_user["account_id"],
        limit=limit,
        offset=skip,
        search=search,
        status=status,
        state=state,
    )
    # Map DB rows to the richer frontend Customer shape (prefer new columns)
    mapped: list[dict] = []
    for c in customers or []:
        created_val = c.get("created_at")
        updated_val = c.get("updated_at")
        try:
            created_iso = created_val.isoformat() if hasattr(created_val, "isoformat") else str(created_val)
        except Exception:
            created_iso = str(created_val) if created_val is not None else None
        if updated_val is not None:
            try:
                updated_iso = updated_val.isoformat() if hasattr(updated_val, "isoformat") else str(updated_val)
            except Exception:
                updated_iso = str(updated_val)
        else:
            updated_iso = None
        # Prefer explicit columns when present
        company_name = (c.get("company_name") or c.get("name") or "").strip() or None
        contact_person = c.get("contact_person")
        first_name = c.get("first_name") or ""
        last_name = c.get("last_name") or ""
        email = c.get("email")
        phone = c.get("phone")
        mobile = c.get("mobile")
        website = c.get("website")
        billing_address = c.get("billing_address") or c.get("address")
        shipping_address = c.get("shipping_address")
        city = c.get("city")
        state_val = c.get("state")
        country = c.get("country")
        postal_code = c.get("postal_code")
        customer_type = c.get("customer_type") or "individual"
        tax_number = c.get("tax_number")
        gst_number = c.get("gst_number")
        credit_limit_val = c.get("credit_limit")
        try:
            credit_limit = float(credit_limit_val) if credit_limit_val is not None else 0
        except Exception:
            credit_limit = 0
        payment_terms = c.get("payment_terms") or "immediate"
        currency = c.get("currency") or "INR"
        is_active = bool(c.get("is_active", True))
        is_verified = bool(c.get("is_verified", False))
        notes = c.get("notes")
        # Derive a stable customer code from column or id
        cid = c.get("id")
        customer_code = c.get("customer_code")
        if not customer_code:
            base = (company_name or "")
            customer_code = f"CUST{int(cid):06d}" if isinstance(cid, (int,)) else (f"CUST-{base[:6].upper()}" if base else "CUST000000")
        mapped.append({
            "id": cid,
            "customer_code": customer_code,
            "company_name": company_name,
            "contact_person": contact_person,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "mobile": mobile,
            "website": website,
            "billing_address": billing_address,
            "shipping_address": shipping_address,
            "city": city,
            "state": state_val,
            "country": country,
            "postal_code": postal_code,
            "customer_type": customer_type,
            "tax_number": tax_number,
            "gst_number": gst_number,
            "credit_limit": credit_limit,
            "payment_terms": payment_terms,
            "currency": currency,
            "is_active": is_active,
            "is_verified": is_verified,
            "notes": notes,
            "created_at": created_iso or "",
            "updated_at": updated_iso,
        })
    total = PostgresCustomerService.count_customers(
        account_id=current_user["account_id"],
        search=search,
        status=status,
        state=state,
    )
    total_pages = (total + limit - 1) // limit if limit else 1
    page = (skip // limit) + 1 if limit else 1
    return {
        "customers": mapped,
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": total_pages,
    }

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific customer using PostgreSQL."""
    
    customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Cast datetimes to strings
    if isinstance(customer.get("created_at"), (object,)):
        try:
            customer["created_at"] = customer["created_at"].isoformat()
        except Exception:
            customer["created_at"] = str(customer.get("created_at"))
    if customer.get("updated_at") is not None:
        try:
            customer["updated_at"] = customer["updated_at"].isoformat()
        except Exception:
            customer["updated_at"] = str(customer.get("updated_at"))
    return {
        "id": customer.get("id"),
        "account_id": customer.get("account_id"),
        "name": customer.get("name"),
        "email": customer.get("email"),
        "phone": customer.get("phone"),
        "address": customer.get("address"),
        "created_at": customer.get("created_at"),
        "updated_at": customer.get("updated_at"),
    }

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Create a new customer using PostgreSQL.

    Accepts a flexible payload from the frontend and maps it to minimal DB fields
    to avoid strict validation issues.
    """
    
    payload = customer_data or {}
    name = (
        (payload.get("company_name") or "").strip()
        or (f"{(payload.get('first_name') or '').strip()} {(payload.get('last_name') or '').strip()}".strip())
        or (payload.get("contact_person") or "").strip()
        or (payload.get("email") or "").split("@")[0]
        or (payload.get("customer_code") or "Customer")
    )
    phone = (payload.get("mobile") or payload.get("phone") or None)
    address = (
        payload.get("billing_address")
        or payload.get("shipping_address")
        or ", ".join(
            [
                p for p in [payload.get("city"), payload.get("state"), payload.get("country"), payload.get("postal_code")] if p
            ]
        )
        or None
    )
    customer_full = {
        "name": name,
        "email": payload.get("email"),
        "phone": phone,
        "address": address,
        "state": payload.get("state"),
        "customer_code": payload.get("customer_code"),
        "company_name": payload.get("company_name"),
        "contact_person": payload.get("contact_person"),
        "first_name": payload.get("first_name"),
        "last_name": payload.get("last_name"),
        "mobile": payload.get("mobile"),
        "website": payload.get("website"),
        "billing_address": payload.get("billing_address"),
        "shipping_address": payload.get("shipping_address"),
        "city": payload.get("city"),
        "country": payload.get("country"),
        "postal_code": payload.get("postal_code"),
        "customer_type": payload.get("customer_type", "individual"),
        "tax_number": payload.get("tax_number"),
        "gst_number": payload.get("gst_number"),
        "credit_limit": payload.get("credit_limit"),
        "payment_terms": payload.get("payment_terms", "immediate"),
        "currency": payload.get("currency", "INR"),
        "is_active": payload.get("is_active", True),
        "is_verified": payload.get("is_verified", False),
        "notes": payload.get("notes"),
    }
    created_customer = PostgresCustomerService.create_customer(customer_full, current_user["account_id"])
    
    if not created_customer:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create customer"
        )
    # Ensure response fields meet schema (cast datetimes to ISO strings)
    if isinstance(created_customer.get("created_at"), (object,)):
        try:
            created_customer["created_at"] = created_customer["created_at"].isoformat()
        except Exception:
            created_customer["created_at"] = str(created_customer.get("created_at"))
    if created_customer.get("updated_at") is not None:
        try:
            created_customer["updated_at"] = created_customer["updated_at"].isoformat()
        except Exception:
            created_customer["updated_at"] = str(created_customer.get("updated_at"))
    return {
        "id": created_customer.get("id"),
        "account_id": created_customer.get("account_id"),
        "name": created_customer.get("name"),
        "email": created_customer.get("email"),
        "phone": created_customer.get("phone"),
        "address": created_customer.get("address"),
        "created_at": created_customer.get("created_at"),
        "updated_at": created_customer.get("updated_at"),
    }

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update a customer using PostgreSQL."""
    
    # Check if customer exists
    existing_customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    if not existing_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    payload = customer_data or {}
    mapped_update: dict = {}
    # Map rich fields to simple columns when present for backward-compatible columns
    full_name = (
        (payload.get("company_name") or "").strip()
        or (f"{(payload.get('first_name') or '').strip()} {(payload.get('last_name') or '').strip()}".strip())
        or (payload.get("contact_person") or "").strip()
    )
    if full_name:
        mapped_update["name"] = full_name
    if "email" in payload:
        mapped_update["email"] = payload.get("email")
    phone = (payload.get("mobile") or payload.get("phone"))
    if phone is not None:
        mapped_update["phone"] = phone
    if any(k in payload for k in ("billing_address", "shipping_address", "city", "state", "country", "postal_code")):
        addr = (
            payload.get("billing_address")
            or payload.get("shipping_address")
            or ", ".join([
                p for p in [payload.get("city"), payload.get("state"), payload.get("country"), payload.get("postal_code")] if p
            ])
        )
        mapped_update["address"] = addr
    # Pass through all rich fields as well (service filters allowed columns)
    passthrough_keys = [
        "state", "customer_code", "company_name", "contact_person", "first_name", "last_name",
        "mobile", "website", "billing_address", "shipping_address", "city", "country",
        "postal_code", "customer_type", "tax_number", "gst_number", "credit_limit",
        "payment_terms", "currency", "is_active", "is_verified", "notes"
    ]
    for k in passthrough_keys:
        if k in payload and payload.get(k) is not None:
            mapped_update[k] = payload.get(k)
    
    if not mapped_update:
        # Nothing to update; return shaped existing record
        if isinstance(existing_customer.get("created_at"), (object,)):
            try:
                existing_customer["created_at"] = existing_customer["created_at"].isoformat()
            except Exception:
                existing_customer["created_at"] = str(existing_customer.get("created_at"))
        if existing_customer.get("updated_at") is not None:
            try:
                existing_customer["updated_at"] = existing_customer["updated_at"].isoformat()
            except Exception:
                existing_customer["updated_at"] = str(existing_customer.get("updated_at"))
        return {
            "id": existing_customer.get("id"),
            "account_id": existing_customer.get("account_id"),
            "name": existing_customer.get("name"),
            "email": existing_customer.get("email"),
            "phone": existing_customer.get("phone"),
            "address": existing_customer.get("address"),
            "created_at": existing_customer.get("created_at"),
            "updated_at": existing_customer.get("updated_at"),
        }
    
    updated_customer = PostgresCustomerService.update_customer(customer_id, mapped_update, current_user["account_id"])
    
    if not updated_customer:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update customer"
        )
    if isinstance(updated_customer.get("created_at"), (object,)):
        try:
            updated_customer["created_at"] = updated_customer["created_at"].isoformat()
        except Exception:
            updated_customer["created_at"] = str(updated_customer.get("created_at"))
    if updated_customer.get("updated_at") is not None:
        try:
            updated_customer["updated_at"] = updated_customer["updated_at"].isoformat()
        except Exception:
            updated_customer["updated_at"] = str(updated_customer.get("updated_at"))
    return {
        "id": updated_customer.get("id"),
        "account_id": updated_customer.get("account_id"),
        "name": updated_customer.get("name"),
        "email": updated_customer.get("email"),
        "phone": updated_customer.get("phone"),
        "address": updated_customer.get("address"),
        "created_at": updated_customer.get("created_at"),
        "updated_at": updated_customer.get("updated_at"),
    }

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a customer using PostgreSQL."""
    
    # Check if customer exists
    existing_customer = PostgresCustomerService.get_customer_by_id(customer_id, current_user["account_id"])
    if not existing_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    success = PostgresCustomerService.delete_customer(customer_id, current_user["account_id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete customer"
        )
    
    return {"message": f"Customer '{existing_customer['name']}' deleted successfully"}

@router.get("/summary")
async def get_customer_summary(
    current_user: dict = Depends(get_current_user)
):
    """Return summary counts for customers."""
    return PostgresCustomerService.get_customer_summary(current_user["account_id"])

@router.get("/{customer_id}/credit-info")
async def get_customer_credit_info(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Return placeholder credit info for customer to unblock UI."""
    return PostgresCustomerService.get_customer_credit_info(customer_id, current_user["account_id"])

@router.patch("/{customer_id}/toggle-status", response_model=CustomerResponse)
async def toggle_customer_status(
    customer_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Toggle customer's active status and return updated customer."""
    updated = PostgresCustomerService.toggle_customer_status(customer_id, current_user["account_id"])
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    if isinstance(updated.get("created_at"), (object,)):
        try:
            updated["created_at"] = updated["created_at"].isoformat()
        except Exception:
            updated["created_at"] = str(updated.get("created_at"))
    if updated.get("updated_at") is not None:
        try:
            updated["updated_at"] = updated["updated_at"].isoformat()
        except Exception:
            updated["updated_at"] = str(updated.get("updated_at"))
    return {
        "id": updated.get("id"),
        "account_id": updated.get("account_id"),
        "name": updated.get("name"),
        "email": updated.get("email"),
        "phone": updated.get("phone"),
        "address": updated.get("address"),
        "created_at": updated.get("created_at"),
        "updated_at": updated.get("updated_at"),
    }
