Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   FinApex Digital Banking Platform - Startup Script" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/2] Launching Backend Microservices (Ports 9000-9003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\services'; node start-all.js"

Write-Host "[2/2] Launching Frontend Microapp on Port 9004..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Services launched in dedicated PowerShell windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend Banking UI : http://localhost:9004"
Write-Host "  API Gateway         : http://localhost:9000"
Write-Host "  Swagger API Docs    : http://localhost:9000/api-docs"
Write-Host "  Gateway Healthcheck : http://localhost:9000/health"
Write-Host "========================================================" -ForegroundColor Green
