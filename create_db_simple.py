#!/usr/bin/env python3
"""
Simple PostgreSQL Database Creator

This script creates the database and user for BAI migration.
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database():
    """Create database and user."""
    
    # Get postgres password
    postgres_password = input("Enter PostgreSQL superuser (postgres) password: ")
    
    try:
        # Connect as superuser
        print("[INFO] Connecting to PostgreSQL as superuser...")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="postgres",  # Connect to default database first
            user="postgres",
            password=postgres_password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Drop and create database
        print("[INFO] Creating database bai_db...")
        cursor.execute("DROP DATABASE IF EXISTS bai_db")
        cursor.execute("CREATE DATABASE bai_db")
        
        # Drop and create user
        print("[INFO] Creating user bai_user...")
        cursor.execute("DROP USER IF EXISTS bai_user")
        cursor.execute("CREATE USER bai_user WITH PASSWORD 'bai_password'")
        
        # Grant privileges on database
        print("[INFO] Granting database privileges...")
        cursor.execute("GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user")
        cursor.execute("ALTER DATABASE bai_db OWNER TO bai_user")
        
        cursor.close()
        conn.close()
        
        # Connect to the new database to set schema privileges
        print("[INFO] Setting schema privileges...")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="postgres",
            password=postgres_password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute("GRANT ALL ON SCHEMA public TO bai_user")
        cursor.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user")
        cursor.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user")
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user")
        
        cursor.close()
        conn.close()
        
        print("[SUCCESS] Database setup completed successfully!")
        print("Database: bai_db")
        print("User: bai_user")
        print("Password: bai_password")
        
        # Test the new connection
        print("[INFO] Testing new database connection...")
        test_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="bai_db",
            user="bai_user",
            password="bai_password"
        )
        test_conn.close()
        print("[SUCCESS] Connection test successful!")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Database setup failed: {e}")
        return False

if __name__ == "__main__":
    print("PostgreSQL Database Setup for BAI")
    print("=" * 40)
    
    if create_database():
        print("\n[SUCCESS] You can now run the migration:")
        print("python manual_migration_steps.py")
    else:
        print("\n[ERROR] Database setup failed. Please check the error messages above.")
