#!/bin/sh

# GE Proficy Historian Surrogate Entrypoint Script
# Handles configuration and startup of the surrogate server

set -e

# Default configuration values
export SURROGATE_PORT=${SURROGATE_PORT:-8080}
export SURROGATE_HOST=${SURROGATE_HOST:-0.0.0.0}
export SURROGATE_LOG_LEVEL=${SURROGATE_LOG_LEVEL:-info}
export SURROGATE_AUTH_ENABLED=${SURROGATE_AUTH_ENABLED:-true}
export SURROGATE_AUTH_USERNAME=${SURROGATE_AUTH_USERNAME:-historian}
export SURROGATE_AUTH_PASSWORD=${SURROGATE_AUTH_PASSWORD:-password}
export SURROGATE_MAX_DATA_POINTS=${SURROGATE_MAX_DATA_POINTS:-1000000}
export SURROGATE_RETENTION_HOURS=${SURROGATE_RETENTION_HOURS:-24}
export SURROGATE_COMPRESSION_ENABLED=${SURROGATE_COMPRESSION_ENABLED:-true}
export SURROGATE_ERROR_SIMULATION=${SURROGATE_ERROR_SIMULATION:-false}
export SURROGATE_RATE_LIMIT_ENABLED=${SURROGATE_RATE_LIMIT_ENABLED:-false}
export SURROGATE_CORS_ENABLED=${SURROGATE_CORS_ENABLED:-true}
export SURROGATE_SCENARIO=${SURROGATE_SCENARIO:-}
export SURROGATE_LOAD_MINIMAL_DATA=${SURROGATE_LOAD_MINIMAL_DATA:-true}

# Function to wait for dependencies (if any)
wait_for_dependencies() {
    echo "Checking dependencies..."
    # Add any dependency checks here (databases, other services, etc.)
    echo "Dependencies check complete"
}

# Function to validate configuration
validate_config() {
    echo "Validating configuration..."

    # Validate port
    if ! echo "$SURROGATE_PORT" | grep -E '^[0-9]+$' > /dev/null; then
        echo "ERROR: SURROGATE_PORT must be a number"
        exit 1
    fi

    if [ "$SURROGATE_PORT" -lt 1024 ] || [ "$SURROGATE_PORT" -gt 65535 ]; then
        echo "ERROR: SURROGATE_PORT must be between 1024 and 65535"
        exit 1
    fi

    # Validate log level
    case "$SURROGATE_LOG_LEVEL" in
        debug|info|warn|error)
            ;;
        *)
            echo "ERROR: SURROGATE_LOG_LEVEL must be one of: debug, info, warn, error"
            exit 1
            ;;
    esac

    # Validate boolean values
    case "$SURROGATE_AUTH_ENABLED" in
        true|false) ;;
        *) echo "ERROR: SURROGATE_AUTH_ENABLED must be true or false"; exit 1 ;;
    esac

    case "$SURROGATE_COMPRESSION_ENABLED" in
        true|false) ;;
        *) echo "ERROR: SURROGATE_COMPRESSION_ENABLED must be true or false"; exit 1 ;;
    esac

    case "$SURROGATE_ERROR_SIMULATION" in
        true|false) ;;
        *) echo "ERROR: SURROGATE_ERROR_SIMULATION must be true or false"; exit 1 ;;
    esac

    echo "Configuration validation complete"
}

# Function to create configuration file
create_config() {
    echo "Creating configuration file..."

    cat > /tmp/surrogate-config.json << EOF
{
  "server": {
    "port": ${SURROGATE_PORT},
    "host": "${SURROGATE_HOST}",
    "enableCors": ${SURROGATE_CORS_ENABLED},
    "requestTimeout": 30000,
    "rateLimitEnabled": ${SURROGATE_RATE_LIMIT_ENABLED},
    "rateLimitWindow": 900000,
    "rateLimitMax": 10000
  },
  "authentication": {
    "enabled": ${SURROGATE_AUTH_ENABLED},
    "authType": "basic",
    "username": "${SURROGATE_AUTH_USERNAME}",
    "password": "${SURROGATE_AUTH_PASSWORD}"
  },
  "storage": {
    "maxDataPoints": ${SURROGATE_MAX_DATA_POINTS},
    "retentionHours": ${SURROGATE_RETENTION_HOURS},
    "compressionEnabled": ${SURROGATE_COMPRESSION_ENABLED},
    "aggregationEnabled": true
  },
  "errorSimulation": {
    "enabled": ${SURROGATE_ERROR_SIMULATION},
    "errorRate": 0.01,
    "latencySimulation": false,
    "averageLatency": 50
  },
  "logging": {
    "enabled": true,
    "level": "${SURROGATE_LOG_LEVEL}"
  }
}
EOF

    export SURROGATE_CONFIG_PATH="/tmp/surrogate-config.json"
    echo "Configuration file created at $SURROGATE_CONFIG_PATH"
}

# Function to setup logging
setup_logging() {
    echo "Setting up logging..."

    # Create log directory if it doesn't exist
    mkdir -p /app/logs

    # Set log file path
    export LOG_FILE="/app/logs/surrogate.log"

    echo "Logging configured to $LOG_FILE"
}

# Function to handle shutdown signals
shutdown_handler() {
    echo "Received shutdown signal, gracefully stopping..."

    # Kill the Node.js process if it's running
    if [ ! -z "$NODE_PID" ]; then
        kill -TERM "$NODE_PID" 2>/dev/null || true
        wait "$NODE_PID" 2>/dev/null || true
    fi

    echo "Shutdown complete"
    exit 0
}

# Function to start the surrogate server
start_surrogate() {
    echo "Starting GE Proficy Historian Surrogate..."
    echo "Configuration:"
    echo "  Port: $SURROGATE_PORT"
    echo "  Host: $SURROGATE_HOST"
    echo "  Log Level: $SURROGATE_LOG_LEVEL"
    echo "  Authentication: $SURROGATE_AUTH_ENABLED"
    echo "  Scenario: ${SURROGATE_SCENARIO:-none}"
    echo "  Load Minimal Data: $SURROGATE_LOAD_MINIMAL_DATA"

    # Set environment variables for the Node.js application
    export NODE_ENV=${NODE_ENV:-production}
    export TZ=${TZ:-UTC}

    # Start the surrogate server
    if [ -n "$SURROGATE_SCENARIO" ]; then
        node dist/tests/infrastructure/proficy-historian-surrogate/bin/start-surrogate.js \
            --config "$SURROGATE_CONFIG_PATH" \
            --scenario "$SURROGATE_SCENARIO" &
    elif [ "$SURROGATE_LOAD_MINIMAL_DATA" = "true" ]; then
        node dist/tests/infrastructure/proficy-historian-surrogate/bin/start-surrogate.js \
            --config "$SURROGATE_CONFIG_PATH" \
            --load-minimal-data &
    else
        node dist/tests/infrastructure/proficy-historian-surrogate/bin/start-surrogate.js \
            --config "$SURROGATE_CONFIG_PATH" &
    fi

    NODE_PID=$!
    echo "Surrogate server started with PID: $NODE_PID"

    # Wait for the process
    wait $NODE_PID
}

# Main execution
main() {
    echo "============================================"
    echo "GE Proficy Historian Surrogate Starting..."
    echo "============================================"

    # Setup signal handlers
    trap shutdown_handler TERM INT

    # Execute startup sequence
    wait_for_dependencies
    validate_config
    create_config
    setup_logging
    start_surrogate
}

# Execute main function
main "$@"