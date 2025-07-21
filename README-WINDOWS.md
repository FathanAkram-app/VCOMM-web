# NXZZ-VComm Windows Deployment Guide

## Quick Start untuk Windows

### 🚀 Instalasi Super Cepat

1. **Download Requirements**
   - Node.js 20.x LTS: https://nodejs.org/
   - PostgreSQL 15.x: https://www.postgresql.org/download/windows/

2. **Jalankan Script Master**
   ```cmd
   # Buka Command Prompt sebagai Administrator
   setup-windows.bat
   ```

3. **Pilih Menu Instalasi**
   - Pilih `1` untuk persiapan Windows environment
   - Restart komputer
   - Pilih `2` untuk instalasi lengkap NXZZ-VComm

### 📋 File Script yang Tersedia

| Script | Fungsi | Kapan Digunakan |
|--------|--------|-----------------|
| `setup-windows.bat` | Master script dengan menu interaktif | **Mulai dari sini** |
| `prepare-windows.bat` | Persiapan environment Windows | Sebelum instalasi |
| `install-windows.bat` | Instalasi otomatis NXZZ-VComm | Setelah Node.js & PostgreSQL terinstall |
| `windows-monitor.bat` | Monitoring sistem dan performa | Monitoring rutin |

### ⚡ Script Features

#### 🔧 **prepare-windows.bat**
- ✅ Optimasi Windows performance mode
- ✅ Konfigurasi TCP/IP untuk high load
- ✅ Setup Windows Firewall rules
- ✅ Disable service yang tidak diperlukan
- ✅ Registry optimization
- ✅ Virtual memory configuration

#### 🛠️ **install-windows.bat**
- ✅ Auto-detect Node.js dan PostgreSQL
- ✅ Database setup otomatis (user, permissions, schema)
- ✅ PM2 installation dan service configuration
- ✅ IIS reverse proxy setup (optional)
- ✅ SSL certificate generation (optional)
- ✅ Super admin user creation
- ✅ Scheduled backup configuration

#### 📊 **windows-monitor.bat**
- ✅ Service status monitoring
- ✅ Database connection dan performance metrics
- ✅ System resources (CPU, Memory, Disk)
- ✅ Network connections dan port status
- ✅ Recent call history analytics
- ✅ Health check dengan issue detection

### 🎯 Instalasi Step-by-Step

#### Step 1: Persiapan Sistem
```cmd
# Jalankan sebagai Administrator
prepare-windows.bat

# Restart komputer setelah selesai
```

#### Step 2: Install Dependencies
1. **Node.js 20.x LTS**
   - Download dari https://nodejs.org/
   - Install dengan opsi "Add to PATH"
   - Restart Command Prompt

2. **PostgreSQL 15.x**
   - Download dari https://www.postgresql.org/download/windows/
   - Password superuser: `PostgresAdmin2024!`
   - Port: `5432` (default)

#### Step 3: Install NXZZ-VComm
```cmd
# Copy semua source code ke direktori kerja
# Jalankan script instalasi
install-windows.bat
```

#### Step 4: Akses Aplikasi
- **Direct Access**: `http://[SERVER-IP]:5000`
- **Via IIS**: `http://[SERVER-IP]` (jika IIS dikonfigurasi)
- **HTTPS**: `https://[SERVER-IP]` (jika SSL dikonfigurasi)

### 👤 Default Credentials

**Super Admin:**
- Username: `superadmin`
- Password: `admin123!!`

**Database:**
- Host: `localhost`
- Port: `5432`
- Database: `nxzz_vcomm`
- Username: `nxzz_user`
- Password: `NxzzSecure2024!`

### 🔧 Management Commands

#### PM2 Application Management
```cmd
pm2 status                 # Status aplikasi
pm2 restart nxzz-vcomm     # Restart aplikasi
pm2 stop nxzz-vcomm        # Stop aplikasi
pm2 start nxzz-vcomm       # Start aplikasi
pm2 logs nxzz-vcomm        # View logs
pm2 monit                  # Real-time monitoring
```

#### Windows Service Management
```cmd
net start NXZZ-VComm       # Start service
net stop NXZZ-VComm        # Stop service
sc query NXZZ-VComm        # Service status
```

#### Database Management
```cmd
# Manual backup
C:\nxzz-vcomm\backup-database.bat

# Connect to database
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Restart PostgreSQL
net stop postgresql-x64-15
net start postgresql-x64-15
```

### 📈 Performance Monitoring

#### Real-time Monitoring
```cmd
# System monitor
windows-monitor.bat

# PM2 monitor
pm2 monit

# Network connections
netstat -an | find ":5000"
```

#### Log Locations
```cmd
# Application logs
C:\nxzz-vcomm\logs\

# PM2 logs
pm2 logs nxzz-vcomm

# PostgreSQL logs
C:\Program Files\PostgreSQL\15\data\log\

# Windows Event Logs
eventvwr.msc
```

### 🔒 Security Configuration

#### Firewall Rules (Auto-configured)
- Port 5000: NXZZ-VComm HTTP
- Port 5432: PostgreSQL
- Port 80: HTTP (jika IIS)
- Port 443: HTTPS (jika SSL)

#### SSL Certificate (Optional)
```cmd
# Self-signed certificate dibuat otomatis
# Location: C:\nxzz-vcomm\certificate.crt
# Password: nxzz2024

# Download untuk mobile:
# http://[SERVER-IP]:5000/certificate.crt
```

### ⚠️ Troubleshooting

#### Common Issues

**1. Aplikasi tidak bisa diakses**
```cmd
# Check firewall
netsh advfirewall show allprofiles

# Check PM2 status
pm2 status

# Restart aplikasi
pm2 restart nxzz-vcomm
```

**2. Database connection error**
```cmd
# Check PostgreSQL service
sc query postgresql-x64-15

# Test connection
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Restart PostgreSQL
net stop postgresql-x64-15 && net start postgresql-x64-15
```

**3. Permission denied errors**
```cmd
# Set permissions
icacls C:\nxzz-vcomm /grant Everyone:(OI)(CI)F

# Run as Administrator
# Klik kanan Command Prompt → Run as administrator
```

**4. High resource usage**
```cmd
# Monitor resources
pm2 monit

# Restart aplikasi
pm2 restart nxzz-vcomm

# Reboot jika perlu
shutdown /r /t 60
```

### 📞 Support

Untuk bantuan lebih lanjut:
1. Jalankan `setup-windows.bat` → pilih option `7` (Troubleshooting)
2. Check log files di `C:\nxzz-vcomm\logs\`
3. Gunakan `windows-monitor.bat` untuk system health check
4. Hubungi tim development dengan informasi sistem dan log error

### 🎯 Production Checklist

- [ ] Windows Updates terinstall
- [ ] Node.js 20.x terinstall dengan PATH
- [ ] PostgreSQL 15.x running dengan password yang benar
- [ ] Firewall rules dikonfigurasi
- [ ] PM2 service running dan auto-start
- [ ] Backup schedule aktif (daily 2 AM)
- [ ] SSL certificate dikonfigurasi (optional)
- [ ] IIS reverse proxy setup (optional)
- [ ] System monitoring berjalan
- [ ] Super admin user dapat login

### 🚀 Ready for 1000+ Users

Script ini telah dioptimasi untuk:
- **High Performance**: Registry dan TCP/IP optimization
- **Auto Scaling**: PM2 clustering support
- **Monitoring**: Real-time performance analytics
- **Backup**: Automated daily database backup
- **Security**: Firewall dan SSL configuration
- **Maintenance**: Automated service management

---

**NXZZ-VComm Windows Deployment - Ready for Military Operations!** 🎖️