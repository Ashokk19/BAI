from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, Dict, Any
from pydantic import BaseModel
import base64

from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()

class OrganizationCreate(BaseModel):
    company_name: str
    business_type: Optional[str] = None
    industry: Optional[str] = None
    founded_year: Optional[str] = None
    employee_count: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    currency: Optional[str] = "INR"
    timezone: Optional[str] = "Asia/Kolkata"
    fiscal_year_start: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "India"
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder_name: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    bank_branch_name: Optional[str] = None
    bank_branch_address: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_swift_code: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_verified: Optional[bool] = False
    terms_and_conditions: Optional[str] = None
    rcm_applicable: Optional[bool] = False
    tax_invoice_color: Optional[str] = '#4c1d95'
    proforma_invoice_color: Optional[str] = '#4c1d95'
    sales_return_color: Optional[str] = '#dc2626'

class OrganizationUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    founded_year: Optional[str] = None
    employee_count: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder_name: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    bank_branch_name: Optional[str] = None
    bank_branch_address: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_swift_code: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_verified: Optional[bool] = None
    terms_and_conditions: Optional[str] = None
    rcm_applicable: Optional[bool] = None
    tax_invoice_color: Optional[str] = None
    proforma_invoice_color: Optional[str] = None
    sales_return_color: Optional[str] = None

@router.get("/profile")
async def get_organization_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    q = """
    SELECT id, account_id, company_name, business_type, industry, founded_year, employee_count,
           registration_number, tax_id, gst_number, pan_number, phone, email, website,
           currency, timezone, fiscal_year_start, address, city, state, postal_code, country,
           bank_name, bank_account_number, bank_account_holder_name, bank_ifsc_code,
           bank_branch_name, bank_branch_address, bank_account_type, bank_swift_code,
           description, logo_url, is_verified, terms_and_conditions, rcm_applicable,
           tax_invoice_color, proforma_invoice_color, sales_return_color, created_at, updated_at
    FROM organizations
    WHERE account_id = %s
    LIMIT 1
    """
    org = postgres_db.execute_single(q, (current_user["account_id"],))
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found for this account")
    return org

@router.post("/profile")
async def create_organization_profile(data: OrganizationCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    exists = postgres_db.execute_single("SELECT id FROM organizations WHERE account_id = %s", (current_user["account_id"],))
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization profile already exists for this account")
    fields = [
        "account_id", "company_name", "business_type", "industry", "founded_year", "employee_count",
        "registration_number", "tax_id", "gst_number", "pan_number", "phone", "email", "website",
        "currency", "timezone", "fiscal_year_start", "address", "city", "state", "postal_code", "country",
        "bank_name", "bank_account_number", "bank_account_holder_name", "bank_ifsc_code",
        "bank_branch_name", "bank_branch_address", "bank_account_type", "bank_swift_code",
        "description", "logo_url", "is_verified", "terms_and_conditions", "rcm_applicable",
        "tax_invoice_color", "proforma_invoice_color", "sales_return_color"
    ]
    values = [current_user["account_id"], data.company_name, data.business_type, data.industry, data.founded_year, data.employee_count,
              data.registration_number, data.tax_id, data.gst_number, data.pan_number, data.phone, data.email, data.website,
              data.currency, data.timezone, data.fiscal_year_start, data.address, data.city, data.state, data.postal_code, data.country,
              data.bank_name, data.bank_account_number, data.bank_account_holder_name, data.bank_ifsc_code,
              data.bank_branch_name, data.bank_branch_address, data.bank_account_type, data.bank_swift_code,
              data.description, data.logo_url, data.is_verified, data.terms_and_conditions, data.rcm_applicable,
              data.tax_invoice_color, data.proforma_invoice_color, data.sales_return_color]
    placeholders = ",".join(["%s"] * len(values))
    insert_q = f"INSERT INTO organizations ({','.join(fields)}) VALUES ({placeholders}) RETURNING *"
    created = postgres_db.execute_single(insert_q, tuple(values))
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create organization profile")
    return created

@router.put("/profile")
async def update_organization_profile(data: OrganizationUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    update_dict = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not update_dict:
        return postgres_db.execute_single("SELECT * FROM organizations WHERE account_id = %s", (current_user["account_id"],))
    set_clause = ", ".join([f"{k} = %s" for k in update_dict.keys()])
    params = list(update_dict.values()) + [current_user["account_id"]]
    q = f"UPDATE organizations SET {set_clause}, updated_at = NOW() WHERE account_id = %s RETURNING *"
    updated = postgres_db.execute_single(q, tuple(params))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found for this account")
    return updated

@router.delete("/profile")
async def delete_organization_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    q = "DELETE FROM organizations WHERE account_id = %s RETURNING id"
    res = postgres_db.execute_single(q, (current_user["account_id"],))
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found for this account")
    return {"message": "Organization profile deleted successfully"}

@router.post("/logo")
async def upload_organization_logo(file: UploadFile = File(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Upload organization logo as base64 and store in database."""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}")
    
    # Read file and convert to base64 data URL
    contents = await file.read()
    # Limit to 2MB
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 2MB")
    
    b64 = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{b64}"
    
    # Update organization with logo_data
    q = "UPDATE organizations SET logo_data = %s, updated_at = NOW() WHERE account_id = %s RETURNING id"
    updated = postgres_db.execute_single(q, (data_url, current_user["account_id"]))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found. Please create one first.")
    return {"message": "Logo uploaded successfully", "logo_data": data_url}

@router.get("/logo")
async def get_organization_logo(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get organization logo base64 data."""
    q = "SELECT logo_data FROM organizations WHERE account_id = %s LIMIT 1"
    result = postgres_db.execute_single(q, (current_user["account_id"],))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    return {"logo_data": result.get("logo_data", None)}

@router.delete("/logo")
async def delete_organization_logo(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Remove organization logo."""
    q = "UPDATE organizations SET logo_data = NULL, updated_at = NOW() WHERE account_id = %s RETURNING id"
    updated = postgres_db.execute_single(q, (current_user["account_id"],))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization profile not found")
    return {"message": "Logo removed successfully"}
