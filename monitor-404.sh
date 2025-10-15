#!/bin/bash
echo "Monitoring for 404 errors... (Press Ctrl+C to stop)"
echo "Watching logs at /tmp/mes-dev.log"
echo "================================================"
tail -f /tmp/mes-dev.log | grep --line-buffered -E "404|statusCode.*404|Route.*not found"
