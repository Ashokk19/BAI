#!/usr/bin/env python3
"""
Check Users Table Structure
"""

import psycopg2

def check_users_table():
    """Check the actual structure of the users table."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Users Table Structure:")
        print("=" * 40)
        
        # Get column information
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        
        if columns:
            print(f"{'Column Name':<20} {'Data Type':<15} {'Nullable':<10} {'Default':<15}")
            print("-" * 70)
            for col_name, data_type, nullable, default in columns:
                default_str = str(default)[:12] + "..." if default and len(str(default)) > 15 else str(default) if default else ""
                print(f"{col_name:<20} {data_type:<15} {nullable:<10} {default_str:<15}")
        else:
            print("No users table found or no columns")
        
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            )
        """)
        table_exists = cursor.fetchone()[0]
        print(f"\nTable exists: {table_exists}")
        
        # Get sample data
        if table_exists:
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            print(f"Row count: {count}")
            
            if count > 0:
                cursor.execute("SELECT * FROM users LIMIT 1")
                sample_row = cursor.fetchone()
                print(f"Sample row: {sample_row}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users_table()
