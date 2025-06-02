@echo off
echo Setting up HTTPS tunnel for mobile access...
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Cloudflare Tunnel...
    
    :: Download cloudflared
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    
    if not exist cloudflared.exe (
        echo Failed to download cloudflared. Please check internet connection.
        pause
        exit /b 1
    )
    
    echo Downloaded successfully!
)

echo.
echo Starting tunnel on port 5000...
echo This will create a secure HTTPS URL that works on mobile devices.
echo.

:: Start the tunnel
if exist cloudflared.exe (
    cloudflared.exe tunnel --url http://localhost:5000
) else (
    cloudflared tunnel --url http://localhost:5000
)