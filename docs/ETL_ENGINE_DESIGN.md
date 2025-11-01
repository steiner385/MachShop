# Issue #34: Database Direct Import/ETL Engine - Design & Implementation Plan

**Status:** Design Document & Implementation Roadmap
**Date:** November 1, 2025
**Scope:** ETL engine for direct extraction from legacy databases (SQL Server, Oracle, MySQL, PostgreSQL) with transformation, incremental sync, and scheduling

---

## Executive Summary

Issue #34 requires building a comprehensive ETL (Extract, Transform, Load) engine that eliminates manual CSV export/import workflows by directly connecting to legacy database systems. The engine supports extraction from SQL Server, Oracle, MySQL, PostgreSQL, and MariaDB with real-time transformation, incremental synchronization, job scheduling, and monitoring.

### Dependencies (Resolved ✅)
- **Issue #33** - Data Validation Framework (validation integration) - COMPLETED

### Core Features
- **Multi-Database Support** - SQL Server, Oracle, MySQL, PostgreSQL, MariaDB
- **Connection Management** - Secure credential storage, connection pooling, testing
- **Schema Discovery** - Auto-discover tables, columns, keys, constraints
- **Data Extraction** - Custom SQL, simple table extraction, pagination, preview
- **Transformation Engine** - Field mapping, data type conversion, 6+ transformation types
- **Incremental Sync** - Watermark tracking, change detection, conflict resolution
- **Job Management** - Create, schedule, execute, monitor ETL jobs
- **Batch Processing** - Configurable batch sizes, parallel processing
- **Error Handling** - Comprehensive logging, retry logic, partial failure support
- **Real-Time Monitoring** - Execution status, progress tracking, metrics collection

---

## Architecture

### Database Drivers & Connection Management

```
DatabaseConnectionManager
├── SQL Server (MSSQL)
│   ├── mssql driver with connection pooling
│   ├── ODBC/OLEDB on Windows
│   └── TCP/IP connections on Linux
├── Oracle
│   ├── oracledb driver
│   ├── Support for TNS names
│   └── Instant Client connectivity
├── MySQL/MariaDB
│   ├── mysql2 driver
│   └── Native protocol support
└── PostgreSQL
    ├── pg driver (existing)
    └── JDBC alternative support

Connection Features:
├── Pool Management (min 5, max 20 connections)
├── Connection Testing & Validation
├── Timeout & Retry Logic
├── SSL/TLS Support
└── Secure Credential Storage (encrypted)
```

### Schema Discovery Architecture

```
SchemaDiscoveryService
├── SQL Server Discovery
│   ├── sys.tables, sys.columns from system catalog
│   ├── Primary key discovery
│   ├── Foreign key constraints
│   └── Index information
├── Oracle Discovery
│   ├── all_tables, all_tab_columns
│   ├── all_constraints, all_ind_columns
│   └── Sequence information
├── MySQL Discovery
│   ├── information_schema tables
│   ├── SHOW CREATE TABLE for structure
│   └── Key constraint detection
└── PostgreSQL Discovery
    ├── information_schema tables
    ├── pg_catalog tables
    └── Constraint detection

Output: Complete schema with:
├── Table metadata (name, schema, row count)
├── Column metadata (name, type, nullable, size)
├── Primary keys
├── Foreign keys
├── Indexes
└── Data sample (first 100 rows)
```

### Transformation Pipeline Architecture

```
ExtractionPhase
    ↓
ValidationPhase (validate source data)
    ↓
TransformationPhase
├── Field Mapping (source → target)
├── Type Conversion
├── Data Transformations
│   ├── Concatenation
│   ├── Splitting
│   ├── Lookup/Mapping
│   ├── Calculated Fields
│   ├── Conditional Logic
│   └── Default Values
└── Output: Transformed records
    ↓
ValidationPhase (validate transformed data)
    ↓
LoadPhase
├── Pre-load validation
├── Batch insert/upsert
├── Foreign key resolution
├── Conflict handling
└── Transaction management
    ↓
VerificationPhase
├── Record counts
├── Data quality checks
└── Execution metrics
```

### ETL Execution Engine

