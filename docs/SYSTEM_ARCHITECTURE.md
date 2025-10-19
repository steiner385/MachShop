# Manufacturing Execution System Architecture
## Jet Engine Component Manufacturing

**Current Status:** Hybrid Monolith/Microservices Architecture (Migration in Progress)
**Last Updated:** October 2025

### 1. SYSTEM OVERVIEW

The MES currently operates as a hybrid system with a monolithic Express backend and React frontend. The architecture is designed with microservices patterns in mind, with planned migration to full microservices deployment. The system provides ISA-95 compliant manufacturing execution capabilities across multiple manufacturing sites.

#### Current Architecture (Hybrid Monolith)
```
┌────────────────────────────────────────────────┐
│        Frontend (React 18 + Vite)              │
│              Port: 5173                        │
│  ───────────────────────────────────────       │
│  • Ant Design UI Components                   │
│  • Zustand State Management                   │
│  • React Router                                │
│  • TypeScript                                  │
└───────────────────┬────────────────────────────┘
                    │ HTTP/HTTPS (REST APIs)
┌───────────────────▼────────────────────────────┐
│       Backend API (Express Monolith)           │
│              Port: 3001                        │
│  ───────────────────────────────────────       │
│  Route Modules (30+ routes):                   │
│  • /api/auth          - Authentication         │
│  • /api/workorders    - Work Order Management  │
│  • /api/quality       - Quality/NCRs           │
│  • /api/materials     - Material Management    │
│  • /api/traceability  - Genealogy Tracking     │
│  • /api/routing       - Multi-Site Routing     │
│  • /api/equipment     - Equipment Management   │
│  • /api/personnel     - Personnel Management   │
│  • /api/fai           - FAI Reports            │
│  • /api/signatures    - Electronic Signatures  │
│  • /api/work-instructions - Digital WI        │
│  • /api/process-segments - Process Definitions │
│  • /api/integrations  - External Integrations  │
│  • /api/b2m           - ISA-95 B2M Messages    │
│  • /api/l2-equipment  - L2 Equipment Data      │
│  • /api/cmm           - CMM/QIF Integration    │
│  • ... 14 more integration routes              │
└───────────────────┬────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │  │  Kafka   │
│  15.x    │  │  7.x     │  │  (Dep)   │
│93 Models │  │ Cache/   │  │ Event Bus│
│4199 Lines│  │ Session  │  │ (Future) │
└──────────┘  └──────────┘  └──────────┘
```

#### Planned Future Architecture (Full Microservices)
```
┌───────────────┐
│   Frontend    │  Port: 5173
└───────┬───────┘
        │
┌───────▼──────────────────────────────────────┐
│         API Gateway / Load Balancer          │
└───┬────┬────┬────┬────┬────┬────┬───────────┘
    │    │    │    │    │    │    │
    ▼    ▼    ▼    ▼    ▼    ▼    ▼
   Auth Quality Material Resource Integration...
   Svc   Svc    Svc      Svc     Svc    (Planned)
```
*Note: Microservices scaffolding exists in `/services` directory but not yet deployed.*

### 2. CURRENT FUNCTIONAL MODULES (Monolithic Implementation)

All functionality currently resides in the monolithic Express backend (`src/` directory) with modular route organization:

#### 2.1 Core Manufacturing Functions

**Work Order Management** (`src/routes/workOrders.ts`)
- Production work order lifecycle (create, release, execute, complete)
- Operation tracking and status management
- Work order scheduling integration
- Currently: Fully implemented in monolith

**Quality Management** (`src/routes/quality.ts`)
- Inspection plans and quality measurements
- Non-conformance reports (NCRs) and dispositions
- FAI reports with PDF generation (`src/routes/fai.ts`)
- Currently: Fully implemented

**Material Management** (`src/routes/materials.ts`)
- Material transactions and inventory tracking
- Material genealogy and lot tracking (Prisma models)
- Material certifications and properties
- Currently: Core features implemented

**Traceability** (`src/routes/traceability.ts`)
- Forward and backward genealogy tracking
- SerializedPart and PartGenealogy models
- Complete audit trail
- Currently: Database models complete, APIs implemented

**Routing Management** (`src/routes/routing.ts` - Sprint 4)
- Multi-site routing with lifecycle management
- Routing steps with dependencies
- Process segment integration
- Currently: Fully implemented with UI

#### 2.2 Supporting Functions

**Authentication & Authorization** (`src/routes/auth.ts`)
- JWT token-based authentication
- Role-based access control (RBAC)
- User management with permissions
- Currently: Fully operational

**Personnel Management** (`src/routes/personnel.ts`)
- ISA-95 personnel hierarchy
- Skills, certifications, and qualifications
- Work center assignments
- Currently: Database complete, APIs implemented

