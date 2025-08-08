@echo off
color 0A
echo ================================================
echo    BAI - Billing and Inventory Management
echo    Cursor IDE Server Startup Script
echo ================================================
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
if not exist "backend\poc" (
    echo ERROR: Virtual environment 'poc' not found in backend folder!
    echo Please ensure the 'poc' venv exists in the backend directory.
    echo.
    pause
    exit /b 1
)

echo [2/3] Starting Backend Server in Cursor IDE...
echo Starting Backend Server on port 8001...
cd backend
call poc\Scripts\activate.bat
echo Backend server starting...
python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0 