"""
Simplified seed script for missing data
"""

from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.customer import Customer
from models.invoice import Invoice
from models.shipment import Shipment, DeliveryNote
from models.sales_return import SalesReturn
from models.credit import CustomerCredit, CreditNote
from models.payment import Payment
import random

def seed_simple_data():
    """Create simple seed data for all missing modules."""
    db = SessionLocal()
    try:
        print("🌱 Creating seed data...\n")
        
        # Get existing data
        customers = db.query(Customer).limit(3).all()
        invoices = db.query(Invoice).limit(3).all()
        
        if not customers or not invoices:
            print("⚠️ No customers or invoices found. Please run basic seed data first.")
            return
        
        # 1. Create Shipments
        print("🚚 Creating shipments...")
        for i in range(5):
            customer = customers[i % len(customers)]
            invoice = invoices[i % len(invoices)]
            
            shipment = Shipment(
                shipment_number=f"SHP-{2024}{str(i+1).zfill(3)}",
                invoice_id=invoice.id,
                customer_id=customer.id,
                ship_date=datetime.now() - timedelta(days=random.randint(1, 20)),
                status=random.choice(["pending", "shipped", "delivered"]),
                shipping_address=customer.billing_address or "Default Shipping Address",
                carrier=random.choice(["DHL", "FedEx", "Blue Dart"]),
                shipping_cost=Decimal(random.randint(50, 300)),
                created_by=1
            )
            db.add(shipment)
        
        db.commit()
        print("✅ Created 5 shipments")
        
        # 2. Create Delivery Notes
        print("📦 Creating delivery notes...")
        shipments = db.query(Shipment).all()
        for i, shipment in enumerate(shipments[:3]):
            delivery_note = DeliveryNote(
                delivery_note_number=f"DN-{2024}{str(i+1).zfill(3)}",
                shipment_id=shipment.id,
                customer_id=shipment.customer_id,
                delivery_date=datetime.now() - timedelta(days=random.randint(1, 15)),
                delivery_status=random.choice(["delivered", "partial", "failed"]),
                received_by=random.choice(["Customer", "Security", "Family Member"]),
                delivery_address=shipment.shipping_address,
                packages_delivered=random.randint(1, 3),
                condition_on_delivery=random.choice(["good", "damaged"]),
                delivery_notes=f"Package delivered successfully",
                recorded_by=1
            )
            db.add(delivery_note)
        
        db.commit()
        print("✅ Created 3 delivery notes")
        
        # 3. Create Sales Returns
        print("↩️ Creating sales returns...")
        for i in range(4):
            customer = customers[i % len(customers)]
            invoice = invoices[i % len(invoices)]
            
            sales_return = SalesReturn(
                return_number=f"RET-{2024}{str(i+1).zfill(3)}",
                invoice_id=invoice.id,
                customer_id=customer.id,
                return_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                return_reason=random.choice(["Defective", "Wrong Item", "Size Issue"]),
                return_type=random.choice(["Full Return", "Partial Return"]),
                status=random.choice(["Pending", "Approved", "Refunded"]),
                total_return_amount=Decimal(random.randint(500, 3000)),
                refund_amount=Decimal(random.randint(400, 2800)),
                refund_method=random.choice(["Credit Card", "Bank Transfer", "Cash"]),
                refund_status=random.choice(["Pending", "Processed"]),
                processed_by=1
            )
            db.add(sales_return)
        
        db.commit()
        print("✅ Created 4 sales returns")
        
        # 4. Create Customer Credits
        print("💳 Creating customer credits...")
        for i, customer in enumerate(customers):
            credit = CustomerCredit(
                credit_number=f"CRED-{2024}{str(i+1).zfill(3)}",
                credit_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                customer_id=customer.id,
                credit_type=random.choice(["return_credit", "promotional", "goodwill", "adjustment"]),
                credit_reason=random.choice(["Product return", "Service issue", "Promotional offer"]),
                status="active",
                original_amount=Decimal(random.randint(1000, 5000)),
                used_amount=Decimal(random.randint(0, 2000)),
                remaining_amount=Decimal(random.randint(500, 4000)),
                expiry_date=datetime.now() + timedelta(days=180),
                description=f"Credit for customer {customer.customer_code}",
                created_by=1
            )
            db.add(credit)
        
        # Create Credit Notes
        for i in range(3):
            customer = customers[i % len(customers)]
            credit_note = CreditNote(
                credit_note_number=f"CN-{2024}{str(i+1).zfill(3)}",
                customer_id=customer.id,
                credit_note_date=datetime.now() - timedelta(days=random.randint(1, 20)),
                credit_note_type=random.choice(["Return Credit", "Adjustment Credit"]),
                reason=random.choice(["Product return", "Service issue", "Pricing error"]),
                subtotal=Decimal(random.randint(1000, 3000)),
                tax_amount=Decimal(random.randint(100, 300)),
                total_amount=Decimal(random.randint(1100, 3300)),
                description=f"Credit note for customer adjustments",
                created_by=1
            )
            db.add(credit_note)
        
        db.commit()
        print("✅ Created customer credits and credit notes")
        
        # 5. Create Payments
        print("💰 Creating payments...")
        for i in range(8):
            customer = customers[i % len(customers)]
            invoice = invoices[i % len(invoices)] if random.choice([True, False]) else None
            
            payment = Payment(
                payment_number=f"PAY-{2024}{str(i+1).zfill(3)}",
                customer_id=customer.id,
                invoice_id=invoice.id if invoice else None,
                payment_date=datetime.now() - timedelta(days=random.randint(1, 40)),
                payment_amount=Decimal(random.randint(500, 5000)),
                payment_method=random.choice(["Credit Card", "Bank Transfer", "UPI", "Cash"]),
                payment_status=random.choice(["Completed", "Pending", "Failed"]),
                payment_type=random.choice(["Invoice Payment", "Advance Payment", "Partial Payment"]),
                payment_direction="Inbound",
                transaction_reference=f"TXN{random.randint(100000, 999999)}",
                notes=f"Payment from customer {customer.customer_code}",
                processed_by=1
            )
            db.add(payment)
        
        db.commit()
        print("✅ Created 8 payments")
        
        print(f"\n🎉 All seed data created successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_simple_data() 