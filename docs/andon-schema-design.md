# Andon Infrastructure Database Schema Design

## Core Models Design

### 1. AndonAlert
The primary model for individual Andon alerts/issues raised from the shop floor.

```prisma
model AndonAlert {
  id                    String              @id @default(cuid())
  alertNumber           String              @unique // Auto-generated sequential alert number
  title                 String              // Brief alert title
  description           String?             // Detailed description

  // Classification
  issueTypeId           String
  issueType             AndonIssueType      @relation(fields: [issueTypeId], references: [id])
  severity              AndonSeverity       // CRITICAL, HIGH, MEDIUM, LOW
  priority              AndonPriority       // URGENT, HIGH, NORMAL, LOW

  // Location context
  siteId                String?
  site                  Site?               @relation(fields: [siteId], references: [id])
  areaId                String?
  area                  Area?               @relation(fields: [areaId], references: [id])
  workCenterId          String?
  workCenter            WorkCenter?         @relation(fields: [workCenterId], references: [id])
  equipmentId           String?
  equipment             Equipment?          @relation(fields: [equipmentId], references: [id])

  // Work Order context (if applicable)
  workOrderId           String?
  workOrder             WorkOrder?          @relation(fields: [workOrderId], references: [id])
  operationId           String?
  operation             Operation?          @relation(fields: [operationId], references: [id])

  // Personnel
  raisedById            String              // User who raised the alert
  raisedBy              User                @relation("AndonAlertsRaised", fields: [raisedById], references: [id])
  assignedToId          String?             // Current assignee
  assignedTo            User?               @relation("AndonAlertsAssigned", fields: [assignedToId], references: [id])

  // Status tracking
  status                AndonAlertStatus    // OPEN, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED
  statusHistory         Json[]              // Array of status changes with timestamps

  // Escalation tracking
  currentEscalationLevel Int                @default(0)
  nextEscalationAt      DateTime?           // When next escalation should occur
  escalationHistory     Json[]              // Array of escalation events

  // Resolution
  resolvedAt            DateTime?
  resolvedById          String?
  resolvedBy            User?               @relation("AndonAlertsResolved", fields: [resolvedById], references: [id])
  resolutionNotes       String?
  resolutionActionTaken String?

  // Timing
  responseTime          Int?                // Minutes from raised to first response
  resolutionTime        Int?                // Minutes from raised to resolution

  // Metadata and attachments
  metadata              Json?               // Flexible data storage
  attachments           Json[]              // File references, photos, etc.

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  escalationRuleResults AndonEscalationRuleResult[]

  @@index([alertNumber])
  @@index([status])
  @@index([severity])
  @@index([priority])
  @@index([issueTypeId])
  @@index([raisedById])
  @@index([assignedToId])
  @@index([siteId])
  @@index([createdAt])
  @@index([nextEscalationAt])
  @@map("andon_alerts")
}
```

### 2. AndonIssueType
Configurable issue categories and severity definitions.

```prisma
model AndonIssueType {
  id                    String              @id @default(cuid())
  typeCode              String              @unique // QUALITY, SAFETY, EQUIPMENT, MATERIAL, etc.
  typeName              String              // Display name
  description           String?             // Detailed description

  // Configuration
  defaultSeverity       AndonSeverity       @default(MEDIUM)
  defaultPriority       AndonPriority       @default(NORMAL)
  requiresAttachment    Boolean             @default(false)
  requiresWorkOrder     Boolean             @default(false)
  requiresEquipment     Boolean             @default(false)

  // Auto-assignment rules
  autoAssignRole        String?             // Auto-assign to users with this role
  autoAssignUserId      String?             // Auto-assign to specific user
  autoAssignUser        User?               @relation(fields: [autoAssignUserId], references: [id])

  // Escalation behavior
  enableEscalation      Boolean             @default(true)
  escalationTimeoutMins Int?                @default(30) // Minutes before first escalation

  // Site-specific configuration
  siteId                String?             // null = global, specific site ID = site-specific
  site                  Site?               @relation(fields: [siteId], references: [id])

  // Visual configuration
  iconName              String?             // Icon for UI display
  colorCode             String?             // Color code for visual distinction

  // Status
  isActive              Boolean             @default(true)
  displayOrder          Int?                // Sort order in UI

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  createdBy             String
  updatedBy             String?

  // Relations
  alerts                AndonAlert[]
  escalationRules       AndonEscalationRule[]

  @@index([typeCode])
  @@index([siteId])
  @@index([isActive])
  @@index([displayOrder])
  @@map("andon_issue_types")
}
```

### 3. AndonEscalationRule
Configurable escalation rules and logic.

