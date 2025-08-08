@echo off
color 0B
echo ================================================
echo    BAI - Frontend Server (Cursor IDE)
echo ================================================
echo.

REM Check if we're in the correct directory
if not exist "frontend" (
    echo ERROR: frontend folder not found!
    echo Please run this script from the poc_ba directory.
    echo.
    pause
    exit /b 1
)

echo Starting Frontend Server in Cursor IDE...
echo Starting Frontend Server on port 5173...
cd frontend
echo Frontend server starting...
npm run dev 