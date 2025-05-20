@echo off
echo ===== Menjalankan NXZZ-VComm =====
echo.

set DATABASE_URL=postgresql://postgres:admin123!!@localhost:5432/nxzz_vcomm
set SESSION_SECRET=rahasia_acak_anda
set NODE_ENV=development
set PORT=5000
set HOST=localhost

echo Memeriksa folder build...
if not exist "dist" (
  echo Folder build tidak ditemukan, menjalankan dalam mode development...
  echo.
  echo Menjalankan aplikasi dalam mode development...
  echo Aplikasi akan tersedia di http://localhost:5000
  echo.
  echo Tekan Ctrl+C untuk menghentikan server
  echo.
  
  npx tsx server/index.ts
) else (
  echo Menjalankan aplikasi dalam mode production...
  echo Aplikasi akan tersedia di http://localhost:5000
  echo.
  echo Tekan Ctrl+C untuk menghentikan server
  echo.
  
  node dist/index.js
)