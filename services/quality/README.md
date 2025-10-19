# Quality Service

MES Quality Management Microservice - Handles quality inspections, non-conformance reports (NCRs), first article inspection (FAI), and electronic signatures.

**Port**: 3010
**Database**: postgres-quality (port 5434)
**Status**: ✅ Production Ready

---

## Features

- ✅ Quality planning and inspection execution
- ✅ Non-conformance report (NCR) management
- ✅ First article inspection (FAI) - AS9102 compliant
- ✅ Electronic signatures (21 CFR Part 11 compliant)
- ✅ QIF (Quality Information Framework) integration
- ✅ Dashboard metrics and analytics
- ✅ Event-driven architecture (Kafka)
- ✅ Distributed caching (Redis)
- ✅ Docker support

---

## Quality Workflows

### Inspection Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED
       ↓
   CANCELLED
```

**Inspection Results**: PASS, FAIL, CONDITIONAL, PENDING

### NCR Lifecycle

```
OPEN → UNDER_REVIEW → DISPOSITION_PENDING → CORRECTIVE_ACTION → CLOSED
  ↓
CANCELLED
```

**Dispositions**: USE_AS_IS, REWORK, SCRAP, RETURN, REPAIR, SORT

### FAI Lifecycle

```
IN_PROGRESS → SUBMITTED → APPROVED
            ↓              ↓
        REJECTED      CANCELLED
```

---

## API Endpoints

### Quality Inspections

**GET `/api/v1/quality/inspections`**
- Get filtered list of inspections with pagination
- Query params: `status`, `result`, `inspectionType`, `partId`, `workOrderId`, `page`, `limit`
- Returns: Inspections with plan, measurements, and signatures

**GET `/api/v1/quality/inspections/:id`**
- Get single inspection by ID
- Returns: Complete inspection details with measurements

**POST `/api/v1/quality/inspections`**
- Create new inspection
- Body: `{ planId, partId, workOrderId?, lotNumber?, serialNumber?, inspectionType, inspectionDate, quantityInspected, notes? }`

**PUT `/api/v1/quality/inspections/:id`**
- Update inspection
- Body: `{ status?, result?, quantityAccepted?, quantityRejected?, notes? }`

**DELETE `/api/v1/quality/inspections/:id`**
- Delete inspection

### Non-Conformance Reports (NCRs)

**GET `/api/v1/quality/ncrs`**
- Get filtered list of NCRs
- Query params: `status`, `ncrType`, `severity`, `partId`, `workOrderId`, `page`, `limit`

**GET `/api/v1/quality/ncrs/:id`**
- Get single NCR by ID

**POST `/api/v1/quality/ncrs`**
- Create new NCR
- Body: `{ partId, workOrderId?, ncrType, severity, problemDescription, quantityAffected, ... }`

**PUT `/api/v1/quality/ncrs/:id`**
- Update NCR
- Body: `{ status?, disposition?, rootCause?, correctiveAction?, ... }`

### First Article Inspection (FAI)

**GET `/api/v1/quality/fai`**
- Get filtered list of FAI reports
- Query params: `status`, `faiType`, `partId`, `page`, `limit`

**GET `/api/v1/quality/fai/:id`**
- Get single FAI report by ID

**POST `/api/v1/quality/fai`**
- Create new FAI report
- Body: `{ partId, partNumber, partRevision, serialNumber?, faiType, reason, inspectionDate }`

**PUT `/api/v1/quality/fai/:id`**
- Update FAI report
- Body: `{ status?, result?, submittedDate?, approvedDate?, notes? }`

### Dashboard

**GET `/api/v1/quality/dashboard/metrics`**
- Get quality dashboard metrics
- Returns: Inspection, NCR, and FAI metrics with pass rates

---

## Data Models

### Quality Plan
- Plan number, name, description
- Part ID, routing operation ID
- Inspection type, sampling plan
- Version control

### Quality Characteristic
- Characteristic name, type (variable, attribute, visual, etc.)
- Nominal value, tolerances, unit
- Criticality (critical, major, minor)
- Measurement method, equipment, test method
- Inspection frequency

### Quality Inspection
- Inspection number, date, inspector
- Status, result
- Quantities (inspected, accepted, rejected)
- NCR generation
- Electronic signatures

### NCR (Non-Conformance Report)
- NCR number, type, severity, status
- Problem description, root cause
- Disposition (use-as-is, rework, scrap, etc.)
- Cost impact (scrap, rework, total)
- Corrective and preventive actions

### FAI Report (AS9102 Compliant)
- FAI number, type, reason
- Part information with revision
- Inspection date, personnel
- Characteristics with measurements
- Approval workflow

### Electronic Signature (21 CFR Part 11)
- Signature type, meaning
- Signer information
- IP address, hash, timestamp
- Verification and invalidation support

---

## Configuration

### Environment Variables

```bash
# Service
NODE_ENV=development
PORT=3010
SERVICE_NAME=quality-service

# Database
QUALITY_DATABASE_URL=postgresql://mes_quality_user:mes_quality_password_dev@localhost:5434/mes_quality

# Redis & Kafka
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Business Rules
MAX_QUALITY_QUANTITY=10000
DEFAULT_DAILY_CAPACITY=100

# Auth Integration
AUTH_SERVICE_URL=http://localhost:3008
```

---

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (Quality database on port 5434)
- Redis 7+
- Kafka 3+

### Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Docker

### Build Image

```bash
docker build -t mes-quality-service:latest .
```

### Run Container

```bash
docker run -p 3010:3010 \
  -e QUALITY_DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://redis:6379 \
  -e KAFKA_BROKERS=kafka:9092 \
  mes-quality-service:latest
```

### Docker Compose

```bash
# Start all services
docker compose -f docker-compose.databases.yml up -d
docker compose -f docker-compose.services.yml up -d

# View logs
docker compose -f docker-compose.services.yml logs -f quality-service

# Health check
curl http://localhost:3010/health
```

---

## Integration

### With Other Services

**Work Order Service**: Links inspections to work orders
**Material Service**: Tracks quality by lot and serial number
**Traceability Service**: Quality data in genealogy tracking
**Auth Service**: Authentication and authorization

---

## Compliance

### AS9102 (First Article Inspection)
- Full, partial, and delta FAI support
- Characteristic-level measurements
- Balloon number tracking (drawing callouts)
- Approval workflow

### 21 CFR Part 11 (Electronic Signatures)
- Digital signatures for quality records
- IP address and timestamp capture
- Signature hash for verification
- Invalidation support with audit trail

### QIF (Quality Information Framework)
- CMM measurement import
- Plan and characteristic mapping
- Results integration

---

## Architecture

```
Frontend (5173) → Vite Proxy
                      ↓
             Quality Service (3010)
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Postgres     Redis Cache    Kafka Events
  (port 5434)    (port 6379)   (port 9092)
```

---

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker-compose.services.yml logs quality-service

# Common issues:
# 1. Database not ready - wait 30 seconds after starting databases
# 2. Port 3010 in use - kill conflicting process
# 3. Environment variables missing - check .env file
```

### Database connection errors

```bash
# Check database is running
docker compose -f docker-compose.databases.yml ps postgres-quality

# Test connection
docker exec mes-postgres-quality pg_isready -U mes_quality_user -d mes_quality
```

---

## Support

**Documentation**: See `/docs` for detailed API documentation
**Health Check**: `GET /health`
**Service**: quality-service
**Version**: 1.0.0

---

**Last Updated**: 2025-10-18
**Status**: Production Ready ✅