```prisma
model AndonEscalationRule {
  id                    String              @id @default(cuid())
  ruleName              String              // Display name for the rule
  description           String?             // Rule description

  // Rule scope
  siteId                String?             // null = global, specific site ID = site-specific
  site                  Site?               @relation(fields: [siteId], references: [id])
  issueTypeId           String?             // null = all types, specific ID = type-specific
  issueType             AndonIssueType?     @relation(fields: [issueTypeId], references: [id])

  // Trigger conditions
  triggerSeverity       AndonSeverity[]     // Which severities trigger this rule
  triggerAfterMinutes   Int                 // Minutes after alert creation to trigger
  escalationLevel       Int                 // Which escalation level this rule applies to (0, 1, 2, etc.)

  // Escalation actions
  notifyUserIds         String[]            // User IDs to notify
  notifyRoles           String[]            // Role names to notify
  notifyChannels        String[]            // EMAIL, SMS, PUSH, etc.
  assignToUserId        String?             // Reassign alert to this user
  assignToUser          User?               @relation(fields: [assignToUserId], references: [id])
  assignToRole          String?             // Reassign to user with this role

  // Advanced conditions (JSON for flexibility)
  conditions            Json?               // Complex rule conditions

  // Rule execution tracking
  isActive              Boolean             @default(true)
  executionCount        Int                 @default(0)
  lastExecutedAt        DateTime?

  // Rule priority (for conflict resolution)
  priority              Int                 @default(100)

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  createdBy             String
  updatedBy             String?

  // Relations
  results               AndonEscalationRuleResult[]

  @@index([siteId])
  @@index([issueTypeId])
  @@index([escalationLevel])
  @@index([isActive])
  @@index([priority])
  @@map("andon_escalation_rules")
}
```

### 4. AndonEscalationRuleResult
Tracks execution of escalation rules for audit and debugging.

```prisma
model AndonEscalationRuleResult {
  id                    String              @id @default(cuid())
  alertId               String
  alert                 AndonAlert          @relation(fields: [alertId], references: [id], onDelete: Cascade)
  ruleId                String
  rule                  AndonEscalationRule @relation(fields: [ruleId], references: [id])

  // Execution details
  executedAt            DateTime            @default(now())
  escalationLevel       Int
  success               Boolean             @default(true)
  errorMessage          String?

  // Actions taken
  actionsTaken          Json                // Details of notifications sent, assignments made, etc.
  notifiedUsers         String[]            // User IDs that were notified

  @@index([alertId])
  @@index([ruleId])
  @@index([executedAt])
  @@map("andon_escalation_rule_results")
}
```

## Enums

```prisma
enum AndonSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum AndonPriority {
  URGENT
  HIGH
  NORMAL
  LOW
}

enum AndonAlertStatus {
  OPEN
  ACKNOWLEDGED
  IN_PROGRESS
  ESCALATED
  RESOLVED
  CLOSED
  CANCELLED
}
```

## Configuration Models

### 5. AndonConfiguration
Global-level configuration settings for the Andon system.

```prisma
model AndonConfiguration {
  id                    String              @id @default(cuid())
  configKey             String              @unique // Unique configuration key
  configValue           Json                // Configuration value (flexible JSON)
  description           String?             // Description of the configuration
  dataType              String              // STRING, NUMBER, BOOLEAN, JSON, ARRAY
  category              String              // GENERAL, ESCALATION, NOTIFICATION, UI, etc.

  // Validation
  isRequired            Boolean             @default(false)
  validationRules       Json?               // Validation constraints
  defaultValue          Json?               // Default value for the configuration

  // Security and access
  isEncrypted           Boolean             @default(false)
  accessLevel           String              @default("ADMIN") // ADMIN, MANAGER, SUPERVISOR

  // Status
  isActive              Boolean             @default(true)

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  lastModifiedBy        String
  lastModifiedByUser    User                @relation(fields: [lastModifiedBy], references: [id])

  @@index([configKey])
  @@index([category])
  @@index([isActive])
  @@map("andon_configurations")
}
```

### 6. AndonSiteConfiguration
Site-specific configuration overrides and settings.

```prisma
model AndonSiteConfiguration {
  id                    String              @id @default(cuid())
  siteId                String
  site                  Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)
  configKey             String              // References AndonConfiguration.configKey
  configValue           Json                // Site-specific override value

  // Override behavior
  isOverride            Boolean             @default(true) // Whether this overrides global config
  inheritFromGlobal     Boolean             @default(false) // Whether to inherit when not explicitly set

  // Status
  isActive              Boolean             @default(true)

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  lastModifiedBy        String
  lastModifiedByUser    User                @relation(fields: [lastModifiedBy], references: [id])

  @@unique([siteId, configKey]) // Ensures one override per site per config key
  @@index([siteId])
  @@index([configKey])
  @@index([isActive])
  @@map("andon_site_configurations")
}
```

