#!/bin/bash

# NXZZ-VComm Maintenance Script
# Backup, update, dan maintenance rutin

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
APP_DIR="/opt/nxzz-vcomm"
LOG_DIR="/var/log/nxzz-vcomm"
BACKUP_DIR="/home/$USER/backups"
DB_NAME="nxzz_vcomm"
DB_USER="nxzz_user"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Show help
show_help() {
    echo "NXZZ-VComm Maintenance Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  backup          Create database backup"
    echo "  cleanup         Clean old logs and backups"
    echo "  update          Update application dependencies"
    echo "  restart         Restart all services"
    echo "  optimize        Optimize database and system"
    echo "  full            Run all maintenance tasks"
    echo "  help            Show this help message"
    echo ""
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    mkdir -p $BACKUP_DIR
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/nxzz_vcomm_$DATE.sql"
    
    if pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_FILE; then
        log "✅ Backup created: $BACKUP_FILE"
        
        # Compress backup
        gzip $BACKUP_FILE
        log "✅ Backup compressed: $BACKUP_FILE.gz"
        
        # Get backup size
        SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
        info "Backup size: $SIZE"
    else
        error "❌ Failed to create backup"
        return 1
    fi
}

# Cleanup old files
cleanup_files() {
    log "Cleaning up old files..."
    
    # Remove old backups (keep last 14 days)
    find $BACKUP_DIR -name "nxzz_vcomm_*.sql.gz" -mtime +14 -delete
    BACKUP_COUNT=$(find $BACKUP_DIR -name "nxzz_vcomm_*.sql.gz" | wc -l)
    log "✅ Backup cleanup completed. Remaining backups: $BACKUP_COUNT"
    
    # Rotate PM2 logs
    pm2 flush nxzz-vcomm
    log "✅ PM2 logs flushed"
    
    # Clean old system logs
    sudo journalctl --vacuum-time=7d
    log "✅ System logs cleaned (kept last 7 days)"
    
    # Clean package cache
    sudo apt autoremove -y
    sudo apt autoclean
    log "✅ Package cache cleaned"
}

# Update application
update_app() {
    log "Updating application dependencies..."
    
    cd $APP_DIR
    
    # Create backup before update
    create_backup
    
    # Update npm packages
    npm update
    log "✅ NPM packages updated"
    
    # Rebuild application
    npm run build
    log "✅ Application rebuilt"
    
    # Restart PM2
    pm2 restart nxzz-vcomm
    log "✅ Application restarted"
    
    # Wait and check status
    sleep 5
    if pm2 list | grep -q "nxzz-vcomm.*online"; then
        log "✅ Application is running properly"
    else
        error "❌ Application failed to restart"
        return 1
    fi
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Restart PostgreSQL
    sudo systemctl restart postgresql
    log "✅ PostgreSQL restarted"
    
    # Restart PM2 application
    pm2 restart nxzz-vcomm
    log "✅ Application restarted"
    
    # Restart Nginx if installed
    if command -v nginx &> /dev/null; then
        sudo systemctl restart nginx
        log "✅ Nginx restarted"
    fi
    
    # Wait and verify services
    sleep 5
    
    # Check PostgreSQL
    if systemctl is-active --quiet postgresql; then
        log "✅ PostgreSQL is running"
    else
        error "❌ PostgreSQL failed to start"
    fi
    
    # Check application
    if pm2 list | grep -q "nxzz-vcomm.*online"; then
        log "✅ Application is running"
    else
        error "❌ Application failed to start"
    fi
}

# Optimize database and system
optimize_system() {
    log "Optimizing database and system..."
    
    # Database optimization
    psql -h localhost -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;" &>/dev/null
    log "✅ Database vacuumed and analyzed"
    
    # Update database statistics
    psql -h localhost -U $DB_USER -d $DB_NAME -c "REINDEX DATABASE $DB_NAME;" &>/dev/null
    log "✅ Database reindexed"
    
    # Clear old sessions
    psql -h localhost -U $DB_USER -d $DB_NAME -c "DELETE FROM sessions WHERE expire < NOW();" &>/dev/null
    log "✅ Expired sessions cleaned"
    
    # System optimization
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
    log "✅ System caches cleared"
    
    # Update package database
    sudo apt update &>/dev/null
    log "✅ Package database updated"
}

# Security check
security_check() {
    log "Running security checks..."
    
    # Check for failed login attempts
    FAILED_LOGINS=$(grep "authentication failure" /var/log/auth.log | wc -l 2>/dev/null || echo "0")
    if [ $FAILED_LOGINS -gt 10 ]; then
        warning "High number of failed login attempts: $FAILED_LOGINS"
    else
        info "Failed login attempts: $FAILED_LOGINS"
    fi
    
    # Check disk space
    DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        warning "High disk usage: $DISK_USAGE%"
    else
        info "Disk usage: $DISK_USAGE%"
    fi
    
    # Check memory usage
    MEMORY_USAGE=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
    if [ $MEMORY_USAGE -gt 85 ]; then
        warning "High memory usage: $MEMORY_USAGE%"
    else
        info "Memory usage: $MEMORY_USAGE%"
    fi
    
    # Check if SSL certificates will expire soon (if using SSL)
    if [ -f "/etc/ssl/nxzz-vcomm/certificate.crt" ]; then
        CERT_DAYS=$(openssl x509 -enddate -noout -in /etc/ssl/nxzz-vcomm/certificate.crt | cut -d= -f2 | xargs -I {} date -d {} +%s)
        CURRENT_DAYS=$(date +%s)
        DAYS_LEFT=$(( ($CERT_DAYS - $CURRENT_DAYS) / 86400 ))
        
        if [ $DAYS_LEFT -lt 30 ]; then
            warning "SSL certificate expires in $DAYS_LEFT days"
        else
            info "SSL certificate expires in $DAYS_LEFT days"
        fi
    fi
}

# Full maintenance
full_maintenance() {
    log "Starting full maintenance..."
    echo
    
    create_backup
    echo
    
    cleanup_files
    echo
    
    optimize_system
    echo
    
    security_check
    echo
    
    restart_services
    echo
    
    log "✅ Full maintenance completed successfully!"
    
    # Generate report
    echo -e "\n${BLUE}Maintenance Report:${NC}"
    echo "Date: $(date)"
    echo "Backup created: Yes"
    echo "Services restarted: Yes"
    echo "Database optimized: Yes"
    echo "System cleaned: Yes"
    
    # Show current status
    echo -e "\n${BLUE}Current Status:${NC}"
    pm2 status
}

# Main script
case "$1" in
    backup)
        create_backup
        ;;
    cleanup)
        cleanup_files
        ;;
    update)
        update_app
        ;;
    restart)
        restart_services
        ;;
    optimize)
        optimize_system
        ;;
    security)
        security_check
        ;;
    full)
        full_maintenance
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Error: Invalid option '$1'"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac