@echo off
echo ===== Setup Database Lokal untuk NXZZ-VComm =====
echo.

echo 1. Pastikan PostgreSQL sudah terinstal dan berjalan di komputer Anda
echo.

echo 2. Membuat database nxzz_vcomm di PostgreSQL lokal...
echo Anda akan diminta memasukkan password PostgreSQL lokal Anda
echo.

set /p PGPASSWORD="Masukkan password user postgres: "

echo.
echo CREATE DATABASE nxzz_vcomm; | psql -U postgres
echo.

echo 3. Membuat file .env yang sesuai...
echo DATABASE_URL=postgresql://postgres:%PGPASSWORD%@localhost:5432/nxzz_vcomm > .env
echo SESSION_SECRET=nxzz_secret_key_123 >> .env
echo NODE_ENV=development >> .env

echo.
echo 4. Menginstall dependency untuk PostgreSQL lokal...
call npm install pg

echo.
echo 5. Menjalankan migrasi database...
call npx drizzle-kit push

echo.
echo 6. Setup selesai!
echo.
echo Jika tidak ada error, database lokal sudah siap digunakan.
echo Anda dapat menjalankan aplikasi dengan:
echo   dev-mode.bat
echo.
pause