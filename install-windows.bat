@echo off
setlocal enabledelayedexpansion

REM NXZZ-VComm Automatic Installation Script for Windows
REM Author: NXZZ Development Team
REM Compatible with: Windows 10/11, Windows Server 2019/2022

title NXZZ-VComm Installation Script

echo ================================================================
echo           NXZZ-VComm Installation Script for Windows
echo           Military Communication Platform
echo ================================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Script harus dijalankan sebagai Administrator!
    echo Klik kanan pada Command Prompt dan pilih "Run as administrator"
    pause
    exit /b 1
)

REM Get server IP
set /p SERVER_IP="Masukkan IP Address server ini (contoh: 192.168.1.100): "
if "%SERVER_IP%"=="" (
    echo ERROR: IP Address tidak boleh kosong!
    pause
    exit /b 1
)

REM Get installation options
set /p INSTALL_IIS="Apakah Anda ingin menginstal IIS reverse proxy? (y/n): "
set /p ENABLE_SSL="Apakah Anda ingin mengaktifkan SSL/HTTPS? (y/n): "

echo.
echo [%time%] Memulai instalasi NXZZ-VComm...
echo.

REM Configuration variables
set APP_DIR=C:\nxzz-vcomm
set LOG_DIR=%APP_DIR%\logs
set BACKUP_DIR=%APP_DIR%\backups
set DB_NAME=nxzz_vcomm
set DB_USER=nxzz_user
set DB_PASSWORD=NxzzSecure2024!
set APP_PORT=5000

REM Create application directory
echo [%time%] Membuat direktori aplikasi...
if not exist "%APP_DIR%" mkdir "%APP_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Check if Node.js is installed
echo [%time%] Memeriksa Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js tidak ditemukan. Silakan install Node.js 20.x dari https://nodejs.org/
    echo Setelah install Node.js, jalankan script ini lagi.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js terdeteksi: %NODE_VERSION%

REM Check if PostgreSQL is installed
echo [%time%] Memeriksa PostgreSQL...
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    echo PostgreSQL 15 terdeteksi
    set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    echo PostgreSQL 14 terdeteksi
    set PSQL_PATH=C:\Program Files\PostgreSQL\14\bin
) else if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" (
    echo PostgreSQL 13 terdeteksi
    set PSQL_PATH=C:\Program Files\PostgreSQL\13\bin
) else (
    echo PostgreSQL tidak ditemukan!
    echo Silakan install PostgreSQL dari https://www.postgresql.org/download/windows/
    echo Gunakan password: PostgresAdmin2024!
    pause
    exit /b 1
)

REM Install global npm packages
echo [%time%] Menginstal global npm packages...
call npm install -g tsx pm2 drizzle-kit
if %errorlevel% neq 0 (
    echo ERROR: Gagal menginstal npm packages global
    pause
    exit /b 1
)

REM Copy source code if not exists
echo [%time%] Memeriksa source code...
if not exist "%APP_DIR%\package.json" (
    echo Source code tidak ditemukan di %APP_DIR%
    echo Silakan copy semua file source code NXZZ-VComm ke direktori %APP_DIR%
    echo Struktur yang dibutuhkan:
    echo   %APP_DIR%\
    echo     ├── client\
    echo     ├── server\
    echo     ├── shared\
    echo     ├── package.json
    echo     └── ...
    pause
    exit /b 1
)

REM Change to app directory
cd /d "%APP_DIR%"

REM Install application dependencies
echo [%time%] Menginstal dependencies aplikasi...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Gagal menginstal dependencies aplikasi
    pause
    exit /b 1
)

REM Setup database
echo [%time%] Mengkonfigurasi database PostgreSQL...

REM Create database and user
echo CREATE DATABASE %DB_NAME%; > temp_db_setup.sql
echo CREATE USER %DB_USER% WITH ENCRYPTED PASSWORD '%DB_PASSWORD%'; >> temp_db_setup.sql
echo GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%; >> temp_db_setup.sql
echo ALTER USER %DB_USER% CREATEDB; >> temp_db_setup.sql

"%PSQL_PATH%\psql.exe" -U postgres -f temp_db_setup.sql >nul 2>&1
del temp_db_setup.sql

REM Test database connection
"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Gagal koneksi ke database. Periksa password PostgreSQL.
    echo Pastikan password untuk user 'postgres' adalah 'PostgresAdmin2024!'
    pause
    exit /b 1
)
echo Database berhasil dikonfigurasi

