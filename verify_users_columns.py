#!/usr/bin/env python3
"""
Verify Users Table Columns

Check if all columns from the failing query exist in the users table.
"""

import psycopg2

def verify_users_columns():
    """Verify all columns exist in the users table."""
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        cursor = conn.cursor()
        
        print("Verifying Users Table Columns")
        print("=" * 50)
        
        # Get all columns from the users table
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        
        actual_columns = cursor.fetchall()
        actual_column_names = [col[0] for col in actual_columns]
        
        print(f"Actual columns in users table ({len(actual_column_names)}):")
        print("-" * 70)
        for col_name, data_type, nullable, default in actual_columns:
            default_str = str(default)[:20] + "..." if default and len(str(default)) > 23 else str(default) if default else "None"
            print(f"{col_name:<20} {data_type:<20} {nullable:<8} {default_str}")
        
        # Columns expected by the failing query
        expected_columns = [
            'account_id', 'id', 'email', 'username', 'hashed_password',
            'first_name', 'last_name', 'is_active', 'is_admin', 'is_verified',
            'phone', 'mobile', 'address', 'city', 'state', 'postal_code',
            'company', 'designation'
        ]
        
        print(f"\nExpected columns from query ({len(expected_columns)}):")
        print("-" * 50)
        
        missing_columns = []
        present_columns = []
        
        for col in expected_columns:
            if col in actual_column_names:
                present_columns.append(col)
                print(f"✅ {col}")
            else:
                missing_columns.append(col)
                print(f"❌ {col} - MISSING")
        
        print(f"\nSummary:")
        print(f"✅ Present: {len(present_columns)}/{len(expected_columns)}")
        print(f"❌ Missing: {len(missing_columns)}")
        
        if missing_columns:
            print(f"\nMissing columns: {missing_columns}")
            
            # Try to add missing columns
            print("\nAttempting to add missing columns...")
            column_definitions = {
                'state': 'VARCHAR(100)',
                'postal_code': 'VARCHAR(20)',
                'company': 'VARCHAR(200)',
                'designation': 'VARCHAR(100)'
            }
            
            for col in missing_columns:
                if col in column_definitions:
                    try:
                        cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {column_definitions[col]}")
                        print(f"✅ Added {col}")
                    except Exception as e:
                        print(f"❌ Failed to add {col}: {e}")
            
            conn.commit()
        else:
            print("✅ All expected columns are present!")
        
        # Test a simple query
        print("\nTesting simple query...")
        try:
            cursor.execute("SELECT account_id, id, email FROM users LIMIT 1")
            result = cursor.fetchone()
            print(f"✅ Simple query works: {result}")
        except Exception as e:
            print(f"❌ Simple query failed: {e}")
        
        # Test the problematic query
        print("\nTesting problematic query...")
        try:
            cursor.execute("""
                SELECT users.account_id, users.id, users.email, users.username, 
                       users.hashed_password, users.first_name, users.last_name, 
                       users.is_active, users.is_admin, users.is_verified, 
                       users.phone, users.mobile, users.address, users.city, 
                       users.state, users.postal_code, users.company, users.designation
                FROM users 
                WHERE users.email = %s OR users.username = %s 
                LIMIT 1
            """, ('test@example.com', 'testuser'))
            result = cursor.fetchone()
            print(f"✅ Full query works: {result}")
        except Exception as e:
            print(f"❌ Full query failed: {e}")
        
        cursor.close()
        conn.close()
        
        return len(missing_columns) == 0
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    success = verify_users_columns()
    if success:
        print("\n🎉 All columns verified successfully!")
    else:
        print("\n❌ Some columns are still missing.")
