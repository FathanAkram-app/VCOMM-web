# Panduan Instalasi NXZZ-VComm di Proxmox VM

## Persyaratan Sistem

### Spesifikasi VM Minimum
- **RAM**: 4GB (8GB untuk >500 users)
- **CPU**: 2 cores (4 cores untuk >500 users)
- **Storage**: 50GB SSD
- **Network**: Bridge ke LAN internal
- **OS**: Ubuntu Server 22.04 LTS

### Untuk 1000+ Users Concurrent
- **RAM**: 16GB
- **CPU**: 8 cores
- **Storage**: 100GB NVMe SSD
- **Network**: Dedicated VLAN

## 1. Pembuatan VM di Proxmox

### Step 1: Create VM
```bash
# Login ke Proxmox Web Interface
# Klik "Create VM"
# General:
VM ID: 100
Name: nxzz-vcomm-server
Resource Pool: (optional)

# OS:
ISO image: ubuntu-22.04.4-live-server-amd64.iso
Type: Linux
Version: 6.x - 2.6 Kernel

# System:
Machine: Default (i440fx)
BIOS: Default (SeaBIOS)
SCSI Controller: VirtIO SCSI
Qemu Agent: Checked

# Hard Disk:
Bus/Device: VirtIO Block
Storage: local-lvm
Disk size: 50GB (atau 100GB untuk production)
Cache: Write back
Discard: Checked

# CPU:
Cores: 4
Type: host

# Memory:
Memory: 8192 MB (8GB)
Minimum memory: 2048 MB

# Network:
Bridge: vmbr0 (sesuaikan dengan network internal)
Model: VirtIO (paravirtualized)
```

### Step 2: Install Ubuntu
1. Start VM dan boot dari ISO
2. Pilih "Install Ubuntu Server"
3. Konfigurasi network dengan IP static
4. Buat user: `nxzz` dengan password yang kuat
5. Install OpenSSH server
6. Tidak perlu install snap packages
7. Reboot setelah instalasi selesai

## 2. Konfigurasi Network

### IP Static Configuration
```bash
# Edit netplan
sudo nano /etc/netplan/00-installer-config.yaml

# Contoh konfigurasi:
network:
  ethernets:
    ens18:
      dhcp4: false
      addresses:
        - 192.168.1.100/24  # Sesuaikan dengan network Anda
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
  version: 2

# Apply configuration
sudo netplan apply
```

## 3. Update System & Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git htop nano ufw fail2ban

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show latest npm
```

## 4. Install PostgreSQL Database

### Install PostgreSQL 15
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE nxzz_vcomm;
CREATE USER nxzz_user WITH ENCRYPTED PASSWORD 'NxzzSecure2024!';
GRANT ALL PRIVILEGES ON DATABASE nxzz_vcomm TO nxzz_user;

# Exit psql
\q

# Configure PostgreSQL for network access
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find and edit:
listen_addresses = '*'  # Allow connections from any IP
max_connections = 200   # Increase for more users

# Configure client authentication
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add line for your network (adjust IP range):
host    nxzz_vcomm      nxzz_user       192.168.1.0/24         md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Test Database Connection
```bash
# Test local connection
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Test from another machine (optional)
psql -h 192.168.1.100 -U nxzz_user -d nxzz_vcomm
```

## 5. Install NXZZ-VComm Application

### Clone Repository
```bash
# Create app directory
sudo mkdir -p /opt/nxzz-vcomm
sudo chown nxzz:nxzz /opt/nxzz-vcomm

# Clone repository (sesuaikan dengan source code Anda)
cd /opt/nxzz-vcomm
git clone <repository-url> .

# Atau copy file dari development machine
# scp -r /path/to/nxzz-vcomm/* nxzz@192.168.1.100:/opt/nxzz-vcomm/
```

### Install Application Dependencies
```bash
cd /opt/nxzz-vcomm

# Install dependencies
npm install

# Install global dependencies
sudo npm install -g tsx drizzle-kit pm2
```

### Configure Environment
```bash
# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env

# Configuration:
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nxzz_user:NxzzSecure2024!@localhost:5432/nxzz_vcomm

# Session secret (generate random string)
SESSION_SECRET=your-super-secret-session-key-here

# App configuration
APP_URL=http://192.168.1.100:5000
REPLIT_DOMAINS=192.168.1.100:5000,localhost:5000
```

### Setup Database Schema
```bash
# Push schema to database
npm run db:push

# Verify tables created
psql -h localhost -U nxzz_user -d nxzz_vcomm -c "\dt"
```

### Build Application
```bash
# Build frontend
npm run build

# Test application
npm run start
```

## 6. Configure Firewall

```bash
# Configure UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow application port
sudo ufw allow 5000/tcp

# Allow PostgreSQL (if accessing from other machines)
sudo ufw allow 5432/tcp

