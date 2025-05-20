@echo off
echo [INFO] Memulai aplikasi dengan PostgreSQL lokal...

REM Set environment variables
set NODE_ENV=development

REM Jalankan aplikasi
echo [INFO] Menjalankan aplikasi...
echo [INFO] Tekan Ctrl+C untuk menghentikan.
npx cross-env NODE_ENV=development tsx server/index.ts

pause