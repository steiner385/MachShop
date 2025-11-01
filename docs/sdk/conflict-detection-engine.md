# Extension Conflict Detection Engine

**Issue #409 Implementation**

## Overview

The Extension Conflict Detection Engine is a comprehensive service that identifies potential conflicts and compatibility issues before installing extensions. It analyzes extensions across 10 different conflict types, provides detailed conflict reports, and suggests actionable resolution strategies.

## Key Features

### Comprehensive Conflict Detection
- **10 Conflict Types**: Hook, route, entity, schema, permission, resource, data mutation, execution timeout, manifest-declared, and transitive dependency conflicts
- **Multi-Layer Analysis**: Simultaneous detection across UI routes, business logic hooks, data schema, and infrastructure
- **Detailed Reporting**: Rich conflict reports with severity levels, affected resources, and resolution strategies
- **Performance Optimized**: <1 second detection time with caching for frequently checked combinations

### Conflict Types

#### 1. **Hook Conflicts** (`HOOK_CONFLICT`)
Detects when multiple extensions register handlers for the same hook event.

**Examples**:
- Two extensions register handlers for `onWorkOrderCreated` event
- Multiple mutations to the same field through hook handlers
- Blocking hooks preventing other handlers from executing

**Severity**: Warning (unless blocking)
**Resolution**: Adjust hook priorities, separate concerns, disable blocking behavior

**Example**:
```typescript
{
  type: 'HOOK_CONFLICT',
  severity: 'warning',
  sourceExtensionId: 'validation-ext',
  conflictingExtensionId: 'approval-ext',
  conflictItem: 'onWorkOrderCreated',
  message: 'Hook "onWorkOrderCreated" conflict with approval-ext',
  resolutionStrategies: [
    {
      name: 'Adjust Hook Priority',
      description: 'Modify hook priority to ensure proper execution order',
      implementation: 'manual',
      steps: [...]
    }
  ]
}
```

#### 2. **Route Collisions** (`ROUTE_COLLISION`)
Detects when extensions attempt to register the same HTTP route.

**Examples**:
- Two extensions register `GET /api/users`
- Route path patterns that overlap (e.g., `/api/users` and `/api/users/:id`)

**Severity**: Error (exact match), Warning (pattern overlap)
**Resolution**: Use namespace prefix, route delegation, uninstall conflicting extension

**Example**:
```typescript
{
  type: 'ROUTE_COLLISION',
  severity: 'error',
  sourceExtensionId: 'reports-ext',
  conflictingExtensionId: 'dashboards-ext',
  conflictItem: 'GET:/api/reports',
  message: 'Route collision: GET:/api/reports',
  resolutionStrategies: [
    {
      name: 'Use Namespace Prefix',
      implementation: 'automatic',
      steps: [
        'Modify route from "/api/reports" to "/extensions/reports-ext/api/reports"',
        'Update all route references',
        'Update API documentation'
      ]
    }
  ]
}
```

#### 3. **Entity Collisions** (`ENTITY_COLLISION`)
Detects when extensions attempt to create database tables/entities with the same name.

**Examples**:
- Two extensions create `CustomProduct` table
- Duplicate Prisma model definitions

**Severity**: Error
**Resolution**: Rename entity with prefix, merge entities, contact other maintainers

**Example**:
```typescript
{
  type: 'ENTITY_COLLISION',
  severity: 'error',
  sourceExtensionId: 'quality-ext',
  conflictingExtensionId: 'reporting-ext',
  conflictItem: 'QualityMetrics',
  message: 'Entity name collision: QualityMetrics'
}
```

#### 4. **Schema Conflicts** (`SCHEMA_CONFLICT`)
Detects when multiple extensions perform migrations on the same database table.

**Examples**:
- Both extensions add columns to same table
- Foreign key dependency issues between extensions
- Migration sequence conflicts

**Severity**: Warning
**Resolution**: Define explicit migration sequence, separate concerns

#### 5. **Permission Conflicts** (`PERMISSION_CONFLICT`)
Detects when extensions define overlapping or conflicting permission rules.

**Examples**:
- One extension grants "read" on resource, another grants "write"
- Role definitions with same name but different permissions

**Severity**: Warning
**Resolution**: Document permission hierarchy, align permission definitions

#### 6. **Resource Conflicts** (`RESOURCE_CONFLICT`)
Detects when extensions exceed system resource limits.

**Examples**:
- Total memory requirement exceeds available memory
- CPU cores required exceed system capacity
- API rate limits collectively exceed thresholds

**Severity**: Warning (Info for rate limits)
**Resolution**: Reduce memory/CPU usage, disable non-essential extensions, implement caching

