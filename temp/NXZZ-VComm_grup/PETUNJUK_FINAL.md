# PANDUAN INSTALASI FINAL UNTUK WINDOWS

## Masalah yang Ditemukan
Aplikasi ini dirancang untuk Neon Database (cloud) tetapi kita akan mengadaptasinya untuk PostgreSQL lokal. Untuk instalasi Windows, kita perlu:
1. Mengganti koneksi database dari Neon ke PostgreSQL lokal
2. Menonaktifkan seeding mock data yang menyebabkan error

## Langkah-langkah Instalasi

### 1. Siapkan Database
- Pastikan PostgreSQL berjalan
- Buat database bernama `military_comm`:
  ```sql
  CREATE DATABASE military_comm;
  ```

### 2. Perbaiki File Koneksi Database dan Mock Data
1. Jalankan file `fix-mockdata.bat` yang akan:
   - Mengubah koneksi database untuk PostgreSQL lokal
   - Menonaktifkan seeding mock data yang menyebabkan error
2. Edit file `server\db.ts` dan ganti `password` dengan password PostgreSQL Anda

### 3. Jalankan Migrasi Database
```
npm run db:push
```

### 4. Jalankan Aplikasi
```
npx cross-env NODE_ENV=development tsx server/index.ts
```

### 5. Akses Aplikasi
Buka browser dan akses `http://localhost:5000`

## Masalah Umum dan Solusinya

### Error "ECONNRESET"
- Pastikan PostgreSQL berjalan
- Pastikan password di file `server\db.ts` benar
- Coba restart PostgreSQL service

### Error "DATABASE_URL must be set"
Ini sudah ditangani dengan koneksi hardcoded di file `server\db.ts`

### Error terkait WebSocket 
Ini sudah ditangani dengan mengganti @neondatabase/serverless ke postgres-js

### Error "Schema Error" saat Migrasi
Jika terjadi error saat migrasi database, coba:
```sql
DROP DATABASE military_comm;
CREATE DATABASE military_comm;
```
Lalu jalankan migrasi lagi.

## Untuk Pengembangan Lebih Lanjut
Jika Anda ingin mengembalikan konfigurasi untuk Replit (cloud), Anda bisa mengembalikan file asli:
```
copy server\db.ts.backup server\db.ts
copy server\mockData.ts.backup server\mockData.ts
```