# Database Migration Scripts
## Phase 2, Task 2.3: Database Per Service Pattern

This directory contains scripts for managing database migrations across all 8 microservices.

---

## 📋 Prerequisites

1. **Docker Compose** - To run the database infrastructure
2. **Node.js** - To run Prisma migrations
3. **.env file** - Copy from `.env.example` and configure

---

## 🚀 Quick Start

### 1. Start Database Infrastructure

```bash
# Start all 8 databases + Kafka + Redis
docker compose -f docker-compose.databases.yml up -d

# Check status
docker compose -f docker-compose.databases.yml ps

# View logs
docker compose -f docker-compose.databases.yml logs -f
```

### 2. Run Initial Migrations

```bash
# Run migrations for all 8 services
./scripts/migrate-all-databases.sh dev
```

This will:
- Create migration files for each service
- Apply migrations to each database
- Generate Prisma clients

### 3. Verify Migrations

```bash
# Check database health
./scripts/check-database-health.sh

# View migration status
./scripts/migration-status.sh
```

---

## 📜 Available Scripts

### `migrate-all-databases.sh`

**Main migration orchestration script** - Manages migrations for all 8 services

**Usage:**
```bash
./scripts/migrate-all-databases.sh [command]
```

**Commands:**

- **`dev`** - Create and apply migrations (development)
  ```bash
  ./scripts/migrate-all-databases.sh dev
  ```
  - Creates new migration files
  - Applies migrations to database
  - Generates Prisma clients
  - **Use for:** Initial setup, schema changes during development

- **`deploy`** - Apply existing migrations only (production)
  ```bash
  ./scripts/migrate-all-databases.sh deploy
  ```
  - Applies existing migration files
  - Does NOT create new migrations
  - **Use for:** Production deployments, CI/CD pipelines

- **`reset`** - Reset all databases (DESTRUCTIVE!)
  ```bash
  ./scripts/migrate-all-databases.sh reset
  ```
  - Drops all tables
  - Reapplies all migrations
  - Requires confirmation
  - **Use for:** Complete database reset (development only)

- **`generate`** - Generate Prisma clients only
  ```bash
  ./scripts/migrate-all-databases.sh generate
  ```
  - Generates TypeScript clients for all services
  - Does NOT touch database
  - **Use for:** After pulling schema changes from git

**Output:**
- Color-coded progress indicators
- Success/failure count per service
- Detailed error messages
- Migration summary

---

### `check-database-health.sh`

**Health check script** - Verifies all databases are running and accepting connections

**Usage:**
```bash
./scripts/check-database-health.sh
```

**Checks:**
- Docker Compose services status
- PostgreSQL connectivity for all 8 databases
- Kafka broker availability
- Redis connectivity

---

### `migration-status.sh`

**Migration status viewer** - Shows migration status for all services

**Usage:**
```bash
./scripts/migration-status.sh
```

**Displays:**
- Applied migrations per service
- Pending migrations
- Migration file count
- Last migration timestamp

---

### `seed-all-databases.sh`

**Database seeding script** - Populates databases with initial/test data

**Usage:**
```bash
./scripts/seed-all-databases.sh [environment]
```

**Environments:**
- `dev` - Development seed data (comprehensive test data)
- `demo` - Demo seed data (showcase data)
- `minimal` - Minimal seed data (just essentials)

---

## 🏗️ Architecture

### Service-to-Database Mapping

| Service | Database Port | Database Name | Schema Location |
|---------|---------------|---------------|-----------------|
| Auth | 5432 | `mes_auth` | `services/auth/prisma/schema.prisma` |
| Work Order | 5433 | `mes_work_order` | `services/work-order/prisma/schema.prisma` |
| Quality | 5434 | `mes_quality` | `services/quality/prisma/schema.prisma` |
| Material | 5435 | `mes_material` | `services/material/prisma/schema.prisma` |
| Traceability | 5436 | `mes_traceability` | `services/traceability/prisma/schema.prisma` |
| Resource | 5437 | `mes_resource` | `services/resource/prisma/schema.prisma` |
| Reporting | 5438 | `mes_reporting` | `services/reporting/prisma/schema.prisma` |
| Integration | 5439 | `mes_integration` | `services/integration/prisma/schema.prisma` |

### Prisma Client Locations

Each service generates its Prisma client to an isolated location to avoid conflicts:

