@echo off
color 0C
echo ===============================================
echo    BAI - Billing and Inventory Management
echo    Server Stop Script
echo ===============================================
echo.

echo Stopping BAI Application Servers...
echo.

echo [1/2] Stopping Backend Server (Port 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo Found process %%a on port 8001
    taskkill /f /pid %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Backend server stopped successfully
    ) else (
        echo ❌ Failed to stop backend server
    )
)

echo.
echo [2/2] Stopping Frontend Server (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Found process %%a on port 5173
    taskkill /f /pid %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Frontend server stopped successfully
    ) else (
        echo ❌ Failed to stop frontend server
    )
)

echo.
echo Checking for any remaining BAI server processes...
tasklist | findstr /i "python" >nul 2>&1
if !errorlevel! equ 0 (
    echo Python processes still running (may include other applications)
)

tasklist | findstr /i "node" >nul 2>&1
if !errorlevel! equ 0 (
    echo Node.js processes still running (may include other applications)
)

echo.
echo ===============================================
echo    🛑 BAI Server Stop Complete
echo ===============================================
echo.
echo 💡 You can now restart the servers if needed
echo.
echo ===============================================
echo Press any key to close this window...
pause > nul 