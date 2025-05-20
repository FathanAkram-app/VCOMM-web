@echo off
echo [INFO] Memulai aplikasi Military Communication Platform...

REM Pastikan variabel lingkungan benar
echo [INFO] Memeriksa file .env...
if not exist .env (
  echo [ERROR] File .env tidak ditemukan!
  echo [INFO] Membuat file .env contoh...
  echo DATABASE_URL=postgres://postgres:password@localhost:5432/military_comm>.env
  echo PGUSER=postgres>>.env
  echo PGHOST=localhost>>.env
  echo PGDATABASE=military_comm>>.env
  echo PGPORT=5432>>.env
  echo PGPASSWORD=password>>.env
  echo PORT=5000>>.env
  echo [WARNING] File .env dibuat dengan nilai default.
  echo [WARNING] Silakan edit file .env dengan kredensial database Anda yang benar.
  pause
  exit /b 1
)

REM Coba jalankan aplikasi dengan cross-env
echo [INFO] Menjalankan aplikasi dengan cross-env...
echo [INFO] Tekan Ctrl+C untuk menghentikan aplikasi.
npx cross-env NODE_ENV=development tsx server/index.ts

REM Jika gagal, coba metode alternatif
if %ERRORLEVEL% NEQ 0 (
  echo [WARNING] Gagal menjalankan dengan cross-env, mencoba metode alternatif...
  echo [INFO] Menjalankan aplikasi dengan set NODE_ENV...
  set NODE_ENV=development
  npx tsx server/index.ts
)

pause