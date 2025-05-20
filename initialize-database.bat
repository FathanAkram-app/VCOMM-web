@echo off
echo ===== Inisialisasi Database NXZZ-VComm =====
echo.

echo 1. Mengecek database PostgreSQL...
echo.
echo Pastikan PostgreSQL berjalan di komputer Anda!
echo.

echo 2. Membuat database schema...
call npx drizzle-kit push

echo.
echo 3. Inisialisasi database selesai!
echo.
echo Jika tidak ada error, database sudah siap digunakan.
echo Jika ada error, pastikan:
echo - PostgreSQL sudah terinstall dan berjalan
echo - Database nxzz_vcomm sudah dibuat
echo - User dan password di file .env sudah benar
echo.
pause