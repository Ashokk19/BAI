#!/usr/bin/env python3
"""
Install PostgreSQL dependencies for BAI application.
"""

import subprocess
import sys

def install_dependencies():
    """Install required PostgreSQL dependencies."""
    
    dependencies = [
        "psycopg2-binary",  # PostgreSQL adapter
        "psycopg2",         # Alternative if binary doesn't work
    ]
    
    print("🔧 Installing PostgreSQL dependencies...")
    
    for dep in dependencies:
        try:
            print(f"Installing {dep}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
            print(f"✅ {dep} installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install {dep}: {e}")
            if dep == "psycopg2":
                print("💡 Trying psycopg2-binary instead...")
                continue
    
    print("🎉 PostgreSQL dependencies installation completed!")

if __name__ == "__main__":
    install_dependencies()
