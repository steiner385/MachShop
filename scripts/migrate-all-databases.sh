#!/bin/bash

###############################################################################
# Database Migration Script for All Microservices
# Phase 2, Task 2.3: Database Per Service Pattern
#
# This script runs Prisma migrations for all 8 microservice databases.
# It should be run after starting docker-compose.databases.yml
#
# Usage:
#   ./scripts/migrate-all-databases.sh [dev|deploy|reset]
#
# Commands:
#   dev    - Create and apply migrations (development)
#   deploy - Apply existing migrations only (production)
#   reset  - Reset all databases (DESTRUCTIVE!)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default command
COMMAND="${1:-dev}"

# Service definitions
declare -A SERVICES=(
  ["auth"]="services/auth"
  ["work-order"]="services/work-order"
  ["quality"]="services/quality"
  ["material"]="services/material"
  ["traceability"]="services/traceability"
  ["resource"]="services/resource"
  ["reporting"]="services/reporting"
  ["integration"]="services/integration"
)

# Database URLs (from .env)
declare -A DB_URLS=(
  ["auth"]="AUTH_DATABASE_URL"
  ["work-order"]="WORK_ORDER_DATABASE_URL"
  ["quality"]="QUALITY_DATABASE_URL"
  ["material"]="MATERIAL_DATABASE_URL"
  ["traceability"]="TRACEABILITY_DATABASE_URL"
  ["resource"]="RESOURCE_DATABASE_URL"
  ["reporting"]="REPORTING_DATABASE_URL"
  ["integration"]="INTEGRATION_DATABASE_URL"
)

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_service() {
  echo -e "${YELLOW}▶ Service: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

check_docker_compose() {
  print_header "Checking Docker Compose Services"

  if ! docker compose -f docker-compose.databases.yml ps | grep -q "Up"; then
    print_error "Docker Compose databases are not running!"
    echo ""
    echo "Please start the databases first:"
    echo "  docker compose -f docker-compose.databases.yml up -d"
    exit 1
  fi

  print_success "Docker Compose databases are running"
}

check_env_file() {
  if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    echo ""
    echo "Please create .env from .env.example:"
    echo "  cp .env.example .env"
    exit 1
  fi

  print_success ".env file found"
}

wait_for_databases() {
  print_header "Waiting for Databases to be Ready"

  local max_attempts=30
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if docker compose -f docker-compose.databases.yml exec -T postgres-auth pg_isready -U mes_auth_user > /dev/null 2>&1; then
      print_success "All databases are ready"
      return 0
    fi

    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
  done

  print_error "Databases failed to become ready after $max_attempts attempts"
  exit 1
}

###############################################################################
# Migration Functions
###############################################################################

migrate_service_dev() {
  local service_name=$1
  local service_path=$2
  local db_url_var=$3

  print_service "$service_name"

  cd "$service_path"

  # Check if schema exists
  if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Schema not found: $service_path/prisma/schema.prisma"
    cd - > /dev/null
    return 1
  fi

  # Generate migration name
  local migration_name="init_${service_name//-/_}_schema"

  # Run migration
  echo "  Running: prisma migrate dev --name $migration_name"

  if npx prisma migrate dev --name "$migration_name" --skip-generate < /dev/null; then
    print_success "Migration completed for $service_name"
  else
    print_error "Migration failed for $service_name"
    cd - > /dev/null
    return 1
  fi

  # Generate Prisma Client
  echo "  Generating Prisma Client..."
  if npx prisma generate; then
    print_success "Prisma Client generated for $service_name"
  else
    print_error "Prisma Client generation failed for $service_name"
  fi

  cd - > /dev/null
  echo ""
}

migrate_service_deploy() {
  local service_name=$1
  local service_path=$2

  print_service "$service_name"

  cd "$service_path"

  if npx prisma migrate deploy; then
    print_success "Migration deployed for $service_name"
  else
    print_error "Migration deployment failed for $service_name"
    cd - > /dev/null
    return 1
  fi

  cd - > /dev/null
  echo ""
}

reset_service_database() {
  local service_name=$1
  local service_path=$2

  print_service "$service_name"

  cd "$service_path"

  echo "  Resetting database..."
  if npx prisma migrate reset --force --skip-generate < /dev/null; then
    print_success "Database reset for $service_name"
  else
    print_error "Database reset failed for $service_name"
    cd - > /dev/null
    return 1
  fi

  cd - > /dev/null
  echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header "MES Database Migration - $COMMAND"

  # Pre-flight checks
  check_env_file

  if [ "$COMMAND" != "generate" ]; then
    check_docker_compose
    wait_for_databases
  fi

  # Track results
  local success_count=0
  local fail_count=0
  local total_count=${#SERVICES[@]}

  print_header "Running Migrations"

  # Process each service
  for service_name in "${!SERVICES[@]}"; do
    service_path="${SERVICES[$service_name]}"
    db_url_var="${DB_URLS[$service_name]}"

    case $COMMAND in
      dev)
        if migrate_service_dev "$service_name" "$service_path" "$db_url_var"; then
          success_count=$((success_count + 1))
        else
          fail_count=$((fail_count + 1))
        fi
        ;;
      deploy)
        if migrate_service_deploy "$service_name" "$service_path"; then
          success_count=$((success_count + 1))
        else
          fail_count=$((fail_count + 1))
        fi
        ;;
      reset)
        echo -e "${RED}WARNING: This will delete all data!${NC}"
        read -p "Are you sure? (yes/NO): " confirm
        if [ "$confirm" = "yes" ]; then
          if reset_service_database "$service_name" "$service_path"; then
            success_count=$((success_count + 1))
          else
            fail_count=$((fail_count + 1))
          fi
        else
          print_error "Reset cancelled for $service_name"
          fail_count=$((fail_count + 1))
        fi
        ;;
      generate)
        print_service "$service_name"
        cd "$service_path"
        if npx prisma generate; then
          print_success "Prisma Client generated for $service_name"
          success_count=$((success_count + 1))
        else
          print_error "Prisma Client generation failed for $service_name"
          fail_count=$((fail_count + 1))
        fi
        cd - > /dev/null
        echo ""
        ;;
      *)
        print_error "Unknown command: $COMMAND"
        echo ""
        echo "Usage: $0 [dev|deploy|reset|generate]"
        exit 1
        ;;
    esac
  done

  # Summary
  print_header "Migration Summary"
  echo -e "Total Services:    $total_count"
  echo -e "${GREEN}Successful:        $success_count${NC}"

  if [ $fail_count -gt 0 ]; then
    echo -e "${RED}Failed:            $fail_count${NC}"
    exit 1
  else
    echo -e "${GREEN}All migrations completed successfully!${NC}"
  fi
}

# Run main
main
