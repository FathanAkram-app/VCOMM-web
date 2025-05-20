@echo off
echo ===== Build NXZZ-VComm untuk Production =====
echo.

echo 1. Menginstall dependensi jika belum ada...
call npm install

echo.
echo 2. Menjalankan build process...
call npm run build

echo.
echo 3. Build selesai!
echo.
echo Jika tidak ada error, aplikasi sudah siap untuk production.
echo Anda dapat menjalankannya dengan perintah:
echo   run-app.bat
echo.
pause