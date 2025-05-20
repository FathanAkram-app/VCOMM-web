@echo off
echo [INFO] Memulai aplikasi dengan variabel lingkungan yang diatur langsung...

REM Atur variabel lingkungan secara langsung
set DATABASE_URL=postgres://postgres:password@localhost:5432/military_comm
set PGUSER=postgres
set PGHOST=localhost
set PGDATABASE=military_comm
set PGPORT=5432
set PGPASSWORD=password
set NODE_ENV=development

REM PENTING: Edit password di atas dengan password PostgreSQL Anda!

echo [INFO] Variabel lingkungan sudah diatur.
echo [INFO] DATABASE_URL=%DATABASE_URL%

REM Jalankan aplikasi
echo [INFO] Menjalankan aplikasi...
npx tsx server/index.ts

pause