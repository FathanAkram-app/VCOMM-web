@echo off
echo ===== Mempersiapkan NXZZ-VComm untuk Windows =====
echo.

echo 1. Menginstall dependensi...
call npm install

echo.
echo 2. Build frontend...
call npm run build

echo.
echo 3. Setup complete!
echo.
echo Untuk menjalankan aplikasi, gunakan perintah:
echo   run-app.bat
echo.
pause