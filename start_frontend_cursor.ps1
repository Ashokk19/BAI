# BAI - Frontend Server (Cursor IDE)
# PowerShell Frontend Server Startup Script

# Set console colors
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Cyan"
Clear-Host

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   BAI - Frontend Server (Cursor IDE)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: frontend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the poc_ba directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting Frontend Server in Cursor IDE..." -ForegroundColor Yellow
Write-Host "Starting Frontend Server on port 5173..." -ForegroundColor Green

# Start Frontend Server directly in current terminal
Set-Location frontend
Write-Host "Frontend server starting..." -ForegroundColor Green
npm run dev 