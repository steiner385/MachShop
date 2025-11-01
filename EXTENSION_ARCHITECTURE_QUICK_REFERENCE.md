# Extension Architecture Quick Reference

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MachShop3 Extension System                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────────┐  ┌────▼────────────────┐
        │ Extension Schema     │  │ Plugin System       │
        │ Framework (Issue#438)│  │ (Issue #75)         │
        └───────────┬──────────┘  └────┬────────────────┘
                    │                   │
        ┌───────────▼──────────┐        │
        │ Database Layer       │        │
        │ - Schema Definition  │        │
        │ - Migrations         │        │
        │ - Data Safety        │        │
        │ - Prisma Integration │        │
        └──────────────────────┘        │
                                ┌───────▼──────────────┐
                                │ Runtime Layer        │
                                │ - Plugin Lifecycle   │
                                │ - Hook System        │
                                │ - Registry           │
                                │ - Validation         │
                                │ - DependencyResolver │
                                └──────────────────────┘
```

## Architecture Components

### 1. Extension Schema Framework (Database Layer)
**Purpose**: Database schema extension without modifying core Prisma schema

Files:
- `ExtensionSchemaRegistry.ts` - Manages schema registration and conflicts
- `ExtensionMigrationEngine.ts` - Generates and executes SQL migrations
- `ExtensionDataSafety.ts` - Validates data and constraints
- `ExtensionPrismaIntegration.ts` - Integrates with Prisma ORM

Features:
- Dynamic table/enum creation
- Index and constraint management
- Migration safety validation
- Conflict detection between plugins
- Audit logging

### 2. Plugin System (Runtime Layer)
**Purpose**: Plugin lifecycle and hook-based extensibility

Files:
- `PluginSystemService.ts` - Plugin lifecycle and hook registration
- `PluginRegistryService.ts` - Package registry and installation
- `PluginValidationService.ts` - Manifest validation
- `DependencyResolverService.ts` - **[TO BE CREATED]** Dependency resolution

Features:
- Hook-based execution model
- Plugin manifest validation
- Package approval workflow
- Basic dependency format validation
- Configuration management

## Plugin Manifest Structure

```json
{
  "id": "quality-metrics",
  "name": "Quality Metrics Tracker",
  "version": "1.0.0",
  "apiVersion": "1.0.0",
  "author": "MachShop Team",
  "license": "MIT",
  
  "dependencies": {
    "data-logger": "^1.0.0",
    "notification-system": "~1.2.0"
  },
  
  "permissions": [
    "quality:read",
    "quality:write",
    "reports:write"
  ],
  
  "hooks": {
    "quality": ["validateMetrics", "generateReport"],
    "data": ["beforeCreate", "afterUpdate"]
  },
  
  "database": {
    "migrationsDir": "./migrations",
    "requiresMigrations": true
  },
  
  "configuration": {
    "thresholds": { "type": "object", "required": true },
    "notifyOnFail": { "type": "boolean", "default": true }
  }
}
```

## Dependency Specification Format

```typescript
// In manifest.json dependencies field
{
  "dependencies": {
    "plugin-id-1": "^1.0.0",      // Caret: compatible with version
    "plugin-id-2": "~2.1.0",      // Tilde: approximately equivalent
    "plugin-id-3": "3.0.0",       // Exact version
    "plugin-id-4": ">=1.0.0 <2.0" // Version range
  }
}
```

## Database Schema Highlights

### Core Extension Models
```
ExtensionSchema
├── version, status, schemaDefinition
├── ExtensionMigration (migrations)
├── ExtensionSchemaConflict (conflicts)
├── ExtensionTableMetadata (metadata)
├── ExtensionSchemaVersion (history)
└── ExtensionSchemaAuditLog (audit)

Plugin
├── manifest, status, configuration
├── PluginHook (hook registrations)
├── PluginExecution (execution history)
├── PluginConfiguration (settings)
└── relationships to registry/installations

PluginRegistry
├── packages (PluginPackage)
├── installations (PluginInstallation)
└── deployments (PluginDeployment)
```

## Current Installation Flow

```
1. Plugin Submission
   ├─ Validate manifest format
   ├─ Check SemVer compliance
   └─ Create PENDING_REVIEW record

2. Package Approval
   ├─ Review permissions
   ├─ Verify checksum
   └─ Update status to APPROVED

3. Installation
   ├─ Validate dependencies (FORMAT ONLY)
   ├─ Execute migrations
   ├─ Register hooks
   └─ Update to INSTALLED

4. Activation
   ├─ Load plugin code
   ├─ Initialize hooks
   └─ Mark as ACTIVE
```

## What Exists vs What's Missing

### Validation & Safety (EXISTS)
✅ Manifest structure validation
✅ SemVer format checking
✅ Hook point validation
✅ Permission validity checking
✅ Dependency format validation
✅ Schema conflict detection
✅ Migration safety validation
✅ Data integrity checking
✅ Audit logging

### Dependency Handling (MISSING)
❌ Dependency resolution algorithm
❌ Circular dependency detection
❌ Transitive dependency resolution
❌ Version conflict resolution
❌ Dependency availability verification
❌ Installation order planning
❌ Compatibility matrix validation
❌ Rollback strategy for failed dependencies

## Integration Points for DependencyResolverService

```
┌──────────────────────────────────────────────────────────┐
│        DependencyResolverService (NEW)                   │
└──────────────────────────┬───────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬────────────┐
        │                  │                  │            │
        ▼                  ▼                  ▼            ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────────┐
│ PluginRegistry  │ │ PluginSystem │ │Validation│ │ Installation │
│ Service         │ │ Service      │ │Service  │ │ Process      │
└─────────────────┘ └──────────────┘ └─────────┘ └──────────────┘
```

### Integration Sequence
1. **During Validation**: Detect circular dependencies
2. **Before Installation**: Resolve and verify all dependencies available
3. **At Activation**: Ensure dependencies loaded first
4. **On Rollback**: Handle dependent plugin removal

## Key Files and Sizes

| File | Type | Status |
|------|------|--------|
| `ExtensionSchemaRegistry.ts` | 800+ lines | Complete |
| `ExtensionMigrationEngine.ts` | 550+ lines | Complete |
| `ExtensionDataSafety.ts` | 600+ lines | Complete |
| `ExtensionPrismaIntegration.ts` | 550+ lines | Complete |
| `PluginSystemService.ts` | 400+ lines | Partial |
| `PluginRegistryService.ts` | 400+ lines | Partial |
| `PluginValidationService.ts` | 250+ lines | Partial |
| `DependencyResolverService.ts` | **To Create** | **Needed** |
| `extensionSchema.ts` (types) | 390+ lines | Complete |
| `prisma/schema.prisma` | 8 Extension models | Complete |

## Performance Characteristics

### Current State
- Schema validation: O(n) where n = number of tables
- Conflict detection: O(n×m) where n,m = plugins
- Migration execution: O(k) where k = migration steps
- Hook execution: O(p) where p = registered hooks

### Dependency Resolution (NEW)
- Graph resolution: O(n + e) where n = plugins, e = dependencies
- Circular detection: O(n + e) via DFS
- Topological sort: O(n + e) for installation order

## Testing Coverage Needed

For DependencyResolverService:
- [ ] Basic dependency resolution
- [ ] Circular dependency detection
- [ ] Transitive dependency handling
- [ ] Version constraint validation
- [ ] Conflict resolution
- [ ] Installation order determination
- [ ] Rollback scenarios
- [ ] Edge cases (missing deps, incompatible versions)

## Recommended Next Steps

1. **Create DependencyResolverService** with:
   - Graph-based resolution algorithm
   - Circular dependency detection
   - Version constraint solver
   - Installation order planner

2. **Extend PluginValidationService** with:
   - Pre-installation dependency checks
   - Compatibility matrix validation
   - Conflict reporting

3. **Update PluginRegistryService** with:
   - Dependency verification before installation
   - Automatic dependent plugin management
   - Rollback coordination

4. **Enhance Database** with:
   - PluginDependency model for tracking
   - Resolution history and caching
   - Audit trail for dependency changes

5. **Update Installation Flow** with:
   - Dependency resolution phase
   - Ordered installation process
   - Atomic rollback support

---

**Created**: Analysis of MachShop3 Extension Infrastructure  
**Files**: `/home/tony/GitHub/MachShop3/`  
**Status**: Ready for DependencyResolverService implementation