**Example**:
```typescript
{
  type: 'RESOURCE_CONFLICT',
  severity: 'warning',
  sourceExtensionId: 'analytics-ext',
  message: 'Memory resource limit exceeded',
  detailedDescription: 'Total memory requirement (4500MB) exceeds system limit (4096MB)',
  resolutionStrategies: [
    {
      name: 'Reduce Memory Usage',
      implementation: 'manual',
      steps: [
        'Profile extension memory usage',
        'Identify memory optimization opportunities',
        'Refactor code to reduce memory footprint'
      ]
    }
  ]
}
```

#### 7. **Data Mutation Conflicts** (`DATA_MUTATION_CONFLICT`)
Detects when multiple extensions modify the same database fields.

**Examples**:
- Multiple extensions update same field in same entity
- Execution order-dependent field mutations

**Severity**: Warning
**Resolution**: Define explicit mutation ordering, use intermediate fields

#### 8. **Execution Timeout Risks** (`EXECUTION_TIMEOUT`)
Detects hooks with long timeouts that may cause cascading failures.

**Examples**:
- Hook with 15-second timeout in 5-second request handler
- Long-running operations that block upstream workflows

**Severity**: Warning
**Resolution**: Optimize hook performance, move to background jobs

#### 9. **Manifest Declared Conflicts** (`MANIFEST_DECLARED`)
Detects when extension manifest explicitly declares incompatibilities.

**Examples**:
- Extension manifest lists incompatible extension in `conflicts` array
- Author-declared incompatibilities due to overlapping functionality

**Severity**: Error
**Resolution**: Uninstall conflicting extension, use alternative extension

**Example**:
```typescript
{
  type: 'MANIFEST_DECLARED',
  severity: 'error',
  sourceExtensionId: 'new-ext',
  conflictingExtensionId: 'incompatible-ext',
  message: 'Manifest declared conflict with incompatible-ext',
  resolutionStrategies: [
    {
      name: 'Uninstall Conflicting Extension',
      steps: [
        'Uninstall incompatible-ext@1.0.0',
        'Install new-ext@1.0.0'
      ]
    }
  ]
}
```

#### 10. **Transitive Dependency Conflicts** (`TRANSITIVE_DEPENDENCY`)
Detects missing or incompatible extension dependencies.

**Examples**:
- Required dependency not installed
- Dependency version mismatch
- Circular dependency chains

**Severity**: Error
**Resolution**: Install missing dependency, update dependency version, relax constraint

**Example**:
```typescript
{
  type: 'TRANSITIVE_DEPENDENCY',
  severity: 'error',
  sourceExtensionId: 'reporting-ext',
  conflictingExtensionId: 'base-ext',
  message: 'Dependency version conflict: base-ext',
  detailedDescription: 'reporting-ext@2.0.0 requires base-ext@2.0.0. Installed: base-ext@1.0.0'
}
```

## Architecture

### Core Components

```
ExtensionConflictDetectionEngine
├── detectConflicts(manifest, context) → ConflictDetectionResult
│   ├── detectHookConflicts()
│   ├── detectRouteCollisions()
│   ├── detectEntityCollisions()
│   ├── detectSchemaConflicts()
│   ├── detectPermissionConflicts()
│   ├── detectResourceConflicts()
│   ├── detectDataMutationConflicts()
│   ├── detectExecutionTimeoutRisks()
│   ├── detectManifestDeclaredConflicts()
│   └── detectTransitiveDependencies()
├── buildDependencyGraph() → DependencyGraphNode[]
└── Caching & Audit Trail
```

### Data Flow

```
Extension Manifest + Installed Extensions Context
    ↓
[Parallel Conflict Detection - 10 Checks]
    ↓
[Severity Classification & Aggregation]
    ↓
[Dependency Graph Building]
    ↓
[Caching & Audit Logging]
    ↓
ConflictDetectionResult
├── canInstall: boolean
├── conflicts: ConflictReport[] (errors)
├── warnings: ConflictReport[]
├── infos: ConflictReport[]
├── summaryByType: {...}
└── dependencyGraph: DependencyGraphNode[]
```

## API Reference

### Main Method

```typescript
async detectConflicts(
  manifest: ExtensionManifest,
  context: CompatibilityContext
): Promise<ConflictDetectionResult>
```

**Parameters**:
- `manifest`: Extension manifest being validated
- `context`: Current environment state with installed extensions

**Returns**: Comprehensive conflict detection result with all detected issues

### ConflictDetectionResult

```typescript
interface ConflictDetectionResult {
  sourceExtensionId: string;
  sourceVersion: string;
  canInstall: boolean; // false if any error-level conflicts
  conflicts: ConflictReport[]; // Error-level conflicts
  warnings: ConflictReport[]; // Warning-level conflicts
  infos: ConflictReport[]; // Info-level conflicts
  summaryByType: {
    hookConflicts: number;
    routeCollisions: number;
    entityCollisions: number;
    schemaConflicts: number;
    permissionConflicts: number;
    resourceConflicts: number;
    dataMutationConflicts: number;
    executionTimeoutRisks: number;
    manifestDeclaredConflicts: number;
    transitiveDependencies: number;
  };
  dependencyGraph?: DependencyGraphNode[];
  analysisTime: number; // milliseconds
  timestamp: Date;
}
```