```typescript
ETLExecutionEngine
├── Extraction Executor
│   ├── Query Builder
│   ├── Stream Manager
│   ├── Pagination Handler
│   ├── Sampling/Preview
│   └── Watermark Tracking
│
├── Transformation Executor
│   ├── Field Mapper
│   ├── Type Converter
│   ├── Expression Evaluator
│   ├── Transformation Pipeline
│   └── Error Handler
│
├── Load Executor
│   ├── Batch Manager
│   ├── Insert/Upsert Handler
│   ├── Foreign Key Resolver
│   ├── Conflict Manager
│   └── Transaction Manager
│
├── Monitoring & Metrics
│   ├── Progress Tracker
│   ├── Performance Metrics
│   ├── Error Logging
│   └── Watermark Persistence
│
└── Job Scheduling
    ├── Cron-based Scheduling
    ├── Job Dependencies
    ├── Execution Queue
    └── Retry Logic
```

### Backend Services Architecture

```typescript
DatabaseConnectionService
├── testConnection(config)
├── createConnection(config)
├── discoverSchema(connectionId)
├── executeQuery(connectionId, sql)
├── streamQuery(connectionId, sql, callback)
└── closeConnection(connectionId)

ETLJobService
├── createJob(definition)
├── updateJob(jobId, updates)
├── executeJob(jobId)
├── scheduleJob(jobId, cron)
├── getJobStatus(executionId)
├── previewExtraction(jobId)
└── getWatermark(jobId)

TransformationEngine
├── applyFieldMappings(records, mappings)
├── applyTransformations(record, transformations)
├── convertDataType(value, fromType, toType)
├── concatenateFields(record, fields, separator)
├── splitField(value, delimiter, index)
├── lookupValue(value, table)
├── evaluateExpression(expression, context)
└── applyConditional(record, condition, trueVal, falseVal)

ETLScheduler
├── scheduleJob(jobId, cronExpression)
├── executeScheduledJobs()
├── cancelScheduledJob(jobId)
├── getScheduleStatus(jobId)
└── listScheduledJobs()

IncrementalSyncService
├── getLastWatermark(jobId)
├── saveWatermark(jobId, watermark)
├── buildIncrementalQuery(job, lastWatermark)
├── detectChanges(sourceData, targetData)
└── resolveConflicts(sourceRecord, targetRecord, strategy)
```

### Database Schema

