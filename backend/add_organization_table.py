#!/usr/bin/env python3
"""
Script to add the organizations table to the existing BAI database.
This script creates the organizations table and links it to existing users.
"""

import sqlite3
import os
from pathlib import Path

def add_organization_table():
    """Add organizations table to the BAI database."""
    
    # Get the database path
    db_path = Path(__file__).parent / "bai_db.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    print(f"Connecting to database: {db_path}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if organizations table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='organizations'
        """)
        
        if cursor.fetchone():
            print("Organizations table already exists!")
            return
        
        print("Creating organizations table...")
        
        # Create the organizations table
        cursor.execute("""
            CREATE TABLE organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id VARCHAR(100) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                business_type VARCHAR(100),
                industry VARCHAR(100),
                founded_year VARCHAR(10),
                employee_count VARCHAR(50),
                registration_number VARCHAR(100),
                tax_id VARCHAR(100),
                gst_number VARCHAR(100),
                pan_number VARCHAR(100),
                phone VARCHAR(50),
                email VARCHAR(255),
                website VARCHAR(255),
                currency VARCHAR(10) DEFAULT 'INR',
                timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
                fiscal_year_start VARCHAR(10),
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                postal_code VARCHAR(20),
                country VARCHAR(100) DEFAULT 'India',
                description TEXT,
                logo_url VARCHAR(500),
                is_verified BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES users (account_id),
                UNIQUE(account_id)
            )
        """)
        
        # Create index on account_id for better performance
        cursor.execute("""
            CREATE INDEX idx_organizations_account_id ON organizations(account_id)
        """)
        
        # Insert default organization data for existing users
        print("Inserting default organization data...")
        
        # Get all unique account_ids from users table
        cursor.execute("SELECT DISTINCT account_id FROM users")
        account_ids = cursor.fetchall()
        
        for (account_id,) in account_ids:
            # Check if organization already exists for this account
            cursor.execute("""
                SELECT id FROM organizations WHERE account_id = ?
            """, (account_id,))
            
            if not cursor.fetchone():
                # Insert default organization data
                cursor.execute("""
                    INSERT INTO organizations (
                        account_id, company_name, business_type, industry,
                        founded_year, employee_count, currency, timezone,
                        country, is_verified
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    account_id,
                    f"{account_id} Business Solutions",
                    "Private Limited",
                    "Technology",
                    "2024",
                    "1-10",
                    "INR",
                    "Asia/Kolkata",
                    "India",
                    0
                ))
                
                print(f"Created default organization for account: {account_id}")
        
        # Commit the changes
        conn.commit()
        print("Organizations table created successfully!")
        
        # Verify the table was created
        cursor.execute("SELECT COUNT(*) FROM organizations")
        count = cursor.fetchone()[0]
        print(f"Total organizations in database: {count}")
        
        # Show table structure
        cursor.execute("PRAGMA table_info(organizations)")
        columns = cursor.fetchall()
        print("\nTable structure:")
        for col in columns:
            print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'}")
        
    except Exception as e:
        print(f"Error creating organizations table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_organization_table()
