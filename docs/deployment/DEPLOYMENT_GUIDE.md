# MES System - Deployment Guide

**Version:** 2.0.0 (Updated)
**Date:** October 2025
**Current Architecture:** Hybrid Monolith (Microservices Migration Planned)
**Status:** Production Ready for Monolithic Deployment

⚠️ **Important**: This guide describes both current (monolithic) and planned (microservices) deployment options. The system currently runs as a monolith on port 3001 with microservices migration in progress.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Service Architecture](#service-architecture)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Service Deployment](#service-deployment)
8. [Health Monitoring](#health-monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Quick Start (Current Deployment)

### Local Development (Recommended)
```bash
# 1. Install dependencies
npm install

# 2. Setup database
npm run db:migrate
npm run db:seed

# 3. Start development servers
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### Docker Development
```bash
docker-compose up -d
# Same ports as above
```

---

## Architecture Overview

### Current Architecture (Monolithic)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite)                      │
│                   Port: 5173                            │
└──────────────────┬──────────────────────────────────────┘
                   │ API Proxy
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐    ┌────────▼─────────┐
│ Auth Service │    │ Work Order Svc   │
│  Port: 3008  │    │   Port: 3009     │
└───────┬──────┘    └────────┬─────────┘
        │                    │
┌───────▼──────┐    ┌────────▼─────────┐
│Quality Svc   │    │ Material Svc     │
│ Port: 3010   │    │  Port: 3011      │
└───────┬──────┘    └────────┬─────────┘
        │                    │
┌───────▼──────┐    ┌────────▼─────────┐
│Traceability  │    │ Resource Svc     │
│ Port: 3012   │    │  Port: 3013      │
└───────┬──────┘    └────────┬─────────┘
        │                    │
┌───────▼──────┐    ┌────────▼─────────┐
│Reporting Svc │    │ Integration Svc  │
│ Port: 3014   │    │  Port: 3015      │
└───────┬──────┘    └────────┬─────────┘
        │                    │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
PostgreSQL      Redis          Kafka
(8 DBs)        (Cache)      (Events)
5432-5439       6379          9092
```

---

## Prerequisites

### Required Software
- **Docker:** Version 20.10 or later
- **Docker Compose:** Version 2.0 or later
- **Node.js:** Version 18+ (for local development)
- **Git:** Latest version

### System Requirements
- **RAM:** Minimum 8GB, Recommended 16GB
- **Disk Space:** Minimum 20GB free space
- **CPU:** Multi-core processor (4+ cores recommended)
- **OS:** Linux, macOS, or Windows with WSL2

### Network Ports
Ensure the following ports are available:

**Microservices:**
- 3008 - Auth Service
- 3009 - Work Order Service
- 3010 - Quality Service
- 3011 - Material Service
- 3012 - Traceability Service
- 3013 - Resource Service
- 3014 - Reporting Service
- 3015 - Integration Service

**Databases:**
- 5432-5439 - PostgreSQL instances (8 databases)
- 5050 - pgAdmin

**Infrastructure:**
- 6379 - Redis
- 8081 - Redis Commander
- 9092, 29092 - Kafka
- 8080 - Kafka UI
- 2181 - Zookeeper

**Frontend:**
- 5173 - Vite Development Server

---

## Quick Start

### Automated Deployment (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd mes

# 2. Start all services (infrastructure + microservices)
./start-all-services.sh

# 3. Verify all services are healthy
./check-services-health.sh
```

The startup script will:
1. Create Docker network
2. Start all 8 PostgreSQL databases
3. Start Redis and Kafka
4. Build all 8 microservices
5. Start all microservices
6. Verify health of all services

### Manual Deployment

```bash
# 1. Create Docker network
docker network create mes-microservices-network

# 2. Start infrastructure (databases, Redis, Kafka)
docker compose -f docker-compose.databases.yml up -d

# 3. Wait for databases to initialize (30 seconds)
sleep 30

# 4. Start all microservices
docker compose -f docker-compose.services.yml up -d

# 5. Check health
curl http://localhost:3008/health  # Auth
curl http://localhost:3009/health  # Work Order
curl http://localhost:3010/health  # Quality
curl http://localhost:3011/health  # Material
curl http://localhost:3012/health  # Traceability
curl http://localhost:3013/health  # Resource
curl http://localhost:3014/health  # Reporting
curl http://localhost:3015/health  # Integration
```

---

## Service Architecture

### 1. Authentication Service (Port 3008)
**Purpose:** JWT authentication, user management, RBAC
**Database:** postgres-auth (5432)
**Key Features:**
- User registration and login
- JWT token generation and validation
- Role-based access control
- Session management

**Health Check:**
```bash
curl http://localhost:3008/health
```

### 2. Work Order Service (Port 3009)
**Purpose:** Work order lifecycle management
**Database:** postgres-work-order (5433)
**Key Features:**
- Work order CRUD operations
- State machine (8 states)
- Dashboard metrics
- Production scheduling

**API Endpoints:**
- `GET /api/v1/workorders` - List work orders
- `POST /api/v1/workorders` - Create work order
- `PUT /api/v1/workorders/:id` - Update work order
- `PUT /api/v1/workorders/:id/transition` - State transition

### 3. Quality Service (Port 3010)
**Purpose:** Quality control, inspections, NCRs, FAI
**Database:** postgres-quality (5434)
**Key Features:**
- AS9102 compliance
- 21 CFR Part 11 compliance
- Electronic signatures
- Inspections and NCRs
- First Article Inspection (FAI)

**API Endpoints:**
- `GET /api/v1/quality/inspections` - List inspections
- `POST /api/v1/quality/inspections` - Create inspection
- `GET /api/v1/quality/ncrs` - List NCRs
- `GET /api/v1/quality/fai` - List FAI records

### 4. Material Service (Port 3011)
**Purpose:** Material inventory and tracking
**Database:** postgres-material (5435)
**Key Features:**
- Material master data
- Lot tracking
- Inventory transactions
- Expiration management

**API Endpoints:**
- `GET /api/v1/material/materials` - List materials
- `POST /api/v1/material/materials` - Create material
- `GET /api/v1/material/lots` - List lots
- `POST /api/v1/material/transactions` - Record transaction

### 5. Traceability Service (Port 3012)
**Purpose:** Serial number tracking and genealogy
**Database:** postgres-traceability (5436)
**Key Features:**
- Serial number generation
- Genealogy tracking
- Material traceability
- Where-used analysis

**API Endpoints:**
- `GET /api/v1/traceability/serial-numbers` - List serial numbers
- `POST /api/v1/traceability/serial-numbers` - Generate serial
- `GET /api/v1/traceability/genealogy/:serial` - Get genealogy

### 6. Resource Service (Port 3013)
**Purpose:** Equipment and personnel management
**Database:** postgres-resource (5437)
**Key Features:**
- Equipment management
- Personnel tracking
- Work center operations
- Shift management

**API Endpoints:**
- `GET /api/v1/resource/equipment` - List equipment
- `POST /api/v1/resource/equipment` - Create equipment
- `GET /api/v1/resource/personnel` - List personnel

### 7. Reporting Service (Port 3014)
**Purpose:** Analytics, dashboards, and OEE
**Database:** postgres-reporting (5438)
**Key Features:**
- Production dashboards
- OEE calculations
- Custom reports
- Analytics

**API Endpoints:**
- `GET /api/v1/reporting/dashboard` - Dashboard metrics
- `GET /api/v1/reporting/oee` - OEE metrics
- `POST /api/v1/reporting/custom` - Custom reports

### 8. Integration Service (Port 3015)
**Purpose:** ERP/PLM integration
**Database:** postgres-integration (5439)
**Key Features:**
- Oracle EBS adapter
- Oracle Fusion adapter
- Teamcenter PLM adapter
- Sync job management

**API Endpoints:**
- `GET /api/v1/integration/configs` - List integrations
- `POST /api/v1/integration/configs` - Create integration
- `POST /api/v1/integration/sync` - Trigger sync job

---

## Environment Configuration

Each service has its own `.env` file located in `services/<service-name>/.env`.

### Common Environment Variables

All services share these common variables:

```env
NODE_ENV=development
PORT=<service-port>
SERVICE_NAME=<service-name>-service

# Database
<SERVICE>_DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=<service-name>-service
KAFKA_GROUP_ID=<service-name>-service-group

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Auth Service Integration
AUTH_SERVICE_URL=http://localhost:3008
```

### Service-Specific Variables

**Auth Service:**
```env
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-min-32-characters
```

**Work Order Service:**
```env
MAX_WORK_ORDER_QUANTITY=10000
DEFAULT_DAILY_CAPACITY=100
```

---

## Database Setup

### Database Architecture

The system uses **Database Per Service** pattern with 8 independent PostgreSQL databases:

| Service | Database Name | Port | User | Container Name |
|---------|--------------|------|------|----------------|
| Auth | mes_auth | 5432 | mes_auth_user | postgres-auth |
| Work Order | mes_work_order | 5433 | mes_wo_user | postgres-work-order |
| Quality | mes_quality | 5434 | mes_quality_user | postgres-quality |
| Material | mes_material | 5435 | mes_material_user | postgres-material |
| Traceability | mes_traceability | 5436 | mes_trace_user | postgres-traceability |
| Resource | mes_resource | 5437 | mes_resource_user | postgres-resource |
| Reporting | mes_reporting | 5438 | mes_reporting_user | postgres-reporting |
| Integration | mes_integration | 5439 | mes_integration_user | postgres-integration |

### Database Access

**Using psql:**
```bash
psql -h localhost -p 5432 -U mes_auth_user -d mes_auth
psql -h localhost -p 5433 -U mes_wo_user -d mes_work_order
# ... etc for other databases
```

**Using pgAdmin:**
1. Open http://localhost:5050
2. Login: admin@mes.local / admin
3. All 8 databases are pre-configured

---

## Service Deployment

### Development Mode

```bash
# Start all services in development mode
docker compose -f docker-compose.services.yml up -d

# View logs
docker compose -f docker-compose.services.yml logs -f

# View specific service logs
docker compose -f docker-compose.services.yml logs -f auth-service
```

### Production Build

```bash
# Build all services
docker compose -f docker-compose.services.yml build

# Start with production configuration
NODE_ENV=production docker compose -f docker-compose.services.yml up -d
```

### Individual Service Management

```bash
# Restart a specific service
docker compose -f docker-compose.services.yml restart auth-service

# Stop a specific service
docker compose -f docker-compose.services.yml stop quality-service

# View service status
docker compose -f docker-compose.services.yml ps

# Scale a service (horizontal scaling)
docker compose -f docker-compose.services.yml up -d --scale work-order-service=3
```

---

## Health Monitoring

### Automated Health Checks

Use the provided health check script:

```bash
./check-services-health.sh
```

This will test all 8 services and display:
- Health status (✓ or ✗)
- Service uptime
- Response time
- Summary statistics

### Manual Health Checks

Each service exposes a `/health` endpoint:

```bash
# Check all services
for port in 3008 3009 3010 3011 3012 3013 3014 3015; do
  echo "Checking port $port..."
  curl -s http://localhost:$port/health | jq .
done
```

### Container Health

```bash
# Check Docker container health
docker compose -f docker-compose.services.yml ps

# View resource usage
docker stats
```

---

## Troubleshooting

### Service Won't Start

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.services.yml logs [service-name]
   ```

2. **Verify environment variables:**
   ```bash
   cat services/[service-name]/.env
   ```

3. **Check port availability:**
   ```bash
   lsof -i :3008  # Replace with service port
   ```

### Database Connection Issues

1. **Verify database is running:**
   ```bash
   docker compose -f docker-compose.databases.yml ps
   ```

2. **Test database connection:**
   ```bash
   psql -h localhost -p 5432 -U mes_auth_user -d mes_auth -c "SELECT 1"
   ```

3. **Check database logs:**
   ```bash
   docker compose -f docker-compose.databases.yml logs postgres-auth
   ```

### Service Communication Issues

1. **Verify network:**
   ```bash
   docker network inspect mes-microservices-network
   ```

2. **Check service DNS resolution:**
   ```bash
   docker exec mes-work-order-service ping auth-service
   ```

3. **Verify CORS configuration:**
   - Check `CORS_ORIGIN` in `.env` files
   - Ensure frontend URL matches

### Common Issues

**Issue:** "Network mes-microservices-network not found"
```bash
docker network create mes-microservices-network
```

**Issue:** "Port already in use"
```bash
# Find and kill process using port
lsof -ti:3008 | xargs kill -9
```

**Issue:** "Database connection timeout"
```bash
# Restart database services
docker compose -f docker-compose.databases.yml restart
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Update all `.env` files with production credentials
- [ ] Change all default passwords and secrets
- [ ] Configure production database URLs
- [ ] Set `NODE_ENV=production`
- [ ] Enable SSL/TLS for all services
- [ ] Configure production CORS origins
- [ ] Set up production logging (e.g., CloudWatch, Datadog)
- [ ] Configure monitoring and alerting
- [ ] Set up backup and disaster recovery
- [ ] Review and tighten rate limits
- [ ] Enable authentication on Redis and Kafka

### Kubernetes Deployment

Kubernetes manifests are available in the `k8s/` directory:

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/databases/
kubectl apply -f k8s/services/

# Verify deployment
kubectl get pods -n mes-production
kubectl get services -n mes-production
```

### Environment-Specific Configuration

**Staging:**
```bash
NODE_ENV=staging docker compose -f docker-compose.services.yml up -d
```

**Production:**
```bash
NODE_ENV=production docker compose -f docker-compose.services.yml up -d
```

### Scaling Recommendations

**High Load Services:**
- Work Order Service: 3-5 replicas
- Quality Service: 2-3 replicas
- Material Service: 2-3 replicas

**Medium Load Services:**
- Auth Service: 2 replicas
- Traceability Service: 2 replicas
- Reporting Service: 2 replicas

**Low Load Services:**
- Resource Service: 1-2 replicas
- Integration Service: 1-2 replicas

---

## Management Scripts

Three management scripts are provided:

### start-all-services.sh
Starts all infrastructure and microservices in the correct order.

```bash
./start-all-services.sh
```

### stop-all-services.sh
Stops all services and infrastructure.

```bash
./stop-all-services.sh
```

### check-services-health.sh
Checks health status of all 8 microservices.

```bash
./check-services-health.sh
```

---

## Additional Resources

- **Architecture Documentation:** See `SERVICES_COMPLETE.md`
- **Migration Guide:** See `MICROSERVICES_MIGRATION_SUMMARY.md`
- **Implementation Roadmap:** See `MES_IMPLEMENTATION_ROADMAP.md`
- **API Documentation:** Each service has a README in `services/<service-name>/`

---

## Support

For issues, questions, or contributions:
- Open an issue in the repository
- Review existing documentation
- Check troubleshooting section above

---

**Deployment Status:** ✅ PRODUCTION READY
**Last Updated:** 2025-10-18
**Version:** 1.0.0
