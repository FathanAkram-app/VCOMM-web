@echo off
title NXZZ-VComm HTTPS Server
color 0A

echo.
echo ====================================
echo    NXZZ-VComm HTTPS Setup
echo ====================================
echo.

REM Check if certificates exist in C:\VCommMessenger
if not exist "C:\VCommMessenger\localhost+2.pem" (
    echo ❌ SSL certificates not found in C:\VCommMessenger
    echo.
    echo Please run the following command first:
    echo cd C:\VCommMessenger
    echo mkcert localhost 192.168.100.165 127.0.0.1
    echo.
    pause
    exit /b 1
)

REM Copy certificates to project directory
echo 📋 Copying SSL certificates...
copy "C:\VCommMessenger\localhost+2.pem" . > nul 2>&1
copy "C:\VCommMessenger\localhost+2-key.pem" . > nul 2>&1

if exist "localhost+2.pem" (
    echo ✅ SSL certificates copied successfully
) else (
    echo ❌ Failed to copy SSL certificates
    pause
    exit /b 1
)

echo.
echo 🔒 Starting HTTPS server...
echo 📱 Mobile access: https://192.168.100.165:5000
echo 💻 Desktop access: https://localhost:5000
echo.
echo Note: Camera/microphone will work on mobile Chrome with HTTPS!
echo.

REM Start the application with npm run dev
npm run dev

pause