REM Create environment file
echo [%time%] Membuat file environment...
(
echo NODE_ENV=production
echo PORT=%APP_PORT%
echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@localhost:5432/%DB_NAME%
echo.
echo # Session secret
echo SESSION_SECRET=%RANDOM%%RANDOM%%RANDOM%-%RANDOM%%RANDOM%-%RANDOM%%RANDOM%
echo.
echo # App configuration
echo APP_URL=http://%SERVER_IP%:%APP_PORT%
echo REPLIT_DOMAINS=%SERVER_IP%:%APP_PORT%,localhost:%APP_PORT%
) > .env

REM Setup database schema
echo [%time%] Menyiapkan schema database...
call npm run db:push
if %errorlevel% neq 0 (
    echo ERROR: Gagal setup database schema
    pause
    exit /b 1
)

REM Build application
echo [%time%] Building aplikasi...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Gagal build aplikasi
    pause
    exit /b 1
)

REM Create PM2 ecosystem file
echo [%time%] Mengkonfigurasi PM2...
(
echo module.exports = {
echo   apps: [{
echo     name: 'nxzz-vcomm',
echo     script: 'npm',
echo     args: 'run start',
echo     cwd: '%APP_DIR%',
echo     instances: 1,
echo     exec_mode: 'fork',
echo     watch: false,
echo     max_memory_restart: '2G',
echo     env: {
echo       NODE_ENV: 'production',
echo       PORT: %APP_PORT%
echo     },
echo     error_file: '%LOG_DIR%\\error.log',
echo     out_file: '%LOG_DIR%\\out.log',
echo     log_file: '%LOG_DIR%\\combined.log',
echo     time: true
echo   }]
echo };
) > ecosystem.config.js

REM Start application with PM2
echo [%time%] Memulai aplikasi dengan PM2...
call pm2 start ecosystem.config.js
call pm2 save

REM Install PM2 as Windows service
echo [%time%] Menginstal PM2 sebagai Windows service...
call npm install -g pm2-windows-service
call pm2-service-install -n NXZZ-VComm

REM Configure service auto-start
sc config NXZZ-VComm start= auto >nul

REM Configure Windows Firewall
echo [%time%] Mengkonfigurasi Windows Firewall...
netsh advfirewall firewall add rule name="NXZZ-VComm HTTP" dir=in action=allow protocol=TCP localport=%APP_PORT% >nul
netsh advfirewall firewall add rule name="NXZZ-VComm PostgreSQL" dir=in action=allow protocol=TCP localport=5432 >nul

REM Install IIS if requested
if /i "%INSTALL_IIS%"=="y" (
    echo [%time%] Menginstal IIS dan komponen...
    
    REM Enable IIS features
    dism /online /enable-feature /featurename:IIS-WebServerRole /all >nul
    dism /online /enable-feature /featurename:IIS-WebServer /all >nul
    dism /online /enable-feature /featurename:IIS-CommonHttpFeatures /all >nul
    dism /online /enable-feature /featurename:IIS-HttpRedirect /all >nul
    dism /online /enable-feature /featurename:IIS-WebSockets /all >nul
    
    REM Create web.config for reverse proxy
    (
    echo ^<?xml version="1.0" encoding="UTF-8"?^>
    echo ^<configuration^>
    echo     ^<system.webServer^>
    echo         ^<rewrite^>
    echo             ^<rules^>
    echo                 ^<rule name="ReverseProxy" stopProcessing="true"^>
    echo                     ^<match url="(.*)"/^>
    echo                     ^<action type="Rewrite" url="http://localhost:%APP_PORT%/{R:1}"/^>
    echo                 ^</rule^>
    echo             ^</rules^>
    echo         ^</rewrite^>
    echo         ^<webSocket enabled="true"/^>
    echo     ^</system.webServer^>
    echo ^</configuration^>
    ) > C:\inetpub\wwwroot\web.config
    
    netsh advfirewall firewall add rule name="IIS HTTP" dir=in action=allow protocol=TCP localport=80 >nul
    echo IIS reverse proxy dikonfigurasi
)

REM Setup SSL if requested
if /i "%ENABLE_SSL%"=="y" (
    echo [%time%] Mengkonfigurasi SSL certificate...
    
    REM Generate self-signed certificate using PowerShell
    powershell -Command "& {$cert = New-SelfSignedCertificate -DnsName '%SERVER_IP%', 'localhost' -CertStoreLocation 'cert:\LocalMachine\My' -NotAfter (Get-Date).AddYears(1); $pwd = ConvertTo-SecureString -String 'nxzz2024' -Force -AsPlainText; Export-PfxCertificate -Cert $cert -FilePath '%APP_DIR%\certificate.pfx' -Password $pwd; Export-Certificate -Cert $cert -FilePath '%APP_DIR%\certificate.crt'}"
    
    if /i "%INSTALL_IIS%"=="y" (
        netsh advfirewall firewall add rule name="IIS HTTPS" dir=in action=allow protocol=TCP localport=443 >nul
    )
    
    echo SSL certificate berhasil dibuat
)

