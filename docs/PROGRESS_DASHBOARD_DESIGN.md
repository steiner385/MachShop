# Issue #39: Progress Dashboard & Cutover Management - Design & Implementation Plan

**Status:** Design Document & Implementation Roadmap
**Date:** November 1, 2025
**Scope:** Real-time migration progress tracking, data quality metrics, cutover readiness assessment, rollback capabilities, and executive reporting

---

## Executive Summary

Issue #39 requires building a comprehensive migration progress dashboard and cutover management system that provides real-time visibility into the entire data migration process. This dashboard enables stakeholders to monitor progress, assess data quality, determine cutover readiness, and execute rollbacks if needed.

### Dependencies (Resolved ✅)
- **Issue #32** - Bulk Import Engine (provides import execution for metrics) - COMPLETED
- **Issue #33** - Validation Framework (provides data quality scoring) - COMPLETED
- **Issue #37** - Guided Migration Wizard (provides session management context) - COMPLETED
- **Issue #38** - Data Mapping Assistant (provides mapping context) - COMPLETED

### Core Features
- **Real-Time Progress Dashboard** - Overall and entity-level progress tracking with visual indicators
- **Data Quality Metrics** - Multi-dimensional quality scoring (completeness, validity, consistency, accuracy)
- **Cutover Readiness Assessment** - Automated checklist with go/no-go recommendation and approval workflow
- **Rollback & Recovery** - Pre-migration snapshots with one-click rollback and partial entity-level recovery
- **Timeline & Milestones** - Gantt chart visualization with critical path analysis
- **Issue Tracking** - Alert system with priority, severity, assignment, and SLA tracking
- **Executive Reporting** - PDF/Excel/CSV exports with scheduled reports
- **Notifications** - Real-time alerts with Email, Slack, and Teams integration

---

## Architecture

### Frontend Components

```
ProgressDashboard (Main Container)
├── DashboardHeader
│   ├── MigrationTitle
│   ├── StatusBadge (IN_PROGRESS / COMPLETED / FAILED)
│   └── ActionButtons (Snapshot, Rollback, Reports, Export)
│
├── OverviewSection
│   ├── OverallProgressCard
│   │   ├── CircleProgress (0-100%)
│   │   ├── ImportStats (records/rate/eta)
│   │   └── TimelineInfo (elapsed/remaining)
│   ├── QualityScoreCard
│   │   ├── QualityGauge (0-100)
│   │   ├── TrendIndicator (↑/↓/→)
│   │   └── QualityDimensions (4-bar chart)
│   └── CutoverReadinessCard
│       ├── ReadinessGauge (0-100)
│       ├── GoNoGoIndicator
│       └── BlockerCount
│
├── EntityProgressSection
│   ├── EntityProgressTable
│   │   └── EntityRow (for each entity type)
│   │       ├── EntityName
│   │       ├── ProgressBar
│   │       ├── RecordCounts (imported/total)
│   │       ├── QualityScore
│   │       ├── Status Badge
│   │       └── ActionMenu (details, issues)
│   └── GroupingControls (tier, category, sort)
│
├── MetricsSection
│   ├── QualityDimensionsChart (Radar or Bar)
│   │   ├── Completeness (%)
│   │   ├── Validity (%)
│   │   ├── Consistency (%)
│   │   └── Accuracy (%)
│   ├── QualityTrendChart (Line chart over time)
│   └── ImportRateChart (Records/minute over time)
│
├── TimelineSection
│   ├── GanttChart
│   │   ├── Phase Bars
│   │   ├── Milestones
│   │   ├── Actual vs. Planned
│   │   └── CriticalPath Highlight
│   └── MilestonesList
│
├── IssuesSection
│   ├── AlertsPanel
│   │   ├── FilterOptions (severity, type, status)
│   │   ├── AlertsList
│   │   │   └── AlertCard (for each alert)
│   │   │       ├── Title
│   │   │       ├── Severity Badge
│   │   │       ├── Entity & Details
│   │   │       └── Action Buttons (resolve, assign)
│   │   └── AlertStats (critical/high/medium/low)
│   └── TrendChart (new/resolved alerts over time)
│
├── CutoverReadinessSection
│   ├── ReadinessChecklist
│   │   ├── ChecklistCategories
│   │   │   └── CategoryItems
│   │   │       ├── CheckItem Checkbox
│   │   │       ├── Requirement Text
│   │   │       ├── Status Badge
│   │   │       └── Notes
│   │   └── BlockersList
│   ├── RecommendationBox (GO / NO_GO / GO_WITH_CAUTION)
│   └── ApprovalButton (if authorized)
│
└── RollbackSection
    ├── SnapshotsList
    │   └── SnapshotCard (for each snapshot)
    │       ├── Name & Description
    │       ├── CreatedAt & CreatedBy
    │       ├── EntityTypes & Size
    │       ├── RecordCounts Summary
    │       └── ActionButtons (rollback, delete)
    ├── RollbackDialog
    │   ├── SelectEntities (optional)
    │   ├── VerifyCheckbox
    │   ├── BackupCheckbox
    │   └── ConfirmButton
    └── RollbackHistory
        └── RollbackRecord (for each rollback executed)
```

