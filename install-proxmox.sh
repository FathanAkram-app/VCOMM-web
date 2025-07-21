#!/bin/bash

# NXZZ-VComm Auto Installation Script for Proxmox VM
# Author: NXZZ Development Team
# Compatible with: Ubuntu 22.04 LTS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "Script tidak boleh dijalankan sebagai root. Gunakan user biasa dengan sudo privileges."
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    error "sudo diperlukan untuk instalasi ini."
fi

# Configuration variables
APP_DIR="/opt/nxzz-vcomm"
LOG_DIR="/var/log/nxzz-vcomm"
DB_NAME="nxzz_vcomm"
DB_USER="nxzz_user"
DB_PASSWORD="NxzzSecure2024!"
APP_PORT="5000"

echo -e "${BLUE}"
echo "================================================================"
echo "           NXZZ-VComm Installation Script"
echo "           Military Communication Platform"
echo "================================================================"
echo -e "${NC}"

# Get server IP
read -p "Masukkan IP Address server ini (contoh: 192.168.1.100): " SERVER_IP
if [[ -z "$SERVER_IP" ]]; then
    error "IP Address tidak boleh kosong!"
fi

# Validate IP format
if ! [[ $SERVER_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Format IP Address tidak valid!"
fi

read -p "Apakah Anda ingin menginstal Nginx reverse proxy? (y/n): " INSTALL_NGINX
read -p "Apakah Anda ingin mengaktifkan SSL/HTTPS? (y/n): " ENABLE_SSL

log "Memulai instalasi NXZZ-VComm..."

# 1. Update system
log "Memperbarui sistem..."
sudo apt update && sudo apt upgrade -y

# 2. Install essential packages
log "Menginstal paket-paket penting..."
sudo apt install -y curl wget git htop nano ufw fail2ban unzip

# 3. Install Node.js 20.x
log "Menginstal Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

node_version=$(node --version)
log "Node.js berhasil diinstal: $node_version"

# 4. Install PostgreSQL
log "Menginstal PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 5. Configure PostgreSQL
log "Mengkonfigurasi PostgreSQL..."

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# Configure PostgreSQL for network access
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/max_connections = 100/max_connections = 200/" /etc/postgresql/*/main/postgresql.conf

# Add client authentication
echo "host    $DB_NAME      $DB_USER       0.0.0.0/0         md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# 6. Create application directory
log "Membuat direktori aplikasi..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 7. Check if source code exists
if [ ! -f "package.json" ]; then
    warning "Source code tidak ditemukan di direktori saat ini."
    read -p "Masukkan path ke source code NXZZ-VComm: " SOURCE_PATH
    if [ ! -d "$SOURCE_PATH" ]; then
        error "Path source code tidak valid!"
    fi
    cp -r $SOURCE_PATH/* $APP_DIR/
else
    log "Menyalin source code ke direktori aplikasi..."
    cp -r . $APP_DIR/
fi

cd $APP_DIR

# 8. Install application dependencies
log "Menginstal dependencies aplikasi..."
npm install

# Install global dependencies
sudo npm install -g tsx drizzle-kit pm2

# 9. Configure environment
log "Mengkonfigurasi environment..."
cat > .env << EOF
NODE_ENV=production
PORT=$APP_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Session secret (generate random string)
SESSION_SECRET=$(openssl rand -base64 32)

# App configuration
APP_URL=http://$SERVER_IP:$APP_PORT
REPLIT_DOMAINS=$SERVER_IP:$APP_PORT,localhost:$APP_PORT
EOF

# 10. Setup database schema
log "Menyiapkan schema database..."
npm run db:push

# 11. Build application
log "Building aplikasi..."
npm run build

# 12. Configure firewall
log "Mengkonfigurasi firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow $APP_PORT/tcp
sudo ufw allow 5432/tcp

# 13. Create log directory
sudo mkdir -p $LOG_DIR
sudo chown $USER:$USER $LOG_DIR

# 14. Setup PM2
log "Mengkonfigurasi PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nxzz-vcomm',
    script: 'npm',
    args: 'run start',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/out.log',
    log_file: '$LOG_DIR/combined.log',
    time: true
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | sudo bash

# 15. Install Nginx if requested
if [[ $INSTALL_NGINX == "y" || $INSTALL_NGINX == "Y" ]]; then
    log "Menginstal Nginx..."
    sudo apt install -y nginx
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/nxzz-vcomm > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/nxzz-vcomm /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    # Update firewall
    sudo ufw allow 'Nginx Full'
fi

# 16. Setup SSL if requested
if [[ $ENABLE_SSL == "y" || $ENABLE_SSL == "Y" ]]; then
    log "Mengkonfigurasi SSL/HTTPS..."
    
    # Create SSL directory
    sudo mkdir -p /etc/ssl/nxzz-vcomm
    
    # Generate self-signed certificate
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/nxzz-vcomm/private.key \
        -out /etc/ssl/nxzz-vcomm/certificate.crt \
        -subj "/C=ID/ST=Indonesia/L=Jakarta/O=TNI/CN=$SERVER_IP"
    
    if [[ $INSTALL_NGINX == "y" || $INSTALL_NGINX == "Y" ]]; then
        # Update nginx configuration for HTTPS
        sudo tee /etc/nginx/sites-available/nxzz-vcomm > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $SERVER_IP;

    ssl_certificate /etc/ssl/nxzz-vcomm/certificate.crt;
    ssl_certificate_key /etc/ssl/nxzz-vcomm/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
        
        sudo nginx -t && sudo systemctl reload nginx
        sudo ufw allow 443/tcp
    fi
fi

# 17. Create backup script
log "Membuat script backup..."
cat > /home/$USER/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U nxzz_user -d nxzz_vcomm > $BACKUP_DIR/nxzz_vcomm_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "nxzz_vcomm_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/nxzz_vcomm_$DATE.sql"
EOF

chmod +x /home/$USER/backup-db.sh

# Add to crontab for daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup-db.sh") | crontab -

# 18. Create super admin user
log "Membuat super admin user..."
cd $APP_DIR

# Generate password hash for 'admin123!!'
PASSWORD_HASH='$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

# Insert super admin user
sudo -u postgres psql -d $DB_NAME -c "
INSERT INTO users (id, callsign, nrp, password, first_name, last_name, rank, branch, role, is_enabled, created_at, updated_at) 
VALUES ('superadmin', 'superadmin', 'SA001', '$PASSWORD_HASH', 'Super', 'Admin', 'JENDERAL TNI', 'TNI AD', 'super_admin', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
" 2>/dev/null || true

# 19. Final checks
log "Melakukan pengecekan final..."

# Check if application is running
sleep 5
if pm2 status | grep -q "online"; then
    log "✅ Aplikasi berhasil berjalan dengan PM2"
else
    error "❌ Aplikasi gagal berjalan. Periksa log: pm2 logs nxzz-vcomm"
fi

# Check database connection
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
    log "✅ Database berhasil terhubung"
else
    error "❌ Database gagal terhubung"
fi

# Display access information
echo
echo -e "${GREEN}================================================================"
echo "           INSTALASI BERHASIL DISELESAIKAN!"
echo "================================================================${NC}"
echo
echo -e "${BLUE}Informasi Akses:${NC}"
if [[ $INSTALL_NGINX == "y" || $INSTALL_NGINX == "Y" ]]; then
    if [[ $ENABLE_SSL == "y" || $ENABLE_SSL == "Y" ]]; then
        echo "🌐 URL Aplikasi: https://$SERVER_IP"
    else
        echo "🌐 URL Aplikasi: http://$SERVER_IP"
    fi
else
    echo "🌐 URL Aplikasi: http://$SERVER_IP:$APP_PORT"
fi
echo "👤 Super Admin: superadmin"
echo "🔑 Password: admin123!!"
echo
echo -e "${BLUE}Lokasi File:${NC}"
echo "📁 Aplikasi: $APP_DIR"
echo "📄 Log: $LOG_DIR"
echo "💾 Backup: /home/$USER/backups"
echo
echo -e "${BLUE}Perintah Berguna:${NC}"
echo "🔍 Status PM2: pm2 status"
echo "📋 Log PM2: pm2 logs nxzz-vcomm"
echo "🔄 Restart App: pm2 restart nxzz-vcomm"
echo "💾 Manual Backup: /home/$USER/backup-db.sh"
echo "🛡️ Status Firewall: sudo ufw status"
echo
echo -e "${YELLOW}CATATAN PENTING:${NC}"
echo "• Backup database otomatis dijalankan setiap hari jam 2 pagi"
echo "• Gunakan 'pm2 monit' untuk monitoring real-time"
echo "• Periksa log secara berkala untuk memantau performa"
echo "• Ganti password default setelah login pertama"
echo
echo -e "${GREEN}Terima kasih telah menggunakan NXZZ-VComm!${NC}"