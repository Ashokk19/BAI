#!/usr/bin/env python3
"""
Test script for organization profile endpoint
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from backend.config.settings import settings
from backend.models.organization import Organization

def test_organization_model():
    """Test organization model functionality"""
    try:
        # Create database connection
        engine = create_engine(settings.database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Testing organization model...")
        
        # Test querying organizations
        organizations = db.query(Organization).all()
        print(f"✅ Found {len(organizations)} organizations in database")
        
        # Test creating a sample organization (but don't commit)
        test_org = Organization(
            account_id="test_account",
            company_name="Test Company",
            business_type="Technology",
            phone="+1234567890",
            email="test@company.com",
            currency="INR",
            timezone="Asia/Kolkata"
        )
        
        # Test that all required fields are accessible
        print(f"✅ Test organization created with company_name: {test_org.company_name}")
        print(f"✅ Business type: {test_org.business_type}")
        print(f"✅ Currency: {test_org.currency}")
        print(f"✅ Timezone: {test_org.timezone}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Organization model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_organization_model()
