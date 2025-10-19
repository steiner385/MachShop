# Seed Data Guide - MES Phase 2

**Date:** October 18, 2025
**Status:** ✅ Complete - All 8 microservice seed scripts created

---

## Overview

This guide explains how to populate all 8 microservice databases with development and test data using Prisma seed scripts.

---

## Seed Scripts Created

| Service | Seed Script | Data Created |
|---------|-------------|--------------|
| **Auth** | `/services/auth/prisma/seed.ts` | 13+ users (admin, supervisors, QC, operators, material handler, maintenance, engineer) |
| **Work Order** | `/services/work-order/prisma/seed.ts` | Production schedules, work orders, operations, performance records |
| **Quality** | `/services/quality/prisma/seed.ts` | Quality plans, inspections, measurements, NCRs, FAI reports, QIF data |
| **Material** | `/services/material/prisma/seed.ts` | Parts, inventory, lots, transactions, serialized parts |
| **Traceability** | `/services/traceability/prisma/seed.ts` | Traceability events, genealogy, digital threads, recall simulations |
| **Resource** | `/services/resource/prisma/seed.ts` | Sites, work centers, products, routings, personnel, skills, tools |
| **Reporting** | `/services/reporting/prisma/seed.ts` | KPIs, dashboards, reports, production metrics, alerts |
| **Integration** | `/services/integration/prisma/seed.ts` | Integration endpoints, data mappings, sync jobs, B2M messages |

---

## Quick Start - Seed All Databases

### Option 1: Sequential Seeding (Recommended)

```bash
# From project root
cd /home/tony/GitHub/mes

# Seed in order (Auth first, then others)
cd services/auth && npx prisma db seed && echo "✅ Auth seeded"
cd ../work-order && npx prisma db seed && echo "✅ Work Order seeded"
cd ../quality && npx prisma db seed && echo "✅ Quality seeded"
cd ../material && npx prisma db seed && echo "✅ Material seeded"
cd ../traceability && npx prisma db seed && echo "✅ Traceability seeded"
cd ../resource && npx prisma db seed && echo "✅ Resource seeded"
cd ../reporting && npx prisma db seed && echo "✅ Reporting seeded"
cd ../integration && npx prisma db seed && echo "✅ Integration seeded"
```

### Option 2: Automated Loop

```bash
#!/bin/bash
# From project root: /home/tony/GitHub/mes

services=(auth work-order quality material traceability resource reporting integration)

for service in "${services[@]}"; do
  echo ""
  echo "🌱 Seeding $service service..."
  cd services/$service
  npx prisma db seed
  if [ $? -eq 0 ]; then
    echo "✅ $service seeded successfully"
  else
    echo "❌ $service seeding failed"
    exit 1
  fi
  cd ../../
done

echo ""
echo "🎉 All 8 microservice databases seeded successfully!"
```

---

## Individual Service Seeding

### Auth Service
```bash
cd /home/tony/GitHub/mes/services/auth
npx prisma db seed
```

**Creates:**
- 1 Admin user
- 2 Supervisors (John, Sarah)
- 2 Quality inspectors (Mike, Lisa)
- 5 Operators (Tom, Jane, Bob, Alice, David)
- 1 Material handler (Carlos)
- 1 Maintenance technician (Frank)
- 1 Engineer (Emily)
- MFA settings for admin
- Sample audit log entries

**Default Password:** `password123` for all users

### Work Order Service
```bash
cd /home/tony/GitHub/mes/services/work-order
npx prisma db seed
```

**Creates:**
- 1 Production schedule (October 2025)
- 2 Schedule entries
- 3 Work orders (WO-2025-001, WO-2025-002, WO-2025-003)
- 2 Work order operations
- 2 Work performance records
- 1 Production variance
- 1 Work instruction with 3 steps

### Quality Service
```bash
cd /home/tony/GitHub/mes/services/quality
npx prisma db seed
```

**Creates:**
- 1 Quality plan (Bracket inspection)
- 3 Quality characteristics (length, diameter, finish)
- 1 Quality inspection (COMPLETED, PASS)
- 2 Quality measurements
- 1 NCR (Non-conformance report, CLOSED)
- 1 FAI report (First Article Inspection, APPROVED)
- 2 FAI characteristics
- 1 Electronic signature (21 CFR Part 11 compliant)
- 1 QIF measurement plan

### Material Service
```bash
cd /home/tony/GitHub/mes/services/material
npx prisma db seed
```

