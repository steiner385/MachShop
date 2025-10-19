# MES Microservices - Docker Quick Start Guide

Complete guide for running the MES system using Docker Compose.

## Architecture Overview

The MES system is split into three Docker Compose files for better organization:

1. **docker-compose.databases.yml** - All databases and messaging infrastructure
2. **docker-compose.infrastructure.yml** - API Gateway, observability, and monitoring
3. **docker-compose.services.yml** - Microservice applications

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 8GB RAM available for Docker
- Ports 3008, 5432-5439, 6379, 8000-8001, 8080-8081, 9092 available

## Quick Start

### Option 1: Start Everything (Databases + Auth Service)

```bash
# 1. Start databases and infrastructure
docker compose -f docker-compose.databases.yml up -d

# 2. Wait for databases to be healthy (30-60 seconds)
docker compose -f docker-compose.databases.yml ps

# 3. Start Auth Service
docker compose -f docker-compose.services.yml up -d

# 4. View logs
docker compose -f docker-compose.services.yml logs -f auth-service
```

### Option 2: Development Workflow (Local Service, Docker Databases)

```bash
# 1. Start only databases
docker compose -f docker-compose.databases.yml up -d

# 2. Run Auth Service locally for development
cd services/auth
npm install
npm run prisma:generate
npm run dev
```

## Service Ports

### Microservices
- **Authentication Service**: http://localhost:3008
  - Health: http://localhost:3008/health
  - API: http://localhost:3008/api/v1/auth/*

### Databases
- **postgres-auth**: localhost:5432
- **postgres-work-order**: localhost:5433
- **postgres-quality**: localhost:5434
- **postgres-material**: localhost:5435
- **postgres-traceability**: localhost:5436
- **postgres-resource**: localhost:5437
- **postgres-reporting**: localhost:5438
- **postgres-integration**: localhost:5439

### Infrastructure
- **Redis**: localhost:6379
- **Redis Commander**: http://localhost:8081
- **Kafka**: localhost:9092
- **Kafka UI**: http://localhost:8080
- **Zookeeper**: localhost:2181
- **pgAdmin**: http://localhost:5050

## Database Credentials

All databases use development credentials:

```
Authentication DB:
  URL: postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth
  User: mes_auth_user
  Password: mes_auth_password_dev

Work Order DB:
  URL: postgresql://mes_wo_user:mes_wo_password_dev@localhost:5433/mes_work_order

Quality DB:
  URL: postgresql://mes_quality_user:mes_quality_password_dev@localhost:5434/mes_quality

Material DB:
  URL: postgresql://mes_material_user:mes_material_password_dev@localhost:5435/mes_material

Traceability DB:
  URL: postgresql://mes_trace_user:mes_trace_password_dev@localhost:5436/mes_traceability

Resource DB:
  URL: postgresql://mes_resource_user:mes_resource_password_dev@localhost:5437/mes_resource

Reporting DB:
  URL: postgresql://mes_reporting_user:mes_reporting_password_dev@localhost:5438/mes_reporting

Integration DB:
  URL: postgresql://mes_integration_user:mes_integration_password_dev@localhost:5439/mes_integration
```

## Database Management

### Access pgAdmin

1. Open http://localhost:5050
2. Login: admin@mes.local / admin
3. All databases are pre-configured

### Connect via CLI

```bash
# Connect to Auth database
docker exec -it mes-postgres-auth psql -U mes_auth_user -d mes_auth

# List all tables
\dt

# Query users
SELECT id, username, email FROM "User";
```

## Running Database Migrations

### For Auth Service

```bash
# Method 1: From host (requires local Prisma)
cd services/auth
export AUTH_DATABASE_URL=postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth
npx prisma migrate deploy

# Method 2: Inside container
docker compose -f docker-compose.services.yml exec auth-service \
  npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Seed Sample Data

```bash
# Run seed script for Auth Service
cd services/auth
npx prisma db seed
```

## Testing Authentication

### Test Login Endpoint

```bash
# Login as admin user
curl -X POST http://localhost:3008/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Response will include token and refreshToken
```

### Test Health Check

```bash
# Check Auth Service health
curl http://localhost:3008/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "service": "auth-service",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### Test Protected Endpoint

```bash
# Get current user (requires token from login)
curl http://localhost:3008/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Commands

### View Logs

```bash
# All databases
docker compose -f docker-compose.databases.yml logs -f

# Auth Service only
docker compose -f docker-compose.services.yml logs -f auth-service

# Specific database
docker compose -f docker-compose.databases.yml logs -f postgres-auth

# Kafka logs
docker compose -f docker-compose.databases.yml logs -f kafka
```

### Restart Services

```bash
# Restart Auth Service
docker compose -f docker-compose.services.yml restart auth-service

# Restart all databases
docker compose -f docker-compose.databases.yml restart

# Rebuild and restart Auth Service
docker compose -f docker-compose.services.yml up -d --build auth-service
```

### Stop Everything

```bash
# Stop services (keeps data)
docker compose -f docker-compose.services.yml down
docker compose -f docker-compose.databases.yml down

# Stop and remove ALL data (⚠️ destructive)
docker compose -f docker-compose.services.yml down -v
docker compose -f docker-compose.databases.yml down -v
```

### Check Service Status

```bash
# Check all containers
docker compose -f docker-compose.databases.yml ps
docker compose -f docker-compose.services.yml ps

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Troubleshooting

### Auth Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.services.yml logs auth-service

# Common issues:
# 1. Database not ready - wait 30 seconds after starting databases
# 2. Redis not available - check redis container is running
# 3. Port 3008 already in use - stop conflicting process
```

### Database Connection Errors

```bash
# Check database is running
docker compose -f docker-compose.databases.yml ps postgres-auth

