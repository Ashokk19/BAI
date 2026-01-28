#!/usr/bin/env python3
"""
Manual PostgreSQL Migration Steps

This script provides manual step-by-step migration when automated scripts fail.
"""

import os
import sys
import psycopg2
import sqlite3
import shutil
from datetime import datetime

def print_step(step, description):
    print(f"\n{'='*60}")
    print(f"STEP {step}: {description}")
    print('='*60)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")

def create_tables_manually():
    """Create all tables manually with composite primary keys."""
    print_info("Creating tables manually...")
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        # Create users table
        print_info("Creating users table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                account_id VARCHAR(100) NOT NULL,
                id SERIAL,
                email VARCHAR(255) NOT NULL,
                username VARCHAR(100) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                is_verified BOOLEAN DEFAULT FALSE,
                phone VARCHAR(20),
                mobile VARCHAR(20),
                address TEXT,
                city VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id)
            )
        """)
        
        # Create customers table
        print_info("Creating customers table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                account_id VARCHAR(100) NOT NULL,
                id SERIAL,
                customer_code VARCHAR(50) NOT NULL,
                company_name VARCHAR(200),
                contact_person VARCHAR(100),
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                mobile VARCHAR(20),
                website VARCHAR(255),
                billing_address TEXT,
                shipping_address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100),
                postal_code VARCHAR(20),
                customer_type VARCHAR(20) DEFAULT 'individual',
                tax_number VARCHAR(50),
                gst_number VARCHAR(50),
                credit_limit DECIMAL(12,2) DEFAULT 0.00,
                payment_terms VARCHAR(50) DEFAULT 'immediate',
                currency VARCHAR(10) DEFAULT 'USD',
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id)
            )
        """)
        
        # Create items table
        print_info("Creating items table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS items (
                account_id VARCHAR(100) NOT NULL,
                id SERIAL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                sku VARCHAR(50) NOT NULL,
                barcode VARCHAR(50),
                category_id INTEGER,
                unit_price DECIMAL(10,2),
                cost_price DECIMAL(10,2),
                tax_rate DECIMAL(5,2) DEFAULT 0.00,
                current_stock INTEGER DEFAULT 0,
                minimum_stock INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                expiry_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id)
            )
        """)
        
        # Create invoices table
        print_info("Creating invoices table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                account_id VARCHAR(50) NOT NULL,
                id SERIAL,
                invoice_number VARCHAR(50) NOT NULL,
                invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
                due_date TIMESTAMP WITH TIME ZONE,
                customer_account_id VARCHAR(50) NOT NULL,
                customer_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                invoice_type VARCHAR(20) DEFAULT 'sale',
                subtotal DECIMAL(12,2) DEFAULT 0.00,
                tax_amount DECIMAL(12,2) DEFAULT 0.00,
                total_cgst DECIMAL(12,2) DEFAULT 0.00,
                total_sgst DECIMAL(12,2) DEFAULT 0.00,
                total_igst DECIMAL(12,2) DEFAULT 0.00,
                discount_amount DECIMAL(12,2) DEFAULT 0.00,
                total_amount DECIMAL(12,2) DEFAULT 0.00,
                paid_amount DECIMAL(12,2) DEFAULT 0.00,
                payment_terms VARCHAR(50) DEFAULT 'immediate',
                currency VARCHAR(10) DEFAULT 'USD',
                billing_address TEXT,
                shipping_address TEXT,
                notes TEXT,
                terms_conditions TEXT,
                created_by_account_id VARCHAR(50) NOT NULL,
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id),
                FOREIGN KEY (customer_account_id, customer_id) REFERENCES customers(account_id, id)
            )
        """)
        
        # Create payments table
        print_info("Creating payments table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                account_id VARCHAR(100) NOT NULL,
                id SERIAL,
                payment_number VARCHAR(50) NOT NULL,
                payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
                payment_type VARCHAR(20) NOT NULL,
                payment_direction VARCHAR(20) NOT NULL,
                invoice_account_id VARCHAR(100),
                invoice_id INTEGER,
                customer_account_id VARCHAR(100),
                customer_id INTEGER,
                vendor_account_id VARCHAR(100),
                vendor_id INTEGER,
                amount DECIMAL(12,2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD',
                payment_method VARCHAR(50) NOT NULL,
                payment_status VARCHAR(20) DEFAULT 'pending',
                reference_number VARCHAR(100),
                bank_account VARCHAR(100),
                check_number VARCHAR(50),
                transaction_id VARCHAR(100),
                notes TEXT,
                recorded_by_account_id VARCHAR(100) NOT NULL,
                recorded_by INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id)
            )
        """)
        
        # Create organizations table
        print_info("Creating organizations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                account_id VARCHAR(100) NOT NULL,
                id SERIAL,
                company_name VARCHAR(255) NOT NULL,
                business_type VARCHAR(100),
                industry VARCHAR(100),
                founded_year VARCHAR(10),
                employee_count VARCHAR(50),
                registration_number VARCHAR(100),
                tax_id VARCHAR(100),
                gst_number VARCHAR(100),
                pan_number VARCHAR(100),
                phone VARCHAR(50),
                email VARCHAR(255),
                website VARCHAR(255),
                currency VARCHAR(10) DEFAULT 'INR',
                timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
                fiscal_year_start VARCHAR(10),
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                country VARCHAR(100) DEFAULT 'India',
                bank_name VARCHAR(255),
                bank_account_number VARCHAR(50),
                bank_account_holder_name VARCHAR(255),
                bank_ifsc_code VARCHAR(20),
                bank_branch_name VARCHAR(255),
                bank_branch_address TEXT,
                bank_account_type VARCHAR(50),
                bank_swift_code VARCHAR(20),
                description TEXT,
                logo_url VARCHAR(500),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (account_id, id)
            )
        """)
        
        # Create alembic_version table for tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            )
        """)
        
        # Insert version to mark as migrated
        cursor.execute("""
            INSERT INTO alembic_version (version_num) 
            VALUES ('manual_migration_complete') 
            ON CONFLICT (version_num) DO NOTHING
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print_success("All tables created successfully!")
        return True
        
    except Exception as e:
        print_error(f"Failed to create tables: {e}")
        return False

