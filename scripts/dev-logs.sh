#!/bin/bash

echo "📄 MES Development Logs (press Ctrl+C to exit)"
echo "============================================"

if [ -f /tmp/mes-logs/dev.log ]; then
    tail -f /tmp/mes-logs/dev.log
else
    echo "❌ No log file found at /tmp/mes-logs/dev.log"
    echo "Make sure the development servers are running with 'npm run dev'"
fi