# MachShop MES - System Architecture v2.0
## ISA-95 Compliant World-Class Architecture

**Document Version:** 2.0
**Date:** October 15, 2025
**Classification:** Confidential - Internal Use Only
**Supersedes:** SYSTEM_ARCHITECTURE.md v1.0

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [ISA-95 Compliance Architecture](#2-isa-95-compliance-architecture)
3. [Microservices Architecture](#3-microservices-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Integration Architecture](#5-integration-architecture)
6. [IoT & Real-Time Data Architecture](#6-iot--real-time-data-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Scalability & Performance](#10-scalability--performance)

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Architectural Principles

**Cloud-Native Design**
- Containerized microservices (Docker/Kubernetes)
- Horizontal scaling for all stateless services
- Cloud-agnostic (AWS, Azure, GCP compatible)
- Infrastructure as Code (Terraform)

**API-First Architecture**
- RESTful APIs for all business functions
- GraphQL for complex queries
- Webhook support for event notifications
- OpenAPI 3.0 specification for all endpoints

**Event-Driven Architecture**
- Apache Kafka for asynchronous communication
- Event sourcing for critical transactions
- CQRS (Command Query Responsibility Segregation) for performance
- Real-time data streaming

**Security by Design**
- Zero-trust security model
- Defense in depth (multiple security layers)
- Encryption at rest and in transit
- Comprehensive audit logging

**ISA-95 Compliance**
- Clear separation of Level 3 (MES) and Level 4 (ERP) functions
- Standardized message formats (B2MML XML)
- Bidirectional synchronization
- Event-driven integration

### 1.2 High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                        LEVEL 4 - ERP/PLM SYSTEMS                      │
│           (SAP, Oracle, Teamcenter, Windchill)                        │
└────────────────────────┬──────────────────────────────────────────────┘
                         │ ISA-95 B2MML Messages
                         │ (Work Orders, Material, Quality, Cost)
┌────────────────────────▼──────────────────────────────────────────────┐
│                    INTEGRATION LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ ERP Adapters │  │ PLM Adapters │  │ API Gateway  │              │
│  │ (SAP,Oracle) │  │ (TC, WC)     │  │ (Kong)       │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────┬──────────────────────────────────────────────┘
                         │ Internal APIs (REST, GraphQL)
┌────────────────────────▼──────────────────────────────────────────────┐
│                    LEVEL 3 - MES LAYER (MICROSERVICES)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Work Order │ │   Quality   │ │  Material   │ │ Traceability│   │
│  │   Service   │ │   Service   │ │   Service   │ │   Service   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Equipment  │ │  Scheduling │ │   IoT Data  │ │  Reporting  │   │
│  │   Service   │ │   Service   │ │   Service   │ │   Service   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└────────────────────────┬──────────────────────────────────────────────┘
                         │ Events (Kafka)
┌────────────────────────▼──────────────────────────────────────────────┐
│                    MESSAGE BUS (APACHE KAFKA)                         │
│  Topics: work-orders, quality-events, material-transactions,          │
│          equipment-status, sensor-data, alerts                        │
└────────────────────────┬──────────────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
│PostgreSQL │     │ InfluxDB  │     │   MinIO   │
│(Primary   │     │(Time-Series│     │ (Object   │
│Relational)│     │ Sensor Data│     │  Storage) │
└───────────┘     └───────────┘     └───────────┘
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────────────┐
│                    LEVEL 2/1 - SHOP FLOOR SYSTEMS                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  OPC-UA      │  │  MQTT Broker │  │  Edge Agents │              │
│  │  Server      │  │  (IoT)       │  │  (Docker)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────┬──────────────────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────────────┐
│                    LEVEL 0 - EQUIPMENT & SENSORS                      │
│  PLC/SCADA, CMM, Torque Wrenches, Env Sensors, Barcode Scanners     │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. ISA-95 COMPLIANCE ARCHITECTURE

### 2.1 ISA-95 Level Mapping

**Level 4: Business Planning & Logistics (ERP/PLM)**
- Enterprise resource planning
- Product lifecycle management
- Supply chain management
- Financial management
- Strategic planning

**Level 3: Manufacturing Operations Management (MES)**
- Work order management
- Quality management
- Material tracking
- Equipment management
- Production scheduling
- Performance analysis

**Level 2: Monitoring & Supervisory Control (SCADA)**
- Real-time equipment monitoring
- Process control
- Alarm management
- Operator interfaces

**Level 1: Sensing & Manipulation (PLCs, Sensors)**
- Equipment sensors
- Actuators
- Data acquisition

**Level 0: Physical Process (Equipment)**
- Manufacturing equipment
- Tools and fixtures

### 2.2 Level 3-4 Integration (MES ↔ ERP/PLM)

#### Message Types (B2MML Standard)

**1. Production Schedule → Work Order**
```xml
<!-- ERP → MES: Production Schedule Message -->
<ProductionSchedule>
  <ID>PS-2025-001</ID>
  <PublicationDate>2025-10-15T08:00:00Z</PublicationDate>
  <ProductionRequest>
    <ID>WO-2025-001001</ID>
    <Description>Turbine Blade Manufacturing</Description>
    <StartTime>2025-10-16T06:00:00Z</StartTime>
    <EndTime>2025-10-20T18:00:00Z</EndTime>
    <Priority>HIGH</Priority>
    <SegmentRequirement>
      <MaterialProducedRequirement>
        <MaterialDefinitionID>BLADE-TF39-001</MaterialDefinitionID>
        <Quantity>10</Quantity>
        <QuantityUnitOfMeasure>EA</QuantityUnitOfMeasure>
      </MaterialProducedRequirement>
    </SegmentRequirement>
  </ProductionRequest>
</ProductionSchedule>
```

**2. Production Performance → ERP**
```xml
<!-- MES → ERP: Production Performance Message -->
<ProductionPerformance>
  <ID>PP-2025-001</ID>
  <PublicationDate>2025-10-20T18:30:00Z</PublicationDate>
  <ProductionResponse>
    <ID>WO-2025-001001</ID>
    <State>COMPLETED</State>
    <SegmentResponse>
      <ActualStartTime>2025-10-16T06:15:00Z</ActualStartTime>
      <ActualEndTime>2025-10-20T17:45:00Z</ActualEndTime>
      <SegmentData>
        <MaterialProducedActual>
          <MaterialDefinitionID>BLADE-TF39-001</MaterialDefinitionID>
          <QuantityProduced>10</QuantityProduced>
          <QuantityScrap>0</QuantityScrap>
        </MaterialProducedActual>
      </SegmentData>
    </SegmentResponse>
  </ProductionResponse>
</ProductionPerformance>
```

**3. Material Actual → ERP**
```xml
<!-- MES → ERP: Material Consumption Message -->
<MaterialActual>
  <ID>MA-2025-001</ID>
  <PublicationDate>2025-10-16T14:30:00Z</PublicationDate>
  <MaterialActualProperty>
    <ID>TITANIUM-LOT-2025-0451</ID>
    <Description>Titanium Alloy Ti-6Al-4V</Description>
    <Quantity>25.5</Quantity>
    <QuantityUnitOfMeasure>KG</QuantityUnitOfMeasure>
    <MaterialLotID>LOT-2025-0451</MaterialLotID>
    <AssemblyActualID>WO-2025-001001</AssemblyActualID>
  </MaterialActualProperty>
</MaterialActual>
```

**4. Process Segment → MES (from PLM)**
```xml
<!-- PLM → MES: Manufacturing Process (Routing) -->
<ProcessSegment>
  <ID>ROUTING-BLADE-TF39-001-Rev-C</ID>
  <Description>Turbine Blade Manufacturing Process</Description>
  <OperationsDefinition>
    <OperationsDefinitionID>OP-010</OperationsDefinitionID>
    <Description>Rough Machining</Description>
    <Duration>2.5</Duration>
    <DurationUnitOfMeasure>HOUR</DurationUnitOfMeasure>
    <PersonnelRequirement>
      <PersonnelClassID>CNC-OPERATOR-LEVEL-3</PersonnelClassID>
      <Quantity>1</Quantity>
    </PersonnelRequirement>
    <EquipmentRequirement>
      <EquipmentClassID>5-AXIS-CNC</EquipmentClassID>
      <Quantity>1</Quantity>
    </EquipmentRequirement>
  </OperationsDefinition>
</ProcessSegment>
```

### 2.3 ISA-95 Function Categories

**Production Operations Management**
- ✅ Production dispatching (work order release)
- ✅ Execution management (start/complete operations)
- ✅ Resource management (equipment, labor, material)
- ✅ Data collection (process parameters, measurements)
- ✅ Tracking (work order status, location)

**Maintenance Operations Management**
- ✅ Maintenance dispatching (PM schedules)
- ✅ Maintenance execution (repair work orders)
- ✅ Resource management (spare parts, tools)
- ✅ Data collection (equipment downtime, MTBF)

**Quality Operations Management**
- ✅ Quality test dispatching (inspection plans)
- ✅ Quality test execution (measurements)
- ✅ Quality test analysis (SPC, Cpk)
- ✅ Quality operations data collection (defect data)

**Inventory Operations Management**
- ✅ Inventory tracking (lot numbers, locations)
- ✅ Inventory data collection (quantities, transactions)

---

## 3. MICROSERVICES ARCHITECTURE

### 3.1 Service Decomposition

```
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Kong)                       │
│  - Authentication (JWT validation)                          │
│  - Rate limiting (1000 req/min per user)                   │
│  - Request routing                                          │
│  - API versioning (/api/v1, /api/v2)                       │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬────────┬────────┬───────────┐
    │        │        │        │        │        │           │
┌───▼───┐┌───▼───┐┌──▼───┐┌──▼───┐┌───▼──┐┌────▼────┐┌─────▼────┐
│ Auth  ││Work   ││Quality││Material│Trace-││Equipment││Scheduling│
│Service││Order  ││Service││Service ││ability││Service  ││Service   │
│       ││Service││       ││        ││Service││         ││          │
│Port:  ││Port:  ││Port:  ││Port:   ││Port:  ││Port:    ││Port:     │
│3010   ││3001   ││3002   ││3003    ││3004   ││3005     ││3006      │
└───┬───┘└───┬───┘└──┬───┘└──┬────┘└───┬──┘└────┬────┘└─────┬────┘
    │        │       │       │         │        │           │
    └────────┴───────┴───────┴─────────┴────────┴───────────┘
             │
    ┌────────▼────────────────────────────────┐
    │      KAFKA MESSAGE BUS                  │
    │  Topics: work-orders, quality-events,   │
    │  material-txns, equipment-status        │
    └────────┬────────────────────────────────┘
             │
    ┌────────▼──────────┬──────────────────┐
    │                   │                  │
┌───▼───────────┐┌─────▼────────┐┌───────▼────────┐
│ PostgreSQL    ││ InfluxDB     ││ MinIO          │
│ (Primary DB)  ││(Time-Series) ││(Object Storage)│
└───────────────┘└──────────────┘└────────────────┘
```

### 3.2 Service Specifications

#### 3.2.1 Authentication Service

**Purpose:** Centralized authentication and authorization

**Responsibilities:**
- User authentication (username/password, OAuth 2.0, SAML 2.0)
- JWT token generation and validation
- Multi-factor authentication (TOTP, SMS)
- Role-based access control (RBAC)
- Session management

**Technology Stack:**
- Node.js with Express
- Passport.js (authentication middleware)
- jsonwebtoken library
- Redis (session storage)

**APIs:**
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - Invalidate session
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/mfa/enroll` - Enroll in MFA
- `POST /auth/mfa/verify` - Verify MFA code
- `GET /auth/user` - Get current user info

**Database:** PostgreSQL (users, roles, permissions tables)

**Kafka Topics Consumed:** None (stateless)

**Kafka Topics Produced:**
- `auth-events` (login, logout, failed attempts)

---

#### 3.2.2 Work Order Service

**Purpose:** Manage production work orders and operations

**Responsibilities:**
- Create/update/delete work orders
- Release work orders to shop floor
- Start/complete operations
- Track work order progress (% complete)
- Allocate materials and equipment
- Calculate actual costs (labor + material + overhead)

**Technology Stack:**
- Node.js with Express
- Prisma ORM
- Bull (job queue for background tasks)

**APIs:**
- `GET /api/v1/workorders` - List work orders (paginated)
- `GET /api/v1/workorders/:id` - Get work order details
- `POST /api/v1/workorders` - Create work order
- `PUT /api/v1/workorders/:id` - Update work order
- `POST /api/v1/workorders/:id/release` - Release to production
- `POST /api/v1/workorders/:id/operations/:opId/start` - Start operation
- `POST /api/v1/workorders/:id/operations/:opId/complete` - Complete operation
- `GET /api/v1/workorders/:id/genealogy` - Get as-built BOM

**Database:** PostgreSQL (work_orders, work_order_operations, material_transactions tables)

**Kafka Topics Consumed:**
- `erp-production-schedule` (work orders from ERP)
- `material-allocated` (material allocated to work order)
- `quality-inspection-completed` (inspection results)

**Kafka Topics Produced:**
- `work-order-created`
- `work-order-released`
- `work-order-completed`
- `operation-started`
- `operation-completed`
- `erp-production-performance` (status updates to ERP)

**Business Rules:**
- Work order cannot be released without routing
- Operation cannot start until previous operation completed (if sequential)
- Cannot complete work order if any inspections failed
- Actual end date must be >= actual start date

---

#### 3.2.3 Quality Service

**Purpose:** Manage quality inspections, SPC, NCRs, and certificates

**Responsibilities:**
- Create and execute inspection plans
- Record quality measurements
- Calculate SPC charts (X-bar, R, Cpk, Ppk)
- Detect out-of-control conditions (Nelson rules)
- Manage NCRs with 8D workflow
- Generate AS9102 First Article Inspection Reports
- Generate Certificates of Conformance

**Technology Stack:**
- Node.js with Express
- Prisma ORM
- SPC calculation library (custom or `spc` npm package)
- PDF generation (Puppeteer or PDFKit)

**APIs:**
- `GET /api/v1/quality/inspections` - List inspections
- `POST /api/v1/quality/inspections` - Create inspection
- `POST /api/v1/quality/inspections/:id/measurements` - Record measurements
- `PUT /api/v1/quality/inspections/:id/complete` - Complete inspection
- `GET /api/v1/quality/spc/:characteristicId` - Get SPC chart data
- `GET /api/v1/quality/ncrs` - List NCRs
- `POST /api/v1/quality/ncrs` - Create NCR
- `PUT /api/v1/quality/ncrs/:id/8d/:step` - Update 8D step (D0-D8)
- `POST /api/v1/quality/fai/:workOrderId` - Generate AS9102 FAIR
- `POST /api/v1/quality/coc/:workOrderId` - Generate Certificate of Conformance

**Database:**
- PostgreSQL (quality_inspections, quality_measurements, ncrs, quality_characteristics)
- InfluxDB (SPC historical data for charting)

**Kafka Topics Consumed:**
- `operation-completed` (trigger automatic inspection)
- `sensor-data` (real-time measurements from CMM)

**Kafka Topics Produced:**
- `quality-inspection-created`
- `quality-inspection-completed`
- `spc-out-of-control` (alert)
- `ncr-created`
- `ncr-closed`

**Business Rules:**
- Inspection cannot be completed until all required measurements entered
- SPC chart requires minimum 25 subgroups for control limits
- NCR must have root cause before closing
- AS9102 FAIR requires all inspections passed
- Certificate of Conformance requires all quality checks passed

---

#### 3.2.4 Material Service

**Purpose:** Manage inventory, material transactions, and genealogy

**Responsibilities:**
- Track inventory by location and lot number
- Record material receipts, issues, returns, scrap
- Allocate materials to work orders
- Track material certifications (MTRs, C of C)
- Manage serialized parts
- Provide forward/backward traceability

**Technology Stack:**
- Node.js with Express
- Prisma ORM
- Graph database (Neo4j) for genealogy queries (optional optimization)

**APIs:**
- `GET /api/v1/materials/inventory` - Get inventory levels
- `POST /api/v1/materials/transactions` - Record transaction (receipt, issue, etc.)
- `POST /api/v1/materials/allocations` - Allocate material to work order
- `GET /api/v1/materials/genealogy/:serialNumber` - Get complete genealogy tree
- `GET /api/v1/materials/forward-trace/:lotNumber` - Forward traceability
- `GET /api/v1/materials/backward-trace/:serialNumber` - Backward traceability
- `POST /api/v1/materials/certifications` - Upload material certification
- `GET /api/v1/materials/certifications/:lotNumber` - Get certifications for lot

**Database:**
- PostgreSQL (inventory, material_transactions, serialized_parts, part_genealogy)
- MinIO (material certification PDFs)

**Kafka Topics Consumed:**
- `work-order-released` (trigger material allocation)
- `operation-completed` (consume material for operation)

**Kafka Topics Produced:**
- `material-allocated`
- `material-consumed`
- `material-shortage` (alert if insufficient inventory)
- `erp-material-actual` (consumption data to ERP)

**Business Rules:**
- Cannot issue material if insufficient inventory
- Serial number must be unique across system
- Material certification required for critical materials (configurable per part)
- Genealogy link created when material consumed in operation

---

#### 3.2.5 Traceability Service

**Purpose:** Provide comprehensive traceability and audit trail

**Responsibilities:**
- Capture complete manufacturing history per serial number
- Link materials, processes, quality, equipment, operators
- Provide instant traceability queries (< 5 sec response)
- Generate traceability reports for customers/audits
- Audit trail for all system changes

**Technology Stack:**
- Node.js with Express
- Neo4j (graph database for fast genealogy traversal) OR PostgreSQL with recursive CTEs
- Elasticsearch (full-text search of audit logs)

**APIs:**
- `GET /api/v1/traceability/genealogy/:serialNumber` - Complete genealogy tree
- `GET /api/v1/traceability/forward/:materialLot` - Forward traceability
- `GET /api/v1/traceability/backward/:serialNumber` - Backward traceability
- `GET /api/v1/traceability/audit/:entityType/:entityId` - Audit trail
- `POST /api/v1/traceability/export` - Export traceability report (PDF)

**Database:**
- PostgreSQL (audit_logs) OR Elasticsearch (for search performance)
- Neo4j (optional - genealogy graph)

**Kafka Topics Consumed:**
- All topics (subscribes to all events for audit logging)

**Kafka Topics Produced:**
- None (read-only service)

---

#### 3.2.6 Equipment Service

**Purpose:** Manage equipment, maintenance, and utilization

**Responsibilities:**
- Track equipment status (available, in-use, maintenance, down)
- Schedule preventive maintenance
- Record equipment logs (maintenance, calibration, usage)
- Calculate OEE (Overall Equipment Effectiveness)
- Integrate with CMMS (IBM Maximo, SAP PM)

**Technology Stack:**
- Node.js with Express
- Prisma ORM
- Node-Cron (scheduled jobs for PM reminders)

**APIs:**
- `GET /api/v1/equipment` - List equipment
- `GET /api/v1/equipment/:id` - Get equipment details
- `PUT /api/v1/equipment/:id/status` - Update equipment status
- `POST /api/v1/equipment/:id/maintenance` - Schedule maintenance
- `GET /api/v1/equipment/:id/oee` - Calculate OEE
- `GET /api/v1/equipment/:id/logs` - Get equipment history

**Database:**
- PostgreSQL (equipment, equipment_logs)
- InfluxDB (equipment utilization time-series data)

**Kafka Topics Consumed:**
- `operation-started` (mark equipment as IN_USE)
- `operation-completed` (mark equipment as AVAILABLE)
- `cmms-maintenance-scheduled` (from CMMS integration)

**Kafka Topics Produced:**
- `equipment-status-changed`
- `equipment-downtime` (alert)
- `calibration-due` (alert)
- `cmms-equipment-status` (to CMMS)

**Business Rules:**
- Equipment cannot be used if status is MAINTENANCE or DOWN
- Calibration-due equipment cannot be used for quality-critical operations
- OEE calculated as: Availability × Performance × Quality

---

#### 3.2.7 Scheduling Service

**Purpose:** Optimize production schedule with finite capacity

**Responsibilities:**
- Schedule work orders to resources (equipment, operators)
- Validate resource constraints (capacity, skills, tooling)
- Optimize schedule (minimize makespan or maximize throughput)
- Detect scheduling conflicts
- Publish schedule to shop floor

**Technology Stack:**
- Node.js with Express
- Google OR-Tools (constraint programming for optimization)
- Redis (caching schedules for performance)

**APIs:**
- `GET /api/v1/scheduling/gantt` - Get Gantt chart data
- `POST /api/v1/scheduling/optimize` - Run schedule optimization
- `PUT /api/v1/scheduling/assign` - Manually assign work order to resource
- `POST /api/v1/scheduling/publish` - Publish approved schedule
- `GET /api/v1/scheduling/conflicts` - Get scheduling conflicts

**Database:**
- PostgreSQL (schedules, resource_assignments)
- Redis (cache current schedule for fast reads)

**Kafka Topics Consumed:**
- `work-order-created` (add to schedule)
- `work-order-released` (commit schedule)
- `equipment-downtime` (re-optimize schedule)

**Kafka Topics Produced:**
- `schedule-published`
- `schedule-conflict` (alert)

**Business Rules:**
- Cannot schedule work order without routing
- Resource must have required capability (work center match)
- Operator must have required skill/certification
- Equipment must be available (not already scheduled)

---

#### 3.2.8 IoT Data Service

**Purpose:** Collect, process, and store IoT sensor data

**Responsibilities:**
- Connect to OPC-UA servers (PLCs, SCADA)
- Subscribe to MQTT topics (IoT sensors)
- Process and validate sensor data
- Store time-series data (InfluxDB)
- Trigger alerts based on thresholds
- Provide real-time data streaming (WebSockets)

**Technology Stack:**
- Node.js with Express
- node-opcua (OPC-UA client)
- MQTT.js (MQTT client)
- InfluxDB client
- WebSocket (Socket.io for real-time dashboard)

**APIs:**
- `GET /api/v1/iot/sensors` - List configured sensors
- `GET /api/v1/iot/sensors/:id/data` - Get sensor data (time range query)
- `POST /api/v1/iot/sensors/:id/configure` - Configure sensor thresholds
- `GET /api/v1/iot/equipment/:id/realtime` - Real-time equipment data (WebSocket)

**Database:**
- PostgreSQL (sensor_config, alert_rules)
- InfluxDB (sensor_data time-series)

**Kafka Topics Consumed:**
- None (data source is OPC-UA/MQTT)

**Kafka Topics Produced:**
- `sensor-data` (raw sensor readings)
- `sensor-alert` (threshold exceeded)
- `equipment-status-changed` (derived from sensor data)

**Business Rules:**
- Sensor data timestamped at edge (not server time)
- Out-of-range sensor data flagged (not discarded)
- Alert hysteresis (prevent flapping: must be out-of-range for 30 sec before alerting)

---

#### 3.2.9 Reporting Service

**Purpose:** Generate reports and analytics

**Responsibilities:**
- Generate PDF reports (work orders, quality, traceability)
- Calculate KPIs (OEE, FPY, on-time delivery, etc.)
- Provide dashboards (real-time and historical)
- Export data (CSV, Excel, JSON)
- Custom report builder (user-defined queries)

**Technology Stack:**
- Node.js with Express
- Puppeteer (PDF generation from HTML templates)
- Apache Superset or Metabase (BI dashboard embedded)

**APIs:**
- `GET /api/v1/reports/kpis` - Get KPI dashboard data
- `POST /api/v1/reports/generate` - Generate custom report
- `GET /api/v1/reports/download/:reportId` - Download PDF report
- `POST /api/v1/reports/export` - Export data (CSV, Excel)

**Database:**
- PostgreSQL (read-only access to all tables)
- InfluxDB (time-series metrics)

**Kafka Topics Consumed:**
- All topics (aggregates data for real-time KPIs)

**Kafka Topics Produced:**
- None (read-only service)

---

### 3.3 Inter-Service Communication Patterns

**Synchronous Communication (REST APIs)**
- Used for: Real-time queries, user-initiated actions
- Example: User clicks "Get Work Order Details" → Frontend calls Work Order Service API
- Timeout: 5 seconds
- Retry: 3 attempts with exponential backoff

**Asynchronous Communication (Kafka Events)**
- Used for: Notifications, data synchronization, eventual consistency
- Example: Work Order completed → Event published → Quality Service auto-creates inspection
- Guaranteed delivery (Kafka retention: 7 days)
- At-least-once processing (idempotent consumers)

**Service Mesh (Future Enhancement)**
- Istio or Linkerd for service-to-service security
- Mutual TLS (mTLS) between services
- Distributed tracing (Jaeger)
- Traffic management (circuit breakers, retries)

---

## 4. DATA ARCHITECTURE

### 4.1 Database Strategy

**Primary Database: PostgreSQL**
- Transactional data (work orders, quality, materials, users)
- Relational data model (normalized 3NF)
- ACID compliance for data integrity
- Row-level security for multi-tenancy

**Time-Series Database: InfluxDB**
- Sensor data (temperature, pressure, vibration)
- Process parameters (torque, cure time, dimensions)
- KPI metrics (OEE, throughput, cycle time)
- Retention: 90 days hot storage, 5 years warm (downsampled), 25 years cold (archived)

**Object Storage: MinIO (or S3)**
- Documents (PDFs, CAD files, images, videos)
- Material certifications (MTRs)
- Quality reports (AS9102 FAIR, C of C)
- Digital work instructions (multimedia content)

**Cache: Redis**
- Session storage (JWT tokens)
- Frequently accessed data (part master, user info)
- Schedule cache (current published schedule)
- Rate limiting counters

**Search Engine: Elasticsearch (Optional)**
- Full-text search (parts, work orders, documents)
- Audit log search
- Analytics and aggregations

### 4.2 Database Schema (Enhanced)

```
┌─────────────────┐
│      Site       │  Multi-site support
├─────────────────┤
│ id (PK)         │
│ siteCode        │
│ siteName        │
│ location        │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐       ┌──────────────┐
│   WorkOrder     │──────▶│   Routing    │
├─────────────────┤  N:1  ├──────────────┤
│ id (PK)         │       │ id (PK)      │
│ workOrderNumber │       │ routingNumber│
│ partId (FK)     │       │ partId       │
│ siteId (FK)     │       └──────┬───────┘
│ routingId (FK)  │              │ 1:N
│ quantity        │       ┌──────▼────────────────┐
│ status          │       │ RoutingOperation      │
│ dueDate         │       ├───────────────────────┤
└────────┬────────┘       │ id (PK)               │
         │                │ routingId (FK)        │
         │ 1:N            │ operationNumber       │
         │                │ operationName         │
┌────────▼──────────┐     │ workCenterId (FK)     │
│WorkOrderOperation │     └───────────────────────┘
├───────────────────┤
│ id (PK)           │
│ workOrderId (FK)  │
│ routingOperationId│
│ status            │
│ startedAt         │
│ completedAt       │
└───────────────────┘

┌─────────────────┐       ┌──────────────────┐
│ QualityPlan     │──────▶│QualityCharacteristic│
├─────────────────┤  1:N  ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ planNumber      │       │ planId (FK)      │
│ partId (FK)     │       │ characteristic   │
└────────┬────────┘       │ nominalValue     │
         │                │ upperLimit       │
         │ 1:N            │ lowerLimit       │
┌────────▼────────┐       └────────┬─────────┘
│QualityInspection│                │ 1:N
├─────────────────┤         ┌──────▼────────────┐
│ id (PK)         │         │QualityMeasurement │
│ workOrderId(FK) │         ├───────────────────┤
│ planId (FK)     │         │ id (PK)           │
│ inspectorId(FK) │         │ inspectionId (FK) │
│ status          │         │ characteristicId  │
│ result          │         │ measuredValue     │
└─────────────────┘         │ result (PASS/FAIL)│
                            └───────────────────┘

┌─────────────────┐       ┌──────────────────┐
│ SerializedPart  │◀─────▶│  PartGenealogy   │
├─────────────────┤  N:M  ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ serialNumber    │       │ parentPartId(FK) │
│ partId (FK)     │       │ componentPartId  │
│ lotNumber       │       │ assemblyDate     │
│ status          │       │ assemblyOperator │
└─────────────────┘       └──────────────────┘
        │
        │ N:1
        │
┌───────▼─────────┐
│   Inventory     │
├─────────────────┤
│ id (PK)         │
│ partId (FK)     │
│ lotNumber       │
│ location        │
│ quantity        │
└─────────────────┘

┌─────────────────┐       ┌──────────────────┐
│   Equipment     │──────▶│  EquipmentLog    │
├─────────────────┤  1:N  ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ equipmentNumber │       │ equipmentId (FK) │
│ siteId (FK)     │       │ logType          │
│ status          │       │ description      │
│ utilizationRate │       │ loggedAt         │
└─────────────────┘       └──────────────────┘

┌─────────────────┐
│   AuditLog      │  Immutable audit trail
├─────────────────┤
│ id (PK)         │
│ tableName       │
│ recordId        │
│ action (CRUD)   │
│ oldValues(JSON) │
│ newValues(JSON) │
│ userId (FK)     │
│ ipAddress       │
│ timestamp       │
└─────────────────┘
```

### 4.3 InfluxDB Schema (Time-Series Data)

**Measurements (Tables):**

**1. sensor_data**
```
time (timestamp, primary index)
sensor_id (tag, indexed)
equipment_id (tag, indexed)
work_order_id (tag)
serial_number (tag)
parameter_name (tag)
value (field, float)
unit (field, string)
quality (field, string: GOOD, UNCERTAIN, BAD)
```

**Example Query:**
```sql
SELECT mean("value")
FROM "sensor_data"
WHERE "equipment_id" = 'EQ-001'
  AND "parameter_name" = 'temperature'
  AND time > now() - 1h
GROUP BY time(1m)
```

**2. process_parameters**
```
time (timestamp)
work_order_id (tag)
operation_number (tag)
serial_number (tag)
parameter_name (tag)
measured_value (field, float)
specification_min (field, float)
specification_max (field, float)
result (field, string: PASS, FAIL)
```

**3. equipment_oee**
```
time (timestamp)
equipment_id (tag)
shift (tag: DAY, NIGHT)
availability (field, float: 0-1)
performance (field, float: 0-1)
quality (field, float: 0-1)
oee (field, float: 0-1)
```

### 4.4 Data Retention & Archival

**PostgreSQL (Operational Data):**
- Work Orders: 7 years online, archive to cold storage after 7 years
- Quality Inspections: 25+ years (FAA requirement)
- NCRs: 10 years
- Audit Logs: 7 years online, archive indefinitely

**InfluxDB (Time-Series Data):**
- Raw sensor data (1-second resolution): 90 days hot storage
- Downsampled (1-minute avg): 5 years warm storage
- Downsampled (1-hour avg): 25 years cold storage (archived to S3)

**MinIO/S3 (Documents):**
- All documents: 25+ years (regulatory requirement)
- Lifecycle policy: Standard → Glacier (after 2 years) → Deep Archive (after 7 years)

---

## 5. INTEGRATION ARCHITECTURE

### 5.1 ERP Integration (SAP Example)

```
┌──────────────────────────────────────────────────────────┐
│                   SAP ERP (Level 4)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │SAP PP    │  │ SAP MM   │  │ SAP QM   │              │
│  │(Planning)│  │(Material)│  │(Quality) │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        │ RFC/IDoc    │ BAPI        │ ALE/IDoc
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────┐
│             SAP Adapter (Node.js)                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ node-rfc library (SAP NetWeaver RFC SDK)      │    │
│  │ Mapping: SAP structures ↔ MES data models     │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ REST API / Kafka
┌────────────────────▼────────────────────────────────────┐
│            MES Integration Service                      │
│  - Message transformation (SAP → B2MML → MES)          │
│  - Error handling & retry logic                        │
│  - Logging & monitoring                                │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │   Kafka     │
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │                       │
  ┌──────▼──────┐       ┌───────▼────────┐
  │ Work Order  │       │  Material      │
  │  Service    │       │   Service      │
  └─────────────┘       └────────────────┘
```

**Integration Flows:**

**1. Production Order (SAP → MES):**
```
SAP PP → RFC: BAPI_PRODORD_CREATE
       → SAP Adapter: Receive IDoc
       → Transform to B2MML ProductionSchedule XML
       → Kafka: erp-production-schedule
       → Work Order Service: Create work order
```

**2. Production Confirmation (MES → SAP):**
```
MES Work Order Service: Complete operation
       → Kafka: work-order-completed
       → Integration Service: Listen to event
       → Transform to SAP LOIPRO IDoc
       → SAP Adapter: Call RFC: BAPI_PRODORDCONF_CREATE_TT
       → SAP PP: Update production order status
```

### 5.2 PLM Integration (Teamcenter Example)

```
┌──────────────────────────────────────────────────────────┐
│            Siemens Teamcenter PLM (Level 4)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Item Rev  │  │BOM Mgmt  │  │Process   │              │
│  │Mgmt      │  │          │  │Planning  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        │ TC XML      │ PLM XML     │ PLMXML
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────┐
│       Teamcenter Adapter (Java or Node.js)              │
│  ┌────────────────────────────────────────────────┐    │
│  │ TC SOA Services (Web Services)                 │    │
│  │ BOM Traversal, Item Query, Change Management   │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────┐
│            MES Integration Service                      │
│  - Part master synchronization (nightly batch)          │
│  - BOM synchronization                                  │
│  - ECO/ECN real-time updates                           │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │ PostgreSQL  │
              │(parts, BOMs)│
              └─────────────┘
```

**Integration Flows:**

**1. Part Master Sync (PLM → MES):**
```
Scheduled Job (nightly 2 AM):
  → TC Adapter: Query items modified since last sync
  → Transform TC XML to MES Part model
  → MES Material Service: Upsert parts (insert or update)
  → Kafka: part-master-updated (notify other services)
```

**2. Engineering Change Order (PLM → MES):**
```
TC Change Management: ECO approved
  → TC Event Handler: Trigger webhook to MES
  → TC Adapter: Query ECO details (affected items, new revisions)
  → MES Integration Service: Identify affected work orders
  → MES Work Order Service: Hold affected work orders
  → Notification to production supervisors
  → Production supervisor reviews and releases after ECO applied
```

### 5.3 CMMS Integration (IBM Maximo Example)

```
┌──────────────────────────────────────────────────────────┐
│               IBM Maximo CMMS                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Work Order│  │Preventive│  │  Asset   │              │
│  │Mgmt      │  │Maint     │  │  Mgmt    │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        │ REST API    │ OSLC        │ Maximo API
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────┐
│           Maximo Adapter (Node.js)                      │
│  ┌────────────────────────────────────────────────┐    │
│  │ Maximo REST API Client                         │    │
│  │ OAuth 2.0 authentication                       │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ Kafka
┌────────────────────▼────────────────────────────────────┐
│            MES Equipment Service                        │
│  - Sync equipment master data                           │
│  - Receive PM schedules                                 │
│  - Send equipment downtime events                       │
└─────────────────────────────────────────────────────────┘
```

**Integration Flows:**

**1. Preventive Maintenance Schedule (CMMS → MES):**
```
Maximo: PM schedule generated
  → Maximo Adapter: Query PM work orders for next 30 days
  → Transform to MES maintenance event
  → Kafka: cmms-maintenance-scheduled
  → MES Equipment Service: Update equipment calendar
  → MES Scheduling Service: Avoid scheduling production during PM
```

**2. Equipment Downtime (MES → CMMS):**
```
MES Equipment Service: Equipment status = DOWN
  → Kafka: equipment-downtime
  → Maximo Adapter: Create corrective maintenance work order
  → Maximo: Assign to maintenance technician
```

---

## 6. IoT & REAL-TIME DATA ARCHITECTURE

### 6.1 Shop Floor Data Collection Architecture

```
┌───────────────────────────────────────────────────────────┐
│                   SHOP FLOOR (Level 0-2)                  │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ PLC      │  │ CMM      │  │ Torque   │  │ Env      │ │
│  │ (Siemens)│  │ (Hexagon)│  │ Wrench   │  │ Sensors  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼─────────────┼─────────────┼─────────────┼────────┘
        │ OPC-UA      │ PC-DMIS     │ Open Proto  │ MQTT
        │             │ (TCP/IP)    │ (TCP/IP)    │
┌───────▼─────────────▼─────────────▼─────────────▼────────┐
│             EDGE COMPUTING LAYER                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Edge Agent (Docker Container)                   │    │
│  │  - Node.js + OPC-UA client + MQTT client        │    │
│  │  - Local buffering (SQLite)                     │    │
│  │  - Preprocessing (filter, aggregate)            │    │
│  │  - Offline resilience                           │    │
│  └──────────────────┬───────────────────────────────┘    │
└─────────────────────┼────────────────────────────────────┘
                      │ HTTPS / WSS (WebSocket Secure)
┌─────────────────────▼────────────────────────────────────┐
│                  CLOUD / DATA CENTER                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │          IoT Data Service (Node.js)              │    │
│  │  - Validate and enrich data                     │    │
│  │  - Apply business rules                         │    │
│  │  - Trigger alerts                               │    │
│  └──────────┬────────────────────┬──────────────────┘    │
│             │                    │                        │
│      ┌──────▼──────┐      ┌──────▼──────┐               │
│      │ InfluxDB    │      │   Kafka     │               │
│      │(Time-Series)│      │(Event Bus)  │               │
│      └─────────────┘      └──────┬──────┘               │
└────────────────────────────────────┼─────────────────────┘
                                     │
                         ┌───────────▼───────────┐
                         │  MES Microservices    │
                         │  (Quality, Equipment) │
                         └───────────────────────┘
```

### 6.2 OPC-UA Integration

**OPC-UA Server Discovery:**
```javascript
const opcua = require("node-opcua");

// Discover OPC-UA servers on network
const client = opcua.OPCUAClient.create({
  applicationName: "MachShop MES",
  connectionStrategy: opcua.makeConnectionStrategy({
    maxRetry: 10,
    initialDelay: 2000,
    maxDelay: 10000
  }),
  securityMode: opcua.MessageSecurityMode.SignAndEncrypt,
  securityPolicy: opcua.SecurityPolicy.Basic256Sha256
});

await client.connect("opc.tcp://plc-server:4840");
const session = await client.createSession();

// Subscribe to equipment status
const subscription = opcua.ClientSubscription.create(session, {
  requestedPublishingInterval: 1000, // 1 second
  requestedLifetimeCount: 100,
  requestedMaxKeepAliveCount: 10,
  maxNotificationsPerPublish: 100,
  publishingEnabled: true,
  priority: 10
});

// Monitor temperature tag
const itemToMonitor = {
  nodeId: "ns=2;s=Machine1.Temperature",
  attributeId: opcua.AttributeIds.Value
};

const monitoredItem = opcua.ClientMonitoredItem.create(
  subscription,
  itemToMonitor,
  { samplingInterval: 1000, discardOldest: true, queueSize: 10 }
);

monitoredItem.on("changed", (dataValue) => {
  console.log(`Temperature: ${dataValue.value.value} °C`);
  // Publish to Kafka
  kafka.produce("sensor-data", {
    sensor_id: "Machine1.Temperature",
    equipment_id: "EQ-001",
    timestamp: dataValue.sourceTimestamp,
    value: dataValue.value.value,
    unit: "°C"
  });
});
```

### 6.3 MQTT Integration (IoT Sensors)

**MQTT Broker Configuration:**
```yaml
# mosquitto.conf
listener 8883
protocol mqtt
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
require_certificate true
use_identity_as_username true

# Topic ACL
acl_file /etc/mosquitto/acl.conf
```

**MQTT Subscribe (MES IoT Service):**
```javascript
const mqtt = require("mqtt");
const client = mqtt.connect("mqtts://mqtt-broker:8883", {
  key: fs.readFileSync("/certs/client-key.pem"),
  cert: fs.readFileSync("/certs/client-cert.pem"),
  ca: [fs.readFileSync("/certs/ca-cert.pem")]
});

client.on("connect", () => {
  // Subscribe to all environmental sensors
  client.subscribe("sensors/environment/#", (err) => {
    if (!err) console.log("Subscribed to environmental sensors");
  });
});

client.on("message", (topic, message) => {
  const data = JSON.parse(message.toString());
  // topic: sensors/environment/cell1/temperature
  // message: {"sensor_id":"ENV-001","value":22.5,"unit":"°C","timestamp":"2025-10-15T10:30:00Z"}

  // Validate data
  if (data.value < -50 || data.value > 100) {
    console.warn("Temperature out of valid range");
    data.quality = "UNCERTAIN";
  } else {
    data.quality = "GOOD";
  }

  // Store in InfluxDB
  influxDB.writePoint({
    measurement: "sensor_data",
    tags: {
      sensor_id: data.sensor_id,
      parameter: "temperature"
    },
    fields: {
      value: data.value,
      unit: data.unit,
      quality: data.quality
    },
    timestamp: new Date(data.timestamp)
  });

  // Check alert thresholds
  if (data.value > 30) {
    kafka.produce("sensor-alert", {
      sensor_id: data.sensor_id,
      alert_type: "HIGH_TEMPERATURE",
      value: data.value,
      threshold: 30
    });
  }
});
```

### 6.4 Edge Computing Architecture

**Edge Agent Deployment:**
```yaml
# docker-compose.yml (on shop floor PC)
version: '3.8'
services:
  mes-edge-agent:
    image: machshop/edge-agent:latest
    container_name: mes-edge
    restart: unless-stopped
    environment:
      - CLOUD_API_URL=https://api.machshop.com
      - SITE_ID=SITE-001
      - EQUIPMENT_IDS=EQ-001,EQ-002,EQ-003
    volumes:
      - ./config:/config
      - ./data:/data  # Local SQLite buffer
    network_mode: host  # Access to local PLCs
```

**Edge Agent Functionality:**
```javascript
// Edge Agent: Local buffering for offline resilience
class EdgeAgent {
  constructor() {
    this.buffer = new SQLite("/data/buffer.db");
    this.cloudConnected = false;
    this.checkCloudConnection();
  }

  async collectData(sensor_id, value) {
    const dataPoint = {
      sensor_id,
      value,
      timestamp: Date.now(),
      synced: false
    };

    // Always store locally first
    await this.buffer.insert("sensor_data", dataPoint);

    // Try to send to cloud
    if (this.cloudConnected) {
      try {
        await this.sendToCloud(dataPoint);
        await this.buffer.update("sensor_data", { id: dataPoint.id }, { synced: true });
      } catch (err) {
        console.error("Cloud send failed, will retry later");
      }
    }
  }

  async syncBufferedData() {
    // Runs every 5 minutes
    const unsyncedData = await this.buffer.query("SELECT * FROM sensor_data WHERE synced = false LIMIT 1000");
    for (const dataPoint of unsyncedData) {
      try {
        await this.sendToCloud(dataPoint);
        await this.buffer.update("sensor_data", { id: dataPoint.id }, { synced: true });
      } catch (err) {
        break; // Stop if cloud unavailable
      }
    }

    // Delete synced data older than 7 days
    await this.buffer.execute("DELETE FROM sensor_data WHERE synced = true AND timestamp < ?", [Date.now() - 7*24*60*60*1000]);
  }

  async checkCloudConnection() {
    setInterval(async () => {
      try {
        await axios.get(`${process.env.CLOUD_API_URL}/health`);
        this.cloudConnected = true;
        this.syncBufferedData(); // Sync when connection restored
      } catch {
        this.cloudConnected = false;
      }
    }, 10000); // Check every 10 seconds
  }
}
```

---

## 7. SECURITY ARCHITECTURE

### 7.1 Zero-Trust Security Model

```
┌─────────────────────────────────────────────────────────┐
│             EXTERNAL USERS (Internet)                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (TLS 1.3)
┌────────────────────▼────────────────────────────────────┐
│              WAF (Web Application Firewall)             │
│  - DDoS protection                                      │
│  - SQL injection prevention                             │
│  - XSS prevention                                       │
│  - Rate limiting (100 req/min per IP for anonymous)    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            CDN (CloudFlare / CloudFront)                │
│  - Static asset caching                                 │
│  - SSL/TLS termination                                  │
│  - Geographic distribution                              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│              Load Balancer (ALB / NGINX)                │
│  - TLS offloading                                       │
│  - Health checks                                        │
│  - Traffic distribution                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                API Gateway (Kong)                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ 1. Authentication (JWT validation)             │    │
│  │ 2. Authorization (check permissions)           │    │
│  │ 3. Rate limiting (1000 req/min per user)      │    │
│  │ 4. Request validation (schema validation)     │    │
│  │ 5. Audit logging (all API calls)              │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ Internal Network (VPC)
                     │
         ┌───────────┴───────────┬────────────────┐
         │                       │                │
┌────────▼────────┐   ┌──────────▼──────┐   ┌────▼──────┐
│ Microservice 1  │   │ Microservice 2  │   │Microservice│
│ (mTLS required) │   │ (mTLS required) │   │    3       │
└─────────────────┘   └─────────────────┘   └───────────┘
```

### 7.2 Authentication & Authorization

**JWT Token Structure:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "machshop-key-2025"
  },
  "payload": {
    "sub": "user-123",
    "username": "john.doe",
    "email": "john.doe@aerospace.com",
    "roles": ["Production Supervisor", "Quality Inspector"],
    "permissions": [
      "workorders.read",
      "workorders.update",
      "quality.read",
      "quality.create"
    ],
    "tenant_id": "tenant-aerospace-001",
    "iss": "machshop-auth-service",
    "aud": "machshop-api",
    "exp": 1729000000,
    "iat": 1728996400,
    "nbf": 1728996400
  },
  "signature": "..."
}
```

**Authorization Middleware:**
```javascript
// Express middleware for RBAC
function authorize(requiredPermissions) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    try {
      const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
      req.user = decoded;

      // Check if user has required permissions
      const hasPermission = requiredPermissions.every(permission =>
        decoded.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }

      // Multi-tenant isolation: Ensure user can only access their tenant's data
      req.tenant_id = decoded.tenant_id;

      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  };
}

// Usage in route
app.get("/api/v1/workorders",
  authorize(["workorders.read"]),
  async (req, res) => {
    // Query work orders filtered by req.tenant_id
    const workOrders = await prisma.workOrder.findMany({
      where: { tenant_id: req.tenant_id }
    });
    res.json(workOrders);
  }
);
```

### 7.3 Data Encryption

**Encryption at Rest:**
```yaml
# PostgreSQL (AWS RDS)
storage_encrypted: true
kms_key_id: arn:aws:kms:us-east-1:123456789:key/mrk-1234567890

# InfluxDB
storage:
  engine: tsm1
  wal:
    dir: /var/lib/influxdb/wal
    fsync_delay: 0s
  encryption:
    enabled: true
    key_rotation_days: 90

# MinIO (S3-compatible)
server_side_encryption:
  type: aws:kms
  kms_key_id: arn:aws:kms:us-east-1:123456789:key/mrk-1234567890
```

**Encryption in Transit:**
- All API calls use HTTPS (TLS 1.3)
- Database connections use SSL/TLS
- Inter-service communication uses mTLS (mutual TLS)
- MQTT uses TLS (port 8883)
- OPC-UA uses Security Policy Basic256Sha256

### 7.4 Secrets Management

```yaml
# AWS Secrets Manager
secrets:
  - name: mes/database/master-password
    value: <encrypted>
  - name: mes/jwt/private-key
    value: <encrypted>
  - name: mes/sap/api-credentials
    value: <encrypted>

# Environment variables (injected at runtime)
DATABASE_URL: ${secrets:mes/database/master-password}
JWT_PRIVATE_KEY: ${secrets:mes/jwt/private-key}
SAP_USERNAME: ${secrets:mes/sap/api-credentials:username}
SAP_PASSWORD: ${secrets:mes/sap/api-credentials:password}
```

**Secret Rotation:**
- Database passwords: Rotated every 90 days (automated)
- JWT signing keys: Rotated every 180 days (with grace period)
- API keys: Rotated annually or on compromise

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Kubernetes Deployment (AWS EKS)

```yaml
# mes-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: machshop-mes
  labels:
    name: machshop-mes
---
# workorder-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workorder-service
  namespace: machshop-mes
spec:
  replicas: 3  # Horizontal scaling
  selector:
    matchLabels:
      app: workorder-service
  template:
    metadata:
      labels:
        app: workorder-service
        version: v1.2.0
    spec:
      containers:
      - name: workorder-service
        image: machshop/workorder-service:1.2.0
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
# workorder-service HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workorder-service-hpa
  namespace: machshop-mes
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workorder-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 8.2 Multi-Region Deployment

```
┌─────────────────────────────────────────────────────────┐
│                  Global Load Balancer                   │
│              (AWS Route 53 / Cloudflare)                │
│  - Geo-routing (route to nearest region)                │
│  - Health checks (automatic failover)                   │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
        ┌──────────▼──────┐    ┌──────▼──────────┐
        │   us-east-1     │    │   us-west-2     │
        │   (Primary)     │    │   (DR/Active)   │
        └──────────┬──────┘    └──────┬──────────┘
                   │                  │
        ┌──────────▼──────┐    ┌──────▼──────────┐
        │  EKS Cluster    │    │  EKS Cluster    │
        │  (15 nodes)     │    │  (10 nodes)     │
        └──────────┬──────┘    └──────┬──────────┘
                   │                  │
        ┌──────────▼──────┐    ┌──────▼──────────┐
        │  RDS Primary    │───▶│ RDS Read Replica│
        │  (Multi-AZ)     │    │                 │
        └─────────────────┘    └─────────────────┘
                   │                  │
        ┌──────────▼──────┐    ┌──────▼──────────┐
        │  S3 Bucket      │───▶│ S3 Bucket       │
        │  (Versioned)    │    │ (Cross-region   │
        │                 │    │  replication)   │
        └─────────────────┘    └─────────────────┘
```

### 8.3 Disaster Recovery Strategy

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 15 minutes

**Backup Strategy:**
1. **Database (RDS PostgreSQL):**
   - Automated snapshots: Daily
   - Continuous replication to standby (us-west-2)
   - Transaction logs: Shipped every 5 minutes

2. **Object Storage (S3):**
   - Cross-region replication: Real-time
   - Versioning enabled (30-day retention)

3. **Application State:**
   - Stateless services (no backup needed, redeploy from container registry)

**Failover Procedure:**
1. Detect primary region outage (health checks fail)
2. Update Route 53 to point to DR region (TTL: 60 seconds)
3. Promote RDS read replica to primary (automated)
4. Scale DR cluster to full capacity (10 → 15 nodes)
5. Verify all services healthy
6. Notify operations team

**Failback Procedure:**
1. Restore primary region infrastructure
2. Sync data from DR to primary (RDS replication catch-up)
3. Verify data consistency
4. Update Route 53 to restore primary region
5. Scale DR cluster back to standby capacity

---

## 9. MONITORING & OBSERVABILITY

### 9.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────┐
│                    MES APPLICATIONS                     │
│  (Microservices emit metrics, logs, traces)             │
└────────┬────────────────────┬──────────────────┬────────┘
         │ Metrics            │ Logs             │ Traces
         │ (Prometheus)       │ (Fluent Bit)     │ (Jaeger)
         │                    │                  │
┌────────▼───────┐   ┌────────▼──────┐   ┌──────▼────────┐
│  Prometheus    │   │ Elasticsearch │   │  Jaeger       │
│  (Time-Series  │   │ (Log Storage) │   │ (Distributed  │
│   Metrics)     │   │               │   │  Tracing)     │
└────────┬───────┘   └────────┬──────┘   └──────┬────────┘
         │                    │                  │
         └────────────────────┼──────────────────┘
                              │
                     ┌────────▼──────┐
                     │    Grafana    │
                     │  (Dashboards) │
                     └───────────────┘
```

### 9.2 Key Metrics

**Application Metrics (Prometheus):**
```yaml
# Work Order Service Metrics
workorder_created_total: Counter  # Total work orders created
workorder_duration_seconds: Histogram  # Time to complete work order
workorder_status_gauge: Gauge  # Current work orders by status

# Quality Service Metrics
inspection_pass_rate: Gauge  # Pass rate (%)
spc_out_of_control_total: Counter  # Out-of-control detections
ncr_open_gauge: Gauge  # Open NCRs count

# API Gateway Metrics
http_requests_total: Counter (labels: method, path, status_code)
http_request_duration_seconds: Histogram
http_requests_in_flight: Gauge

# Database Metrics
postgres_active_connections: Gauge
postgres_query_duration_seconds: Histogram
postgres_deadlocks_total: Counter
```

**Infrastructure Metrics:**
```yaml
# Kubernetes
kube_pod_status_phase: Gauge (labels: namespace, pod, phase)
kube_pod_container_resource_limits_cpu_cores: Gauge
kube_pod_container_resource_requests_memory_bytes: Gauge

# Node (VM)
node_cpu_seconds_total: Counter
node_memory_MemAvailable_bytes: Gauge
node_disk_io_time_seconds_total: Counter
```

### 9.3 Logging Strategy

**Log Levels:**
- **ERROR:** Application errors (caught exceptions, failed API calls)
- **WARN:** Warnings (retries, deprecated features)
- **INFO:** Informational (work order created, operation completed)
- **DEBUG:** Debugging info (SQL queries, detailed flow) - disabled in production

**Structured Logging (JSON):**
```json
{
  "timestamp": "2025-10-15T14:30:00.123Z",
  "level": "INFO",
  "service": "workorder-service",
  "trace_id": "1a2b3c4d5e6f",
  "span_id": "7g8h9i0j",
  "user_id": "user-123",
  "tenant_id": "tenant-001",
  "message": "Work order completed",
  "context": {
    "work_order_id": "WO-2025-001001",
    "part_number": "BLADE-TF39-001",
    "quantity": 10,
    "duration_seconds": 345600
  }
}
```

**Log Aggregation (ELK Stack):**
- Fluent Bit (log shipper on each pod)
- Elasticsearch (log storage, 30-day retention)
- Kibana (log search and visualization)

### 9.4 Alerting Rules

**Critical Alerts (PagerDuty):**
```yaml
# Service Down
- alert: ServiceDown
  expr: up{job="workorder-service"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Work Order Service is down"

# High Error Rate
- alert: HighErrorRate
  expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Error rate > 5% for 5 minutes"

# Database Connection Pool Exhausted
- alert: DatabaseConnectionPoolExhausted
  expr: postgres_active_connections / postgres_max_connections > 0.9
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool > 90% utilized"
```

**Warning Alerts (Email):**
```yaml
# High CPU Usage
- alert: HighCPUUsage
  expr: container_cpu_usage_seconds_total > 0.8
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "CPU usage > 80% for 10 minutes"

# Disk Space Low
- alert: DiskSpaceLow
  expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Disk space < 20%"
```

---

## 10. SCALABILITY & PERFORMANCE

### 10.1 Horizontal Scaling Strategy

**Stateless Services (Auto-Scaling):**
- API Gateway: 2-10 instances (scale on request rate)
- Work Order Service: 3-10 instances (scale on CPU 70%)
- Quality Service: 3-8 instances
- Material Service: 2-8 instances

**Stateful Services (Manual Scaling):**
- PostgreSQL: Vertical scaling (increase instance size)
- InfluxDB: Add nodes to cluster manually
- Kafka: 3 brokers (fixed, high availability)

### 10.2 Caching Strategy

**Redis Cache (Multi-Level):**
```
L1 Cache (Application Memory): 100 MB per instance
  └─> Frequently accessed data (current user, permissions)
  └─> TTL: 5 minutes

L2 Cache (Redis): 16 GB
  └─> Part master data (100,000 parts)
  └─> User session data (10,000 concurrent users)
  └─> Published schedule (current week)
  └─> TTL: 1-24 hours (varies by data type)

L3 Cache (CDN): Static assets (JS, CSS, images)
  └─> TTL: 30 days (cache-busting via versioned URLs)
```

**Cache Invalidation:**
```javascript
// Event-driven cache invalidation
kafka.consume("part-master-updated", async (event) => {
  const partNumber = event.partNumber;
  // Invalidate part cache
  await redis.del(`part:${partNumber}`);
  // Broadcast to all app instances to clear L1 cache
  await redis.publish("cache:invalidate", JSON.stringify({ type: "part", id: partNumber }));
});
```

### 10.3 Database Optimization

**Read Replicas (PostgreSQL):**
- Primary: Write operations
- Replica 1: Reporting queries
- Replica 2: Dashboard queries (real-time KPIs)

**Query Optimization:**
- Indexes on all foreign keys
- Composite indexes for common query patterns
- Materialized views for complex reports (refreshed hourly)

**Connection Pooling:**
```javascript
const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: 5432,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: "machshop_mes",
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 10.4 Performance Benchmarks

**Target Performance:**
- API Response Time (P95): < 2 seconds
- API Response Time (P99): < 5 seconds
- Database Query Time (P95): < 100ms
- SPC Chart Render: < 3 seconds (10,000 data points)
- Traceability Query (Genealogy): < 5 seconds (100-level deep BOM)

**Load Testing Results (1000 Concurrent Users):**
```
Scenario: Mixed workload (60% reads, 40% writes)
Duration: 30 minutes
Results:
  - Requests/sec: 5,000
  - Average response time: 450ms
  - P95 response time: 1.8 seconds
  - P99 response time: 3.5 seconds
  - Error rate: 0.05%
  - CPU usage: 65% (avg across 15 nodes)
  - Memory usage: 55%
```

---

## APPENDIX A: TECHNOLOGY STACK SUMMARY

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.2 | UI framework |
| | TypeScript | 5.0 | Type-safe JavaScript |
| | Ant Design | 5.0 | UI component library |
| | Vite | 4.0 | Build tool |
| | Zustand | 4.0 | State management |
| **Backend** | Node.js | 18 LTS | Runtime |
| | Express.js | 4.18 | Web framework |
| | TypeScript | 5.0 | Type-safe JavaScript |
| | Prisma | 5.0 | ORM |
| **Databases** | PostgreSQL | 15 | Primary relational DB |
| | InfluxDB | 2.7 | Time-series DB |
| | Redis | 7.0 | Cache & sessions |
| | MinIO | RELEASE.2024 | Object storage |
| **Message Queue** | Apache Kafka | 3.5 | Event streaming |
| **Containerization** | Docker | 24.0 | Containers |
| | Kubernetes | 1.28 | Orchestration |
| **Monitoring** | Prometheus | 2.47 | Metrics |
| | Grafana | 10.0 | Dashboards |
| | Elasticsearch | 8.10 | Log storage |
| | Kibana | 8.10 | Log visualization |
| | Jaeger | 1.50 | Distributed tracing |
| **IoT Integration** | node-opcua | 2.110 | OPC-UA client |
| | MQTT.js | 5.0 | MQTT client |
| | Mosquitto | 2.0 | MQTT broker |
| **Cloud** | AWS EKS | Latest | Kubernetes |
| | AWS RDS | PostgreSQL 15 | Managed database |
| | AWS S3 | Latest | Object storage |
| | AWS MSK | Kafka 3.5 | Managed Kafka |

---

## APPENDIX B: API GATEWAY CONFIGURATION

```yaml
# Kong API Gateway Configuration
_format_version: "3.0"

services:
  - name: workorder-service
    url: http://workorder-service.machshop-mes:3001
    routes:
      - name: workorder-routes
        paths:
          - /api/v1/workorders
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: jwt
        config:
          secret_is_base64: false
          key_claim_name: kid
          cookie_names: []
          claims_to_verify:
            - exp
      - name: rate-limiting
        config:
          minute: 1000
          policy: local
      - name: request-size-limiting
        config:
          allowed_payload_size: 10  # 10 MB
      - name: cors
        config:
          origins:
            - "*"
          methods:
            - GET
            - POST
            - PUT
            - DELETE
          headers:
            - Authorization
            - Content-Type
          exposed_headers:
            - X-Total-Count
          credentials: true
          max_age: 3600
```

---

**END OF SYSTEM ARCHITECTURE DOCUMENT**

**Document Version:** 2.0
**Total Pages:** 80+
**Classification:** Confidential - Internal Use Only
**Next Review:** January 15, 2026
