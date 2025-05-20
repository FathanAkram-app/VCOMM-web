# Panduan Instalasi di Windows dengan PostgreSQL Lokal

## Masalah yang Ditemukan
Aplikasi ini aslinya dirancang untuk menggunakan Neon Database (berbasis cloud) yang menggunakan WebSocket, tetapi kita perlu mengadaptasinya untuk PostgreSQL lokal.

## Langkah-langkah Instalasi yang Direvisi

### 1. Siapkan Database
1. Pastikan PostgreSQL sudah terinstal dan berjalan
2. Buat database bernama `military_comm`:
   ```sql
   CREATE DATABASE military_comm;
   ```

### 2. Siapkan Konfigurasi Database Lokal
1. Jalankan file `use-local-postgres.bat` untuk mengganti konfigurasi database dengan versi lokal
2. Edit file `server/db.ts` dan ganti "password" dengan password PostgreSQL Anda

### 3. Jalankan Migrasi Database
1. Jalankan file `migrasi-database.bat` untuk membuat tabel-tabel yang diperlukan

### 4. Jalankan Aplikasi
1. Jalankan file `start-local-app.bat` untuk memulai aplikasi
2. Buka browser dan akses `http://localhost:5000`

## Penjelasan File yang Disediakan

### File Batch
- `use-local-postgres.bat` - Mengganti konfigurasi database untuk menggunakan PostgreSQL lokal
- `restore-original-db.bat` - Mengembalikan konfigurasi database asli (untuk Neon Database)
- `migrasi-database.bat` - Menjalankan migrasi untuk membuat tabel database
- `start-local-app.bat` - Menjalankan aplikasi

### File Konfigurasi
- `server/db.local.ts` - Konfigurasi database untuk PostgreSQL lokal
- `server/db.ts.backup` - Backup konfigurasi database asli

## Cara Mengatasi Masalah Umum

### Error "ECONNREFUSED"
Ini terjadi karena aplikasi mencoba menggunakan WebSocket untuk terhubung ke database, yang tidak didukung oleh PostgreSQL lokal. Solusinya adalah menggunakan file konfigurasi lokal yang telah disediakan.

### Error "DATABASE_URL must be set"
File konfigurasi database lokal sudah diatur untuk menggunakan koneksi default jika variabel lingkungan DATABASE_URL tidak tersedia.

### Error lainnya
Jika mengalami masalah lain, pastikan:
- PostgreSQL berjalan
- Password yang diatur di `server/db.ts` sudah benar
- Database `military_comm` sudah dibuat
- Migrasi database sudah dijalankan

## Cara Mengembalikan ke Konfigurasi Asli
Jika ingin mengembalikan ke konfigurasi Neon Database (untuk deployment di Replit), cukup jalankan `restore-original-db.bat`.