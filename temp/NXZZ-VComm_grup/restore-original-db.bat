@echo off
echo [INFO] Mengembalikan konfigurasi database asli...

REM Periksa apakah backup tersedia
if not exist server\db.ts.backup (
  echo [ERROR] File backup db.ts.backup tidak ditemukan!
  echo [ERROR] Tidak dapat mengembalikan konfigurasi database asli.
  pause
  exit /b 1
)

REM Kembalikan file asli
copy /Y server\db.ts.backup server\db.ts

echo [INFO] Konfigurasi database asli telah dikembalikan.
echo.

pause