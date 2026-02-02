"""
Demo Requests Router - Handle demo request submissions from the homepage.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from database.postgres_db import postgres_db
from utils.postgres_auth_deps import get_current_user

router = APIRouter()


class DemoRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    message: Optional[str] = None


class DemoRequestResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    message: Optional[str] = None
    status: str
    demo_date: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


def _ensure_demo_requests_table():
    """Create demo_requests table if it doesn't exist."""
    try:
        with postgres_db.get_cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.demo_requests (
                    id BIGSERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(50) NOT NULL,
                    company_name VARCHAR(255),
                    message TEXT,
                    status VARCHAR(50) DEFAULT 'pending',
                    demo_date DATE,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ
                )
            """)
            # Add demo_date column if it doesn't exist (for existing tables)
            cursor.execute("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'demo_requests' AND column_name = 'demo_date'
                    ) THEN
                        ALTER TABLE public.demo_requests ADD COLUMN demo_date DATE;
                    END IF;
                END $$;
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_demo_requests_status
                ON public.demo_requests(status)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at
                ON public.demo_requests(created_at DESC)
            """)
    except Exception as e:
        print(f"Error ensuring demo_requests table: {e}")


@router.post("/", response_model=DemoRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_demo_request(payload: DemoRequestCreate):
    """Submit a new demo request (public endpoint - no auth required)."""
    _ensure_demo_requests_table()
    
    try:
        result = postgres_db.execute_single(
            """
            INSERT INTO demo_requests (name, email, phone, company_name, message, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
            RETURNING id, name, email, phone, company_name, message, status, 
                      CASE WHEN demo_date IS NOT NULL THEN TO_CHAR(demo_date, 'YYYY-MM-DD') ELSE NULL END as demo_date,
                      created_at, updated_at
            """,
            (
                payload.name.strip(),
                payload.email.strip(),
                payload.phone.strip(),
                payload.company_name.strip() if payload.company_name else None,
                payload.message.strip() if payload.message else None
            )
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create demo request"
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating demo request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create demo request"
        )


@router.get("/", response_model=List[DemoRequestResponse])
async def list_demo_requests(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List all demo requests (admin only - requires MasterAccount)."""
    _ensure_demo_requests_table()
    
    # Check if user is from master account
    if current_user.get("account_id", "").lower() != "masteraccount":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master account can view demo requests"
        )
    
    try:
        query = """
            SELECT id, name, email, phone, company_name, message, status, 
                   CASE WHEN demo_date IS NOT NULL THEN TO_CHAR(demo_date, 'YYYY-MM-DD') ELSE NULL END as demo_date,
                   created_at, updated_at
            FROM demo_requests
        """
        params = []
        
        if status_filter:
            query += " WHERE status = %s"
            params.append(status_filter)
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        results = postgres_db.execute_query(query, tuple(params))
        return results or []
    except Exception as e:
        print(f"Error listing demo requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch demo requests"
        )


@router.put("/{request_id}/status")
async def update_demo_request_status(
    request_id: int,
    new_status: str,
    current_user: dict = Depends(get_current_user)
):
    """Update demo request status (admin only)."""
    _ensure_demo_requests_table()
    
    # Check if user is from master account
    if current_user.get("account_id", "").lower() != "masteraccount":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master account can update demo requests"
        )
    
    valid_statuses = ["pending", "contacted", "demo_scheduled", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    try:
        result = postgres_db.execute_single(
            """
            UPDATE demo_requests
            SET status = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, name, email, phone, company_name, message, status, 
                      CASE WHEN demo_date IS NOT NULL THEN TO_CHAR(demo_date, 'YYYY-MM-DD') ELSE NULL END as demo_date,
                      created_at, updated_at
            """,
            (new_status, request_id)
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo request not found"
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating demo request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update demo request"
        )


@router.put("/{request_id}/date")
async def update_demo_request_date(
    request_id: int,
    demo_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Update demo request date (admin only)."""
    _ensure_demo_requests_table()
    
    # Check if user is from master account
    if current_user.get("account_id", "").lower() != "masteraccount":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master account can update demo requests"
        )
    
    try:
        result = postgres_db.execute_single(
            """
            UPDATE demo_requests
            SET demo_date = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, name, email, phone, company_name, message, status, 
                      CASE WHEN demo_date IS NOT NULL THEN TO_CHAR(demo_date, 'YYYY-MM-DD') ELSE NULL END as demo_date,
                      created_at, updated_at
            """,
            (demo_date if demo_date else None, request_id)
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo request not found"
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating demo request date: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update demo request date"
        )


@router.delete("/{request_id}")
async def delete_demo_request(
    request_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a demo request (admin only)."""
    _ensure_demo_requests_table()
    
    # Check if user is from master account
    if current_user.get("account_id", "").lower() != "masteraccount":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only master account can delete demo requests"
        )
    
    try:
        result = postgres_db.execute_single(
            "DELETE FROM demo_requests WHERE id = %s RETURNING id",
            (request_id,)
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo request not found"
            )
        
        return {"message": "Demo request deleted successfully", "id": request_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting demo request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete demo request"
        )