**Equipment Management** (`src/routes/equipment.ts`)
- ISA-95 equipment hierarchy (6 levels)
- Equipment state tracking and OEE
- Equipment capabilities and performance logs
- Currently: Comprehensive database schema

**Process Segments** (`src/routes/processSegments.ts`)
- ISA-95 process segment definitions
- Parameter specifications
- Equipment/personnel/material requirements
- Currently: Fully implemented

**Electronic Signatures** (`src/routes/signatures.ts`)
- 21 CFR Part 11 compliant signatures
- Signature validation and audit trail
- Currently: Implemented

**Digital Work Instructions** (`src/routes/workInstructions.ts`)
- Versioned work instructions with rich text
- Step-by-step execution tracking
- Currently: Implemented with Lexical editor

#### 2.3 Integration Modules

**Integration Framework** (`src/routes/integrationRoutes.ts`)
- Adapter pattern for external systems
- 12+ integration adapter types
- Currently: Framework and adapters scaffolded

**External System Adapters** (Various routes: `b2mRoutes.ts`, `cmmRoutes.ts`, etc.)
- Oracle Fusion, IBM Maximo, Teamcenter
- ShopFloor Connect, Predator DNC/PDM
- Proficy Historian, CMM/QIF
- Currently: Adapter code exists, integration pending

### 3. PLANNED MICROSERVICES MIGRATION

Microservices scaffolding exists in `/services` directory:
- `services/auth/` - Authentication microservice (scaffolded)
- `services/quality/` - Quality management service (scaffolded)
- `services/material/` - Material management service (scaffolded)
- `services/traceability/` - Traceability service (scaffolded)
- `services/resource/` - Resource management service (scaffolded)
- `services/reporting/` - Reporting service (scaffolded)
- `services/integration/` - Integration service (scaffolded)

**Migration Status**: Scaffolded but not yet operational. Current deployment uses monolithic backend.

### 4. DATA ARCHITECTURE

#### 4.1 Database Design (ISA-95 Compliant)

**Primary Database: PostgreSQL 15**
- **ORM**: Prisma Client with full type safety
- **Schema Size**: 4,199 lines, 93 models
- **Master Data**:
  - Parts, BOMs, product specifications (Part, BOMItem, ProductSpecification)
  - Routings and process segments (Routing, RoutingStep, ProcessSegment)
  - Sites, areas, work centers (Site, Area, WorkCenter, WorkUnit)
  - Equipment hierarchy (Equipment, EquipmentCapability)
  - Personnel (User, PersonnelClass, PersonnelCertification)
- **Transactional Data**:
  - Work orders and operations (WorkOrder, WorkOrderOperation, DispatchLog)
  - Quality records (QualityInspection, NCR, FAIReport, QIFMeasurement)
  - Material transactions (MaterialTransaction, MaterialLot, MaterialSublot)
  - Electronic signatures (ElectronicSignature)
  - Work instruction executions (WorkInstructionExecution)
- **Traceability**:
  - Material genealogy (MaterialLotGenealogy, PartGenealogy)
  - Serialized parts (SerializedPart)
  - Audit logs (AuditLog)
- **Integration**:
  - Integration configs and logs (IntegrationConfig, IntegrationLog)
  - B2M messages (ProductionScheduleRequest, ERPMaterialTransaction)
  - Equipment data collection (EquipmentDataCollection, ProcessDataCollection)

**Caching Layer: Redis 7.x**
- Session management for JWT tokens
- Query result caching (planned)
- Real-time data caching (planned)
- Currently: Dependency installed, basic usage

**Event Bus: Kafka** (Planned)
- Dependency installed (`kafkajs` package)
- Event-driven architecture (future implementation)
- Inter-service communication (microservices migration)
- Currently: Not actively used

**Document Storage** (Planned)
- PDF generation using pdfkit, pdf-lib
- Currently stored in PostgreSQL or file system
- MinIO integration planned for future

#### 3.2 Data Flow Architecture

```
Equipment/Sensors → Time Series DB → Analytics Engine → Dashboards
       ↓
Process Control → Primary DB → Business Logic → Reports
       ↓
User Actions → Audit Log → Compliance Engine → Certificates
```

### 4. API ENDPOINT SPECIFICATIONS

#### 4.1 Work Order Management APIs

**Base URL**: `/api/v1/workorders`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | List work orders | Query params | WorkOrder[] |
| GET | `/{id}` | Get work order | - | WorkOrder |
| POST | `/` | Create work order | CreateWorkOrderRequest | WorkOrder |
| PUT | `/{id}` | Update work order | UpdateWorkOrderRequest | WorkOrder |
| DELETE | `/{id}` | Delete work order | - | 204 No Content |
| POST | `/{id}/release` | Release to production | - | WorkOrder |
| POST | `/{id}/operations/{opId}/start` | Start operation | StartOperationRequest | Operation |
| POST | `/{id}/operations/{opId}/complete` | Complete operation | CompleteOperationRequest | Operation |

