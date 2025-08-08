"""
Cleanup script to remove existing test data
"""

from database.database import SessionLocal
from models.shipment import Shipment, DeliveryNote
from models.sales_return import SalesReturn
from models.credit import CustomerCredit, CreditNote
from models.payment import Payment

def cleanup_data():
    """Remove existing test data."""
    db = SessionLocal()
    try:
        print("🧹 Cleaning up existing data...")
        
        # Delete in order of dependencies
        db.query(DeliveryNote).delete()
        db.query(Shipment).delete()
        db.query(SalesReturn).delete()
        db.query(CreditNote).delete()
        db.query(CustomerCredit).delete()
        db.query(Payment).delete()
        
        db.commit()
        print("✅ Cleanup completed")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data() 