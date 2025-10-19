# Phase 2 Database Migration Plan
## Week 1-2: Database Migrations & Event Infrastructure

**Date:** October 18, 2025
**Status:** In Progress
**Current Task:** Database Migration Setup

---

## Current Situation Assessment

### Infrastructure Status
- ✅ PostgreSQL 16 running locally (port 5432)
- ✅ 8 microservice Prisma schemas created (`/services/*/prisma/schema.prisma`)
- ✅ Monolith database exists (`mes_dev_db`)
- ❌ Microservice databases NOT created yet
- ❌ Microservice environment variables NOT configured
- ❌ Migrations NOT run yet

### Required Databases (8 Total)

| Service | Database Name | Port | User | Environment Variable |
|---------|--------------|------|------|---------------------|
| Auth | `mes_auth_db` | 5432 | `mes_auth_user` | `AUTH_DATABASE_URL` |
| Work Order | `mes_work_order_db` | 5432 | `mes_wo_user` | `WORK_ORDER_DATABASE_URL` |
| Quality | `mes_quality_db` | 5432 | `mes_quality_user` | `QUALITY_DATABASE_URL` |
| Material | `mes_material_db` | 5432 | `mes_material_user` | `MATERIAL_DATABASE_URL` |
| Traceability | `mes_traceability_db` | 5432 | `mes_trace_user` | `TRACEABILITY_DATABASE_URL` |
| Resource | `mes_resource_db` | 5432 | `mes_resource_user` | `RESOURCE_DATABASE_URL` |
| Reporting | `mes_reporting_db` | 5432 | `mes_reporting_user` | `REPORTING_DATABASE_URL` |
| Integration | `mes_integration_db` | 5432 | `mes_integration_user` | `INTEGRATION_DATABASE_URL` |

---

## Migration Plan (Step-by-Step)

### Step 1: Create Database Users & Databases ✅ Next

```sql
-- Execute these SQL commands to create all databases and users

-- 1. Auth Service
CREATE DATABASE mes_auth_db;
CREATE USER mes_auth_user WITH ENCRYPTED PASSWORD 'mes_auth_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_auth_db TO mes_auth_user;

-- 2. Work Order Service
CREATE DATABASE mes_work_order_db;
CREATE USER mes_wo_user WITH ENCRYPTED PASSWORD 'mes_wo_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_work_order_db TO mes_wo_user;

-- 3. Quality Service
CREATE DATABASE mes_quality_db;
CREATE USER mes_quality_user WITH ENCRYPTED PASSWORD 'mes_quality_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_quality_db TO mes_quality_user;

-- 4. Material Service
CREATE DATABASE mes_material_db;
CREATE USER mes_material_user WITH ENCRYPTED PASSWORD 'mes_material_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_material_db TO mes_material_user;

-- 5. Traceability Service
CREATE DATABASE mes_traceability_db;
CREATE USER mes_trace_user WITH ENCRYPTED PASSWORD 'mes_trace_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_traceability_db TO mes_trace_user;

-- 6. Resource Service
CREATE DATABASE mes_resource_db;
CREATE USER mes_resource_user WITH ENCRYPTED PASSWORD 'mes_resource_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_resource_db TO mes_resource_user;

-- 7. Reporting Service
CREATE DATABASE mes_reporting_db;
CREATE USER mes_reporting_user WITH ENCRYPTED PASSWORD 'mes_reporting_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_reporting_db TO mes_reporting_user;

-- 8. Integration Service
CREATE DATABASE mes_integration_db;
CREATE USER mes_integration_user WITH ENCRYPTED PASSWORD 'mes_integration_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_integration_db TO mes_integration_user;
```

### Step 2: Update Environment Variables

Add to `/home/tony/GitHub/mes/.env`:

```bash
# ============================================================================
# Microservice Database URLs (Phase 2)
# ============================================================================

# Auth Service Database (Port 5432)
AUTH_DATABASE_URL="postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth_db?schema=public"

# Work Order Service Database (Port 5432)
WORK_ORDER_DATABASE_URL="postgresql://mes_wo_user:mes_wo_password_dev@localhost:5432/mes_work_order_db?schema=public"

# Quality Service Database (Port 5432)
QUALITY_DATABASE_URL="postgresql://mes_quality_user:mes_quality_password_dev@localhost:5432/mes_quality_db?schema=public"

# Material Service Database (Port 5432)
MATERIAL_DATABASE_URL="postgresql://mes_material_user:mes_material_password_dev@localhost:5432/mes_material_db?schema=public"

# Traceability Service Database (Port 5432)
TRACEABILITY_DATABASE_URL="postgresql://mes_trace_user:mes_trace_password_dev@localhost:5432/mes_traceability_db?schema=public"

# Resource Service Database (Port 5432)
RESOURCE_DATABASE_URL="postgresql://mes_resource_user:mes_resource_password_dev@localhost:5432/mes_resource_db?schema=public"

# Reporting Service Database (Port 5432)
REPORTING_DATABASE_URL="postgresql://mes_reporting_user:mes_reporting_password_dev@localhost:5432/mes_reporting_db?schema=public"

# Integration Service Database (Port 5432)
INTEGRATION_DATABASE_URL="postgresql://mes_integration_user:mes_integration_password_dev@localhost:5432/mes_integration_db?schema=public"
```

### Step 3: Run Prisma Migrations (Each Service)

```bash
# Auth Service
cd /home/tony/GitHub/mes/services/auth
npx prisma migrate dev --name initial_auth_schema

# Work Order Service
cd /home/tony/GitHub/mes/services/work-order
npx prisma migrate dev --name initial_work_order_schema

# Quality Service
cd /home/tony/GitHub/mes/services/quality
npx prisma migrate dev --name initial_quality_schema

# Material Service
cd /home/tony/GitHub/mes/services/material
npx prisma migrate dev --name initial_material_schema

# Traceability Service
cd /home/tony/GitHub/mes/services/traceability
npx prisma migrate dev --name initial_traceability_schema

# Resource Service
cd /home/tony/GitHub/mes/services/resource
npx prisma migrate dev --name initial_resource_schema

# Reporting Service
cd /home/tony/GitHub/mes/services/reporting
npx prisma migrate dev --name initial_reporting_schema

# Integration Service
cd /home/tony/GitHub/mes/services/integration
npx prisma migrate dev --name initial_integration_schema
```

### Step 4: Create Seed Scripts

For each service, create `/services/*/prisma/seed.ts` with development data.

---

## Rollback Procedures

### Rollback Migration
```bash
# In service directory
npx prisma migrate reset
```

### Drop Databases (Complete Rollback)
```sql
DROP DATABASE IF EXISTS mes_auth_db;
DROP USER IF EXISTS mes_auth_user;

DROP DATABASE IF EXISTS mes_work_order_db;
DROP USER IF EXISTS mes_wo_user;

-- ... repeat for all 8 services
```

---

## Verification Checklist

- [ ] All 8 databases created
- [ ] All 8 database users created with correct permissions
- [ ] Environment variables added to `.env`
- [ ] Prisma Client generated for each service
- [ ] Migrations applied successfully
- [ ] Can connect to each database from each service
- [ ] Seed data loaded (optional for development)

---

## Next Steps After Migration

1. **Create seed scripts** for development data
2. **Test database connectivity** from each microservice
3. **Begin Kafka event infrastructure** implementation
4. **Implement cache invalidation** system

---

**Document Version:** 1.0
**Last Updated:** October 18, 2025
**Status:** Ready to Execute
