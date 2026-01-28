#!/usr/bin/env python3
"""
Check PostgreSQL Database Status

This script checks what's already in the PostgreSQL database.
"""

import psycopg2

def check_database_status():
    """Check the current status of the PostgreSQL database."""
    
    try:
        # Connect to PostgreSQL
        print("[INFO] Connecting to PostgreSQL database...")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("[SUCCESS] Connected to PostgreSQL database successfully!")
        
        # Check existing tables
        print("\n" + "="*60)
        print("EXISTING TABLES")
        print("="*60)
        
        cursor.execute("""
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_name = t.table_name AND table_schema = 'public') as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        if tables:
            table_data = []
            for table_name, col_count in tables:
                # Get row count
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    row_count = cursor.fetchone()[0]
                except:
                    row_count = "Error"
                
                table_data.append([table_name, col_count, row_count])
            
            print(f"{'Table Name':<20} {'Columns':<10} {'Rows':<10}")
            print("-" * 45)
            for table_name, col_count, row_count in table_data:
                print(f"{table_name:<20} {col_count:<10} {row_count:<10}")
        else:
            print("[INFO] No tables found in the database")
        
        # Check primary keys for existing tables
        if tables:
            print("\n" + "="*60)
            print("PRIMARY KEY STRUCTURES")
            print("="*60)
            
            pk_data = []
            for table_name, _ in tables:
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.key_column_usage 
                    WHERE table_name = '{table_name}' 
                    AND constraint_name LIKE '%_pkey'
                    ORDER BY ordinal_position
                """)
                pk_columns = [row[0] for row in cursor.fetchall()]
                
                if pk_columns:
                    pk_status = "COMPOSITE (account_id, id)" if pk_columns == ['account_id', 'id'] else f"SINGLE ({', '.join(pk_columns)})"
                    pk_data.append([table_name, ', '.join(pk_columns), pk_status])
                else:
                    pk_data.append([table_name, "None", "NO PRIMARY KEY"])
            
            print(f"{'Table':<20} {'Primary Key Columns':<25} {'Type':<30}")
            print("-" * 80)
            for table_name, pk_cols, pk_type in pk_data:
                print(f"{table_name:<20} {pk_cols:<25} {pk_type:<30}")
        
        # Check for account_id usage
        if tables:
            print("\n" + "="*60)
            print("ACCOUNT_ID USAGE")
            print("="*60)
            
            account_data = []
            for table_name, _ in tables:
                # Check if table has account_id column
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND column_name = 'account_id'
                """)
                has_account_id = cursor.fetchone() is not None
                
                if has_account_id:
                    try:
                        cursor.execute(f"SELECT DISTINCT account_id, COUNT(*) FROM {table_name} GROUP BY account_id")
                        account_usage = cursor.fetchall()
                        if account_usage:
                            for account_id, count in account_usage:
                                account_data.append([table_name, account_id, count])
                        else:
                            account_data.append([table_name, "No data", 0])
                    except:
                        account_data.append([table_name, "Error reading", "Error"])
                else:
                    account_data.append([table_name, "No account_id column", "N/A"])
            
            if account_data:
                print(f"{'Table':<20} {'Account ID':<15} {'Records':<10}")
                print("-" * 50)
                for table_name, account_id, count in account_data:
                    print(f"{table_name:<20} {str(account_id):<15} {str(count):<10}")
        
        # Check Alembic migration status
        print("\n" + "="*60)
        print("MIGRATION STATUS")
        print("="*60)
        
        try:
            cursor.execute("SELECT version_num FROM alembic_version ORDER BY version_num")
            versions = cursor.fetchall()
            if versions:
                print("Alembic versions applied:")
                for version in versions:
                    print(f"  - {version[0]}")
            else:
                print("[INFO] No Alembic versions found")
        except:
            print("[INFO] No alembic_version table found")
        
        cursor.close()
        conn.close()
        
        # Summary and recommendations
        print("\n" + "="*60)
        print("RECOMMENDATIONS")
        print("="*60)
        
        if not tables:
            print("[ACTION NEEDED] Database is empty - run full migration")
            print("Command: python manual_migration_steps.py")
        else:
            # Check if migration is needed
            needs_migration = False
            composite_pk_tables = 0
            
            for table_name, _ in tables:
                cursor = psycopg2.connect(
                    host="localhost", port=5432, database="bai_db",
                    user="bai_user", password="bai_password"
                ).cursor()
                
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.key_column_usage 
                    WHERE table_name = '{table_name}' 
                    AND constraint_name LIKE '%_pkey'
                    ORDER BY ordinal_position
                """)
                pk_columns = [row[0] for row in cursor.fetchall()]
                
                if pk_columns == ['account_id', 'id']:
                    composite_pk_tables += 1
                elif pk_columns and pk_columns != ['account_id', 'id']:
                    needs_migration = True
                
                cursor.close()
            
            if needs_migration:
                print("[ACTION NEEDED] Some tables need composite primary key migration")
                print("Command: python manual_migration_steps.py")
            elif composite_pk_tables == len(tables):
                print("[SUCCESS] All tables already have composite primary keys!")
                print("Command: python verify_postgres_migration.py")
            else:
                print("[PARTIAL] Some tables have composite keys, some don't")
                print("Command: python manual_migration_steps.py")
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"[ERROR] Cannot connect to PostgreSQL: {e}")
        print("[ACTION NEEDED] Set up PostgreSQL database first")
        print("Command: python create_db_simple.py")
        return False
    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        return False

if __name__ == "__main__":
    print("PostgreSQL Database Status Check")
    print("=" * 40)
    check_database_status()
