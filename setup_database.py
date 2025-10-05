"""
Database Setup Script for BAI Application

This script sets up the PostgreSQL database by creating all necessary tables
based on the SQLAlchemy models.
"""
import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def setup_database():
    """Set up the database by creating all tables."""
    print("Setting up BAI database...")
    
    # Import SQLAlchemy and models after setting up the path
    from sqlalchemy import create_engine
    from backend.database.database import Base
    
    # Import all models to ensure they are registered with SQLAlchemy
    from backend.models.customer import Customer
    from backend.models.organization import Organization
    from backend.models.user import User
    from backend.models.item import Item
    from backend.models.invoice import Invoice, InvoiceItem
    from backend.models.payment import Payment
    from backend.models.credit import Credit, CreditPayment
    from backend.models.inventory import Inventory, InventoryTransaction
    from backend.models.purchase import Purchase, PurchaseItem
    from backend.models.sales_return import SalesReturn, SalesReturnItem
    from backend.models.shipment import Shipment, ShipmentItem
    from backend.models.vendor import Vendor
    from backend.models.gst_slab import GSTSlab
    
    # Database connection string
    DATABASE_URL = "postgresql://bai_user:bai_password@localhost:5432/bai_db"
    
    try:
        # Create engine
        print("Connecting to the database...")
        engine = create_engine(DATABASE_URL)
        
        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database setup completed successfully!")
        print("\nThe following tables were created:")
        for table in Base.metadata.tables:
            print(f"- {table}")
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("BAI Database Setup")
    print("=" * 30)
    
    if setup_database():
        print("\nYou can now start the BAI application.")
    else:
        print("\nFailed to set up the database. Please check the error message above.")
