# OSP Operations Management System - Administrator's Guide

**Issue #59: Core OSP/Farmout Operations Management System**

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [User Management](#user-management)
6. [Operational Procedures](#operational-procedures)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Backup & Recovery](#backup--recovery)

## Overview

The OSP (Outside Processing/Farmout) Operations Management System is a comprehensive tracking and orchestration platform designed to manage manufacturing operations sent to external suppliers. The system serves as a critical interface between the internal manufacturing operation management and external supplier networks.

### Key Features

- **Complete Operation Lifecycle Management**: Track operations from creation through acceptance
- **Automated Shipment Tracking**: Monitor shipments with carrier integration
- **Supplier Performance Metrics**: Comprehensive scoring based on delivery, quality, and cost
- **State Machine Validation**: Prevent invalid operational transitions
- **Multi-tier Supplier Support**: Handle supplier-to-supplier shipments (drop-shipping)
- **ERP Integration Pattern**: Seamless cost tracking from ERP systems without duplicating procurement functionality

### System Design Principles

The OSP system was intentionally designed to:
- **Act as a Tracking Layer**: Not a procurement system - relies on ERP for sourcing/purchasing decisions
- **Enforce Business Rules**: Uses state machines to enforce valid operational transitions
- **Provide Visibility**: Real-time tracking of operations and shipments
- **Enable Metrics**: Supplier performance scoring for vendor management

## System Architecture

### Technology Stack

- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React with TypeScript and React Bootstrap
- **Testing**: Vitest for unit/integration tests
- **API**: REST API with JSON request/response

### Database Schema

The system uses five main tables:

#### OSPOperation
- Tracks the core operation being sent to a supplier
- Stores quantities (sent, received, accepted, rejected)
- Maintains status throughout lifecycle
- Records cost estimates and actuals from ERP
- Includes certification requirements and inspection flags

#### OSPShipment
- Tracks physical movement of materials
- Supports multiple shipment types (TO_SUPPLIER, FROM_SUPPLIER)
- Integrates carrier tracking
- Records shipment and delivery dates

#### OSPCapability
- Maps supplier capabilities to operations
- Stores lead times, order constraints, and certifications
- Enables matching of operations to qualified suppliers

#### OSPInspection
- Records quality inspection results
- Tracks defect details and approvals
- Links to inspection personnel

#### SupplierPerformanceMetric
- Aggregates performance data by period (monthly, quarterly, annual)
- Calculates composite scores based on:
  - On-time delivery rate (40%)
  - Quality score (40%)
  - Cost variance (20%)

## Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn package manager

### Initial Setup Steps

1. **Environment Configuration**
   ```bash
   # Set required environment variables
   export DATABASE_URL="postgresql://user:password@localhost:5432/machshop3"
   export API_BASE_URL="http://localhost:3000/api/v1"
   export NODE_ENV="production"
   ```

2. **Database Initialization**
   ```bash
   # Run Prisma migrations
   npx prisma migrate deploy

   # Generate Prisma client
   npx prisma generate
   ```

3. **Application Startup**
   ```bash
   # Build the application
   npm run build

   # Start the server
   npm start
   ```

4. **Verify Installation**
   ```bash
   # Health check endpoint
   curl http://localhost:3000/api/v1/health
   ```

### Docker Deployment

For containerized deployment:

```bash
# Build Docker image
docker build -t osp-system .

# Run with docker-compose
docker-compose -f docker-compose.yml up -d
```

## Configuration

### Environment Variables

Key configuration variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `API_BASE_URL` | Base URL for API endpoints | http://localhost:3000/api/v1 |
| `NODE_ENV` | Runtime environment | development |
| `LOG_LEVEL` | Logging level (info, debug, error) | info |
| `JWT_SECRET` | JWT signing secret | Required for production |
| `CORS_ORIGIN` | CORS allowed origins | http://localhost:3000 |

### Database Connection

The system uses connection pooling for optimal performance:

```typescript
// Configuration in src/config/database.ts
const prisma = new PrismaClient({
  log: process.env.LOG_LEVEL === 'debug' ? ['query', 'error'] : ['error'],
});
```

### API Authentication

The OSP API endpoints require role-based access control:

```typescript
// Required Permissions by Endpoint
POST /osp/operations: 'osp.operations.create'
GET /osp/operations: 'osp.operations.read'
PUT /osp/operations/:id: 'osp.operations.update'
POST /osp/operations/:id/transition: 'osp.operations.manage'
POST /osp/shipments: 'osp.shipments.create'
GET /osp/shipments: 'osp.shipments.read'
// ... and more
```

## User Management

### Role-Based Access Control (RBAC)

The system supports three primary roles:

#### OSP Administrator
- Manage all operations and shipments
- View performance metrics
- Configure supplier capabilities
- Access audit logs

**Permissions:**
- osp.operations.create
- osp.operations.read
- osp.operations.update
- osp.operations.manage
- osp.shipments.* (all shipment permissions)
- osp.suppliers.manage
- osp.performance.read

#### Procurement Manager
- Create and manage OSP operations
- Monitor shipments
- View supplier performance

**Permissions:**
- osp.operations.create
- osp.operations.read
- osp.operations.update
- osp.shipments.create
- osp.shipments.read
- osp.suppliers.read
- osp.performance.read

#### Supervisor
- View operations and shipments
- Update shipment status
- Record inspections

**Permissions:**
- osp.operations.read
- osp.shipments.read
- osp.shipments.update
- osp.inspections.create
- osp.suppliers.read

### Adding Users

```typescript
// Create user with OSP permissions
const user = await prisma.user.create({
  data: {
    email: 'user@company.com',
    name: 'John Doe',
    roles: ['OSP_ADMIN'],
    permissions: [
      'osp.operations.create',
      'osp.operations.read',
      'osp.operations.update',
      'osp.operations.manage',
      'osp.shipments.create',
      'osp.shipments.read',
      'osp.shipments.update',
      'osp.suppliers.manage',
      'osp.performance.read'
    ]
  }
});
```

## Operational Procedures

### OSP Operation Workflow

#### 1. Operation Creation
- Operations are created for manufacturing tasks sent to external suppliers
- System validates that the operation is marked as "OSP-capable"
- Automatic OSP number generation (OSP-YYYY-#####)
- Status: PENDING_SHIPMENT

#### 2. Shipment Management
- Create shipment records for materials sent to supplier
- Track with carrier information
- Status transitions: DRAFT → RELEASED → PICKED → SHIPPED → IN_TRANSIT

#### 3. Operation Lifecycle
The operation follows these states:

```
PENDING_SHIPMENT
    ↓
SHIPPED
    ↓
AT_SUPPLIER
    ↓
IN_PROGRESS
    ↓
INSPECTION
    ↓
RECEIVED
    ↓
ACCEPTED (or REJECTED)
    ↓
COMPLETED
```

#### 4. Receipt & Inspection
- Supplier returns processed materials
- Inspection required for quality validation
- Record defects and non-conformances
- Accept or reject operation

#### 5. Completion
- Operation marked as complete
- Final quantities recorded
- Metrics aggregated for supplier performance

### Supplier Master Data Management

#### Adding a Supplier Capability

```typescript
const capability = await prisma.oSPCapability.create({
  data: {
    vendorId: 'vendor-123',
    operationId: 'op-456',
    capabilityType: 'PROCESS',
    certifications: ['ISO9001', 'NADCAP'],
    minOrderQuantity: 10,
    maxOrderQuantity: 10000,
    standardLeadDays: 7
  }
});
```

#### Updating Supplier Performance

Performance metrics are calculated monthly from completed operations:

```typescript
const metrics = await supplierPerformanceService.calculateFromOSPOperations(
  vendorId,
  'MONTHLY',
  new Date('2025-01-01'),
  new Date('2025-01-31')
);
```

### Shipment Tracking

#### Mark Shipment as Shipped

```typescript
const shipment = await shipmentService.markShipped(
  shipmentId,
  'FDX123456789',  // tracking number
  'FedEx'           // carrier
);
```

#### Track Shipment Status

```bash
curl http://localhost:3000/api/v1/osp/shipments/track/FDX123456789
```

## Monitoring & Maintenance

### Health Checks

Regular health checks ensure system availability:

```bash
# API health endpoint
curl http://localhost:3000/api/v1/health

# Database connectivity
curl http://localhost:3000/api/v1/health/db
```

### Performance Monitoring

Monitor key metrics:

```typescript
// Retrieve supplier rankings
const rankings = await performanceService.rankSuppliers();

// Get performance scorecard for vendor
const scorecard = await performanceService.getSupplierScorecard(
  vendorId,
  12  // months to include
);
```

### Log Management

Logs are written to stdout and rotated daily:

```bash
# View application logs
docker logs <container-id>

# Set debug logging
export LOG_LEVEL=debug
npm start
```

## Troubleshooting

### Common Issues

#### 1. Operation Creation Fails with "Not OSP-capable"

**Problem**: Operation cannot be sent to supplier

**Solution**:
- Verify the operation is marked with `isOSPCapable: true` in the Operation table
- Check that supplier has required capability defined in OSPCapability

#### 2. Invalid Status Transition Error

**Problem**: Cannot transition operation from current state to requested state

**Solution**:
- Review the state machine diagram in the Operational Procedures section
- Verify you're following valid state transitions
- Check for operations stuck in INSPECTION status (may require approval)

#### 3. Shipment Tracking Not Found

**Problem**: Tracking number returns no results

**Solution**:
- Verify tracking number format matches what was recorded
- Check that shipment status is SHIPPED or later
- Ensure shipment belongs to correct OSP operation

#### 4. Database Connection Failures

**Problem**: "Cannot connect to database" errors

**Solution**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify Prisma can connect
npx prisma db execute --stdin < /dev/null

# Check credentials in .env
cat .env | grep DATABASE_URL
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npm start
```

## Backup & Recovery

### Database Backups

#### Automated Backups

Schedule regular PostgreSQL backups:

```bash
# Daily backup at 2 AM
0 2 * * * /usr/bin/pg_dump $DATABASE_URL > /backups/machshop3_$(date +\%Y\%m\%d).sql
```

#### Manual Backup

```bash
pg_dump $DATABASE_URL > machshop3_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Recovery Procedures

#### Full Database Recovery

```bash
# Stop the application
docker-compose down

# Restore from backup
psql $DATABASE_URL < machshop3_backup_20250101.sql

# Run migrations to ensure schema consistency
npx prisma migrate deploy

# Restart application
docker-compose up -d
```

#### Selective Data Recovery

```bash
# Recovery to specific point in time
pg_restore --data-only machshop3_backup.sql | \
  psql $DATABASE_URL
```

### Disaster Recovery Plan

In case of major system failure:

1. **Immediate Actions**
   - Disable public API access
   - Assess extent of data loss
   - Notify stakeholders

2. **Recovery Steps**
   - Restore from most recent backup
   - Run database integrity checks
   - Validate all tables have expected row counts

3. **Validation**
   - Test operation creation
   - Verify shipment tracking
   - Confirm supplier metrics calculations

4. **Communication**
   - Document recovery actions
   - Update operational team
   - Resume normal operations

### Business Continuity

For high-availability deployments:

- Implement database replication to standby server
- Use load balancer for API failover
- Configure automated health checks
- Maintain hot standby with real-time sync

## Support & Documentation

For additional information:
- API Reference: See `osp-api-reference.md`
- User Guide: See `osp-user-guide.md`
- Architecture: See `osp-architecture.md`

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
**Issue Reference**: #59
