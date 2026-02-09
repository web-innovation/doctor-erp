# DocClinic ERP - Demo Start Script
# This script starts both backend and frontend for KT video recording

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  DocClinic ERP - Demo Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray

# Check if database exists
$dbPath = Join-Path $projectRoot "server\prisma\dev.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "`n[!] Database not found. Running migration and seed..." -ForegroundColor Yellow
    Set-Location (Join-Path $projectRoot "server")
    npx prisma migrate dev --name init
    npm run db:seed
}

Write-Host "`n[1/3] Starting Backend Server..." -ForegroundColor Green
$serverPath = Join-Path $projectRoot "server"
Start-Process -FilePath "cmd" -ArgumentList "/k cd /d $serverPath && npm run dev" -WindowStyle Normal

Write-Host "[2/3] Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "[3/3] Starting Frontend..." -ForegroundColor Green
$clientPath = Join-Path $projectRoot "client"
Start-Process -FilePath "cmd" -ArgumentList "/k cd /d $clientPath && npm run dev" -WindowStyle Normal

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  Demo Environment Started!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Doctor:       doctor@demo.com / demo123" -ForegroundColor White
Write-Host "  Receptionist: receptionist@demo.com / demo123" -ForegroundColor White
Write-Host "  Pharmacist:   pharmacist@demo.com / demo123" -ForegroundColor White
Write-Host "  Accountant:   accountant@demo.com / demo123" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "`nTo start screen recording, press Win+Alt+R" -ForegroundColor Magenta
Write-Host "See DEMO-GUIDE.md for the full demo script" -ForegroundColor Gray
