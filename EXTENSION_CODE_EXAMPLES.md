# Extension Architecture - Code Examples

## 1. Plugin Manifest Examples

### Basic Plugin with Dependencies

```json
{
  "id": "quality-metrics-tracker",
  "name": "Quality Metrics Tracker",
  "version": "1.0.0",
  "description": "Tracks and reports quality metrics",
  "author": "Quality Team",
  "license": "MIT",
  "apiVersion": "1.0.0",
  "mesVersion": ">=3.0.0 <5.0.0",
  
  "dependencies": {
    "data-logger": "^1.0.0",
    "notification-system": "~1.2.0",
    "reporting-engine": "^2.0.0"
  },
  
  "permissions": [
    "quality:read",
    "quality:write",
    "reports:write",
    "notifications:send"
  ],
  
  "hooks": {
    "quality": ["validateMetrics", "generateReport"],
    "workflow": ["onWorkOrderComplete"],
    "notification": ["onQualityAlert"]
  },
  
  "database": {
    "migrationsDir": "./migrations",
    "requiresMigrations": true
  },
  
  "configuration": {
    "thresholds": {
      "type": "object",
      "required": true,
      "schema": {
        "defectRate": { "type": "number", "min": 0, "max": 100 },
        "criticalAlert": { "type": "boolean" }
      }
    },
    "reportFrequency": {
      "type": "string",
      "enum": ["daily", "weekly", "monthly"],
      "default": "daily"
    }
  }
}
```

### Complex Plugin with Nested Dependencies

```json
{
  "id": "advanced-analytics",
  "name": "Advanced Analytics Suite",
  "version": "2.1.0",
  "apiVersion": "2.0.0",
  
  "dependencies": {
    "base-analytics": "^1.5.0",
    "machine-learning": "^2.0.0 <3.0.0",
    "data-aggregator": "~1.8.5",
    "visualization-lib": "^3.0.0 || ^4.0.0"
  },
  
  "database": {
    "migrationsDir": "./migrations",
    "requiresMigrations": true
  }
}
```

## 2. Extension Database Schema Examples

### Simple Extension Table Definition

```typescript
// From ExtensionTable
{
  name: "quality_reports",
  namespace: "plugin_analytics_001",
  displayName: "Quality Reports",
  description: "Stores quality metric reports",
  
  fields: [
    {
      name: "reportId",
      type: "String",
      required: true,
      unique: true,
      description: "Unique report identifier"
    },
    {
      name: "timestamp",
      type: "DateTime",
      required: true,
      index: true
    },
    {
      name: "defectRate",
      type: "Float",
      required: true,
      validation: {
        min: 0,
        max: 100
      }
    },
    {
      name: "status",
      type: "String",
      required: true,
      validation: {
        enum: ["pending", "approved", "rejected"]
      }
    }
  ],
  
  indexes: [
    {
      name: "idx_timestamp",
      fields: ["timestamp"],
      type: "BTREE"
    },
    {
      name: "idx_status",
      fields: ["status"],
      type: "HASH"
    }
  ],
  
  timestamps: {
    createdAt: true,
    updatedAt: true
  }
}
```

### Complex Schema with Relationships

```typescript
{
  pluginId: "advanced-analytics",
  version: "2.1.0",
  
  tables: [
    {
      name: "analysis_sessions",
      namespace: "plugin_analytics_001",
      fields: [
        { name: "sessionId", type: "String", required: true, unique: true },
        { name: "startTime", type: "DateTime", required: true },
        { name: "endTime", type: "DateTime" },
        { name: "status", type: "String", required: true }
      ]
    },
    {
      name: "analysis_results",
      namespace: "plugin_analytics_001",
      fields: [
        { name: "resultId", type: "String", required: true, unique: true },
        { name: "sessionId", type: "String", required: true },
        { name: "metric", type: "String", required: true },
        { name: "value", type: "Decimal", required: true },
        { name: "confidence", type: "Float", validation: { min: 0, max: 1 } }
      ]
    }
  ],
  
  enums: [
    {
      name: "AnalysisStatus",
      values: ["PENDING", "RUNNING", "COMPLETE", "FAILED", "CANCELLED"]
    }
  ],
  
  relationships: [
    {
      source: "plugin_analytics_001.analysis_results",
      sourceField: "sessionId",
      target: "plugin_analytics_001.analysis_sessions",
      targetField: "sessionId",
      type: "ManyToOne",
      cascade: "delete"
    }
  ],
  
  metadata: {
    namespace: "plugin_analytics_001",
    description: "Advanced analytics data model",
    author: "Analytics Team",
    version: "2.1.0"
  }
}
```