```typescript
model DatabaseConnection {
  id                String   @id @default(cuid())
  name              String   @unique
  description       String?
  type              String   // 'sqlserver' | 'oracle' | 'mysql' | 'postgresql'

  // Connection Details
  host              String
  port              Int
  database          String
  username          String
  encryptedPassword String   // AES-256 encrypted with app secret

  // Connection Options
  ssl               Boolean  @default(false)
  connectionTimeout Int      @default(30000)  // milliseconds
  poolSize          Json     @default("{\"min\": 5, \"max\": 20}")

  // Status & Testing
  isActive          Boolean  @default(true)
  lastTestedAt      DateTime?
  lastTestSuccess   Boolean?
  lastTestError     String?

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String

  // Relationships
  etlJobs           ETLJob[]

  @@index([type])
  @@index([isActive])
  @@index([createdBy])
}

model ETLJob {
  id                 String   @id @default(cuid())
  name               String
  description        String?

  // Source & Target
  sourceConnectionId String
  targetEntityType   String   // Part, BOM, WorkOrder, etc.

  // Extraction Config
  extractionType     String   @default("custom")  // 'custom_sql' | 'table' | 'view'
  extractionQuery    String?  // Custom SQL
  extractionTable    String?  // Table name for simple extraction
  extractionWhere    String?  // WHERE clause
  extractionOrderBy  String?  // ORDER BY clause

  // Incremental Sync Config
  incrementalEnabled Boolean  @default(false)
  watermarkField     String?  // Timestamp or ID field for incremental
  watermarkStrategy  String?  // 'timestamp' | 'id_range' | 'modtime'

  // Transformation Config
  fieldMappings      Json     // Array of FieldMapping objects
  transformations    Json?    // Array of Transformation objects

  // Load Config
  loadMode           String   @default("insert")  // 'insert' | 'upsert' | 'update'
  batchSize          Int      @default(1000)
  parallelism        Int      @default(4)
  errorHandling      String   @default("continue")  // 'stop' | 'continue' | 'fail_batch'
  conflictStrategy   String   @default("source_wins")  // 'source_wins' | 'target_wins' | 'manual'

  // Scheduling
  scheduleEnabled    Boolean  @default(false)
  scheduleCron       String?  // e.g., "0 2 * * *" for 2 AM daily
  scheduleTimezone   String?  @default("UTC")

  // Watermark Tracking
  lastExecutedAt     DateTime?
  lastWatermark      String?  // Last processed timestamp/ID for incremental
  lastWatermarkTime  DateTime? // When watermark was last updated

  // Status
  isActive           Boolean  @default(true)
  status             String   @default("IDLE")  // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'

  // Metadata
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  createdBy          String

  // Relationships
  sourceConnection   DatabaseConnection @relation(fields: [sourceConnectionId], references: [id], onDelete: Cascade)
  executions         ETLJobExecution[]

  @@index([sourceConnectionId])
  @@index([targetEntityType])
  @@index([isActive])
  @@index([scheduleEnabled])
  @@unique([name])
}

model ETLJobExecution {
  id                String   @id @default(cuid())
  jobId             String

  // Execution Status
  status            String   // 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  startedAt         DateTime
  completedAt       DateTime?
  duration          Int?     // milliseconds

  // Execution Mode
  executionMode     String   // 'MANUAL' | 'SCHEDULED' | 'RETRY'
  triggeredBy       String   // User ID or 'SCHEDULER'

  // Metrics
  totalExtracted    Int      @default(0)
  totalTransformed  Int      @default(0)
  totalLoaded       Int      @default(0)
  totalFailed       Int      @default(0)
  totalSkipped      Int      @default(0)
  extractionTime    Int?     // milliseconds
  transformationTime Int?    // milliseconds
  loadTime          Int?     // milliseconds

  // Watermark (for incremental)
  previousWatermark String?
  newWatermark      String?
  watermarkSavedAt  DateTime?

  // Error & Warning Tracking
  errorCount        Int      @default(0)
  warningCount      Int      @default(0)
  errorLog          Json?    // Array of error objects with details

  // Progress Tracking
  lastProgressAt    DateTime @updatedAt

  // Relationships
  job               ETLJob   @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([status])
  @@index([startedAt])
  @@index([triggeredBy])
}

model ETLError {
  id                String   @id @default(cuid())
  executionId       String

  // Error Details
  errorType         String   // 'EXTRACTION' | 'TRANSFORMATION' | 'LOADING' | 'VALIDATION'
  errorMessage      String
  errorStack        String?
  sourceData        Json?    // Original record that caused error
  transformedData   Json?    // Partially transformed record

  // Context
  recordNumber      Int?     // Row/record number in batch
  batchNumber       Int?     // Batch number in job
  fieldName         String?  // Which field caused error

  // Metadata
  createdAt         DateTime @default(now())
  resolved          Boolean  @default(false)
  resolution        String?  // How was it resolved?

  @@index([executionId])
  @@index([errorType])
  @@index([resolved])
}

model ETLWatermark {
  id                String   @id @default(cuid())
  jobId             String

  // Watermark Value
  watermarkValue    String   // Last processed timestamp or ID
  watermarkType     String   // 'TIMESTAMP' | 'ID' | 'SEQUENCE'

  // History
  previousValue     String?
  changedAt         DateTime @default(now())
  changedBy         String   // User or 'SCHEDULER'

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([jobId])
  @@index([jobId])
}

model ETLJobSchedule {
  id                String   @id @default(cuid())
  jobId             String   @unique

  // Schedule Definition
  cronExpression    String   // "0 2 * * *" = 2 AM daily
  timezone          String   @default("UTC")
  enabled           Boolean  @default(true)

  // Execution Tracking
  lastRun           DateTime?
  lastRunStatus     String?  // 'SUCCESS' | 'FAILED' | 'PARTIAL'
  nextRun           DateTime?
  runCount          Int      @default(0)
  failCount         Int      @default(0)

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([enabled])
  @@index([nextRun])
}
```

### API Specification

