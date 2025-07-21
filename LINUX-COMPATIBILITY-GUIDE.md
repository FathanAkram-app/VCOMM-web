# NXZZ-VComm Linux Compatibility Guide

## Distribusi Linux yang Didukung

### ✅ Fully Supported (Tested)
| Distribusi | Version | Package Manager | Script |
|------------|---------|-----------------|--------|
| **Ubuntu** | 18.04, 20.04, 22.04, 24.04 | apt | install-linux-universal.sh |
| **Debian** | 10, 11, 12 | apt | install-linux-universal.sh |
| **CentOS** | 7, 8, 9 | yum/dnf | install-linux-universal.sh |
| **RHEL** | 8, 9 | yum/dnf | install-linux-universal.sh |
| **Rocky Linux** | 8, 9 | dnf | install-linux-universal.sh |
| **AlmaLinux** | 8, 9 | dnf | install-linux-universal.sh |
| **Fedora** | 36, 37, 38, 39 | dnf | install-linux-universal.sh |
| **Proxmox VE** | 7.x, 8.x | apt (Debian-based) | install-proxmox.sh |

### 🔶 Supported (Auto-detection)
| Distribusi | Version | Package Manager | Notes |
|------------|---------|-----------------|-------|
| **Arch Linux** | Rolling | pacman | install-linux-universal.sh |
| **Manjaro** | Rolling | pacman | install-linux-universal.sh |
| **openSUSE** | Leap, Tumbleweed | zypper | install-linux-universal.sh |
| **SLES** | 15+ | zypper | install-linux-universal.sh |

## Script Mapping berdasarkan Environment

### 1. **Proxmox Virtual Environment**
```bash
# Gunakan script khusus Proxmox
wget -O install-proxmox.sh https://raw.githubusercontent.com/your-repo/install-proxmox.sh
chmod +x install-proxmox.sh
sudo ./install-proxmox.sh
```

### 2. **Linux Server/Desktop Generic**
```bash
# Gunakan script universal Linux
wget -O install-linux-universal.sh https://raw.githubusercontent.com/your-repo/install-linux-universal.sh
chmod +x install-linux-universal.sh
sudo ./install-linux-universal.sh
```

### 3. **Windows Server/Desktop**
```cmd
REM Download dan jalankan setup-windows.bat
setup-windows.bat
```

## Fitur Script berdasarkan Platform

### **install-proxmox.sh** (Proxmox Specific)
- ✅ Proxmox container optimization
- ✅ VM resource management
- ✅ Proxmox backup integration
- ✅ Cluster-aware networking
- ✅ Proxmox-specific monitoring
- ✅ ZFS storage optimization

### **install-linux-universal.sh** (Generic Linux)
- ✅ Multi-distro package manager detection
- ✅ Automatic OS version detection
- ✅ Universal firewall configuration
- ✅ Standard service management
- ✅ Generic system optimization
- ✅ Cross-distro compatibility

### **setup-windows.bat** (Windows)
- ✅ Windows Service integration
- ✅ IIS reverse proxy setup
- ✅ Registry optimization
- ✅ Windows-specific monitoring
- ✅ Task Scheduler integration
- ✅ PowerShell automation

## Quick Start berdasarkan OS

### Ubuntu/Debian (termasuk Proxmox)
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Proxmox VE
curl -sSL https://raw.githubusercontent.com/your-repo/install-proxmox.sh | sudo bash

# Ubuntu/Debian Server
curl -sSL https://raw.githubusercontent.com/your-repo/install-linux-universal.sh | sudo bash
```

### CentOS/RHEL/Rocky/Alma
```bash
# Update sistem
sudo yum update -y  # atau dnf update -y

# Install NXZZ-VComm
curl -sSL https://raw.githubusercontent.com/your-repo/install-linux-universal.sh | sudo bash
```

### Fedora
```bash
# Update sistem
sudo dnf update -y

# Install NXZZ-VComm
curl -sSL https://raw.githubusercontent.com/your-repo/install-linux-universal.sh | sudo bash
```

### Arch Linux
```bash
# Update sistem
sudo pacman -Syu

