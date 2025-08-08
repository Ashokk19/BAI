"""
Create payment data with correct field names
"""

from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.customer import Customer
from models.invoice import Invoice
from models.payment import Payment
import random

def create_payment_data():
    """Create payment data."""
    db = SessionLocal()
    try:
        print("💰 Creating payment data...")
        
        # Get existing data
        customers = db.query(Customer).limit(3).all()
        invoices = db.query(Invoice).limit(3).all()
        
        if not customers:
            print("⚠️ No customers found.")
            return
        
        # Create payments with correct field names
        for i in range(10):
            customer = customers[i % len(customers)]
            invoice = invoices[i % len(invoices)] if invoices and random.choice([True, False]) else None
            
            payment = Payment(
                payment_number=f"PAY-{2024}{str(i+1).zfill(3)}",
                payment_date=datetime.now() - timedelta(days=random.randint(1, 60)),
                payment_type=random.choice(["invoice_payment", "vendor_payment", "refund"]),
                payment_direction=random.choice(["incoming", "outgoing"]),
                customer_id=customer.id,
                invoice_id=invoice.id if invoice else None,
                amount=Decimal(random.randint(500, 5000)),
                currency="INR",
                payment_method=random.choice(["cash", "bank_transfer", "credit_card", "check"]),
                payment_status=random.choice(["pending", "completed", "failed"]),
                reference_number=f"REF{random.randint(100000, 999999)}",
                notes=f"Payment from customer {customer.customer_code}",
                recorded_by=1
            )
            db.add(payment)
        
        db.commit()
        print(f"✅ Created 10 payments")
        
        # Check count
        count = db.query(Payment).count()
        print(f"Total payments in DB: {count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_payment_data() 