@echo off
setlocal enabledelayedexpansion

REM NXZZ-VComm Performance Monitor for Windows
REM Monitor aplikasi, database, dan sistem Windows

title NXZZ-VComm Performance Monitor

echo ================================================================
echo           NXZZ-VComm Performance Monitor for Windows
echo           WebRTC ^& Group Call Analytics
echo ================================================================
echo.

REM Variables
set APP_DIR=C:\nxzz-vcomm
set DB_NAME=nxzz_vcomm
set DB_USER=nxzz_user
set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin

REM Check if PostgreSQL path exists
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\14\bin
) else if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\13\bin
) else (
    echo PostgreSQL tidak ditemukan!
    pause
    exit /b 1
)

REM Service Status Check
echo Service Status:
echo ===============
sc query NXZZ-VComm | find "STATE" | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [✓] NXZZ-VComm Service: RUNNING
) else (
    echo [X] NXZZ-VComm Service: STOPPED
)

sc query postgresql-x64-15 | find "STATE" | find "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] PostgreSQL Service: RUNNING
) else (
    sc query postgresql-x64-14 | find "STATE" | find "RUNNING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [✓] PostgreSQL Service: RUNNING
    ) else (
        echo [X] PostgreSQL Service: STOPPED
    )
)

echo.

REM PM2 Status
echo PM2 Application Status:
echo =======================
pm2 status | find "nxzz-vcomm"
echo.

REM Database Statistics
echo Database Statistics:
echo ====================

REM Active users
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM users WHERE is_enabled = true;" 2^>nul') do set TOTAL_USERS=%%i
echo   Total Active Users: %TOTAL_USERS%

REM Online users (last 5 minutes)
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '5 minutes' AND is_enabled = true;" 2^>nul') do set ONLINE_USERS=%%i
echo   Online Users: %ONLINE_USERS%

REM Messages today
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM messages WHERE created_at::date = CURRENT_DATE;" 2^>nul') do set MSG_TODAY=%%i
echo   Messages Today: %MSG_TODAY%

REM Active calls
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM call_history WHERE status = 'active';" 2^>nul') do set ACTIVE_CALLS=%%i
echo   Active Calls: %ACTIVE_CALLS%

REM Database size
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT pg_size_pretty(pg_database_size('%DB_NAME%'));" 2^>nul') do set DB_SIZE=%%i
echo   Database Size: %DB_SIZE%

echo.

REM System Resources
echo System Resources:
echo =================

REM CPU Usage
for /f "skip=1 tokens=2 delims==" %%i in ('wmic cpu get loadpercentage /value 2^>nul') do (
    if not "%%i"=="" set CPU_USAGE=%%i
)
echo   CPU Usage: %CPU_USAGE%%%

REM Memory Usage
for /f "skip=1 tokens=2 delims==" %%i in ('wmic OS get TotalVisibleMemorySize /value 2^>nul') do (
    if not "%%i"=="" set TOTAL_MEM=%%i
)
for /f "skip=1 tokens=2 delims==" %%i in ('wmic OS get FreePhysicalMemory /value 2^>nul') do (
    if not "%%i"=="" set FREE_MEM=%%i
)

if defined TOTAL_MEM if defined FREE_MEM (
    set /a USED_MEM=%TOTAL_MEM%-%FREE_MEM%
    set /a MEM_PERCENT=!USED_MEM!*100/%TOTAL_MEM%
    set /a TOTAL_MB=%TOTAL_MEM%/1024
    set /a USED_MB=!USED_MEM!/1024
    echo   Memory Usage: !USED_MB!MB / !TOTAL_MB!MB ^(!MEM_PERCENT!%%^)
)

REM Disk Usage
for /f "tokens=3" %%i in ('dir C:\ /-c ^| find "bytes free"') do set FREE_SPACE=%%i
for /f "tokens=1" %%i in ('dir C:\ /-c ^| find "Dir(s)"') do set TOTAL_SPACE=%%i
echo   Disk C: Free Space: %FREE_SPACE% bytes

echo.

REM Network Connections
echo Network Connections:
echo ===================

REM Count connections on port 5000
for /f %%i in ('netstat -an ^| find ":5000" ^| find "ESTABLISHED" ^| find /c /v ""') do set WS_CONNECTIONS=%%i
echo   Active WebSocket Connections: %WS_CONNECTIONS%

REM Count database connections
for /f "tokens=*" %%i in ('"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2^>nul') do set DB_CONNECTIONS=%%i
echo   Database Connections: %DB_CONNECTIONS%

echo.

REM Port Status
echo Port Status:
echo ============
netstat -an | find ":5000" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [✓] Port 5000: LISTENING
) else (
    echo [X] Port 5000: NOT LISTENING
)

netstat -an | find ":5432" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [✓] PostgreSQL Port 5432: LISTENING
) else (
    echo [X] PostgreSQL Port 5432: NOT LISTENING
)

netstat -an | find ":80" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [✓] HTTP Port 80: LISTENING
) else (
    echo [I] HTTP Port 80: NOT CONFIGURED
)

netstat -an | find ":443" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [✓] HTTPS Port 443: LISTENING
) else (
    echo [I] HTTPS Port 443: NOT CONFIGURED
)

echo.

REM Recent Call History
echo Recent Call History ^(Last 10^):
echo ================================
"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -c "SELECT CASE WHEN is_group_call THEN 'GROUP' ELSE 'DIRECT' END as type, call_type, status, EXTRACT(EPOCH FROM (ended_at - started_at))::int as duration_sec, to_char(started_at, 'HH24:MI:SS') as started FROM call_history WHERE started_at > NOW() - INTERVAL '2 hours' ORDER BY started_at DESC LIMIT 10;" 2>nul

echo.

REM Application Log Status
echo Application Logs:
echo ================
if exist "%APP_DIR%\logs\error.log" (
    echo Recent Errors ^(Last 5 lines^):
    powershell "Get-Content '%APP_DIR%\logs\error.log' -Tail 5" 2>nul
) else (
    echo [I] No error log found
)

echo.

REM System Health Check
echo System Health Check:
echo ===================

set ISSUES=0

REM Check high CPU
if defined CPU_USAGE (
    if %CPU_USAGE% gtr 80 (
        echo [!] High CPU usage: %CPU_USAGE%%%
        set /a ISSUES+=1
    )
)

REM Check high memory
if defined MEM_PERCENT (
    if %MEM_PERCENT% gtr 85 (
        echo [!] High memory usage: %MEM_PERCENT%%%
        set /a ISSUES+=1
    )
)

REM Check if app is running
pm2 status | find "nxzz-vcomm" | find "online" >nul
if %errorlevel% neq 0 (
    echo [!] Application not running
    set /a ISSUES+=1
)

REM Check database connection
"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Database connection failed
    set /a ISSUES+=1
)

if %ISSUES% equ 0 (
    echo [✓] All systems: HEALTHY
) else (
    echo [!] Issues found: %ISSUES%
)

echo.
echo Quick Actions:
echo ==============
echo   pm2 monit                    - Real-time PM2 monitoring
echo   %APP_DIR%\backup-database.bat    - Manual database backup
echo   pm2 restart nxzz-vcomm       - Restart application
echo   pm2 logs nxzz-vcomm          - View application logs
echo.
echo Performance monitoring completed at %date% %time%
echo.

if "%1"=="auto" goto :eof

pause