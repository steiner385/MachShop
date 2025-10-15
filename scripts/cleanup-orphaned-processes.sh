#!/bin/bash

echo "🧹 Cleaning up orphaned MES processes..."

# Kill processes by port
echo "Stopping processes on ports 3001 and 5178..."
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:5178 | xargs sudo kill -9 2>/dev/null || true

# Kill processes by name pattern
echo "Stopping Node.js processes..."
pkill -f "nodemon.*tsx.*src/index.ts" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "vite.*frontend" 2>/dev/null || true
pkill -f "concurrently.*dev:server.*dev:frontend" 2>/dev/null || true

# Clean up PID files
rm -f /tmp/mes-dev.pid 2>/dev/null || true

sleep 1
echo "✅ Cleanup complete"