### 7. AndonNotificationTemplate
Configurable notification templates for different scenarios.

```prisma
model AndonNotificationTemplate {
  id                    String              @id @default(cuid())
  templateKey           String              @unique // ALERT_CREATED, ESCALATED, RESOLVED, etc.
  templateName          String              // Display name
  description           String?             // Template description

  // Template content
  subject               String              // Email subject or notification title
  bodyTemplate          String              // Template body with placeholders
  variables             Json                // Available template variables

  // Channel-specific templates
  emailTemplate         String?             // HTML email template
  smsTemplate           String?             // SMS message template
  pushTemplate          String?             // Push notification template

  // Site-specific template
  siteId                String?             // null = global, specific site ID = site-specific
  site                  Site?               @relation(fields: [siteId], references: [id])

  // Template settings
  isActive              Boolean             @default(true)
  priority              Int                 @default(100) // Priority for template selection

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  createdBy             String
  updatedBy             String?

  @@index([templateKey])
  @@index([siteId])
  @@index([isActive])
  @@map("andon_notification_templates")
}
```

### 8. AndonSystemSettings
System-wide Andon settings and feature toggles.

```prisma
model AndonSystemSettings {
  id                    String              @id @default(cuid())
  siteId                String?             // null = global, specific site ID = site-specific
  site                  Site?               @relation(fields: [siteId], references: [id])

  // Core feature toggles
  andonEnabled          Boolean             @default(true)
  escalationEnabled     Boolean             @default(true)
  notificationsEnabled  Boolean             @default(true)

  // Default behaviors
  defaultSeverity       AndonSeverity       @default(MEDIUM)
  defaultPriority       AndonPriority       @default(NORMAL)
  autoAssignEnabled     Boolean             @default(false)

  // Timing settings
  defaultResponseTimeMin Int?               @default(15) // Default response time target in minutes
  maxEscalationLevels   Int                 @default(3)
  baseEscalationDelayMin Int                @default(30) // Base escalation delay in minutes

  // UI/UX settings
  enableMobileAccess    Boolean             @default(true)
  enableKioskMode       Boolean             @default(true)
  requireComments       Boolean             @default(false)
  allowAnonymousReports Boolean             @default(false)

  // Integration settings
  integrationSettings   Json?               // Settings for external integrations

  // Audit trail
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  lastModifiedBy        String
  lastModifiedByUser    User                @relation(fields: [lastModifiedBy], references: [id])

  @@unique([siteId]) // One settings record per site (null for global)
  @@index([siteId])
  @@map("andon_system_settings")
}
```

## Configuration Categories and Default Settings

### Standard Configuration Keys

1. **General Settings**
   - `andon.system.enabled`: Enable/disable Andon system
   - `andon.system.name`: Display name for the Andon system
   - `andon.system.description`: System description

2. **Escalation Settings**
   - `andon.escalation.enabled`: Enable escalation
   - `andon.escalation.default_delay_minutes`: Default escalation delay
   - `andon.escalation.max_levels`: Maximum escalation levels
   - `andon.escalation.weekend_behavior`: How to handle escalations on weekends

3. **Notification Settings**
   - `andon.notifications.email.enabled`: Enable email notifications
   - `andon.notifications.sms.enabled`: Enable SMS notifications
   - `andon.notifications.push.enabled`: Enable push notifications
   - `andon.notifications.digest.enabled`: Enable notification digests

4. **UI/UX Settings**
   - `andon.ui.theme`: UI theme configuration
   - `andon.ui.kiosk_mode`: Kiosk mode settings
   - `andon.ui.mobile_enabled`: Mobile access settings
   - `andon.ui.auto_refresh_seconds`: Auto-refresh interval

5. **Integration Settings**
   - `andon.integration.external_andon.enabled`: External Andon system integration
   - `andon.integration.email.smtp_config`: SMTP configuration
   - `andon.integration.sms.provider_config`: SMS provider configuration

## Key Design Decisions

1. **Flexibility**: Used JSON fields for metadata, conditions, and action details to allow for future extensibility
2. **Hierarchy**: Support both global and site-specific configurations with override capabilities
3. **Audit Trail**: Complete tracking of escalations, status changes, and rule executions
4. **Performance**: Strategic indexing on commonly queried fields
5. **Relationships**: Proper foreign key relationships with existing models (User, Site, WorkOrder, etc.)
6. **Scalability**: Support for multiple escalation levels and complex rule conditions
7. **Configuration Management**: Hierarchical configuration system with global defaults and site-specific overrides
8. **Template System**: Flexible notification templating with support for multiple channels