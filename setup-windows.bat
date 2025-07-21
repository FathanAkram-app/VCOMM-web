@echo off
setlocal enabledelayedexpansion

REM NXZZ-VComm Windows Setup Master Script
REM Complete setup orchestrator for Windows deployment

title NXZZ-VComm Windows Setup

echo ================================================================
echo           NXZZ-VComm Windows Setup Master Script
echo           Complete Deployment Solution for Windows
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

echo Selamat datang di NXZZ-VComm Windows Setup!
echo.
echo Pilihan instalasi yang tersedia:
echo.
echo 1. Persiapan Windows Environment (prepare-windows.bat)
echo 2. Instalasi NXZZ-VComm lengkap (install-windows.bat)
echo 3. Monitor sistem (windows-monitor.bat)
echo 4. Backup manual database
echo 5. Restart aplikasi
echo 6. Tampilkan informasi sistem
echo 7. Troubleshooting dan bantuan
echo 0. Keluar
echo.

:menu
set /p choice="Pilih opsi (0-7): "

if "%choice%"=="1" goto prepare
if "%choice%"=="2" goto install
if "%choice%"=="3" goto monitor
if "%choice%"=="4" goto backup
if "%choice%"=="5" goto restart
if "%choice%"=="6" goto info
if "%choice%"=="7" goto help
if "%choice%"=="0" goto exit
echo Pilihan tidak valid. Silakan pilih 0-7.
goto menu

:prepare
echo.
echo [%time%] Menjalankan persiapan Windows environment...
if exist "prepare-windows.bat" (
    call prepare-windows.bat
) else (
    echo ERROR: File prepare-windows.bat tidak ditemukan!
    echo Pastikan semua file script ada di direktori yang sama.
)
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:install
echo.
echo [%time%] Menjalankan instalasi NXZZ-VComm...
if exist "install-windows.bat" (
    call install-windows.bat
) else (
    echo ERROR: File install-windows.bat tidak ditemukan!
    echo Pastikan semua file script ada di direktori yang sama.
)
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:monitor
echo.
echo [%time%] Menjalankan system monitor...
if exist "windows-monitor.bat" (
    call windows-monitor.bat
) else (
    echo ERROR: File windows-monitor.bat tidak ditemukan!
    echo Pastikan semua file script ada di direktori yang sama.
)
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:backup
echo.
echo [%time%] Menjalankan backup database...
if exist "C:\nxzz-vcomm\backup-database.bat" (
    call "C:\nxzz-vcomm\backup-database.bat"
) else (
    echo ERROR: Aplikasi belum terinstall atau backup script tidak ditemukan!
    echo Jalankan instalasi terlebih dahulu.
)
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:restart
echo.
echo [%time%] Restart aplikasi NXZZ-VComm...
pm2 restart nxzz-vcomm 2>nul
if %errorlevel% equ 0 (
    echo [✓] Aplikasi berhasil direstart
    timeout /t 3 /nobreak >nul
    pm2 status | find "nxzz-vcomm"
) else (
    echo [X] Gagal restart aplikasi. PM2 mungkin belum terinstall.
    echo Jalankan instalasi terlebih dahulu.
)
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:info
echo.
echo ================================================================
echo           INFORMASI SISTEM NXZZ-VComm
echo ================================================================
echo.

REM Node.js version
echo Node.js Version:
node --version 2>nul || echo   Node.js tidak terinstall

REM PM2 status
echo.
echo PM2 Status:
pm2 --version 2>nul && pm2 status || echo   PM2 tidak terinstall

REM PostgreSQL status
echo.
echo PostgreSQL Status:
sc query postgresql-x64-15 2>nul | find "STATE" || echo   PostgreSQL service tidak ditemukan

REM Application status
echo.
echo Application Files:
if exist "C:\nxzz-vcomm\package.json" (
    echo   [✓] Aplikasi terinstall di C:\nxzz-vcomm
) else (
    echo   [X] Aplikasi belum terinstall
)

