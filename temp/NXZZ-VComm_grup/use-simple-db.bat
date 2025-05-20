@echo off
echo [INFO] Menggunakan konfigurasi database sederhana untuk Windows...

REM Backup file db.ts jika belum di-backup
if not exist server\db.ts.backup (
  copy server\db.ts server\db.ts.backup
  echo [INFO] Backup file db.ts telah dibuat: server\db.ts.backup
)

REM Salin versi simple ke db.ts
copy /Y server\db.simple.ts server\db.ts
echo [INFO] Konfigurasi database sederhana diterapkan.

REM Instruksi selanjutnya
echo.
echo [INFO] Sekarang jalankan aplikasi dengan perintah:
echo       npx tsx server/index.ts
echo.

pause