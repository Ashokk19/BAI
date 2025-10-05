-- PostgreSQL Database Setup for BAI Application
-- Run this as PostgreSQL superuser (postgres)

-- Create database
DROP DATABASE IF EXISTS bai_db;
CREATE DATABASE bai_db;

-- Create user
DROP USER IF EXISTS bai_user;
CREATE USER bai_user WITH PASSWORD 'bai_password';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;

-- Connect to the database
\c bai_db;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;

-- Make bai_user owner of the database
ALTER DATABASE bai_db OWNER TO bai_user;

-- Verify setup
SELECT current_database(), current_user;
\du bai_user
\l bai_db
