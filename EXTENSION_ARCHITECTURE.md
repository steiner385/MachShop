# MachShop3 Extension Infrastructure Analysis

## Executive Summary

The MachShop3 codebase has a comprehensive extension architecture with two distinct systems:

1. **Extension Schema Framework (Issue #438)** - Database schema extension system
2. **Plugin System (Issue #75)** - Runtime plugin management and hooking system

Both systems already have sophisticated implementations with validation, migration, safety checking, and audit logging. The DependencyResolverService should be added to enhance the existing plugin registry system.

---

## 1. Current Extension Architecture

### 1.1 Extension Schema Framework (Database Layer)

**Purpose**: Allows plugins to register custom database entities and fields without modifying the core Prisma schema.

**Location**: `/home/tony/GitHub/MachShop3/src/services/Extension*.ts`
- `ExtensionSchemaRegistry.ts` - Schema registration and validation
- `ExtensionMigrationEngine.ts` - Safe migration execution and rollback
- `ExtensionDataSafety.ts` - Data validation and integrity checking
- `ExtensionPrismaIntegration.ts` - Prisma ORM integration

**Types**: `/home/tony/GitHub/MachShop3/src/types/extensionSchema.ts`

### 1.2 Plugin System (Runtime Layer)

**Purpose**: Manages plugin lifecycle, hook registration, execution, and sandboxing with event-driven architecture.

**Location**: `/home/tony/GitHub/MachShop3/src/services/Plugin*.ts`
- `PluginSystemService.ts` - Plugin lifecycle and hook management
- `PluginRegistryService.ts` - Registry operations and version management
- `PluginValidationService.ts` - Manifest validation and security scanning

**SDK**: `/home/tony/GitHub/MachShop3/src/sdk/PluginSDK.ts`

---

## 2. How Manifests Are Defined

### 2.1 Plugin Manifest Structure

```typescript
interface PluginManifest {
  id: string;                           // e.g., "quality-metrics-tracker"
  name: string;
  version: string;                      // Must follow SemVer
  description?: string;
  author?: string;
  license?: string;
  apiVersion: string;                   // API compatibility version
  permissions?: string[];               // Resource access permissions
  hooks?: {
    workflow?: string[];
    ui?: string[];
    data?: string[];
    integration?: string[];
    notification?: string[];
  };
  dependencies?: Record<string, string>; // pluginId -> version range
  database?: {
    migrationsDir: string;
    requiresMigrations: boolean;
  };
  configuration?: Record<string, any>;
  endpoints?: Array<{
    path: string;
    method: string;
    handler: string;
  }>;
}
```

### 2.2 Extension Database Schema Manifest

```typescript
interface ExtensionDatabaseSchema {
  pluginId: string;
  version: string;
  tables: ExtensionTable[];
  enums: ExtensionEnum[];
  relationships: ExtensionRelationship[];
  metadata: ExtensionSchemaMetadata;
}

// Tables can define:
// - Fields with types (String, Int, Float, Boolean, DateTime, Decimal, Json, Bytes)
// - Validation constraints (min/max, length, pattern, enum)
// - Indexes and unique constraints
// - Timestamps (createdAt, updatedAt)
```

---

## 3. Existing Dependency Handling

### 3.1 Current Implementation

**File**: `/home/tony/GitHub/MachShop3/src/services/PluginValidationService.ts`

The system already has basic dependency validation:

```typescript
// Validate dependencies format if present
if (manifest.dependencies) {
  if (typeof manifest.dependencies !== 'object') {
    errors.push('dependencies must be an object');
  } else {
    for (const [depId, version] of Object.entries(manifest.dependencies)) {
      if (!/^[a-z0-9-]+$/.test(depId)) {
        errors.push(`Invalid dependency id: ${depId}...`);
      }
      try {
        semver.validRange(version as string); // SemVer validation
      } catch (e) {
        errors.push(`Invalid version range for dependency ${depId}: ${version}`);
      }
    }
  }
}
```

### 3.2 What's Missing

The current system:
- Validates dependency format and SemVer ranges
- Does NOT resolve dependencies recursively
- Does NOT check availability of dependencies
- Does NOT detect circular dependencies
- Does NOT validate compatibility constraints
- Does NOT handle version conflicts

---

## 4. Key Types and Interfaces

### 4.1 Plugin Management Types

**File**: `src/services/PluginSystemService.ts`

```typescript
interface PluginManifest {
  // Core metadata
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  
  // Dependencies
  dependencies?: Record<string, string>; // "plugin-id" -> "^1.0.0"
  
  // Runtime configuration
  permissions?: string[];
  hooks?: { workflow?: string[]; ui?: string[]; ... };
  database?: { migrationsDir: string; requiresMigrations: boolean };
  configuration?: Record<string, any>;
  endpoints?: Array<{ path: string; method: string; handler: string }>;
}

interface HookContext {
  data: any;
  original?: any;
  plugin: { id: string; version: string };
  user: { id: string; roles: string[]; permissions: string[] };
  request: { id: string; timestamp: Date; ipAddress: string };
  // Methods: reject(), addWarning(), abort()
  // API: get(), post(), put(), delete()
}
```

### 4.2 Extension Schema Types

**File**: `src/types/extensionSchema.ts`

```typescript
type ExtensionFieldType = 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Decimal' | 'Json' | 'Bytes'
type RelationshipType = 'OneToOne' | 'OneToMany' | 'ManyToMany'
type SchemaStatus = 'pending' | 'validating' | 'active' | 'failed'
type MigrationStatus = 'pending' | 'executing' | 'executed' | 'failed' | 'rolled_back'

interface ExtensionTable {
  name: string;
  namespace: string;
  displayName?: string;
  description?: string;
  fields: ExtensionField[];
  indexes?: ExtensionIndex[];
  uniqueConstraints?: ExtensionUniqueConstraint[];
  timestamps?: { createdAt?: boolean; updatedAt?: boolean };
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ConflictReport {
  hasConflicts: boolean;
  conflicts: Conflict[];
  warnings: ConflictWarning[];
}
```

---

## 5. Database Schema for Extensions

**File**: `prisma/schema.prisma`

### Extension Models:

```prisma
model ExtensionSchema {
  id String @id @default(cuid())
  pluginId String @unique
  version String
  schemaDefinition Json                      // Full schema
  status ExtensionSchemaStatus @default(pending)
  validationErrors Json?
  registeredAt DateTime @default(now())
  activatedAt DateTime?
  deactivatedAt DateTime?
  lastError String?
  createdBy String?
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  migrations ExtensionMigration[]
  conflicts ExtensionSchemaConflict[] @relation("plugin1")
  conflictsAsPlugin2 ExtensionSchemaConflict[] @relation("plugin2")
  auditLogs ExtensionSchemaAuditLog[]
  tableMetadata ExtensionTableMetadata[]
  versionHistory ExtensionSchemaVersion[]
}

model ExtensionMigration {
  id String @id @default(cuid())
  pluginId String
  migrationId String
  version String
  migrationSql String
  rollbackSql String?
  checksumSchema String?
  checksumSql String?
  status ExtensionMigrationStatus @default(pending)
  executionStart DateTime?
  executionEnd DateTime?
  errorMessage String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  schema ExtensionSchema @relation(fields: [pluginId], references: [pluginId], onDelete: Cascade)
}

model ExtensionSchemaConflict {
  // Tracks conflicts between extension schemas
  id String @id @default(cuid())
  plugin1Id String
  plugin2Id String
  conflictType String
  item1 String?
  item2 String?
  message String
  severity ConflictSeverity @default(warning)
  resolved Boolean @default(false)
  resolvedAt DateTime?
  createdAt DateTime @default(now())
  plugin1 ExtensionSchema @relation("plugin1", fields: [plugin1Id], references: [pluginId], onDelete: Cascade)
  plugin2 ExtensionSchema @relation("plugin2", fields: [plugin2Id], references: [pluginId], onDelete: Cascade)
}

model ExtensionTableMetadata {
  // Tracks dynamically created extension tables
  id String @id @default(cuid())
  pluginId String
  tableName String
  displayName String?
  description String?
  namespace String
  fieldCount Int @default(0)
  indexCount Int @default(0)
  estimatedRows BigInt @default(0)
  estimatedSize BigInt @default(0)
  lastAnalyzedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  schema ExtensionSchema @relation(fields: [pluginId], references: [pluginId], onDelete: Cascade)
}
```

### Plugin Models:

```prisma
model Plugin {
  id String @id @default(cuid())
  pluginId String @unique
  name String
  version String
  description String?
  author String?
  manifest Json                    // Full manifest.json
  status PluginStatus @default(PENDING_APPROVAL)
  isActive Boolean @default(false)
  installedAt DateTime @default(now())
  installedBy String
  latestVersion String?
  updateAvailable Boolean @default(false)
  configuration Json?
  packageUrl String
  hooks PluginHook[]
  executions PluginExecution[]
  configurations PluginConfiguration[]
}

model PluginHook {
  id String @id @default(cuid())
  pluginId String
  hookType HookType
  hookPoint String                 // e.g., "workOrder.beforeCreate"
  priority Int @default(50)
  isAsync Boolean @default(false)
  timeout Int @default(5000)
  handlerFunction String
  isActive Boolean @default(true)
  lastExecutedAt DateTime?
  executionCount Int @default(0)
  errorCount Int @default(0)
}

model PluginConfiguration {
  id String @id @default(cuid())
  pluginId String
  key String
  value Json
  version Int @default(1)
  changedBy String
  changedAt DateTime @default(now())
  siteId String?
  companyId String?
  plugin Plugin @relation(fields: [pluginId], references: [id], onDelete: Cascade)
}

model PluginPackage {
  id String @id @default(cuid())
  registryId String
  pluginId String
  name String
  version String
  description String?
  author String?
  license String
  manifest Json
  packageUrl String
  packageSize BigInt
  checksum String
  apiVersion String
  mesVersion String
  permissions String[]
  dependencies Json?                // Dependency information
  status PluginPackageStatus
  uploadedBy String
  createdAt DateTime @default(now())
}

model PluginRegistry {
  id String @id @default(cuid())
  type String                       // ENTERPRISE | SITE | DEVELOPER
  name String
  storageUrl String
  storageBucket String?
  isDefault Boolean @default(false)
  enterpriseId String?
  siteId String?
  packages PluginPackage[]
  installations PluginInstallation[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PluginInstallation {
  id String @id @default(cuid())
  registryId String
  pluginId String
  version String
  status PluginInstallationStatus    // PENDING | INSTALLED | ACTIVE | FAILED | REMOVED
  targetType String                  // ENTERPRISE | SITE | LOCAL
  targetId String?
  installedAt DateTime?
  activatedAt DateTime?
  removedAt DateTime?
  installedBy String
  activatedBy String?
  errorMessage String?
  registry PluginRegistry @relation(fields: [registryId], references: [id], onDelete: Cascade)
  deployments PluginDeployment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 6. Existing Dependency and Compatibility Checking Code

### 6.1 Manifest Validation

**File**: `src/services/PluginValidationService.ts`

The system validates:
- Plugin ID format (alphanumeric and hyphens)
- Version format (SemVer)
- API version compatibility (SemVer range)
- MES version requirements (SemVer range)
- Hook point validity
- Permission validity
- Dependency format and SemVer ranges

**Missing**: Actual resolution logic for circular dependency detection and availability checks.

### 6.2 Extension Schema Conflict Detection

**File**: `src/services/ExtensionSchemaRegistry.ts`

```typescript
detectConflicts(schema: ExtensionDatabaseSchema): ConflictReport {
  // Checks for:
  // - Table name conflicts between plugins
  // - Enum name conflicts between plugins
  // - Duplicate field names within tables
  // - Field name conflicts across plugins
}
```

### 6.3 Migration Safety Checks

**File**: `src/services/ExtensionMigrationEngine.ts`

```typescript
async validateMigrationSafety(
  pluginId: string,
  migrations: string[],
  schema: ExtensionDatabaseSchema
): Promise<SafetyCheckResult> {
  // Checks for:
  // - Data loss operations (DROP TABLE, DROP COLUMN)
  // - Missing cascade delete specifications
  // - Performance issues (too many fields)
}
```

---

## 7. Where DependencyResolverService Should Be Added

### 7.1 Recommended Location

**File**: `/home/tony/GitHub/MachShop3/src/services/DependencyResolverService.ts`

### 7.2 Integration Points

The service should integrate with:

1. **PluginRegistryService** - Before installation/activation
   - Resolve dependencies from registry
   - Check availability of required versions
   - Validate all dependencies are installable

2. **PluginValidationService** - During manifest validation
   - Detect circular dependencies
   - Validate version compatibility constraints
   - Check dependency graph feasibility

3. **PluginSystemService** - During plugin loading
   - Ensure all dependencies are loaded first
   - Validate runtime compatibility
   - Handle dependency load ordering

4. **Database** - Store dependency graph information
   - Track resolved dependencies
   - Store compatibility checks
   - Audit dependency changes

### 7.3 Key Responsibilities

The DependencyResolverService should:

1. **Resolve Dependencies**
   - Fetch dependency information from registry
   - Handle version ranges and constraints
   - Resolve transitive dependencies (recursive)

2. **Detect Issues**
   - Circular dependency detection
   - Version conflict detection
   - Unsatisfiable constraints

3. **Validate Compatibility**
   - API version compatibility
   - MES version requirements
   - Plugin compatibility constraints

4. **Generate Reports**
   - Dependency tree visualization
   - Conflict resolution recommendations
   - Installation order suggestions

---

## 8. Current Installation Flow

### 8.1 Plugin Installation Process (PluginRegistryService)

```
1. Submit Plugin Package
   ├─ Validate manifest (PluginValidationService)
   ├─ Check for duplicates
   └─ Create PENDING_REVIEW record

2. Approve Plugin
   ├─ Review permissions
   ├─ Verify integrity (checksum)
   └─ Mark as APPROVED

3. Install Plugin
   ├─ Validate manifest again
   ├─ Execute database migrations (if any)
   ├─ Register hooks
   ├─ Create configuration records
   └─ Update Plugin status to INSTALLED

4. Activate Plugin
   ├─ Load plugin code
   ├─ Register all hooks
   ├─ Initialize configuration
   └─ Mark as ACTIVE
```

### 8.2 Extension Schema Registration Flow

```
1. Register Schema
   ├─ Validate schema structure
   ├─ Check for conflicts with existing schemas
   ├─ Store schema definition
   └─ Create audit log

2. Generate Migrations
   ├─ Compare with previous version
   ├─ Generate CREATE/ALTER statements
   └─ Validate safety

3. Execute Migrations
   ├─ Perform safety checks
   ├─ Calculate checksums
   ├─ Execute in transaction
   └─ Update migration record

4. Activate Schema
   ├─ Update status to 'active'
   ├─ Register Prisma models
   └─ Invalidate schema cache
```

---

## 9. Summary of Key Findings

### What Exists
- Comprehensive extension schema framework with migrations and safety checks
- Plugin manifest validation with basic dependency format checking
- Schema conflict detection between plugins
- Migration safety validation (data loss, constraints)
- Audit logging for all extension operations
- Prisma integration for dynamic schema generation
- Hook-based plugin execution system
- Plugin registry with approval workflow

### What's Missing
- Dependency resolution algorithm (graph-based)
- Circular dependency detection
- Transitive dependency handling
- Version conflict resolution
- Dependency availability verification
- Dependency compatibility validation
- Installation order planning
- Rollback strategy for dependency failures

### Integration Opportunities
1. Enhance PluginValidationService with circular dependency detection
2. Add DependencyResolverService for graph-based resolution
3. Extend PluginRegistryService to check dependencies before installation
4. Update PluginSystemService to enforce dependency loading order
5. Add dependency information to audit logs and reporting

---

## 10. Recommended DependencyResolverService Structure

```typescript
export class DependencyResolverService {
  /**
   * Resolve all dependencies for a plugin
   */
  async resolveDependencies(
    pluginId: string,
    version: string,
    registry: PluginRegistry
  ): Promise<DependencyResolutionResult>

  /**
   * Check for circular dependencies
   */
  detectCircularDependencies(
    pluginId: string,
    dependencyGraph: DependencyGraph
  ): CircularDependencyReport

  /**
   * Validate version constraints
   */
  validateVersionConstraints(
    dependencies: Record<string, string>,
    availableVersions: Record<string, string[]>
  ): ConstraintValidationResult

  /**
   * Get installation order for dependencies
   */
  getInstallationOrder(
    pluginId: string,
    resolvedDependencies: ResolvedDependency[]
  ): InstallationOrder

  /**
   * Check compatibility
   */
  checkCompatibility(
    plugin: Plugin,
    resolvedDependencies: ResolvedDependency[]
  ): CompatibilityCheckResult
}
```

---

## File Locations Summary

| Component | Location |
|-----------|----------|
| Extension Schema Types | `/home/tony/GitHub/MachShop3/src/types/extensionSchema.ts` |
| Extension Schema Registry | `/home/tony/GitHub/MachShop3/src/services/ExtensionSchemaRegistry.ts` |
| Extension Migration Engine | `/home/tony/GitHub/MachShop3/src/services/ExtensionMigrationEngine.ts` |
| Extension Data Safety | `/home/tony/GitHub/MachShop3/src/services/ExtensionDataSafety.ts` |
| Extension Prisma Integration | `/home/tony/GitHub/MachShop3/src/services/ExtensionPrismaIntegration.ts` |
| Plugin System Service | `/home/tony/GitHub/MachShop3/src/services/PluginSystemService.ts` |
| Plugin Registry Service | `/home/tony/GitHub/MachShop3/src/services/PluginRegistryService.ts` |
| Plugin Validation Service | `/home/tony/GitHub/MachShop3/src/services/PluginValidationService.ts` |
| Plugin SDK | `/home/tony/GitHub/MachShop3/src/sdk/PluginSDK.ts` |
| Database Schema | `/home/tony/GitHub/MachShop3/prisma/schema.prisma` |
| **DependencyResolverService (TO CREATE)** | `/home/tony/GitHub/MachShop3/src/services/DependencyResolverService.ts` |