### Backend Service Architecture

```
MetricsService
├── Collection
│   ├── recordProgressMetric(entityType, imported, total)
│   ├── recordQualityMetric(entityType, completeness, validity, consistency, accuracy)
│   ├── recordImportRate(recordsPerMinute)
│   └── recordErrorMetric(entityType, errorCount, errorType)
├── Aggregation
│   ├── calculateOverallProgress()
│   ├── calculateEntityProgress(entityType)
│   ├── calculateOverallQuality()
│   ├── calculateEntityQuality(entityType)
│   └── aggregateMetricsByTier()
├── Trending
│   ├── getQualityTrend(entityType, timeRange)
│   ├── getProgressTrend(entityType, timeRange)
│   ├── getImportRateTrend(timeRange)
│   └── predictCompletion(currentRate)
└── Persistence
    ├── saveMetrics(metrics)
    ├── queryMetrics(filters, aggregation)
    ├── archiveOldMetrics(olderThan)
    └── deleteMetrics(migrationSessionId)

CutoverReadinessService
├── Assessment
│   ├── assessReadiness() → CutoverReadiness
│   ├── evaluateChecklist() → ChecklistStatus[]
│   ├── identifyBlockers() → Blocker[]
│   ├── identifyWarnings() → Warning[]
│   └── getGoNoGoRecommendation() → 'GO' | 'NO_GO' | 'GO_WITH_CAUTION'
├── Checklist Management
│   ├── getChecklistTemplate(type) → ChecklistItem[]
│   ├── getChecklistStatus() → ChecklistStatus[]
│   ├── completeChecklistItem(itemId, userId, notes)
│   ├── uncompleteChecklistItem(itemId)
│   └── recordChecklist(migrationSessionId, checklist)
├── Risk Assessment
│   ├── calculateRiskLevel() → 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
│   ├── identifyRisks() → Risk[]
│   └── suggestMitigations(risk) → string[]
└── Approval
    ├── getApprovalStatus() → ApprovalStatus
    ├── approveCutover(approver, comments, conditions)
    ├── rejectCutover(rejector, reason)
    ├── conditionalApprove(approver, conditions)
    └── revokeApproval(revoker, reason)

RollbackService
├── Snapshot Management
│   ├── createSnapshot(name, description, entityTypes)
│   ├── listSnapshots(filters)
│   ├── getSnapshot(snapshotId)
│   ├── deleteSnapshot(snapshotId)
│   └── deleteOldSnapshots(olderThan)
├── Rollback Execution
│   ├── executeRollback(snapshotId, options)
│   ├── rollbackEntity(snapshotId, entityType)
│   ├── rollbackMultipleEntities(snapshotId, entityTypes)
│   └── verifyRollback(snapshotId, snapshotBefore)
├── Recovery
│   ├── restoreFromSnapshot(snapshotId)
│   ├── partialRestore(snapshotId, entityTypes)
│   └── verifyDataIntegrity(snapshotId, currentData)
├── Storage
│   ├── storeSnapshot(snapshotId, data)
│   ├── retrieveSnapshot(snapshotId)
│   ├── deleteSnapshot(snapshotId)
│   └── listSnapshots()
└── Monitoring
    ├── trackRollback(rollbackId, progress)
    ├── getRollbackStatus(rollbackId)
    └── logRollbackEvent(event)

AlertingService
├── Alert Generation
│   ├── createAlert(type, severity, title, message, entityType)
│   ├── getActiveAlerts()
│   ├── getResolvedAlerts()
│   └── getAlertStats()
├── Alert Management
│   ├── resolveAlert(alertId, userId, resolution)
│   ├── unresolveAlert(alertId)
│   ├── assignAlert(alertId, userId)
│   ├── unassignAlert(alertId)
│   └── addNoteToAlert(alertId, note)
├── Threshold-Based Alerts
│   ├── qualityScoreDrop(previousScore, currentScore, threshold)
│   ├── importRateDrop(previousRate, currentRate, threshold)
│   ├── highErrorRate(errorCount, recordCount, threshold)
│   └── slowProgress(expectedProgress, actualProgress, threshold)
└── Notifications
    ├── notifyEmail(alert, recipients)
    ├── notifySlack(alert, channel)
    ├── notifyTeams(alert, webhook)
    └── escalate(alert, escalationRules)

ReportingService
├── Executive Summary
│   ├── generateExecutiveSummary() → PDF
│   ├── includeMigrationStats()
│   ├── includeQualityMetrics()
│   ├── includeCutoverReadiness()
│   └── includeRiskAssessment()
├── Detailed Reports
│   ├── generateDetailedReport() → Excel
│   ├── includeEntityDetails()
│   ├── includeIssueLog()
│   ├── includeTimelineAnalysis()
│   └── includeDataQualityDetails()
├── Audit Trail
│   ├── generateAuditTrail() → CSV
│   ├── includeAllEvents()
│   ├── includeApprovals()
│   ├── includeRollbacks()
│   └── includeAlertsAndResolutions()
└── Scheduled Reports
    ├── scheduleReport(frequency, recipients, format)
    ├── generateAndSend(reportId)
    └── listScheduledReports()

TimelineService
├── Phase Management
│   ├── defineMigrationPhases(phases)
│   ├── getPhases() → Phase[]
│   ├── updatePhaseProgress(phaseId, progress)
│   └── completeMilestone(milestoneId)
├── Critical Path
│   ├── calculateCriticalPath() → Phase[]
│   ├── identifyDelays() → Delay[]
│   └── suggestAdjustments() → Adjustment[]
├── Prediction
│   ├── predictCompletion(currentProgress, rate)
│   ├── calculateScheduleVariance()
│   └── identifyRisk(actualVsPlanned)
└── Visualization
    ├── getGanttChartData() → GanttData
    ├── getMilestoneTimeline() → Timeline
    └── getCriticalPathVisualization() → PathData
```

