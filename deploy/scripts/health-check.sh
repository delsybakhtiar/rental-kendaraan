#!/bin/bash
# ===========================================================
# Health Check Script for Monitoring Systems
# Can be used with: Cron, PM2, Kubernetes, Docker, etc.
# ===========================================================

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
TRACKING_SERVICE_URL="${TRACKING_SERVICE_URL:-http://localhost:3003}"
LOG_FILE="${LOG_FILE:-/var/log/car-rental-health.log}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}" # Slack/Discord webhook URL

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message="$1"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 Car Rental System Alert: $message\"}" > /dev/null 2>&1 || true
    fi
}

# Function to check HTTP endpoint
check_http() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    local response
    local http_code
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null) || response="000"
    
    if [ "$response" -eq "$expected_status" ]; then
        log "${GREEN}✅ $name: OK (HTTP $response)${NC}"
        return 0
    else
        log "${RED}❌ $name: FAILED (HTTP $response, expected $expected_status)${NC}"
        send_alert "$name is down! HTTP status: $response"
        return 1
    fi
}

# Function to check health endpoint with details
check_health() {
    local name="$1"
    local url="$2"
    
    local response
    local status
    
    response=$(curl -s --max-time 10 "$url" 2>/dev/null) || response='{"status":"error"}'
    status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 | head -1)
    
    case "$status" in
        healthy)
            log "${GREEN}✅ $name: $status${NC}"
            return 0
            ;;
        degraded)
            log "${YELLOW}⚠️  $name: $status${NC}"
            return 0
            ;;
        unhealthy|error)
            log "${RED}❌ $name: $status${NC}"
            send_alert "$name is $status!"
            return 1
            ;;
        *)
            log "${RED}❌ $name: Unknown status ($status)${NC}"
            send_alert "$name returned unknown status!"
            return 1
            ;;
    esac
}

# Function to check database connectivity
check_database() {
    local db_file="${DB_FILE:-/home/z/my-project/db/custom.db}"
    
    if [ -f "$db_file" ]; then
        local size=$(du -h "$db_file" | cut -f1)
        log "${GREEN}✅ Database: OK (Size: $size)${NC}"
        return 0
    else
        log "${RED}❌ Database: NOT FOUND at $db_file${NC}"
        send_alert "Database file not found!"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold="${DISK_THRESHOLD:-90}"
    local usage
    
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        log "${RED}❌ Disk Space: CRITICAL (${usage}% used)${NC}"
        send_alert "Disk space critical! ${usage}% used"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "${YELLOW}⚠️  Disk Space: WARNING (${usage}% used)${NC}"
        return 0
    else
        log "${GREEN}✅ Disk Space: OK (${usage}% used)${NC}"
        return 0
    fi
}

# Function to check memory usage
check_memory() {
    local threshold="${MEM_THRESHOLD:-90}"
    
    if command -v free &> /dev/null; then
        local usage=$(free | awk '/Mem:/ {printf "%.0f", ($3/$2) * 100}')
        
        if [ "$usage" -gt "$threshold" ]; then
            log "${RED}❌ Memory: CRITICAL (${usage}% used)${NC}"
            send_alert "Memory usage critical! ${usage}% used"
            return 1
        elif [ "$usage" -gt 75 ]; then
            log "${YELLOW}⚠️  Memory: WARNING (${usage}% used)${NC}"
            return 0
        else
            log "${GREEN}✅ Memory: OK (${usage}% used)${NC}"
            return 0
        fi
    fi
}

# Function to check process
check_process() {
    local name="$1"
    local process_name="$2"
    
    if pgrep -f "$process_name" > /dev/null 2>&1; then
        log "${GREEN}✅ Process $name: Running${NC}"
        return 0
    else
        log "${RED}❌ Process $name: NOT RUNNING${NC}"
        send_alert "Process $name is not running!"
        return 1
    fi
}

# ===========================================================
# Main Health Check
# ===========================================================
log "=========================================="
log "🏥 Car Rental System Health Check"
log "=========================================="

ERRORS=0

# Check processes
check_process "Next.js App" "next" || ((ERRORS++))
check_process "Tracking Service" "tracking-service" || ((ERRORS++))

# Check HTTP endpoints
check_http "Next.js App" "$APP_URL" 200 || ((ERRORS++))
check_http "Tracking Service" "$TRACKING_SERVICE_URL/health" 200 || ((ERRORS++))

# Check detailed health
check_health "App Health" "$APP_URL/api/health" || ((ERRORS++))
check_health "Tracking Service Health" "$TRACKING_SERVICE_URL/health" || ((ERRORS++))

# Check system resources
check_database || ((ERRORS++))
check_disk_space || ((ERRORS++))
check_memory || ((ERRORS++))

# Summary
log "=========================================="
if [ $ERRORS -eq 0 ]; then
    log "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    log "${RED}❌ $ERRORS check(s) failed!${NC}"
    exit 1
fi
