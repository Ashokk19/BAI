#!/usr/bin/env python3
"""
PostgreSQL Migration Setup Script for BAI Application

This script provides step-by-step instructions and automation for migrating
from SQLite to PostgreSQL with composite primary keys.
"""

import os
import sys
import subprocess
import psycopg2
from psycopg2 import sql
import sqlite3

def print_step(step_num, description):
    """Print a formatted step."""
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {description}")
    print('='*60)

def print_info(message):
    """Print an info message."""
    print(f"ℹ️  {message}")

def print_success(message):
    """Print a success message."""
    print(f"✅ {message}")

def print_error(message):
    """Print an error message."""
    print(f"❌ {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"⚠️  {message}")

def check_postgresql_connection():
    """Check if PostgreSQL is accessible."""
    try:
        # Try to connect to PostgreSQL server (not specific database)
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",  # Default superuser
            password="",  # You'll need to provide this
            database="postgres"  # Default database
        )
        conn.close()
        return True
    except Exception as e:
        print_error(f"Cannot connect to PostgreSQL: {e}")
        return False

def create_database_and_user():
    """Create the BAI database and user."""
    print_info("Creating PostgreSQL database and user...")
    
    # Read the SQL setup file
    sql_file = os.path.join("backend", "setup_postgres.sql")
    if not os.path.exists(sql_file):
        print_error(f"SQL setup file not found: {sql_file}")
        return False
    
    with open(sql_file, 'r') as f:
        sql_commands = f.read()
    
    print_info("Please run the following SQL commands as PostgreSQL superuser:")
    print("-" * 40)
    print(sql_commands)
    print("-" * 40)
    
    return True

def backup_sqlite_data():
    """Create a backup of SQLite data."""
    print_info("Creating backup of SQLite database...")
    
    if not os.path.exists("bai_db.db"):
        print_error("SQLite database 'bai_db.db' not found!")
        return False
    
    from datetime import datetime
    backup_name = f"bai_db_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    try:
        import shutil
        shutil.copy2("bai_db.db", backup_name)
        print_success(f"Backup created: {backup_name}")
        return True
    except Exception as e:
        print_error(f"Failed to create backup: {e}")
        return False

def run_alembic_migration():
    """Run Alembic migration to create new schema."""
    print_info("Running Alembic migration...")
    
    try:
        # Change to backend directory
        os.chdir("backend")
        
        # Run the migration
        result = subprocess.run([
            sys.executable, "-c",
            "from alembic.config import Config; from alembic import command; "
            "cfg = Config('alembic.ini'); "
            "command.upgrade(cfg, 'postgres_composite_keys')"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_success("Alembic migration completed successfully!")
            return True
        else:
            print_error(f"Alembic migration failed: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Failed to run Alembic migration: {e}")
        return False
    finally:
        os.chdir("..")

def migrate_data():
    """Migrate data from SQLite to PostgreSQL."""
    print_info("Migrating data from SQLite to PostgreSQL...")
    
    try:
        # Run the migration script
        result = subprocess.run([
            sys.executable, "backend/migrate_to_postgres.py"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_success("Data migration completed successfully!")
            print(result.stdout)
            return True
        else:
            print_error(f"Data migration failed: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Failed to run data migration: {e}")
        return False

def test_connection():
    """Test the new PostgreSQL connection."""
    print_info("Testing PostgreSQL connection...")
    
    try:
        sys.path.append("backend")
        from config.settings import settings
        from database.database import engine
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            if result.fetchone()[0] == 1:
                print_success("PostgreSQL connection test successful!")
                return True
    except Exception as e:
        print_error(f"Connection test failed: {e}")
        return False

def main():
    """Main migration process."""
    print("🚀 BAI PostgreSQL Migration Setup")
    print("This script will guide you through migrating from SQLite to PostgreSQL")
    print("with composite primary keys using account_id.")
    
    # Step 1: Check prerequisites
    print_step(1, "Checking Prerequisites")
    
    if not os.path.exists("bai_db.db"):
        print_error("SQLite database 'bai_db.db' not found in current directory!")
        print_info("Please run this script from the BAI root directory.")
        return
    
    print_success("SQLite database found")
    
    # Step 2: PostgreSQL Setup Instructions
    print_step(2, "PostgreSQL Database Setup")
    print_info("You need to have PostgreSQL installed and running.")
    print_info("Default connection settings:")
    print_info("  Host: localhost")
    print_info("  Port: 5432")
    print_info("  Database: bai_db")
    print_info("  User: bai_user")
    print_info("  Password: bai_password")
    
    create_database_and_user()
    
    input("\nPress Enter after you have created the database and user...")
    
    # Step 3: Backup existing data
    print_step(3, "Backing up SQLite Data")
    if not backup_sqlite_data():
        print_error("Backup failed. Aborting migration.")
        return
    
    # Step 4: Test PostgreSQL connection
    print_step(4, "Testing PostgreSQL Connection")
    if not test_connection():
        print_error("PostgreSQL connection failed. Please check your setup.")
        return
    
    # Step 5: Run schema migration
    print_step(5, "Creating New Schema")
    if not run_alembic_migration():
        print_error("Schema migration failed. Please check the logs.")
        return
    
    # Step 6: Migrate data
    print_step(6, "Migrating Data")
    if not migrate_data():
        print_error("Data migration failed. Please check the logs.")
        return
    
    # Step 7: Final verification
    print_step(7, "Final Verification")
    if test_connection():
        print_success("🎉 Migration completed successfully!")
        print_info("Your application is now using PostgreSQL with composite primary keys.")
        print_info("You can start your application normally.")
    else:
        print_error("Final verification failed. Please check your setup.")

if __name__ == "__main__":
    main()