```typescript
// === DATABASE CONNECTIONS ===

POST /api/v1/migration/etl/connections
Request: {
  name: "SAP Legacy System",
  type: "sqlserver",
  host: "legacy-db.company.com",
  port: 1433,
  database: "sapdb",
  username: "sa",
  password: "encrypted_password"
}
Response: { id: "conn_123", success: true }

GET /api/v1/migration/etl/connections
Response: [
  {
    id: "conn_123",
    name: "SAP Legacy System",
    type: "sqlserver",
    host: "legacy-db.company.com",
    isActive: true,
    lastTestedAt: "2025-11-01T10:00:00Z",
    lastTestSuccess: true
  }
]

POST /api/v1/migration/etl/connections/:id/test
Response: {
  success: true,
  message: "Connection successful",
  databaseVersion: "SQL Server 2019"
}

POST /api/v1/migration/etl/connections/:id/discover
Response: {
  tables: [
    {
      name: "PARTS",
      schema: "dbo",
      rowCount: 50000,
      columns: [
        { name: "PART_ID", dataType: "int", nullable: false, size: 4 },
        { name: "PART_NAME", dataType: "varchar", nullable: false, size: 255 }
      ],
      primaryKey: ["PART_ID"]
    }
  ]
}

// === ETL JOBS ===

POST /api/v1/migration/etl/jobs
Request: {
  name: "Import Parts from SAP",
  sourceConnectionId: "conn_123",
  targetEntityType: "Part",
  extractionType: "table",
  extractionTable: "PARTS",
  extractionWhere: "ACTIVE_FLAG = 1",
  fieldMappings: [
    { sourceField: "PART_ID", targetField: "partNumber", dataType: "string" },
    { sourceField: "PART_NAME", targetField: "name", dataType: "string" }
  ],
  loadMode: "upsert",
  batchSize: 5000
}
Response: { id: "job_456", success: true }

GET /api/v1/migration/etl/jobs
Response: [
  {
    id: "job_456",
    name: "Import Parts from SAP",
    targetEntityType: "Part",
    status: "IDLE",
    lastExecutedAt: "2025-11-01T14:00:00Z",
    isActive: true
  }
]

POST /api/v1/migration/etl/jobs/:id/preview
Response: {
  sampleData: [
    { PART_ID: 1001, PART_NAME: "PUMP ASSEMBLY", ACTIVE_FLAG: 1 },
    { PART_ID: 1002, PART_NAME: "MOTOR UNIT", ACTIVE_FLAG: 1 }
  ],
  columns: ["PART_ID", "PART_NAME", "ACTIVE_FLAG"],
  rowCount: 50000
}

POST /api/v1/migration/etl/jobs/:id/execute
Request: {
  executionMode: "MANUAL"  // MANUAL | SCHEDULED
}
Response: {
  executionId: "exec_789",
  status: "RUNNING"
}

POST /api/v1/migration/etl/jobs/:id/schedule
Request: {
  enabled: true,
  cronExpression: "0 2 * * *",  // 2 AM daily
  timezone: "America/New_York"
}
Response: { success: true }

// === EXECUTIONS ===

GET /api/v1/migration/etl/executions/:id
Response: {
  id: "exec_789",
  jobId: "job_456",
  status: "RUNNING",
  startedAt: "2025-11-01T14:00:00Z",
  progress: {
    extracted: 10000,
    transformed: 9500,
    loaded: 9500,
    failed: 500,
    percentage: 20
  },
  metrics: {
    extractionTime: 15000,
    transformationTime: 8000,
    loadTime: 0,
    ratePerSecond: 667  // records/second
  }
}

GET /api/v1/migration/etl/executions/:id/errors
Response: [
  {
    errorType: "TRANSFORMATION",
    errorMessage: "Invalid date format in CREATED_DATE",
    fieldName: "CREATED_DATE",
    sourceData: { PART_ID: 5001, CREATED_DATE: "invalid_date" },
    recordNumber: 4501
  }
]

POST /api/v1/migration/etl/executions/:id/retry
Response: { executionId: "exec_790", status: "RUNNING" }
```

### Real-Time Monitoring (WebSocket)

