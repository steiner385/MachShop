#!/bin/bash
# Kafka Topics Initialization Script - Phase 2, Task 2.2
# Creates all Kafka topics for MES microservices communication
# Reference: docs/PHASE_2_TASK_2.1_SERVICE_BOUNDARY_ANALYSIS.md

set -e

echo "=========================================="
echo "Initializing Kafka Topics for MES"
echo "=========================================="

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec mes-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
        echo "✓ Kafka is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts: Kafka not ready yet..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "✗ Kafka failed to start after $max_attempts attempts"
    exit 1
fi

# Function to create topic
create_topic() {
    local topic_name=$1
    local partitions=${2:-3}
    local replication=${3:-1}

    echo "Creating topic: $topic_name (partitions: $partitions, replication: $replication)"

    docker exec mes-kafka kafka-topics --create \
        --bootstrap-server localhost:9092 \
        --topic "$topic_name" \
        --partitions "$partitions" \
        --replication-factor "$replication" \
        --if-not-exists \
        --config retention.ms=604800000 \
        --config segment.ms=86400000 || echo "  ⚠ Topic $topic_name may already exist"
}

echo ""
echo "Creating Work Order Service topics..."
create_topic "work-order.created" 3 1
create_topic "work-order.updated" 3 1
create_topic "work-order.dispatched" 3 1
create_topic "work-order.started" 3 1
create_topic "work-order.completed" 3 1
create_topic "work-order.cancelled" 3 1
create_topic "work-order.on-hold" 3 1
create_topic "production-schedule.created" 3 1
create_topic "production-schedule.dispatched" 3 1

echo ""
echo "Creating Quality Service topics..."
create_topic "quality.inspection-created" 3 1
create_topic "quality.inspection-passed" 3 1
create_topic "quality.inspection-failed" 3 1
create_topic "quality.ncr-created" 3 1
create_topic "quality.ncr-closed" 3 1
create_topic "quality.capa-created" 3 1
create_topic "quality.fai-created" 3 1
create_topic "quality.fai-approved" 3 1
create_topic "quality.fai-rejected" 3 1
create_topic "quality.signature-required" 3 1
create_topic "quality.signature-completed" 3 1

echo ""
echo "Creating Material Service topics..."
create_topic "material.received" 3 1
create_topic "material.consumed" 3 1
create_topic "material.returned" 3 1
create_topic "material.scrapped" 3 1
create_topic "material.lot-created" 3 1
create_topic "material.lot-split" 3 1
create_topic "material.lot-merged" 3 1
create_topic "material.lot-quarantined" 3 1
create_topic "material.lot-released" 3 1
create_topic "material.serial-generated" 3 1
create_topic "material.inventory-adjusted" 3 1

echo ""
echo "Creating Traceability Service topics..."
create_topic "traceability.genealogy-updated" 3 1
create_topic "traceability.chain-created" 3 1
create_topic "traceability.recall-simulated" 3 1

echo ""
echo "Creating Resource Service topics..."
create_topic "equipment.status-changed" 3 1
create_topic "equipment.fault-detected" 3 1
create_topic "equipment.maintenance-required" 3 1
create_topic "equipment.oee-calculated" 3 1
create_topic "personnel.assigned" 3 1
create_topic "personnel.unassigned" 3 1
create_topic "personnel.certification-expiring" 3 1
create_topic "personnel.certification-expired" 3 1
create_topic "personnel.skill-updated" 3 1

echo ""
echo "Creating Integration Service topics..."
create_topic "integration.message-received" 3 1
create_topic "integration.message-sent" 3 1
create_topic "integration.message-failed" 3 1
create_topic "integration.erp-sync-requested" 3 1
create_topic "integration.erp-sync-completed" 3 1
create_topic "integration.plm-sync-requested" 3 1
create_topic "integration.scada-data-received" 3 1

echo ""
echo "Creating Reporting Service topics..."
create_topic "reporting.dashboard-refresh" 3 1
create_topic "reporting.report-generated" 3 1

echo ""
echo "Creating System-wide topics..."
create_topic "system.notification" 3 1
create_topic "system.audit-log" 5 1
create_topic "system.error" 3 1
create_topic "system.health-check" 1 1

echo ""
echo "Listing all topics..."
docker exec mes-kafka kafka-topics --list --bootstrap-server localhost:9092

echo ""
echo "Topic details..."
docker exec mes-kafka kafka-topics --describe --bootstrap-server localhost:9092 | head -50

echo ""
echo "=========================================="
echo "Kafka Topics Initialization Complete"
echo "=========================================="
echo ""
echo "Total topics created: $(docker exec mes-kafka kafka-topics --list --bootstrap-server localhost:9092 | wc -l)"
echo ""
echo "Kafka UI: http://localhost:8080"
echo "Kafka Broker: localhost:9092"
echo ""
echo "Test producing a message:"
echo "  docker exec -it mes-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic test"
echo ""
echo "Test consuming messages:"
echo "  docker exec -it mes-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic test --from-beginning"
echo ""
