@echo off
echo ===== Menjalankan NXZZ-VComm =====
echo.

set DATABASE_URL=postgresql://postgres:admin123!!@localhost:5432/nxzz_vcomm
set SESSION_SECRET=rahasia_acak_anda
set NODE_ENV=production

echo Menjalankan aplikasi dalam mode production...
echo Aplikasi akan tersedia di http://localhost:5000
echo.
echo Tekan Ctrl+C untuk menghentikan server
echo.

node dist/index.js