```typescript
socket.on('etl-execution-update', (status: ExecutionStatus) => {
  // { executionId, jobId, status, progress, metrics }
  updateExecutionProgress(status)
})

socket.on('etl-extraction-complete', (metrics: ExtractionMetrics) => {
  // { extracted: 50000, failed: 100, rate: 667 }
  updateExtractionStatus(metrics)
})

socket.on('etl-transformation-complete', (metrics: TransformationMetrics) => {
  updateTransformationStatus(metrics)
})

socket.on('etl-load-complete', (metrics: LoadMetrics) => {
  updateLoadStatus(metrics)
})

socket.on('etl-error', (error: ETLError) => {
  logError(error)
})

socket.on('etl-completion', (result: ExecutionResult) => {
  showCompletionNotification(result)
})
```

---

## Transformation Rule Types

### 1. Field Mapping (Rename/Type)
```typescript
{
  type: 'map',
  sourceField: 'PART_ID',
  targetField: 'partNumber',
  dataType: 'string'
}
```

### 2. Concatenation
```typescript
{
  type: 'concat',
  sourceFields: ['FIRST_NAME', 'LAST_NAME'],
  targetField: 'fullName',
  separator: ' '
}
```

### 3. Splitting
```typescript
{
  type: 'split',
  sourceField: 'fullName',
  targetField: 'firstName',
  delimiter: ' ',
  partIndex: 0
}
```

### 4. Lookup/Mapping
```typescript
{
  type: 'lookup',
  sourceField: 'status_code',
  targetField: 'status',
  lookupTable: {
    'A': 'ACTIVE',
    'I': 'INACTIVE',
    'D': 'DELETED'
  },
  defaultValue: 'UNKNOWN'
}
```

### 5. Calculated/Expression
```typescript
{
  type: 'calculate',
  sourceFields: ['quantity', 'unit_price'],
  targetField: 'totalPrice',
  expression: 'quantity * unit_price'
}
```

### 6. Conditional
```typescript
{
  type: 'conditional',
  sourceFields: ['type_code'],
  targetField: 'partType',
  condition: "type_code === 'P'",
  trueValue: 'PURCHASED',
  falseValue: 'MANUFACTURED'
}
```

### 7. Data Type Conversion
```typescript
{
  type: 'convert',
  sourceField: 'created_date',
  targetField: 'createdDate',
  fromType: 'string',
  toType: 'datetime',
  format: 'YYYY-MM-DD'
}
```

### 8. Default Values
```typescript
{
  type: 'default',
  targetField: 'status',
  defaultValue: 'DRAFT',
  condition: 'sourceRecord.status === null'
}
```

---

## Implementation Phases

### Phase 1: Database Connectivity (Week 1)
**Deliverables:**
- DatabaseConnectionService with multi-database support
- Connection pooling and testing
- Encrypted credential storage
- Connection lifecycle management

**Files to Create:**
- `src/services/migration/database/DatabaseConnectionService.ts`
- `src/services/migration/database/drivers/MSSQLDriver.ts`
- `src/services/migration/database/drivers/OracleDriver.ts`
- `src/services/migration/database/drivers/MySQLDriver.ts`
- `src/services/migration/database/drivers/PostgreSQLDriver.ts`
- Database migration for DatabaseConnection model

**Acceptance Criteria:**
- Connections to all database types successful
- Connection testing validates credentials
- Credentials encrypted at rest
- Pool management prevents resource leaks
- Error handling for connection failures

---

### Phase 2: Schema Discovery (Week 1-2)
**Deliverables:**
- SchemaDiscoveryService for each database type
- Complete table/column metadata extraction
- Primary key and foreign key detection
- Data type mapping to MES schema

**Files to Create:**
- `src/services/migration/discovery/SchemaDiscoveryService.ts`
- `src/services/migration/discovery/DatabaseInspector.ts`
- Database migration for ETLJob model

**Acceptance Criteria:**
- All tables discovered with metadata
- Column information complete (type, size, nullable)
- Primary keys identified
- Foreign keys mapped
- Row count estimates accurate

---

### Phase 3: Data Extraction (Week 2)
**Deliverables:**
- Query execution with streaming support
- Pagination for large datasets
- Preview functionality
- Incremental extraction with watermark tracking

**Files to Create:**
- `src/services/migration/extraction/ExtractionService.ts`
- `src/services/migration/extraction/QueryBuilder.ts`
- `src/services/migration/extraction/StreamProcessor.ts`

**Acceptance Criteria:**
- Custom SQL queries execute correctly
- Large datasets stream without memory issues
- Preview returns first 100 rows
- Pagination handles 1M+ row datasets
- Watermark tracking for incremental sync