**Creates:**
- 4 Parts (bracket, shaft, housing, raw aluminum)
- 1 BOM relationship
- 2 Material lots
- 3 Inventory records (raw material, WIP, finished goods)
- 3 Material transactions (receipt, issue, completion)
- 2 Serialized parts
- 1 Serial number range

### Traceability Service
```bash
cd /home/tony/GitHub/mes/services/traceability
npx prisma db seed
```

**Creates:**
- 4 Traceability events (material received, lot created, serial created, inspection)
- 2 Lot genealogy records
- 1 Serial genealogy record
- 1 Digital thread (complete lifecycle view)
- 1 Recall simulation

### Resource Service
```bash
cd /home/tony/GitHub/mes/services/resource
npx prisma db seed
```

**Creates:**
- 1 Site (Main Manufacturing Plant)
- 1 Area (Machining Department)
- 1 Work center (3-Axis CNC Mill)
- 1 Product (Machined Aluminum Bracket)
- 1 Routing with 1 operation
- 1 Personnel record (Tom Anderson)
- 1 Skill (CNC Milling) with assignment
- 1 Tool (0.5" Carbide End Mill)

### Reporting Service
```bash
cd /home/tony/GitHub/mes/services/reporting
npx prisma db seed
```

**Creates:**
- 2 KPI definitions (OEE, First Pass Yield)
- 2 KPI calculations
- 1 Dashboard (Production Overview)
- 2 Dashboard widgets
- 1 Report template (Daily Production Report)
- 1 Production metric
- 1 Alert rule

### Integration Service
```bash
cd /home/tony/GitHub/mes/services/integration
npx prisma db seed
```

**Creates:**
- 1 Integration endpoint (Oracle Fusion ERP)
- 1 Data mapping (Work Order to ERP Production Order)
- 1 Sync job (Daily Work Order Sync)
- 1 ISA-95 B2M message (Production Performance)
- 1 Integration event

---

## Verifying Seed Data

### Check Record Counts

```bash
# Auth Service
psql postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth_db -c "SELECT 'Users' as table_name, COUNT(*) FROM \"User\" UNION ALL SELECT 'Audit Logs', COUNT(*) FROM \"AuditLog\";"

# Work Order Service
psql postgresql://mes_wo_user:mes_wo_password_dev@localhost:5432/mes_work_order_db -c "SELECT 'Work Orders' as table_name, COUNT(*) FROM work_orders UNION ALL SELECT 'Operations', COUNT(*) FROM work_order_operations;"

# Quality Service
psql postgresql://mes_quality_user:mes_quality_password_dev@localhost:5432/mes_quality_db -c "SELECT 'Quality Plans' as table_name, COUNT(*) FROM quality_plans UNION ALL SELECT 'Inspections', COUNT(*) FROM quality_inspections UNION ALL SELECT 'NCRs', COUNT(*) FROM ncrs;"

# Material Service
psql postgresql://mes_material_user:mes_material_password_dev@localhost:5432/mes_material_db -c "SELECT 'Parts' as table_name, COUNT(*) FROM parts UNION ALL SELECT 'Inventory', COUNT(*) FROM inventory UNION ALL SELECT 'Lots', COUNT(*) FROM material_lots;"

# Traceability Service
psql postgresql://mes_trace_user:mes_trace_password_dev@localhost:5432/mes_traceability_db -c "SELECT 'Events' as table_name, COUNT(*) FROM traceability_events UNION ALL SELECT 'Lot Genealogy', COUNT(*) FROM lot_genealogy;"

# Resource Service
psql postgresql://mes_resource_user:mes_resource_password_dev@localhost:5432/mes_resource_db -c "SELECT 'Sites' as table_name, COUNT(*) FROM sites UNION ALL SELECT 'Work Centers', COUNT(*) FROM work_centers UNION ALL SELECT 'Products', COUNT(*) FROM products;"

# Reporting Service
psql postgresql://mes_reporting_user:mes_reporting_password_dev@localhost:5432/mes_reporting_db -c "SELECT 'KPI Definitions' as table_name, COUNT(*) FROM kpi_definitions UNION ALL SELECT 'Dashboards', COUNT(*) FROM dashboards;"

# Integration Service
psql postgresql://mes_integration_user:mes_integration_password_dev@localhost:5432/mes_integration_db -c "SELECT 'Endpoints' as table_name, COUNT(*) FROM integration_endpoints UNION ALL SELECT 'Sync Jobs', COUNT(*) FROM sync_jobs;"
```

### Use Prisma Studio

```bash
# Open Prisma Studio for any service
cd /home/tony/GitHub/mes/services/auth
npx prisma studio

# Studio will open at http://localhost:5555
# Browse and verify all seeded data
```

---

## Resetting and Re-seeding

### Reset Individual Service

```bash
# Example: Reset auth service
cd /home/tony/GitHub/mes/services/auth
npx prisma db push --force-reset
npx prisma db seed
```

### Reset All Services

```bash
#!/bin/bash
# ⚠️ WARNING: This deletes ALL data in all databases!

services=(auth work-order quality material traceability resource reporting integration)

for service in "${services[@]}"; do
  echo "🔄 Resetting $service..."
  cd services/$service
  npx prisma db push --force-reset
  npx prisma db seed
  cd ../../
done
```

---

## User Accounts Reference

All users have default password: **`password123`**

| Username | Role | Email | Description |
|----------|------|-------|-------------|
| `admin` | ADMIN | admin@machshop.com | System Administrator |
| `john.supervisor` | SUPERVISOR | john.supervisor@machshop.com | Production Supervisor |
| `sarah.supervisor` | SUPERVISOR | sarah.supervisor@machshop.com | Production Supervisor |
| `mike.qc` | QUALITY_INSPECTOR | mike.qc@machshop.com | Quality Inspector |
| `lisa.qc` | QUALITY_INSPECTOR | lisa.qc@machshop.com | Quality Inspector |
| `tom.operator` | OPERATOR | tom.operator@machshop.com | CNC Operator |
| `jane.operator` | OPERATOR | jane.operator@machshop.com | Operator |
| `bob.operator` | OPERATOR | bob.operator@machshop.com | Operator |
| `alice.operator` | OPERATOR | alice.operator@machshop.com | Operator |
| `david.operator` | OPERATOR | david.operator@machshop.com | Operator |
| `carlos.material` | MATERIAL_HANDLER | carlos.material@machshop.com | Material Handler |
| `frank.maintenance` | MAINTENANCE | frank.maintenance@machshop.com | Maintenance Technician |
| `emily.engineer` | ENGINEER | emily.engineer@machshop.com | Manufacturing Engineer |

---

## Data Relationships

The seed data is designed with realistic cross-service references:

- **Users (Auth)** → Referenced by Personnel (Resource), Work Orders, Quality Inspections
- **Work Orders (Work Order)** → Referenced by Quality Inspections, Material Transactions, Traceability Events
- **Parts (Resource/Material)** → Referenced by Work Orders, Quality Plans, Inventory, Lots
- **Serial Numbers (Material)** → Referenced by Traceability, Digital Threads, FAI Reports
- **Work Centers (Resource)** → Referenced by Work Orders, Operations, Tools
- **Quality Inspections (Quality)** → Referenced by Traceability Events, Electronic Signatures

---

## Troubleshooting

### Seed Script Fails

1. **Check database connection:**
   ```bash
   psql postgresql://mes_auth_user:mes_auth_password_dev@localhost:5432/mes_auth_db -c "SELECT 1;"
   ```

2. **Verify Prisma client is generated:**
   ```bash
   cd services/auth
   npx prisma generate
   ```

3. **Check for schema errors:**
   ```bash
   npx prisma validate
   ```

### Unique Constraint Violations

If you see unique constraint errors, the data may already exist. Use `npx prisma db push --force-reset` to reset.

### Missing Dependencies

If `tsx` is not found:
```bash
npm install -D tsx
```

---

## Next Steps

After seeding all databases:

1. **Start microservices** - Boot up all 8 services to test data access
2. **Test API endpoints** - Verify data through REST APIs
3. **Run integration tests** - Ensure cross-service data integrity
4. **Develop frontend** - Use seeded data for UI development

---

## Files Created

- `/services/auth/prisma/seed.ts` - Auth service seed script
- `/services/work-order/prisma/seed.ts` - Work Order service seed script
- `/services/quality/prisma/seed.ts` - Quality service seed script
- `/services/material/prisma/seed.ts` - Material service seed script
- `/services/traceability/prisma/seed.ts` - Traceability service seed script
- `/services/resource/prisma/seed.ts` - Resource service seed script
- `/services/reporting/prisma/seed.ts` - Reporting service seed script
- `/services/integration/prisma/seed.ts` - Integration service seed script
- All package.json files updated with `prisma.seed` configuration

---

**Last Updated:** October 18, 2025
**Seed Scripts Status:** ✅ All 8 services configured and ready