## 3. Service Integration Examples

### Using ExtensionSchemaRegistry

```typescript
import { ExtensionSchemaRegistry } from '../services/ExtensionSchemaRegistry';
import { prisma } from '../lib/prisma';

const registry = new ExtensionSchemaRegistry(prisma);

// Register a new schema
const result = await registry.registerSchema('quality-metrics', {
  pluginId: 'quality-metrics',
  version: '1.0.0',
  tables: [
    {
      name: 'metrics',
      namespace: 'plugin_quality_001',
      fields: [
        { name: 'metric', type: 'String', required: true },
        { name: 'value', type: 'Float', required: true }
      ]
    }
  ],
  enums: [],
  relationships: [],
  metadata: {
    namespace: 'plugin_quality_001',
    description: 'Quality metrics'
  }
});

console.log(result);
// {
//   success: true,
//   pluginId: 'quality-metrics',
//   schemaId: '...',
//   version: '1.0.0',
//   status: 'validating',
//   registeredAt: Date
// }
```

### Using ExtensionMigrationEngine

```typescript
import { ExtensionMigrationEngine } from '../services/ExtensionMigrationEngine';

const engine = new ExtensionMigrationEngine(prisma);

// Generate migrations
const migrations = await engine.generateMigrations(
  'quality-metrics',
  currentSchema,
  previousSchema
);

// Execute migrations safely
const result = await engine.executeMigrations(
  'quality-metrics',
  migrations,
  currentSchema
);

console.log(result);
// {
//   success: true,
//   migrationId: 'quality-metrics-1699564800000',
//   pluginId: 'quality-metrics',
//   duration: 2450,
//   status: 'executed',
//   executedAt: Date
// }
```

### Using ExtensionDataSafety

```typescript
import { ExtensionDataSafety } from '../services/ExtensionDataSafety';

const safety = new ExtensionDataSafety(prisma);

// Validate entity data
const validation = safety.validateEntityData(tableDefinition, {
  metric: 'temperature',
  value: 98.6,
  timestamp: new Date()
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Output: [{ field: 'value', rule: 'min', message: 'Must be >= 0' }]
}

// Check constraints
const constraints = await safety.checkForeignKeyConstraints(
  'quality-metrics',
  relationships
);

// Validate relationships
const relValidation = safety.validateSchemaRelationships(schema);
```

### Using PluginValidationService

```typescript
import { PluginValidationService } from '../services/PluginValidationService';

const manifest = {
  id: 'quality-metrics',
  name: 'Quality Metrics',
  version: '1.0.0',
  apiVersion: '1.0.0',
  author: 'Quality Team',
  dependencies: {
    'data-logger': '^1.0.0',
    'notification-system': '~1.2.0'
  }
};

// Validate manifest
const { valid, errors } = PluginValidationService.validateManifest(manifest);

if (!valid) {
  console.error('Manifest validation errors:', errors);
  // Output: [
  //   'Invalid apiVersion format: invalid-version',
  //   'Invalid version format for dependency notification-system: invalid'
  // ]
}
```

## 4. Hook System Examples

### Registering a Hook

```typescript
import { PluginSystemService } from '../services/PluginSystemService';

const pluginService = new PluginSystemService();

// Register a hook handler
await pluginService.registerHook(
  'quality-metrics',
  'workOrder.afterComplete',
  async (context: HookContext) => {
    // Validate quality metrics
    if (context.data.qualityScore < 80) {
      await context.api.post('/api/v1/quality/alerts', {
        workOrderId: context.data.id,
        severity: 'WARNING',
        message: 'Quality score below threshold'
      });
    }
  }
);
```

### Hook Context Usage

