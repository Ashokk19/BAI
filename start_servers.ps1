# BAI - Billing and Inventory Management
# PowerShell Server Startup Script

# Set console colors
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   BAI - Billing and Inventory Management" -ForegroundColor Cyan
Write-Host "   PowerShell Server Startup Script" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: backend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the poc_ba directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: frontend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the poc_ba directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] Checking backend virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "backend\poc")) {
    Write-Host "ERROR: Virtual environment 'poc' not found in backend folder!" -ForegroundColor Red
    Write-Host "Please ensure the 'poc' venv exists in the backend directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/3] Starting Backend Server..." -ForegroundColor Yellow
Write-Host "Opening new terminal for Backend Server..." -ForegroundColor Green

# Start Backend Server
$backendPath = Join-Path $PWD "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; poc\Scripts\activate.ps1; Write-Host 'Backend server starting...' -ForegroundColor Green; python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0" -WindowStyle Normal

# Wait for backend to start
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "[3/3] Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "Opening new terminal for Frontend Server..." -ForegroundColor Green

# Start Frontend Server
$frontendPath = Join-Path $PWD "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend server starting...' -ForegroundColor Green; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🚀 BAI Application Servers Starting..." -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Backend API Server: http://localhost:8001" -ForegroundColor White
Write-Host "🌐 Frontend Web App:   http://localhost:5173" -ForegroundColor White
Write-Host "📚 API Documentation:  http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Wait a few seconds for servers to fully start" -ForegroundColor Yellow
Write-Host "💡 Check the new terminal windows for any errors" -ForegroundColor Yellow
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Press any key to close this window..." -ForegroundColor White
Read-Host 