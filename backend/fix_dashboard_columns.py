#!/usr/bin/env python3
"""
Fix PostgreSQL database schema for dashboard compatibility
"""

import sys
import os
sys.path.append('.')

from sqlalchemy import create_engine, text
from config.settings import settings

def fix_dashboard_columns():
    """Add missing columns to PostgreSQL database for dashboard compatibility"""
    
    try:
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            print("🔧 Fixing PostgreSQL schema for dashboard compatibility...")
            
            # Add missing columns to items table
            migrations = [
                # Add current_stock as alias/copy of stock_quantity
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,3) DEFAULT 0.000",
                
                # Add cost_price as alias/copy of purchase_price  
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2)",
                
                # Add minimum_stock as alias/copy of reorder_level
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC(10,3) DEFAULT 0.000",
                
                # Add maximum_stock column
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS maximum_stock NUMERIC(10,3)",
                
                # Add reorder_level column if it doesn't exist
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(10,3)",
                
                # Add missing columns for composite key support
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS sku VARCHAR(50)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode VARCHAR(50)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS category_account_id VARCHAR(100)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id INTEGER",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100)",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE",
                
                # Fix invoices table - add invoice_date as alias for issue_date
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP",
                
                # Add expiry tracking fields to items table
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT FALSE",
                "ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER",
                
                # Fix organizations table - add missing columns
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type VARCHAR(100)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(100)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founded_year VARCHAR(10)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count VARCHAR(50)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pan_number VARCHAR(100)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata'",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fiscal_year_start VARCHAR(10)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account_holder_name VARCHAR(255)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(20)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_branch_name VARCHAR(255)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_branch_address TEXT",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_swift_code VARCHAR(20)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_data TEXT",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_invoice_color VARCHAR(10) DEFAULT '#4c1d95'",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS proforma_invoice_color VARCHAR(10) DEFAULT '#4c1d95'",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sales_return_color VARCHAR(10) DEFAULT '#dc2626'",
                
                # Add missing invoice columns
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'sale'",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_cgst NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_sgst NUMERIC(12,2) DEFAULT 0.00", 
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_igst NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'immediate'",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_address TEXT",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_address TEXT", 
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms_conditions TEXT",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_account_id VARCHAR(50)",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by INTEGER",
                
                # Add missing sales_returns columns
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS return_type VARCHAR(30)",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS return_reason VARCHAR(100)",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50)",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'pending'",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS condition_assessment TEXT",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS restocking_fee NUMERIC(12,2) DEFAULT 0.00",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS processed_by_account_id VARCHAR(100)",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS processed_by INTEGER",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS condition_notes TEXT",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS quality_check_passed BOOLEAN DEFAULT TRUE",
                "ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS internal_notes TEXT",
                
                # Add missing payments columns
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_direction VARCHAR(20)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS check_number VARCHAR(50)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_account_id VARCHAR(100)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_id INTEGER",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by_account_id VARCHAR(100)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by INTEGER",
                
                # Add missing shipments columns
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ship_date TIMESTAMP",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50)",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS service_type VARCHAR(50)",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS billing_address TEXT",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_weight NUMERIC(8,3)",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100)",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0.00",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_cost NUMERIC(10,2) DEFAULT 0.00",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS special_instructions TEXT",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by_account_id VARCHAR(100)",
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by INTEGER",
            ]
            
            for migration in migrations:
                try:
                    conn.execute(text(migration))
                    print(f"✅ {migration}")
                except Exception as e:
                    print(f"⚠️  {migration} - {e}")
            
            # Copy data from existing columns to new columns
            data_migrations = [
                "UPDATE items SET current_stock = COALESCE(stock_quantity, 0) WHERE current_stock IS NULL OR current_stock = 0",
                "UPDATE items SET cost_price = purchase_price WHERE cost_price IS NULL",
                "UPDATE items SET minimum_stock = COALESCE(reorder_level, 0) WHERE minimum_stock IS NULL OR minimum_stock = 0",
                "UPDATE items SET sku = COALESCE(item_code, 'SKU-' || id::text) WHERE sku IS NULL",
                "UPDATE items SET category_account_id = account_id WHERE category_account_id IS NULL",
                "UPDATE items SET category_id = 1 WHERE category_id IS NULL", # Default category
                
                # Copy invoice data
                "UPDATE invoices SET invoice_date = issue_date WHERE invoice_date IS NULL",
                
                # Copy organization data
                "UPDATE organizations SET company_name = name WHERE company_name IS NULL",
                
                # Copy sales returns data
                "UPDATE sales_returns SET return_reason = reason WHERE return_reason IS NULL",
                
                # Copy shipments data
                "UPDATE shipments SET ship_date = shipment_date WHERE ship_date IS NULL",
                "UPDATE shipments SET expected_delivery_date = delivery_date WHERE expected_delivery_date IS NULL",
            ]
            
            print("\n🔄 Copying data to new columns...")
            for migration in data_migrations:
                try:
                    result = conn.execute(text(migration))
                    print(f"✅ {migration} - {result.rowcount} rows updated")
                except Exception as e:
                    print(f"⚠️  {migration} - {e}")
            
            # Check item_categories table
            print("\n🔍 Checking item_categories table...")
            try:
                result = conn.execute(text("SELECT COUNT(*) FROM item_categories"))
                count = result.scalar()
                print(f"✅ item_categories table exists with {count} records")
                
                if count == 0:
                    # Add a default category
                    conn.execute(text("""
                        INSERT INTO item_categories (account_id, id, name, description, is_active, created_at)
                        VALUES ('default', 1, 'General', 'Default category for items', true, NOW())
                        ON CONFLICT DO NOTHING
                    """))
                    print("✅ Added default category")
                    
            except Exception as e:
                print(f"⚠️  item_categories check failed: {e}")
            
            conn.commit()
            print("\n✅ Database schema fixed successfully!")
            
    except Exception as e:
        print(f"❌ Failed to fix database schema: {e}")
        return False
    
    return True

if __name__ == "__main__":
    fix_dashboard_columns()
