@echo off
echo [INFO] Memulai aplikasi dengan konfigurasi database sederhana...

REM Gunakan db.simple.ts
echo [INFO] Menerapkan konfigurasi database sederhana...
if not exist server\db.ts.backup (
  copy server\db.ts server\db.ts.backup
  echo [INFO] Backup file db.ts telah dibuat: server\db.ts.backup
)
copy /Y server\db.simple.ts server\db.ts

REM Jalankan aplikasi
echo [INFO] Menjalankan aplikasi...
npx tsx server/index.ts

pause