#!/bin/bash

echo "🛑 Stopping MES development environment..."

# Stop the main dev process if it's running
if [ -f /tmp/mes-dev.pid ]; then
    DEV_PID=$(cat /tmp/mes-dev.pid)
    echo "Stopping development servers (PID: $DEV_PID)..."
    kill $DEV_PID 2>/dev/null || true
    rm -f /tmp/mes-dev.pid
fi

# Kill any remaining processes
echo "🧹 Cleaning up processes..."
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:5178 | xargs sudo kill -9 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "vite.*frontend" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true

sleep 2

echo "✅ MES development environment stopped"
echo "📄 Logs preserved at: /tmp/mes-logs/dev.log"