# Check database health
docker exec mes-postgres-auth pg_isready -U mes_auth_user -d mes_auth

# Restart database
docker compose -f docker-compose.databases.yml restart postgres-auth
```

### Redis Connection Errors

```bash
# Check Redis is running
docker compose -f docker-compose.databases.yml ps redis

# Test Redis connection
docker exec mes-redis redis-cli ping
# Should return: PONG
```

### Kafka Connection Errors

```bash
# Check Kafka and Zookeeper
docker compose -f docker-compose.databases.yml ps kafka zookeeper

# View Kafka topics
docker exec mes-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Port Conflicts

```bash
# Find process using port 3008
lsof -ti:3008

# Kill process
kill -9 $(lsof -ti:3008)

# Or change port in docker-compose.services.yml
```

## Monitoring

### Kafka UI

View messages, topics, and consumer groups:
- URL: http://localhost:8080
- Cluster: mes-local

### Redis Commander

Browse Redis keys and values:
- URL: http://localhost:8081
- Connection: local (auto-configured)

### pgAdmin

Manage all databases:
- URL: http://localhost:5050
- Login: admin@mes.local / admin

## Development Tips

### Hot Reload for Auth Service

For faster development, mount source code:

```bash
# Already configured in docker-compose.services.yml
volumes:
  - ./services/auth/src:/app/src:ro
```

### Running Tests

```bash
# Run Auth Service tests locally
cd services/auth
npm test

# Run E2E tests (requires services running)
cd /path/to/mes
npm run test:e2e
```

### Debugging

```bash
# Shell into Auth Service container
docker compose -f docker-compose.services.yml exec auth-service sh

# Check environment variables
docker compose -f docker-compose.services.yml exec auth-service env | grep DATABASE

# View Prisma client generation
docker compose -f docker-compose.services.yml exec auth-service \
  ls -la node_modules/.prisma/
```

## Production Considerations

⚠️ **This setup is for DEVELOPMENT ONLY**

Before deploying to production:

1. **Change all default passwords** in docker-compose files
2. **Use secure JWT_SECRET** (min 32 characters)
3. **Enable TLS** for databases and Redis
4. **Configure proper resource limits**
5. **Set up persistent volume backups**
6. **Use external secret management** (Vault, AWS Secrets Manager)
7. **Configure proper logging and monitoring**
8. **Use Kubernetes** for production orchestration

## Testing Authentication Service

### Manual API Testing

Test the Auth Service directly (without frontend):

```bash
# 1. Test health endpoint
curl http://localhost:3008/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-18T...",
#   "service": "auth-service",
#   "checks": {
#     "database": true,
#     "redis": true
#   }
# }

# 2. Test login endpoint
curl -X POST http://localhost:3008/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Expected response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "...",
#     "username": "admin",
#     "email": "admin@mes.com",
#     ...
#   }
# }

# 3. Test /me endpoint (use token from login response)
TOKEN="<your-token-here>"
curl http://localhost:3008/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Test refresh token endpoint
REFRESH_TOKEN="<your-refresh-token-here>"
curl -X POST http://localhost:3008/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

### E2E Testing with Frontend

Test authentication through the frontend (realistic user flow):

```bash
# 1. Ensure Auth Service is running
docker compose -f docker-compose.services.yml ps auth-service

# 2. Start frontend dev server (opens new terminal)
cd frontend
npm run dev
# Frontend will proxy /api/v1/auth requests to Auth Service (port 3008)

# 3. Run authentication E2E tests
npm run test:e2e -- authentication.spec.ts --reporter=list

# Tests will:
# - Use testAuthHelper to get real JWT tokens from Auth Service
# - Test login, logout, session timeout, 401 redirects
# - Verify all 19 authentication scenarios work correctly
```

### Test Modes

**Mode 1: Through Frontend Proxy (Default)**
- Frontend (port 5178/5278) → Auth Service (port 3008)
- Realistic browser-based testing
- Vite proxy routes `/api/v1/auth/*` automatically

**Mode 2: Direct Auth Service (Optional)**
```bash
# Set environment variable to bypass frontend proxy
AUTH_SERVICE_URL=http://localhost:3008 npm run test:e2e -- authentication.spec.ts
```

### Troubleshooting E2E Tests

```bash
# Auth Service not responding
docker compose -f docker-compose.services.yml logs auth-service

# Database connection issues
docker compose -f docker-compose.databases.yml ps postgres-auth
docker exec mes-postgres-auth pg_isready -U mes_auth_user -d mes_auth

# Redis connection issues
docker exec mes-redis redis-cli ping

# Frontend proxy issues
# Check frontend/vite.config.ts proxy configuration
# Ensure AUTH_SERVICE_URL env var is set correctly
```

## Next Steps

- [x] Authentication Service implemented and ready for testing
- [ ] Run database migrations for Auth Service
- [ ] Seed sample user data (admin, quality engineer, operator)
- [ ] Test login flow end-to-end (manual + E2E tests)
- [ ] Implement remaining 7 microservices (Work Order, Quality, Material, etc.)
- [ ] Configure API Gateway (Kong) routes
- [ ] Set up distributed tracing with Jaeger
- [ ] Configure centralized logging with ELK stack

## Support

For issues or questions:
- Check logs first: `docker compose logs -f`
- Review health checks: `docker ps`
- Consult service README: `services/auth/README.md`
- Check Prisma schema: `services/auth/prisma/schema.prisma`

---

**Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Development Ready
