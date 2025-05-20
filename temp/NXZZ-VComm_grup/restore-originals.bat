@echo off
echo [INFO] Mengembalikan file-file original untuk deployment di Replit...

if exist server\db.ts.backup (
  copy /Y server\db.ts.backup server\db.ts
  echo [INFO] File db.ts sudah dikembalikan ke versi original.
) else (
  echo [WARNING] Backup file db.ts tidak ditemukan!
)

if exist server\mockData.ts.backup (
  copy /Y server\mockData.ts.backup server\mockData.ts
  echo [INFO] File mockData.ts sudah dikembalikan ke versi original.
) else (
  echo [WARNING] Backup file mockData.ts tidak ditemukan!
)

echo [INFO] Restore selesai. Aplikasi sekarang siap untuk deployment di Replit.
echo.

pause