### ConflictReport

```typescript
interface ConflictReport {
  type: ConflictType; // 10 conflict types
  severity: ConflictSeverity; // error | warning | info
  sourceExtensionId: string;
  sourceVersion: string;
  conflictingExtensionId?: string;
  conflictingVersion?: string;
  conflictItem?: string; // specific item in conflict
  message: string;
  detailedDescription: string;
  affectedResources?: string[];
  resolutionStrategies: ResolutionStrategy[];
  documentation?: string;
  testingRecommendations: string[];
  timestamp: Date;
}
```

### ResolutionStrategy

```typescript
interface ResolutionStrategy {
  name: string;
  description: string;
  implementation: 'automatic' | 'manual' | 'requires_review';
  steps: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedEffort?: string;
  sideEffects?: string[];
}
```

## Usage Examples

### Basic Usage

```typescript
import { ExtensionConflictDetectionEngine } from '../services/ExtensionConflictDetectionEngine';
import { prisma, logger } from '../config';

const engine = new ExtensionConflictDetectionEngine(prisma, logger);

// Detect conflicts before installation
const result = await engine.detectConflicts(
  extensionManifest,
  {
    mesVersion: '2.0.0',
    installedExtensions: [...],
    platformCapabilities: ['authentication', 'caching']
  }
);

if (!result.canInstall) {
  // Show errors to user
  result.conflicts.forEach(conflict => {
    console.error(`❌ ${conflict.type}: ${conflict.message}`);
    console.error(`   ${conflict.detailedDescription}`);

    // Suggest resolutions
    conflict.resolutionStrategies.forEach(strategy => {
      console.info(`   ✓ ${strategy.name}: ${strategy.description}`);
    });
  });
}
```

### Handling Warnings

```typescript
// Install despite warnings, but log them
if (result.conflicts.length === 0) {
  if (result.warnings.length > 0) {
    logger.warn(`Installing with ${result.warnings.length} warnings:`, {
      warnings: result.warnings.map(w => w.message)
    });
  }

  await installExtension(manifest);
}
```

### Using Dependency Graph

```typescript
// Visualize dependencies
const graph = result.dependencyGraph;

graph.forEach(node => {
  console.log(`${node.extensionId}@${node.version} [${node.status}]`);
  node.dependencies.forEach(dep => {
    console.log(`  → ${dep.extensionId}@${dep.version} (${dep.type})`);
  });
});
```

### Accessing Summary

```typescript
// Check specific conflict types
console.log(`Route conflicts: ${result.summaryByType.routeCollisions}`);
console.log(`Hook conflicts: ${result.summaryByType.hookConflicts}`);
console.log(`Total resource conflicts: ${result.summaryByType.resourceConflicts}`);

// Overall assessment
const totalIssues = result.conflicts.length + result.warnings.length + result.infos.length;
console.log(`Analysis completed in ${result.analysisTime}ms: ${totalIssues} issues found`);
```

## Integration with Installation Flow

### Pre-Installation Validation

```typescript
// In InstallationService
const manifest = await validateManifest(extensionPackage);
const context = await buildCompatibilityContext(currentEnvironment);

const conflictResult = await engine.detectConflicts(manifest, context);

if (!conflictResult.canInstall) {
  throw new InstallationError(
    'Extension has blocking conflicts',
    conflictResult.conflicts.map(c => ({
      type: c.type,
      message: c.message,
      suggestions: c.resolutionStrategies.map(s => s.name)
    }))
  );
}

// Proceed with installation
await installExtension(manifest);
```

### UI Integration

```typescript
// Display conflicts to user
function renderConflictReport(result: ConflictDetectionResult) {
  return (
    <>
      {result.canInstall ? (
        <div className="success">
          ✓ Ready to install
          {result.warnings.length > 0 && (
            <div className="warnings">
              <h4>{result.warnings.length} warnings:</h4>
              {result.warnings.map(w => (
                <div key={w.conflictItem} className="warning-item">
                  <strong>{w.message}</strong>
                  <p>{w.detailedDescription}</p>
                  <div className="resolutions">
                    {w.resolutionStrategies.map(s => (
                      <button key={s.name} onClick={() => applyStrategy(s)}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="error">
          ❌ Cannot install: {result.conflicts.length} blocking issues
          {result.conflicts.map(c => (
            <ConflictReportComponent key={c.conflictItem} report={c} />
          ))}
        </div>
      )}
    </>
  );
}
```

