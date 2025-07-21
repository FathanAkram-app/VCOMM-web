# Panduan Instalasi NXZZ-VComm di Windows Server

## Persyaratan Sistem

### Spesifikasi Minimum
- **OS**: Windows Server 2019/2022 atau Windows 10/11 Pro
- **RAM**: 8GB (16GB untuk >500 users)
- **CPU**: 4 cores (8 cores untuk >500 users)
- **Storage**: 100GB SSD
- **Network**: Static IP dalam LAN internal

### Untuk 1000+ Users Concurrent
- **RAM**: 32GB
- **CPU**: 16 cores
- **Storage**: 200GB NVMe SSD
- **Network**: Dedicated VLAN dengan bandwidth tinggi

## 1. Persiapan Windows Server

### Setup Static IP
```cmd
# Buka Command Prompt sebagai Administrator
# Lihat network interface
netsh interface show interface

# Set static IP (sesuaikan dengan nama interface)
netsh interface ip set address "Ethernet" static 192.168.1.100 255.255.255.0 192.168.1.1

# Set DNS
netsh interface ip set dns "Ethernet" static 8.8.8.8
netsh interface ip add dns "Ethernet" 8.8.4.4 index=2
```

### Disable Windows Firewall (untuk LAN internal)
```cmd
# Disable firewall untuk domain, private, dan public
netsh advfirewall set allprofiles state off

# Atau konfigurasi port specific jika tetap ingin firewall aktif
netsh advfirewall firewall add rule name="NXZZ-VComm" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

### Install Windows Features
```powershell
# Jalankan PowerShell sebagai Administrator
# Enable IIS jika diperlukan untuk reverse proxy
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebSockets
```

## 2. Install PostgreSQL Database

### Download dan Install PostgreSQL
1. Download PostgreSQL 15.x dari: https://www.postgresql.org/download/windows/
2. Jalankan installer sebagai Administrator
3. Konfigurasi instalasi:
   - Port: 5432 (default)
   - Password untuk superuser 'postgres': `PostgresAdmin2024!`
   - Locale: Default

### Konfigurasi PostgreSQL
```cmd
# Buka Command Prompt di folder PostgreSQL (biasanya C:\Program Files\PostgreSQL\15\bin)
cd "C:\Program Files\PostgreSQL\15\bin"

# Login ke PostgreSQL
psql -U postgres

# Buat database dan user
CREATE DATABASE nxzz_vcomm;
CREATE USER nxzz_user WITH ENCRYPTED PASSWORD 'NxzzSecure2024!';
GRANT ALL PRIVILEGES ON DATABASE nxzz_vcomm TO nxzz_user;
ALTER USER nxzz_user CREATEDB;
\q
```

### Konfigurasi Network Access
```cmd
# Edit postgresql.conf
notepad "C:\Program Files\PostgreSQL\15\data\postgresql.conf"

# Tambahkan/ubah:
listen_addresses = '*'
max_connections = 200
shared_buffers = 256MB

# Edit pg_hba.conf
notepad "C:\Program Files\PostgreSQL\15\data\pg_hba.conf"

# Tambahkan di bagian bawah (sesuaikan IP range):
host    nxzz_vcomm      nxzz_user       192.168.1.0/24         md5
host    all             all             127.0.0.1/32           md5

# Restart PostgreSQL service
net stop postgresql-x64-15
net start postgresql-x64-15
```

## 3. Install Node.js dan Dependencies

### Install Node.js
1. Download Node.js 20.x LTS dari: https://nodejs.org/
2. Jalankan installer dengan opsi "Add to PATH"
3. Restart Command Prompt setelah instalasi

### Verify Installation
```cmd
node --version
npm --version
```

### Install Global Dependencies
```cmd
npm install -g tsx pm2 drizzle-kit
```

## 4. Setup NXZZ-VComm Application

### Create Application Directory
```cmd
mkdir C:\nxzz-vcomm
cd C:\nxzz-vcomm
```

### Copy Source Code
```cmd
# Copy semua file source code ke C:\nxzz-vcomm
# Pastikan struktur folder:
# C:\nxzz-vcomm\
#   ├── client\
#   ├── server\
#   ├── shared\
#   ├── package.json
#   └── ...
```

### Install Dependencies
```cmd
cd C:\nxzz-vcomm
npm install
```

### Configure Environment
```cmd
# Buat file .env
notepad .env

# Isi dengan:
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nxzz_user:NxzzSecure2024!@localhost:5432/nxzz_vcomm

# Session secret (generate random string)
SESSION_SECRET=your-super-secret-session-key-here-make-it-very-long-and-random

