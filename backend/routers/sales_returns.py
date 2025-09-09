"""
BAI Backend Sales Returns Router

This module contains the sales returns routes for handling product returns and refunds.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from math import ceil
from decimal import Decimal
from datetime import datetime

from database.database import get_db
from utils.auth_deps import get_current_user
from models.user import User
from models.customer import Customer
from models.invoice import Invoice, InvoiceItem
from models.item import Item
from models.sales_return import SalesReturn, SalesReturnItem
from services.inventory_service import InventoryService
from templates.credit_note_template import get_credit_note_html
from schemas.sales_return_schema import (
    SalesReturnCreate,
    SalesReturnUpdate,
    SalesReturnResponse,
    SalesReturnList,
    SalesReturnSummary
)

router = APIRouter()

def generate_return_number(db: Session, account_id: str) -> str:
    """Generate a new account-specific return number."""
    last_return = db.query(SalesReturn).filter(SalesReturn.account_id == account_id).order_by(SalesReturn.id.desc()).first()
    if last_return:
        try:
            last_number = int(last_return.return_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    # Account-specific format: RET-ACCOUNT-YYYY-NNN
    current_year = datetime.now().year
    return f"RET-{account_id}-{current_year}-{next_number:03d}"

@router.get("/", response_model=SalesReturnList)
async def get_sales_returns(
    skip: int = Query(0, ge=0, description="Number of returns to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of returns to return"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sales returns list with pagination and filters."""
    
    # Always join with Customer and Invoice to get related data
    query = db.query(SalesReturn).join(Customer).join(Invoice)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SalesReturn.return_number.ilike(search_term),
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.company_name.ilike(search_term),
                SalesReturn.return_reason.ilike(search_term),
                Invoice.invoice_number.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        query = query.filter(SalesReturn.status == status)
    
    # Apply customer filter
    if customer_id:
        query = query.filter(SalesReturn.customer_id == customer_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    returns = query.offset(skip).limit(limit).all()
    
    # Calculate pagination info
    total_pages = ceil(total / limit) if total > 0 else 0
    current_page = (skip // limit) + 1
    
    # Manually set customer_name and invoice_number for each return
    response_returns = []
    for sales_return in returns:
        # Create dict from sales_return object
        return_dict = {
            **{c.name: getattr(sales_return, c.name) for c in sales_return.__table__.columns},
            'customer_name': sales_return.customer.company_name or f"{sales_return.customer.first_name} {sales_return.customer.last_name}",
            'invoice_number': sales_return.invoice.invoice_number,
            'items': []  # Will be populated if needed
        }
        response_returns.append(return_dict)
    
    return SalesReturnList(
        returns=response_returns,
        total=total,
        page=current_page,
        per_page=limit,
        total_pages=total_pages
    )

@router.get("/{return_id}", response_model=SalesReturnResponse)
async def get_sales_return(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific sales return by ID."""
    
    sales_return = db.query(SalesReturn).filter(SalesReturn.id == return_id).first()
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")
    
    return sales_return

@router.post("/", response_model=SalesReturnResponse)
async def create_sales_return(
    return_data: SalesReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new sales return."""
    
    # Verify invoice exists
    invoice = db.query(Invoice).filter(Invoice.id == return_data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == return_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate return number
    return_number = generate_return_number(db, current_user.account_id)
    
    # Create sales return
    sales_return = SalesReturn(
        return_number=return_number,
        invoice_id=return_data.invoice_id,
        customer_id=return_data.customer_id,
        return_date=return_data.return_date,
        return_reason=return_data.return_reason,
        return_type=return_data.return_type,
        status=return_data.status,
        total_return_amount=return_data.total_return_amount,
        refund_amount=return_data.refund_amount,
        restocking_fee=return_data.restocking_fee or Decimal(0),
        refund_method=return_data.refund_method,
        refund_status=return_data.refund_status,
        refund_date=return_data.refund_date,
        refund_reference=return_data.refund_reference,
        return_reason_details=return_data.return_reason_details,
        internal_notes=return_data.internal_notes,
        customer_notes=return_data.customer_notes,
        items_condition=return_data.items_condition,
        quality_check_notes=return_data.quality_check_notes,
        processed_by=current_user.id
    )
    
    db.add(sales_return)
    db.flush()  # Get the return ID
    
    # Process return items
    for item_data in return_data.items:
        # Verify invoice item exists
        invoice_item = db.query(InvoiceItem).filter(InvoiceItem.id == item_data.invoice_item_id).first()
        if not invoice_item:
            raise HTTPException(status_code=404, detail=f"Invoice item with ID {item_data.invoice_item_id} not found")
        
        # Verify item exists
        item = db.query(Item).filter(Item.id == item_data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item with ID {item_data.item_id} not found")
        
        # Create return item
        return_item = SalesReturnItem(
            sales_return_id=sales_return.id,
            invoice_item_id=item_data.invoice_item_id,
            item_id=item_data.item_id,
            item_name=item_data.item_name,
            item_sku=item_data.item_sku,
            original_quantity=item_data.original_quantity,
            return_quantity=item_data.return_quantity,
            unit_price=item_data.unit_price,
            return_amount=item_data.return_amount,
            refund_amount=item_data.refund_amount,
            condition_on_return=item_data.condition_on_return,
            return_reason=item_data.return_reason,
            restockable=item_data.restockable,
            notes=item_data.notes
        )
        
        db.add(return_item)
        
        # Update inventory for returned items (if restockable)
        if item_data.restockable and item_data.condition_on_return in ['good', 'damaged']:
            try:
                # Add returned quantity back to inventory
                original_stock = item.current_stock
                item.current_stock += int(item_data.return_quantity)
                
                # Create inventory log for the return
                InventoryService.create_inventory_log(
                    db=db,
                    item_id=item_data.item_id,
                    transaction_type="return",
                    quantity_before=original_stock,
                    quantity_after=item.current_stock,
                    user_id=current_user.id,
                    account_id=current_user.account_id,
                    notes=f"Stock returned from sales return {return_number} - Item condition: {item_data.condition_on_return}",
                    transaction_reference=return_number,
                    unit_cost=float(item_data.unit_price) if item_data.unit_price else None
                )
                
                print(f"Inventory updated for item {item.name}: {original_stock} -> {item.current_stock} (returned {item_data.return_quantity})")
                
            except Exception as e:
                print(f"Warning: Failed to update inventory for item {item.name}: {str(e)}")
                # Don't fail the return creation if inventory update fails
    
    db.commit()
    db.refresh(sales_return)
    
    return sales_return

@router.put("/{return_id}", response_model=SalesReturnResponse)
async def update_sales_return(
    return_id: int,
    return_data: SalesReturnUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing sales return."""
    
    sales_return = db.query(SalesReturn).join(Customer).join(Invoice).filter(SalesReturn.id == return_id).first()
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")
    
    # Update fields
    update_data = return_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sales_return, field, value)
    
    db.commit()
    db.refresh(sales_return)
    
    # Create response with customer and invoice info
    return_dict = {
        **{c.name: getattr(sales_return, c.name) for c in sales_return.__table__.columns},
        'customer_name': sales_return.customer.company_name or f"{sales_return.customer.first_name} {sales_return.customer.last_name}",
        'invoice_number': sales_return.invoice.invoice_number,
        'items': []  # Will be populated if needed
    }
    
    return return_dict

@router.delete("/{return_id}")
async def delete_sales_return(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a sales return. Only admin users can delete sales returns."""
    
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can delete sales returns"
        )
    
    sales_return = db.query(SalesReturn).filter(SalesReturn.id == return_id).first()
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")
    
    db.delete(sales_return)
    db.commit()
    
    return {"message": "Sales return deleted successfully"}

@router.get("/summary/list", response_model=List[SalesReturnSummary])
async def get_sales_returns_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sales returns summary."""
    
    returns = db.query(SalesReturn).join(Customer).join(Invoice).all()
    
    return_summaries = []
    for return_item in returns:
        customer_name = return_item.customer.display_name
        return_summaries.append(
            SalesReturnSummary(
                id=return_item.id,
                return_number=return_item.return_number,
                customer_name=customer_name,
                invoice_number=return_item.invoice.invoice_number,
                return_date=return_item.return_date,
                total_return_amount=return_item.total_return_amount,
                refund_amount=return_item.refund_amount,
                status=return_item.status,
                refund_status=return_item.refund_status
            )
        )
    
    return return_summaries

@router.post("/seed-sample-returns")
async def seed_sample_returns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed sample sales returns for testing."""
    
    # Get some existing invoices and customers
    invoices = db.query(Invoice).limit(3).all()
    if not invoices:
        raise HTTPException(status_code=400, detail="No invoices found. Create invoices first.")
    
    sample_returns = []
    
    for i, invoice in enumerate(invoices, 1):
        # Check if return already exists for this invoice
        existing_return = db.query(SalesReturn).filter(SalesReturn.invoice_id == invoice.id).first()
        if existing_return:
            continue
            
        return_number = generate_return_number(db, current_user.account_id)
        
        return_data = {
            "return_number": return_number,
            "invoice_id": invoice.id,
            "customer_id": invoice.customer_id,
            "return_date": datetime.now(),
            "return_reason": ["Defective product", "Wrong item delivered", "Damaged in transit"][i-1],
            "return_type": "partial",
            "status": ["pending", "approved", "processed"][i-1],
            "total_return_amount": Decimal(1000 * i),
            "refund_amount": Decimal(1000 * i),
            "restocking_fee": Decimal(0),
            "refund_method": ["credit_note", "bank_transfer", "cash"][i-1],
            "refund_status": ["pending", "processed", "completed"][i-1],
            "return_reason_details": f"Sample return reason details for return {i}",
            "items_condition": "good",
            "processed_by": current_user.id
        }
        
        sales_return = SalesReturn(**return_data)
        db.add(sales_return)
        sample_returns.append(return_number)
    
    db.commit()
    
    return {
        "message": f"Successfully created {len(sample_returns)} sample sales returns",
        "created_returns": sample_returns
    }

@router.get("/{return_id}/credit-report")
async def download_credit_report(
    return_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and download credit report for a sales return."""
    
    # Get the sales return with all related data
    sales_return = db.query(SalesReturn).filter(SalesReturn.id == return_id).first()
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")
    
    # Get customer and invoice data
    customer = db.query(Customer).filter(Customer.id == sales_return.customer_id).first()
    invoice = db.query(Invoice).filter(Invoice.id == sales_return.invoice_id).first()
    
    if not customer or not invoice:
        raise HTTPException(status_code=404, detail="Related customer or invoice not found")
    
    # Get return items
    return_items = db.query(SalesReturnItem).filter(SalesReturnItem.sales_return_id == sales_return.id).all()
    
    # Generate HTML content using template
    html_content = get_credit_note_html(sales_return, customer, invoice, return_items)
    
    # Return HTML response for browser to handle printing/saving
    return HTMLResponse(content=html_content) 