#!/bin/bash

# NXZZ-VComm Performance Monitor
# Monitor performance khusus untuk group calls dan WebRTC

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
DB_NAME="nxzz_vcomm"
DB_USER="nxzz_user"

echo -e "${BLUE}"
echo "================================================================"
echo "           NXZZ-VComm Performance Monitor"
echo "           WebRTC & Group Call Analytics"
echo "================================================================"
echo -e "${NC}"

# Function to get active calls statistics
get_call_stats() {
    echo -e "\n${BLUE}📞 Active Calls Statistics:${NC}"
    
    # Active video calls
    VIDEO_CALLS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM call_history 
        WHERE status = 'active' AND call_type = 'video';
    " 2>/dev/null | xargs)
    
    # Active audio calls
    AUDIO_CALLS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM call_history 
        WHERE status = 'active' AND call_type = 'audio';
    " 2>/dev/null | xargs)
    
    # Active group calls
    GROUP_CALLS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM call_history 
        WHERE status = 'active' AND is_group_call = true;
    " 2>/dev/null | xargs)
    
    echo -e "   Video Calls: ${YELLOW}$VIDEO_CALLS${NC}"
    echo -e "   Audio Calls: ${YELLOW}$AUDIO_CALLS${NC}"
    echo -e "   Group Calls: ${YELLOW}$GROUP_CALLS${NC}"
    echo -e "   Total Active: ${YELLOW}$((VIDEO_CALLS + AUDIO_CALLS))${NC}"
}

# Function to get user activity
get_user_activity() {
    echo -e "\n${BLUE}👥 User Activity:${NC}"
    
    # Total registered users
    TOTAL_USERS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM users WHERE is_enabled = true;
    " 2>/dev/null | xargs)
    
    # Online users (active in last 5 minutes)
    ONLINE_USERS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM users 
        WHERE last_seen > NOW() - INTERVAL '5 minutes' AND is_enabled = true;
    " 2>/dev/null | xargs)
    
    # Users in calls
    USERS_IN_CALLS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(DISTINCT caller_id) FROM call_history 
        WHERE status = 'active';
    " 2>/dev/null | xargs)
    
    echo -e "   Total Users: ${YELLOW}$TOTAL_USERS${NC}"
    echo -e "   Online Users: ${YELLOW}$ONLINE_USERS${NC}"
    echo -e "   Users in Calls: ${YELLOW}$USERS_IN_CALLS${NC}"
    
    # Calculate percentage
    if [ $TOTAL_USERS -gt 0 ]; then
        ONLINE_PERCENT=$((ONLINE_USERS * 100 / TOTAL_USERS))
        echo -e "   Online Rate: ${YELLOW}$ONLINE_PERCENT%${NC}"
    fi
}

# Function to get message statistics
get_message_stats() {
    echo -e "\n${BLUE}💬 Message Statistics:${NC}"
    
    # Messages today
    MSG_TODAY=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM messages 
        WHERE created_at::date = CURRENT_DATE;
    " 2>/dev/null | xargs)
    
    # Messages last hour
    MSG_HOUR=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM messages 
        WHERE created_at > NOW() - INTERVAL '1 hour';
    " 2>/dev/null | xargs)
    
    # Average messages per user today
    AVG_MSG=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT ROUND(COUNT(*)::numeric / COUNT(DISTINCT sender_id), 1) 
        FROM messages 
        WHERE created_at::date = CURRENT_DATE;
    " 2>/dev/null | xargs)
    
    echo -e "   Messages Today: ${YELLOW}$MSG_TODAY${NC}"
    echo -e "   Messages (Last Hour): ${YELLOW}$MSG_HOUR${NC}"
    echo -e "   Avg per User Today: ${YELLOW}$AVG_MSG${NC}"
}

# Function to get WebSocket connections
get_websocket_stats() {
    echo -e "\n${BLUE}🔗 WebSocket Connections:${NC}"
    
    # Active WebSocket connections on port 5000
    WS_CONNECTIONS=$(netstat -an | grep ":5000" | grep ESTABLISHED | wc -l)
    echo -e "   Active WS Connections: ${YELLOW}$WS_CONNECTIONS${NC}"
    
    # Show connection details
    if [ $WS_CONNECTIONS -gt 0 ]; then
        echo -e "\n   ${BLUE}Connection Details:${NC}"
        netstat -an | grep ":5000" | grep ESTABLISHED | awk '{print "   " $5}' | sort | uniq -c | sort -nr | head -5
    fi
}

# Function to check database performance
get_db_performance() {
    echo -e "\n${BLUE}💾 Database Performance:${NC}"
    
    # Database size
    DB_SIZE=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " 2>/dev/null | xargs)
    
    # Active connections
    DB_CONNECTIONS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
    " 2>/dev/null | xargs)
    
    # Slow queries (queries running > 1 second)
    SLOW_QUERIES=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM pg_stat_activity 
        WHERE state = 'active' AND now() - query_start > interval '1 second';
    " 2>/dev/null | xargs)
    
    echo -e "   Database Size: ${YELLOW}$DB_SIZE${NC}"
    echo -e "   Active Connections: ${YELLOW}$DB_CONNECTIONS${NC}"
    echo -e "   Slow Queries: ${YELLOW}$SLOW_QUERIES${NC}"
    
    # Check table sizes
    echo -e "\n   ${BLUE}Table Sizes:${NC}"
    psql -h localhost -U $DB_USER -d $DB_NAME -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5;
    " 2>/dev/null | grep -E "messages|users|call_history|conversations"
}

