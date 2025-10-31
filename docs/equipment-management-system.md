# Equipment Registry & Maintenance Management System

## Overview

**GitHub Issue #94**: This document provides comprehensive documentation for the Equipment Registry & Maintenance Management System implemented as part of the MachShop MES platform. This system enables complete lifecycle management of manufacturing equipment, including registration, maintenance scheduling, downtime tracking, and performance analytics.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Documentation](#api-documentation)
4. [Service Layer](#service-layer)
5. [Features & Capabilities](#features--capabilities)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

## System Architecture

The Equipment Management System follows a three-tier architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Layer     │    │  Service Layer  │    │  Data Layer     │
│                 │    │                 │    │                 │
│ • Equipment     │───▶│ • EquipmentSvc  │───▶│ • Equipment     │
│ • Maintenance   │    │ • MaintenanceSvc│    │ • Maintenance   │
│ • Downtime      │    │ • DowntimeSvc   │    │ • Downtime      │
│                 │    │                 │    │ • Types         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **API Routes**: RESTful endpoints for equipment, maintenance, and downtime operations
- **Service Layer**: Business logic and data processing
- **Database Models**: Prisma ORM models with relationships and constraints
- **Authentication**: Role-based access control integration
- **Validation**: Comprehensive input validation using Zod schemas

## Database Schema

### Core Models

#### Equipment
```prisma
model Equipment {
  id                    String              @id @default(cuid())
  name                  String
  manufacturer          String
  model                 String
  serialNumber          String
  assetTag              String?             @unique
  equipmentTypeId       String?
  siteId                String
  description           String?
  purchaseDate          DateTime?
  warrantyExpiration    DateTime?
  criticality           CriticalityLevel    @default(MEDIUM)
  isActive              Boolean             @default(true)

  // Maintenance fields
  maintenanceInterval   Int?                // Days
  lastMaintenanceDate   DateTime?
  nextMaintenanceDate   DateTime?
  requiresCalibration   Boolean             @default(false)

  // Performance metrics
  totalRunTime          Int                 @default(0) // Minutes
  totalDownTime         Int                 @default(0) // Minutes
  mtbf                  Decimal?            // Hours
  mttr                  Decimal?            // Hours

  // Relationships
  equipmentType         EquipmentType?      @relation(fields: [equipmentTypeId], references: [id])
  site                  Site                @relation(fields: [siteId], references: [id])
  maintenanceWorkOrders MaintenanceWorkOrder[]
  downtimeEvents        DowntimeEvent[]

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  createdById           String
  updatedById           String?

  @@map("equipment")
}
```

#### MaintenanceWorkOrder
```prisma
model MaintenanceWorkOrder {
  id                    String              @id @default(cuid())
  workOrderNumber       String              @unique
  equipmentId           String
  title                 String
  description           String?
  maintenanceType       MaintenanceType
  status                MaintenanceStatus   @default(PENDING)
  priority              Priority            @default(NORMAL)

  // Scheduling
  scheduledDate         DateTime?
  estimatedDuration     Int?                // Minutes
  actualDuration        Int?                // Minutes

  // Assignment
  assignedToId          String?

  // Execution tracking
  startedAt             DateTime?
  completedAt           DateTime?
  notes                 String?

  // Cost tracking
  totalCost             Decimal?

  // Relationships
  equipment             Equipment           @relation(fields: [equipmentId], references: [id])
  assignedTo            User?               @relation(fields: [assignedToId], references: [id])
  parts                 MaintenancePart[]
  laborEntries          LaborEntry[]

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  createdById           String
  updatedById           String?

  @@map("maintenance_work_orders")
}
```

#### DowntimeEvent
```prisma
model DowntimeEvent {
  id                    String              @id @default(cuid())
  equipmentId           String
  downtimeReasonId      String
  startTime             DateTime
  endTime               DateTime?
  description           String?
  impact                DowntimeImpact?     @default(LOW)

  // Repair tracking
  estimatedRepairTime   Int?                // Minutes
  actualRepairTime      Int?                // Minutes
  rootCause             String?
  correctiveAction      String?
  notes                 String?

  // Relationships
  equipment             Equipment           @relation(fields: [equipmentId], references: [id])
  downtimeReason        DowntimeReason      @relation(fields: [downtimeReasonId], references: [id])

  createdAt             DateTime            @default(now())
  reportedById          String

  @@map("downtime_events")
}
```

### Enums

```prisma
enum CriticalityLevel {
  LOW
  MEDIUM
  HIGH
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
  PREDICTIVE
  EMERGENCY
}

enum MaintenanceStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum DowntimeCategory {
  EQUIPMENT_FAILURE
  PLANNED_MAINTENANCE
  MATERIAL_SHORTAGE
  OPERATOR_ERROR
  POWER_OUTAGE
  OTHER
}

enum DowntimeImpact {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## API Documentation

### Equipment Endpoints

#### GET /api/v1/equipment
Retrieve equipment with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `criticality` (enum): Filter by criticality level
- `equipmentTypeId` (string): Filter by equipment type
- `maintenanceDue` (boolean): Filter equipment requiring maintenance
- `requiresCalibration` (boolean): Filter calibration-required equipment
- `assetTag` (string): Filter by asset tag

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "eq-001",
      "name": "CNC Machine 001",
      "manufacturer": "Haas Automation",
      "model": "VF-2",
      "serialNumber": "SN123456",
      "assetTag": "EQ-12345678",
      "criticality": "HIGH",
      "isActive": true,
      "nextMaintenanceDate": "2025-02-01T00:00:00Z",
      "equipmentType": {
        "id": "type-001",
        "name": "CNC Machine"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### POST /api/v1/equipment
Create new equipment.

**Request Body:**
```json
{
  "name": "CNC Machine 002",
  "manufacturer": "Haas Automation",
  "model": "VF-3",
  "serialNumber": "SN789012",
  "siteId": "site-001",
  "equipmentTypeId": "type-001",
  "criticality": "HIGH",
  "maintenanceInterval": 90,
  "requiresCalibration": true,
  "description": "High-precision CNC machining center"
}
```

#### GET /api/v1/equipment/:id
Retrieve specific equipment by ID.

#### PUT /api/v1/equipment/:id
Update equipment information.

#### DELETE /api/v1/equipment/:id
Delete equipment (soft delete).

#### GET /api/v1/equipment/asset-tag/:assetTag
Retrieve equipment by asset tag.

#### GET /api/v1/equipment/maintenance-required
Get equipment requiring maintenance.

#### GET /api/v1/equipment/:id/metrics
Get equipment performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "equipmentId": "eq-001",
    "availability": 95.5,
    "mtbf": 168.5,
    "mttr": 2.5,
    "totalRunTime": 8760,
    "totalDownTime": 120,
    "maintenanceCost": 15000.00,
    "utilizationRate": 85.2
  }
}
```

### Maintenance Work Order Endpoints

#### GET /api/v1/maintenance/work-orders
Retrieve maintenance work orders with filtering.

**Query Parameters:**
- `status` (enum): Filter by work order status
- `priority` (enum): Filter by priority level
- `maintenanceType` (enum): Filter by maintenance type
- `equipmentId` (string): Filter by equipment
- `assignedToId` (string): Filter by assigned technician
- `overdue` (boolean): Show only overdue work orders

#### POST /api/v1/maintenance/work-orders
Create new maintenance work order.

**Request Body:**
```json
{
  "equipmentId": "eq-001",
  "title": "Preventive Maintenance - Oil Change",
  "description": "Replace hydraulic oil and filters",
  "maintenanceType": "PREVENTIVE",
  "priority": "NORMAL",
  "scheduledDate": "2025-02-01T08:00:00Z",
  "estimatedDuration": 120,
  "assignedToId": "user-tech-001"
}
```

#### POST /api/v1/maintenance/work-orders/:id/start
Start a maintenance work order.

#### POST /api/v1/maintenance/work-orders/:id/complete
Complete a maintenance work order.

#### POST /api/v1/maintenance/work-orders/:id/parts
Add parts to a work order.

**Request Body:**
```json
{
  "partNumber": "PN-12345",
  "description": "Hydraulic Filter",
  "quantityUsed": 2,
  "unitCost": 25.50,
  "supplierPartNumber": "SUP-67890"
}
```

#### POST /api/v1/maintenance/work-orders/:id/labor
Add labor entry to a work order.

**Request Body:**
```json
{
  "userId": "user-tech-001",
  "startTime": "2025-01-15T08:00:00Z",
  "endTime": "2025-01-15T10:00:00Z",
  "hourlyRate": 50.00,
  "description": "Filter replacement and system check"
}
```

#### GET /api/v1/maintenance/statistics
Get maintenance statistics and KPIs.

### Downtime Tracking Endpoints

#### GET /api/v1/downtime/events
Retrieve downtime events with filtering.

**Query Parameters:**
- `equipmentId` (string): Filter by equipment
- `category` (enum): Filter by downtime category
- `impact` (enum): Filter by impact level
- `ongoing` (boolean): Show only ongoing events
- `fromDate` (datetime): Start date filter
- `toDate` (datetime): End date filter

#### POST /api/v1/downtime/events
Create new downtime event.

**Request Body:**
```json
{
  "equipmentId": "eq-001",
  "downtimeReasonId": "reason-001",
  "startTime": "2025-01-15T08:00:00Z",
  "endTime": "2025-01-15T10:00:00Z",
  "description": "Hydraulic system failure",
  "impact": "HIGH",
  "estimatedRepairTime": 120
}
```

#### POST /api/v1/downtime/events/:id/end
End an ongoing downtime event.

#### GET /api/v1/downtime/ongoing
Get currently ongoing downtime events.

#### GET /api/v1/downtime/analytics
Get downtime analytics and trends.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDowntimeEvents": 25,
    "totalDowntimeMinutes": 1500,
    "averageDowntimePerEvent": 60,
    "mttr": 45.5,
    "downtimeFrequency": 0.8,
    "equipmentWithMostDowntime": "CNC Machine 001",
    "mostCommonDowntimeReason": "Equipment Failure",
    "downtimeByCategory": [
      {
        "category": "EQUIPMENT_FAILURE",
        "count": 15,
        "totalMinutes": 900
      }
    ]
  }
}
```

## Service Layer

### EquipmentService

**Key Methods:**
- `getEquipment(options)`: Retrieve equipment with filtering
- `createEquipment(data)`: Create new equipment
- `updateEquipment(id, data)`: Update equipment
- `calculateEquipmentMetrics(id, options)`: Calculate performance metrics
- `getEquipmentRequiringMaintenance(options)`: Get maintenance-due equipment
- `prioritizeMaintenanceWork(equipment)`: Prioritize maintenance by criticality

**Validation:**
- Equipment name, manufacturer, model, and serial number are required
- Asset tags must be unique
- Maintenance intervals must be positive
- Criticality levels are validated against enum

### MaintenanceService

**Key Methods:**
- `createMaintenanceWorkOrder(data)`: Create work orders
- `startMaintenanceWorkOrder(id, userId)`: Start work execution
- `completeMaintenanceWorkOrder(id, userId, notes)`: Complete work
- `addMaintenancePart(workOrderId, partData)`: Add parts consumption
- `addLaborEntry(workOrderId, laborData)`: Track labor time
- `calculateTotalWorkOrderCost(parts, labor)`: Calculate total cost

**Business Rules:**
- Work orders must have unique numbers
- Only pending work orders can be started
- Only in-progress work orders can be completed
- Parts quantities must be positive
- Labor end time must be after start time

### DowntimeService

**Key Methods:**
- `createDowntimeEvent(data)`: Record downtime events
- `endDowntimeEvent(id, endData)`: End ongoing downtime
- `getDowntimeAnalytics(options)`: Calculate downtime metrics
- `calculateMTTR(events)`: Calculate Mean Time To Repair
- `categorizeDowntimeByReason(events)`: Group by reasons

**Analytics:**
- MTTR calculation across multiple events
- Downtime frequency analysis
- Impact scoring based on duration and criticality
- Trend analysis with configurable grouping

## Features & Capabilities

### Equipment Management
- **Asset Registry**: Complete equipment catalog with specifications
- **Asset Tagging**: Unique identifier system for tracking
- **Criticality Classification**: Risk-based equipment categorization
- **Performance Metrics**: Availability, MTBF, MTTR calculations
- **Lifecycle Tracking**: Purchase, warranty, disposal management

### Maintenance Management
- **Work Order System**: Comprehensive maintenance task management
- **Scheduling**: Preventive maintenance scheduling based on intervals
- **Resource Tracking**: Parts consumption and labor time tracking
- **Cost Management**: Automatic cost calculation and reporting
- **Priority Management**: Critical equipment prioritization

### Downtime Tracking
- **Real-time Monitoring**: Ongoing downtime event tracking
- **Root Cause Analysis**: Systematic failure investigation
- **Impact Assessment**: Business impact scoring and classification
- **Trend Analysis**: Historical downtime pattern analysis
- **Reporting**: Comprehensive downtime analytics and KPIs

## Usage Examples

### Creating Equipment

```typescript
// Create equipment with maintenance schedule
const equipment = await equipmentService.createEquipment({
  name: 'CNC Machine 003',
  manufacturer: 'Mazak',
  model: 'Integrex i-200',
  serialNumber: 'MZ789012',
  siteId: 'site-001',
  equipmentTypeId: 'type-cnc',
  criticality: 'HIGH',
  maintenanceInterval: 60, // Every 60 days
  requiresCalibration: true,
  purchaseDate: new Date('2024-06-01'),
  warrantyExpiration: new Date('2027-06-01'),
  createdById: 'user-admin'
});
```

### Scheduling Maintenance

```typescript
// Create preventive maintenance work order
const workOrder = await maintenanceService.createMaintenanceWorkOrder({
  equipmentId: 'eq-003',
  title: 'Quarterly Preventive Maintenance',
  description: 'Replace filters, check alignments, update software',
  maintenanceType: 'PREVENTIVE',
  priority: 'NORMAL',
  scheduledDate: new Date('2025-03-01T08:00:00Z'),
  estimatedDuration: 240, // 4 hours
  assignedToId: 'user-tech-senior',
  createdById: 'user-supervisor'
});
```

### Recording Downtime

```typescript
// Record equipment failure
const downtimeEvent = await downtimeService.createDowntimeEvent({
  equipmentId: 'eq-003',
  downtimeReasonId: 'reason-spindle-failure',
  startTime: new Date('2025-01-20T14:30:00Z'),
  description: 'Spindle bearing failure - unusual noise and vibration',
  impact: 'CRITICAL',
  estimatedRepairTime: 480, // 8 hours
  reportedById: 'user-operator'
});

