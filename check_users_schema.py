#!/usr/bin/env python3
"""
Check the actual PostgreSQL users table schema.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database.postgres_db import postgres_db

def check_users_schema():
    """Check the actual PostgreSQL users table schema."""
    
    try:
        print("=== USERS TABLE COLUMNS (PostgreSQL) ===")
        result = postgres_db.execute_query("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        
        print("Column Name               | Data Type        | Nullable | Default")
        print("-" * 70)
        for row in result:
            nullable = "YES" if row['is_nullable'] == "YES" else "NO"
            default = row['column_default'] if row['column_default'] else "None"
            print(f"{row['column_name']:<25} | {row['data_type']:<15} | {nullable:<8} | {default}")
        
        print(f"\n=== SAMPLE USER DATA ===")
        users = postgres_db.execute_query("SELECT * FROM users LIMIT 2")
        if users:
            for user in users:
                print("User:")
                for key, value in user.items():
                    print(f"  {key}: {value}")
                print("---")
        else:
            print("No users found in database")
            
    except Exception as e:
        print(f"Error checking users schema: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_users_schema()
