#!/bin/bash

# NXZZ-VComm System Monitoring Script
# Monitor aplikasi, database, dan sistem

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
APP_DIR="/opt/nxzz-vcomm"
LOG_DIR="/var/log/nxzz-vcomm"
DB_NAME="nxzz_vcomm"
DB_USER="nxzz_user"

echo -e "${BLUE}"
echo "================================================================"
echo "           NXZZ-VComm System Monitor"
echo "================================================================"
echo -e "${NC}"

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "✅ $service: ${GREEN}RUNNING${NC}"
    else
        echo -e "❌ $service: ${RED}STOPPED${NC}"
    fi
}

# Function to check PM2 process
check_pm2() {
    if pm2 list | grep -q "nxzz-vcomm.*online"; then
        echo -e "✅ NXZZ-VComm App: ${GREEN}RUNNING${NC}"
        
        # Get memory usage
        MEMORY=$(pm2 show nxzz-vcomm | grep "memory usage" | awk '{print $3}')
        echo -e "   Memory Usage: ${YELLOW}$MEMORY${NC}"
        
        # Get uptime
        UPTIME=$(pm2 show nxzz-vcomm | grep "uptime" | awk '{print $2}')
        echo -e "   Uptime: ${YELLOW}$UPTIME${NC}"
    else
        echo -e "❌ NXZZ-VComm App: ${RED}STOPPED${NC}"
    fi
}

# Function to check database
check_database() {
    if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
        echo -e "✅ PostgreSQL Database: ${GREEN}CONNECTED${NC}"
        
        # Get user count
        USER_COUNT=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE is_enabled = true;" 2>/dev/null | xargs)
        echo -e "   Active Users: ${YELLOW}$USER_COUNT${NC}"
        
        # Get today's messages
        MSG_COUNT=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM messages WHERE created_at::date = CURRENT_DATE;" 2>/dev/null | xargs)
        echo -e "   Today's Messages: ${YELLOW}$MSG_COUNT${NC}"
        
        # Get database size
        DB_SIZE=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
        echo -e "   Database Size: ${YELLOW}$DB_SIZE${NC}"
    else
        echo -e "❌ PostgreSQL Database: ${RED}CONNECTION FAILED${NC}"
    fi
}

# Function to check system resources
check_system() {
    echo -e "\n${BLUE}System Resources:${NC}"
    
    # CPU Usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    echo -e "   CPU Usage: ${YELLOW}$CPU_USAGE%${NC}"
    
    # Memory Usage
    MEMORY_INFO=$(free -h | grep "Mem:")
    MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
    echo -e "   Memory Usage: ${YELLOW}$MEMORY_USED / $MEMORY_TOTAL${NC}"
    
    # Disk Usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
    echo -e "   Disk Usage: ${YELLOW}$DISK_USAGE${NC}"
    
    # Load Average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
    echo -e "   Load Average:${YELLOW}$LOAD_AVG${NC}"
}

# Function to check network
check_network() {
    echo -e "\n${BLUE}Network Status:${NC}"
    
    # Check if port 5000 is listening
    if netstat -tlnp | grep -q ":5000"; then
        echo -e "✅ Port 5000: ${GREEN}LISTENING${NC}"
    else
        echo -e "❌ Port 5000: ${RED}NOT LISTENING${NC}"
    fi
    
    # Check if PostgreSQL port is listening
    if netstat -tlnp | grep -q ":5432"; then
        echo -e "✅ PostgreSQL Port 5432: ${GREEN}LISTENING${NC}"
    else
        echo -e "❌ PostgreSQL Port 5432: ${RED}NOT LISTENING${NC}"
    fi
    
    # Check Nginx if installed
    if command -v nginx &> /dev/null; then
        if netstat -tlnp | grep -q ":80\|:443"; then
            echo -e "✅ Nginx: ${GREEN}LISTENING${NC}"
        else
            echo -e "❌ Nginx: ${RED}NOT LISTENING${NC}"
        fi
    fi
}

# Function to check logs
check_logs() {
    echo -e "\n${BLUE}Recent Logs (last 10 lines):${NC}"
    
    if [ -f "$LOG_DIR/error.log" ]; then
        echo -e "\n${YELLOW}Error Log:${NC}"
        tail -5 "$LOG_DIR/error.log" 2>/dev/null || echo "No errors found"
    fi
    
    if [ -f "$LOG_DIR/out.log" ]; then
        echo -e "\n${YELLOW}Application Log:${NC}"
        tail -5 "$LOG_DIR/out.log" 2>/dev/null || echo "No output logs"
    fi
}

# Function to show active connections
check_connections() {
    echo -e "\n${BLUE}Active Connections:${NC}"
    
    # Count connections to port 5000
    CONNECTIONS=$(netstat -an | grep ":5000" | grep ESTABLISHED | wc -l)
    echo -e "   Active Users: ${YELLOW}$CONNECTIONS${NC}"
    
    # PostgreSQL connections
    PG_CONNECTIONS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
    echo -e "   Database Connections: ${YELLOW}$PG_CONNECTIONS${NC}"
}

# Main monitoring
echo -e "${BLUE}Service Status:${NC}"
check_service "postgresql"
check_service "nginx" 2>/dev/null || echo -e "   Nginx: ${YELLOW}NOT INSTALLED${NC}"
check_pm2
check_database

check_system
check_network
check_connections

# Check if user wants to see logs
if [ "$1" = "--logs" ] || [ "$1" = "-l" ]; then
    check_logs
fi

echo -e "\n${BLUE}Quick Commands:${NC}"
echo "  pm2 status           - Check PM2 processes"
echo "  pm2 logs nxzz-vcomm  - View application logs"
echo "  pm2 monit           - Real-time monitoring"
echo "  sudo systemctl status postgresql - Check database status"
echo "  $0 --logs           - Show recent logs"

echo -e "\n${GREEN}Monitoring completed at $(date)${NC}"