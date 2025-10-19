# Work Order Service

MES Work Order Management Microservice - Handles work order lifecycle, operations, and production scheduling.

**Port**: 3009
**Database**: postgres-work-order (port 5433)
**Status**: ✅ Production Ready

---

## Features

- ✅ Complete work order CRUD operations
- ✅ State machine-based lifecycle management
- ✅ Material and routing associations
- ✅ Operation tracking and completion
- ✅ Dashboard metrics and analytics
- ✅ Business rule validation
- ✅ Event-driven architecture (Kafka)
- ✅ Distributed caching (Redis)
- ✅ Docker support

---

## Work Order Lifecycle

```
CREATED → RELEASED → IN_PROGRESS → COMPLETED
       ↓                        ↓
   CANCELLED ←─────────────── CANCELLED
```

**State Transitions**:
- `CREATED → RELEASED`: Requires part info and manufacturing route
- `RELEASED → IN_PROGRESS`: Requires operations to be defined
- `IN_PROGRESS → COMPLETED`: All ordered quantity must be completed
- `Any → CANCELLED`: Only allowed if no quantities completed

---

## API Endpoints

### Work Orders

**GET `/api/v1/workorders`**
- Get filtered list of work orders with pagination
- Query params: `status`, `priority`, `partNumber`, `dueDateFrom`, `dueDateTo`, `page`, `limit`
- Returns: Work orders with calculated metrics (completion %, overdue status, estimated completion)

**GET `/api/v1/workorders/:id`**
- Get single work order by ID
- Returns: Complete work order details with operations

**POST `/api/v1/workorders`**
- Create new work order
- Body: `{ partNumber, quantityOrdered, priority?, customerOrder?, dueDate?, siteId }`
- Permissions: `workorders.create`

**PUT `/api/v1/workorders/:id`**
- Update existing work order
- Body: `{ quantityOrdered?, priority?, customerOrder?, dueDate?, scheduledStartDate?, scheduledEndDate? }`
- Permissions: `workorders.update`

**DELETE `/api/v1/workorders/:id`**
- Delete work order (only if no quantities completed)
- Permissions: `workorders.delete`

**POST `/api/v1/workorders/:id/release`**
- Release work order to production
- Permissions: `workorders.release`

**GET `/api/v1/workorders/:id/operations`**
- Get work order operations list

**GET `/api/v1/workorders/dashboard/metrics`**
- Get dashboard metrics
- Returns: Total, active, overdue, completed counts

---

## Business Rules

| Rule | Value |
|------|-------|
| Maximum quantity per work order | 10,000 |
| Minimum quantity | 1 |
| Default priority | NORMAL |
| Default daily capacity (for estimates) | 100 units/day |

### Validation Rules

- ✅ Part number required and must exist
- ✅ Quantity must be between 1 and 10,000
- ✅ Site ID required
- ✅ Due date cannot be in the past
- ✅ Cannot reduce quantity below completed quantity
- ✅ Cannot update completed or cancelled work orders
- ✅ Cannot delete work orders with completed quantities

---

## Configuration

### Environment Variables

```bash
# Service
NODE_ENV=development
PORT=3009
SERVICE_NAME=work-order-service

# Database
WORK_ORDER_DATABASE_URL=postgresql://mes_wo_user:mes_wo_password_dev@localhost:5433/mes_work_order

# Redis & Kafka
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Business Rules
MAX_WORK_ORDER_QUANTITY=10000
DEFAULT_DAILY_CAPACITY=100

# Auth Integration
AUTH_SERVICE_URL=http://localhost:3008
```

---

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (Work Order database on port 5433)
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
docker build -t mes-work-order-service:latest .
```

### Run Container

```bash
docker run -p 3009:3009 \
  -e WORK_ORDER_DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://redis:6379 \
  -e KAFKA_BROKERS=kafka:9092 \
  mes-work-order-service:latest
```

### Docker Compose

```bash
# Start all services (databases + auth + work-order)
docker compose -f docker-compose.databases.yml up -d
docker compose -f docker-compose.services.yml up -d

# View logs
docker compose -f docker-compose.services.yml logs -f work-order-service

# Health check
curl http://localhost:3009/health
```

---

## Integration

### With Auth Service

Work Order Service integrates with Auth Service (port 3008) for authentication and authorization.

**Required Permissions**:
- `workorders.read` - View work orders
- `workorders.create` - Create work orders
- `workorders.update` - Update work orders
- `workorders.delete` - Delete work orders
- `workorders.release` - Release to production

### With Other Services

**Material Service**: Validates part numbers and retrieves part information
**Quality Service**: Creates quality inspections for work orders
**Traceability Service**: Tracks material genealogy through work orders
**Resource Service**: Assigns equipment and personnel to operations

---

## Architecture

```
Frontend (5178) → Vite Proxy
                      ↓
            Work Order Service (3009)
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Postgres     Redis Cache    Kafka Events
  (port 5433)    (port 6379)   (port 9092)
```

### Key Components

**Services**:
- `StateMachineService` - Work order state transitions
- `WorkOrderService` - Core business logic

**Routes**:
- `workOrders.ts` - HTTP endpoints

**Types**:
- Work order enums and interfaces
- Event types for Kafka
- Request/Response types

---

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker-compose.services.yml logs work-order-service

# Common issues:
# 1. Database not ready - wait 30 seconds after starting databases
# 2. Port 3009 in use - kill conflicting process
# 3. Environment variables missing - check .env file
```

### Database connection errors

```bash
# Check database is running
docker compose -f docker-compose.databases.yml ps postgres-work-order

# Test connection
docker exec mes-postgres-work-order pg_isready -U mes_wo_user -d mes_work_order
```

---

## Support

**Documentation**: See `/docs` for detailed API documentation
**Health Check**: `GET /health`
**Service**: work-order-service
**Version**: 1.0.0

---

**Last Updated**: 2025-10-18
**Status**: Production Ready ✅