```
node_modules/.prisma/
├── client-auth/
├── client-work-order/
├── client-quality/
├── client-material/
├── client-traceability/
├── client-resource/
├── client-reporting/
└── client-integration/
```

**Usage in code:**
```typescript
// Import service-specific client
import { PrismaClient } from '../../../node_modules/.prisma/client-auth';

const prisma = new PrismaClient();
```

---

## 🔄 Migration Workflow

### Development Workflow

1. **Modify schema** in `services/{service}/prisma/schema.prisma`
2. **Create migration**:
   ```bash
   cd services/{service}
   npx prisma migrate dev --name descriptive_migration_name
   ```
3. **Generate client**:
   ```bash
   npx prisma generate
   ```
4. **Test** your changes
5. **Commit** both schema and migration files

### Team Workflow

When pulling changes from git:

```bash
# Pull latest changes
git pull

# Apply migrations and regenerate clients
./scripts/migrate-all-databases.sh deploy
./scripts/migrate-all-databases.sh generate
```

### Production Deployment

```bash
# In CI/CD pipeline or production environment

# 1. Pull latest code
git pull origin main

# 2. Apply migrations (no new creation)
./scripts/migrate-all-databases.sh deploy

# 3. Restart services
docker compose restart
```

---

## 🐛 Troubleshooting

### Migration Failed

**Problem:** Migration fails with error

**Solution:**
```bash
# Check database logs
docker compose -f docker-compose.databases.yml logs {service}-db

# Check Prisma migration status
cd services/{service}
npx prisma migrate status

# Reset single service (development only)
cd services/{service}
npx prisma migrate reset --force
```

### Database Not Ready

**Problem:** "Connection refused" errors

**Solution:**
```bash
# Check if databases are running
docker compose -f docker-compose.databases.yml ps

# Wait for databases to be ready
./scripts/check-database-health.sh

# Restart database infrastructure
docker compose -f docker-compose.databases.yml restart
```

### Client Generation Failed

**Problem:** Prisma client import errors

**Solution:**
```bash
# Regenerate all clients
./scripts/migrate-all-databases.sh generate

# Or regenerate single service
cd services/{service}
npx prisma generate
```

### Migration Out of Sync

**Problem:** Database schema doesn't match migration files

**Solution:**
```bash
# Development: Reset and reapply
cd services/{service}
npx prisma migrate reset --force

# Production: Check migration status and apply missing
npx prisma migrate status
npx prisma migrate deploy
```

---

## 📚 Common Tasks

### Add New Table to Service

```bash
# 1. Edit schema
vim services/work-order/prisma/schema.prisma

# 2. Create migration
cd services/work-order
npx prisma migrate dev --name add_new_table

# 3. Verify
npx prisma migrate status
```

### Check What Migrations Are Applied

```bash
# All services
./scripts/migration-status.sh

# Single service
cd services/auth
npx prisma migrate status
```

### Rollback Last Migration (Development)

```bash
cd services/{service}

# Reset to previous state
npx prisma migrate reset --force

# Reapply up to desired migration
npx prisma migrate deploy
```

### Export Database Schema

```bash
# Export schema to SQL
cd services/auth
npx prisma db pull

# Or use pg_dump
docker compose -f docker-compose.databases.yml exec postgres-auth \
  pg_dump -U mes_auth_user -d mes_auth > auth_schema.sql
```

---

## 🔒 Production Considerations

### Migration Safety

1. **Always backup** before running migrations in production
2. **Test migrations** in staging environment first
3. **Use `deploy`** command, never `dev` in production
4. **Version control** all migration files
5. **Review SQL** in migration files before applying

### Backup Strategy

```bash
# Backup single database
docker compose -f docker-compose.databases.yml exec postgres-auth \
  pg_dump -U mes_auth_user -d mes_auth | gzip > backup_auth_$(date +%Y%m%d).sql.gz

# Backup all databases
./scripts/backup-all-databases.sh
```

### Zero-Downtime Migrations

For production deployments:

1. **Backwards compatible** changes first (add columns, tables)
2. **Deploy code** that works with both old and new schema
3. **Apply migration** during maintenance window
4. **Deploy final code** that uses new schema
5. **Remove old columns** in subsequent migration

---

## 📖 References

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Database Per Service Pattern](../docs/PHASE_2_TASK_2.3_DATABASE_PER_SERVICE_COMPLETE.md)
- [Docker Compose Database Setup](../docker-compose.databases.yml)

---

**Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Production Ready
