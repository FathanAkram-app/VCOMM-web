# Panduan Instalasi untuk Windows

## Prasyarat
1. **Node.js**: 
   - Unduh dan instal Node.js versi 18 atau lebih baru dari [nodejs.org](https://nodejs.org/)
   - Pastikan opsi npm juga terinstal bersamaan dengan Node.js

2. **PostgreSQL**: 
   - Unduh PostgreSQL dari [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
   - Instal dengan mengikuti petunjuk instalasi
   - Catat informasi berikut saat instalasi:
     - Port (biasanya 5432)
     - Username (biasanya 'postgres')
     - Password yang Anda buat

3. **Git**: 
   - Unduh dan instal Git dari [git-scm.com](https://git-scm.com/download/win)

## Langkah-langkah Instalasi

1. **Buat Database PostgreSQL**:
   - Buka SQL Shell (psql) atau pgAdmin yang terinstal bersama PostgreSQL
   - Login dengan kredensial yang Anda buat saat instalasi
   - Buat database baru:
     ```sql
     CREATE DATABASE military_comm;
     ```

2. **Siapkan Repository**:
   ```
   git clone https://github.com/username/military-comm.git
   cd military-comm
   ```

3. **Instal Dependensi**:
   ```
   npm install
   ```

4. **Konfigurasi Database**:
   - Buat file `.env` di direktori root proyek
   - Tambahkan konfigurasi database berikut:
   ```
   DATABASE_URL=postgres://[USERNAME]:[PASSWORD]@localhost:5432/military_comm
   PGUSER=[USERNAME]
   PGHOST=localhost
   PGDATABASE=military_comm
   PGPORT=5432
   PGPASSWORD=[PASSWORD]
   ```
   - Ganti `[USERNAME]` dan `[PASSWORD]` dengan kredensial PostgreSQL Anda

5. **Migrate Database**:
   ```
   npm run db:push
   ```
   Perintah ini akan membuat semua tabel yang diperlukan di database PostgreSQL Anda.

6. **Jalankan Aplikasi (Metode 1 - Dengan batch file)**:
   ```
   run-windows.bat
   ```
   atau
   ```
   run-with-crossenv.bat
   ```

7. **Jalankan Aplikasi (Metode 2 - Dengan command line)**:
   ```
   set NODE_ENV=development
   npx tsx server/index.ts
   ```

8. **Akses Aplikasi**:
   - Buka browser web dan kunjungi `http://localhost:5000`

## Troubleshooting

1. **Masalah Koneksi Database**:
   - Periksa apakah PostgreSQL berjalan dengan benar
   - Pastikan kredensial di file `.env` sudah benar
   - Pastikan database 'military_comm' sudah dibuat
   - Periksa firewall Windows, pastikan port PostgreSQL (5432) tidak diblokir

2. **Masalah Command Not Found**:
   - Pastikan Node.js dan npm sudah terpasang dengan benar
   - Coba gunakan jalur lengkap: `C:\Program Files\nodejs\npx.cmd tsx server/index.ts`

3. **Masalah Port**:
   - Jika port 5000 sudah digunakan, buka file `server/index.ts` dan ganti port

4. **Error terkait MODULE_NOT_FOUND**:
   - Jalankan `npm install` lagi
   - Terkadang perlu restart terminal untuk memperbarui PATH

5. **Error Database PostgreSQL**:
   - Pastikan layanan PostgreSQL berjalan (Cek di Services)
   - Coba restart layanan PostgreSQL

## Catatan Tambahan

- Aplikasi ini menggunakan WebSocket untuk komunikasi real-time, pastikan port tidak diblokir oleh firewall.
- Jika menggunakan antivirus, tambahkan pengecualian untuk NodeJS dan PostgreSQL.
- Untuk produksi, pertimbangkan untuk menggunakan process manager seperti PM2.