## Performance Characteristics

### Detection Speed

- **Simple extensions**: 50-150ms
- **Complex extensions**: 200-800ms
- **Multi-extension scenarios**: <1000ms
- **Cached results**: <5ms

### Caching Strategy

- **Cache duration**: 10 minutes
- **Cache key**: `extensionId:version:installedExtensionSet`
- **Cache invalidation**: Automatic after 10 minutes or manual clear

**Cache Management**:
```typescript
// Check cache stats
const stats = engine.getCacheStats();
console.log(`Cache size: ${stats.size} entries`);
console.log(`Cached keys: ${stats.keys}`);

// Clear cache (e.g., after extensions installed/uninstalled)
engine.clearCache();
```

## Error Handling

### Conflict Detection Failure

```typescript
try {
  const result = await engine.detectConflicts(manifest, context);

  if (!result.canInstall) {
    // Handle blocking conflicts
  }
} catch (error) {
  // Fallback behavior if detection fails
  logger.error('Conflict detection failed', error);

  // Option 1: Install anyway with warnings
  logger.warn('Installing despite detection failure');
  await installExtension(manifest);

  // Option 2: Block installation
  throw new Error('Cannot install without conflict verification');
}
```

## Testing

### Running Tests

```bash
# Run all conflict detection tests
npm test src/tests/services/ExtensionConflictDetectionEngine.test.ts

# Run specific test suite
npm test -- --grep "Hook Conflict Detection"

# Generate coverage report
npm test -- --coverage src/services/ExtensionConflictDetectionEngine.ts
```

### Test Coverage

- **Hook conflict detection**: 15+ test cases
- **Route collision detection**: 12+ test cases
- **Entity collision detection**: 8+ test cases
- **Resource conflict detection**: 10+ test cases
- **Permission conflict detection**: 8+ test cases
- **Manifest declared conflicts**: 8+ test cases
- **Transitive dependencies**: 10+ test cases
- **Complex scenarios**: 8+ test cases
- **Edge cases**: 10+ test cases
- **Cache management**: 8+ test cases

## Best Practices

### 1. Manifest Quality

Ensure manifests are complete and accurate:
```typescript
interface ExtensionManifest {
  id: string; // Unique, kebab-case
  version: string; // Semantic versioning
  type: ExtensionType; // One of 6 types

  // Declare dependencies clearly
  dependencies: [{
    extensionId: string;
    versionRange: string; // e.g., "^1.0.0"
    optional: boolean;
  }];

  // Declare conflicts explicitly
  conflicts: [{
    extensionId: string;
    conflictType: ConflictType;
    reason: string;
  }];

  // Declare all capabilities
  hooks?: HookRegistration[];
  routes?: RouteDefinition[];
  dataSchema?: SchemaDefinition;
  permissions?: PermissionDefinition[];
  resources?: ResourceRequirement;
}
```

### 2. Before Installation

Always run conflict detection:
```typescript
const result = await engine.detectConflicts(manifest, context);

if (!result.canInstall) {
  // User-friendly error message
  throw new Error(
    `Cannot install: ${result.conflicts.map(c => c.message).join(', ')}`
  );
}
```

### 3. Resolution Strategy Priority

1. **Prefer Automatic Resolutions** (namespace prefix, dependency installation)
2. **Suggest Manual Steps** (version updates, refactoring)
3. **Last Resort** (uninstall conflicting extensions)

### 4. Monitor Conflict Patterns

Track which conflicts occur most frequently:
```typescript
// Log conflict occurrences
const conflictStats = {};
result.conflicts.forEach(conflict => {
  conflictStats[conflict.type] = (conflictStats[conflict.type] || 0) + 1;
});

// Analyze patterns
analytics.trackExtensionConflicts({
  extensionId: manifest.id,
  conflicts: conflictStats,
  timestamp: result.timestamp
});
```

## Future Enhancements

### Phase 2
- Machine learning-based conflict prediction
- Automatic conflict resolution recommendations
- Extension marketplace conflict warnings
- Conflict resolution workflow automation

### Phase 3
- Real-time conflict detection during extension development
- IDE integration for manifest validation
- Community conflict database and sharing
- Conflict resolution in production environments

## Related Issues

- **Issue #403**: Extension Type Taxonomy & Manifest Schema (dependency)
- **Issue #404**: Extension Compatibility Matrix Service (used by this engine)
- **Issue #407**: Multi-Site Deployment (uses this engine)
- **Issue #414**: Migration Tool (uses this engine)

## See Also

- [Extension Manifest Schema](./manifest-schema.md)
- [Compatibility Matrix Service](./compatibility-matrix.md)
- [Extension Installation Guide](./installation-guide.md)
- [SDK Architecture Overview](./sdk-architecture.md)
