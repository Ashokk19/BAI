# Cursor IDE Server Startup Scripts

This document explains how to use the new server startup scripts that run directly in the Cursor IDE terminal instead of opening new windows.

## Available Scripts

### For Backend Server (Port 8001)

#### Windows Batch (.bat)
```bash
start_servers_cursor.bat
```

#### PowerShell (.ps1)
```powershell
start_servers_cursor.ps1
```

### For Frontend Server (Port 5173)

#### Windows Batch (.bat)
```bash
start_frontend_cursor.bat
```

#### PowerShell (.ps1)
```powershell
start_frontend_cursor.ps1
```

## How to Use

### Option 1: Start Backend and Frontend in Separate Terminals

1. **Open a new terminal in Cursor IDE** (Ctrl+Shift+`)
2. **Run the backend server script:**
   ```bash
   # For Windows Command Prompt
   start_servers_cursor.bat
   
   # For PowerShell
   start_servers_cursor.ps1
   ```

3. **Open another terminal in Cursor IDE** (Ctrl+Shift+`)
4. **Run the frontend server script:**
   ```bash
   # For Windows Command Prompt
   start_frontend_cursor.bat
   
   # For PowerShell
   start_frontend_cursor.ps1
   ```

### Option 2: Manual Commands

If you prefer to run commands manually:

#### Backend Server
```bash
cd backend
poc\Scripts\activate.bat  # For Command Prompt
# OR
poc\Scripts\Activate.ps1  # For PowerShell
python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0
```

#### Frontend Server
```bash
cd frontend
npm run dev
```

## Benefits of Cursor IDE Integration

1. **Integrated Development**: All server logs appear directly in Cursor IDE terminals
2. **Better Debugging**: Easy to see errors and logs without switching windows
3. **Terminal Management**: Use Cursor's terminal management features (split, new tab, etc.)
4. **Consistent Environment**: All development happens within the same IDE
5. **Quick Access**: No need to manage multiple external terminal windows

## Server URLs

Once both servers are running:

- **Backend API**: http://localhost:8001
- **Frontend App**: http://localhost:5173
- **API Documentation**: http://localhost:8001/docs

## Troubleshooting

### Backend Issues
- Ensure the `poc` virtual environment exists in the `backend` folder
- Check that all dependencies are installed: `uv sync`
- Verify the database file exists: `backend/bai_db.db`

### Frontend Issues
- Ensure Node.js is installed and accessible
- Check that dependencies are installed: `npm install`
- Verify the API configuration in `frontend/src/config/api.config.ts`

### Port Conflicts
- Backend uses port 8001
- Frontend uses port 5173 (Vite will auto-increment if busy)
- If ports are in use, the scripts will show appropriate error messages

## Stopping Servers

- **Backend**: Press `Ctrl+C` in the backend terminal
- **Frontend**: Press `Ctrl+C` in the frontend terminal

## Legacy Scripts

The original scripts that open new windows are still available:
- `start_servers.bat` / `start_servers.ps1` - Open new windows for both servers
- `stop_servers.bat` / `stop_servers.ps1` - Stop servers (if using legacy method)

## Recommended Workflow

1. Use Cursor IDE's integrated terminals
2. Start backend server in one terminal
3. Start frontend server in another terminal
4. Use Cursor's terminal management to organize your development environment
5. All logs and errors will be visible directly in the IDE 