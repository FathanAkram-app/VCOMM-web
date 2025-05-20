# Instalasi NXZZ-VComm untuk Windows

## Prasyarat
- Node.js (versi 18.x atau lebih baru)
- PostgreSQL (terinstal dan berjalan)
- Database bernama `military_comm` sudah dibuat

## Langkah-langkah Instalasi

### 1. Clone dan Siapkan Repository
1. Clone repository
2. Install dependensi dengan menjalankan:
   ```
   npm install
   ```

### 2. Konfigurasi Database
1. Pastikan PostgreSQL berjalan
2. Buat database `military_comm` jika belum ada:
   ```sql
   CREATE DATABASE military_comm;
   ```
3. Salin file `.env.windows` menjadi `.env`:
   ```
   copy .env.windows .env
   ```
4. Edit file `.env` jika kredensial PostgreSQL Anda berbeda

### 3. Migrasi Database
Jalankan migrasi untuk membuat tabel:
```
npm run db:push
```

### 4. Menjalankan Aplikasi
PENTING: Perintah `npm run dev` tidak akan berfungsi di Windows secara langsung karena masalah sintaks variabel lingkungan.

Gunakan salah satu cara berikut:

**Cara 1: Gunakan batch file**
```
run-dev-windows.bat
```

**Cara 2: Gunakan cross-env**
```
run-with-crossenv.bat
```
atau
```
npx cross-env NODE_ENV=development tsx server/index.ts
```

**Cara 3: Set variabel lingkungan terlebih dahulu**
```
set NODE_ENV=development
npx tsx server/index.ts
```

### 5. Akses Aplikasi
Buka browser dan akses: `http://localhost:5000`

## Troubleshooting

### Error "NODE_ENV is not recognized"
Ini karena sintaks `NODE_ENV=development` tidak bekerja di Windows. Gunakan salah satu metode yang dijelaskan di atas.

### Error "ECONNREFUSED"
- Pastikan PostgreSQL berjalan
- Periksa kredensial database di file `.env` atau di `server/db.ts`

### Error Database Lainnya
- Pastikan database `military_comm` sudah dibuat
- Jalankan ulang `npm run db:push`

### Error Module Not Found
- Jalankan `npm install` lagi
- Periksa bahwa semua dependensi terinstal dengan benar