# Extension License Management Guide

Comprehensive guide for managing extension licenses, activation, validation, and compliance across multiple sites.

## Overview

The Extension License Management system enables:
- **Multiple License Types**: Perpetual, Subscription, Trial, Enterprise
- **Activation & Validation**: License key verification and status tracking
- **Usage Tracking**: Monitor feature usage against entitlements
- **Multi-Site Management**: License configuration across multiple sites
- **Compliance Tracking**: Ensure licenses are valid and compliant
- **Audit Logging**: Full audit trail of license operations

## Quick Start

### Initialize License Manager

```typescript
import { createLicenseManager } from '@machshop/extension-sdk/licensing';

const licenseManager = createLicenseManager();
```

### Activate a License

```typescript
const response = await licenseManager.activate({
  extensionId: 'my-extension',
  licenseKey: 'LICENSE-KEY-HERE',
  siteId: 'site-1',
  licensee: 'Company Inc'
});

if (response.success) {
  console.log('License activated:', response.license.id);
} else {
  console.error('Activation failed:', response.error);
}
```

### Validate License

```typescript
const validation = await licenseManager.validate(licenseId);

if (validation.valid) {
  console.log('License is valid');
  if (validation.expiresIn) {
    console.log(`Expires in ${validation.expiresIn} days`);
  }
} else {
  console.log('Validation errors:', validation.errors);
}
```

### Track Feature Usage

```typescript
// Increment advanced_features usage
await licenseManager.trackUsage(licenseId, 'advanced_features', 1);

// Check usage
const usage = licenseManager.getUsage(licenseId, 'advanced_features');
console.log(`Usage: ${usage?.current}/${usage?.limit}`);

if (usage?.exceeded) {
  console.warn('Feature usage limit exceeded');
}
```

### Check Entitlements

```typescript
// Check if extension has a feature
if (licenseManager.hasEntitlement(licenseId, 'premium_features')) {
  // Enable premium features
}
```

## License Types

### PERPETUAL
- One-time purchase
- No expiration
- Full feature access
- Best for: Single-purchase customers

### SUBSCRIPTION
- Time-based (annual, monthly)
- Auto-renewal capable
- Full feature access during valid period
- Best for: Ongoing relationships

### TRIAL
- Limited time evaluation
- Reduced features
- Auto-expires
- Best for: New customer evaluation

### ENTERPRISE
- Volume-based licensing
- Multiple sites support
- Custom entitlements
- Best for: Large organizations

## License Status

- **ACTIVE**: License is currently valid and active
- **INACTIVE**: License not activated or deactivated
- **EXPIRED**: License past expiration date
- **SUSPENDED**: License suspended due to violation
- **TRIAL_ENDED**: Trial period ended

## Entitlements

Entitlements define what features are included with a license:

```typescript
interface LicenseEntitlement {
  name: string;        // Feature name
  included: boolean;   // Is feature included?
  limit?: number;      // Usage limit (null = unlimited)
  usage?: number;      // Current usage
}
```

Default entitlements:
- `basic_features`: Basic functionality (included)
- `advanced_features`: Advanced capabilities (included, limit: 100)
- `premium_features`: Premium features (not included)
- `max_users`: Maximum concurrent users (included, limit: 10)

## Multi-Site Management

### Get Site Configuration

```typescript
const config = licenseManager.getSiteConfig('site-1');

console.log(`Licenses: ${config?.licenses.length}`);
console.log(`Total users: ${config?.totalUsers}`);
console.log(`Compliant: ${config?.compliant}`);
```

### Check Multi-Site Compliance

```typescript
const compliant = await licenseManager.checkMultiSiteCompliance(['site-1', 'site-2']);

if (!compliant) {
  console.warn('Not all sites have valid licenses');
}
```

## Deactivation

### Deactivate a License

```typescript
await licenseManager.deactivate(licenseId);
```

## Audit Logging

### Query Audit Logs

```typescript
const logs = await licenseManager.getAuditLogs({
  extensionId: 'my-extension',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(),
});

logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.action} [${log.statusAfter}]`);
});
```

## Best Practices

### 1. Validate Before Use

```typescript
// ✅ GOOD - Always validate before allowing features
const validation = await licenseManager.validate(licenseId);
if (!validation.valid) {
  throw new Error('License not valid');
}
enableFeatures();

// ❌ BAD - Assume license is valid
enableFeatures();
```

### 2. Track Usage Accurately

```typescript
// ✅ GOOD - Track usage immediately
await licenseManager.trackUsage(licenseId, 'feature_name', 1);

// ❌ BAD - Track usage later (may lose data)
// Usage tracking deferred...
```

### 3. Handle Expiration Gracefully

```typescript
// ✅ GOOD - Provide grace period and warnings
if (validation.expiresIn && validation.expiresIn < 30) {
  console.warn(`License expires in ${validation.expiresIn} days`);
}

// ❌ BAD - Abruptly disable features
if (validation.expiresIn === 0) {
  disableAllFeatures();
}
```

### 4. Monitor Entitlements

```typescript
// ✅ GOOD - Check entitlements before enabling features
if (licenseManager.hasEntitlement(licenseId, 'feature')) {
  enableFeature();
}

// ❌ BAD - Always enable features
enableFeature();
```

## Examples

### Complete License Workflow

```typescript
// 1. Activate license
const activation = await licenseManager.activate({
  extensionId: 'reporting-ext',
  licenseKey: 'LICENSE-KEY',
  siteId: 'site-1',
  licensee: 'Analytics Corp'
});

if (!activation.success) {
  throw new Error('Failed to activate license');
}

const licenseId = activation.license!.id;

// 2. Validate license
const validation = await licenseManager.validate(licenseId);
if (!validation.valid) {
  throw new Error('License validation failed');
}

// 3. Check entitlements
if (!licenseManager.hasEntitlement(licenseId, 'advanced_features')) {
  console.warn('Advanced features not included');
}

// 4. Track usage
await licenseManager.trackUsage(licenseId, 'advanced_features', 5);

// 5. Get usage
const usage = licenseManager.getUsage(licenseId, 'advanced_features');
if (usage?.exceeded) {
  console.warn(`Usage limit exceeded: ${usage.current}/${usage.limit}`);
}

// 6. Get site config
const config = licenseManager.getSiteConfig('site-1');
console.log(`Site compliance: ${config?.compliant}`);

// 7. Get audit logs
const logs = await licenseManager.getAuditLogs({ licenseId });
console.log(`License operations: ${logs.length}`);
```

---

For more information, see the [Extension SDK Documentation](./README.md).
