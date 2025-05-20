# PETUNJUK CEPAT INSTALASI WINDOWS

## Masalah yang Terjadi
Aplikasi ini menggunakan Neon Database (cloud) yang menggunakan WebSocket, tetapi kita perlu menggunakan PostgreSQL lokal.

## Langkah Cepat untuk Instalasi

### 1. Siapkan Database PostgreSQL
- Pastikan PostgreSQL berjalan
- Buat database bernama `military_comm`

### 2. Perbaiki Koneksi Database
- Jalankan file `fix-postgres-direct.bat`
- Edit file `server\db.ts` dan ganti `password` dengan password PostgreSQL Anda yang sebenarnya

### 3. Jalankan Migrasi Database
```
npm run db:push
```

### 4. Jalankan Aplikasi
```
npx cross-env NODE_ENV=development tsx server/index.ts
```

## Jika Masih Ada Masalah
- Pastikan Node.js dan npm terinstal dengan benar
- Pastikan PostgreSQL berjalan dan password sudah benar
- Periksa apakah database military_comm sudah dibuat

## Cara Menjalankan Aplikasi Selanjutnya
Setelah setup awal, Anda hanya perlu menjalankan:
```
npx cross-env NODE_ENV=development tsx server/index.ts
```