### Database Schema

```typescript
model MigrationMetrics {
  id                  String   @id @default(cuid())
  migrationSessionId  String?  // Reference to MigrationSession
  entityType          String?  // null = overall metrics

  // Progress
  totalRecords        Int      @default(0)
  importedRecords     Int      @default(0)
  failedRecords       Int      @default(0)
  skippedRecords      Int      @default(0)
  progressPercent     Float    @default(0.0)

  // Quality Dimensions
  completeness        Float    @default(0.0)  // % of required fields populated
  validity            Float    @default(0.0)  // % of fields with valid data types
  consistency         Float    @default(0.0)  // % matching business rules
  accuracy            Float    @default(0.0)  // % matching expected values

  // Import Performance
  importRate          Float    @default(0.0)  // records per minute
  avgRecordProcessTime Float  @default(0.0)  // milliseconds

  // Metadata
  recordedAt          DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([migrationSessionId])
  @@index([entityType])
  @@index([recordedAt])
  @@index([progressPercent])
  @@index([completeness])
}

model CutoverChecklist {
  id              String   @id @default(cuid())
  itemId          String   // Unique identifier (DQ001, SR001, etc.)

  // Requirement
  category        String   // 'DATA_QUALITY' | 'SYSTEM_READINESS' | 'USER_READINESS' | 'TESTING'
  requirement     String   // Full requirement description
  description     String?  // Additional context

  // Status
  status          String   @default("NOT_TESTED")  // 'PASS' | 'FAIL' | 'NOT_TESTED'
  required        Boolean  @default(true)  // Required for go-live

  // Completion
  completedAt     DateTime?
  completedBy     String?
  notes           String?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([itemId])
  @@index([category])
  @@index([status])
  @@index([required])
}

model CutoverApproval {
  id              String   @id @default(cuid())
  migrationSessionId String? // Reference to session being approved

  // Decision
  decision        String   // 'APPROVED' | 'REJECTED' | 'CONDITIONAL'
  recommendation  String   // 'GO' | 'NO_GO' | 'GO_WITH_CAUTION'
  riskLevel       String   // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  // Approver Info
  approvedBy      String   // User ID
  approvedAt      DateTime @default(now())
  comments        String?
  conditions      String[] // Array of conditions if CONDITIONAL

  // History
  createdAt       DateTime @default(now())

  @@index([decision])
  @@index([approvedAt])
  @@index([migrationSessionId])
}

model RollbackSnapshot {
  id              String   @id @default(cuid())

  // Identification
  name            String
  description     String?
  snapshotType    String   @default("FULL")  // 'FULL' | 'INCREMENTAL'

  // Content
  entityTypes     String[] // Array of entity type strings
  recordCounts    Json     // { "Part": 10000, "BOM": 5000, ... }

  // Storage
  sizeBytes       BigInt
  storagePath     String   // S3 path or local path
  storageFormat   String   @default("SQL_DUMP")  // 'SQL_DUMP' | 'PARQUET' | 'CSV'

  // Metadata
  createdAt       DateTime @default(now())
  createdBy       String
  expiresAt       DateTime?  // Auto-delete after X days

  // Relationships
  rollbacks       Rollback[]

  @@index([createdAt])
  @@index([storageFormat])
}

model Rollback {
  id              String   @id @default(cuid())
  snapshotId      String

  // Execution Details
  entityTypes     String[] // Which entities were rolled back

  // Results
  success         Boolean  @default(true)
  recordsRestored Int      @default(0)
  recordsDeleted  Int      @default(0)
  duration        Int      // milliseconds
  errors          Json?    // Array of error objects

  // Metadata
  executedAt      DateTime @default(now())
  executedBy      String

  // Verification
  verified        Boolean  @default(false)
  verifiedAt      DateTime?

  // Relationships
  snapshot        RollbackSnapshot @relation(fields: [snapshotId], references: [id])

  @@index([snapshotId])
  @@index([executedAt])
  @@index([success])
}

model MigrationAlert {
  id              String   @id @default(cuid())

  // Classification
  alertType       String   // 'ERROR' | 'WARNING' | 'INFO' | 'THRESHOLD'
  severity        String   // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Content
  title           String
  message         String
  entityType      String?
  recordId        String?

  // Status
  resolved        Boolean  @default(false)

  // Tracking
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?
  assignedTo      String?
  resolution      String?  // How was it resolved?
  notes           String?

  // Timestamps for SLA tracking
  firstAlertedAt  DateTime @default(now())
  targetResolutionTime DateTime? // SLA deadline

  @@index([resolved])
  @@index([severity])
  @@index([alertType])
  @@index([entityType])
  @@index([createdAt])
  @@index([assignedTo])
}

model MigrationTimeline {
  id              String   @id @default(cuid())
  migrationSessionId String?

  // Phase Information
  phaseId         String
  phaseName       String
  description     String?

  // Timing
  plannedStart    DateTime
  plannedEnd      DateTime
  actualStart     DateTime?
  actualEnd       DateTime?

  // Progress
  progressPercent Float    @default(0.0)

  // Dependencies
  dependsOnPhases String[] // Phase IDs this depends on

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([migrationSessionId])
  @@index([phaseId])
  @@unique([migrationSessionId, phaseId])
}

model Milestone {
  id              String   @id @default(cuid())
  timelineId      String?

  // Milestone Information
  name            String
  description     String?

  // Timing
  plannedDate     DateTime
  actualDate      DateTime?

  // Status
  completed       Boolean  @default(false)

  // Metadata
  createdAt       DateTime @default(now())

  @@index([timelineId])
  @@index([plannedDate])
}

model ScheduledReport {
  id              String   @id @default(cuid())

  // Report Configuration
  name            String
  reportType      String   // 'EXECUTIVE' | 'DETAILED' | 'AUDIT_TRAIL'
  format          String   // 'PDF' | 'EXCEL' | 'CSV'

  // Schedule
  frequency       String   // 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  dayOfWeek       Int?     // 0=Sunday, 6=Saturday (for weekly)
  dayOfMonth      Int?     // 1-31 (for monthly)
  time            String   // "09:00" (HH:mm)

  // Recipients
  recipients      String[] // Email addresses

  // Execution
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  enabled         Boolean  @default(true)

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String

  @@index([enabled])
  @@index([nextRunAt])
}
```

