@echo off
setlocal enabledelayedexpansion

REM NXZZ-VComm Windows Environment Preparation Script
REM Prepare Windows system before installation

title NXZZ-VComm Windows Preparation

echo ================================================================
echo           NXZZ-VComm Windows Environment Preparation
echo           Preparing system for installation
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

echo [%time%] Memulai persiapan environment Windows...

REM Disable Windows Defender real-time protection temporarily
echo [%time%] Menonaktifkan Windows Defender sementara...
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true" 2>nul

REM Update Windows
echo [%time%] Memeriksa Windows Update...
echo Silakan pastikan Windows sudah terupdate ke versi terbaru
echo Jalankan: Settings ^> Update ^& Security ^> Windows Update

REM Enable necessary Windows features
echo [%time%] Mengaktifkan Windows features yang diperlukan...

REM .NET Framework (if not already installed)
dism /online /enable-feature /featurename:NetFx3 /all >nul 2>&1

REM Hyper-V Platform (for better virtualization support)
dism /online /enable-feature /featurename:Microsoft-Hyper-V-All >nul 2>&1

REM Virtual Machine Platform
dism /online /enable-feature /featurename:VirtualMachinePlatform >nul 2>&1

REM Windows Subsystem for Linux (optional, for compatibility)
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux >nul 2>&1

echo Windows features berhasil dikonfigurasi

REM Configure network settings
echo [%time%] Mengonfigurasi network settings...

REM Increase TCP connection limits
netsh int ipv4 set dynamicport tcp start=1024 num=64511 >nul
netsh int ipv6 set dynamicport tcp start=1024 num=64511 >nul

REM Configure TCP settings for high performance
netsh int tcp set global autotuninglevel=normal >nul
netsh int tcp set global chimney=enabled >nul
netsh int tcp set global rss=enabled >nul
netsh int tcp set global netdma=enabled >nul

echo Network settings berhasil dikonfigurasi

REM Configure Windows Performance
echo [%time%] Mengoptimalkan performa Windows...

REM Set Windows to high performance mode
powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c >nul 2>&1

REM Disable unnecessary visual effects
reg add "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f >nul

REM Disable Windows Search indexing on system drive (optional)
sc config "WSearch" start= disabled >nul

REM Configure virtual memory
echo [%time%] Mengonfigurasi virtual memory...
wmic computersystem where name="%computername%" set AutomaticManagedPagefile=False >nul
wmic pagefileset where name="C:\\pagefile.sys" set InitialSize=4096,MaximumSize=8192 >nul

echo Performance optimization selesai

REM Configure Windows Firewall
echo [%time%] Mengonfigurasi Windows Firewall...

REM Create inbound rules for common ports
netsh advfirewall firewall add rule name="NXZZ-VComm HTTP" dir=in action=allow protocol=TCP localport=5000 >nul
netsh advfirewall firewall add rule name="NXZZ-VComm HTTPS" dir=in action=allow protocol=TCP localport=443 >nul
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432 >nul
netsh advfirewall firewall add rule name="IIS HTTP" dir=in action=allow protocol=TCP localport=80 >nul

REM Create outbound rules
netsh advfirewall firewall add rule name="NXZZ-VComm Outbound" dir=out action=allow protocol=TCP localport=5000 >nul

echo Firewall rules berhasil dikonfigurasi

REM Disable unnecessary services
echo [%time%] Menonaktifkan service yang tidak diperlukan...

REM Disable Windows services that might interfere
sc config "Themes" start= disabled >nul 2>&1
sc config "Fax" start= disabled >nul 2>&1
sc config "PrintNotify" start= disabled >nul 2>&1
sc config "WbioSrvc" start= disabled >nul 2>&1

echo Service optimization selesai

REM Configure registry for better performance
echo [%time%] Mengonfigurasi registry untuk performa optimal...

REM TCP/IP performance
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TCPNoDelay /t REG_DWORD /d 1 /f >nul