# Function to check system resources
get_system_resources() {
    echo -e "\n${BLUE}🖥️  System Resources:${NC}"
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    
    # Memory usage
    MEMORY_INFO=$(free -h | grep "Mem:")
    MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
    MEMORY_PERCENT=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
    
    echo -e "   CPU Usage: ${YELLOW}$CPU_USAGE%${NC}"
    echo -e "   Memory: ${YELLOW}$MEMORY_USED / $MEMORY_TOTAL ($MEMORY_PERCENT%)${NC}"
    echo -e "   Disk Usage: ${YELLOW}$DISK_USAGE${NC}"
    echo -e "   Load Average: ${YELLOW}$LOAD_AVG${NC}"
    
    # PM2 memory usage
    PM2_MEMORY=$(pm2 show nxzz-vcomm | grep "memory usage" | awk '{print $3}' 2>/dev/null || echo "N/A")
    echo -e "   App Memory: ${YELLOW}$PM2_MEMORY${NC}"
}

# Function to get network performance
get_network_performance() {
    echo -e "\n${BLUE}🌐 Network Performance:${NC}"
    
    # Network interface stats
    INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    
    if [ ! -z "$INTERFACE" ]; then
        # Get RX/TX bytes
        RX_BYTES=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes)
        TX_BYTES=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes)
        
        # Convert to human readable
        RX_HUMAN=$(numfmt --to=iec-i --suffix=B $RX_BYTES)
        TX_HUMAN=$(numfmt --to=iec-i --suffix=B $TX_BYTES)
        
        echo -e "   Interface: ${YELLOW}$INTERFACE${NC}"
        echo -e "   RX Total: ${YELLOW}$RX_HUMAN${NC}"
        echo -e "   TX Total: ${YELLOW}$TX_HUMAN${NC}"
        
        # Port 5000 connections by state
        echo -e "\n   ${BLUE}Port 5000 Connection States:${NC}"
        netstat -an | grep ":5000" | awk '{print $6}' | sort | uniq -c | while read count state; do
            echo -e "   $state: ${YELLOW}$count${NC}"
        done
    fi
}

# Function to show recent call history
get_recent_calls() {
    echo -e "\n${BLUE}📋 Recent Calls (Last 10):${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME -c "
        SELECT 
            CASE 
                WHEN is_group_call THEN 'GROUP'
                ELSE 'DIRECT'
            END as type,
            call_type,
            status,
            EXTRACT(EPOCH FROM (ended_at - started_at))::int as duration_sec,
            to_char(started_at, 'HH24:MI:SS') as started
        FROM call_history 
        WHERE started_at > NOW() - INTERVAL '2 hours'
        ORDER BY started_at DESC 
        LIMIT 10;
    " 2>/dev/null || echo "   No recent calls found"
}

# Function to check for issues
check_issues() {
    echo -e "\n${BLUE}⚠️  System Health Check:${NC}"
    
    ISSUES=0
    
    # Check high CPU
    CPU_NUM=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' | cut -d. -f1)
    if [ $CPU_NUM -gt 80 ]; then
        echo -e "   ❌ High CPU usage: ${RED}$CPU_NUM%${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check high memory
    MEMORY_PERCENT=$(free | awk '/Mem/{printf("%.0f"), $3/$2*100}')
    if [ $MEMORY_PERCENT -gt 85 ]; then
        echo -e "   ❌ High memory usage: ${RED}$MEMORY_PERCENT%${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check disk space
    DISK_PERCENT=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ $DISK_PERCENT -gt 80 ]; then
        echo -e "   ❌ High disk usage: ${RED}$DISK_PERCENT%${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check if app is running
    if ! pm2 list | grep -q "nxzz-vcomm.*online"; then
        echo -e "   ❌ Application not running: ${RED}STOPPED${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Check database connection
    if ! psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
        echo -e "   ❌ Database connection: ${RED}FAILED${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if [ $ISSUES -eq 0 ]; then
        echo -e "   ✅ All systems: ${GREEN}HEALTHY${NC}"
    else
        echo -e "   ⚠️  Issues found: ${YELLOW}$ISSUES${NC}"
    fi
}

# Main execution
get_call_stats
get_user_activity
get_message_stats
get_websocket_stats
get_db_performance
get_system_resources
get_network_performance
get_recent_calls
check_issues

echo -e "\n${BLUE}Quick Actions:${NC}"
echo "  pm2 monit                    - Real-time monitoring"
echo "  ./monitor-system.sh          - Basic system check"
echo "  ./maintenance.sh full        - Full maintenance"
echo "  watch -n 5 '$0'             - Auto-refresh every 5 seconds"

echo -e "\n${GREEN}Performance monitoring completed at $(date)${NC}"