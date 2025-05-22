@echo off
echo Copying SSL certificates for HTTPS setup...

REM Copy certificate files from C:\VCommMessenger to current directory
if exist "C:\VCommMessenger\localhost+2.pem" (
    copy "C:\VCommMessenger\localhost+2.pem" . > nul
    echo ✅ Certificate file copied: localhost+2.pem
) else (
    echo ❌ Certificate file not found: C:\VCommMessenger\localhost+2.pem
    echo Please make sure you generated certificates with: mkcert localhost 192.168.100.165 127.0.0.1
    pause
    exit /b 1
)

if exist "C:\VCommMessenger\localhost+2-key.pem" (
    copy "C:\VCommMessenger\localhost+2-key.pem" . > nul
    echo ✅ Private key file copied: localhost+2-key.pem
) else (
    echo ❌ Private key file not found: C:\VCommMessenger\localhost+2-key.pem
    echo Please make sure you generated certificates with: mkcert localhost 192.168.100.165 127.0.0.1
    pause
    exit /b 1
)

echo.
echo 🔒 SSL certificates copied successfully!
echo 📱 Your app will now run on HTTPS for mobile camera/microphone access
echo.
pause