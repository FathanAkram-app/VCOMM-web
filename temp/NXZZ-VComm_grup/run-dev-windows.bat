@echo off
echo [INFO] Menjalankan aplikasi di Windows...

REM Set environment variables
set NODE_ENV=development

REM Jalankan aplikasi
echo [INFO] Menjalankan aplikasi dengan npx tsx...
npx tsx server/index.ts

pause