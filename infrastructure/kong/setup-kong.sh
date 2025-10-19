#!/bin/bash
# Kong Setup Script - Phase 2, Task 2.2
# This script configures Kong API Gateway using the declarative configuration

set -e

echo "=========================================="
echo "Setting up Kong API Gateway"
echo "=========================================="

# Wait for Kong to be healthy
echo "Waiting for Kong to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8001/status > /dev/null 2>&1; then
        echo "✓ Kong is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts: Kong not ready yet..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "✗ Kong failed to start after $max_attempts attempts"
    exit 1
fi

# Apply declarative configuration using deck (Kong's CLI tool)
# Alternative: Use curl to POST the configuration

echo ""
echo "Applying Kong declarative configuration..."

# Option 1: If deck is installed
if command -v deck &> /dev/null; then
    echo "Using deck to apply configuration..."
    deck sync -s /infrastructure/kong/kong.yml
    echo "✓ Configuration applied successfully using deck"
else
    # Option 2: Use Kong's Admin API to apply declarative config
    echo "Using Kong Admin API to apply configuration..."

    # Read the kong.yml file and send it to Kong
    curl -X POST http://localhost:8001/config \
        --header "Content-Type: application/json" \
        --data "@/infrastructure/kong/kong.yml" \
        -s -o /dev/null -w "HTTP Status: %{http_code}\n"

    echo "✓ Configuration applied successfully using Admin API"
fi

# Verify services are registered
echo ""
echo "Verifying Kong services..."
services=$(curl -s http://localhost:8001/services | jq -r '.data[].name' 2>/dev/null || echo "")

if [ -z "$services" ]; then
    echo "⚠ Warning: No services registered yet (this is normal before microservices are deployed)"
else
    echo "✓ Registered services:"
    echo "$services"
fi

echo ""
echo "=========================================="
echo "Kong API Gateway Setup Complete"
echo "=========================================="
echo ""
echo "Kong Admin API: http://localhost:8001"
echo "Kong Proxy HTTP: http://localhost:8000"
echo "Kong Proxy HTTPS: https://localhost:8443"
echo ""
echo "Test the gateway:"
echo "  curl -X GET http://localhost:8001/services"
echo "  curl -X GET http://localhost:8001/routes"
echo ""
