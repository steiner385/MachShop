#!/bin/bash

# GE Proficy Historian Surrogate Docker Management Script
# Provides convenient commands for Docker operations

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Determine compose command
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    log_success "Prerequisites check passed"
}

# Function to setup environment
setup_env() {
    log_info "Setting up environment..."

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
            log_success "Created .env file from template"
            log_warning "Please review and modify $ENV_FILE as needed"
        else
            log_warning ".env file not found and no template available"
        fi
    else
        log_info ".env file already exists"
    fi

    # Source environment variables
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        log_info "Environment variables loaded from $ENV_FILE"
    fi
}

# Function to build the Docker image
build_image() {
    local force_rebuild=${1:-false}

    log_info "Building Docker image..."

    if [ "$force_rebuild" = "true" ]; then
        log_info "Force rebuilding image (no cache)..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache proficy-historian-surrogate
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" build proficy-historian-surrogate
    fi

    log_success "Docker image built successfully"
}

# Function to start services
start_services() {
    local profiles="$1"
    local detached=${2:-true}

    log_info "Starting services..."

    local compose_args="-f $COMPOSE_FILE"

    if [ -n "$profiles" ]; then
        IFS=',' read -ra PROFILE_ARRAY <<< "$profiles"
        for profile in "${PROFILE_ARRAY[@]}"; do
            compose_args="$compose_args --profile $profile"
        done
        log_info "Using profiles: $profiles"
    fi

    if [ "$detached" = "true" ]; then
        $COMPOSE_CMD $compose_args up -d
    else
        $COMPOSE_CMD $compose_args up
    fi

    log_success "Services started"
}

# Function to stop services
stop_services() {
    log_info "Stopping services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    log_success "Services stopped"
}

# Function to restart services
restart_services() {
    local profiles="$1"
    log_info "Restarting services..."
    stop_services
    start_services "$profiles"
}

# Function to show service status
show_status() {
    log_info "Service status:"
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps

    log_info ""
    log_info "Service health:"
    docker ps --filter "label=com.machshop.service=proficy-historian-surrogate" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to view logs
view_logs() {
    local service=${1:-proficy-historian-surrogate}
    local follow=${2:-false}

    log_info "Viewing logs for service: $service"

    if [ "$follow" = "true" ]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f "$service"
    else
        $COMPOSE_CMD -f "$COMPOSE_FILE" logs "$service"
    fi
}

# Function to execute command in container
exec_command() {
    local service=${1:-proficy-historian-surrogate}
    local command=${2:-sh}

    log_info "Executing command in $service: $command"
    $COMPOSE_CMD -f "$COMPOSE_FILE" exec "$service" $command
}

# Function to run health check
health_check() {
    log_info "Running health check..."

    if docker ps | grep -q "proficy-historian-surrogate"; then
        docker exec proficy-historian-surrogate ./healthcheck.sh status
    else
        log_error "Surrogate container is not running"
        exit 1
    fi
}

# Function to cleanup Docker resources
cleanup() {
    local force=${1:-false}

    log_info "Cleaning up Docker resources..."

    # Stop and remove containers
    $COMPOSE_CMD -f "$COMPOSE_FILE" down --volumes

    if [ "$force" = "true" ]; then
        log_warning "Force cleanup: removing images and volumes..."

        # Remove images
        docker images | grep "machshop/proficy-historian-surrogate" | awk '{print $3}' | xargs -r docker rmi

        # Remove volumes
        docker volume ls | grep "historian_" | awk '{print $2}' | xargs -r docker volume rm

        # Prune unused resources
        docker system prune -f
    fi

    log_success "Cleanup completed"
}

# Function to run load test
run_load_test() {
    log_info "Running load test..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --profile testing run --rm load-test
    log_success "Load test completed"
}

# Function to show help
show_help() {
    cat << EOF
GE Proficy Historian Surrogate Docker Management Script

Usage: $0 <command> [options]

Commands:
    build           Build the Docker image
    build --force   Build the Docker image without cache
    start           Start the surrogate service
    start --monitoring    Start with monitoring services
    start --all     Start with all optional services
    stop            Stop all services
    restart         Restart the surrogate service
    status          Show service status and health
    logs            Show logs for the surrogate service
    logs --follow   Follow logs in real-time
    logs <service>  Show logs for specific service
    shell           Open shell in the surrogate container
    exec <cmd>      Execute command in the surrogate container
    health          Run health check
    test            Run load test
    cleanup         Stop services and remove containers
    cleanup --force Remove everything including images and volumes
    help            Show this help message

Environment:
    Configuration is loaded from .env file
    Copy .env.example to .env and modify as needed

Examples:
    $0 build                    # Build the Docker image
    $0 start                    # Start basic surrogate service
    $0 start --monitoring       # Start with Prometheus and Grafana
    $0 logs --follow            # Follow logs in real-time
    $0 exec "ls -la /app"       # Execute command in container
    $0 health                   # Check service health
    $0 cleanup --force          # Complete cleanup

EOF
}

# Main execution
main() {
    # Change to script directory
    cd "$SCRIPT_DIR"

    # Parse command
    local command="${1:-help}"
    shift || true

    case "$command" in
        "build")
            check_prerequisites
            setup_env
            if [ "$1" = "--force" ]; then
                build_image true
            else
                build_image false
            fi
            ;;
        "start")
            check_prerequisites
            setup_env
            case "$1" in
                "--monitoring")
                    start_services "monitoring"
                    ;;
                "--all")
                    start_services "monitoring,testing,logging"
                    ;;
                "--foreground")
                    start_services "" false
                    ;;
                *)
                    start_services ""
                    ;;
            esac
            ;;
        "stop")
            check_prerequisites
            stop_services
            ;;
        "restart")
            check_prerequisites
            setup_env
            if [ "$1" = "--monitoring" ]; then
                restart_services "monitoring"
            else
                restart_services ""
            fi
            ;;
        "status")
            check_prerequisites
            show_status
            ;;
        "logs")
            check_prerequisites
            if [ "$1" = "--follow" ]; then
                view_logs "proficy-historian-surrogate" true
            elif [ -n "$1" ] && [ "$1" != "--follow" ]; then
                view_logs "$1" false
            else
                view_logs "proficy-historian-surrogate" false
            fi
            ;;
        "shell")
            check_prerequisites
            exec_command "proficy-historian-surrogate" "sh"
            ;;
        "exec")
            check_prerequisites
            exec_command "proficy-historian-surrogate" "$*"
            ;;
        "health")
            check_prerequisites
            health_check
            ;;
        "test")
            check_prerequisites
            setup_env
            run_load_test
            ;;
        "cleanup")
            check_prerequisites
            if [ "$1" = "--force" ]; then
                cleanup true
            else
                cleanup false
            fi
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"