```typescript
async function qualityValidationHook(context: HookContext) {
  try {
    // Access hook data
    const workOrder = context.data;
    const userId = context.user.id;
    
    // Check permissions
    if (!context.user.permissions.includes('quality:write')) {
      context.reject('Insufficient permissions for quality validation');
      return;
    }
    
    // Validate quality metrics
    const qualityCheck = await performQualityCheck(workOrder);
    
    if (!qualityCheck.passed) {
      context.addWarning(`Quality check failed: ${qualityCheck.reason}`);
    }
    
    // Make API calls
    const result = await context.api.post('/api/v1/quality/validate', {
      workOrderId: workOrder.id,
      metrics: qualityCheck.metrics
    });
    
    context.log('Quality validation completed', result);
    
  } catch (error) {
    context.abort();
    console.error('Quality validation hook failed:', error);
  }
}
```

## 5. Plugin Configuration Examples

### Configuration Schema

```json
{
  "id": "advanced-analytics",
  "configuration": {
    "defaultLanguage": {
      "type": "string",
      "enum": ["en", "es", "fr", "de", "zh"],
      "default": "en",
      "required": true
    },
    "analyticsLevel": {
      "type": "string",
      "enum": ["basic", "advanced", "enterprise"],
      "default": "basic"
    },
    "dataRetention": {
      "type": "object",
      "required": true,
      "properties": {
        "days": {
          "type": "number",
          "minimum": 30,
          "maximum": 3650
        },
        "archiveOldData": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "notifications": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "emailOnAlert": { "type": "boolean", "default": true },
        "slackWebhook": { "type": "string" }
      }
    }
  }
}
```

### Using Plugin Configuration

```typescript
// Get configuration
const analyticsLevel = await plugin.getConfig('analyticsLevel');

// Set configuration
await plugin.setConfig('analyticsLevel', 'advanced');

// Update multiple settings
await plugin.setConfig('notifications', {
  enabled: true,
  emailOnAlert: true,
  slackWebhook: 'https://hooks.slack.com/...'
});
```

## 6. Plugin Registry Examples

### Submitting a Plugin Package

```typescript
import { PluginRegistryService } from '../services/PluginRegistryService';
import crypto from 'crypto';

const manifest = {
  id: 'quality-metrics',
  name: 'Quality Metrics Tracker',
  version: '1.0.0',
  author: 'Quality Team',
  apiVersion: '1.0.0',
  dependencies: {
    'data-logger': '^1.0.0'
  }
};

// Calculate checksum
const packageContent = JSON.stringify(manifest);
const checksum = crypto.createHash('sha256').update(packageContent).digest('hex');

// Submit for approval
const result = await PluginRegistryService.submitPlugin(
  registryId,
  'quality-metrics',
  '1.0.0',
  manifest,
  'https://storage.example.com/packages/quality-metrics-1.0.0.zip',
  checksum,
  'Quality Team',
  userId
);

console.log(result);
// {
//   pluginId: 'quality-metrics',
//   version: '1.0.0',
//   status: 'PENDING_REVIEW',
//   uploadedBy: userId,
//   registry: { ... }
// }
```

### Approving and Installing a Plugin

```typescript
// Approve plugin
const approved = await PluginRegistryService.approvePlugin(
  packageId,
  adminUserId
);

// Install plugin
const installed = await PluginRegistryService.installPlugin(
  registryId,
  'quality-metrics',
  '1.0.0',
  'SITE',
  siteId,
  installingUserId
);

// Activate plugin
const activated = await PluginRegistryService.activatePlugin(
  installationId,
  activatingUserId
);
```

## 7. Conflict Detection Examples

### Detecting Schema Conflicts

```typescript
const registry = new ExtensionSchemaRegistry(prisma);

// Check for conflicts when registering new schema
const conflictReport = registry.detectConflicts({
  pluginId: 'new-analytics',
  version: '1.0.0',
  tables: [
    {
      name: 'metrics',
      namespace: 'plugin_analytics_new',
      fields: [/* ... */]
    }
  ],
  enums: [],
  relationships: [],
  metadata: { namespace: 'plugin_analytics_new' }
});

if (conflictReport.hasConflicts) {
  console.error('Schema conflicts detected:');
  conflictReport.conflicts.forEach(conflict => {
    console.error(`- ${conflict.type}: ${conflict.message}`);
  });
  // Output:
  // - table_name: Table name conflict: "metrics" already exists...
  // - enum_name: Enum name conflict: "Status" already exists...
}
```