// End downtime when repaired
await downtimeService.endDowntimeEvent(downtimeEvent.id, {
  endTime: new Date('2025-01-21T10:30:00Z'),
  rootCause: 'Bearing lubrication failure due to contaminated oil',
  correctiveAction: 'Replaced spindle bearings, changed oil, installed filtration system',
  notes: 'Implemented additional preventive measures'
});
```

### Generating Analytics

```typescript
// Get equipment performance metrics
const metrics = await equipmentService.calculateEquipmentMetrics('eq-003', {
  days: 90
});

// Get downtime analytics
const analytics = await downtimeService.getDowntimeAnalytics({
  equipmentId: 'eq-003',
  days: 30
});

// Get maintenance statistics
const maintenanceStats = await maintenanceService.getMaintenanceStatistics({
  siteId: 'site-001',
  days: 90
});
```

## Testing

### Unit Tests
- **Service Layer**: Comprehensive unit tests for all business logic
- **Validation**: Input validation and error handling tests
- **Calculations**: Metric calculation accuracy tests
- **Edge Cases**: Boundary condition and error scenario tests

### Integration Tests
- **API Endpoints**: Full HTTP request/response testing
- **Authentication**: Role-based access control verification
- **Database**: Data persistence and relationship integrity
- **Error Handling**: Service error propagation and handling

### Test Coverage
- Services: 95%+ line coverage
- Routes: 90%+ endpoint coverage
- Validation: 100% schema coverage

### Running Tests

```bash
# Run all equipment management tests
npm test -- equipment

