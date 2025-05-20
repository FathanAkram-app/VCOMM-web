@echo off
echo [INFO] Menjalankan migrasi database...

REM Periksa file .env
if not exist .env (
  echo [ERROR] File .env tidak ditemukan!
  echo [INFO] Pastikan Anda sudah membuat file .env dengan kredensial database yang benar.
  pause
  exit /b 1
)

REM Jalankan migrasi
echo [INFO] Membuat tabel database...
npm run db:push

if %ERRORLEVEL% EQU 0 (
  echo [SUCCESS] Migrasi database berhasil!
) else (
  echo [ERROR] Migrasi database gagal! Periksa kembali kredensial database Anda.
)

pause