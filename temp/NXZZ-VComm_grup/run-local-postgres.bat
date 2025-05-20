@echo off
echo [INFO] Memulai aplikasi dengan koneksi PostgreSQL lokal...

REM Atur variabel lingkungan
set NODE_ENV=development
set DB_LOCAL=true

REM Edit ini dengan password PostgreSQL Anda
set DATABASE_URL=postgres://postgres:password@localhost:5432/military_comm
set PGUSER=postgres
set PGHOST=localhost
set PGDATABASE=military_comm
set PGPASSWORD=password
set PGPORT=5432

echo [INFO] Variabel lingkungan sudah diatur
echo [INFO] DATABASE_URL=%DATABASE_URL%
echo.
echo [INFO] PENTING: Edit file ini dan ganti 'password' dengan password PostgreSQL Anda yang sebenarnya!
echo.

REM Jalankan aplikasi dengan file database lokal
echo [INFO] Menjalankan aplikasi...
npx tsx -r server/run-local.js server/index.ts

pause