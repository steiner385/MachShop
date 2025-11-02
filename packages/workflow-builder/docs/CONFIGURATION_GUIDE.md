# Configuration Management Guide

Comprehensive guide for managing multi-site configurations in the Workflow Builder system.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Hierarchy](#configuration-hierarchy)
3. [Setting Up Configuration](#setting-up-configuration)
4. [Configuration Inheritance](#configuration-inheritance)
5. [Parameter Registration](#parameter-registration)
6. [Site Management](#site-management)
7. [Configuration Validation](#configuration-validation)
8. [Change Tracking](#change-tracking)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

## Overview

The configuration management system provides a three-level hierarchy for managing settings across your manufacturing operations:

- **Global**: Organization-wide defaults
- **Regional**: Region-specific overrides
- **Site**: Site-level customizations

Each level inherits from its parent, allowing flexible configuration while maintaining consistency.

## Configuration Hierarchy

### Level 1: Global Configuration

Organization-wide settings that apply to all sites and regions.

```
Global Config
├── timeout: 30000
├── max_workers: 100
├── retry_attempts: 3
└── ...
```

### Level 2: Regional Configuration

Region-specific overrides that apply to all sites in that region.

```
US-East Region
├── timeout: 25000 (overrides global)
├── max_workers: 100 (inherits from global)
└── ...

EU-West Region
├── timeout: 30000 (inherits from global)
├── max_workers: 50 (overrides global)
└── ...
```

### Level 3: Site Configuration

Site-specific customizations for individual locations.

```
Site: Factory-NY (US-East)
├── timeout: 20000 (overrides regional)
├── max_workers: 50 (overrides regional)
└── ...

Site: Factory-LA (US-West)
├── timeout: 30000 (inherits from regional)
├── max_workers: 75 (overrides regional)
└── ...
```

## Setting Up Configuration

### 1. Initialize the Service

```typescript
import { SiteConfigurationService } from '../services/SiteConfigurationService';

const configService = new SiteConfigurationService();
```

### 2. Register Configuration Parameters

Define the parameters your application needs:

```typescript
// Define parameter with validation
configService.registerParameter({
  key: 'max_workers',
  name: 'Maximum Workers',
  type: 'number',
  defaultValue: 100,
  description: 'Maximum number of concurrent workers per site',
  validation: (value: any) => typeof value === 'number' && value > 0 && value <= 1000,
  requiredAtLevel: 'site',
  category: 'Performance'
});

configService.registerParameter({
  key: 'timeout_ms',
  name: 'Timeout (milliseconds)',
  type: 'number',
  defaultValue: 30000,
  description: 'Request timeout in milliseconds',
  validation: (value: any) => typeof value === 'number' && value > 0,
  category: 'Performance'
});

configService.registerParameter({
  key: 'enable_logging',
  name: 'Enable Logging',
  type: 'boolean',
  defaultValue: true,
  description: 'Enable detailed logging for operations',
  category: 'Logging'
});

configService.registerParameter({
  key: 'log_level',
  name: 'Log Level',
  type: 'select',
  defaultValue: 'INFO',
  description: 'Logging level',
  options: [
    { value: 'DEBUG', label: 'Debug' },
    { value: 'INFO', label: 'Information' },
    { value: 'WARN', label: 'Warning' },
    { value: 'ERROR', label: 'Error' }
  ],
  category: 'Logging'
});
```

### 3. Create Sites

Define your manufacturing locations:

```typescript
// Create a site in US-East region
configService.createSite({
  id: 'factory-ny-001',
  name: 'New York Factory',
  location: 'New York, NY',
  region: 'US-East',
  environment: 'production',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: true,
  metadata: {
    capacity: 500,
    shifts: 3
  }
});

// Create another site in same region
configService.createSite({
  id: 'factory-boston-001',
  name: 'Boston Factory',
  location: 'Boston, MA',
  region: 'US-East',
  environment: 'production',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: true,
  metadata: {
    capacity: 300,
    shifts: 2
  }
});

// Create site in different region
configService.createSite({
  id: 'factory-la-001',
  name: 'Los Angeles Factory',
  location: 'Los Angeles, CA',
  region: 'US-West',
  environment: 'production',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: true,
  metadata: {
    capacity: 400,
    shifts: 2
  }
});
```

### 4. Set Configuration at Each Level

#### Set Global Configuration

```typescript
// Set organization-wide defaults
configService.setGlobalConfig('max_workers', 100, 'admin@company.com', 'Initial setup');
configService.setGlobalConfig('timeout_ms', 30000, 'admin@company.com', 'Standard timeout');
configService.setGlobalConfig('enable_logging', true, 'admin@company.com', 'Enable audit trail');
configService.setGlobalConfig('log_level', 'INFO', 'admin@company.com', 'Standard logging');
```

#### Set Regional Configuration

```typescript
// Override for US-East region (high capacity region)
configService.setRegionalConfig('US-East', 'max_workers', 150, 'manager-east@company.com', 'High capacity region');
configService.setRegionalConfig('US-East', 'timeout_ms', 25000, 'manager-east@company.com', 'Lower latency');

// Override for US-West region (lower capacity)
configService.setRegionalConfig('US-West', 'max_workers', 80, 'manager-west@company.com', 'Lower capacity region');
configService.setRegionalConfig('US-West', 'timeout_ms', 35000, 'manager-west@company.com', 'Higher latency tolerance');
```

#### Set Site Configuration

```typescript
// Custom config for high-performance NY factory
configService.setSiteConfig('factory-ny-001', 'max_workers', 200, 'tech-lead-ny@company.com', 'High capacity setup');
configService.setSiteConfig('factory-ny-001', 'log_level', 'DEBUG', 'tech-lead-ny@company.com', 'Detailed debugging');

// Standard config for Boston factory (uses regional config)
// No site-level overrides needed

// Custom config for LA factory
configService.setSiteConfig('factory-la-001', 'timeout_ms', 40000, 'tech-lead-la@company.com', 'Higher latency area');
```

## Configuration Inheritance

### How Inheritance Works

When retrieving configuration, the system checks in this order:

1. **Site-level** - Site-specific override
2. **Regional-level** - Region-specific override
3. **Global-level** - Organization-wide default

The first matching value is returned, creating an effective configuration.

### Example

Given the setup above:

```typescript
// Get configuration for NY factory
const maxWorkers = configService.getConfig('factory-ny-001', 'max_workers');
// Returns: 200 (site-level override)

const timeout = configService.getConfig('factory-ny-001', 'timeout_ms');
// Returns: 25000 (regional override from US-East)

// Get configuration for Boston factory
const maxWorkersBos = configService.getConfig('factory-boston-001', 'max_workers');
// Returns: 150 (regional override from US-East)

// Get configuration for LA factory
const maxWorkersLA = configService.getConfig('factory-la-001', 'max_workers');
// Returns: 80 (regional override from US-West)

const timeoutLA = configService.getConfig('factory-la-001', 'timeout_ms');
// Returns: 40000 (site-level override)
```

## Parameter Registration

### Types of Parameters

#### String Parameter

```typescript
configService.registerParameter({
  key: 'warehouse_location',
  name: 'Warehouse Location',
  type: 'string',
  defaultValue: 'Main',
  description: 'Primary warehouse location',
  validation: (value: any) => typeof value === 'string' && value.length > 0,
  category: 'Warehouse'
});

configService.setSiteConfig('site-001', 'warehouse_location', 'Secondary', 'user');
```

#### Number Parameter

```typescript
configService.registerParameter({
  key: 'batch_size',
  name: 'Batch Size',
  type: 'number',
  defaultValue: 1000,
  description: 'Default batch processing size',
  validation: (value: any) => typeof value === 'number' && value > 0 && value <= 10000,
  category: 'Processing'
});

configService.setSiteConfig('site-001', 'batch_size', 5000, 'user');
```

#### Boolean Parameter

```typescript
configService.registerParameter({
  key: 'enable_cache',
  name: 'Enable Caching',
  type: 'boolean',
  defaultValue: true,
  description: 'Enable result caching',
  category: 'Performance'
});

configService.setSiteConfig('site-001', 'enable_cache', false, 'user');
```

#### Select Parameter

```typescript
configService.registerParameter({
  key: 'environment_type',
  name: 'Environment Type',
  type: 'select',
  defaultValue: 'standard',
  options: [
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' }
  ],
  category: 'Setup'
});

configService.setSiteConfig('site-001', 'environment_type', 'premium', 'user');
```

#### JSON Parameter

```typescript
configService.registerParameter({
  key: 'advanced_settings',
  name: 'Advanced Settings',
  type: 'json',
  defaultValue: {},
  description: 'Advanced configuration options',
  validation: (value: any) => typeof value === 'object' && value !== null,
  category: 'Advanced'
});

configService.setSiteConfig('site-001', 'advanced_settings', {
  feature_flag_a: true,
  feature_flag_b: false,
  optimization_level: 2
}, 'user');
```

## Site Management

### Creating Sites

```typescript
const newSite = {
  id: 'factory-boston-002',
  name: 'Boston Factory 2',
  location: 'Boston, MA',
  region: 'US-East',
  environment: 'staging',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isActive: false, // Not yet active
  metadata: {
    capacity: 200,
    shifts: 1,
    purpose: 'Testing new processes'
  }
};

configService.createSite(newSite);
```

### Retrieving Sites

```typescript
// Get specific site
const site = configService.getSite('factory-ny-001');
console.log(site.name); // "New York Factory"

// Get all sites
const allSites = configService.getAllSites();
console.log(allSites.length); // 3

// Get sites by region
const eastSites = configService.getSitesByRegion('US-East');
console.log(eastSites.length); // 2
```

### Cloning Site Configuration

```typescript
// Clone configuration from production NY factory to Boston factory
const success = configService.cloneSiteConfig(
  'factory-ny-001',      // Source site
  'factory-boston-002',  // Target site
  'admin@company.com'    // Who is doing the cloning
);

if (success) {
  console.log('Configuration cloned successfully');

  // Verify configuration was cloned
  const bostonConfig = configService.getFullConfig('factory-boston-002');
  console.log('Timeout:', bostonConfig.timeout_ms); // 25000 (cloned from NY)
}
```

## Configuration Validation

### Validate Configuration

```typescript
// Validate configuration for a site
const validation = configService.validateConfig('factory-ny-001');

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  // Output: ["Missing required parameter: max_workers", ...]
} else {
  console.log('Configuration is valid');
}
```

### Handle Validation Errors

```typescript
const validation = configService.validateConfig('site-001');

if (!validation.valid) {
  // Fix each error
  validation.errors.forEach(error => {
    console.log('Error:', error);
    // Log to monitoring system
    // Notify administrator
  });
}
```

## Change Tracking

### View Configuration Changes

```typescript
// Get all changes to 'timeout_ms' parameter
const changes = configService.getChangeHistory({
  key: 'timeout_ms'
});

changes.forEach(change => {
  console.log(`${change.changedBy} changed ${change.key}`);
  console.log(`  Old value: ${change.oldValue}`);
  console.log(`  New value: ${change.newValue}`);
  console.log(`  Reason: ${change.reason}`);
  console.log(`  At: ${new Date(change.changedAt).toISOString()}`);
});
```

### Filter Changes

```typescript
// Get changes by site
const siteChanges = configService.getChangeHistory({
  siteId: 'factory-ny-001'
});

// Get changes by time range
const thisWeek = configService.getChangeHistory({
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  endTime: Date.now()
});

// Get regional changes
const regionalChanges = configService.getChangeHistory({
  scope: 'regional'
});
```

### Audit Trail

```typescript
// Create audit log
function createAuditEntry(change) {
  return {
    timestamp: change.changedAt,
    user: change.changedBy,
    action: 'config_change',
    resource: change.siteId || change.key,
    details: {
      parameter: change.key,
      scope: change.scope,
      oldValue: change.oldValue,
      newValue: change.newValue,
      reason: change.reason
    }
  };
}

// Log all changes
const changes = configService.getChangeHistory();
changes.forEach(change => {
  const entry = createAuditEntry(change);
  console.log(JSON.stringify(entry));
  // Send to audit logging system
});
```

## Best Practices

### 1. Configuration Organization

```typescript
// Good: Group related parameters by category
configService.registerParameter({
  key: 'max_workers',
  name: 'Maximum Workers',
  type: 'number',
  category: 'Performance',
  // ...
});

configService.registerParameter({
  key: 'cache_size_mb',
  name: 'Cache Size (MB)',
  type: 'number',
  category: 'Performance',
  // ...
});

// Bad: No categorization
configService.registerParameter({
  key: 'setting1',
  name: 'Setting 1',
  type: 'string',
  // Missing category
});
```

### 2. Validation Rules

```typescript
// Good: Comprehensive validation
configService.registerParameter({
  key: 'worker_count',
  name: 'Worker Count',
  type: 'number',
  validation: (value: any) => {
    return typeof value === 'number' &&
           value >= 1 &&
           value <= 1000 &&
           Number.isInteger(value);
  },
  // ...
});

// Bad: No validation
configService.registerParameter({
  key: 'worker_count',
  name: 'Worker Count',
  type: 'number',
  // No validation function
});
```

### 3. Required Parameters

```typescript
// Good: Mark critical parameters as required
configService.registerParameter({
  key: 'database_url',
  name: 'Database URL',
  type: 'string',
  requiredAtLevel: 'site',  // Must be set at site level
  validation: (value: any) => /^postgres:\/\//.test(value),
  // ...
});

// Bad: No requirement specification
configService.registerParameter({
  key: 'database_url',
  name: 'Database URL',
  type: 'string',
  // Not marked as required
});
```

### 4. Change Documentation

```typescript
// Good: Include reason for changes
configService.setRegionalConfig(
  'US-East',
  'timeout_ms',
  20000,
  'operations@company.com',
  'Reduced timeout to improve response time per perf analysis'
);

// Bad: No explanation
configService.setRegionalConfig(
  'US-East',
  'timeout_ms',
  20000,
  'operations@company.com'
  // Missing reason
);
```

### 5. Configuration Export/Import

```typescript
// Good: Regular backups
function backupConfiguration(siteId: string) {
  const config = configService.getFullConfig(siteId);
  const backup = {
    timestamp: Date.now(),
    siteId: siteId,
    configuration: config
  };

  // Save to secure storage
  return JSON.stringify(backup);
}

// Export and import complete configuration
function migrateConfiguration(sourceSiteId: string, targetSiteId: string) {
  const sourceConfig = configService.getFullConfig(sourceSiteId);

  configService.importSiteConfig(
    targetSiteId,
    sourceConfig,
    'admin@company.com'
  );
}
```

## Examples

### Example 1: Manufacturing Facility Setup

```typescript
// Register parameters for manufacturing facility
const params = [
  { key: 'shift_duration_hours', type: 'number', defaultValue: 8 },
  { key: 'max_concurrent_jobs', type: 'number', defaultValue: 10 },
  { key: 'quality_check_enabled', type: 'boolean', defaultValue: true },
  { key: 'maintenance_window_start', type: 'string', defaultValue: '22:00' },
  { key: 'maintenance_window_end', type: 'string', defaultValue: '06:00' }
];

params.forEach(param => {
  configService.registerParameter({
    ...param,
    name: param.key.replace(/_/g, ' ').toUpperCase(),
    description: `Manufacturing parameter: ${param.key}`,
    category: 'Manufacturing'
  });
});

// Set global defaults
configService.setGlobalConfig('shift_duration_hours', 8, 'admin', 'Standard shift');
configService.setGlobalConfig('max_concurrent_jobs', 10, 'admin', 'System capacity');

// Override for high-volume region
configService.setRegionalConfig('US-East', 'max_concurrent_jobs', 20, 'manager', 'Higher capacity');

// Customize for specific high-speed facility
configService.setSiteConfig('factory-ny-001', 'max_concurrent_jobs', 30, 'tech', 'Ultra-high capacity');
```

### Example 2: Environment-Specific Configuration

```typescript
// Setup for development environment
if (process.env.NODE_ENV === 'development') {
  configService.setGlobalConfig('enable_logging', true, 'dev', 'Debug mode');
  configService.setGlobalConfig('log_level', 'DEBUG', 'dev', 'Detailed logs');
  configService.setGlobalConfig('timeout_ms', 60000, 'dev', 'Longer timeout for debugging');
}

// Setup for production
if (process.env.NODE_ENV === 'production') {
  configService.setGlobalConfig('enable_logging', false, 'ops', 'Production mode');
  configService.setGlobalConfig('log_level', 'WARN', 'ops', 'Log warnings only');
  configService.setGlobalConfig('timeout_ms', 10000, 'ops', 'Strict timeout');
}
```

### Example 3: A/B Testing Configuration

```typescript
// Setup A/B test variants
configService.setRegionalConfig('US-East', 'test_variant', 'A', 'qa', 'Running variant A');
configService.setRegionalConfig('US-West', 'test_variant', 'B', 'qa', 'Running variant B');

// Site-level overrides for specific testing
configService.setSiteConfig('factory-ny-001', 'test_variant', 'A-premium', 'qa', 'Testing premium variant');

// Check variant during execution
const variant = configService.getConfig('factory-ny-001', 'test_variant');
console.log(`Running test variant: ${variant.value}`);
```

---

## Summary

The configuration management system provides:
- ✓ Multi-level hierarchy (global → regional → site)
- ✓ Flexible parameter registration
- ✓ Type validation and enforcement
- ✓ Complete change tracking and audit trail
- ✓ Configuration export/import
- ✓ Site cloning and templating

Use these features to maintain consistent configurations across your manufacturing operations while allowing site-specific customizations.
