@echo off
echo [INFO] Membuat koneksi PostgreSQL lokal langsung...

REM Buat file db.ts baru langsung
echo import { drizzle } from 'drizzle-orm/postgres-js'; > server\db.ts
echo import postgres from 'postgres'; >> server\db.ts
echo import * as schema from "@shared/schema"; >> server\db.ts
echo. >> server\db.ts
echo const connectionString = 'postgres://postgres:password@localhost:5432/military_comm'; >> server\db.ts
echo console.log("Menghubungkan ke database PostgreSQL lokal..."); >> server\db.ts
echo. >> server\db.ts
echo const client = postgres(connectionString); >> server\db.ts
echo export const db = drizzle(client, { schema }); >> server\db.ts
echo export { client as pool }; >> server\db.ts
echo. >> server\db.ts
echo console.log("Koneksi database berhasil dibuat."); >> server\db.ts

echo [INFO] File db.ts sudah diubah untuk menggunakan PostgreSQL lokal.
echo [INFO] PENTING: Edit file server\db.ts dan ganti 'password' dengan password PostgreSQL Anda.
echo.

pause