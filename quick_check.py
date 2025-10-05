#!/usr/bin/env python3
"""
Quick Database Check

Simple script to verify PostgreSQL migration status.
"""

import psycopg2

def quick_check():
    """Quick check of database status."""
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("PostgreSQL Database Status Check")
        print("=" * 40)
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table}")
        
        print("\nPrimary Key Analysis:")
        print("-" * 40)
        
        composite_pk_count = 0
        single_pk_count = 0
        no_pk_count = 0
        
        for table in tables:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.key_column_usage 
                WHERE table_name = '{table}' 
                AND constraint_name LIKE '%_pkey'
                ORDER BY ordinal_position
            """)
            pk_columns = [row[0] for row in cursor.fetchall()]
            
            if pk_columns == ['account_id', 'id']:
                print(f"  {table:<25} [SUCCESS] Composite PK (account_id, id)")
                composite_pk_count += 1
            elif pk_columns and 'account_id' in pk_columns:
                print(f"  {table:<25} [PARTIAL] Has account_id: {', '.join(pk_columns)}")
                single_pk_count += 1
            elif pk_columns:
                print(f"  {table:<25} [NEEDS MIGRATION] Single PK: {', '.join(pk_columns)}")
                single_pk_count += 1
            else:
                print(f"  {table:<25} [ERROR] No primary key")
                no_pk_count += 1
        
        print("\nSummary:")
        print("-" * 40)
        print(f"Tables with composite PK (account_id, id): {composite_pk_count}")
        print(f"Tables with other PK structures: {single_pk_count}")
        print(f"Tables without PK: {no_pk_count}")
        print(f"Total tables: {len(tables)}")
        
        # Check data
        print("\nData Check:")
        print("-" * 40)
        total_records = 0
        for table in ['users', 'customers', 'invoices', 'payments', 'items']:
            if table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    total_records += count
                    print(f"  {table:<15} {count:>8} records")
                except:
                    print(f"  {table:<15} {'Error':>8}")
        
        print(f"\nTotal records in key tables: {total_records}")
        
        # Final assessment
        print("\nAssessment:")
        print("-" * 40)
        if composite_pk_count == len(tables):
            print("[SUCCESS] All tables have composite primary keys!")
            print("Migration is COMPLETE. No further action needed.")
            print("\nNext steps:")
            print("1. Start backend: cd backend && uvicorn app.main:app --reload")
            print("2. Test API at: http://localhost:8001/docs")
        elif composite_pk_count > 0:
            print(f"[PARTIAL] {composite_pk_count}/{len(tables)} tables have composite PKs")
            print("Some tables may need migration.")
            print("\nRecommended action:")
            print("python verify_postgres_migration.py")
        else:
            print("[NEEDS MIGRATION] No tables have composite primary keys")
            print("Full migration required.")
            print("\nRecommended action:")
            print("python manual_migration_steps.py")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        return False

if __name__ == "__main__":
    quick_check()
