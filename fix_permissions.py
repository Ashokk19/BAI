#!/usr/bin/env python3
"""
Fix PostgreSQL Permissions

This script fixes the database permissions for bai_user.
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def fix_permissions():
    """Fix database permissions."""
    
    # Get postgres password
    postgres_password = input("Enter PostgreSQL superuser (postgres) password: ")
    
    try:
        # Connect as superuser to the bai_db database
        print("[INFO] Connecting to PostgreSQL as superuser...")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="postgres",
            password=postgres_password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("[INFO] Fixing permissions for bai_user...")
        
        # Grant all privileges on schema
        cursor.execute("GRANT ALL ON SCHEMA public TO bai_user")
        cursor.execute("GRANT CREATE ON SCHEMA public TO bai_user")
        cursor.execute("GRANT USAGE ON SCHEMA public TO bai_user")
        
        # Grant privileges on all existing tables and sequences
        cursor.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user")
        cursor.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user")
        
        # Set default privileges for future objects
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO bai_user")
        
        # Make bai_user owner of existing tables
        cursor.execute("""
            SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || ' OWNER TO bai_user;'
            FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        
        alter_commands = cursor.fetchall()
        for cmd in alter_commands:
            try:
                cursor.execute(cmd[0])
                print(f"[INFO] {cmd[0]}")
            except Exception as e:
                print(f"[WARNING] Failed to execute {cmd[0]}: {e}")
        
        # Make bai_user owner of existing sequences
        cursor.execute("""
            SELECT 'ALTER SEQUENCE ' || schemaname || '.' || sequencename || ' OWNER TO bai_user;'
            FROM pg_sequences 
            WHERE schemaname = 'public'
        """)
        
        alter_seq_commands = cursor.fetchall()
        for cmd in alter_seq_commands:
            try:
                cursor.execute(cmd[0])
                print(f"[INFO] {cmd[0]}")
            except Exception as e:
                print(f"[WARNING] Failed to execute {cmd[0]}: {e}")
        
        cursor.close()
        conn.close()
        
        print("[SUCCESS] Permissions fixed successfully!")
        
        # Test the connection
        print("[INFO] Testing bai_user permissions...")
        test_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        test_cursor = test_conn.cursor()
        
        # Try to create a test table
        test_cursor.execute("""
            CREATE TABLE IF NOT EXISTS permission_test (
                id SERIAL PRIMARY KEY,
                test_column VARCHAR(50)
            )
        """)
        test_cursor.execute("DROP TABLE IF EXISTS permission_test")
        
        test_cursor.close()
        test_conn.close()
        
        print("[SUCCESS] Permission test passed!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to fix permissions: {e}")
        return False

if __name__ == "__main__":
    print("PostgreSQL Permission Fix for BAI")
    print("=" * 40)
    
    if fix_permissions():
        print("\n[SUCCESS] Permissions are now fixed!")
        print("You can now start the backend server.")
    else:
        print("\n[ERROR] Permission fix failed.")