# Run specific test suites
npm test src/tests/services/EquipmentService.test.ts
npm test src/tests/routes/maintenance.test.ts
npm test src/tests/routes/downtime.test.ts

# Run with coverage
npm run test:coverage
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/machshop"

# Equipment Management Settings
EQUIPMENT_ASSET_TAG_PREFIX="EQ-"
MAINTENANCE_WORK_ORDER_PREFIX="WO-"
DEFAULT_MAINTENANCE_INTERVAL_DAYS=90
CRITICAL_EQUIPMENT_MAINTENANCE_THRESHOLD_DAYS=30

# Notification Settings (future enhancement)
MAINTENANCE_DUE_NOTIFICATION_DAYS=7
DOWNTIME_CRITICAL_THRESHOLD_MINUTES=60
```

### Feature Flags

```typescript
// Equipment management feature configuration
export const equipmentConfig = {
  enableAssetTagGeneration: true,
  enableAutomaticMaintenanceScheduling: true,
  enableDowntimeImpactScoring: true,
  enablePredictiveMaintenance: false, // Future feature
  enableCostTracking: true,
  enableCalibrationTracking: true
};
```

## Troubleshooting

### Common Issues

**1. Asset Tag Uniqueness Violation**
```
Error: Unique constraint failed on the fields: (assetTag)
```
*Solution*: Ensure asset tags are unique or let the system generate them automatically.

**2. Maintenance Interval Validation**
```
Error: Maintenance interval must be positive
```
*Solution*: Provide a positive integer for maintenance interval in days.

**3. Work Order State Transition Error**
```
Error: Cannot complete work order that has not been started
```
*Solution*: Start the work order before attempting to complete it.

**4. Downtime End Time Validation**
```
Error: End time must be after start time
```
*Solution*: Ensure the end time is chronologically after the start time.

### Performance Considerations

- **Equipment Queries**: Use pagination for large equipment lists
- **Metrics Calculations**: Consider caching for frequently accessed metrics
- **Downtime Analytics**: Use date range limits for large datasets
- **Work Order Searches**: Index on status and priority fields

### Database Maintenance

```sql
-- Cleanup old completed work orders (optional)
DELETE FROM maintenance_work_orders
WHERE status = 'COMPLETED'
  AND completed_at < NOW() - INTERVAL '2 years';

-- Update equipment metrics (run periodically)
UPDATE equipment SET
  mtbf = (SELECT calculated_mtbf FROM equipment_metrics WHERE equipment_id = equipment.id),
  mttr = (SELECT calculated_mttr FROM equipment_metrics WHERE equipment_id = equipment.id);
```

## Future Enhancements

### Planned Features
1. **Predictive Maintenance**: AI-based failure prediction
2. **Mobile App Integration**: Technician mobile interface
3. **IoT Sensor Integration**: Real-time equipment monitoring
4. **Advanced Analytics**: Machine learning insights
5. **Maintenance Scheduling Optimization**: Resource optimization algorithms
6. **Vendor Management**: Supplier and service provider tracking
7. **Warranty Management**: Automated warranty claim processing
8. **Compliance Tracking**: Regulatory requirement management

### API Evolution
- GraphQL support for complex queries
- Real-time subscriptions for live updates
- Bulk operations for large dataset management
- Advanced filtering and search capabilities

---

*This documentation is maintained as part of GitHub Issue #94 implementation. For questions or updates, please refer to the issue tracker or contact the development team.*