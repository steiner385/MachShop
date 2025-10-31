#!/bin/sh

# GE Proficy Historian Surrogate Health Check Script
# Performs health checks for Docker container monitoring

set -e

# Configuration
HEALTH_URL="http://localhost:${SURROGATE_PORT:-8080}/historian/health"
TIMEOUT=10
MAX_RETRIES=3
RETRY_DELAY=2

# Function to perform HTTP health check
check_http_health() {
    local url="$1"
    local timeout="$2"

    # Use wget for HTTP health check (available in Alpine)
    if command -v wget >/dev/null 2>&1; then
        wget --spider --quiet --timeout="$timeout" "$url" 2>/dev/null
        return $?
    elif command -v curl >/dev/null 2>&1; then
        curl --silent --fail --max-time "$timeout" "$url" >/dev/null 2>&1
        return $?
    else
        echo "ERROR: Neither wget nor curl available for health check"
        return 1
    fi
}

# Function to check if the process is running
check_process() {
    # Check if Node.js process is running
    if pgrep -f "start-surrogate.js" >/dev/null 2>&1; then
        return 0
    else
        echo "ERROR: Surrogate process not found"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    # Get memory usage percentage
    local mem_usage=$(awk '/^MemAvailable:/ { available=$2 } /^MemTotal:/ { total=$2 } END { printf "%.0f", (total-available)/total*100 }' /proc/meminfo 2>/dev/null || echo "0")

    # Warn if memory usage is above 90%
    if [ "$mem_usage" -gt 90 ]; then
        echo "WARNING: High memory usage: ${mem_usage}%"
        return 1
    fi

    return 0
}

# Function to check disk space
check_disk() {
    # Check disk usage for /app directory
    local disk_usage=$(df /app 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")

    # Warn if disk usage is above 90%
    if [ "$disk_usage" -gt 90 ]; then
        echo "WARNING: High disk usage: ${disk_usage}%"
        return 1
    fi

    return 0
}

# Function to check log file accessibility
check_logs() {
    local log_file="/app/logs/surrogate.log"

    # Check if log file exists and is writable
    if [ -f "$log_file" ]; then
        if [ ! -w "$log_file" ]; then
            echo "WARNING: Log file not writable: $log_file"
            return 1
        fi
    fi

    return 0
}

# Main health check function
perform_health_check() {
    local exit_code=0
    local errors=""
    local warnings=""

    echo "Performing health check..."

    # Check 1: Process running
    if ! check_process; then
        errors="$errors Process check failed;"
        exit_code=1
    fi

    # Check 2: HTTP endpoint health (with retries)
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if check_http_health "$HEALTH_URL" "$TIMEOUT"; then
            break
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            echo "HTTP health check failed, retrying in ${RETRY_DELAY}s (attempt $retry_count/$MAX_RETRIES)..."
            sleep $RETRY_DELAY
        else
            errors="$errors HTTP health check failed after $MAX_RETRIES attempts;"
            exit_code=1
        fi
    done

    # Check 3: Memory usage
    if ! check_memory; then
        warnings="$warnings Memory usage high;"
    fi

    # Check 4: Disk space
    if ! check_disk; then
        warnings="$warnings Disk usage high;"
    fi

    # Check 5: Log accessibility
    if ! check_logs; then
        warnings="$warnings Log file issues;"
    fi

    # Report results
    if [ $exit_code -eq 0 ]; then
        echo "Health check passed"
        if [ -n "$warnings" ]; then
            echo "Warnings: $warnings"
        fi
    else
        echo "Health check failed"
        echo "Errors: $errors"
        if [ -n "$warnings" ]; then
            echo "Warnings: $warnings"
        fi
    fi

    return $exit_code
}

# Function to show detailed status
show_status() {
    echo "=== GE Proficy Historian Surrogate Status ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Host: $(hostname)"
    echo "Port: ${SURROGATE_PORT:-8080}"
    echo "Health URL: $HEALTH_URL"

    # Process information
    if pgrep -f "start-surrogate.js" >/dev/null 2>&1; then
        local pid=$(pgrep -f "start-surrogate.js")
        echo "Process PID: $pid"
        echo "Process uptime: $(ps -o etime= -p $pid 2>/dev/null | tr -d ' ' || echo 'unknown')"
    else
        echo "Process: Not running"
    fi

    # Memory information
    if [ -f /proc/meminfo ]; then
        local mem_total=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
        local mem_available=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
        local mem_used=$((mem_total - mem_available))
        local mem_percent=$((mem_used * 100 / mem_total))
        echo "Memory: ${mem_used}kB/${mem_total}kB (${mem_percent}%)"
    fi

    # Disk information
    echo "Disk usage:"
    df -h /app 2>/dev/null || echo "  Unknown"

    echo "=========================================="
}

# Parse command line arguments
case "${1:-check}" in
    "check")
        perform_health_check
        exit $?
        ;;
    "status")
        show_status
        perform_health_check
        exit $?
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [check|status|help]"
        echo "  check  - Perform health check (default)"
        echo "  status - Show detailed status and perform health check"
        echo "  help   - Show this help message"
        exit 0
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac