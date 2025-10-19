#!/bin/bash

###############################################################################
# Database Health Check Script
# Phase 2, Task 2.3: Database Per Service Pattern
#
# Checks health of all database infrastructure components
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_service() {
  local service_name=$1
  local check_command=$2

  echo -n "  Checking $service_name... "

  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
    return 0
  else
    echo -e "${RED}✗ Unhealthy${NC}"
    return 1
  fi
}

###############################################################################
# Main Health Checks
###############################################################################

print_header "MES Database Health Check"

total_checks=0
passed_checks=0

# Check Docker Compose
print_header "Docker Compose Services"
if docker compose -f docker-compose.databases.yml ps > /dev/null 2>&1; then
  docker compose -f docker-compose.databases.yml ps
  echo ""
else
  echo -e "${RED}✗ Docker Compose not running${NC}"
  echo "Start with: docker compose -f docker-compose.databases.yml up -d"
  exit 1
fi

# Check PostgreSQL Databases
print_header "PostgreSQL Databases"

databases=(
  "postgres-auth:mes_auth_user:mes_auth"
  "postgres-work-order:mes_wo_user:mes_work_order"
  "postgres-quality:mes_quality_user:mes_quality"
  "postgres-material:mes_material_user:mes_material"
  "postgres-traceability:mes_trace_user:mes_traceability"
  "postgres-resource:mes_resource_user:mes_resource"
  "postgres-reporting:mes_reporting_user:mes_reporting"
  "postgres-integration:mes_integration_user:mes_integration"
)

for db_info in "${databases[@]}"; do
  IFS=':' read -r container user dbname <<< "$db_info"
  total_checks=$((total_checks + 1))

  if check_service "$container" \
    "docker compose -f docker-compose.databases.yml exec -T $container pg_isready -U $user -d $dbname"; then
    passed_checks=$((passed_checks + 1))
  fi
done

echo ""

# Check Kafka
print_header "Kafka Broker"
total_checks=$((total_checks + 1))

if check_service "Kafka" \
  "docker compose -f docker-compose.databases.yml exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092"; then
  passed_checks=$((passed_checks + 1))
fi

echo ""

# Check Redis
print_header "Redis Cache"
total_checks=$((total_checks + 1))

if check_service "Redis" \
  "docker compose -f docker-compose.databases.yml exec -T redis redis-cli ping | grep -q PONG"; then
  passed_checks=$((passed_checks + 1))
fi

echo ""

# Summary
print_header "Health Check Summary"
echo -e "Total Checks:      $total_checks"
echo -e "${GREEN}Passed:            $passed_checks${NC}"

failed_checks=$((total_checks - passed_checks))
if [ $failed_checks -gt 0 ]; then
  echo -e "${RED}Failed:            $failed_checks${NC}"
  exit 1
else
  echo -e "${GREEN}All systems healthy!${NC}"
fi
