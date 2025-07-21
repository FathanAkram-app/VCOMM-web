#!/bin/bash

# NXZZ-VComm SSL Setup Script
# Generate self-signed SSL certificates for HTTPS access

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo -e "${BLUE}"
echo "================================================================"
echo "           NXZZ-VComm SSL Certificate Setup"
echo "================================================================"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "Script tidak boleh dijalankan sebagai root. Gunakan user biasa dengan sudo privileges."
fi

# Get server information
read -p "Masukkan IP Address server (contoh: 192.168.1.100): " SERVER_IP
if [[ -z "$SERVER_IP" ]]; then
    error "IP Address tidak boleh kosong!"
fi

read -p "Masukkan hostname/domain (optional, tekan Enter untuk skip): " SERVER_HOSTNAME

# Certificate details
CERT_DIR="/etc/ssl/nxzz-vcomm"
CERT_FILE="$CERT_DIR/certificate.crt"
KEY_FILE="$CERT_DIR/private.key"
CSR_FILE="$CERT_DIR/certificate.csr"

log "Membuat direktori SSL..."
sudo mkdir -p $CERT_DIR

# Generate OpenSSL configuration
log "Membuat konfigurasi OpenSSL..."
cat > /tmp/ssl.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=ID
ST=Indonesia
L=Jakarta
O=TNI
OU=Satuan Komunikasi
CN=$SERVER_IP

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $SERVER_IP
IP.2 = 127.0.0.1
IP.3 = 0.0.0.0
DNS.1 = localhost
EOF

# Add hostname if provided
if [[ ! -z "$SERVER_HOSTNAME" ]]; then
    echo "DNS.2 = $SERVER_HOSTNAME" >> /tmp/ssl.conf
fi

log "Generating SSL certificate..."
sudo openssl req -new -x509 -days 365 -nodes \
    -config /tmp/ssl.conf \
    -keyout $KEY_FILE \
    -out $CERT_FILE

if [ $? -eq 0 ]; then
    log "✅ SSL certificate berhasil dibuat"
else
    error "❌ Gagal membuat SSL certificate"
fi

# Set proper permissions
sudo chmod 600 $KEY_FILE
sudo chmod 644 $CERT_FILE
sudo chown root:root $KEY_FILE $CERT_FILE

log "Setting proper permissions..."

# Check if Nginx is installed
if command -v nginx &> /dev/null; then
    log "Updating Nginx configuration for SSL..."
    
    # Backup existing configuration
    if [ -f "/etc/nginx/sites-available/nxzz-vcomm" ]; then
        sudo cp /etc/nginx/sites-available/nxzz-vcomm /etc/nginx/sites-available/nxzz-vcomm.backup
    fi
    
    # Create SSL-enabled Nginx configuration
    sudo tee /etc/nginx/sites-available/nxzz-vcomm > /dev/null << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $SERVER_IP;

    # SSL Configuration
    ssl_certificate $CERT_FILE;
    ssl_certificate_key $KEY_FILE;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy settings
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
        client_max_body_size        100M;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket specific timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
EOF

    # Test Nginx configuration
    if sudo nginx -t; then
        log "✅ Nginx configuration valid"
        sudo systemctl reload nginx
        log "✅ Nginx reloaded with SSL configuration"
    else
        error "❌ Nginx configuration error"
    fi
    
    # Update firewall
    sudo ufw allow 443/tcp
    log "✅ Firewall updated for HTTPS"
    
else
    warning "Nginx tidak ditemukan. SSL certificate sudah dibuat tapi belum dikonfigurasi."
fi

# Generate certificate information
log "Displaying certificate information..."
echo -e "\n${BLUE}Certificate Details:${NC}"
openssl x509 -in $CERT_FILE -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:"

# Create certificate installation guide for mobile devices
log "Creating mobile installation guide..."
cat > /tmp/ssl-mobile-guide.txt << EOF
PANDUAN INSTALASI CERTIFICATE SSL UNTUK MOBILE

1. Download certificate dari server:
   wget http://$SERVER_IP:5000/certificate.crt
   atau
   curl -O http://$SERVER_IP:5000/certificate.crt

2. Transfer file certificate.crt ke mobile device

3. ANDROID:
   - Buka Settings > Security > Encryption & credentials
   - Pilih "Install a certificate" > "CA certificate"
   - Pilih file certificate.crt
   - Beri nama: NXZZ-VComm Certificate
   - Tap Install

4. iOS:
   - Email file certificate.crt ke device iOS
   - Tap attachment dalam email
   - Pilih "Install Profile"
   - Masuk ke Settings > General > About > Certificate Trust Settings
   - Enable trust untuk NXZZ-VComm Certificate

5. Akses aplikasi dengan: https://$SERVER_IP

CATATAN: Certificate ini adalah self-signed, browser akan menampilkan warning
yang bisa diabaikan untuk penggunaan internal.
EOF

# Serve certificate file via HTTP for easy download
log "Setting up certificate download..."
if [ -d "/opt/nxzz-vcomm/client/dist" ]; then
    sudo cp $CERT_FILE /opt/nxzz-vcomm/client/dist/certificate.crt
    sudo chmod 644 /opt/nxzz-vcomm/client/dist/certificate.crt
    log "✅ Certificate tersedia untuk download di: http://$SERVER_IP:5000/certificate.crt"
fi

# Cleanup
rm -f /tmp/ssl.conf

echo
echo -e "${GREEN}================================================================"
echo "           SSL SETUP BERHASIL DISELESAIKAN!"
echo "================================================================${NC}"
echo
echo -e "${BLUE}Informasi SSL:${NC}"
echo "📁 Certificate Location: $CERT_FILE"
echo "🔑 Private Key Location: $KEY_FILE"
echo "📅 Valid Until: $(openssl x509 -enddate -noout -in $CERT_FILE | cut -d= -f2)"
echo
echo -e "${BLUE}Akses Aplikasi:${NC}"
if command -v nginx &> /dev/null; then
    echo "🌐 HTTPS URL: https://$SERVER_IP"
    echo "🔀 HTTP Redirect: http://$SERVER_IP → https://$SERVER_IP"
else
    echo "🌐 HTTPS URL: https://$SERVER_IP:5000"
fi
echo
echo -e "${BLUE}Download Certificate untuk Mobile:${NC}"
echo "📱 URL: http://$SERVER_IP:5000/certificate.crt"
echo "📋 Guide: cat /tmp/ssl-mobile-guide.txt"
echo
echo -e "${YELLOW}CATATAN PENTING:${NC}"
echo "• Certificate ini adalah self-signed untuk penggunaan internal"
echo "• Browser akan menampilkan security warning yang bisa diabaikan"
echo "• Untuk mobile device, install certificate manual (lihat guide)"
echo "• Certificate berlaku selama 1 tahun dari sekarang"
echo
echo -e "${GREEN}SSL berhasil dikonfigurasi untuk NXZZ-VComm!${NC}"