### API Specification

```typescript
// === METRICS ENDPOINTS ===

// Get overall migration metrics
GET /api/v1/migration/dashboard/metrics
Response: {
  overallProgress: 72.5,
  totalRecords: 50000,
  importedRecords: 36250,
  failedRecords: 150,
  estimatedCompletion: "2025-11-03T14:30:00Z",
  qualityScore: 87.3,
  qualityTrend: "up",
  completeness: 92,
  validity: 95,
  consistency: 88,
  accuracy: 85,
  importRate: 150.5,  // records/minute
  cutoverReady: false,
  blockers: 3
}

// Get metrics for specific entity type
GET /api/v1/migration/dashboard/metrics/:entityType
Response: MigrationMetrics (same as above, entity-specific)

// Get quality trend over time
GET /api/v1/migration/dashboard/quality-trend?timeRange=7d
Response: {
  timestamps: ["2025-10-27T00:00:00Z", ...],
  completeness: [90, 90.5, 91, ...],
  validity: [94, 94.2, 95, ...],
  consistency: [85, 86, 87, ...],
  accuracy: [82, 83, 84, ...]
}

// Get progress trend over time
GET /api/v1/migration/dashboard/progress-trend?timeRange=7d
Response: {
  timestamps: [...],
  progressPercent: [45, 50, 55, 60, ...],
  importedRecords: [22500, 25000, 27500, 30000, ...],
  importRate: [100, 110, 120, 125, ...]
}

// === CUTOVER READINESS ENDPOINTS ===

// Get cutover readiness assessment
GET /api/v1/migration/cutover/readiness
Response: {
  ready: false,
  score: 65,
  recommendation: "NO_GO",
  riskLevel: "HIGH",
  blockers: [
    {
      id: "DQ001",
      category: "DATA_QUALITY",
      requirement: "All Tier 1 entities imported successfully",
      issue: "WorkOrder entity not yet imported"
    }
  ],
  warnings: [...]
}

// Get cutover checklist
GET /api/v1/migration/cutover/checklist
Response: {
  dataQuality: [
    {
      id: "DQ001",
      requirement: "All Tier 1 entities imported successfully",
      status: "PASS",
      completedAt: "2025-11-01T10:00:00Z",
      completedBy: "user123"
    },
    {
      id: "DQ002",
      requirement: "Overall data quality score >= 85%",
      status: "PASS",
      completedAt: "2025-11-01T11:00:00Z"
    },
    {
      id: "DQ003",
      requirement: "No critical validation errors",
      status: "FAIL",
      notes: "3 critical errors in Part entity"
    }
  ],
  systemReadiness: [...],
  userReadiness: [...],
  testing: [...]
}

// Complete checklist item
POST /api/v1/migration/cutover/checklist/:itemId/complete
Request: {
  notes?: "Item completed successfully"
}
Response: { success: true }

// Get go/no-go recommendation
GET /api/v1/migration/cutover/recommendation
Response: {
  recommendation: "NO_GO",
  riskLevel: "HIGH",
  reasoning: "3 blockers must be resolved before cutover",
  blockers: [...],
  mitigations: [...]
}

// Approve cutover
POST /api/v1/migration/cutover/approve
Request: {
  decision: "APPROVED" | "CONDITIONAL" | "REJECTED",
  comments?: "Approved for go-live as planned",
  conditions?: ["Resolve DQ003 before cutover", ...]
}
Response: {
  id: "approval123",
  decision: "APPROVED",
  approvedBy: "john.doe",
  approvedAt: "2025-11-01T14:00:00Z"
}

// === ROLLBACK ENDPOINTS ===

// Create snapshot
POST /api/v1/migration/rollback/snapshots
Request: {
  name: "Pre-Migration Snapshot",
  description: "Snapshot before Tier 2 import",
  entityTypes?: ["Part", "BOM"]  // null = all entities
}
Response: {
  id: "snapshot123",
  name: "Pre-Migration Snapshot",
  status: "CREATING",
  estimatedTime: "5 minutes"
}

// List snapshots
GET /api/v1/migration/rollback/snapshots
Response: [
  {
    id: "snapshot123",
    name: "Pre-Migration Snapshot",
    entityTypes: ["Part", "BOM", "WorkOrder"],
    recordCounts: { "Part": 10000, "BOM": 5000, "WorkOrder": 1000 },
    sizeBytes: 1048576,
    createdAt: "2025-11-01T10:00:00Z",
    createdBy: "user123"
  }
]

// Execute rollback
POST /api/v1/migration/rollback/execute
Request: {
  snapshotId: "snapshot123",
  entityTypes?: ["Part", "BOM"],  // null = all entities in snapshot
  verifyAfter: true,
  createBackup: true
}
Response: {
  id: "rollback456",
  status: "IN_PROGRESS",
  estimatedTime: "10 minutes"
}

// Verify rollback
GET /api/v1/migration/rollback/verify/:snapshotId
Response: {
  verified: true,
  recordsVerified: 15000,
  integrityIssues: 0,
  completionTime: "2025-11-01T14:30:00Z"
}

// === ALERT ENDPOINTS ===

// Get active alerts
GET /api/v1/migration/alerts?severity=CRITICAL&unresolved=true
Response: [
  {
    id: "alert001",
    alertType: "ERROR",
    severity: "CRITICAL",
    title: "Part import failed",
    message: "3 critical validation errors in Part data",
    entityType: "Part",
    createdAt: "2025-11-01T12:00:00Z",
    assignedTo: "user456"
  }
]

// Resolve alert
POST /api/v1/migration/alerts/:id/resolve
Request: {
  resolution: "Fixed data quality issue in source system",
  notes?: "Revalidated data and re-imported successfully"
}
Response: { success: true, resolvedAt: "2025-11-01T13:00:00Z" }

// Assign alert
POST /api/v1/migration/alerts/:id/assign
Request: { assignedTo: "user456" }
Response: { success: true }

// === TIMELINE ENDPOINTS ===

// Get timeline/Gantt chart data
GET /api/v1/migration/timeline
Response: {
  phases: [
    {
      id: "phase1",
      name: "Data Extraction",
      plannedStart: "2025-10-25",
      plannedEnd: "2025-10-28",
      actualStart: "2025-10-25",
      actualEnd: "2025-10-28",
      progressPercent: 100,
      status: "COMPLETED"
    },
    {
      id: "phase2",
      name: "Tier 1 Import",
      plannedStart: "2025-10-28",
      plannedEnd: "2025-10-31",
      actualStart: "2025-10-28",
      actualEnd: null,
      progressPercent: 95,
      status: "IN_PROGRESS"
    }
  ],
  milestones: [
    {
      id: "milestone1",
      name: "UAT Complete",
      plannedDate: "2025-11-01",
      actualDate: "2025-11-01",
      completed: true
    }
  ]
}

// === REPORTING ENDPOINTS ===

// Generate executive summary (PDF)
GET /api/v1/migration/reports/executive-summary
Response: PDF file

// Generate detailed report (Excel)
GET /api/v1/migration/reports/detailed
Response: Excel file

// Generate audit trail (CSV)
GET /api/v1/migration/reports/audit-trail
Response: CSV file

// List scheduled reports
GET /api/v1/migration/reports/scheduled
Response: [
  {
    id: "report123",
    name: "Daily Status Report",
    frequency: "DAILY",
    format: "PDF",
    recipients: ["manager@company.com"],
    lastRunAt: "2025-11-01T09:00:00Z",
    nextRunAt: "2025-11-02T09:00:00Z"
  }
]

// Create scheduled report
POST /api/v1/migration/reports/scheduled
Request: {
  name: "Daily Status Report",
  reportType: "EXECUTIVE",
  format: "PDF",
  frequency: "DAILY",
  time: "09:00",
  recipients: ["manager@company.com"]
}
Response: { id: "report123", success: true }
```