# App configuration
APP_URL=http://192.168.1.100:5000
REPLIT_DOMAINS=192.168.1.100:5000,localhost:5000
```

### Setup Database Schema
```cmd
cd C:\nxzz-vcomm
npm run db:push
```

### Build Application
```cmd
npm run build
```

## 5. Configure PM2 Process Manager

### Create PM2 Configuration
```cmd
notepad ecosystem.config.js

# Isi dengan:
module.exports = {
  apps: [{
    name: 'nxzz-vcomm',
    script: 'npm',
    args: 'run start',
    cwd: 'C:\\nxzz-vcomm',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'C:\\nxzz-vcomm\\logs\\error.log',
    out_file: 'C:\\nxzz-vcomm\\logs\\out.log',
    log_file: 'C:\\nxzz-vcomm\\logs\\combined.log',
    time: true
  }]
};
```

### Create Log Directory
```cmd
mkdir C:\nxzz-vcomm\logs
```

### Start Application
```cmd
cd C:\nxzz-vcomm
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 6. Setup Windows Service (Optional)

### Install PM2 as Windows Service
```cmd
# Install pm2-windows-service
npm install -g pm2-windows-service

# Install service
pm2-service-install -n NXZZ-VComm

# Start service
net start NXZZ-VComm
```

### Configure Service Auto-Start
```cmd
# Set service to start automatically
sc config NXZZ-VComm start= auto
```

## 7. Configure IIS Reverse Proxy (Optional)

### Install URL Rewrite dan ARR
1. Download dan install URL Rewrite: https://www.iis.net/downloads/microsoft/url-rewrite
2. Download dan install Application Request Routing: https://www.iis.net/downloads/microsoft/application-request-routing

### Configure IIS Site
```xml
<!-- web.config untuk reverse proxy -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyInboundRule1" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:5000/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_ORIGINAL_ACCEPT_ENCODING" value="{HTTP_ACCEPT_ENCODING}" />
                        <set name="HTTP_ACCEPT_ENCODING" value="" />
                    </serverVariables>
                </rule>
            </rules>
            <outboundRules>
                <rule name="ReverseProxyOutboundRule1" preCondition="ResponseIsHtml1">
                    <match filterByTags="A, Form, Img" pattern="^http(s)?://localhost:5000/(.*)" />
                    <action type="Rewrite" value="http{R:1}://192.168.1.100/{R:2}" />
                </rule>
                <preConditions>
                    <preCondition name="ResponseIsHtml1">
                        <add input="{RESPONSE_CONTENT_TYPE}" pattern="^text/html" />
                    </preCondition>
                </preConditions>
            </outboundRules>
        </rewrite>
        <webSocket enabled="true" />
    </system.webServer>
</configuration>
```

## 8. SSL/HTTPS Configuration

### Generate Self-Signed Certificate
```powershell
# Jalankan PowerShell sebagai Administrator
# Generate certificate
$cert = New-SelfSignedCertificate -DnsName "192.168.1.100", "localhost" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)

# Export certificate untuk mobile devices
$pwd = ConvertTo-SecureString -String "nxzz2024" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "C:\nxzz-vcomm\certificate.pfx" -Password $pwd
Export-Certificate -Cert $cert -FilePath "C:\nxzz-vcomm\certificate.crt"
```

### Configure HTTPS in IIS
1. Buka IIS Manager
2. Pilih Default Web Site
3. Klik "Bindings" di Actions panel
4. Add binding untuk HTTPS port 443
5. Pilih certificate yang baru dibuat

## 9. Create Super Admin User

### Using Command Line
```cmd
cd C:\nxzz-vcomm

# Connect to database dan insert super admin
psql -h localhost -U nxzz_user -d nxzz_vcomm

INSERT INTO users (id, callsign, nrp, password, first_name, last_name, rank, branch, role, is_enabled, created_at, updated_at) 
VALUES ('superadmin', 'superadmin', 'SA001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'JENDERAL TNI', 'TNI AD', 'super_admin', true, NOW(), NOW());

\q
```

## 10. Backup dan Maintenance

### Create Backup Script
```cmd
notepad backup-database.bat

@echo off
set BACKUP_DIR=C:\nxzz-vcomm\backups
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set DATE=%DATE: =0%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -h localhost -U nxzz_user -d nxzz_vcomm > %BACKUP_DIR%\nxzz_vcomm_%DATE%.sql

echo Backup completed: %BACKUP_DIR%\nxzz_vcomm_%DATE%.sql

# Hapus backup lama (lebih dari 7 hari)
forfiles /p %BACKUP_DIR% /s /m *.sql /d -7 /c "cmd /c del @path"
```

