# Extension Lifecycle Management Guide

Comprehensive guide for managing extension lifecycle, versioning, and deployments in MachShop.

## Table of Contents

1. [Overview](#overview)
2. [Version Management](#version-management)
3. [Extension States](#extension-states)
4. [Lifecycle Operations](#lifecycle-operations)
5. [Deprecation & Breaking Changes](#deprecation--breaking-changes)
6. [Migration & Upgrades](#migration--upgrades)
7. [Dependency Management](#dependency-management)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

## Overview

The Extension Lifecycle Manager provides comprehensive management of extension lifecycle from installation through deprecation and removal. It handles:

- **Semantic Versioning**: Enforces semantic versioning (major.minor.patch)
- **State Management**: Tracks extension state through installation, updates, and removal
- **Dependency Resolution**: Automatically resolves and validates dependencies
- **Deprecation Tracking**: Manages deprecation workflows and user notifications
- **Breaking Changes**: Tracks and communicates breaking changes between versions
- **Health Monitoring**: Continuous health checks and metrics collection
- **Migration Tools**: Automated migration support for version upgrades

## Version Management

### Semantic Versioning

MachShop extensions use semantic versioning in the format `MAJOR.MINOR.PATCH[-PRERELEASE][+METADATA]`:

- **MAJOR**: Breaking changes or major feature additions
- **MINOR**: New features in a backward-compatible manner
- **PATCH**: Bug fixes and patch updates
- **PRERELEASE**: Optional pre-release version (alpha, beta, rc)
- **METADATA**: Optional build metadata

### Version Examples

```typescript
const versions = [
  '1.0.0',           // Initial release
  '1.0.1',           // Patch update
  '1.1.0',           // Minor update (backward compatible)
  '2.0.0',           // Major update (breaking changes)
  '1.0.0-alpha',     // Alpha pre-release
  '1.0.0-beta.1',    // Beta release
  '2.0.0-rc.1',      // Release candidate
];
```

### Version Constraints

Versions can be specified with constraints:

```typescript
// Exact version
'1.0.0'

// Caret (^) - allows minor and patch updates
'^1.2.0'  // matches 1.2.0, 1.3.0, 1.99.0, but not 2.0.0

// Tilde (~) - allows patch updates only
'~1.2.0'  // matches 1.2.0, 1.2.1, 1.2.99, but not 1.3.0

// Comparison operators
'>=1.0.0'     // greater than or equal
'>1.0.0'      // greater than
'<=2.0.0'     // less than or equal
'<2.0.0'      // less than

// Range
'1.0.0 - 2.0.0'  // inclusive range
```

### Version Manager

```typescript
import { VersionManager } from '@machshop/extension-sdk/lifecycle';

const versionManager = new VersionManager();

// Parse version
const semver = versionManager.parseSemver('1.2.3');
// { major: 1, minor: 2, patch: 3 }

// Validate version
const isValid = versionManager.isValidVersion('1.0.0');  // true
const invalid = versionManager.isValidVersion('1.0');    // false

// Compare versions
const comparison = versionManager.compare('1.0.0', '1.1.0');
// { isNewer: false, isOlder: true, isSame: false, ... }

// Check constraints
const satisfies = versionManager.satisfiesConstraint('1.2.5', {
  minVersion: '1.0.0',
  maxVersion: '2.0.0',
});  // true

// Sort versions
const sorted = versionManager.sortVersions(['2.0.0', '1.0.0', '1.5.0']);
// ['1.0.0', '1.5.0', '2.0.0']

// Get latest version
const latest = versionManager.getLatestVersion(['1.0.0', '2.0.0', '1.5.0']);
// '2.0.0'
```

## Extension States

Extensions go through various states during their lifecycle:

```typescript
enum ExtensionState {
  AVAILABLE = 'AVAILABLE',    // Available for installation
  INSTALLING = 'INSTALLING',  // Installation in progress
  ACTIVE = 'ACTIVE',          // Installed and active
  DISABLED = 'DISABLED',      // Temporarily disabled
  UPDATING = 'UPDATING',      // Update in progress
  UNINSTALLING = 'UNINSTALLING', // Uninstallation in progress
  UNINSTALLED = 'UNINSTALLED', // Uninstalled (archived)
  ERROR = 'ERROR',            // Error state
  DEPRECATED = 'DEPRECATED',  // Deprecated (scheduled for removal)
}
```

### State Transitions

Valid state transitions:

```
AVAILABLE → INSTALLING → ACTIVE
   ↓
DISABLED ← → ACTIVE ← → UPDATING → ACTIVE
   ↓           ↓
 ERROR      UNINSTALLING → UNINSTALLED
```

## Lifecycle Operations

### Installation

```typescript
import { ExtensionLifecycleManager } from '@machshop/extension-sdk/lifecycle';

const lifecycleManager = new ExtensionLifecycleManager();

// Install an extension
const manifest = {
  id: 'my-extension',
  name: 'My Extension',
  version: '1.0.0',
  description: 'My awesome extension',
  author: 'John Doe',
  license: 'MIT',
  main: 'index.js',
  engines: {
    machshop: '>=1.0.0 <2.0.0',
  },
  dependencies: {
    'dep-extension': '^1.0.0',
  },
};

try {
  const extension = await lifecycleManager.installExtension(manifest, '1.0.0');
  console.log(`Extension installed: ${extension.id} v${extension.currentVersion}`);
} catch (error) {
  console.error(`Installation failed: ${error}`);
}
```

### Updates

```typescript
// Update to a new version
try {
  const updated = await lifecycleManager.updateExtension('my-extension', '1.1.0');
  console.log(`Updated to v${updated.currentVersion}`);
} catch (error) {
  console.error(`Update failed: ${error}`);
}
```

### Disable/Enable

```typescript
// Temporarily disable an extension
await lifecycleManager.disableExtension('my-extension', 'Maintenance');

// Re-enable the extension
await lifecycleManager.enableExtension('my-extension');
```

### Uninstallation

```typescript
// Uninstall an extension
await lifecycleManager.uninstallExtension('my-extension');
```

### Health Checks

```typescript
// Get health status
const extension = lifecycleManager.getExtension('my-extension');
if (extension?.healthCheck) {
  if (extension.healthCheck.healthy) {
    console.log('Extension is healthy');
  } else {
    console.log(`Issues: ${extension.healthCheck.issues.map(i => i.message).join(', ')}`);
  }
}
```

## Deprecation & Breaking Changes

### Marking Extensions as Deprecated

```typescript
const manifest: ExtensionManifest = {
  id: 'old-extension',
  name: 'Old Extension',
  version: '1.0.0',
  // ... other fields

  deprecation: {
    deprecatedSince: '1.0.0',
    removedIn: '2.0.0',
    reason: 'Replaced by new-extension',
    alternative: 'new-extension',
    migrationGuide: 'See MIGRATION_GUIDE.md',
    notifyUsers: true,
  },
};
```

### Documenting Breaking Changes

```typescript
const manifest: ExtensionManifest = {
  // ... fields

  breakingChanges: [
    {
      version: '2.0.0',
      description: 'API endpoints changed',
      affectedApis: [
        'GET /api/extensions/{id}',
        'POST /api/extensions/{id}/execute',
      ],
      migrationGuide: 'Update API calls to new format',
      deprecatedSince: '1.5.0',
      removedIn: '2.0.0',
    },
  ],
};
```

### Checking Deprecations

```typescript
// Check if an extension is deprecated
const deprecation = lifecycleManager.checkDeprecations('my-extension');
if (deprecation) {
  console.log(`Extension deprecated since ${deprecation.deprecatedSince}`);
  console.log(`Will be removed in ${deprecation.removedIn}`);
  if (deprecation.alternative) {
    console.log(`Use ${deprecation.alternative} instead`);
  }
}
```

## Migration & Upgrades

### Migration Information

```typescript
// Get migration info between versions
const migration = lifecycleManager.getMigrationInfo('1.0.0', '2.0.0');

console.log(`Estimated duration: ${migration.estimatedDuration} minutes`);
console.log(`Risk level: ${migration.riskLevel}`);
console.log(`Rollback possible: ${migration.rollbackPossible}`);
console.log(`Testing required: ${migration.testingRequired}`);

// Execute migration steps
for (const step of migration.steps) {
  console.log(`Executing: ${step.name}`);
  if (step.operation) {
    await step.operation();
  }
}
```

### Upgrade Path

```typescript
// Get suggested upgrade path for compatibility
const extension = lifecycleManager.getExtension('my-extension');
if (extension?.compatibilityStatus.upgradePath) {
  const path = extension.compatibilityStatus.upgradePath;
  console.log(`Upgrade path: ${path.join(' → ')}`);
}
```

## Dependency Management

### Resolving Dependencies

```typescript
import { DependencyResolver } from '@machshop/extension-sdk/lifecycle';

const dependencyResolver = new DependencyResolver();

const dependencies = {
  'dep-extension-1': '^1.0.0',
  'dep-extension-2': '>=2.0.0 <3.0.0',
};

const resolution = await dependencyResolver.resolve(dependencies);

if (resolution.resolvable) {
  console.log('Dependencies resolved successfully');
  console.log('Resolved versions:', resolution.suggestedResolution);
} else {
  console.log('Conflicts:');
  resolution.conflicts.forEach((conflict) => {
    console.log(`  ${conflict.conflictReason}`);
    if (conflict.suggestedAction) {
      console.log(`  Suggested: ${conflict.suggestedAction}`);
    }
  });
}
```

### Circular Dependencies

```typescript
// Check for circular dependencies
const circles = dependencyResolver.getCircularDependencies(allDependencies);

if (circles.length > 0) {
  console.log('Circular dependencies detected:');
  circles.forEach((circle) => {
    console.log(`  ${circle.join(' → ')}`);
  });
}
```

### Checking Removal Impact

```typescript
// Check if an extension can be safely removed
const canRemove = dependencyResolver.canRemoveExtension('my-extension', allDependencies);

if (!canRemove) {
  const dependents = dependencyResolver.getDependents('my-extension', allDependencies);
  console.log(`Cannot remove: ${dependents.length} extensions depend on it`);
  console.log(`Dependents: ${dependents.join(', ')}`);
}
```

## Best Practices

### 1. Use Semantic Versioning Correctly

```typescript
// ✅ GOOD - Clear version progression
'1.0.0'  // Initial release
'1.1.0'  // Added new feature (backward compatible)
'1.1.1'  // Bug fix
'2.0.0'  // Breaking changes (require migration)

// ❌ BAD - Inconsistent versioning
'1.0'      // Incomplete version
'1.0.0.0'  // Too many components
'latest'   // Vague identifier
```

### 2. Document Breaking Changes

```typescript
// ✅ GOOD
{
  breakingChanges: [{
    version: '2.0.0',
    description: 'Restructured API endpoints',
    affectedApis: ['GET /api/data', 'POST /api/data'],
    migrationGuide: 'See docs/MIGRATION_V2.md',
    deprecatedSince: '1.5.0',
    removedIn: '2.0.0',
  }]
}

// ❌ BAD
{
  changelog: 'API changed'
}
```

### 3. Notify Users of Deprecations

```typescript
// ✅ GOOD - Clear deprecation timeline
{
  deprecation: {
    deprecatedSince: '1.5.0',
    removedIn: '2.0.0',  // 6 months from deprecation
    reason: 'Replaced by new-extension',
    alternative: 'new-extension',
    migrationGuide: 'MIGRATION.md',
    notifyUsers: true,  // Notify in UI
  }
}

// ❌ BAD - No migration path
{
  deprecated: true  // No version info or alternative
}
```

### 4. Manage Dependencies Carefully

```typescript
// ✅ GOOD - Use caret for compatibility
{
  dependencies: {
    'core-extension': '^1.0.0',  // Accept minor/patch updates
  },
  peerDependencies: {
    'theme-extension': '^2.0.0',  // Peer extension must be present
  },
}

// ❌ BAD - Too restrictive or loose
{
  dependencies: {
    'core-extension': '1.0.0',    // Only exact version
    'other-extension': '*',       // Accept any version
  }
}
```

### 5. Enable Rollback for Critical Updates

```typescript
// ✅ GOOD - Critical updates support rollback
{
  config: {
    lifecycle: {
      supportsHotReload: false,  // Requires restart
    }
  }
}

// Enable rollback in manager
const manager = new ExtensionLifecycleManager({
  enableRollback: true,
  maxBackupVersions: 5,
});

// ❌ BAD - No rollback for critical systems
{
  enableRollback: false
}
```

## Examples

### Complete Lifecycle Workflow

```typescript
import {
  ExtensionLifecycleManager,
  VersionManager,
} from '@machshop/extension-sdk/lifecycle';

// Initialize managers
const lifecycleManager = new ExtensionLifecycleManager({
  enableAutoUpdates: false,
  deprecationWarningDays: 30,
  maxBackupVersions: 5,
});

const versionManager = new VersionManager();

// 1. Install extension
console.log('Installing extension...');
const manifest = {
  id: 'reporting-extension',
  name: 'Advanced Reporting',
  version: '1.0.0',
  description: 'Advanced reporting features',
  author: 'Reports Team',
  license: 'MIT',
  main: 'index.js',
  engines: { machshop: '>=1.0.0' },
  dependencies: { 'analytics-extension': '^1.0.0' },
};

let extension = await lifecycleManager.installExtension(manifest, '1.0.0');
console.log(`✓ Installed: ${extension.name} v${extension.currentVersion}`);

// 2. Listen to events
lifecycleManager.onLifecycleEvent((event) => {
  console.log(`Event: ${event.extensionId} - ${event.eventType}`);
});

// 3. Check for updates
const latestVersion = '1.1.0';
if (versionManager.compare(extension.currentVersion, latestVersion).isNewer) {
  console.log(`Update available: ${latestVersion}`);

  // Get migration info
  const migration = lifecycleManager.getMigrationInfo(
    extension.currentVersion,
    latestVersion
  );

  console.log(`Migration risk: ${migration.riskLevel}`);
  console.log(`Estimated time: ${migration.estimatedDuration} minutes`);

  // Update extension
  extension = await lifecycleManager.updateExtension('reporting-extension', latestVersion);
  console.log(`✓ Updated to v${extension.currentVersion}`);
}

// 4. Temporary disable for maintenance
console.log('Disabling for maintenance...');
extension = await lifecycleManager.disableExtension('reporting-extension', 'Scheduled maintenance');
console.log(`✓ Disabled`);

// 5. Re-enable after maintenance
console.log('Re-enabling...');
extension = await lifecycleManager.enableExtension('reporting-extension');
console.log(`✓ Enabled`);

// 6. Check health
if (extension.healthCheck?.healthy) {
  console.log('✓ Extension is healthy');
} else {
  console.log(`⚠ Extension has issues: ${extension.healthCheck?.issues.map(i => i.message).join(', ')}`);
}

// 7. Get all active extensions
const activeExtensions = lifecycleManager.getExtensionsByState('ACTIVE');
console.log(`Active extensions: ${activeExtensions.map(e => `${e.name} v${e.currentVersion}`).join(', ')}`);
```

---

For more information, see the [Extension SDK Documentation](./README.md).
