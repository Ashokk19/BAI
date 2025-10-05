#!/usr/bin/env python3
"""
Simple PostgreSQL Migration Runner

This script installs dependencies and runs the migration.
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and print the result."""
    print(f"\n[RUNNING] {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"[SUCCESS] {description} completed successfully!")
            if result.stdout.strip():
                print(result.stdout)
            return True
        else:
            print(f"[ERROR] {description} failed!")
            if result.stderr.strip():
                print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] {description} failed with exception: {e}")
        return False

def main():
    print("BAI PostgreSQL Migration - Simple Runner")
    print("=" * 50)
    
    # Step 1: Install dependencies
    if not run_command(f"{sys.executable} -m pip install -r backend/requirements.txt", 
                      "Installing dependencies"):
        print("[ERROR] Failed to install dependencies. Please run manually:")
        print("pip install -r backend/requirements.txt")
        return False
    
    # Step 2: Run the main migration script
    if not run_command(f"{sys.executable} execute_postgres_migration.py", 
                      "Running PostgreSQL migration"):
        print("[ERROR] Migration failed. Please check the error messages above.")
        return False
    
    print("\n[SUCCESS] Migration process completed!")
    print("Please check the output above for any issues.")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