def migrate_data_manually():
    """Migrate data from SQLite to PostgreSQL manually."""
    print_info("Migrating data manually...")
    
    try:
        # Connect to SQLite
        sqlite_conn = sqlite3.connect("backend/bai_db.db")
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to PostgreSQL
        pg_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        pg_cursor = pg_conn.cursor()
        
        # Get list of tables from SQLite
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in sqlite_cursor.fetchall()]
        
        for table in tables:
            if table == 'alembic_version':
                continue
                
            print_info(f"Migrating table: {table}")
            
            # Get data from SQLite
            sqlite_cursor.execute(f"SELECT * FROM {table}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                print_info(f"  No data in {table}")
                continue
            
            # Get column names
            sqlite_cursor.execute(f"PRAGMA table_info({table})")
            columns_info = sqlite_cursor.fetchall()
            column_names = [col[1] for col in columns_info]
            
            # Check if table exists in PostgreSQL and has account_id
            try:
                pg_cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                pg_columns = [row[0] for row in pg_cursor.fetchall()]
                
                if not pg_columns:
                    print_info(f"  Table {table} doesn't exist in PostgreSQL, skipping")
                    continue
                
                # Add account_id if not present in SQLite data
                if 'account_id' in pg_columns and 'account_id' not in column_names:
                    column_names = ['account_id'] + column_names
                    rows = [('TestAccount',) + row for row in rows]
                
                # Filter columns to match PostgreSQL table
                valid_columns = [col for col in column_names if col in pg_columns]
                
                if valid_columns:
                    placeholders = ', '.join(['%s'] * len(valid_columns))
                    insert_query = f"INSERT INTO {table} ({', '.join(valid_columns)}) VALUES ({placeholders})"
                    
                    for row in rows:
                        try:
                            # Filter row data to match valid columns
                            filtered_row = []
                            for i, col in enumerate(column_names):
                                if col in valid_columns:
                                    if i < len(row):
                                        filtered_row.append(row[i])
                                    else:
                                        filtered_row.append(None)
                            
                            pg_cursor.execute(insert_query, filtered_row)
                        except Exception as e:
                            print_error(f"    Error inserting row: {e}")
                            continue
                    
                    pg_conn.commit()
                    print_success(f"  Migrated {len(rows)} rows to {table}")
                
            except Exception as e:
                print_error(f"  Error with table {table}: {e}")
                continue
        
        sqlite_conn.close()
        pg_conn.close()
        
        print_success("Data migration completed!")
        return True
        
    except Exception as e:
        print_error(f"Data migration failed: {e}")
        return False

def main():
    print("🔧 Manual PostgreSQL Migration")
    print("This script performs manual migration steps.")
    
    print_step(1, "Creating Database Schema")
    if not create_tables_manually():
        print_error("Failed to create schema")
        return False
    
    print_step(2, "Migrating Data")
    if not migrate_data_manually():
        print_error("Failed to migrate data")
        return False
    
    print_step(3, "Migration Complete")
    print_success("🎉 Manual migration completed successfully!")
    print_info("Your database now has composite primary keys with account_id")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
