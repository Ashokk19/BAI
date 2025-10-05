-- PostgreSQL Database Setup for BAI Application
-- Run these commands as a PostgreSQL superuser (e.g., postgres user)

-- Create database
CREATE DATABASE bai_db;

-- Create user
CREATE USER bai_user WITH PASSWORD 'bai_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bai_db TO bai_user;

-- Connect to the database and grant schema privileges
\c bai_db;
GRANT ALL ON SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bai_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bai_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bai_user;