REM Disable Windows Error Reporting
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\Windows Error Reporting" /v Disabled /t REG_DWORD /d 1 /f >nul

REM Disable automatic updates restart
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f >nul

echo Registry configuration selesai

REM Create system directories
echo [%time%] Membuat direktori sistem...
if not exist "C:\nxzz-vcomm" mkdir "C:\nxzz-vcomm"
if not exist "C:\nxzz-vcomm\logs" mkdir "C:\nxzz-vcomm\logs"
if not exist "C:\nxzz-vcomm\backups" mkdir "C:\nxzz-vcomm\backups"
if not exist "C:\nxzz-vcomm\uploads" mkdir "C:\nxzz-vcomm\uploads"
if not exist "C:\nxzz-vcomm\ssl" mkdir "C:\nxzz-vcomm\ssl"

REM Set proper permissions
icacls "C:\nxzz-vcomm" /grant Everyone:(OI)(CI)F >nul

echo Direktori sistem berhasil dibuat

REM Download links and information
echo [%time%] Menyiapkan informasi download...

(
echo ================================================================
echo           DOWNLOAD LINKS DAN INFORMASI INSTALASI
echo ================================================================
echo.
echo Software yang perlu didownload:
echo.
echo 1. Node.js 20.x LTS
echo    URL: https://nodejs.org/
echo    Pilih: Windows Installer ^(.msi^) 64-bit
echo    Install dengan opsi "Add to PATH"
echo.
echo 2. PostgreSQL 15.x
echo    URL: https://www.postgresql.org/download/windows/
echo    Password untuk superuser: PostgresAdmin2024!
echo    Port: 5432 ^(default^)
echo.
echo 3. Visual C++ Redistributable ^(jika belum ada^)
echo    URL: https://aka.ms/vs/17/release/vc_redist.x64.exe
echo.
echo 4. Git for Windows ^(optional, untuk development^)
echo    URL: https://git-scm.com/download/win
echo.
echo Setelah download selesai, jalankan: install-windows.bat
echo.
echo CATATAN PENTING:
echo • Restart komputer setelah instalasi Node.js dan PostgreSQL
echo • Pastikan PostgreSQL service berjalan sebelum install aplikasi
echo • Gunakan password yang sama untuk PostgreSQL: PostgresAdmin2024!
echo • Disable antivirus sementara saat instalasi untuk menghindari false positive
echo.
) > download-info.txt

notepad download-info.txt

REM Re-enable Windows Defender
echo [%time%] Mengaktifkan kembali Windows Defender...
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $false" 2>nul

REM Final system information
echo.
echo ================================================================
echo           PERSIAPAN WINDOWS SELESAI!
echo ================================================================
echo.
echo Langkah selanjutnya:
echo 1. Restart komputer untuk mengaktifkan semua perubahan
echo 2. Download dan install software yang diperlukan ^(lihat download-info.txt^)
echo 3. Jalankan install-windows.bat setelah semua software terinstall
echo.
echo Perubahan yang telah dilakukan:
echo [✓] Windows features diaktifkan
echo [✓] Network settings dioptimalkan
echo [✓] Performance mode diatur ke high performance
echo [✓] Virtual memory dikonfigurasi
echo [✓] Firewall rules ditambahkan
echo [✓] Service yang tidak diperlukan dinonaktifkan
echo [✓] Registry dioptimalkan untuk performa
echo [✓] Direktori sistem dibuat
echo.
echo PENTING: Restart komputer sekarang untuk mengaktifkan semua perubahan!
echo.
pause

REM Ask for restart
set /p RESTART="Apakah Anda ingin restart sekarang? (y/n): "
if /i "%RESTART%"=="y" (
    echo Komputer akan restart dalam 10 detik...
    shutdown /r /t 10
) else (
    echo Jangan lupa restart komputer sebelum melanjutkan instalasi!
)