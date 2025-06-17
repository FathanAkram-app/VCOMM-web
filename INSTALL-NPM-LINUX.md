# Instalasi Node.js dan NPM di Linux Server

## Metode 1: Package Manager (Recommended)

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js dan NPM
sudo apt install -y nodejs npm

# Verify installation
node --version
npm --version
```

### CentOS/RHEL/Rocky Linux
```bash
# Update system
sudo yum update -y

# Install Node.js dan NPM
sudo yum install -y nodejs npm

# Verify installation
node --version
npm --version
```

### Fedora
```bash
# Install Node.js dan NPM
sudo dnf install -y nodejs npm

# Verify installation
node --version
npm --version
```

## Metode 2: NodeSource Repository (Latest Version)

### Ubuntu/Debian
```bash
# Download dan install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js (NPM included)
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### CentOS/RHEL/Rocky Linux
```bash
# Download dan install NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js (NPM included)
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

## Metode 3: NVM (Node Version Manager) - Most Flexible

### Install NVM
```bash
# Download dan install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload terminal atau jalankan:
source ~/.bashrc

# Verify NVM installation
nvm --version
```

### Install Node.js dengan NVM
```bash
# Install latest LTS version
nvm install --lts

# Use latest LTS version
nvm use --lts

# Set default version
nvm alias default node

# Verify installation
node --version
npm --version
```

## Setelah Instalasi NPM

### 1. Update NPM ke versi terbaru
```bash
sudo npm install -g npm@latest
```

### 2. Setup global directory (Optional, untuk avoid sudo)
```bash
# Create directory for global packages
mkdir ~/.npm-global

# Configure NPM to use new directory
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.profile atau ~/.bashrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 3. Install build tools (diperlukan untuk beberapa packages)
```bash
# Ubuntu/Debian
sudo apt install -y build-essential

# CentOS/RHEL
sudo yum groupinstall -y "Development Tools"
sudo yum install -y gcc-c++ make
```

## Deploy VCommMessenger dengan NPM

### 1. Clone dan setup project
```bash
# Clone project
git clone [repository-url] vcomm-messenger
cd vcomm-messenger

# Install dependencies
npm install

# Install production dependencies global
npm install -g tsx pm2
```

### 2. Setup environment
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Set production values:
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/vcomm_db
SESSION_SECRET=your-secret-key
PORT=5000
```

### 3. Setup PostgreSQL database
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database dan user
sudo -u postgres psql
```

```sql
-- Di PostgreSQL prompt:
CREATE DATABASE vcomm_db;
CREATE USER vcomm_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vcomm_db TO vcomm_user;
\q
```

### 4. Build dan run aplikasi
```bash
# Build frontend
npm run build

# Setup database schema
npm run db:push

# Start aplikasi dengan PM2 (production)
pm2 start "npm run start" --name vcomm-app

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. Setup reverse proxy dengan Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/vcomm
```

```nginx
server {
    listen 80;
    server_name your-server-ip;

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
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vcomm /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Management Commands

### PM2 Process Management
```bash
# Check status
pm2 status

# View logs
pm2 logs vcomm-app

# Restart aplikasi
pm2 restart vcomm-app

# Stop aplikasi
pm2 stop vcomm-app

# Delete dari PM2
pm2 delete vcomm-app
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild
npm run build

# Apply database changes
npm run db:push

# Restart dengan PM2
pm2 restart vcomm-app
```

### Monitoring
```bash
# System resources
htop

# Application logs
pm2 logs --lines 100

# Database connections
sudo -u postgres psql -d vcomm_db -c "SELECT count(*) FROM pg_stat_activity;"

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Permission Issues
```bash
# Fix NPM permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Port Issues
```bash
# Check port usage
sudo netstat -tulpn | grep :5000

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:5000)
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U vcomm_user -d vcomm_db
```

Deployment NPM memberikan kontrol penuh tapi membutuhkan lebih banyak manual setup dibanding Docker. Pilih metode yang sesuai dengan expertise tim Anda.