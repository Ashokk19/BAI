# 🚀 BAI Quick Start Guide

## Starting the Application

### Option 1: Cursor IDE Integration (Recommended)
Open two terminals in Cursor IDE (Ctrl+Shift+`):

**Terminal 1 - Backend Server:**
```cmd
# Windows Command Prompt
start_servers_cursor.bat

# PowerShell
start_servers_cursor.ps1
```

**Terminal 2 - Frontend Server:**
```cmd
# Windows Command Prompt
start_frontend_cursor.bat

# PowerShell
start_frontend_cursor.ps1
```

### Option 2: External Windows (Legacy)
```cmd
# Windows Command Prompt
start_servers.bat

# PowerShell
.\start_servers.ps1
```

### Option 3: Manual Start (Alternative)
Open two separate terminals:

**Terminal 1 - Backend Server:**
```cmd
cd backend
poc\Scripts\activate.bat
python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0
```

**Terminal 2 - Frontend Server:**
```cmd
cd frontend
npm run dev
```

## Accessing the Application

- **Frontend Web App**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## Stopping the Servers

- Press `Ctrl+C` in each terminal window to stop the servers
- Or simply close the terminal windows

## Troubleshooting

### Backend Issues
- Make sure the virtual environment is activated
- Check if all dependencies are installed: `uv sync`
- Verify Python version: `python --version` (should be 3.12+)

### Frontend Issues
- Check Node.js version: `node --version` (should be 18.14.2+)
- Install dependencies: `npm install`
- Clear npm cache: `npm cache clean --force`

### Port Conflicts
- Backend runs on port 8001
- Frontend runs on port 5173
- Use `netstat -an | findstr "8001"` to check if ports are in use

## Features Available

✅ **Authentication System**
- User registration and login
- JWT token-based authentication
- Password change functionality

✅ **Dashboard**
- Key business metrics
- Stock value tracking
- Monthly sales overview

✅ **Inventory Management**
- Items and categories
- Stock level monitoring
- Inventory logging

✅ **Sales Management**
- Customer management
- Invoice generation
- Sales tracking

✅ **Purchase Management**
- Vendor management
- Purchase orders
- Payment tracking

## Development Notes

- Backend uses FastAPI with SQLAlchemy
- Frontend uses React with TypeScript and Tailwind CSS
- Database: PostgreSQL (with SQLite fallback for development)
- Authentication: JWT tokens with bcrypt password hashing 