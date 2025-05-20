@echo off
echo [INFO] Menyiapkan koneksi PostgreSQL lokal...

REM Backup file db.ts jika belum ada backup
if not exist server\db.ts.backup (
  echo [INFO] Membuat backup file db.ts...
  copy server\db.ts server\db.ts.backup
) else (
  echo [INFO] Backup file db.ts sudah ada.
)

REM Ganti file db.ts dengan versi lokal
echo [INFO] Mengganti konfigurasi database dengan koneksi lokal...
copy /Y server\db.local.ts server\db.ts

echo [INFO] Konfigurasi database diganti dengan koneksi PostgreSQL lokal.
echo [INFO] Pastikan untuk mengedit file server\db.ts dan mengubah password PostgreSQL Anda.
echo.
echo [INFO] Untuk mengembalikan konfigurasi asli, jalankan restore-original-db.bat
echo.

pause