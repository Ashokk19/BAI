"""
BAI Backend Configuration Examples

This file shows examples of how to configure the application for different environments.
Copy the relevant configuration to your .env file or set environment variables.
"""

# Local Development Configuration
LOCAL_CONFIG = {
    "DATABASE_TYPE": "postgresql",
    "DATABASE_HOST": "localhost",
    "DATABASE_PORT": "5432",
    "DATABASE_NAME": "bai_db", 
    "DATABASE_USER": "postgres",
    "DATABASE_PASSWORD": "password",
    "DEBUG": "true",
    "SECRET_KEY": "your-secret-key-here-change-in-production"
}

# Production Configuration Example
PRODUCTION_CONFIG = {
    "DATABASE_URL": "postgresql://user:password@cloud-host:5432/database",
    "DEBUG": "false",
    "SECRET_KEY": "your-production-secret-key",
    "ALLOWED_ORIGINS": "https://yourdomain.com,https://www.yourdomain.com"
}

# Cloud SQL Configuration Examples
CLOUD_SQL_CONFIG = {
    # Google Cloud SQL
    "DATABASE_URL": "postgresql://user:password@/dbname?host=/cloudsql/project:region:instance",
    
    # AWS RDS
    "DATABASE_URL": "postgresql://user:password@rds-endpoint:5432/dbname",
    
    # Azure Database
    "DATABASE_URL": "postgresql://user:password@azure-endpoint:5432/dbname"
}

# To use these configurations:
# 1. Create a .env file in the backend directory
# 2. Copy the relevant configuration variables
# 3. Update the values according to your setup 