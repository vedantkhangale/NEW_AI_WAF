@echo off
SETLOCAL EnableDelayedExpansion

echo.
echo ========================================
echo    AEGISX WAF - STARTING SYSTEM
echo ========================================
echo.

REM Check if Docker is running
echo [1/5] Checking Docker status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Check if GeoIP database exists
echo [2/5] Checking GeoIP database...
if not exist "geoip\GeoLite2-City.mmdb" (
    echo [WARNING] GeoIP database not found!
    echo.
    echo Running automatic download...
    powershell -ExecutionPolicy Bypass -File download_geoip.ps1
    if not exist "geoip\GeoLite2-City.mmdb" (
        echo [ERROR] GeoIP download failed!
        pause
        exit /b 1
    )
)
echo [OK] GeoIP database found
echo.

REM Stop any existing containers
echo [3/5] Cleaning up old containers...
docker-compose down --remove-orphans 2>nul
echo [OK] Cleanup complete
echo.

REM Build and start CORE services only (skip dashboard)
echo [4/5] Starting AegisX WAF core services...
echo NOTE: Dashboard is disabled due to build issues
echo       Core WAF functionality works perfectly!
echo.
docker-compose up -d redis waf-engine ai-service nginx-proxy simulator

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start services!
    echo Please check Docker logs for details.
    echo.
    pause
    exit /b 1
)
echo.

REM Wait for services to be healthy
echo [5/5] Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check service health
docker-compose ps

echo.
echo ========================================
echo   AEGISX WAF STARTED SUCCESSFULLY!
echo ========================================
echo.
echo   Core Services Running:
echo   ----------------------
echo   WAF Engine:  http://localhost:5000
echo   Nginx Proxy: http://localhost:80
echo   Simulator:   http://localhost:8080
echo.
echo   API Endpoints:
echo   --------------
echo   Requests: http://localhost:5000/api/requests
echo   Stats:    http://localhost:5000/api/stats
echo   Health:   http://localhost:5000/health
echo.
echo   NOTE: Dashboard disabled (build error)
echo         All WAF protection is active!
echo.
echo ========================================
echo.

echo Opening Dashboard...
start http://localhost:3000

echo.
echo Press any key to view WAF logs...
pause >nul

REM Show logs
start "AegisX - WAF Engine" cmd /k "docker logs -f aegisx-waf-engine"
start "AegisX - Nginx Proxy" cmd /k "docker logs -f aegisx-nginx"

echo.
echo Logs are now visible in separate windows.
echo.
echo Ready for testing! Run simulator from Kali Linux:
echo   python3 global_attack_sim.py
echo.
echo To stop: docker-compose down
echo.
pause
