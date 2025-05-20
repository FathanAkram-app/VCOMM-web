@echo off
echo ===== Building NXZZ-VComm =====
echo.

set NODE_ENV=production

echo 1. Menginstall dependensi...
call npm install

echo.
echo 2. Building frontend...
call npm run build

echo.
echo 3. Build selesai!
echo   Sekarang Anda dapat menjalankan aplikasi dengan 'run-app.bat'
echo.
pause