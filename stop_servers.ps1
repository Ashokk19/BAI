# BAI - Billing and Inventory Management
# PowerShell Server Stop Script

# Set console colors
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Red"
Clear-Host

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   BAI - Billing and Inventory Management" -ForegroundColor Cyan
Write-Host "   PowerShell Server Stop Script" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping BAI Application Servers..." -ForegroundColor Yellow
Write-Host ""

# Function to stop process on specific port
function Stop-ProcessOnPort {
    param(
        [int]$Port,
        [string]$ServerName
    )
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($processes) {
            foreach ($process in $processes) {
                $pid = $process.OwningProcess
                Write-Host "Found process $pid on port $Port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "✅ $ServerName stopped successfully" -ForegroundColor Green
            }
        } else {
            Write-Host "No process found on port $Port" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Failed to stop $ServerName" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "[1/2] Stopping Backend Server (Port 8001)..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 8001 -ServerName "Backend server"

Write-Host ""
Write-Host "[2/2] Stopping Frontend Server (Port 5173)..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 5173 -ServerName "Frontend server"

Write-Host ""
Write-Host "Checking for any remaining BAI server processes..." -ForegroundColor Yellow

# Check for Python processes
$pythonProcesses = Get-Process -Name "python*" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "Python processes still running (may include other applications)" -ForegroundColor Yellow
}

# Check for Node.js processes
$nodeProcesses = Get-Process -Name "node*" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Node.js processes still running (may include other applications)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🛑 BAI Server Stop Complete" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 You can now restart the servers if needed" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Press any key to close this window..." -ForegroundColor White
Read-Host 