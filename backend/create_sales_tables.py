"""
Script to create sales return and credit tables manually.
"""

import sqlite3
from datetime import datetime

def create_sales_tables():
    """Create sales return and credit tables."""
    
    conn = sqlite3.connect('bai_db.db')
    cursor = conn.cursor()
    
    try:
        # Create sales_returns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales_returns (
                id INTEGER PRIMARY KEY,
                return_number VARCHAR(50) UNIQUE NOT NULL,
                return_date DATETIME NOT NULL,
                invoice_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                return_reason VARCHAR(100) NOT NULL,
                return_type VARCHAR(20) DEFAULT 'full',
                status VARCHAR(20) DEFAULT 'pending',
                total_return_amount DECIMAL(12, 2) NOT NULL,
                refund_amount DECIMAL(12, 2) NOT NULL,
                restocking_fee DECIMAL(12, 2) DEFAULT 0.00,
                refund_method VARCHAR(30) DEFAULT 'credit_note',
                refund_status VARCHAR(20) DEFAULT 'pending',
                refund_date DATETIME,
                refund_reference VARCHAR(100),
                return_reason_details TEXT,
                internal_notes TEXT,
                customer_notes TEXT,
                items_condition VARCHAR(20) DEFAULT 'good',
                quality_check_notes TEXT,
                processed_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (processed_by) REFERENCES users (id)
            )
        ''')
        
        # Create customer_credits table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_credits (
                id INTEGER PRIMARY KEY,
                credit_number VARCHAR(50) UNIQUE NOT NULL,
                credit_date DATETIME NOT NULL,
                customer_id INTEGER NOT NULL,
                invoice_id INTEGER,
                sales_return_id INTEGER,
                credit_type VARCHAR(30) NOT NULL,
                credit_reason VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                original_amount DECIMAL(12, 2) NOT NULL,
                used_amount DECIMAL(12, 2) DEFAULT 0.00,
                remaining_amount DECIMAL(12, 2) NOT NULL,
                expiry_date DATETIME,
                auto_expire BOOLEAN DEFAULT 1,
                minimum_order_amount DECIMAL(12, 2),
                applicable_categories TEXT,
                usage_limit_per_order DECIMAL(12, 2),
                description TEXT,
                internal_notes TEXT,
                customer_notes TEXT,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (sales_return_id) REFERENCES sales_returns (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Create sales_return_items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales_return_items (
                id INTEGER PRIMARY KEY,
                sales_return_id INTEGER NOT NULL,
                invoice_item_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                item_name VARCHAR(200) NOT NULL,
                item_sku VARCHAR(50) NOT NULL,
                original_quantity DECIMAL(10, 3) NOT NULL,
                return_quantity DECIMAL(10, 3) NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                return_amount DECIMAL(12, 2) NOT NULL,
                refund_amount DECIMAL(12, 2) NOT NULL,
                condition_on_return VARCHAR(20) DEFAULT 'good',
                return_reason VARCHAR(100),
                restockable BOOLEAN DEFAULT 1,
                restocked BOOLEAN DEFAULT 0,
                restock_date DATETIME,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (sales_return_id) REFERENCES sales_returns (id),
                FOREIGN KEY (invoice_item_id) REFERENCES invoice_items (id),
                FOREIGN KEY (item_id) REFERENCES items (id)
            )
        ''')
        
        # Create credit_transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id INTEGER PRIMARY KEY,
                credit_id INTEGER NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                transaction_date DATETIME NOT NULL,
                invoice_id INTEGER,
                amount DECIMAL(12, 2) NOT NULL,
                running_balance DECIMAL(12, 2) NOT NULL,
                description TEXT,
                reference_number VARCHAR(100),
                performed_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (credit_id) REFERENCES customer_credits (id),
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (performed_by) REFERENCES users (id)
            )
        ''')
        
        # Create credit_notes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS credit_notes (
                id INTEGER PRIMARY KEY,
                credit_note_number VARCHAR(50) UNIQUE NOT NULL,
                credit_note_date DATETIME NOT NULL,
                customer_id INTEGER NOT NULL,
                invoice_id INTEGER,
                sales_return_id INTEGER,
                customer_credit_id INTEGER,
                credit_note_type VARCHAR(30) NOT NULL,
                reason VARCHAR(100) NOT NULL,
                subtotal DECIMAL(12, 2) NOT NULL,
                tax_amount DECIMAL(12, 2) DEFAULT 0.00,
                total_amount DECIMAL(12, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'issued',
                description TEXT,
                notes TEXT,
                terms_conditions TEXT,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (invoice_id) REFERENCES invoices (id),
                FOREIGN KEY (sales_return_id) REFERENCES sales_returns (id),
                FOREIGN KEY (customer_credit_id) REFERENCES customer_credits (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Add GST slab column to items table if it doesn't exist
        cursor.execute("PRAGMA table_info(items)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'gst_slab_id' not in columns:
            cursor.execute('ALTER TABLE items ADD COLUMN gst_slab_id INTEGER REFERENCES gst_slabs(id)')
        
        conn.commit()
        print("Successfully created all sales tables!")
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_sales_tables() 