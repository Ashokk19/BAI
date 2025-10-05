#!/usr/bin/env python3
"""
PostgreSQL Migration Verification Script for BAI Application

This script verifies that the PostgreSQL migration was successful and all
tables have the correct composite primary keys with account_id.
"""

import psycopg2
import sys
from tabulate import tabulate

def print_success(message):
    """Print a success message."""
    print(f"✅ {message}")

def print_error(message):
    """Print an error message."""
    print(f"❌ {message}")

def print_info(message):
    """Print an info message."""
    print(f"ℹ️  {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"⚠️  {message}")

def connect_to_postgres():
    """Connect to PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        return conn
    except Exception as e:
        print_error(f"Failed to connect to PostgreSQL: {e}")
        return None

def check_tables_exist(cursor):
    """Check if all expected tables exist."""
    print("\n" + "="*60)
    print("CHECKING TABLE EXISTENCE")
    print("="*60)
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    existing_tables = [row[0] for row in cursor.fetchall()]
    
    expected_tables = [
        'users', 'organizations', 'customers', 'vendors', 'items', 'item_categories',
        'invoices', 'invoice_items', 'payments', 'payment_logs', 'customer_credits',
        'credit_transactions', 'credit_notes', 'shipments', 'delivery_notes',
        'sales_returns', 'sales_return_items', 'inventory_logs', 'gst_slabs',
        'purchase_orders', 'purchase_order_items', 'purchase_received'
    ]
    
    table_status = []
    for table in expected_tables:
        status = "✅ EXISTS" if table in existing_tables else "❌ MISSING"
        table_status.append([table, status])
    
    print(tabulate(table_status, headers=["Table Name", "Status"], tablefmt="grid"))
    
    missing_tables = [t for t in expected_tables if t not in existing_tables]
    if missing_tables:
        print_warning(f"Missing tables: {', '.join(missing_tables)}")
        return False
    else:
        print_success("All expected tables exist")
        return True

def check_primary_keys(cursor):
    """Check if tables have correct composite primary keys."""
    print("\n" + "="*60)
    print("CHECKING PRIMARY KEY STRUCTURES")
    print("="*60)
    
    # Tables that should have composite primary keys (account_id, id)
    composite_pk_tables = [
        'users', 'organizations', 'customers', 'vendors', 'items', 'item_categories',
        'invoices', 'invoice_items', 'payments', 'payment_logs', 'customer_credits',
        'credit_transactions', 'credit_notes', 'shipments', 'delivery_notes',
        'sales_returns', 'sales_return_items', 'inventory_logs', 'gst_slabs',
        'purchase_orders', 'purchase_order_items', 'purchase_received'
    ]
    
    pk_status = []
    all_correct = True
    
    for table in composite_pk_tables:
        try:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.key_column_usage 
                WHERE table_name = '{table}' 
                AND constraint_name LIKE '%_pkey'
                ORDER BY ordinal_position
            """)
            pk_columns = [row[0] for row in cursor.fetchall()]
            
            if pk_columns == ['account_id', 'id']:
                status = "✅ CORRECT"
            elif not pk_columns:
                status = "❌ NO PK"
                all_correct = False
            else:
                status = f"⚠️  WRONG: {', '.join(pk_columns)}"
                all_correct = False
            
            pk_status.append([table, ', '.join(pk_columns) if pk_columns else 'None', status])
            
        except Exception as e:
            pk_status.append([table, 'ERROR', f"❌ {str(e)[:30]}..."])
            all_correct = False
    
    print(tabulate(pk_status, headers=["Table Name", "Primary Key Columns", "Status"], tablefmt="grid"))
    
    if all_correct:
        print_success("All tables have correct composite primary keys")
    else:
        print_warning("Some tables have incorrect primary key structures")
    
    return all_correct

