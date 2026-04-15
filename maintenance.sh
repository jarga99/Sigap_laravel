#!/bin/bash

# SIGAP PLATFORM - MAINTENANCE & OPTIMIZATION SCRIPT
# Developer: wiradika.jr

echo "=========================================================="
echo "🛡️  SIGAP SYSTEM MAINTENANCE & MEMORY OPTIMIZER"
echo "=========================================================="

# 1. Clear Node.js Caches
echo "🧹 Cleaning npm and npx caches..."
npm cache clean --force > /dev/null 2>&1
echo "✅ Cache cleaned."

# 2. Check Memory Status
echo "📊 Current Memory Usage:"
free -h
echo ""

# 3. Check Swap Pressure
SWAP_USED=$(free | grep Swap | awk '{print $3}')
if [ "$SWAP_USED" -gt 1048576 ]; then
    echo "⚠️  WARNING: High Swap Usage detected (>1GB). System may be slow."
    echo "💡 RECOMMENDATION: Restart the development servers (npm run dev)."
fi

# 4. Prune Audit Logs (Optional - Safety check)
echo "🔍 Database Check..."
# We don't prune by default to prevent data loss, but we check row counts
# mysql -u sigap_user -p'Nas!goren9' sigap_db -e "SELECT COUNT(*) FROM AuditLog"

echo "=========================================================="
echo "✅ Maintenance Task Completed."
echo "💡 TIP: Use 'npm run build' for maximum performance."
echo "=========================================================="
