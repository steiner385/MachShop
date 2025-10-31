# Department Lookup Table System Documentation

## Overview

The Department Lookup Table System provides a comprehensive, hierarchical department management solution for the MES (Manufacturing Execution System). This system replaces ad-hoc string-based department fields with a structured, normalized approach that supports organizational hierarchy, cost center tracking, and standardized reporting.

**GitHub Issue**: #209 - Data Quality: Create Department Lookup Table for Organizational Structure

## Features

### Core Capabilities
- **Hierarchical Organization**: Support for parent-child department relationships
- **Cost Center Integration**: Tracking of cost centers and budget codes
- **Manager Assignments**: Department manager relationships
- **Site-Specific Departments**: Multi-site organizational support
- **Data Migration**: Seamless migration from existing string-based departments
- **Comprehensive CRUD Operations**: Full service layer with validation
- **Search and Filtering**: Advanced querying capabilities
- **Analytics and Reporting**: Department statistics and metrics

### Data Quality Improvements
- **Normalization**: Eliminates duplicate department strings across tables
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Standardization**: Consistent department naming and structure
- **Validation**: Input validation and business rule enforcement

## Database Schema

### Department Model

The core `Department` model provides the foundation for the organizational structure:

```prisma
model Department {
  id                String      @id @default(cuid())
  departmentCode    String      @unique
  departmentName    String
  description       String?
  parentDepartmentId String?
  parentDepartment  Department? @relation("DepartmentHierarchy", fields: [parentDepartmentId], references: [id])
  childDepartments  Department[] @relation("DepartmentHierarchy")
  siteId            String?
  site              Site?       @relation(fields: [siteId], references: [id])
  costCenter        String?
  budgetCode        String?
  managerId         String?
  manager           User?       @relation("DepartmentManager", fields: [managerId], references: [id])
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  // Relations to existing models
  users             User[]      @relation("UserDepartment")
  personnelInfoExchanges PersonnelInfoExchange[]
  engineeringChangeOrders EngineeringChangeOrder[]
  ecoTasks          ECOTask[]
  icdChangeRequests ICDChangeRequest[]

  @@index([departmentCode])
  @@index([parentDepartmentId])
  @@index([siteId])
  @@index([managerId])
  @@index([isActive])
  @@index([costCenter])
  @@map("departments")
}
```

### Related Model Updates

The following models have been updated to reference the Department table:

1. **User** - Added `departmentId` foreign key
2. **PersonnelInfoExchange** - Added `departmentId` foreign key
3. **EngineeringChangeOrder** - Added `departmentId` foreign key
4. **ECOTask** - Added `departmentId` foreign key
5. **ICDChangeRequest** - Added `departmentId` foreign key

## Service Layer

### DepartmentService

The `DepartmentService` provides a comprehensive API for department management:

```typescript
export class DepartmentService {
  // CRUD Operations
  static async createDepartment(data: CreateDepartmentData): Promise<Department>
  static async getDepartmentById(id: string, includeRelations?: boolean): Promise<DepartmentWithRelations | null>
  static async getDepartmentByCode(code: string): Promise<Department | null>
  static async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department>
  static async deactivateDepartment(id: string, force?: boolean): Promise<Department>

  // Listing and Search
  static async listDepartments(options: DepartmentListOptions): Promise<DepartmentListResult>
  static async searchDepartments(searchTerm: string, options: PaginationOptions): Promise<DepartmentListResult>

  // Hierarchy Management
  static async getDepartmentHierarchy(siteId?: string): Promise<DepartmentHierarchy[]>
  static async getDepartmentAncestors(departmentId: string): Promise<Department[]>
  static async getDepartmentDescendants(departmentId: string): Promise<Department[]>
  static async getDepartmentSiblings(departmentId: string): Promise<Department[]>
  static async moveDepartment(departmentId: string, newParentId: string | null): Promise<Department>
  static async getRootDepartments(): Promise<Department[]>

  // Statistics and Analytics
  static async getDepartmentCount(activeOnly?: boolean): Promise<number>
  static async getDepartmentStats(siteId?: string): Promise<DepartmentStats>
  static async getDepartmentsByCostCenter(costCenter: string): Promise<Department[]>
  static async getDepartmentsByManager(managerId: string): Promise<Department[]>
}
```

## Seed Data

### Standard Department Structure

The system includes comprehensive seed data with a standard manufacturing organizational structure:

#### Executive Level
- **EXEC** - Executive leadership and strategic management

#### Operations Division
- **OPS** - Operations (Parent)
  - **MFG** - Manufacturing
  - **PLAN** - Production Planning
  - **MAT** - Materials Management
  - **MAINT** - Maintenance
  - **SHIP** - Shipping & Receiving