### Real-Time Updates (WebSocket)

```typescript
// Frontend subscribes to real-time updates
const socket = io('/migration-updates')

// Progress updates
socket.on('progress-update', (data: ProgressUpdate) => {
  // { entityType, progress, importedRecords, totalRecords, importRate }
  updateEntityProgress(data)
})

// Quality score updates
socket.on('quality-update', (data: QualityUpdate) => {
  // { entityType, completeness, validity, consistency, accuracy }
  updateQualityMetrics(data)
})

// New alerts
socket.on('alert', (alert: MigrationAlert) => {
  showAlertNotification(alert)
  addAlertToList(alert)
})

// Snapshot status
socket.on('snapshot-status', (status: SnapshotStatus) => {
  updateSnapshotProgress(status)
})

// Rollback status
socket.on('rollback-status', (status: RollbackStatus) => {
  updateRollbackProgress(status)
})

// Metric aggregation
socket.on('metrics-update', (metrics: DashboardMetrics) => {
  updateOverallDashboard(metrics)
})

// Backend emits updates
io.to('migration-updates').emit('progress-update', {
  entityType: 'Part',
  progress: 75,
  importedRecords: 7500,
  totalRecords: 10000,
  importRate: 150.5
})
```

---

## Cutover Readiness Algorithm

