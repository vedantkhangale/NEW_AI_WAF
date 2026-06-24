@echo off
SETLOCAL

echo.
echo ========================================
echo    AEGISX WAF - STOPPING SYSTEM
echo ========================================
echo.

REM Stop all services
echo Stopping all AegisX WAF services...
docker-compose down --remove-orphans

if errorlevel 1 (
    echo.
    echo [WARNING] Some services may not have stopped cleanly.
    echo.
) else (
    echo.
    echo [OK] All services stopped successfully.
    echo.
)

REM Show final status
docker-compose ps

echo ========================================
echo   AEGISX WAF STOPPED SAFELY
echo ========================================
echo.
echo All containers have been stopped.
echo Data volumes preserved for next start.
echo.
echo To start again, run: start_waf.bat
echo.
pause