---

### Phase 4: Transformation Engine (Week 2-3)
**Deliverables:**
- TransformationEngine with all 8 rule types
- Data type conversions
- Expression evaluation (math.js)
- Comprehensive error handling

**Files to Create:**
- `src/services/migration/transformation/TransformationEngine.ts`
- `src/services/migration/transformation/rules/*`
- Unit tests for all transformation types

**Acceptance Criteria:**
- All transformation types work correctly
- Expression evaluation handles complex formulas
- Data type conversions handle edge cases
- Error handling with meaningful messages

---

### Phase 5: ETL Job Management & Scheduling (Week 3)
**Deliverables:**
- ETLJobService for CRUD operations
- Job scheduling with node-cron
- Job execution engine
- Watermark persistence

**Files to Create:**
- `src/services/migration/ETLJobService.ts`
- `src/services/migration/ETLScheduler.ts`
- `src/services/migration/ETLExecutionEngine.ts`
- Database migrations for ETLJob, ETLJobExecution, ETLJobSchedule

**Acceptance Criteria:**
- Jobs created, updated, deleted via API
- Jobs scheduled and execute on schedule
- Manual execution works
- Watermarks tracked correctly
- Job status updates in real-time

---

### Phase 6: API & Database Models (Week 3-4)
**Deliverables:**
- Complete API endpoints for all ETL operations
- Database models for connections, jobs, executions
- Authorization middleware
- WebSocket integration for real-time monitoring

**Files to Create:**
- `src/routes/migration/etl.ts`
- Database migrations

**Acceptance Criteria:**
- All API endpoints functional
- Authorization working
- WebSocket updates real-time
- API responses follow REST conventions
- Error handling with proper status codes

---

### Phase 7: Frontend ETL Manager (Week 4-5)
**Deliverables:**
- Database connection manager UI
- Visual ETL job builder
- Field mapping with drag-drop
- Transformation rule editor
- Job execution monitor
- Execution history

**Files to Create:**
- `frontend/src/pages/Admin/Migration/ETLManager.tsx`
- `frontend/src/components/Migration/ConnectionManager.tsx`
- `frontend/src/components/Migration/ETLJobBuilder.tsx`
- `frontend/src/components/Migration/ExecutionMonitor.tsx`

**Acceptance Criteria:**
- All UI components responsive
- Drag-drop field mapping works
- Transformation rules editable
- Real-time execution monitoring
- Error display clear and actionable

---

### Phase 8: Integration & Testing (Week 5-6)
**Deliverables:**
- Integration with Issue #32 (Bulk Import)
- Integration with Issue #33 (Validation)
- Performance testing
- End-to-end testing
- Documentation

**Acceptance Criteria:**
- Integration with other systems seamless
- 1M record migration completes in <10 minutes
- Memory usage stable and bounded
- All error scenarios handled
- Documentation complete and comprehensive

---

## Technology Stack

### Backend
- **Database Drivers:**
  - `mssql` (SQL Server)
  - `oracledb` (Oracle)
  - `mysql2` (MySQL/MariaDB)
  - `pg` (PostgreSQL - existing)
- **Expression Evaluation:** `mathjs`
- **Scheduling:** `node-cron`
- **Encryption:** Node.js `crypto` module
- **Stream Processing:** Node.js `stream` module

### Frontend
- **React 18** with TypeScript
- **React DnD** for drag-and-drop
- **React Query** for API data
- **Socket.io-client** for real-time updates
- **Tailwind CSS** for styling

### Database
- PostgreSQL with new models (DatabaseConnection, ETLJob, ETLJobExecution, ETLError, ETLWatermark, ETLJobSchedule)

### Testing
- **Jest** for unit tests
- **Supertest** for API tests
- **Docker Compose** for test database instances

---

## Success Metrics

### Functionality
- [ ] Connect to SQL Server, Oracle, MySQL, PostgreSQL successfully
- [ ] Schema discovery returns 100% accurate metadata
- [ ] All transformation types work correctly
- [ ] ETL jobs execute and load data accurately
- [ ] Incremental sync tracks changes correctly