**Sample Request/Response**:
```json
POST /api/v1/workorders
{
  "partNumber": "ENG-BLADE-001",
  "quantity": 10,
  "priority": "High",
  "targetDate": "2024-12-31",
  "customerOrder": "CO-2024-1001"
}

Response:
{
  "id": "WO-2024-001001",
  "partNumber": "ENG-BLADE-001",
  "quantity": 10,
  "status": "Created",
  "createdAt": "2024-01-15T10:30:00Z",
  "operations": [...]
}
```

#### 4.2 Quality Management APIs

**Base URL**: `/api/v1/quality`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/inspections` | List inspections | Query params | Inspection[] |
| POST | `/inspections` | Create inspection | CreateInspectionRequest | Inspection |
| PUT | `/inspections/{id}` | Update inspection | UpdateInspectionRequest | Inspection |
| POST | `/inspections/{id}/results` | Record test results | TestResultsRequest | InspectionResult |
| GET | `/ncrs` | List NCRs | Query params | NCR[] |
| POST | `/ncrs` | Create NCR | CreateNCRRequest | NCR |
| PUT | `/ncrs/{id}/disposition` | Set NCR disposition | DispositionRequest | NCR |
| GET | `/certificates/{woId}` | Generate certificate | - | Certificate |

#### 4.3 Material Management APIs

**Base URL**: `/api/v1/materials`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/inventory` | Get inventory levels | Query params | Inventory[] |
| POST | `/consumption` | Record consumption | ConsumptionRequest | Transaction |
| GET | `/genealogy/{serialNumber}` | Get material genealogy | - | Genealogy |
| POST | `/allocations` | Allocate materials | AllocationRequest | Allocation |
| GET | `/certifications/{lotCode}` | Get material certs | - | Certification[] |

#### 4.4 Traceability APIs

**Base URL**: `/api/v1/traceability`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/genealogy/{serialNumber}` | Get component genealogy | - | TraceabilityTree |
| GET | `/forward/{materialLot}` | Forward traceability | - | ComponentList |
| GET | `/backward/{serialNumber}` | Backward traceability | - | MaterialList |
| GET | `/audit-trail/{entityId}` | Get audit trail | - | AuditRecord[] |
| POST | `/export` | Export traceability data | ExportRequest | ExportFile |

#### 4.5 Resource Management APIs

**Base URL**: `/api/v1/resources`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/equipment` | List equipment | Query params | Equipment[] |
| GET | `/equipment/{id}/status` | Get equipment status | - | EquipmentStatus |
| POST | `/maintenance` | Schedule maintenance | MaintenanceRequest | MaintenanceOrder |
| GET | `/operators` | List operators | Query params | Operator[] |
| POST | `/operators/{id}/certify` | Add certification | CertificationRequest | Certification |

### 5. SECURITY ARCHITECTURE

#### 5.1 Authentication Flow

```
Client → API Gateway → Auth Service → JWT Token → Client
   ↓
Client + JWT → API Gateway → Validate Token → Route to Service
```

#### 5.2 Authorization Model

**Roles**:
- System Administrator
- Plant Manager
- Production Supervisor
- Production Planner
- Operator
- Quality Engineer
- Quality Inspector
- Maintenance Technician

**Permissions Matrix**:
| Resource | Admin | Manager | Supervisor | Planner | Operator | QE | QI | Maintenance |
|----------|-------|---------|------------|---------|----------|----|----|-------------|
| Work Orders | CRUD | RU | RU | CRUD | RU | R | R | R |
| Quality Data | CRUD | RU | R | R | CRU | CRUD | CRUD | R |
| Materials | CRUD | RU | RU | RU | RU | R | R | R |
| Equipment | CRUD | RU | RU | R | R | R | R | CRUD |

#### 5.3 Data Protection

- **Encryption at Rest**: AES-256 for database and file storage
- **Encryption in Transit**: TLS 1.3 for all API communications
- **API Security**: OAuth 2.0 with JWT tokens
- **Network Security**: VPN access, firewall rules, network segmentation
- **Audit Logging**: Comprehensive audit trail for all user actions

### 6. DEPLOYMENT ARCHITECTURE

#### 6.1 Container Architecture

```dockerfile
# Example service container structure
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

#### 6.2 Kubernetes Deployment

```yaml
# Example deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workorder-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workorder-service
  template:
    metadata:
      labels:
        app: workorder-service
    spec:
      containers:
      - name: workorder-service
        image: mes/workorder-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

#### 6.3 Multi-Site Deployment

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Site A (US)   │  │   Site B (EU)   │  │   Site C (Asia) │
│                 │  │                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │ MES Instance│ │  │ │ MES Instance│ │  │ │ MES Instance│ │
│ │   + Local   │ │  │ │   + Local   │ │  │ │   + Local   │ │
│ │   Database  │ │  │ │   Database  │ │  │ │   Database  │ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │
└─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Central Data Hub   │
                    │ (Master Data Sync)  │
                    └─────────────────────┘
