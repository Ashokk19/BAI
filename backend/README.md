# BAI Backend

Backend service for BAI (Billing and Inventory Management) application.

## Features

- FastAPI-based REST API
- PostgreSQL database with SQLAlchemy ORM
- JWT authentication
- Inventory management
- Sales management
- Purchase management
- User management

## Setup

1. Create virtual environment:
   ```bash
   uv venv poc
   ```

2. Activate virtual environment:
   ```bash
   poc\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   uv sync
   ```

4. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc 