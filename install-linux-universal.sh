#!/bin/bash

# NXZZ-VComm Universal Linux Installation Script
# Compatible with Ubuntu, Debian, CentOS, RHEL, Rocky, Alma, Fedora, Arch, SUSE

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
        CODENAME=${VERSION_CODENAME:-}
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
        VERSION=$(rpm -q --queryformat '%{VERSION}' centos-release 2>/dev/null || echo "unknown")
    elif [ -f /etc/arch-release ]; then
        DISTRO="arch"
        VERSION="rolling"
    else
        DISTRO="unknown"
        VERSION="unknown"
    fi
    
    print_info "Detected OS: $DISTRO $VERSION"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (sudo)"
        exit 1
    fi
}

# Get server IP
get_server_ip() {
    # Try to get public IP first, then private IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipecho.net/plain 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    print_info "Auto-detected IP: $SERVER_IP"
    read -p "Konfirmasi atau masukkan IP server yang diinginkan [$SERVER_IP]: " USER_IP
    
    if [ ! -z "$USER_IP" ]; then
        SERVER_IP="$USER_IP"
    fi
    
    print_status "Using server IP: $SERVER_IP"
}

# Install Node.js based on distro
install_nodejs() {
    print_status "Installing Node.js 20.x..."
    
    case $DISTRO in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            if command -v dnf &> /dev/null; then
                dnf install -y nodejs npm
            else
                yum install -y nodejs npm
            fi
            ;;
        fedora)
            dnf install -y nodejs npm
            ;;
        arch|manjaro)
            pacman -S --noconfirm nodejs npm
            ;;
        opensuse*|sles)
            zypper install -y nodejs20 npm20
            ;;
        *)
            print_error "Unsupported distribution for automatic Node.js installation"
            print_info "Please install Node.js 20.x manually from https://nodejs.org/"
            exit 1
            ;;
    esac
    
    node --version
    npm --version
}

# Install PostgreSQL based on distro
install_postgresql() {
    print_status "Installing PostgreSQL..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y postgresql postgresql-contrib
            systemctl enable --now postgresql
            ;;
        centos|rhel|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                dnf install -y postgresql postgresql-server postgresql-contrib
            else
                yum install -y postgresql postgresql-server postgresql-contrib
            fi
            
            if [ ! -d "/var/lib/pgsql/data/base" ]; then
                postgresql-setup initdb
            fi
            systemctl enable --now postgresql
            ;;
        fedora)
            dnf install -y postgresql postgresql-server postgresql-contrib
            if [ ! -d "/var/lib/pgsql/data/base" ]; then
                postgresql-setup initdb
            fi
            systemctl enable --now postgresql
            ;;
        arch|manjaro)
            pacman -S --noconfirm postgresql
            sudo -u postgres initdb -D /var/lib/postgres/data
            systemctl enable --now postgresql
            ;;
        opensuse*|sles)
            zypper install -y postgresql postgresql-server postgresql-contrib
            systemctl enable --now postgresql
            ;;
        *)
            print_error "Unsupported distribution for automatic PostgreSQL installation"
            exit 1
            ;;
    esac
    
    print_status "PostgreSQL installed and started"
}

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl wget git build-essential nginx certbot python3-certbot-nginx unzip htop
            ;;
        centos|rhel|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                dnf groupinstall -y "Development Tools"
                dnf install -y curl wget git nginx certbot python3-certbot-nginx unzip htop epel-release
            else
                yum groupinstall -y "Development Tools"
                yum install -y curl wget git nginx certbot python3-certbot-nginx unzip htop epel-release
            fi
            ;;
        fedora)
            dnf groupinstall -y "Development Tools"
            dnf install -y curl wget git nginx certbot python3-certbot-nginx unzip htop
            ;;
        arch|manjaro)
            pacman -S --noconfirm curl wget git base-devel nginx certbot certbot-nginx unzip htop
            ;;
        opensuse*|sles)
            zypper install -y curl wget git gcc make nginx certbot unzip htop
            ;;
    esac
}

# Setup firewall based on distro
setup_firewall() {
    print_status "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        ufw --force enable
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 5000/tcp
        ufw allow 5432/tcp
        ufw reload
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL/Fedora firewalld
        systemctl enable --now firewalld
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --permanent --add-port=5000/tcp
        firewall-cmd --permanent --add-port=5432/tcp
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    elif command -v iptables &> /dev/null; then
        # Generic iptables (Arch, etc.)
        iptables -A INPUT -p tcp --dport 22 -j ACCEPT
        iptables -A INPUT -p tcp --dport 80 -j ACCEPT
        iptables -A INPUT -p tcp --dport 443 -j ACCEPT
        iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
        iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
        
        # Save iptables rules
        if command -v iptables-save &> /dev/null; then
            iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
        fi
    fi
}