```

### 7. INTEGRATION ARCHITECTURE

#### 7.1 ERP Integration

```
MES ←→ Integration Service ←→ ERP Adapter ←→ ERP System
```

**Integration Points**:
- Material requirements planning
- Work order synchronization
- Cost data exchange
- Inventory updates

#### 7.2 PLM Integration

```
MES ←→ Integration Service ←→ PLM Adapter ←→ PLM System
```

**Integration Points**:
- Engineering change orders
- Part master data
- Manufacturing routes
- Quality specifications

#### 7.3 Equipment Integration

```
Shop Floor Equipment ←→ SCADA/PLC ←→ OPC Server ←→ MES
```

**Data Collection**:
- Process parameters
- Equipment status
- Production counts
- Alarm conditions

### 8. MONITORING AND OBSERVABILITY

#### 8.1 Application Monitoring

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger for distributed tracing
- **Health Checks**: Kubernetes liveness/readiness probes

#### 8.2 Business Monitoring

- **KPI Dashboards**: Real-time production metrics
- **Alert Management**: Automated alerts for critical conditions
- **Performance Analytics**: OEE, quality trends, throughput analysis
- **Compliance Monitoring**: Regulatory compliance tracking

### 9. SCALABILITY CONSIDERATIONS

#### 9.1 Horizontal Scaling

- **Microservices**: Independent scaling per service
- **Database Sharding**: Partition data by site or product line
- **Caching**: Redis for session management and frequently accessed data
- **CDN**: Content delivery for static assets and documents

#### 9.2 Performance Optimization

- **Connection Pooling**: Prisma connection pooling configured
- **Async Processing**: Message queues planned (Kafka dependency installed)
- **Indexing Strategy**: Optimized database indexes for common queries
- **Compression**: Response compression for API calls

---

## CURRENT IMPLEMENTATION STATUS SUMMARY

### What's Implemented (Production Ready)

**Backend (Monolithic Express)**
- ✅ Express.js server on port 3001
- ✅ 30+ route modules with full CRUD operations
- ✅ JWT authentication and RBAC
- ✅ Comprehensive Prisma schema (93 models, 4,199 lines)
- ✅ ISA-95 compliant database design
- ✅ OpenTelemetry instrumentation available
- ✅ TypeScript with strict type checking

**Frontend (React + Vite)**
- ✅ React 18 with TypeScript on port 5173
- ✅ Ant Design UI component library
- ✅ Zustand state management
- ✅ 23+ page modules implemented
- ✅ Complete routing management UI (Sprint 4)
- ✅ Responsive design and professional UX

**Database**
- ✅ PostgreSQL 15 with Prisma ORM
- ✅ Complete ISA-95 hierarchy models
- ✅ Material genealogy and traceability
- ✅ Equipment, personnel, process management
- ✅ Work orders, quality, routing fully modeled

**Key Features Operational**
- ✅ Work order management
- ✅ Quality management (NCRs, inspections, FAI)
- ✅ Material tracking and genealogy
- ✅ Multi-site routing (Sprint 4)
- ✅ Electronic signatures (21 CFR Part 11)
- ✅ Digital work instructions
- ✅ Equipment and personnel management
- ✅ Process segment definitions

### What's In Progress

- 🔄 Microservices migration (scaffolded in `/services`)
- 🔄 Integration adapters (code exists, testing pending)
- 🔄 Redis caching (dependency installed)
- 🔄 Kafka event bus (dependency installed)
- 🔄 Advanced analytics dashboards
- 🔄 Real-time OEE monitoring

### What's Planned

- 📋 Full microservices deployment
- 📋 Kubernetes production deployment
- 📋 InfluxDB time-series data
- 📋 MinIO document storage
- 📋 Complete ERP/PLM integration activation
- 📋 Advanced scheduling optimization
- 📋 IoT sensor integration
- 📋 Mobile applications

### Development Workflow

```bash
# Current Development
npm run dev                # Starts monolith backend (3001) + frontend (5173)
npm run test              # Unit tests (Vitest)
npm run test:e2e          # E2E tests (Playwright)
npm run db:migrate        # Database migrations (Prisma)
```

### Deployment Options

1. **Local Development** (Current): Monolith on port 3001
2. **Docker Compose** (Available): Multi-container setup configured
3. **Kubernetes** (Configured): K8s manifests and Helm charts available
4. **Microservices** (Future): Full service mesh deployment

---

**Last Updated:** October 2025
**Architecture Version:** 2.0 (Hybrid Monolith/Microservices)
**Next Major Milestone:** Complete microservices migration