### Assessment Logic

```typescript
interface CutoverReadiness {
  ready: boolean
  score: number  // 0-100
  recommendation: 'GO' | 'NO_GO' | 'GO_WITH_CAUTION'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

function assessReadiness(): CutoverReadiness {
  // Step 1: Get checklist status
  const checklist = getChecklistStatus()
  const failedItems = checklist.filter(item => item.status === 'FAIL' && item.required)

  // Step 2: Evaluate data quality
  const qualityScore = getOverallQualityScore()
  const qualityAcceptable = qualityScore >= 85

  // Step 3: Check for blockers
  const blockers = [
    ...failedItems.map(item => ({
      type: 'CHECKLIST',
      severity: 'CRITICAL',
      message: item.requirement
    })),
    ...identifyDataQualityBlockers(),
    ...identifySystemBlockers()
  ]

  // Step 4: Assess risk
  const riskLevel = calculateRiskLevel(blockers, qualityScore)

  // Step 5: Generate recommendation
  let recommendation = 'NO_GO'
  if (blockers.filter(b => b.severity === 'CRITICAL').length === 0) {
    if (qualityAcceptable) {
      recommendation = 'GO'
    } else if (qualityScore >= 75) {
      recommendation = 'GO_WITH_CAUTION'
    }
  }

  // Step 6: Calculate score (0-100)
  const score = calculateReadinessScore(
    checklist,
    qualityScore,
    blockers,
    riskLevel
  )

  return {
    ready: recommendation === 'GO',
    score,
    recommendation,
    riskLevel
  }
}

function calculateRiskLevel(
  blockers: Blocker[],
  qualityScore: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const criticalBlockers = blockers.filter(b => b.severity === 'CRITICAL').length
  const highBlockers = blockers.filter(b => b.severity === 'HIGH').length

  if (criticalBlockers > 0) return 'CRITICAL'
  if (highBlockers >= 3 || qualityScore < 70) return 'HIGH'
  if (highBlockers >= 1 || qualityScore < 80) return 'MEDIUM'
  if (qualityScore < 90) return 'LOW'
  return 'LOW'
}
```

### Standard Cutover Checklist

```typescript
const CUTOVER_CHECKLIST: ChecklistItem[] = [
  // Data Quality (Required)
  {
    id: 'DQ001',
    category: 'DATA_QUALITY',
    requirement: 'All Tier 1 entities (master data) imported successfully',
    required: true
  },
  {
    id: 'DQ002',
    category: 'DATA_QUALITY',
    requirement: 'Overall data quality score >= 85%',
    required: true
  },
  {
    id: 'DQ003',
    category: 'DATA_QUALITY',
    requirement: 'No critical validation errors remain',
    required: true
  },
  {
    id: 'DQ004',
    category: 'DATA_QUALITY',
    requirement: 'All foreign key references valid',
    required: true
  },
  {
    id: 'DQ005',
    category: 'DATA_QUALITY',
    requirement: 'No data loss in transformations',
    required: true
  },

  // System Readiness (Required)
  {
    id: 'SR001',
    category: 'SYSTEM_READINESS',
    requirement: 'Database performance acceptable (queries < 1s)',
    required: true
  },
  {
    id: 'SR002',
    category: 'SYSTEM_READINESS',
    requirement: 'All integrations tested and functional',
    required: true
  },
  {
    id: 'SR003',
    category: 'SYSTEM_READINESS',
    requirement: 'Backup and restore procedures validated',
    required: true
  },
  {
    id: 'SR004',
    category: 'SYSTEM_READINESS',
    requirement: 'Monitoring and alerting in place',
    required: true
  },

  // User Readiness (Required)
  {
    id: 'UR001',
    category: 'USER_READINESS',
    requirement: 'User training completed for all roles',
    required: true
  },
  {
    id: 'UR002',
    category: 'USER_READINESS',
    requirement: 'Go-live support plan in place',
    required: true
  },
  {
    id: 'UR003',
    category: 'USER_READINESS',
    requirement: 'Runbooks and documentation finalized',
    required: true
  },

  // Testing (Required)
  {
    id: 'TEST001',
    category: 'TESTING',
    requirement: 'End-to-end business process testing completed',
    required: true
  },
  {
    id: 'TEST002',
    category: 'TESTING',
    requirement: 'User acceptance testing (UAT) passed',
    required: true
  },
  {
    id: 'TEST003',
    category: 'TESTING',
    requirement: 'Regression testing for existing functionality',
    required: true
  },

  // Post-Cutover (Recommended)
  {
    id: 'POST001',
    category: 'TESTING',
    requirement: 'Performance baseline testing completed',
    required: false
  },
  {
    id: 'POST002',
    category: 'TESTING',
    requirement: 'Load testing with production-like volumes',
    required: false
  }
]
```

