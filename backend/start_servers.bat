@echo off
color 0A
echo ===============================================
echo    BAI - Billing and Inventory Management
echo    Server Startup Script
echo ===============================================
echo.

REM Check if we're in the correct directory
if not exist "backend" (
    echo ERROR: backend folder not found!
    echo Please run this script from the poc_ba directory.
    echo.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: frontend folder not found!
    echo Please run this script from the poc_ba directory.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking backend virtual environment...
if not exist "backend\.venv" (
    echo ERROR: Virtual environment not found in backend folder!
    echo Please run 'uv venv' in the backend directory first.
    echo.
    pause
    exit /b 1
)

echo [2/3] Starting Backend Server...
echo Opening new terminal for Backend Server...
start "BAI Backend Server - Port 8001" cmd /k "cd /d %~dp0 && echo Backend server starting... && echo Current directory: %CD% && uv run python -c \"import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=8001, reload=True)\""

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo [3/3] Starting Frontend Server...
echo Opening new terminal for Frontend Server...
start "BAI Frontend Server - Port 5173" cmd /k "cd /d %~dp0frontend && echo Frontend server starting... && npm run dev"

echo.
echo ===============================================
echo    🚀 BAI Application Servers Starting...
echo ===============================================
echo.
echo 📊 Backend API Server: http://localhost:8001
echo 🌐 Frontend Web App:   http://localhost:5173
echo 📚 API Documentation:  http://localhost:8001/docs
echo.
echo ⚠️  Wait a few seconds for servers to fully start
echo 💡 Check the new terminal windows for any errors
echo.
echo ===============================================
echo Press any key to close this window...
pause > nul 