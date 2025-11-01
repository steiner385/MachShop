# Plugin Registry & Enterprise Distribution System

**Issue #79: Private Plugin Registry & Enterprise Distribution System**

Comprehensive documentation for the centralized plugin management and distribution system enabling enterprise-wide plugin deployment with approval workflows, licensing, and multi-site management.

## System Overview

The Plugin Registry System provides:
- **Central Plugin Marketplace**: Private registry for approved plugins
- **Approval Workflow**: Security review and validation before deployment
- **Multi-Site Management**: Deploy to multiple sites simultaneously
- **License Management**: Support for FREE, TRIAL, SITE, and ENTERPRISE licenses
- **Version Management**: Semantic versioning with dependency resolution
- **Health Monitoring**: Track plugin health metrics across installations
- **Deployment Tracking**: Monitor and rollback multi-site deployments

## Architecture

### Data Models

The system is built on 9 interconnected Prisma models:

#### PluginRegistry
- Centralized or site-specific plugin stores
- Types: ENTERPRISE (central), SITE (local), DEVELOPER (development)
- Storage configuration for plugin packages (S3, Azure Blob, MinIO)

#### PluginPackage
- Specific version of a plugin in a registry
- Status tracking: PENDING_REVIEW → IN_REVIEW → APPROVED (or REJECTED/REVOKED)
- Manifest storage with full metadata
- Package integrity via SHA-256 checksums
- Download and installation statistics

#### PluginInstallation
- Tracks installed plugins per site
- Status: INSTALLING → INSTALLED → ACTIVE (or INACTIVE/FAILED/UNINSTALLED)
- Configuration storage per installation
- License key and expiration tracking
- Health tracking with error counts

#### PluginHealthLog
- Historical health metrics (CPU, memory, execution time)
- Error and warning counts
- Used for performance monitoring and troubleshooting

#### PluginLicense
- License key generation and tracking
- Types: FREE, TRIAL, SITE, ENTERPRISE, DEVELOPER
- Installation limits (maxInstallations)
- Expiration tracking

#### PluginReview
- Internal vetting and ratings
- 1-5 star ratings
- Comments from reviewers
- Approval tracking for internal validation

#### PluginDeployment
- Multi-site deployment orchestration
- Types: INSTALL, UPGRADE, ROLLBACK, UNINSTALL
- Status tracking with success/failure counts
- Scheduled deployment support
- Rollback capability

#### PluginSubmission
- Tracks plugin submissions for approval
- Audit trail for submissions

### Services

#### PluginRegistryService (400+ lines)

Core business logic for plugin management:

```typescript
// Plugin Submission & Approval Workflow
submitPlugin()      // Submit for approval
approvePlugin()     // Approve for installation
rejectPlugin()      // Reject with reason
revokePlugin()      // Revoke due to security

// Installation Management
installPlugin()     // Install plugin at site
activatePlugin()    // Activate installed plugin
uninstallPlugin()   // Remove plugin

// Versioning & Upgrades
upgradePlugin()     // Upgrade to newer version
resolveDependencies() // Transitive dependency resolution

// Deployment & Health
deployToSites()     // Multi-site deployment
recordHealth()      // Track health metrics
getInstallationStatus() // Check status

// Catalog
getPluginCatalog()  // Browse available plugins
```

Key features:
- **Semantic Versioning**: SemVer validation for all versions
- **Dependency Resolution**: Transitive dependencies with conflict detection
- **License Validation**: Ensures licenses before installation
- **Health Metrics**: CPU, memory, execution time tracking

#### PluginValidationService (350+ lines)

Comprehensive validation for plugin security and compatibility:

```typescript
// Manifest Validation
validateManifest()  // 19-point manifest validation

// Package Integrity
verifyPackageIntegrity()  // SHA-256 verification
calculateChecksum()       // Generate checksums

// Security Analysis
analyzePermissions()      // Risk level analysis
securityScan()           // Scan for vulnerabilities

// Compatibility Checking
checkApiVersionCompatibility()  // API version matching
checkMesVersionCompatibility()  // MES version range checking

// Unified Validation
validatePlugin()   // Comprehensive validation
```

Validation checks:
- Manifest structure and required fields
- Semantic versioning compliance
- Hook point validation against known hooks
- Permission risk analysis
- API/MES version compatibility
- Security scanning for suspicious patterns

### Admin API Routes

**15 new endpoints** for plugin management:

#### Package Management (Central IT)
```
GET    /admin/plugin-registry/packages          List all packages
POST   /admin/plugin-registry/packages          Submit package
GET    /admin/plugin-registry/packages/:id      View package details
PUT    /admin/plugin-registry/packages/:id/approve   Approve
PUT    /admin/plugin-registry/packages/:id/reject    Reject
PUT    /admin/plugin-registry/packages/:id/revoke    Revoke
```

#### Installation Management (Site Admin)
```
GET    /admin/plugins/installed                 List installations
POST   /admin/plugins/install                   Install plugin
POST   /admin/plugins/:id/activate              Activate
POST   /admin/plugins/:id/deactivate            Deactivate
DELETE /admin/plugins/:id                       Uninstall
```

#### Multi-Site Deployment
```
POST   /admin/plugin-registry/deploy            Deploy to sites
GET    /admin/plugin-registry/deployments       List deployments
GET    /admin/plugin-registry/deployments/:id   View deployment
```

#### Health & Monitoring
```
GET    /admin/plugins/:id/health                Check health
POST   /admin/plugins/:id/health                Record metrics
```

## Workflow: Plugin Submission to Installation

### 1. Plugin Submission (Developer)
```
POST /admin/plugin-registry/packages
{
  "registryId": "enterprise-registry",
  "pluginId": "supplier-risk-analyzer",
  "version": "1.0.0",
  "manifest": { ... },
  "packageUrl": "https://s3.../plugin.mpk",
  "checksum": "sha256..."
}
```

**Actions:**
- Validate manifest (19 checks)
- Verify package integrity
- Analyze permissions
- Scan for security issues
- Create PluginPackage in PENDING_REVIEW status
- Send for admin approval

### 2. Central IT Review & Approval
```
PUT /admin/plugin-registry/packages/{id}/approve
```

**Actions:**
- Review validation report
- Approve or reject submission
- If approved: status → APPROVED
- If rejected: status → REJECTED (with reason)

### 3. Site Admin Installation
```
POST /admin/plugins/install
{
  "packageId": "pkg-xyz",
  "configuration": { ... }
}
```

**Actions:**
- Verify plugin is APPROVED
- Check MES version compatibility
- Resolve dependencies (transitive install)
- Validate licenses
- Create PluginInstallation in INSTALLING status
- Perform installation
- Update status to INSTALLED

### 4. Plugin Activation
```
POST /admin/plugins/{installationId}/activate
```

**Actions:**
- Check status is INSTALLED
- Activate plugin
- status → ACTIVE
- activatedAt timestamp

### 5. Health Monitoring
```
POST /admin/plugins/{installationId}/health
{
  "errorCount": 0,
  "warningCount": 2,
  "avgExecutionTime": 150,
  "memoryUsage": 256,
  "cpuUsage": 15.5
}
```

**Actions:**
- Record metrics
- Update installation health
- Store in PluginHealthLog for history

## Features

### Dependency Resolution

Plugins can declare dependencies with version ranges:

```json
{
  "dependencies": {
    "supplier-db": "^2.0.0",
    "data-sync": ">=1.5.0,<3.0.0"
  }
}
```

**Resolution Process:**
1. Check for approved versions of each dependency
2. Find compatible version matching range
3. Check if already installed
4. If not installed, recursively install dependency
5. Return list of resolved dependencies

### Version Management

Upgrade with SemVer validation:

```typescript
await upgradePlugin(currentInstallationId, newPackageId)
```

**Validation:**
- newVersion > currentVersion (SemVer comparison)
- Preserve configuration unless overridden
- Create new installation with new package
- Mark old installation as INACTIVE
- Update install counts

### Multi-Site Deployment

Deploy plugin to multiple sites:

```typescript
POST /admin/plugin-registry/deploy
{
  "packageId": "pkg-xyz",
  "siteIds": ["site-1", "site-2", "site-3"],
  "deploymentType": "INSTALL",
  "scheduledFor": "2024-11-01T00:00:00Z"
}
```

**Features:**
- Schedule deployments for specific time
- Track success/failure per site
- Rollback capability
- Deployment status monitoring

### License Management

Support multiple license models:

```typescript
enum PluginLicenseType {
  FREE        // No license needed
  TRIAL       // Temporary trial
  SITE        // Per-site license
  ENTERPRISE  // All sites
  DEVELOPER   // Development only
}
```

**License Validation:**
- Check maxInstallations limit
- Verify expiration dates
- Enforce scope (site-level vs enterprise-level)

### Health Monitoring

Track plugin performance:

```typescript
// Metrics tracked:
- errorCount (errors encountered)
- warningCount (warnings logged)
- avgExecutionTime (milliseconds)
- memoryUsage (MB)
- cpuUsage (percentage)
```

## Security Considerations

### Permission Risk Analysis

```typescript
// High-risk permissions
- 'users:write'
- 'configuration:write'
- 'audit_logs:read'

// Medium-risk permissions
- 'materials:write'
- 'equipment:write'
- 'reports:write'
```

### Package Integrity

- SHA-256 checksums verify package hasn't been tampered with
- Computed on upload, verified on download
- Prevents Man-in-the-Middle attacks

### Revocation

Compromised plugins can be revoked:

```typescript
PUT /admin/plugin-registry/packages/{id}/revoke
{
  "reason": "Security vulnerability CVE-2024-XXXX"
}
```

All installations receive revocation notification and should be deactivated.

## Future Enhancements

Phase 6-9 (Future Iterations):

### Phase 6-7: Frontend UI
- Plugin Catalog page (browse available plugins)
- Installation wizard
- Configuration UI
- Health dashboard

### Phase 8: Advanced Features
- Sandbox execution environment for plugins
- API rate limiting per plugin
- Plugin marketplace with ratings/reviews
- Automatic update checks

### Phase 9: Production Features
- Comprehensive test suite
- Performance benchmarking
- Load testing
- Documentation automation
- Metrics export

## API Reference

### Request/Response Examples

**Submit Plugin:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/plugin-registry/packages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "registryId": "enterprise",
    "pluginId": "my-plugin",
    "version": "1.0.0",
    "manifest": { ... },
    "packageUrl": "https://s3.../my-plugin-1.0.0.mpk",
    "checksum": "abc123..."
  }'
```

**Response:**
```json
{
  "data": {
    "id": "pkg-xyz",
    "pluginId": "my-plugin",
    "version": "1.0.0",
    "status": "PENDING_REVIEW",
    "uploadedBy": "developer@company.com",
    "uploadedAt": "2024-11-01T10:00:00Z"
  },
  "message": "Plugin submitted for approval",
  "warnings": [...],
  "securityFindings": [...]
}
```

**Install Plugin:**
```bash
curl -X POST http://localhost:3000/api/v1/admin/plugins/install \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "pkg-xyz",
    "configuration": {
      "apiUrl": "https://external.api.com",
      "timeout": 5000
    }
  }'
```

**Response:**
```json
{
  "data": {
    "id": "inst-abc",
    "packageId": "pkg-xyz",
    "siteId": "site-1",
    "status": "INSTALLED",
    "installedVersion": "1.0.0",
    "installedAt": "2024-11-01T10:05:00Z"
  },
  "message": "Plugin installed successfully"
}
```

## Database Schema

```
plugin_registries
├── type (ENTERPRISE, SITE, DEVELOPER)
├── name, storageUrl, storageBucket
├── enterpriseId, siteId
└── isActive

plugin_packages
├── pluginId, version (unique)
├── manifest, packageUrl, checksum
├── status (PENDING_REVIEW → APPROVED)
├── permissions[], dependencies
├── downloadCount, installCount
└── registryId FK

plugin_installations
├── packageId FK, siteId FK
├── status (INSTALLING → ACTIVE)
├── configuration (JSON)
├── errorCount, licenseKey, licenseExpires
└── activatedAt, deactivatedAt

plugin_licenses
├── packageId FK
├── licenseKey (unique)
├── licenseType (FREE, TRIAL, SITE, ENTERPRISE)
├── maxInstallations, expiresAt
└── isActive

plugin_health_logs
├── installationId FK
├── errorCount, warningCount
├── avgExecutionTime, memoryUsage, cpuUsage
└── recordedAt

plugin_deployments
├── packageId FK
├── deploymentType (INSTALL, UPGRADE, ROLLBACK)
├── status (SCHEDULED → COMPLETED)
├── targetSites[], successCount, failureCount
└── canRollback, rolledBackAt

plugin_reviews
├── packageId FK
├── rating (1-5)
├── reviewerId, siteId
└── isApproved

plugin_submissions
├── pluginId, version
├── manifest, packageUrl, checksum
└── submittedBy, submittedAt
```

## Code Statistics

- **Data Models**: 9 Prisma models with comprehensive relationships
- **Services**: 750+ lines (PluginRegistryService + PluginValidationService)
- **Admin Routes**: 640 lines (15 endpoints)
- **Database Migration**: Complete schema with indexes
- **Tests**: Ready for unit/integration testing

## Getting Started

### For Plugin Developers
1. Review [PLUGIN_SYSTEM_README.md](./PLUGIN_SYSTEM_README.md) for SDK
2. Create plugin following manifest specification
3. Package as .mpk (tar.gz format)
4. Submit via `/admin/plugin-registry/packages` endpoint
5. Monitor approval status

### For Site Administrators
1. Browse approved plugins via `/admin/plugin-registry/packages`
2. Review compatibility and requirements
3. Click "Install" to deploy to your site
4. Monitor health metrics in dashboard
5. Manage configuration and licenses

### For Central IT
1. Review submitted plugins in admin dashboard
2. Check validation report and security findings
3. Approve or reject with feedback
4. Monitor deployments across enterprise
5. Revoke compromised plugins immediately

## Next Steps

Future phases will implement:
- Frontend UI for plugin management
- Plugin marketplace with ratings
- Sandbox execution environment
- Automated testing and validation
- Performance benchmarking
- Comprehensive test suite