---

## Implementation Phases

### Phase 1: Metrics Infrastructure (Week 1)
**Deliverables:**
- MigrationMetrics model and migrations
- MetricsService with collection methods
- Integration with import process
- Basic metrics aggregation
- Unit test coverage

**Files to Create:**
- `src/services/migration/MetricsService.ts`
- `src/__tests__/services/MetricsService.test.ts`
- Prisma migration for MigrationMetrics

**Acceptance Criteria:**
- Metrics recorded for each entity import
- Aggregation calculates overall progress correctly
- Quality dimensions calculated accurately
- Performance <100ms for typical queries

---

### Phase 2: Progress Dashboard UI (Week 1-2)
**Deliverables:**
- ProgressDashboard main component
- OverallProgressCard with gauges
- EntityProgressTable with live data
- QualityMetricsPanel with charts
- Real-time WebSocket updates

**Files to Create:**
- `frontend/src/pages/Migration/ProgressDashboard.tsx`
- `frontend/src/components/Migration/OverallProgressCard.tsx`
- `frontend/src/components/Migration/EntityProgressTable.tsx`
- `frontend/src/components/Migration/QualityMetricsPanel.tsx`

**Acceptance Criteria:**
- Dashboard loads in <2 seconds
- Real-time updates appear within 1 second
- Responsive design on all screen sizes
- All metrics display accurately

---

### Phase 3: Cutover Readiness (Week 2-3)
**Deliverables:**
- CutoverReadinessService
- Checklist model and migrations
- CutoverReadiness UI component
- Approval workflow

**Files to Create:**
- `src/services/migration/CutoverReadinessService.ts`
- `frontend/src/components/Migration/CutoverReadiness.tsx`
- `frontend/src/components/Migration/ChecklistItem.tsx`

**Acceptance Criteria:**
- Checklist items tracked and completed
- Readiness score calculated correctly
- Go/no-go recommendation accurate
- Approval workflow functional

---

### Phase 4: Rollback System (Week 3-4)
**Deliverables:**
- RollbackService with snapshot and recovery
- RollbackSnapshot and Rollback models
- Snapshot creation and storage
- Rollback execution and verification
- Rollback UI

**Files to Create:**
- `src/services/migration/RollbackService.ts`
- `frontend/src/components/Migration/RollbackManager.tsx`
- `frontend/src/components/Migration/SnapshotList.tsx`

**Acceptance Criteria:**
- Snapshots created and stored successfully
- Rollback restores data correctly
- Verification confirms integrity
- Partial rollback works

---

### Phase 5: Timeline & Visualization (Week 4)
**Deliverables:**
- TimelineService for phase management
- Gantt chart visualization
- Milestone tracking
- Critical path analysis

**Files to Create:**
- `src/services/migration/TimelineService.ts`
- `frontend/src/components/Migration/GanttChart.tsx`
- `frontend/src/components/Migration/MilestoneTimeline.tsx`

**Acceptance Criteria:**
- Gantt chart displays phases correctly
- Milestones tracked and visualized
- Critical path highlighted
- Delays identified

---

### Phase 6: Issue Tracking (Week 4-5)
**Deliverables:**
- AlertingService with alert lifecycle
- MigrationAlert model
- Alert UI with filters and assignment
- SLA tracking

**Files to Create:**
- `src/services/migration/AlertingService.ts`
- `frontend/src/components/Migration/AlertsPanel.tsx`
- `frontend/src/components/Migration/AlertDetail.tsx`

**Acceptance Criteria:**
- Alerts created and resolved correctly
- Assignment workflow functional
- SLA tracking accurate
- Trend analysis works

---

### Phase 7: Reporting (Week 5)
**Deliverables:**
- ReportingService for PDF/Excel/CSV generation
- Executive summary report
- Detailed report with drill-down
- Audit trail export
- Scheduled reports

**Files to Create:**
- `src/services/migration/ReportingService.ts`
- `frontend/src/components/Migration/ReportGenerator.tsx`

**Acceptance Criteria:**
- PDF generation works
- Excel export includes all data
- CSV audit trail complete
- Scheduled reports run on time

---

### Phase 8: Notifications & Integrations (Week 5-6)
**Deliverables:**
- Email notifications
- Slack integration
- Teams integration
- Threshold-based alerts
- Escalation rules

**Files to Create:**
- `src/services/notifications/NotificationService.ts`
- `src/integrations/SlackService.ts`
- `src/integrations/TeamsService.ts`

**Acceptance Criteria:**
- Email notifications sent correctly
- Slack messages formatted well
- Teams webhooks functional
- Escalation works as configured

---

