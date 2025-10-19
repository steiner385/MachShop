# Database Migration Guide - MES Phase 2

**Date:** October 19, 2025
**Status:** Complete - 8 microservice databases configured

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Initial Database Setup](#initial-database-setup)
4. [Schema Changes & Migrations](#schema-changes--migrations)
5. [Rollback Procedures](#rollback-procedures)
6. [Database Reset & Re-seeding](#database-reset--re-seeding)
7. [Production Migration Workflow](#production-migration-workflow)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The MES system uses a **Database Per Service** pattern with 8 independent PostgreSQL databases:

| Service | Database | Port | Schema Location |
|---------|----------|------|-----------------|
| Auth | `mes_auth_db` | 5432 | `/services/auth/prisma/schema.prisma` |
| Work Order | `mes_work_order_db` | 5432 | `/services/work-order/prisma/schema.prisma` |
| Quality | `mes_quality_db` | 5432 | `/services/quality/prisma/schema.prisma` |
| Material | `mes_material_db` | 5432 | `/services/material/prisma/schema.prisma` |
| Traceability | `mes_traceability_db` | 5432 | `/services/traceability/prisma/schema.prisma` |
| Resource | `mes_resource_db` | 5432 | `/services/resource/prisma/schema.prisma` |
| Reporting | `mes_reporting_db` | 5432 | `/services/reporting/prisma/schema.prisma` |
| Integration | `mes_integration_db` | 5432 | `/services/integration/prisma/schema.prisma` |

---

## Migration Strategy

### Development: Prisma db push

For rapid development, we use `prisma db push` instead of migrations:

**Advantages:**
- No shadow database required
- Fast iteration on schema changes
- Simple to use during development
- Ideal for local development and testing

**When to use:**
- Local development
- CI/CD test environments
- Prototyping and experimentation

### Production: Prisma Migrate

For production deployments, use formal migrations:

**Advantages:**
- Version-controlled schema changes
- Rollback capability
- Audit trail of all changes
- Safe deployment process

**When to use:**
- Staging environments
- Production deployments
- Any environment with persistent data

---

## Initial Database Setup

### Prerequisites

1. **PostgreSQL 14+** running on localhost:5432
2. **Databases created** with proper users and permissions
3. **Environment variables** configured in each service's `.env` file

### Create All Databases

```bash
# From project root: /home/tony/GitHub/mes

# Run the database creation script
psql -U postgres << 'EOF'
-- Auth Service
CREATE DATABASE mes_auth_db;
CREATE USER mes_auth_user WITH PASSWORD 'mes_auth_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_auth_db TO mes_auth_user;

-- Work Order Service
CREATE DATABASE mes_work_order_db;
CREATE USER mes_wo_user WITH PASSWORD 'mes_wo_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_work_order_db TO mes_wo_user;

-- Quality Service
CREATE DATABASE mes_quality_db;
CREATE USER mes_quality_user WITH PASSWORD 'mes_quality_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_quality_db TO mes_quality_user;

-- Material Service
CREATE DATABASE mes_material_db;
CREATE USER mes_material_user WITH PASSWORD 'mes_material_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_material_db TO mes_material_user;

-- Traceability Service
CREATE DATABASE mes_traceability_db;
CREATE USER mes_trace_user WITH PASSWORD 'mes_trace_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_traceability_db TO mes_trace_user;

-- Resource Service
CREATE DATABASE mes_resource_db;
CREATE USER mes_resource_user WITH PASSWORD 'mes_resource_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_resource_db TO mes_resource_user;

-- Reporting Service
CREATE DATABASE mes_reporting_db;
CREATE USER mes_reporting_user WITH PASSWORD 'mes_reporting_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_reporting_db TO mes_reporting_user;

-- Integration Service
CREATE DATABASE mes_integration_db;
CREATE USER mes_integration_user WITH PASSWORD 'mes_integration_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_integration_db TO mes_integration_user;
EOF
```

### Push Initial Schemas (Development)

```bash
#!/bin/bash
# From project root

services=(auth work-order quality material traceability resource reporting integration)

for service in "${services[@]}"; do
  echo ""
  echo "📊 Pushing schema for $service service..."
  cd services/$service
  npx prisma db push
  if [ $? -eq 0 ]; then
    echo "✅ $service schema pushed successfully"
  else
    echo "❌ $service schema push failed"
    exit 1
  fi
  cd ../../
done

echo ""
echo "🎉 All 8 database schemas pushed successfully!"
```

---

## Schema Changes & Migrations

### Making Schema Changes (Development)

1. **Edit the Prisma schema file**
   ```bash
   # Example: Update Auth service schema
   vi services/auth/prisma/schema.prisma
   ```

2. **Push changes to database**
   ```bash
   cd services/auth
   npx prisma db push
   ```

3. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Verify changes**
   ```bash
   # Check the database
   psql postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth_db
   \dt  # List tables
   \d table_name  # Describe table
   ```

### Creating Formal Migrations (Production)

When ready to formalize schema changes for production:

```bash
cd services/auth

# Create a new migration
npx prisma migrate dev --name add_user_preferences

# This will:
# 1. Create a new migration file in prisma/migrations/
# 2. Apply the migration to your development database
# 3. Regenerate Prisma Client
```

**Migration file structure:**
```
services/auth/prisma/migrations/
├── 20251019000001_initial_schema/
│   └── migration.sql
├── 20251019120000_add_user_preferences/
│   └── migration.sql
└── migration_lock.toml
```

### Applying Migrations to Other Environments

```bash
# Staging/Production
cd services/auth

# Deploy pending migrations
npx prisma migrate deploy

# This will:
# 1. Apply all pending migrations
# 2. NOT generate Prisma Client (do that in build step)
# 3. Exit with error if any migration fails
```

---

## Rollback Procedures

### Development Rollback (db push)

Since `db push` doesn't create migrations, rollback requires manual intervention:

#### Option 1: Reset and Re-push Previous Schema

```bash
cd services/auth

# 1. Checkout previous version of schema
git checkout HEAD~1 -- prisma/schema.prisma

# 2. Force reset database
npx prisma db push --force-reset

# 3. Re-seed if needed
npx prisma db seed
```

#### Option 2: Manual SQL Rollback

```bash
# Connect to database
psql postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth_db

# Manually reverse the changes
DROP TABLE IF EXISTS new_table;
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

### Production Rollback (Migrations)

Prisma doesn't support automatic rollback, but you can create reverse migrations:

#### Method 1: Create Reverse Migration

```bash
cd services/auth

# 1. Create a new migration that reverses the changes
npx prisma migrate dev --name revert_user_preferences --create-only

# 2. Edit the migration SQL to reverse changes
vi prisma/migrations/XXXXXX_revert_user_preferences/migration.sql

# 3. Apply the reverse migration
npx prisma migrate deploy
```

#### Method 2: Restore from Backup

```bash
# 1. Stop the service
systemctl stop mes-auth-service

# 2. Drop current database
dropdb -U postgres mes_auth_db

# 3. Restore from backup
pg_restore -U postgres -d mes_auth_db /backups/mes_auth_db_20251019.dump

# 4. Restart service
systemctl start mes-auth-service
```

---

## Database Reset & Re-seeding

### Reset Single Service

```bash
cd services/auth

# Reset database (DELETES ALL DATA)
npx prisma db push --force-reset

# Re-seed with development data
npx prisma db seed
```

### Reset All Services

```bash
#!/bin/bash
# ⚠️ WARNING: This deletes ALL data in all 8 databases!

services=(auth work-order quality material traceability resource reporting integration)

echo "⚠️  This will DELETE ALL DATA in all 8 databases!"
read -p "Are you sure? Type 'DELETE ALL' to confirm: " confirm

if [ "$confirm" != "DELETE ALL" ]; then
  echo "Cancelled."
  exit 0
fi

for service in "${services[@]}"; do
  echo ""
  echo "🔄 Resetting $service database..."
  cd services/$service
  npx prisma db push --force-reset
  npx prisma db seed
  if [ $? -eq 0 ]; then
    echo "✅ $service reset and seeded successfully"
  else
    echo "❌ $service reset failed"
    exit 1
  fi
  cd ../../
done

echo ""
echo "🎉 All 8 databases reset and seeded successfully!"
```

---

## Production Migration Workflow

### Pre-Deployment Checklist

- [ ] All migrations tested in staging environment
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Migration run time estimated
- [ ] Downtime window scheduled (if needed)
- [ ] Migration scripts reviewed by team

### Deployment Process

#### 1. Create Database Backup

```bash
# Backup all databases
for db in mes_auth_db mes_work_order_db mes_quality_db mes_material_db \
          mes_traceability_db mes_resource_db mes_reporting_db mes_integration_db; do
  echo "Backing up $db..."
  pg_dump -U postgres -Fc $db > /backups/${db}_$(date +%Y%m%d_%H%M%S).dump
done
```

#### 2. Apply Migrations

```bash
#!/bin/bash
# Production migration script

services=(auth work-order quality material traceability resource reporting integration)

for service in "${services[@]}"; do
  echo ""
  echo "📊 Migrating $service database..."
  cd /opt/mes/services/$service

  # Apply migrations
  npx prisma migrate deploy

  if [ $? -ne 0 ]; then
    echo "❌ Migration failed for $service!"
    echo "⚠️  ROLLBACK REQUIRED"
    exit 1
  fi

  echo "✅ $service migrated successfully"
done

echo ""
echo "🎉 All databases migrated successfully!"
```

#### 3. Verify Migrations

```bash
# Check migration status for each service
cd services/auth
npx prisma migrate status

# Verify data integrity
psql -U postgres mes_auth_db << 'EOF'
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "AuthAuditLog";
EOF
```

#### 4. Rollback (if needed)

```bash
# If migration fails, restore from backup
for db in mes_auth_db mes_work_order_db mes_quality_db mes_material_db \
          mes_traceability_db mes_resource_db mes_reporting_db mes_integration_db; do
  echo "Restoring $db..."
  dropdb -U postgres --if-exists $db
  pg_restore -U postgres -C -d postgres /backups/${db}_YYYYMMDD_HHMMSS.dump
done
```

---

## Troubleshooting

### Issue: "Database does not exist"

**Cause:** Database not created or environment variables incorrect

**Solution:**
```bash
# Verify database exists
psql -U postgres -l | grep mes_

# Create if missing
psql -U postgres -c "CREATE DATABASE mes_auth_db;"

# Verify connection string
cat services/auth/.env | grep DATABASE_URL
```

### Issue: "Permission denied for database"

**Cause:** Database user doesn't have proper permissions

**Solution:**
```bash
# Grant permissions
psql -U postgres << 'EOF'
GRANT ALL PRIVILEGES ON DATABASE mes_auth_db TO mes_auth_user;
GRANT ALL ON SCHEMA public TO mes_auth_user;
EOF
```

### Issue: "Unique constraint violation during seed"

**Cause:** Seed data already exists in database

**Solution:**
```bash
# Reset and re-seed
cd services/auth
npx prisma db push --force-reset
npx prisma db seed
```

### Issue: "Foreign key constraint violation"

**Cause:** Data dependencies broken or incorrect order

**Solution:**
```bash
# Disable foreign key checks temporarily (PostgreSQL)
psql -U postgres mes_auth_db << 'EOF'
SET session_replication_role = replica;
-- Make your changes
SET session_replication_role = DEFAULT;
EOF
```

### Issue: "Migration out of sync"

**Cause:** Migration history doesn't match database state

**Solution:**
```bash
# Reset migration history (DANGER - development only)
cd services/auth

# Delete migration history
rm -rf prisma/migrations

# Re-create baseline migration
npx prisma migrate dev --name baseline --create-only

# Mark as applied (if schema matches)
npx prisma migrate resolve --applied MIGRATION_NAME
```

---

## Best Practices

### Development

1. **Use db push for rapid iteration**
   - Fast schema changes during development
   - No migration files cluttering the repo
   - Easy to experiment

2. **Commit schema changes to git**
   - Always commit `schema.prisma` changes
   - Include reason for change in commit message

3. **Test migrations before formalizing**
   - Use db push first to test schema
   - Create formal migration only when stable

4. **Seed data for testing**
   - Always maintain working seed scripts
   - Test with realistic data volumes

### Production

1. **Always use formal migrations**
   - Create migration files with `migrate dev`
   - Never use `db push` in production

2. **Test migrations in staging first**
   - Apply to staging environment
   - Verify application still works
   - Check performance impact

3. **Backup before migrations**
   - Always create backup before schema changes
   - Verify backup can be restored
   - Document restore procedure

4. **Version control migrations**
   - Commit all migration files
   - Never modify existing migrations
   - Use descriptive migration names

5. **Monitor migration execution**
   - Log all migration runs
   - Track execution time
   - Alert on failures

### Schema Design

1. **Plan for growth**
   - Use appropriate data types
   - Consider indexing strategy
   - Plan for partitioning if needed

2. **Avoid breaking changes**
   - Add new columns as nullable
   - Use default values when possible
   - Deprecate instead of drop

3. **Document schema decisions**
   - Add comments to models
   - Document relationships
   - Explain complex constraints

---

## Database Per Service Benefits

1. **Independent Scaling**
   - Scale databases independently based on load
   - Optimize for service-specific patterns

2. **Technology Flexibility**
   - Could use different database types per service
   - Currently all PostgreSQL for consistency

3. **Failure Isolation**
   - Database failure affects only one service
   - Other services remain operational

4. **Development Velocity**
   - Teams can modify schemas independently
   - No coordination required for schema changes

5. **Security**
   - Separate credentials per service
   - Principle of least privilege
   - Easier to audit and monitor

---

## Next Steps

After completing database setup and migrations:

1. **Implement Kafka event infrastructure** - Enable cross-service communication
2. **Create BFF layer** - Aggregate data from multiple services
3. **Set up monitoring** - Track database performance and health
4. **Implement backup automation** - Schedule regular backups
5. **Deploy to Kubernetes** - Container orchestration for all services

---

**Last Updated:** October 19, 2025
**Migration Status:** ✅ All 8 databases initialized and seeded
**Prisma Version:** 5.22.0
**PostgreSQL Version:** 14+
