# Issue #438: Database Schema Extension Framework - Implementation Plan

**Date**: November 1, 2025
**Issue**: #438 - Database Schema Extension Framework
**Phase**: Phase 1 (Critical Extension Framework)
**Priority**: CRITICAL
**Team**: 3-4 backend developers
**Timeline**: 7-8 weeks
**Status**: Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Implementation Phases](#implementation-phases)
4. [Technical Specifications](#technical-specifications)
5. [Testing Strategy](#testing-strategy)
6. [Success Criteria](#success-criteria)
7. [Risk Assessment](#risk-assessment)

---

## Overview

### Purpose

Enable extensions/plugins to register custom database entities and fields without requiring modifications to the core Prisma schema. This is a foundational capability that unblocks custom entities, custom enums, and domain-specific extensions.

### Scope

- Plugin schema registry system
- Dynamic table creation and Prisma schema generation
- Database migration execution
- Data safety and validation
- Enum extension mechanism
- Rollback and error handling

### Deliverables

1. **ExtensionSchema Registry** - Core service for managing extension schemas
2. **Migration Execution Engine** - Execute migrations safely
3. **Prisma Integration Layer** - Generate and apply schema extensions
4. **Safety & Validation Framework** - Ensure data integrity
5. **Comprehensive Test Suite** - 85%+ coverage with multi-plugin scenarios
6. **Documentation & Examples** - API reference and working examples

### Effort Breakdown

- Backend Development: 3 weeks
- Database Architecture: 2 weeks
- Testing & Validation: 1.5 weeks
- Documentation: 1 week
- **Total: 7-8 weeks**

### Unblocks

- **#441**: Custom Entity & Enum Extension System (depends on schema extension)
- **#442**: Report Template Extension System (requires custom entities)
- **#443**: Extension Event & Hook System (may need schema extensions)

---

## Architecture Design

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Extension Plugin Manifest                                      │
│  ├─ database.migrationsDir: "src/migrations"                  │
│  ├─ database.entities: [{name, schema}]                       │
│  └─ database.enums: [{name, values}]                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ExtensionSchemaRegistry Service                                │
│  ├─ registerSchema(plugin, schema)                             │
│  ├─ validateSchema(schema)                                     │
│  ├─ resolveConflicts()                                         │
│  └─ getAllSchemas()                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Schema Generation & Validation                                 │
│  ├─ JSON Schema → Prisma Schema                                │
│  ├─ Field validation (types, constraints)                      │
│  ├─ Relationship validation                                    │
│  └─ Index and constraint generation                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Migration Engine                                               │
│  ├─ Generate SQL migrations                                    │
│  ├─ Execute migrations with transactions                       │
│  ├─ Rollback on failure                                        │
│  └─ Migration tracking & versioning                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database                                                       │
│  ├─ Core tables (WorkOrder, Equipment, etc.)                  │
│  ├─ Extension tables (dynamically created)                    │
│  └─ Migration tracking table                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. ExtensionSchemaRegistry Service

```typescript
interface ExtensionSchemaRegistry {
  // Register a plugin's schema
  registerSchema(
    pluginId: string,
    schema: ExtensionDatabaseSchema
  ): Promise<RegistrationResult>

  // Validate schema before registration
  validateSchema(schema: ExtensionDatabaseSchema): ValidationResult

  // Get all registered schemas
  getAllSchemas(): ExtensionDatabaseSchema[]

  // Get schema by plugin
  getPluginSchema(pluginId: string): ExtensionDatabaseSchema | null

  // Detect conflicts between schemas
  detectConflicts(): ConflictReport

  // Generate Prisma schema from all registered schemas
  generatePrismaSchema(): string

  // Unregister schema (cleanup)
  unregisterSchema(pluginId: string): Promise<void>
}
```

#### 2. Extension Database Schema Model

```typescript
interface ExtensionDatabaseSchema {
  pluginId: string
  version: string
  tables: ExtensionTable[]
  enums: ExtensionEnum[]
  relationships: ExtensionRelationship[]
  metadata: {
    description?: string
    author?: string
    namespace: string // To prevent collisions
    constraints?: Record<string, any>
  }
}

interface ExtensionTable {
  name: string
  namespace: string // e.g., "plugin_customreports"
  fields: ExtensionField[]
  indexes?: ExtensionIndex[]
  uniqueConstraints?: ExtensionUniqueConstraint[]
}

interface ExtensionField {
  name: string
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Decimal' | 'Json'
  required: boolean
  default?: any
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

interface ExtensionEnum {
  name: string
  values: string[]
  localization?: Record<string, Record<string, string>>
}

interface ExtensionRelationship {
  source: string // "plugin_table1"
  sourceField: string
  target: string // "core_table" or "plugin_table2"
  targetField: string
  type: 'OneToOne' | 'OneToMany' | 'ManyToMany'
}
```

#### 3. Migration Engine

```typescript
interface MigrationEngine {
  // Execute pending migrations
  executeMigrations(pluginId: string): Promise<ExecutionResult>

  // Rollback migrations
  rollbackMigration(migrationId: string): Promise<RollbackResult>

  // Get migration history
  getMigrationHistory(pluginId?: string): MigrationRecord[]

  // Validate migration safety
  validateMigration(migration: Migration): SafetyCheckResult
}

interface Migration {
  id: string
  pluginId: string
  version: string
  sql: string
  rollbackSql?: string
  checksums: {
    schema: string
    sql: string
  }
  createdAt: Date
}
```

---

## Implementation Phases

### Phase 1: Foundation & Architecture (Weeks 1-2)

**Tasks**:
1. Design ExtensionSchemaRegistry service
   - Define interfaces and types
   - Plan data structures
   - Design validation logic

2. Create database schema for tracking extensions
   ```sql
   CREATE TABLE extension_schemas (
     id UUID PRIMARY KEY,
     plugin_id VARCHAR UNIQUE NOT NULL,
     schema_version VARCHAR NOT NULL,
     schema_definition JSONB NOT NULL,
     status VARCHAR (pending, active, failed),
     error_message TEXT,
     registered_at TIMESTAMP,
     activated_at TIMESTAMP
   );

   CREATE TABLE migration_records (
     id UUID PRIMARY KEY,
     plugin_id VARCHAR NOT NULL,
     migration_id VARCHAR NOT NULL,
     sql TEXT NOT NULL,
     rollback_sql TEXT,
     status VARCHAR (pending, executed, failed, rolled_back),
     executed_at TIMESTAMP,
     error_message TEXT
   );
   ```

3. Set up testing infrastructure
   - Mock database for testing
   - Test fixtures with sample schemas
   - Transaction rollback testing

**Deliverables**:
- [ ] Service interface definitions
- [ ] Database schema for extension tracking
- [ ] Testing infrastructure setup
- [ ] Architecture documentation

### Phase 2: Schema Registry Implementation (Weeks 2-3)

**Tasks**:
1. Implement ExtensionSchemaRegistry
   - [ ] Register schema endpoint
   - [ ] Validate schema (JSON Schema validation)
   - [ ] Detect conflicts (namespace, field name collisions)
   - [ ] Store schema metadata
   - [ ] Generate Prisma schema from registry

2. Schema Validation
   - [ ] Field type validation
   - [ ] Constraint validation
   - [ ] Relationship validation
   - [ ] Namespace isolation
   - [ ] Reserved field/table name checking

3. Conflict Detection
   - [ ] Detect table name collisions (using namespace)
   - [ ] Detect enum name conflicts
   - [ ] Detect field name conflicts
   - [ ] Validate relationship targets

**Deliverables**:
- [ ] Working ExtensionSchemaRegistry service
- [ ] Schema validation engine
- [ ] Conflict detection system
- [ ] Unit tests (70%+ coverage)

### Phase 3: Migration & Execution Engine (Weeks 3-4)

**Tasks**:
1. Migration Generation
   - [ ] Generate SQL migrations from extension schemas
   - [ ] Handle CREATE TABLE statements
   - [ ] Handle ALTER TABLE for field additions
   - [ ] Generate indexes
   - [ ] Generate constraints
   - [ ] Create rollback SQL

2. Safe Execution
   - [ ] Wrap migrations in transactions
   - [ ] Implement checksum validation
   - [ ] Track execution status
   - [ ] Handle partial failures
   - [ ] Implement automatic rollback on error

3. Prisma Integration
   - [ ] Generate Prisma schema dynamically
   - [ ] Re-initialize Prisma client after schema changes
   - [ ] Type generation for custom entities
   - [ ] Relationship mapping to core entities

**Deliverables**:
- [ ] Migration execution engine
- [ ] SQL migration generation
- [ ] Rollback mechanism
- [ ] Prisma schema generation
- [ ] Unit tests (75%+ coverage)

### Phase 4: Data Safety & Advanced Features (Weeks 4-5)

**Tasks**:
1. Data Safety
   - [ ] Foreign key constraint enforcement
   - [ ] Cascade delete rules
   - [ ] Unique constraint validation
   - [ ] Data validation before schema changes
   - [ ] Backup before major migrations

2. Query Performance
   - [ ] Analyze query plans for custom entities
   - [ ] Suggest and create appropriate indexes
   - [ ] Monitor query performance
   - [ ] Detect N+1 query problems

3. Multi-Plugin Scenarios
   - [ ] Handle multiple plugins with shared entities
   - [ ] Validate schema interdependencies
   - [ ] Manage plugin enable/disable with schema
   - [ ] Data isolation between plugins

**Deliverables**:
- [ ] Data validation framework
- [ ] Query optimization analysis
- [ ] Multi-plugin coordination
- [ ] Integration tests (80%+ coverage)

### Phase 5: Testing & Quality Assurance (Weeks 5-6.5)

**Tasks**:
1. Unit Tests
   - [ ] Schema registry operations (register, validate, detect conflicts)
   - [ ] Migration generation (SQL correctness)
   - [ ] Error handling (invalid schemas, conflicts)
   - [ ] Rollback operations
   - [ ] Prisma integration

2. Integration Tests
   - [ ] Multi-plugin schema registration
   - [ ] Plugin enable/disable cycle
   - [ ] Schema changes with existing data
   - [ ] Relationship between custom and core entities
   - [ ] Query execution on custom entities

3. Stress Tests
   - [ ] Large custom tables (1000+ columns)
   - [ ] Complex relationships (many-to-many)
   - [ ] High concurrency migrations
   - [ ] Memory usage during schema generation

4. End-to-End Scenarios
   - [ ] Plugin installation with schema
   - [ ] Schema updates and versioning
   - [ ] Plugin uninstallation and cleanup
   - [ ] Multi-site schema isolation

**Target Coverage**: 85%+ line coverage, 90%+ branch coverage

**Deliverables**:
- [ ] 150+ test cases (unit + integration)
- [ ] Performance benchmarks
- [ ] Coverage reports
- [ ] Test documentation

### Phase 6: Documentation & Examples (Week 7)

**Tasks**:
1. API Reference
   - [ ] ExtensionSchemaRegistry interface
   - [ ] Data types and enums
   - [ ] Error codes and handling
   - [ ] Usage examples

2. Developer Guide
   - [ ] How to define custom entities
   - [ ] How to define enums
   - [ ] How to create relationships
   - [ ] How to handle migrations

3. Working Examples
   - [ ] Simple custom entity (CustomReport)
   - [ ] Entity with relationships (Comments related to WorkOrders)
   - [ ] Enum extension example
   - [ ] Multi-plugin coordination example

4. Operations Guide
   - [ ] Monitoring schema extensions
   - [ ] Troubleshooting migration failures
   - [ ] Backing up and restoring data
   - [ ] Schema versioning strategy

**Deliverables**:
- [ ] API reference documentation
- [ ] Developer guide (2,000+ lines)
- [ ] 5+ working examples
- [ ] Operations/troubleshooting guide

---

## Technical Specifications

### Database Schema

```sql
-- Extension schema registry
CREATE TABLE extension_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  schema_definition JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, validating, active, failed
  validation_errors JSONB,
  registered_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  last_error TEXT,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'validating', 'active', 'failed'))
);

-- Migration tracking
CREATE TABLE extension_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id VARCHAR(255) NOT NULL,
  migration_id VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  migration_sql TEXT NOT NULL,
  rollback_sql TEXT,
  checksum_schema VARCHAR(64), -- SHA256 of schema
  checksum_sql VARCHAR(64), -- SHA256 of SQL
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, executing, executed, failed, rolled_back
  execution_start TIMESTAMP,
  execution_end TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'executing', 'executed', 'failed', 'rolled_back')),
  UNIQUE(plugin_id, migration_id)
);

-- Index for performance
CREATE INDEX idx_extension_schemas_status ON extension_schemas(status);
CREATE INDEX idx_extension_migrations_plugin_status ON extension_migrations(plugin_id, status);
CREATE INDEX idx_extension_migrations_created ON extension_migrations(created_at);
```

### API Endpoints

```
POST   /api/extensions/{pluginId}/schema
       - Register new schema
       - Payload: ExtensionDatabaseSchema

GET    /api/extensions/{pluginId}/schema
       - Get registered schema

PUT    /api/extensions/{pluginId}/schema
       - Update schema (versioning)
       - Payload: ExtensionDatabaseSchema

DELETE /api/extensions/{pluginId}/schema
       - Unregister schema

POST   /api/extensions/{pluginId}/schema/validate
       - Validate schema without registering
       - Payload: ExtensionDatabaseSchema

POST   /api/extensions/{pluginId}/migrations/execute
       - Execute pending migrations

GET    /api/extensions/{pluginId}/migrations
       - Get migration history

POST   /api/extensions/{pluginId}/migrations/{migrationId}/rollback
       - Rollback specific migration

GET    /api/extensions/conflicts
       - Detect schema conflicts
```

---

## Testing Strategy

### Unit Tests

- **Schema Registry Tests**: Registration, validation, conflict detection
- **Validation Tests**: Field types, constraints, relationships
- **Migration Generation Tests**: SQL generation, rollback SQL
- **Error Handling Tests**: Invalid schemas, conflicts, duplicates

### Integration Tests

- **Multi-Plugin Scenarios**: Multiple plugins with related entities
- **Relationship Tests**: Core entity relationships with custom entities
- **Query Tests**: Querying custom entities via API
- **Performance Tests**: Large schemas, complex queries

### Acceptance Tests

- End-to-end plugin installation with schema
- Schema updates with existing data
- Plugin uninstallation and cleanup
- Multi-site schema isolation

---

## Success Criteria

### Functionality
- ✅ Plugins can register custom entity definitions
- ✅ Plugins can register custom enums
- ✅ Plugins can define relationships to core entities
- ✅ Custom entities are accessible via auto-generated REST APIs
- ✅ Schema changes are applied safely with rollback capability
- ✅ Multiple plugins can coexist without namespace conflicts

### Quality
- ✅ 85%+ test coverage (line and branch)
- ✅ 0 critical security issues
- ✅ All database migrations reversible
- ✅ Query performance acceptable (<100ms for simple queries)

### Documentation
- ✅ Complete API reference
- ✅ Developer guide with examples
- ✅ Troubleshooting guide
- ✅ 5+ working examples

### Performance
- ✅ Schema registration < 1 second
- ✅ Migration execution (simple schema) < 5 seconds
- ✅ Query execution on custom entity < 100ms
- ✅ Memory footprint < 500MB for typical extensions

---

## Risk Assessment

### Risk: Schema Conflicts

**Probability**: High
**Impact**: Medium (functionality blocked)
**Mitigation**:
- Namespace all custom tables with plugin ID prefix
- Strict validation of table/field names
- Comprehensive conflict detection

### Risk: Data Corruption During Migration

**Probability**: Medium
**Impact**: High (data loss)
**Mitigation**:
- Wrap all migrations in transactions
- Automatic rollback on error
- Pre-migration backup
- Data validation before and after

### Risk: Performance Degradation

**Probability**: Medium
**Impact**: Medium (slower queries)
**Mitigation**:
- Analyze query plans automatically
- Suggest and create appropriate indexes
- Performance testing with large datasets
- Monitor and alert on slow queries

### Risk: Prisma Client Conflicts

**Probability**: Low
**Impact**: High (runtime errors)
**Mitigation**:
- Proper Prisma client re-initialization
- Versioning strategy for Prisma schema
- Thorough testing of type generation

### Risk: Multi-Plugin Dependencies

**Probability**: Medium
**Impact**: Medium (complex interactions)
**Mitigation**:
- Clear dependency declaration in manifests
- Validation of dependency chains
- Plugin load order management
- Comprehensive integration tests

---

## Timeline & Milestones

| Week | Phase | Milestone | Blockers |
|------|-------|-----------|----------|
| 1-2 | Foundation | Architecture design, DB schema | None |
| 2-3 | Registry | Registry service, validation | Week 1 complete |
| 3-4 | Migrations | Migration engine, Prisma integration | Week 2 complete |
| 4-5 | Safety | Data validation, multi-plugin support | Week 3 complete |
| 5-6.5 | Testing | 85%+ coverage, integration tests | Week 4 complete |
| 7 | Documentation | API reference, guides, examples | Week 6 complete |

**Total Duration**: 7-8 weeks
**Expected Completion**: Mid-December 2025

---

## Next Steps

1. **Approve architecture design** (this document)
2. **Allocate development team** (3-4 backend developers)
3. **Set up development environment** (local database setup)
4. **Create feature branch** (feature/issue-438-schema-extension)
5. **Schedule kick-off meeting** (review architecture, assign tasks)
6. **Begin Phase 1 implementation** (Week 1: Architecture & DB schema)

---

**Document**: ISSUE_438_IMPLEMENTATION_PLAN.md
**Version**: 1.0.0
**Created**: November 1, 2025
**Status**: Ready for Implementation
**Next Review**: After Phase 1 (Week 2)
