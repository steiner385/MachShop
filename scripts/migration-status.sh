#!/bin/bash

###############################################################################
# Migration Status Script
# Phase 2, Task 2.3: Database Per Service Pattern
#
# Shows migration status for all microservices
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Service paths
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

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_service_header() {
  echo -e "${YELLOW}▶ $1${NC}"
}

get_migration_count() {
  local service_path=$1
  local migrations_dir="$service_path/prisma/migrations"

  if [ -d "$migrations_dir" ]; then
    # Count subdirectories (each migration is a directory)
    find "$migrations_dir" -mindepth 1 -maxdepth 1 -type d | wc -l
  else
    echo "0"
  fi
}

get_last_migration() {
  local service_path=$1
  local migrations_dir="$service_path/prisma/migrations"

  if [ -d "$migrations_dir" ]; then
    # Get the most recent migration directory
    local last_migration=$(ls -t "$migrations_dir" 2>/dev/null | grep -v migration_lock.toml | head -1)
    if [ -n "$last_migration" ]; then
      echo "$last_migration"
    else
      echo "None"
    fi
  else
    echo "None"
  fi
}

check_pending_migrations() {
  local service_path=$1

  cd "$service_path"

  # Run prisma migrate status and capture output
  local status_output=$(npx prisma migrate status 2>&1 || true)

  if echo "$status_output" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✓ Up to date${NC}"
  elif echo "$status_output" | grep -q "pending migration"; then
    echo -e "${YELLOW}⚠ Pending migrations${NC}"
  elif echo "$status_output" | grep -q "No migration found"; then
    echo -e "${YELLOW}⚠ No migrations applied${NC}"
  else
    echo -e "${RED}✗ Status unknown${NC}"
  fi

  cd - > /dev/null
}

###############################################################################
# Main Execution
###############################################################################

print_header "Migration Status Report"

total_migrations=0

for service_name in "${!SERVICES[@]}"; do
  service_path="${SERVICES[$service_name]}"

  print_service_header "$service_name Service"

  # Count migrations
  migration_count=$(get_migration_count "$service_path")
  total_migrations=$((total_migrations + migration_count))

  # Get last migration
  last_migration=$(get_last_migration "$service_path")

  # Check pending
  echo -n "  Status:           "
  check_pending_migrations "$service_path"

  echo "  Total Migrations: $migration_count"
  echo "  Last Migration:   $last_migration"

  # Show migration files if requested
  if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
    echo -e "  ${BLUE}Migrations:${NC}"
    migrations_dir="$service_path/prisma/migrations"
    if [ -d "$migrations_dir" ]; then
      ls -1 "$migrations_dir" | grep -v migration_lock.toml | while read -r migration; do
        echo "    - $migration"
      done
    else
      echo "    (none)"
    fi
  fi

  echo ""
done

# Summary
print_header "Summary"
echo "Total Services:    ${#SERVICES[@]}"
echo "Total Migrations:  $total_migrations"
echo ""

if [ "$1" != "--detailed" ] && [ "$1" != "-d" ]; then
  echo "Tip: Use --detailed or -d flag to see all migration files"
fi