#### Engineering Division
- **ENG** - Engineering (Parent)
  - **DESIGN** - Design Engineering
  - **PROC** - Process Engineering
  - **IE** - Industrial Engineering
  - **TEST** - Test Engineering

#### Quality Division
- **QA** - Quality Assurance (Parent)
  - **QC** - Quality Control
  - **QE** - Quality Engineering
  - **COMP** - Compliance & Regulatory
  - **METRO** - Metrology

#### Support Services
- **SUPPORT** - Support Services (Parent)
  - **HR** - Human Resources
  - **FIN** - Finance & Accounting
  - **IT** - Information Technology
  - **PROC_DEPT** - Procurement
  - **SAFETY** - Safety & Environment
  - **CS** - Customer Service

#### Specialized Manufacturing
- **CNC** - CNC Machining (under MFG)
- **ASSY** - Assembly (under MFG)
- **HEAT** - Heat Treatment (under MFG)
- **SURF** - Surface Treatment (under MFG)
- **WELD** - Welding & Fabrication (under MFG)

### Usage

```typescript
import { seedDepartments, STANDARD_DEPARTMENTS } from '../prisma/seeds/seed-departments';

// Seed all standard departments
await seedAllDepartments();

// Seed specific departments
await seedDepartments(STANDARD_DEPARTMENTS.slice(0, 10));

// Seed with site assignment
await seedDepartments(STANDARD_DEPARTMENTS, siteId);
```

## Data Migration

### Migration Strategy

The system includes a comprehensive migration strategy to transition from string-based department fields:

```typescript
import { migrateDepartmentStrings } from '../src/migrations/department-string-migration';

// Analyze existing department strings
const analysis = await analyzeDepartmentStrings();
console.log(`Found ${analysis.uniqueDepartments} unique department names across ${analysis.totalRecords} records`);

// Perform migration with mapping
const mappingRules = new Map([
  ['Engineering', 'ENG'],
  ['Quality Assurance', 'QA'],
  ['Manufacturing', 'MFG']
]);

await migrateDepartmentStrings(mappingRules);
```

### Migration Process

1. **Analysis Phase**: Scan existing tables for department string patterns
2. **Standardization**: Map existing strings to standard department codes
3. **Department Creation**: Create department records for mapped codes
4. **Foreign Key Updates**: Update all related tables with department IDs
5. **Validation**: Verify migration completeness and data integrity

## API Usage Examples

### Creating Departments

```typescript
// Create a root department
const engineering = await DepartmentService.createDepartment({
  departmentCode: 'ENG',
  departmentName: 'Engineering',
  description: 'Product design and development',
  costCenter: 'CC-3000',
  budgetCode: 'BG-ENG',
  managerId: managerId,
  siteId: siteId,
  isActive: true
});

// Create a sub-department
const designEng = await DepartmentService.createDepartment({
  departmentCode: 'DESIGN',
  departmentName: 'Design Engineering',
  description: 'Product design and CAD modeling',
  parentDepartmentId: engineering.id,
  costCenter: 'CC-3100',
  budgetCode: 'BG-DESIGN',
  isActive: true
});
```

### Querying Departments

```typescript
// Get department with relations
const dept = await DepartmentService.getDepartmentById(deptId, true);
console.log(`Department: ${dept.departmentName}`);
console.log(`Manager: ${dept.manager?.firstName} ${dept.manager?.lastName}`);
console.log(`Child Departments: ${dept.childDepartments.length}`);

// Search departments
const results = await DepartmentService.searchDepartments('Engineering', {
  page: 1,
  pageSize: 10
});

// List with filters
const departments = await DepartmentService.listDepartments({
  siteId: siteId,
  isActive: true,
  parentDepartmentId: null,
  page: 1,
  pageSize: 20
});
```

### Hierarchy Operations

```typescript
// Get full hierarchy
const hierarchy = await DepartmentService.getDepartmentHierarchy();

// Get ancestors (bottom-up)
const ancestors = await DepartmentService.getDepartmentAncestors(deptId);

// Get descendants (top-down)
const descendants = await DepartmentService.getDepartmentDescendants(deptId);

// Move department
await DepartmentService.moveDepartment(deptId, newParentId);
```

### Analytics

```typescript
// Get department statistics
const stats = await DepartmentService.getDepartmentStats();
console.log(`Total Departments: ${stats.totalDepartments}`);
console.log(`Active Departments: ${stats.activeDepartments}`);
console.log(`Average Users per Department: ${stats.averageUsersPerDepartment}`);

// Get departments by cost center
const deptsByCostCenter = await DepartmentService.getDepartmentsByCostCenter('CC-3000');

// Get departments by manager
const deptsByManager = await DepartmentService.getDepartmentsByManager(managerId);
```

