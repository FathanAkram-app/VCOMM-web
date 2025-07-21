# NXZZ-VComm Messenger

Aplikasi komunikasi militer untuk jaringan intranet dengan fitur chat teks, video call, dan manajemen situasi yang aman dan efisien.

## 🚀 Quick Deployment

### Linux (Ubuntu, CentOS, Debian, Fedora, Arch)
```bash
# Universal Linux installer
curl -sSL https://raw.githubusercontent.com/your-repo/install-linux-universal.sh | sudo bash
```
📖 **Panduan lengkap**: [LINUX-COMPATIBILITY-GUIDE.md](LINUX-COMPATIBILITY-GUIDE.md)

### Proxmox VE (Enterprise)
```bash
# Proxmox-optimized installer
curl -sSL https://raw.githubusercontent.com/your-repo/install-proxmox.sh | sudo bash
```
📖 **Panduan lengkap**: [PROXMOX-INSTALLATION-GUIDE.md](PROXMOX-INSTALLATION-GUIDE.md)

### Windows Server/Desktop
```cmd
# Download setup-windows.bat dan jalankan sebagai Administrator
setup-windows.bat
```
📖 **Panduan lengkap**: [WINDOWS-INSTALLATION-GUIDE.md](WINDOWS-INSTALLATION-GUIDE.md)

## Langkah Penginstalan di Windows

### Persiapan Database
1. Instal PostgreSQL di komputer lokal
2. Buat database dengan nama `nxzz_vcomm`:
   ```
   psql -U postgres
   CREATE DATABASE nxzz_vcomm;
   \c nxzz_vcomm
   ```
3. Tabel-tabel akan dibuat secara otomatis oleh aplikasi

### Pengaturan Aplikasi
1. Pastikan Node.js terinstal (v18 atau lebih tinggi)
2. Clone repositori ini ke komputer lokal
3. Buat file `.env` di folder root dengan isi:
   ```
   DATABASE_URL=postgresql://postgres:password_anda@localhost:5432/nxzz_vcomm
   SESSION_SECRET=rahasia_acak_anda
   ```
   Ganti `password_anda` dengan password PostgreSQL Anda

### Instalasi dan Menjalankan
Gunakan file batch berikut untuk menginstal dan menjalankan aplikasi:

1. **Setup pertama kali:**
   ```
   setup-windows.bat
   ```
   File ini akan menginstal dependensi dan melakukan build aplikasi.

2. **Menjalankan aplikasi:**
   ```
   run-app.bat
   ```
   Aplikasi akan berjalan di http://localhost:5000

3. **Mode pengembangan:**
   ```
   dev-mode.bat
   ```
   Gunakan ini jika ingin melakukan pengembangan/debugging.

## Penggunaan di Jaringan Intranet

Untuk mengakses aplikasi dari perangkat lain di jaringan yang sama:
1. Pastikan firewall mengizinkan koneksi ke port 5000
2. Perangkat lain dapat mengakses melalui `http://<IP-komputer-server>:5000`

## Fitur Utama
- Chat teks antar personel militer
- Grup chat untuk koordinasi tim
- Tampilan responsif untuk berbagai perangkat
- Tingkat klasifikasi pesan (Unclassified, Confidential, dsb)
- Pengelolaan kontak dan profil pengguna