# Install NXZZ-VComm
curl -sSL https://raw.githubusercontent.com/your-repo/install-linux-universal.sh | sudo bash
```

## Perbedaan Konfigurasi per Distro

### Package Managers
| Distro | Package Manager | Service Manager | Firewall |
|--------|----------------|-----------------|----------|
| Ubuntu/Debian | apt | systemd | ufw |
| CentOS/RHEL | yum/dnf | systemd | firewalld |
| Fedora | dnf | systemd | firewalld |
| Arch | pacman | systemd | iptables |
| openSUSE | zypper | systemd | SuSEfirewall2 |

### Service Names
| Service | Ubuntu/Debian | CentOS/RHEL | Arch |
|---------|---------------|-------------|------|
| PostgreSQL | postgresql | postgresql | postgresql |
| Nginx | nginx | nginx | nginx |
| Node.js | nodejs | nodejs | nodejs |

## Instalasi Manual (jika script otomatis gagal)

### Step 1: Install Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl wget git build-essential nginx postgresql postgresql-contrib

# CentOS/RHEL
sudo yum groupinstall -y "Development Tools"
sudo yum install -y curl wget git nginx postgresql postgresql-server postgresql-contrib

# Arch
sudo pacman -S --noconfirm curl wget git base-devel nginx postgresql
```

### Step 2: Install Node.js 20.x
```bash
# Semua distro (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -  # Debian/Ubuntu
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -     # CentOS/RHEL
sudo pacman -S nodejs npm  # Arch
```

### Step 3: Setup PostgreSQL
```bash
# Ubuntu/Debian
sudo systemctl enable --now postgresql

# CentOS/RHEL
sudo postgresql-setup initdb
sudo systemctl enable --now postgresql

# Arch
sudo -u postgres initdb -D /var/lib/postgres/data
sudo systemctl enable --now postgresql
```

### Step 4: Create Database
```bash
sudo -u postgres psql << EOF
CREATE DATABASE nxzz_vcomm;
CREATE USER nxzz_user WITH ENCRYPTED PASSWORD 'NxzzSecure2024!';
GRANT ALL PRIVILEGES ON DATABASE nxzz_vcomm TO nxzz_user;
ALTER USER nxzz_user CREATEDB;
EOF
```

### Step 5: Install NXZZ-VComm
```bash
# Buat direktori aplikasi
sudo mkdir -p /opt/nxzz-vcomm
sudo chown $USER:$USER /opt/nxzz-vcomm

# Copy source code ke /opt/nxzz-vcomm
# Install dependencies
cd /opt/nxzz-vcomm
npm install

# Setup environment
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nxzz_user:NxzzSecure2024!@localhost:5432/nxzz_vcomm
SESSION_SECRET=$(openssl rand -base64 32)
APP_URL=http://$(hostname -I | awk '{print $1}'):5000
REPLIT_DOMAINS=$(hostname -I | awk '{print $1}'):5000,localhost:5000
EOF

# Build dan start
npm run db:push
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Monitoring dan Management

### Semua Distro (systemd)
```bash
# Status services
systemctl status postgresql
systemctl status nginx
pm2 status

# Logs
journalctl -u postgresql -f
journalctl -u nginx -f
pm2 logs nxzz-vcomm

# Restart services
systemctl restart postgresql
systemctl restart nginx
pm2 restart nxzz-vcomm
```

## Troubleshooting per Distro

### Ubuntu/Debian
```bash
# PostgreSQL connection issues
sudo -u postgres psql -c "SELECT version();"
sudo systemctl status postgresql

# Port issues
sudo ufw status
sudo ufw allow 5000/tcp

# Permission issues
sudo chown -R www-data:www-data /opt/nxzz-vcomm
```

### CentOS/RHEL
```bash
# SELinux issues
sestatus
sudo setsebool -P httpd_can_network_connect 1

# Firewall issues
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

### Arch Linux
```bash
# Service issues
sudo systemctl enable --now postgresql
sudo -u postgres initdb -D /var/lib/postgres/data

# Package issues
sudo pacman -S base-devel
```

## Performance Tuning per Environment

### High-Load Configuration (1000+ users)
```bash
# PostgreSQL tuning
sudo vim /etc/postgresql/*/main/postgresql.conf
# max_connections = 500
# shared_buffers = 2GB
# effective_cache_size = 6GB

# System limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Nginx tuning
# worker_processes auto;
# worker_connections 4096;
```

## Kesimpulan

**Ya, script Proxmox bisa digunakan di Linux lain!** Script yang saya buat untuk Proxmox sebenarnya adalah script Linux standar yang kompatibel dengan berbagai distribusi. 

**Rekomendasi:**
- **Proxmox VE**: Gunakan `install-proxmox.sh` untuk optimasi khusus Proxmox
- **Ubuntu/Debian Server**: Gunakan `install-linux-universal.sh`
- **CentOS/RHEL/Rocky**: Gunakan `install-linux-universal.sh`
- **Windows Server**: Gunakan `setup-windows.bat`

Semua script memiliki auto-detection dan fallback untuk memastikan kompatibilitas maksimal.