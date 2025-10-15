#!/bin/bash

echo "🚀 Starting MES development environment..."

# Clean up any orphaned processes first
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/cleanup-orphaned-processes.sh" ]; then
    "$SCRIPT_DIR/cleanup-orphaned-processes.sh"
    echo ""
fi

# Create log directory
mkdir -p /tmp/mes-logs

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:5178 | xargs sudo kill -9 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "vite.*frontend" 2>/dev/null || true

sleep 2

# Start the development servers in background with logging
echo "🚀 Starting backend and frontend servers..."
concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  "npm run dev:server" \
  "npm run dev:frontend" \
  > /tmp/mes-logs/dev.log 2>&1 &

DEV_PID=$!

# Save the PID to a file for later stopping
echo $DEV_PID > /tmp/mes-dev.pid

# Wait a moment for servers to start
sleep 3

echo ""
echo "✅ Development servers started in background (PID: $DEV_PID)"
echo "📄 Logs are being written to: /tmp/mes-logs/dev.log"
echo "🌐 Application available at: http://local.mes.com"
echo ""
echo "Commands:"
echo "  npm run dev:stop   - Stop the servers"
echo "  npm run dev:logs   - View live logs"
echo "  npm run dev:status - Check server status"
echo ""
echo "Checking server status in 5 seconds..."
sleep 5

# Check if servers are running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server is running on port 3001"
else
    echo "❌ Backend server failed to start"
fi

if curl -s http://localhost:5178 > /dev/null; then
    echo "✅ Frontend server is running on port 5178"
else
    echo "❌ Frontend server failed to start"
fi

echo ""
echo "🎉 MES Development Environment Ready!"
echo "Visit: http://local.mes.com"