## Integration Guide

### Updating Existing Code

#### Before (String-based)
```typescript
// Old approach with string fields
const user = await prisma.user.create({
  data: {
    username: 'john.doe',
    email: 'john@example.com',
    department: 'Engineering' // String field
  }
});

// Filtering by department string
const users = await prisma.user.findMany({
  where: {
    department: 'Engineering'
  }
});
```

#### After (Department Lookup)
```typescript
// New approach with department relationship
const engineeringDept = await DepartmentService.getDepartmentByCode('ENG');
const user = await prisma.user.create({
  data: {
    username: 'john.doe',
    email: 'john@example.com',
    departmentId: engineeringDept.id // Foreign key reference
  }
});

// Filtering with department relationship
const users = await prisma.user.findMany({
  where: {
    departmentId: engineeringDept.id
  },
  include: {
    department: true // Include department details
  }
});
```

### Frontend Integration

```typescript
// Department dropdown component
const departments = await DepartmentService.listDepartments({
  isActive: true,
  page: 1,
  pageSize: 100
});

// Hierarchical department tree
const hierarchy = await DepartmentService.getDepartmentHierarchy(siteId);

// Department breadcrumb
const ancestors = await DepartmentService.getDepartmentAncestors(departmentId);
```

## Testing

### Unit Tests

Comprehensive unit tests cover:
- CRUD operations with validation
- Hierarchy management
- Search and filtering
- Error handling
- Business rule enforcement

### Integration Tests

Integration tests verify:
- Database operations
- Transaction handling
- Constraint enforcement
- Performance characteristics
- Data migration processes

### Running Tests

```bash
# Unit tests
npm run test -- src/services/__tests__/DepartmentService.test.ts

# Integration tests
npm run test -- src/__tests__/integration/department.integration.test.ts

# All department-related tests
npm run test -- --grep "department"
```

## Performance Considerations

### Indexing Strategy

The Department table includes strategic indexes:
- `departmentCode` (unique) - Fast lookups by code
- `parentDepartmentId` - Hierarchy queries
- `siteId` - Site-specific filtering
- `managerId` - Manager-based queries
- `isActive` - Active/inactive filtering
- `costCenter` - Cost center reporting

### Query Optimization

- Hierarchy queries use recursive CTEs for efficiency
- Pagination prevents large result sets
- Selective field loading reduces data transfer
- Cached lookups for frequently accessed departments

### Scalability

- Support for multi-site deployments
- Horizontal scaling through site partitioning
- Efficient hierarchy traversal algorithms
- Optimized for read-heavy workloads

## Security

### Access Control

- Role-based access to department management
- Site-specific permissions
- Audit trail for department changes
- Secure foreign key relationships

### Data Validation

- Input sanitization and validation
- Business rule enforcement
- Referential integrity constraints
- Circular reference prevention

## Maintenance

### Regular Tasks

1. **Department Audits**: Verify hierarchy integrity
2. **Cost Center Validation**: Ensure cost center consistency
3. **Manager Assignment Reviews**: Validate manager relationships
4. **Inactive Department Cleanup**: Archive unused departments

### Monitoring

- Track department usage patterns
- Monitor hierarchy depth and complexity
- Alert on constraint violations
- Performance metrics for queries

## Troubleshooting

### Common Issues

#### 1. Circular Reference Errors
```
Error: Cannot create department: would create circular reference in hierarchy
```
**Solution**: Verify parent-child relationships before updates

#### 2. Foreign Key Constraint Violations
```
Error: Foreign key constraint violated: department_fkey
```
**Solution**: Ensure referenced departments exist and are active

#### 3. Migration Issues
```
Error: Department mapping not found for 'Eng Dept'
```
**Solution**: Update mapping rules to include all department variations

### Debugging

```typescript
// Enable debug logging
console.log('Department hierarchy:', await DepartmentService.getDepartmentHierarchy());

// Validate department relationships
const ancestors = await DepartmentService.getDepartmentAncestors(deptId);
const descendants = await DepartmentService.getDepartmentDescendants(deptId);

// Check for orphaned departments
const orphans = await prisma.department.findMany({
  where: {
    parentDepartmentId: { not: null },
    parentDepartment: null
  }
});
```

## Conclusion

The Department Lookup Table System provides a robust, scalable foundation for organizational structure management in the MES. By replacing string-based department fields with a normalized, hierarchical approach, the system improves data quality, enables advanced reporting, and supports complex organizational structures.

The comprehensive service layer, migration tools, and extensive documentation ensure smooth adoption and long-term maintainability of the department management system.

---

**For questions or support, please refer to the GitHub issue #209 or contact the development team.**