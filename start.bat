@echo off
echo ========================================================
echo   FinApex Digital Banking Platform - Startup Script
echo ========================================================
echo.
echo [1/2] Launching Backend Microservices (Ports 9000-9003)...
start "FinApex Backend Microservices" cmd /k "cd /d "%~dp0services" && node start-all.js"

echo [2/2] Launching Frontend Microapp on Port 9004...
start "FinApex Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo Services are booting in separate console windows!
echo.
echo Frontend Banking UI : http://localhost:9004
echo API Gateway         : http://localhost:9000
echo Swagger API Docs    : http://localhost:9000/api-docs
echo Gateway Healthcheck : http://localhost:9000/health
echo ========================================================
pause