def check_foreign_keys(cursor):
    """Check if foreign key constraints are properly set up."""
    print("\n" + "="*60)
    print("CHECKING FOREIGN KEY CONSTRAINTS")
    print("="*60)
    
    cursor.execute("""
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, kcu.column_name
    """)
    
    fk_constraints = cursor.fetchall()
    
    if fk_constraints:
        fk_data = []
        for constraint in fk_constraints:
            fk_data.append([
                constraint[0],  # table_name
                constraint[1],  # column_name
                f"{constraint[2]}.{constraint[3]}"  # foreign_table.foreign_column
            ])
        
        print(tabulate(fk_data, headers=["Table", "Column", "References"], tablefmt="grid"))
        print_success(f"Found {len(fk_constraints)} foreign key constraints")
    else:
        print_warning("No foreign key constraints found")
    
    return len(fk_constraints) > 0

def check_data_migration(cursor):
    """Check if data was migrated successfully."""
    print("\n" + "="*60)
    print("CHECKING DATA MIGRATION")
    print("="*60)
    
    key_tables = ['users', 'customers', 'invoices', 'payments', 'items']
    data_status = []
    total_records = 0
    
    for table in key_tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            total_records += count
            status = "✅ HAS DATA" if count > 0 else "⚠️  EMPTY"
            data_status.append([table, count, status])
        except Exception as e:
            data_status.append([table, 'ERROR', f"❌ {str(e)[:20]}..."])
    
    print(tabulate(data_status, headers=["Table", "Record Count", "Status"], tablefmt="grid"))
    
    if total_records > 0:
        print_success(f"Data migration successful - {total_records} total records in key tables")
        return True
    else:
        print_warning("No data found in key tables")
        return False

def check_account_id_usage(cursor):
    """Check if account_id is properly used across tables."""
    print("\n" + "="*60)
    print("CHECKING ACCOUNT_ID USAGE")
    print("="*60)
    
    tables_with_data = []
    
    # Check which tables have account_id column and data
    key_tables = ['users', 'customers', 'invoices', 'payments', 'items']
    
    for table in key_tables:
        try:
            cursor.execute(f"""
                SELECT DISTINCT account_id, COUNT(*) as count 
                FROM {table} 
                GROUP BY account_id 
                ORDER BY account_id
            """)
            account_data = cursor.fetchall()
            
            if account_data:
                for account_id, count in account_data:
                    tables_with_data.append([table, account_id, count])
        except Exception as e:
            tables_with_data.append([table, 'ERROR', str(e)[:30] + '...'])
    
    if tables_with_data:
        print(tabulate(tables_with_data, headers=["Table", "Account ID", "Records"], tablefmt="grid"))
        print_success("Account ID is being used for data separation")
        return True
    else:
        print_warning("No account_id data found")
        return False

def main():
    """Main verification function."""
    print("🔍 BAI PostgreSQL Migration Verification")
    print("This script verifies the PostgreSQL migration status and composite primary keys.")
    
    # Connect to PostgreSQL
    conn = connect_to_postgres()
    if not conn:
        print_error("Cannot connect to PostgreSQL. Migration verification failed.")
        return False
    
    cursor = conn.cursor()
    
    try:
        # Run all checks
        checks_passed = 0
        total_checks = 5
        
        if check_tables_exist(cursor):
            checks_passed += 1
        
        if check_primary_keys(cursor):
            checks_passed += 1
        
        if check_foreign_keys(cursor):
            checks_passed += 1
        
        if check_data_migration(cursor):
            checks_passed += 1
        
        if check_account_id_usage(cursor):
            checks_passed += 1
        
        # Summary
        print("\n" + "="*60)
        print("VERIFICATION SUMMARY")
        print("="*60)
        
        if checks_passed == total_checks:
            print_success(f"🎉 All {total_checks} verification checks passed!")
            print_info("Your PostgreSQL migration is complete and successful.")
            print_info("All tables have composite primary keys with account_id.")
            return True
        else:
            print_warning(f"⚠️  {checks_passed}/{total_checks} verification checks passed.")
            print_info("Some issues were found. Please review the details above.")
            return False
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