## 8. Migration Examples

### Generating SQL Migrations

```typescript
const engine = new ExtensionMigrationEngine(prisma);

// Current schema (new version)
const currentSchema = {
  pluginId: 'quality-metrics',
  version: '2.0.0',
  tables: [
    {
      name: 'quality_reports',
      namespace: 'plugin_quality_001',
      fields: [
        { name: 'reportId', type: 'String', required: true },
        { name: 'timestamp', type: 'DateTime', required: true },
        { name: 'defectRate', type: 'Float', required: true },
        { name: 'status', type: 'String', required: true },
        // NEW FIELD
        { name: 'approvedBy', type: 'String' }
      ]
    }
  ],
  enums: [],
  relationships: [],
  metadata: { namespace: 'plugin_quality_001' }
};

// Previous schema (old version)
const previousSchema = {
  pluginId: 'quality-metrics',
  version: '1.0.0',
  tables: [
    {
      name: 'quality_reports',
      namespace: 'plugin_quality_001',
      fields: [
        { name: 'reportId', type: 'String', required: true },
        { name: 'timestamp', type: 'DateTime', required: true },
        { name: 'defectRate', type: 'Float', required: true },
        { name: 'status', type: 'String', required: true }
      ]
    }
  ],
  enums: [],
  relationships: [],
  metadata: { namespace: 'plugin_quality_001' }
};

// Generate migrations
const migrations = await engine.generateMigrations(
  'quality-metrics',
  currentSchema,
  previousSchema
);

console.log(migrations);
// Output:
// [
//   'ALTER TABLE "plugin_quality_001"."quality_reports" ADD COLUMN "approvedBy" VARCHAR(255);'
// ]
```

### Safety Validation

```typescript
// Validate migration safety
const safetyCheck = await engine.validateMigrationSafety(
  'quality-metrics',
  migrations,
  currentSchema
);

if (!safetyCheck.safe) {
  console.error('Migration safety issues:');
  safetyCheck.issues.forEach(issue => {
    console.error(`[${issue.severity}] ${issue.type}: ${issue.message}`);
  });
}

// Get suggestions
console.log('Suggestions:');
safetyCheck.suggestions.forEach(suggestion => {
  console.log(`- ${suggestion}`);
});
```

## 9. DependencyResolverService Usage (Future)

### Resolving Dependencies

```typescript
import { DependencyResolverService } from '../services/DependencyResolverService';

const resolver = new DependencyResolverService(prisma);

// Resolve all dependencies for a plugin
const resolution = await resolver.resolveDependencies(
  'quality-metrics',
  '1.0.0',
  registry
);

if (!resolution.success) {
  console.error('Dependency resolution failed:');
  resolution.errors.forEach(error => {
    console.error(`- ${error}`);
  });
}

console.log('Resolved dependencies:', resolution.resolved);
// Output:
// {
//   "data-logger": "1.2.3",
//   "notification-system": "1.2.5"
// }
```

### Detecting Circular Dependencies

```typescript
const circularCheck = await resolver.detectCircularDependencies(
  'quality-metrics',
  dependencyGraph
);

if (circularCheck.hasCircular) {
  console.error('Circular dependencies detected:');
  circularCheck.circles.forEach(circle => {
    console.error(`- ${circle.path.join(' -> ')}`);
  });
}
```

### Getting Installation Order

```typescript
const order = await resolver.getInstallationOrder(
  'quality-metrics',
  resolvedDependencies
);

console.log('Installation order:', order.sequence);
// Output:
// [
//   { id: 'data-logger', version: '1.2.3' },
//   { id: 'notification-system', version: '1.2.5' },
//   { id: 'quality-metrics', version: '1.0.0' }
// ]
```

---

**Note**: Examples show the current state of the system plus proposed DependencyResolverService usage.
