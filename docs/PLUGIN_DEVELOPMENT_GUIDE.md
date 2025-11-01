# Plugin Development Best Practices Guide

## Overview

This guide establishes standards and best practices for developing plugins for the MachShop platform. All plugins must adhere to these standards to ensure security, reliability, compatibility, and optimal performance within the MachShop ecosystem.

## Table of Contents

1. [Plugin System Architecture](#plugin-system-architecture)
2. [Plugin Manifest Specification](#plugin-manifest-specification)
3. [Plugin Package Format](#plugin-package-format)
4. [Development Setup](#development-setup)
5. [Plugin Entry Point](#plugin-entry-point)
6. [Hook System](#hook-system)
7. [Permissions System](#permissions-system)
8. [Configuration Management](#configuration-management)
9. [Dependency Management](#dependency-management)
10. [API Access & Authentication](#api-access--authentication)
11. [Data Storage](#data-storage)
12. [Error Handling](#error-handling)
13. [Logging](#logging)
14. [Performance Optimization](#performance-optimization)
15. [Testing](#testing)
16. [Security Considerations](#security-considerations)
17. [Deployment & Installation](#deployment--installation)
18. [Plugin Versioning & Updates](#plugin-versioning--updates)
19. [Troubleshooting](#troubleshooting)

---

## Plugin System Architecture

### Plugin Lifecycle

Plugins follow a well-defined lifecycle from submission to deployment:

1. **SUBMITTED** - Developer submits plugin to registry
2. **PENDING_REVIEW** - Automated security scan and manual review
3. **APPROVED** or **REJECTED** - Review completion
4. **INSTALLABLE** - Available in plugin catalog for installation
5. **INSTALLED** - Installed at specific site
6. **ACTIVATED** - Plugin is active and running
7. **DEACTIVATED** - Plugin disabled but can be reactivated
8. **UNINSTALLED** - Removed from site

### Plugin Registries

Three levels of plugin registries:

1. **Enterprise Registry** (Central IT)
   - Shared across entire organization
   - Managed by IT admin team
   - Pre-approved, vetted plugins

2. **Site Registry** (Site Admin)
   - Specific to individual manufacturing site
   - Managed by site administrator
   - Mix of approved and custom plugins

3. **Developer Registry** (Development)
   - For development and testing only
   - No submission/approval required

---

## Plugin Manifest Specification

### manifest.json

Every plugin must include a manifest.json file at the root with required metadata.

### Manifest Field Specifications

- **id**: Unique identifier (lowercase, alphanumeric + hyphens)
- **name**: Human-readable plugin name
- **version**: Semantic version (MAJOR.MINOR.PATCH)
- **author**: Plugin author name
- **license**: License type (MIT, Apache-2.0, GPL-3.0, etc.)
- **apiVersion**: Required MachShop API version
- **mesVersion**: Required MES/platform version range
- **permissions**: Required permissions (see Permission System)
- **hooks**: Hook points this plugin implements
- **configuration**: Configuration schema for plugin settings
- **dependencies**: Dependent plugins

---

## Plugin Package Format

### Package Structure

```
inventory-optimizer/
├── manifest.json              # Plugin manifest (REQUIRED)
├── README.md                  # Documentation (REQUIRED)
├── LICENSE                    # License file
├── package.json               # npm package definition
├── src/
│   ├── index.ts               # Entry point
│   ├── hooks/
│   ├── config/
│   ├── services/
│   └── utils/
├── dist/                      # Compiled output
├── tests/
├── tsconfig.json
└── jest.config.js
```

---

## Plugin Entry Point

### index.ts Structure

Every plugin must export a default class that implements the plugin lifecycle:

- `onInstall()` - Initialize plugin
- `onActivate()` - Start plugin operations
- `onDeactivate()` - Stop plugin operations
- `onUninstall()` - Clean up resources

---

## Hook System

### Supported Hooks

The plugin system supports the following hook points:

**Work Order Hooks**
- workOrder.beforeCreate
- workOrder.afterCreate
- workOrder.beforeUpdate
- workOrder.afterUpdate
- workOrder.beforeComplete
- workOrder.afterComplete

**Material Hooks**
- material.beforeCreate
- material.afterCreate
- material.beforeConsume
- material.afterConsume

**System Hooks**
- external.sync
- notification.send
- dashboard.render
- report.generate

---

## Permissions System

### Permission Levels

Plugins request permissions explicitly. Recommended levels:
- 1-3 permissions: Very restricted, low risk
- 4-6 permissions: Limited access, acceptable
- 7-10 permissions: Significant access, requires review
- 11+ permissions: High risk, extensive access

### Permission Format

Permissions follow: RESOURCE:ACTION format
- work_orders:read, work_orders:write, work_orders:delete
- materials:read, materials:write
- users:read, users:write
- admin:access, system:configure

---

## Configuration Management

### Plugin Configuration

Plugins define configuration schema in manifest.json with types:
- string, number, boolean, array, object

### Runtime Configuration

Access configuration via context.getConfig() and update via context.setConfig().

All configuration must have defaults and validation rules.

---

## Dependency Management

### Plugin Dependencies

Plugins can depend on other plugins. Dependencies must be:
- Explicitly declared in manifest.json
- Verified at install time
- Version compatible (SemVer ranges)

Check dependencies are resolved before using them.

---

## API Access & Authentication

### Using MachShop APIs

Access MachShop APIs through context.api:
- context.api.workOrders
- context.api.materials
- context.api.equipment
- context.api.notifications

All API calls are automatically authenticated with plugin's token.

### Error Handling for API Calls

Handle different error types appropriately:
- 401: Authentication failed
- 403: Permission denied
- 429: Rate limit exceeded
- 500+: Server errors

---

## Data Storage

### Plugin-Specific Storage

Use context.storage for persistent plugin data:
- context.storage.get(key)
- context.storage.set(key, value)
- context.storage.delete(key)

Do NOT use:
- Global or external storage
- File system access
- Direct database connections

---

## Error Handling

### Plugin-Specific Error Classes

Define custom error classes extending PluginError:
- ConfigurationError
- DependencyError
- PermissionError

Handle errors appropriately in hooks and API calls.

---

## Logging

### Structured Logging

Use context.logger for all logging:
- context.logger.info()
- context.logger.warn()
- context.logger.error()

Never log sensitive data like passwords, tokens, or PII.

---

## Performance Optimization

### Best Practices

- Use batching for bulk operations
- Implement caching with TTL
- Paginate large result sets
- Set appropriate timeouts
- Profile long-running operations

Avoid:
- Fetching all records without pagination
- Making individual API calls in loops
- Long blocking operations
- Memory leaks from unclosed connections

---

## Testing

### Unit Tests

Use Jest for unit testing plugin services and hooks.

Mock context.api and context.storage for isolation.

### Integration Tests

Test plugin installation, activation, and hook execution.

Verify integration with MachShop platform APIs.

---

## Security Considerations

### Code Security

- Validate all external input
- Sanitize user input before processing
- Never use eval() or dynamic code execution
- Validate external API calls

### Permission Best Practices

- Request only necessary permissions
- Check permissions in hooks before API calls
- Document why each permission is needed

### Dependency Validation

- Verify dependencies before using
- Check minimum version requirements
- Update dependencies regularly

---

## Deployment & Installation

### Submitting to Registry

1. Build and package plugin
2. Calculate checksum
3. Submit via API with manifest
4. Monitor review status
5. Publish when approved

### Installing at Site

1. Get available plugins from registry
2. Install with configuration
3. Activate plugin
4. Verify installation health

---

## Plugin Versioning & Updates

### Semantic Versioning

- MAJOR: Breaking changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes

### Migration Guide

Document breaking changes and migration steps for major versions.

---

## Troubleshooting

### Common Issues

**Plugin fails to install**
- Check manifest.json syntax
- Verify required fields
- Check file permissions

**Plugin crashes on activation**
- Check configuration validity
- Verify dependencies
- Review error logs

**High memory usage**
- Check for memory leaks
- Implement caching TTL
- Use batch processing

**Slow performance**
- Implement pagination
- Use caching
- Batch API calls
- Add database indexes

### Debug Mode

Enable debug logging in manifest.json and use context.logger.profile() for profiling.