# Main installation function
main_installation() {
    echo "================================================================"
    echo "           NXZZ-VComm Universal Linux Installation"
    echo "           Military Communication Platform"
    echo "================================================================"
    echo ""
    
    # Detect OS
    detect_distro
    
    # Check root permissions
    check_root
    
    # Get server configuration
    get_server_ip
    
    # Install dependencies
    install_dependencies
    install_nodejs
    install_postgresql
    
    # Install global npm packages
    print_status "Installing global npm packages..."
    npm install -g pm2 tsx drizzle-kit
    
    # Setup database
    print_status "Setting up database..."
    DB_PASSWORD="NxzzSecure2024!"
    
    sudo -u postgres psql << EOF
CREATE DATABASE nxzz_vcomm;
CREATE USER nxzz_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE nxzz_vcomm TO nxzz_user;
ALTER USER nxzz_user CREATEDB;
EOF
    
    # Setup application directory
    APP_DIR="/opt/nxzz-vcomm"
    print_status "Setting up application directory: $APP_DIR"
    
    mkdir -p $APP_DIR/{logs,backups,uploads,ssl}
    
    # Create environment file
    cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://nxzz_user:$DB_PASSWORD@localhost:5432/nxzz_vcomm

# Session secret (generated)
SESSION_SECRET=$(openssl rand -base64 32)

# App configuration
APP_URL=http://$SERVER_IP:5000
REPLIT_DOMAINS=$SERVER_IP:5000,localhost:5000
EOF

    # Create PM2 ecosystem file
    cat > $APP_DIR/ecosystem.config.js << 'EOF'
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
    error_file: '/opt/nxzz-vcomm/logs/error.log',
    out_file: '/opt/nxzz-vcomm/logs/out.log',
    log_file: '/opt/nxzz-vcomm/logs/combined.log',
    time: true
  }]
};
EOF

    # Setup firewall
    setup_firewall
    
    # Create monitoring script
    create_monitoring_script
    
    # Create backup script
    create_backup_script
    
    # Setup cron for backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/nxzz-vcomm/backup-database.sh") | crontab -
    
    print_status "Installation base completed!"
    print_info "Next steps:"
    print_info "1. Copy your NXZZ-VComm source code to $APP_DIR"
    print_info "2. Run: cd $APP_DIR && npm install"
    print_info "3. Run: npm run db:push"
    print_info "4. Run: npm run build"
    print_info "5. Run: pm2 start ecosystem.config.js"
    print_info "6. Run: pm2 save && pm2 startup"
    
    echo ""
    echo "Access URLs:"
    echo "  Direct: http://$SERVER_IP:5000"
    echo "  Database: postgresql://nxzz_user:$DB_PASSWORD@localhost:5432/nxzz_vcomm"
    echo ""
    echo "Management:"
    echo "  Monitor: $APP_DIR/monitor-system.sh"
    echo "  Backup: $APP_DIR/backup-database.sh"
    echo "  Logs: pm2 logs nxzz-vcomm"
}

# Create monitoring script
create_monitoring_script() {
    cat > /opt/nxzz-vcomm/monitor-system.sh << 'EOF'
#!/bin/bash

echo "================================================================"
echo "           NXZZ-VComm System Monitor"
echo "================================================================"

# System info
echo "System: $(uname -a)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo ""

# Services status
echo "Service Status:"
echo "==============="
systemctl is-active postgresql &>/dev/null && echo "[✓] PostgreSQL: ACTIVE" || echo "[✗] PostgreSQL: INACTIVE"
systemctl is-active nginx &>/dev/null && echo "[✓] Nginx: ACTIVE" || echo "[✗] Nginx: INACTIVE"

# PM2 status
echo ""
echo "PM2 Status:"
pm2 status 2>/dev/null || echo "PM2 not running"

# Database stats
echo ""
echo "Database Statistics:"
sudo -u postgres psql -d nxzz_vcomm -c "SELECT COUNT(*) as active_users FROM users WHERE is_enabled = true;" 2>/dev/null || echo "Database connection failed"

# System resources
echo ""
echo "System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"

# Network connections
echo ""
echo "Network Status:"
netstat -tuln | grep :5000 >/dev/null && echo "[✓] Port 5000: LISTENING" || echo "[✗] Port 5000: NOT LISTENING"
netstat -tuln | grep :5432 >/dev/null && echo "[✓] Port 5432: LISTENING" || echo "[✗] Port 5432: NOT LISTENING"

echo ""
echo "Monitoring completed at $(date)"
EOF

    chmod +x /opt/nxzz-vcomm/monitor-system.sh
}

# Create backup script
create_backup_script() {
    cat > /opt/nxzz-vcomm/backup-database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/nxzz-vcomm/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump nxzz_vcomm > $BACKUP_DIR/nxzz_vcomm_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/nxzz_vcomm_$DATE.sql

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/nxzz_vcomm_$DATE.sql.gz"
EOF

    chmod +x /opt/nxzz-vcomm/backup-database.sh
}

# Run main installation
main_installation
EOF