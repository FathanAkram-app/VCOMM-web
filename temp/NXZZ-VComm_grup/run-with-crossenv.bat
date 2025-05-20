@echo off
echo [INFO] Menjalankan aplikasi dengan cross-env...

REM Jalankan dengan cross-env
npx cross-env NODE_ENV=development tsx server/index.ts

pause