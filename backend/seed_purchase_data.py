"""
Comprehensive Purchase Data Seeding Script

This script creates sample data for the purchase module including:
- Purchase Orders
- Purchase Order Items
- Purchase Received Records
- Bills (Purchase Orders converted to bills)
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal, engine
from models.purchase import PurchaseOrder, PurchaseOrderItem, PurchaseReceived
from models.vendor import Vendor
from models.item import Item
from models.user import User

def create_purchase_orders():
    """Create sample purchase orders with items."""
    
    db = SessionLocal()
    
    try:
        # Check if purchase orders already exist
        existing_orders = db.query(PurchaseOrder).count()
        if existing_orders > 0:
            print(f"✅ {existing_orders} purchase orders already exist. Skipping creation.")
            return
        
        # Get vendors, items, and users
        vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
        items = db.query(Item).filter(Item.is_active == True).all()
        users = db.query(User).all()
        
        if not vendors:
            print("❌ No vendors found. Please seed vendor data first.")
            return
        
        if not items:
            print("❌ No items found. Please seed item data first.")
            return
        
        if not users:
            print("❌ No users found. Please create a user first.")
            return
        
        creator = users[0]
        
        # Sample purchase order data
        purchase_orders_data = [
            {
                "po_number": "PO-2024-001",
                "po_date": datetime.now() - timedelta(days=30),
                "expected_delivery_date": datetime.now() + timedelta(days=7),
                "vendor_id": vendors[0].id,
                "status": "confirmed",
                "priority": "high",
                "subtotal": Decimal("15000.00"),
                "tax_amount": Decimal("2700.00"),
                "discount_amount": Decimal("500.00"),
                "total_amount": Decimal("17200.00"),
                "payment_terms": "net_30",
                "currency": "INR",
                "shipping_address": "123, Nehru Place, New Delhi - 110019",
                "shipping_method": "express",
                "shipping_cost": Decimal("200.00"),
                "notes": "Urgent order for office supplies",
                "terms_conditions": "Standard terms apply"
            },
            {
                "po_number": "PO-2024-002",
                "po_date": datetime.now() - timedelta(days=25),
                "expected_delivery_date": datetime.now() + timedelta(days=10),
                "vendor_id": vendors[1].id,
                "status": "partial_received",
                "priority": "normal",
                "subtotal": Decimal("25000.00"),
                "tax_amount": Decimal("4500.00"),
                "discount_amount": Decimal("1000.00"),
                "total_amount": Decimal("28500.00"),
                "payment_terms": "net_45",
                "currency": "INR",
                "shipping_address": "456, Andheri West, Mumbai - 400058",
                "shipping_method": "standard",
                "shipping_cost": Decimal("150.00"),
                "notes": "Regular office furniture order",
                "terms_conditions": "Payment on delivery"
            },
            {
                "po_number": "PO-2024-003",
                "po_date": datetime.now() - timedelta(days=20),
                "expected_delivery_date": datetime.now() + timedelta(days=5),
                "vendor_id": vendors[2].id,
                "status": "received",
                "priority": "urgent",
                "subtotal": Decimal("35000.00"),
                "tax_amount": Decimal("6300.00"),
                "discount_amount": Decimal("1500.00"),
                "total_amount": Decimal("39800.00"),
                "payment_terms": "net_30",
                "currency": "INR",
                "shipping_address": "789, Electronic City, Bangalore - 560100",
                "shipping_method": "express",
                "shipping_cost": Decimal("300.00"),
                "notes": "Electronics and IT equipment",
                "terms_conditions": "Warranty included"
            },
            {
                "po_number": "PO-2024-004",
                "po_date": datetime.now() - timedelta(days=15),
                "expected_delivery_date": datetime.now() + timedelta(days=15),
                "vendor_id": vendors[3].id,
                "status": "draft",
                "priority": "low",
                "subtotal": Decimal("12000.00"),
                "tax_amount": Decimal("2160.00"),
                "discount_amount": Decimal("400.00"),
                "total_amount": Decimal("13760.00"),
                "payment_terms": "net_30",
                "currency": "INR",
                "shipping_address": "321, Salt Lake City, Kolkata - 700091",
                "shipping_method": "standard",
                "shipping_cost": Decimal("100.00"),
                "notes": "Stationery and office supplies",
                "terms_conditions": "Standard terms"
            },
            {
                "po_number": "PO-2024-005",
                "po_date": datetime.now() - timedelta(days=10),
                "expected_delivery_date": datetime.now() + timedelta(days=20),
                "vendor_id": vendors[4].id,
                "status": "sent",
                "priority": "normal",
                "subtotal": Decimal("18000.00"),
                "tax_amount": Decimal("3240.00"),
                "discount_amount": Decimal("600.00"),
                "total_amount": Decimal("20640.00"),
                "payment_terms": "net_45",
                "currency": "INR",
                "shipping_address": "654, Banjara Hills, Hyderabad - 500034",
                "shipping_method": "express",
                "shipping_cost": Decimal("250.00"),
                "notes": "Marketing materials and promotional items",
                "terms_conditions": "Quality check required"
            }
        ]
        
        created_orders = []
        
        for i, po_data in enumerate(purchase_orders_data):
            # Create purchase order
            purchase_order = PurchaseOrder(
                **po_data,
                created_by=creator.id
            )
            db.add(purchase_order)
            db.flush()  # Get the ID
            
            # Create purchase order items
            num_items = random.randint(2, 4)
            selected_items = random.sample(items, min(num_items, len(items)))
            
            for j, item in enumerate(selected_items):
                quantity = random.randint(5, 50)
                unit_price = float(item.selling_price) * random.uniform(0.7, 0.9)  # Purchase price is lower
                discount_rate = random.uniform(0, 0.1)  # 0-10% discount
                tax_rate = float(item.tax_rate)
                
                discount_amount = unit_price * quantity * discount_rate
                tax_amount = (unit_price * quantity - discount_amount) * tax_rate / 100
                line_total = unit_price * quantity - discount_amount + tax_amount
                
                purchase_order_item = PurchaseOrderItem(
                    purchase_order_id=purchase_order.id,
                    item_id=item.id,
                    item_name=item.name,
                    item_description=item.description,
                    item_sku=item.sku,
                    quantity_ordered=quantity,
                    quantity_received=0,  # Will be updated when received
                    unit_price=Decimal(str(unit_price)),
                    discount_rate=Decimal(str(discount_rate)),
                    discount_amount=Decimal(str(discount_amount)),
                    tax_rate=Decimal(str(tax_rate)),
                    tax_amount=Decimal(str(tax_amount)),
                    line_total=Decimal(str(line_total))
                )
                db.add(purchase_order_item)
            
            created_orders.append(purchase_order)
        
        db.commit()
        print(f"✅ Created {len(created_orders)} purchase orders with items")
        return created_orders
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating purchase orders: {str(e)}")
        return []
    finally:
        db.close()

def create_purchase_received():
    """Create sample purchase received records."""
    
    db = SessionLocal()
    
    try:
        # Check if purchase received already exist
        existing_received = db.query(PurchaseReceived).count()
        if existing_received > 0:
            print(f"✅ {existing_received} purchase received records already exist. Skipping creation.")
            return
        
        # Get purchase orders with items
        purchase_orders = db.query(PurchaseOrder).filter(
            PurchaseOrder.status.in_(["confirmed", "partial_received", "received"])
        ).all()
        
        if not purchase_orders:
            print("❌ No confirmed purchase orders found. Please create purchase orders first.")
            return
        
        users = db.query(User).all()
        if not users:
            print("❌ No users found.")
            return
        
        receiver = users[0]
        created_received = []
        
        for po in purchase_orders:
            # Get purchase order items
            po_items = db.query(PurchaseOrderItem).filter(
                PurchaseOrderItem.purchase_order_id == po.id
            ).all()
            
            for po_item in po_items:
                # Create receipt for some items
                if random.choice([True, False]):  # 50% chance
                    quantity_received = random.randint(1, int(po_item.quantity_ordered))
                    quantity_accepted = quantity_received - random.randint(0, 2)
                    quantity_rejected = quantity_received - quantity_accepted
                    
                    quality_status = "passed" if quantity_rejected == 0 else "partial"
                    if quantity_rejected > quantity_accepted:
                        quality_status = "failed"
                    
                    receipt = PurchaseReceived(
                        purchase_order_id=po.id,
                        purchase_order_item_id=po_item.id,
                        receipt_number=f"REC-{po.po_number}-{po_item.id}",
                        receipt_date=datetime.now() - timedelta(days=random.randint(1, 10)),
                        item_id=po_item.item_id,
                        quantity_received=quantity_received,
                        quantity_accepted=quantity_accepted,
                        quantity_rejected=quantity_rejected,
                        quality_status=quality_status,
                        quality_notes=f"Quality check completed for {po_item.item_name}",
                        storage_location=f"Warehouse A-{random.randint(1, 5)}",
                        batch_number=f"BATCH-{random.randint(1000, 9999)}",
                        expiry_date=datetime.now() + timedelta(days=random.randint(30, 365)),
                        received_by=receiver.id
                    )
                    db.add(receipt)
                    created_received.append(receipt)
                    
                    # Update purchase order item received quantity
                    po_item.quantity_received += quantity_accepted
                    
                    # Update purchase order status
                    if po_item.quantity_received >= po_item.quantity_ordered:
                        po.status = "received"
                    elif po_item.quantity_received > 0:
                        po.status = "partial_received"
        
        db.commit()
        print(f"✅ Created {len(created_received)} purchase received records")
        return created_received
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating purchase received records: {str(e)}")
        return []
    finally:
        db.close()

def create_bills():
    """Create bills from purchase orders."""
    
    db = SessionLocal()
    
    try:
        # Check if bills already exist (bills are just purchase orders with bill status)
        existing_bills = db.query(PurchaseOrder).filter(
            PurchaseOrder.status.in_(["confirmed", "partial_received", "received"])
        ).count()
        
        if existing_bills > 0:
            print(f"✅ {existing_bills} bills (confirmed purchase orders) already exist.")
            return
        
        # Update some purchase orders to confirmed status (making them bills)
        draft_orders = db.query(PurchaseOrder).filter(PurchaseOrder.status == "draft").all()
        
        for order in draft_orders[:2]:  # Convert first 2 draft orders to confirmed
            order.status = "confirmed"
            order.notes = f"Converted to bill on {datetime.now().strftime('%Y-%m-%d')}"
        
        db.commit()
        print(f"✅ Created {len(draft_orders[:2])} bills from draft purchase orders")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating bills: {str(e)}")
    finally:
        db.close()

def seed_all_purchase_data():
    """Seed all purchase-related data."""
    
    print("🚀 Starting Comprehensive Purchase Data Seeding")
    print("=" * 60)
    
    # 1. Create purchase orders
    print("\n1. Creating purchase orders...")
    purchase_orders = create_purchase_orders()
    
    # 2. Create purchase received records
    print("\n2. Creating purchase received records...")
    purchase_received = create_purchase_received()
    
    # 3. Create bills
    print("\n3. Creating bills...")
    create_bills()
    
    print("\n" + "=" * 60)
    print("✅ COMPREHENSIVE PURCHASE DATA SEEDING COMPLETED!")
    print("=" * 60)
    
    # Verify data counts
    print("\nVerifying seeded data...")
    db = SessionLocal()
    try:
        po_count = db.query(PurchaseOrder).count()
        poi_count = db.query(PurchaseOrderItem).count()
        pr_count = db.query(PurchaseReceived).count()
        
        print(f"📋 Purchase Orders: {po_count}")
        print(f"📦 Purchase Order Items: {poi_count}")
        print(f"📥 Purchase Received: {pr_count}")
        
    except Exception as e:
        print(f"❌ Error verifying data: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_all_purchase_data() 