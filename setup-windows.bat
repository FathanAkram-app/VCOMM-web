@echo off
echo ===== Mempersiapkan NXZZ-VComm untuk Windows =====
echo.

echo 1. Memeriksa file .env...
if not exist .env (
  echo File .env tidak ditemukan, membuat file baru...
  echo DATABASE_URL=postgresql://postgres:admin123!!@localhost:5432/nxzz_vcomm > .env
  echo SESSION_SECRET=nxzz_secret_key_123 >> .env
  echo NODE_ENV=development >> .env
  echo File .env berhasil dibuat.
) else (
  echo File .env sudah ada.
)

echo.
echo 2. Menginstall dependensi...
call npm install

echo.
echo 3. Memeriksa database...
echo Pastikan Anda sudah:
echo - Menginstal PostgreSQL di komputer lokal
echo - Membuat database 'nxzz_vcomm'
echo - Username database: postgres 
echo - Password database sesuai dengan yang ada di file .env

echo.
echo 4. Setup complete!
echo.
echo Untuk menjalankan aplikasi, gunakan perintah:
echo   run-app.bat
echo.
echo TIPS TROUBLESHOOTING:
echo - Jika mengalami error saat registrasi, pastikan PostgreSQL berjalan
echo - Pastikan nama database, username, dan password di .env sudah benar
echo - Cek file log di console untuk error spesifik
echo.
pause