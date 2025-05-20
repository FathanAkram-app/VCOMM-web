@echo off
echo [INFO] Memperbaiki koneksi database dan menonaktifkan seeding mock data...

REM Buat file db.ts dengan koneksi yang benar dan tanpa WebSocket
echo import { drizzle } from 'drizzle-orm/postgres-js'; > server\db.ts
echo import postgres from 'postgres'; >> server\db.ts
echo import * as schema from "@shared/schema"; >> server\db.ts
echo. >> server\db.ts
echo // Gunakan password PostgreSQL yang tepat >> server\db.ts
echo const connectionString = 'postgres://postgres:password@localhost:5432/military_comm'; >> server\db.ts
echo console.log("Menghubungkan ke database PostgreSQL lokal..."); >> server\db.ts
echo. >> server\db.ts
echo // Konfigurasi koneksi yang lebih reliable >> server\db.ts
echo const client = postgres(connectionString, { >> server\db.ts
echo   max: 10, // maksimum 10 koneksi >> server\db.ts
echo   idle_timeout: 30, // tutup koneksi setelah 30 detik idle >> server\db.ts
echo   connect_timeout: 10, // timeout koneksi 10 detik >> server\db.ts
echo   ssl: false, // matikan SSL untuk koneksi lokal >> server\db.ts
echo }); >> server\db.ts
echo export const db = drizzle(client, { schema }); >> server\db.ts
echo export { client as pool }; >> server\db.ts
echo. >> server\db.ts
echo console.log("Koneksi database berhasil dibuat."); >> server\db.ts

REM Menonaktifkan seeding data mock
echo [INFO] Menonaktifkan seeding data mock...
echo // Backup file mockData.ts original > server\mockData.ts.backup
type server\mockData.ts > server\mockData.ts.backup

echo // Skip mock data untuk menghindari error > server\mockData.ts
echo export async function seedMockData() { >> server\mockData.ts
echo   console.log("Mock data seeding diabaikan untuk versi lokal."); >> server\mockData.ts
echo } >> server\mockData.ts
echo. >> server\mockData.ts
echo export async function removeMockData() { >> server\mockData.ts
echo   console.log("Remove mock data diabaikan untuk versi lokal."); >> server\mockData.ts
echo } >> server\mockData.ts

echo [INFO] Selesai! File database dan mock data sudah diubah.
echo [INFO] PENTING: Edit file server\db.ts dan ganti 'password' dengan password PostgreSQL Anda.
echo.

pause