### Schedule Backup
```cmd
# Buat scheduled task untuk backup harian jam 2 pagi
schtasks /create /tn "NXZZ-VComm Backup" /tr "C:\nxzz-vcomm\backup-database.bat" /sc daily /st 02:00 /ru SYSTEM
```

## 11. Monitoring Scripts

### System Monitor
```cmd
notepad monitor-system.bat

@echo off
echo ================================================================
echo           NXZZ-VComm System Monitor
echo ================================================================
echo.

echo Service Status:
sc query NXZZ-VComm
echo.

echo PostgreSQL Status:
sc query postgresql-x64-15
echo.

echo PM2 Status:
pm2 status
echo.

echo Network Connections:
netstat -an | find ":5000"
echo.

echo System Resources:
wmic cpu get loadpercentage /value
wmic OS get TotalVirtualMemorySize,TotalVisibleMemorySize,FreePhysicalMemory /value
echo.

echo Database Connection Test:
psql -h localhost -U nxzz_user -d nxzz_vcomm -c "SELECT COUNT(*) as active_users FROM users WHERE is_enabled = true;"
```

## 12. Performance Optimization untuk 1000+ Users

### System Configuration
```cmd
# Increase TCP connection limits
netsh int ipv4 set dynamicport tcp start=1024 num=64511
netsh int ipv6 set dynamicport tcp start=1024 num=64511

# Configure PostgreSQL for high load
notepad "C:\Program Files\PostgreSQL\15\data\postgresql.conf"

# Recommended settings:
max_connections = 500
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 4MB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### PM2 Clustering
```javascript
// Update ecosystem.config.js untuk clustering
module.exports = {
  apps: [{
    name: 'nxzz-vcomm',
    script: 'npm',
    args: 'run start',
    instances: 'max', // Gunakan semua CPU cores
    exec_mode: 'cluster',
    // ... konfigurasi lainnya
  }]
};
```

## 13. Security Configuration

### Windows Security
```cmd
# Disable unnecessary services
sc config "Themes" start= disabled
sc config "Windows Search" start= disabled
sc config "Print Spooler" start= disabled

# Configure Windows Defender exclusions
powershell Add-MpPreference -ExclusionPath "C:\nxzz-vcomm"
powershell Add-MpPreference -ExclusionPath "C:\Program Files\PostgreSQL"
```

### Database Security
```sql
-- Restrict database access
ALTER USER nxzz_user SET default_transaction_isolation = 'read committed';
ALTER USER nxzz_user SET timezone = 'Asia/Jakarta';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO nxzz_user;
```

## 14. Troubleshooting

### Common Issues

**Application tidak start:**
```cmd
# Check PM2 logs
pm2 logs nxzz-vcomm

# Check Windows Event Log
eventvwr.msc

# Check if port is in use
netstat -ano | findstr :5000
```

**Database connection error:**
```cmd
# Test PostgreSQL connection
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Check PostgreSQL logs
notepad "C:\Program Files\PostgreSQL\15\data\log\postgresql-*.log"
```

**Performance issues:**
```cmd
# Check system resources
perfmon.msc

# Check database performance
psql -h localhost -U nxzz_user -d nxzz_vcomm -c "SELECT * FROM pg_stat_activity;"
```

## 15. Access Information

Setelah instalasi selesai:

**URL Aplikasi:**
- Direct: `http://192.168.1.100:5000`
- Via IIS: `http://192.168.1.100` atau `https://192.168.1.100`

**Super Admin Credentials:**
- Username: `superadmin`
- Password: `admin123!!`

**Database Access:**
- Host: `localhost` atau `192.168.1.100`
- Port: `5432`
- Database: `nxzz_vcomm`
- Username: `nxzz_user`
- Password: `NxzzSecure2024!`

## 16. Maintenance Commands

```cmd
# Start/Stop services
net start NXZZ-VComm
net stop NXZZ-VComm
net start postgresql-x64-15
net stop postgresql-x64-15

# PM2 commands
pm2 restart nxzz-vcomm
pm2 stop nxzz-vcomm
pm2 logs nxzz-vcomm
pm2 monit

# Manual backup
C:\nxzz-vcomm\backup-database.bat

# System monitoring
C:\nxzz-vcomm\monitor-system.bat
```

---

**SELESAI!** NXZZ-VComm sekarang running di Windows Server dan siap untuk deployment production dengan kapasitas 1000+ concurrent users.

Untuk mobile access, users bisa install certificate.crt untuk HTTPS atau langsung akses via HTTP jika dalam jaringan internal yang aman.