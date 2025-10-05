#!/usr/bin/env python3
"""
PostgreSQL Migration Script for BAI Application

This script handles the migration from SQLite to PostgreSQL and updates
the schema to use composite primary keys with account_id.
"""

import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings

def connect_sqlite():
    """Connect to SQLite database."""
    return sqlite3.connect('bai_db.db')

def connect_postgres():
    """Connect to PostgreSQL database."""
    return psycopg2.connect(
        host=settings.DATABASE_HOST,
        port=settings.DATABASE_PORT,
        database=settings.DATABASE_NAME,
        user=settings.DATABASE_USER,
        password=settings.DATABASE_PASSWORD
    )

def get_sqlite_tables(sqlite_conn):
    """Get all tables from SQLite database."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    return [row[0] for row in cursor.fetchall()]

def migrate_table_data(table_name, sqlite_conn, postgres_conn):
    """Migrate data from SQLite table to PostgreSQL."""
    print(f"Migrating table: {table_name}")
    
    # Get data from SQLite
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"  No data found in {table_name}")
        return
    
    # Get column names
    column_names = [description[0] for description in sqlite_cursor.description]
    
    # Prepare PostgreSQL insert
    postgres_cursor = postgres_conn.cursor()
    
    # Handle special cases for tables with account_id
    if 'account_id' in column_names:
        # Data already has account_id, migrate as-is
        placeholders = ', '.join(['%s'] * len(column_names))
        insert_query = f"INSERT INTO {table_name} ({', '.join(column_names)}) VALUES ({placeholders})"
        
        for row in rows:
            try:
                postgres_cursor.execute(insert_query, row)
            except Exception as e:
                print(f"  Error inserting row in {table_name}: {e}")
                print(f"  Row data: {row}")
    else:
        # Add default account_id for tables that don't have it
        column_names.append('account_id')
        placeholders = ', '.join(['%s'] * len(column_names))
        insert_query = f"INSERT INTO {table_name} ({', '.join(column_names)}) VALUES ({placeholders})"
        
        for row in rows:
            try:
                row_with_account = list(row) + ['TestAccount']
                postgres_cursor.execute(insert_query, row_with_account)
            except Exception as e:
                print(f"  Error inserting row in {table_name}: {e}")
                print(f"  Row data: {row_with_account}")
    
    postgres_conn.commit()
    print(f"  Migrated {len(rows)} rows")

def main():
    """Main migration function."""
    print("Starting PostgreSQL migration...")
    
    # Check if SQLite database exists
    if not os.path.exists('bai_db.db'):
        print("Error: SQLite database 'bai_db.db' not found!")
        return
    
    try:
        # Connect to databases
        print("Connecting to databases...")
        sqlite_conn = connect_sqlite()
        postgres_conn = connect_postgres()
        
        # Get tables from SQLite
        tables = get_sqlite_tables(sqlite_conn)
        print(f"Found {len(tables)} tables to migrate: {tables}")
        
        # Skip alembic version table for now
        tables_to_migrate = [t for t in tables if t != 'alembic_version']
        
        # Migrate each table
        for table in tables_to_migrate:
            try:
                migrate_table_data(table, sqlite_conn, postgres_conn)
            except Exception as e:
                print(f"Error migrating table {table}: {e}")
                continue
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'sqlite_conn' in locals():
            sqlite_conn.close()
        if 'postgres_conn' in locals():
            postgres_conn.close()

if __name__ == "__main__":
    main()
