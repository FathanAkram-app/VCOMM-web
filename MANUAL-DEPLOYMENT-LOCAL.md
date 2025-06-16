# Manual Deployment VCommMessenger - Server Lokal

## Persiapan Server

### 1. Minimum Requirements Server
```
Hardware:
- CPU: 4 cores (8 cores recommended untuk 1000 users)
- RAM: 16 GB (32 GB recommended)
- Storage: 100 GB SSD
- Network: Gigabit Ethernet

Operating System:
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- Windows Server 2019+ (dengan WSL2)
```

### 2. Install Dependencies

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install tools
sudo apt install -y git curl nano htop
```

**CentOS/RHEL:**
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install tools
sudo yum install -y git curl nano htop
```

## Download dan Setup Aplikasi

### 1. Clone Repository
```bash
# Download aplikasi (ganti dengan URL repository Anda)
git clone https://github.com/your-repo/vcomm-messenger.git
cd vcomm-messenger

# Atau jika Anda upload manual
mkdir vcomm-messenger
cd vcomm-messenger
# Upload semua file project ke folder ini
```

### 2. Setup Network Configuration
```bash
# Cek IP server Anda
ip addr show

# Contoh output: 192.168.1.100
# Gunakan IP ini untuk akses dari mobile

# Edit hosts file untuk domain lokal
sudo nano /etc/hosts

# Tambahkan baris ini (ganti dengan IP server Anda):
192.168.1.100 vcomm.local
```

### 3. Konfigurasi Firewall
```bash
# Ubuntu/Debian (UFW)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp

# CentOS/RHEL (Firewalld)
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## Deployment Otomatis

### 1. Jalankan Script Deployment
```bash
# Buat script executable
chmod +x deploy-local.sh

# Jalankan deployment (ganti IP dengan IP server Anda)
./deploy-local.sh 192.168.1.100
```

Script ini akan otomatis:
- Install Docker jika belum ada
- Generate HTTPS certificates
- Setup database
- Start semua services
- Konfigurasi nginx

### 2. Verifikasi Deployment
```bash
# Cek status containers
docker-compose ps

# Harusnya terlihat semua running:
# vcomm-app
# vcomm-postgres  
# vcomm-nginx
# vcomm-redis
```

## Deployment Manual (Jika Script Bermasalah)

### 1. Buat Environment File
```bash
nano .env.production

# Isi dengan:
NODE_ENV=production
DATABASE_URL=postgresql://vcomm_user:password123@postgres:5432/vcomm_db
SESSION_SECRET=your-session-secret-here
HTTPS_ENABLED=true
MAX_CONNECTIONS=1000
```

### 2. Generate HTTPS Certificates
```bash
mkdir -p certs

# Generate private key
openssl genrsa -out certs/server.key 2048

# Create certificate config
cat > certs/server.conf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = vcomm.local

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = vcomm.local
DNS.2 = localhost
IP.1 = 192.168.1.100
IP.2 = 127.0.0.1
EOF

# Generate certificate
openssl req -new -x509 -sha256 -key certs/server.key -out certs/server.crt -days 365 -config certs/server.conf
```

### 3. Start Services Manual
```bash
# Start database first
docker-compose -f docker-compose.local.yml up -d postgres redis

# Wait for database to be ready
sleep 30

# Start application
docker-compose -f docker-compose.local.yml up -d vcomm-app

# Start nginx
docker-compose -f docker-compose.local.yml up -d nginx

# Setup database schema
docker-compose -f docker-compose.local.yml exec vcomm-app npm run db:push
```

## Verifikasi dan Testing

### 1. Test dari Server
```bash
# Test HTTP
curl http://localhost:5000/api/health

# Test HTTPS
curl -k https://vcomm.local/api/health

# Should return: {"status":"ok"}
```

### 2. Test dari Mobile
```bash
# Dari HP, buka browser dan akses:
https://vcomm.local

# Atau langsung ke IP:
https://192.168.1.100:5000
```

### 3. Monitor Logs
```bash
# Lihat semua logs
docker-compose logs -f

# Lihat log aplikasi saja
docker-compose logs -f vcomm-app

# Lihat log database
docker-compose logs -f postgres
```

## Management Aplikasi

### 1. Start/Stop Services
```bash
# Start semua services
docker-compose -f docker-compose.local.yml up -d

# Stop semua services
docker-compose -f docker-compose.local.yml down

# Restart aplikasi saja
docker-compose -f docker-compose.local.yml restart vcomm-app

# Restart semua
docker-compose -f docker-compose.local.yml restart
```

### 2. Update Aplikasi
```bash
# Stop aplikasi
docker-compose -f docker-compose.local.yml down

# Update code (git pull atau upload file baru)
git pull origin main

# Rebuild dan start
docker-compose -f docker-compose.local.yml up -d --build

# Apply database changes
docker-compose -f docker-compose.local.yml exec vcomm-app npm run db:push
```

### 3. Backup Database
```bash
# Create backup
docker exec vcomm-postgres pg_dump -U vcomm_user vcomm_db > backup-$(date +%Y%m%d).sql

# Restore backup
docker exec -i vcomm-postgres psql -U vcomm_user vcomm_db < backup-20241216.sql
```

### 4. Monitoring
```bash
# Resource usage
docker stats

# System resources
htop

# Disk usage
df -h

# Check logs for errors
docker-compose logs --tail=100 | grep -i error
```

## Troubleshooting

### 1. Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :443

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:5000)
```

### 2. Permission Issues
```bash
# Fix Docker permissions
sudo chown -R $USER:$USER /var/run/docker.sock

# Fix file permissions
sudo chown -R $USER:$USER ./vcomm-messenger
chmod +x deploy-local.sh
```

### 3. Certificate Issues
```bash
# Regenerate certificates
rm -rf certs/
./deploy-local.sh regenerate-certs

# Test certificate
openssl x509 -in certs/server.crt -text -noout
```

### 4. Database Issues
```bash
# Reset database
docker-compose down
docker volume rm vcomm_postgres_data
docker-compose up -d
```

## Mobile User Instructions

Setelah server running, berikan instruksi ini ke users:

### Android Users:
1. Connect ke WiFi yang sama dengan server
2. Buka Chrome, ketik: `https://vcomm.local`
3. Tap "Advanced" → "Proceed to vcomm.local"
4. Tap menu → "Add to Home Screen"
5. Allow microphone/camera permissions

### iOS Users:
1. Connect ke WiFi yang sama dengan server
2. Buka Safari, ketik: `https://vcomm.local`
3. Tap "Advanced" → "Continue"
4. Tap Share → "Add to Home Screen"
5. Allow microphone permissions in Settings

Server siap digunakan untuk 1000+ mobile users dengan performa optimal!