### Performance
- [ ] Extract 1M records in <5 minutes
- [ ] Transform 1M records in <3 minutes
- [ ] Load 1M records in <5 minutes
- [ ] Memory usage <2GB for any dataset
- [ ] Connection pooling efficient (<100ms per query)

### Quality
- [ ] >90% test coverage
- [ ] All error scenarios handled gracefully
- [ ] Error logging comprehensive and useful
- [ ] Data integrity verified after load

### User Experience
- [ ] Connection testing <5 seconds
- [ ] Schema discovery <10 seconds
- [ ] Preview extraction <2 seconds
- [ ] Job execution monitoring responsive
- [ ] UI intuitive and self-documenting

---

## Risk Mitigation

### Risk 1: Database Driver Issues
- **Mitigation:** Use well-maintained open-source drivers, comprehensive testing
- **Fallback:** Fall back to ODBC/JDBC for unsupported databases

### Risk 2: Large Dataset Memory Issues
- **Mitigation:** Use streaming, batch processing, memory monitoring
- **Fallback:** Reduce batch size, implement checkpointing

### Risk 3: Transformation Complexity
- **Mitigation:** Start with simple transformations, comprehensive validation
- **Fallback:** Manual data fixes in post-load validation

### Risk 4: Credential Security
- **Mitigation:** AES-256 encryption, environment variable separation, audit logging
- **Fallback:** Manual connection testing before use

### Risk 5: Incremental Sync Conflicts
- **Mitigation:** Multiple conflict resolution strategies, conflict logging
- **Fallback:** Manual conflict review

---

## Dependencies & Integration

### Integration Points
- **Issue #32** - Bulk Import (load logic, batch processing)
- **Issue #33** - Validation Framework (data quality validation)
- **Issue #37** - Migration Wizard (job creation from wizard)

### External Services
- Database drivers for SQL Server, Oracle, MySQL
- Node.js `crypto` for encryption
- `node-cron` for scheduling

---

## Acceptance Criteria - Complete Checklist

### Database Connectivity
- [ ] SQL Server connection and schema discovery
- [ ] Oracle connection and schema discovery
- [ ] MySQL connection and schema discovery
- [ ] PostgreSQL connection and schema discovery
- [ ] Connection testing validates credentials
- [ ] Encrypted credential storage

### Data Extraction
- [ ] Custom SQL query execution
- [ ] Large dataset streaming
- [ ] Pagination for result sets
- [ ] Preview functionality
- [ ] Incremental extraction with watermarks

### Transformation
- [ ] Field mapping (rename/type)
- [ ] Concatenation
- [ ] Splitting
- [ ] Lookup/mapping
- [ ] Calculated fields
- [ ] Conditional transformations
- [ ] Data type conversion
- [ ] Default values

### ETL Jobs
- [ ] Create job via API
- [ ] Edit job configuration
- [ ] Delete job
- [ ] Execute job on-demand
- [ ] Schedule jobs with cron
- [ ] Monitor execution progress
- [ ] View execution history
- [ ] Watermark tracking and persistence

### Error Handling
- [ ] Connection errors logged
- [ ] Transformation errors captured
- [ ] Load errors handled gracefully
- [ ] Partial failure support
- [ ] Detailed error logging with source data
- [ ] Retry capability

### Performance
- [ ] 1M record migration <13 minutes total
- [ ] Memory stable and bounded
- [ ] Connection pooling efficient
- [ ] Large batch processing optimized

### Integration
- [ ] Works with Bulk Import
- [ ] Works with Validation Framework
- [ ] Works with Migration Wizard
- [ ] Real-time monitoring via WebSocket

---

## Conclusion

Issue #34 (Database Direct Import/ETL Engine) transforms data migration from manual, time-consuming CSV exports to fully automated, scheduled, and monitored ETL jobs. By eliminating manual CSV handling and supporting direct database-to-database extraction, the engine significantly reduces migration time and error rates.

The phased 6-week implementation provides incremental delivery with core connectivity available in week 2, transformation capabilities by week 3, and full scheduling/monitoring by week 5. The system becomes the cornerstone of efficient enterprise data migrations, enabling organizations to migrate millions of records with confidence.

This ETL engine will handle complex legacy data transformations, support incremental synchronization during parallel running periods, and provide comprehensive monitoring to ensure data quality throughout the migration process.
