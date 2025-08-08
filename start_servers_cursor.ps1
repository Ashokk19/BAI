# BAI - Billing and Inventory Management
# Cursor IDE PowerShell Server Startup Script

# Set console colors
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   BAI - Billing and Inventory Management" -ForegroundColor Cyan
Write-Host "   Cursor IDE PowerShell Server Startup Script" -ForegroundColor Cyan
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

Write-Host "[2/3] Starting Backend Server in Cursor IDE..." -ForegroundColor Yellow
Write-Host "Starting Backend Server on port 8001..." -ForegroundColor Green

# Start Backend Server directly in current terminal
Set-Location backend
& ".\poc\Scripts\Activate.ps1"
Write-Host "Backend server starting..." -ForegroundColor Green
python -m uvicorn app.main:app --reload --port 8001 --host 0.0.0.0 