REM Network ports
echo.
echo Network Ports:
netstat -an | find ":5000" | find "LISTENING" >nul && echo   [✓] Port 5000: LISTENING || echo   [X] Port 5000: NOT LISTENING
netstat -an | find ":5432" | find "LISTENING" >nul && echo   [✓] Port 5432: LISTENING || echo   [X] Port 5432: NOT LISTENING

REM System resources
echo.
echo System Resources:
for /f "skip=1 tokens=2 delims==" %%i in ('wmic cpu get loadpercentage /value 2^>nul') do (
    if not "%%i"=="" echo   CPU Usage: %%i%%
)

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
    echo   Memory: !USED_MB!MB / !TOTAL_MB!MB ^(!MEM_PERCENT!%%^)
)

echo.
echo Access URLs:
echo   Direct: http://[SERVER-IP]:5000
echo   IIS: http://[SERVER-IP] (jika IIS dikonfigurasi)
echo   HTTPS: https://[SERVER-IP] (jika SSL dikonfigurasi)
echo.
echo Credentials:
echo   Super Admin: superadmin / admin123!!
echo   Database: nxzz_user / NxzzSecure2024!
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:help
echo.
echo ================================================================
echo           TROUBLESHOOTING DAN BANTUAN
echo ================================================================
echo.
echo MASALAH UMUM DAN SOLUSI:
echo.
echo 1. Aplikasi tidak bisa diakses:
echo    - Periksa Windows Firewall (jalankan: netsh advfirewall show allprofiles)
echo    - Pastikan port 5000 terbuka
echo    - Periksa PM2 status: pm2 status
echo    - Restart aplikasi: pm2 restart nxzz-vcomm
echo.
echo 2. Database connection error:
echo    - Periksa PostgreSQL service: sc query postgresql-x64-15
echo    - Test koneksi: psql -h localhost -U nxzz_user -d nxzz_vcomm
echo    - Restart PostgreSQL: net stop postgresql-x64-15 ^&^& net start postgresql-x64-15
echo.
echo 3. Node.js atau NPM error:
echo    - Reinstall Node.js dengan "Add to PATH" option
echo    - Buka Command Prompt baru setelah install Node.js
echo    - Clear npm cache: npm cache clean --force
echo.
echo 4. Permission denied errors:
echo    - Jalankan Command Prompt sebagai Administrator
echo    - Set permissions: icacls C:\nxzz-vcomm /grant Everyone:(OI)(CI)F
echo.
echo 5. High memory usage:
echo    - Restart aplikasi: pm2 restart nxzz-vcomm
echo    - Reboot server jika perlu
echo    - Monitor dengan: pm2 monit
echo.
echo LOG FILES LOKASI:
echo   - Application logs: C:\nxzz-vcomm\logs\
echo   - PM2 logs: pm2 logs nxzz-vcomm
echo   - PostgreSQL logs: C:\Program Files\PostgreSQL\15\data\log\
echo   - Windows Event Log: eventvwr.msc
echo.
echo PERINTAH BERGUNA:
echo   pm2 status                 - Status aplikasi
echo   pm2 restart nxzz-vcomm     - Restart aplikasi
echo   pm2 logs nxzz-vcomm        - Log aplikasi
echo   pm2 monit                  - Monitor real-time
echo   netstat -an | find ":5000" - Cek port 5000
echo   sc query postgresql-x64-15 - Status PostgreSQL
echo.
echo CONTACT SUPPORT:
echo   Untuk bantuan lebih lanjut, hubungi tim development NXZZ-VComm
echo   dengan menyertakan informasi sistem dan log error.
echo.
echo Tekan tombol apapun untuk kembali ke menu...
pause >nul
goto menu

:exit
echo.
echo Terima kasih telah menggunakan NXZZ-VComm Windows Setup!
echo.
echo Quick Reference:
echo   Windows Monitor: windows-monitor.bat
echo   Manual Backup: C:\nxzz-vcomm\backup-database.bat
echo   Application Logs: pm2 logs nxzz-vcomm
echo   System Monitor: pm2 monit
echo.
exit /b 0