#!/bin/bash
# VCommMessenger monitoring script

echo "🖥️  System Status:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')% usage"
echo "RAM: $(free | grep Mem | awk '{printf "%.1f%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "📱 VCommMessenger Status:"
docker-compose ps

echo ""
echo "🔌 Active Connections:"
docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo ""
echo "💾 Database Size:"
docker exec vcomm-postgres psql -U vcomm_user -d vcomm_db -t -c "SELECT pg_size_pretty(pg_database_size('vcomm_db'));"
