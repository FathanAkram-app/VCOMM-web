@echo off
echo [INFO] Memulai aplikasi Military Communication Platform...

REM Jalankan aplikasi
echo [INFO] Menjalankan aplikasi dengan cross-env...
echo [INFO] Press Ctrl+C untuk menghentikan aplikasi.

npx cross-env NODE_ENV=development tsx server/index.ts

pause