#!/bin/bash

# E2E Test Port Cleanup Script
# Kills all processes using E2E test ports to ensure clean test runs
# Ports: 3101 (backend), 5278 (frontend), 5279 (frontend fallback)

set -e

echo "=== E2E Test Port Cleanup ==="
echo ""

# Define test ports
BACKEND_PORT=3101
FRONTEND_PORT=5278
FRONTEND_FALLBACK_PORT=5279

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local killed=0

    # Try fuser first (most reliable)
    if command -v fuser &> /dev/null; then
        if fuser -k ${port}/tcp 2>/dev/null; then
            killed=1
        fi
    fi

    # Fallback to lsof if fuser didn't work or isn't available
    if [ $killed -eq 0 ] && command -v lsof &> /dev/null; then
        local pids=$(lsof -ti:${port} 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "  Killing processes on port ${port}: $pids"
            kill -9 $pids 2>/dev/null || true
            killed=1
        fi
    fi

    if [ $killed -eq 0 ]; then
        echo "  ✓ Port ${port} already free"
    else
        echo "  ✓ Port ${port} cleaned"
    fi
}

echo "Cleaning test ports..."

# Kill processes on each port
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
kill_port $FRONTEND_FALLBACK_PORT

# Wait for ports to be released
sleep 2

echo ""
echo "Verifying ports are free..."

# Verify all ports are free
all_free=true
for port in $BACKEND_PORT $FRONTEND_PORT $FRONTEND_FALLBACK_PORT; do
    if lsof -i:${port} 2>/dev/null | grep -q LISTEN; then
        echo "  ✗ WARNING: Port ${port} still occupied!"
        all_free=false
    fi
done

if [ "$all_free" = true ]; then
    echo "  ✓ All test ports are free"
    echo ""
    echo "=== Port cleanup completed successfully ==="
    exit 0
else
    echo ""
    echo "=== WARNING: Some ports still occupied ==="
    echo "You may need to manually kill processes or reboot"
    exit 1
fi