REM Create super admin user
echo [%time%] Membuat super admin user...
echo INSERT INTO users (id, callsign, nrp, password, first_name, last_name, rank, branch, role, is_enabled, created_at, updated_at^) VALUES ('superadmin', 'superadmin', 'SA001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'JENDERAL TNI', 'TNI AD', 'super_admin', true, NOW(^), NOW(^)^) ON CONFLICT (id^) DO NOTHING; > temp_admin.sql
"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -f temp_admin.sql >nul 2>&1
del temp_admin.sql

REM Create backup script
echo [%time%] Membuat script backup...
(
echo @echo off
echo set BACKUP_DIR=%BACKUP_DIR%
echo set DATE=%%date:~10,4%%-%%date:~4,2%%-%%date:~7,2%%_%%time:~0,2%%-%%time:~3,2%%-%%time:~6,2%%
echo set DATE=%%DATE: =0%%
echo.
echo if not exist %%BACKUP_DIR%% mkdir %%BACKUP_DIR%%
echo.
echo "%PSQL_PATH%\pg_dump.exe" -h localhost -U %DB_USER% -d %DB_NAME% ^> %%BACKUP_DIR%%\nxzz_vcomm_%%DATE%%.sql
echo.
echo echo Backup completed: %%BACKUP_DIR%%\nxzz_vcomm_%%DATE%%.sql
echo.
echo REM Delete backups older than 7 days
echo forfiles /p %%BACKUP_DIR%% /s /m *.sql /d -7 /c "cmd /c del @path" 2^>nul
) > backup-database.bat

REM Schedule daily backup
schtasks /create /tn "NXZZ-VComm Backup" /tr "%APP_DIR%\backup-database.bat" /sc daily /st 02:00 /ru SYSTEM /f >nul

REM Create monitoring script
(
echo @echo off
echo echo ================================================================
echo echo           NXZZ-VComm System Monitor
echo echo ================================================================
echo echo.
echo.
echo echo Service Status:
echo sc query NXZZ-VComm
echo echo.
echo.
echo echo PostgreSQL Status:
echo sc query postgresql-x64-15 2^>nul ^|^| sc query postgresql-x64-14 2^>nul ^|^| sc query postgresql-x64-13
echo echo.
echo.
echo echo PM2 Status:
echo pm2 status
echo echo.
echo.
echo echo Network Connections:
echo netstat -an ^| find ":%APP_PORT%"
echo echo.
echo.
echo echo Database Test:
echo "%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) as active_users FROM users WHERE is_enabled = true;"
) > monitor-system.bat

REM Final checks
echo [%time%] Melakukan pengecekan final...

REM Check if application is running
timeout /t 5 /nobreak >nul
pm2 status | find "nxzz-vcomm" | find "online" >nul
if %errorlevel% equ 0 (
    echo [✓] Aplikasi berhasil berjalan dengan PM2
) else (
    echo [X] Aplikasi gagal berjalan. Periksa log: pm2 logs nxzz-vcomm
)

REM Check database connection
"%PSQL_PATH%\psql.exe" -h localhost -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Database berhasil terhubung
) else (
    echo [X] Database gagal terhubung
)

REM Display final information
echo.
echo ================================================================
echo           INSTALASI BERHASIL DISELESAIKAN!
echo ================================================================
echo.
echo Informasi Akses:
if /i "%INSTALL_IIS%"=="y" (
    if /i "%ENABLE_SSL%"=="y" (
        echo   URL Aplikasi: https://%SERVER_IP%
    ) else (
        echo   URL Aplikasi: http://%SERVER_IP%
    )
) else (
    echo   URL Aplikasi: http://%SERVER_IP%:%APP_PORT%
)
echo   Super Admin: superadmin
echo   Password: admin123!!
echo.
echo Lokasi File:
echo   Aplikasi: %APP_DIR%
echo   Log: %LOG_DIR%
echo   Backup: %BACKUP_DIR%
echo.
echo Perintah Berguna:
echo   pm2 status               - Status PM2
echo   pm2 logs nxzz-vcomm      - Log aplikasi
echo   pm2 restart nxzz-vcomm   - Restart aplikasi
echo   %APP_DIR%\backup-database.bat  - Manual backup
echo   %APP_DIR%\monitor-system.bat   - Monitor sistem
echo.
echo CATATAN PENTING:
echo • Backup database otomatis dijalankan setiap hari jam 2 pagi
echo • Aplikasi akan restart otomatis saat Windows reboot
echo • Periksa Windows Firewall jika tidak bisa akses dari client lain
echo • Gunakan certificate.crt untuk mobile HTTPS jika diperlukan
echo.
echo Terima kasih telah menggunakan NXZZ-VComm!
echo.
pause