### Phase 9: Integration & Polish (Week 6)
**Deliverables:**
- Integration with all migration components
- Complete test coverage
- Performance optimization
- Documentation and runbooks
- User acceptance testing

**Acceptance Criteria:**
- All components working together
- >90% test coverage
- Real-time updates stable
- Performance meets targets
- Documentation complete

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Recharts** for data visualization
- **React Gantt Chart** for timeline
- **Socket.io-client** for real-time updates
- **Tailwind CSS** for styling
- **React Query** for API data
- **Headless UI** for components

### Backend
- **Node.js/Express** (existing)
- **Socket.io** for WebSocket
- **PDFKit** or **pdfmake** for PDF generation
- **ExcelJS** for Excel reports
- **Prisma ORM** for database

### Database
- **PostgreSQL** with new models (MigrationMetrics, CutoverChecklist, RollbackSnapshot, Rollback, MigrationAlert, MigrationTimeline, Milestone, ScheduledReport)

### Testing
- **Jest** for unit tests
- **React Testing Library** for components
- **Supertest** for API tests
- **Cypress** for E2E tests

---

## Success Metrics

### User Experience
- [ ] Dashboard load time <2 seconds
- [ ] Real-time updates appear within 1 second
- [ ] >90% user satisfaction with dashboard clarity
- [ ] Cutover approval process completes in <30 minutes

### Functionality
- [ ] All metrics calculated accurately
- [ ] Alerts generated correctly
- [ ] Rollback restores data completely
- [ ] Reports generated without errors

### Quality
- [ ] >90% test coverage
- [ ] All checklist items validated
- [ ] Zero data loss in rollbacks
- [ ] All integrations functional

### Performance
- [ ] Dashboard queries <500ms
- [ ] Real-time WebSocket updates stable
- [ ] Report generation <5 minutes
- [ ] Handles 100+ concurrent dashboard users

---

## Risk Mitigation

### Risk 1: Real-Time Updates Causing Performance Issues
- **Mitigation:** Use Redis for scaling, throttle updates, optimize queries
- **Fallback:** Implement polling with longer intervals

### Risk 2: Rollback Failures
- **Mitigation:** Comprehensive testing, data validation, backup verification
- **Fallback:** Manual restore procedures, detailed rollback logs

### Risk 3: Complex Cutover Checklist
- **Mitigation:** Start with simple checklist, allow customization
- **Fallback:** Manual approval process

### Risk 4: Integration Issues with Existing Components
- **Mitigation:** Early integration testing, clear API contracts
- **Fallback:** Fallback to standalone metrics without full integration

---

## Dependencies & Integration

### Integration Points
- **Issue #32** - Bulk Import (metrics collection)
- **Issue #33** - Validation Framework (quality scoring)
- **Issue #37** - Migration Wizard (session context)
- **Issue #38** - Data Mapping Assistant (mapping context)

### External Services
- **Email Service** (Gmail, SendGrid, etc.)
- **Slack API** for notifications
- **Teams API** for notifications
- **S3 or local storage** for snapshots

---

## Acceptance Criteria - Complete Checklist

### Progress Dashboard
- [ ] Overall progress displayed accurately
- [ ] Progress by entity updates in real-time
- [ ] Quality scores calculated correctly
- [ ] Dashboard responsive and fast

### Cutover Readiness
- [ ] Checklist items tracked and completed
- [ ] Readiness score calculated correctly
- [ ] Go/no-go recommendation accurate
- [ ] Approval workflow functional

### Rollback
- [ ] Snapshots created successfully
- [ ] Rollback executes correctly
- [ ] Data restored to pre-migration state
- [ ] Partial rollback works

### Timeline
- [ ] Gantt chart displays phases correctly
- [ ] Milestones tracked and visualized
- [ ] Critical path highlighted
- [ ] Delays identified

### Alerts
- [ ] Alerts generated correctly
- [ ] Threshold-based alerts work
- [ ] Email/Slack/Teams notifications sent
- [ ] Alert resolution tracked

### Reports
- [ ] Executive summary PDF generated
- [ ] Detailed Excel report complete
- [ ] Audit trail CSV includes all events
- [ ] Scheduled reports sent on time

### Performance
- [ ] Dashboard <2s load time
- [ ] Real-time updates <1s latency
- [ ] Dashboard handles 100+ entities
- [ ] Metrics queries <500ms

### Integration
- [ ] Works with Migration Wizard
- [ ] Works with Bulk Import
- [ ] Works with Validation Framework
- [ ] Works with Data Mapping Assistant

---

## Conclusion

Issue #39 (Progress Dashboard & Cutover Management) provides critical visibility and control over the data migration process. With real-time metrics, cutover readiness assessment, rollback capabilities, and comprehensive reporting, the dashboard transforms migration execution from manual spreadsheets to a data-driven, automated process.

The phased 6-week implementation allows for incremental delivery and refinement, with the core dashboard available in week 2 and full cutover/rollback capabilities by week 4. This dashboard becomes the command center for data migrations, enabling confident go-live decisions and rapid recovery if needed.

This system will significantly reduce cutover risk, improve stakeholder confidence, and provide the operational visibility necessary for successful enterprise data migrations.