# Check status
sudo ufw status
```

## 7. Setup PM2 Process Manager

### Configure PM2
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js

module.exports = {
  apps: [{
    name: 'nxzz-vcomm',
    script: 'npm',
    args: 'run start',
    cwd: '/opt/nxzz-vcomm',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/nxzz-vcomm/error.log',
    out_file: '/var/log/nxzz-vcomm/out.log',
    log_file: '/var/log/nxzz-vcomm/combined.log',
    time: true
  }]
};

# Create log directory
sudo mkdir -p /var/log/nxzz-vcomm
sudo chown nxzz:nxzz /var/log/nxzz-vcomm
```

### Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions displayed

# Check status
pm2 status
pm2 logs nxzz-vcomm
```

## 8. Configure Reverse Proxy (Optional)

### Install Nginx
```bash
sudo apt install -y nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/nxzz-vcomm

server {
    listen 80;
    server_name 192.168.1.100;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/nxzz-vcomm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# Update UFW for nginx
sudo ufw allow 'Nginx Full'
```

## 9. SSL/HTTPS Configuration (Opsional)

### Generate Self-Signed Certificate
```bash
# Create SSL directory
sudo mkdir -p /etc/ssl/nxzz-vcomm

# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/nxzz-vcomm/private.key \
    -out /etc/ssl/nxzz-vcomm/certificate.crt \
    -subj "/C=ID/ST=Indonesia/L=Jakarta/O=TNI/CN=192.168.1.100"

# Update nginx configuration for HTTPS
sudo nano /etc/nginx/sites-available/nxzz-vcomm

# Add SSL configuration
server {
    listen 443 ssl;
    server_name 192.168.1.100;

    ssl_certificate /etc/ssl/nxzz-vcomm/certificate.crt;
    ssl_certificate_key /etc/ssl/nxzz-vcomm/private.key;

    # ... rest of configuration
}

# Reload nginx
sudo systemctl reload nginx

# Update firewall
sudo ufw allow 443/tcp
```

## 10. User Management & Testing

### Create Super Admin User
```bash
# Connect to database
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Insert super admin user
INSERT INTO users (id, callsign, nrp, password, first_name, last_name, rank, branch, role, is_enabled) 
VALUES ('superadmin', 'superadmin', 'SA001', '$2a$10$encrypted_password_hash', 'Super', 'Admin', 'JENDERAL TNI', 'TNI AD', 'super_admin', true);

\q

# Atau gunakan script registrasi melalui web interface
```

### Access Application
1. Buka browser ke `http://192.168.1.100` (atau `https://192.168.1.100` jika menggunakan SSL)
2. Register user pertama atau login dengan super admin
3. Test chat, call, dan fitur lainnya

## 11. Monitoring & Maintenance

### System Monitoring
```bash
# Check application status
pm2 status
pm2 logs nxzz-vcomm

# Check database
sudo systemctl status postgresql
psql -h localhost -U nxzz_user -d nxzz_vcomm -c "SELECT COUNT(*) FROM users;"

# Check system resources
htop
df -h
free -h

# Check network connections
netstat -tlnp | grep :5000
```

### Backup Database
```bash
# Create backup script
nano /home/nxzz/backup-db.sh

#!/bin/bash
BACKUP_DIR="/home/nxzz/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U nxzz_user -d nxzz_vcomm > $BACKUP_DIR/nxzz_vcomm_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "nxzz_vcomm_*.sql" -mtime +7 -delete

chmod +x /home/nxzz/backup-db.sh

# Add to crontab for daily backup
crontab -e
# Add line:
0 2 * * * /home/nxzz/backup-db.sh
```

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/nxzz-vcomm

/var/log/nxzz-vcomm/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 nxzz nxzz
    postrotate
        pm2 reload nxzz-vcomm
    endscript
}
```

## 12. Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
pm2 logs nxzz-vcomm
journalctl -u nginx

# Check ports
sudo netstat -tlnp | grep :5000
```

**Database connection issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U nxzz_user -d nxzz_vcomm

# Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

**Network/WebSocket issues:**
```bash
# Check firewall
sudo ufw status

# Test WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" -H "Sec-WebSocket-Version: 13" http://192.168.1.100:5000/ws
```

## 13. Performance Optimization

### For 1000+ Users
```bash
# Update PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf

# Optimize for high load:
max_connections = 500
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 4MB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Restart PostgreSQL
sudo systemctl restart postgresql

# Update PM2 for clustering
nano ecosystem.config.js
# Change instances: 'max' or number of CPU cores

pm2 reload ecosystem.config.js
```

### System Optimization
```bash
# Increase file descriptors
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize network
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

## Selesai!

Setelah mengikuti panduan ini, NXZZ-VComm akan berjalan di Proxmox VM dengan:
- ✅ PostgreSQL database yang secure dan optimized
- ✅ PM2 process manager untuk stability
- ✅ Nginx reverse proxy (optional)
- ✅ SSL/HTTPS support (optional)
- ✅ Firewall configuration
- ✅ Backup system
- ✅ Monitoring tools

**Akses aplikasi:** `http://192.168.1.100` atau `https://192.168.1.100`

**Default super admin:** `superadmin` / `admin123!!`

Untuk bantuan lebih lanjut, periksa log di `/var/log/nxzz-vcomm/` dan gunakan `pm2 logs nxzz-vcomm`.