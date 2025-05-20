# Panduan Mengatasi Masalah Koneksi Database di Windows

## Error yang Muncul
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

Error ini terjadi karena aplikasi tidak dapat menemukan informasi koneksi database yang diperlukan dalam variabel lingkungan.

## Langkah-langkah Detail Mengatasi Masalah

### 1. Periksa PostgreSQL
1. **Pastikan PostgreSQL sudah terinstal dan berjalan**:
   - Cek di Windows Services (tekan `Win+R`, ketik `services.msc`)
   - Cari layanan "PostgreSQL" dan pastikan status "Running"
   - Jika tidak berjalan, klik kanan dan pilih "Start"

### 2. Buat Database di PostgreSQL
1. **Buka pgAdmin** (biasanya terinstal bersama PostgreSQL)
2. **Koneksi ke server**:
   - Klik dua kali pada "PostgreSQL" di panel kiri
   - Masukkan password yang dibuat saat instalasi
3. **Buat database baru**:
   - Klik kanan pada "Databases" 
   - Pilih "Create" > "Database..."
   - Nama: `military_comm`
   - Klik "Save"

### 3. Buat File .env dengan Benar
1. **Buat file bernama `.env`** di folder root proyek (C:\\NXZZ-VComm\\)
   - PENTING: File harus bernama tepat `.env` (dengan titik di depan)
   - Di Windows, mungkin sulit membuat file dengan nama ini. Gunakan salah satu cara:
     - Di Command Prompt: `echo.> .env`
     - Di PowerShell: `New-Item -Path .env -ItemType File`
     - Atau gunakan editor teks, lalu "Save As" dengan nama `.env` dalam tanda kutip

2. **Isi file .env** dengan informasi berikut:
```
DATABASE_URL=postgres://postgres:password@localhost:5432/military_comm
PGUSER=postgres
PGHOST=localhost
PGDATABASE=military_comm
PGPORT=5432
PGPASSWORD=password
```

   - Ganti `postgres` dengan username PostgreSQL Anda (biasanya default-nya memang "postgres")
   - Ganti `password` dengan password PostgreSQL yang Anda buat saat instalasi

### 4. Cek Format URL Database
Format DATABASE_URL yang benar:
```
postgres://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]
```

Contoh dengan kredensial umum:
```
postgres://postgres:admin123@localhost:5432/military_comm
```

### 5. Jalankan Migrasi Database
1. Buka Command Prompt di folder C:\\NXZZ-VComm
2. Jalankan perintah:
```
npm run db:push
```
3. Ini akan membuat tabel-tabel database yang diperlukan

### 6. Jalankan Aplikasi
Setelah migrasi berhasil, coba jalankan aplikasi dengan salah satu cara:

**Menggunakan Cross-env (Rekomendasi)**:
```
npx cross-env NODE_ENV=development tsx server/index.ts
```

**Jika masih error, coba cara langsung**:
```
set NODE_ENV=development
npx tsx server/index.ts
```

### Masalah Lainnya

1. **Error "Port Already in Use"**:
   - Periksa port 5000 sudah digunakan atau tidak
   - Ubah PORT di file .env (tambahkan `PORT=3000`)

2. **Error Module Not Found**:
   - Jalankan `npm install` untuk memastikan semua dependensi terinstal

3. **Versi Node.js Terlalu Baru**:
   - Aplikasi mungkin belum kompatibel dengan Node.js v22
   - Coba install Node.js versi LTS (v18.x)

4. **Koneksi PostgreSQL ditolak**:
   - Periksa konfigurasi pg_hba.conf PostgreSQL
   - Pastikan izin akses lokal telah diaktifkan

### Cara Memeriksa Koneksi Database Manual

Anda bisa memeriksa koneksi ke database dengan menggunakan aplikasi pgAdmin atau psql:

1. **Dengan psql** (terminal PostgreSQL):
   ```
   psql -U postgres -h localhost -p 5432 -d military_comm
   ```
   
2. **Dengan pgAdmin**:
   - Koneksi ke server dan database
   - Query sederhana: `SELECT 1;`

Jika berhasil terhubung dengan metode di atas, berarti database Anda sudah siap, dan masalahnya mungkin di konfigurasi .env atau cara menjalankan aplikasi.