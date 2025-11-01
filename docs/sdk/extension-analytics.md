# Extension Analytics & Monitoring Service

**Issue #415 Implementation**

## Overview

The Extension Analytics & Monitoring Service provides comprehensive analytics and monitoring for the extension ecosystem, tracking usage metrics, performance characteristics, adoption, health, and providing insights into extension ecosystem health.

## Features

### 1. Usage Metrics Collection
- Activation and deactivation events
- User adoption rates
- Feature usage patterns
- Error tracking with metadata
- Performance alerts
- User feedback and ratings

### 2. Performance Monitoring
- Execution time per extension operation
- Latency percentiles (p50, p95, p99)
- Throughput (requests/second)
- Resource usage (memory, CPU, API calls)
- Error rates and types
- Uptime tracking

### 3. Health Monitoring
- Extension availability status
- Dependency health validation
- License validity checks
- Configuration validation
- Performance health assessment
- Integration health checks
- Resource limit compliance
- Alerting system for critical issues

### 4. Analytics Dashboards
- **Adoption Dashboard**: Which extensions deployed where, adoption trends
- **Performance Dashboard**: Latency, throughput, error rates per extension
- **Business Impact**: Time saved, quality improvements, ROI
- **Health Dashboard**: Error rates, resource usage, license status
- **Compliance Dashboard**: Audit trail, governance violations, security issues

### 5. Anomaly Detection
- Latency anomalies (>50% deviation)
- Error rate anomalies (>2x baseline)
- Resource usage anomalies (>30% deviation)
- Automatic severity classification
- Confidence scoring (0-100%)

### 6. Business Impact Metrics
- Time saved vs baseline (self-reported)
- Quality improvements (defects reduced)
- Efficiency gains (throughput improvements)
- Cost savings (labor reduction)
- User satisfaction (NPS, ratings)
- ROI calculation and payback period

## Architecture

### Core Components

```
Extension Analytics & Monitoring
├── ExtensionAnalyticsService
│   ├── recordUsageEvent()
│   ├── recordPerformanceMetrics()
│   ├── getUsageAnalytics()
│   ├── getPerformanceMetrics()
│   └── detectAnomalies()
│
├── ExtensionHealthCheckService
│   ├── performHealthCheck()
│   ├── checkAvailability()
│   ├── checkDependencyHealth()
│   ├── checkLicenseHealth()
│   ├── checkConfiguration()
│   ├── checkPerformanceHealth()
│   ├── checkIntegrationHealth()
│   ├── checkResourceHealth()
│   └── AlertingSystem
│
└── Supporting Infrastructure
    ├── Usage Event Recording
    ├── Performance Metrics Storage
    ├── Health Check Caching
    ├── Anomaly Detection
    └── Alert Management
```

## Data Models

### Extension Usage Event
```typescript
interface ExtensionUsageEvent {
  extensionId: string;
  extensionVersion: string;
  siteId: string;
  eventType: ExtensionEventType; // 10 types
  userId?: string;
  userRole?: string;
  featureName?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
```

### Performance Metric
```typescript
interface ExtensionPerformanceMetric {
  extensionId: string;
  siteId: string;
  periodStart: Date;
  periodEnd: Date;

  // Latency metrics
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;

  // Throughput metrics
  requestsPerSecond: number;
  totalRequests: number;

  // Error metrics
  errorRate: number;
  totalErrors: number;
  errorTypes: Record<string, number>;

  // Resource metrics
  avgMemoryMB: number;
  peakMemoryMB: number;
  avgCpuPercent: number;
  peakCpuPercent: number;
  apiCallCount: number;

  // Health
  uptime: number;
}
```

### Health Check Result
```typescript
interface ExtensionHealthCheck {
  extensionId: string;
  siteId: string;
  healthy: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;

  // Component health
  availability: number;
  dependencyHealth: boolean;
  licenseValid: boolean;
  configValid: boolean;
  integrationHealthy: boolean;
  resourcesWithinLimits: boolean;

  // Details
  lastCheckTime: Date;
  nextCheckTime?: Date;
  issues: HealthIssue[];
}
```

### Health Check Alert
```typescript
interface HealthCheckAlert {
  extensionId: string;
  siteId: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  suggestedAction?: string;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}
```

## API Reference

### Extension Analytics Service

#### Record Usage Event
```typescript
async recordUsageEvent(event: ExtensionUsageEvent): Promise<void>
```
Records an extension usage event for analytics.

**Parameters**:
- `event`: ExtensionUsageEvent with all event details

**Example**:
```typescript
await analyticsService.recordUsageEvent({
  extensionId: 'quality-dashboard',
  extensionVersion: '1.0.0',
  siteId: 'site-1',
  eventType: ExtensionEventType.FEATURE_USED,
  userId: 'user-123',
  featureName: 'defect-analysis',
  timestamp: new Date()
});
```

#### Record Performance Metrics
```typescript
async recordPerformanceMetrics(metric: ExtensionPerformanceMetric): Promise<void>
```
Records aggregated performance metrics and detects anomalies.

**Parameters**:
- `metric`: ExtensionPerformanceMetric with performance data

**Example**:
```typescript
await analyticsService.recordPerformanceMetrics({
  extensionId: 'quality-dashboard',
  siteId: 'site-1',
  periodStart: new Date('2024-01-01'),
  periodEnd: new Date('2024-01-02'),
  avgLatencyMs: 150,
  p50LatencyMs: 100,
  p95LatencyMs: 500,
  p99LatencyMs: 1000,
  maxLatencyMs: 2000,
  requestsPerSecond: 100,
  totalRequests: 8640000,
  errorRate: 0.5,
  // ... more metrics
});
```

#### Get Usage Analytics
```typescript
async getUsageAnalytics(
  extensionId: string,
  siteId: string,
  periodDays?: number
): Promise<ExtensionUsageAnalytics>
```
Retrieves usage analytics for an extension.

**Parameters**:
- `extensionId`: Extension identifier
- `siteId`: Site/deployment identifier
- `periodDays`: Analysis period (default: 30)

**Returns**: Adoption, feature usage, and trend analysis

#### Get Performance Metrics
```typescript
async getPerformanceMetrics(
  extensionId: string,
  siteId: string
): Promise<ExtensionPerformanceMetric | null>
```
Retrieves latest performance metrics (cached).

**Parameters**:
- `extensionId`: Extension identifier
- `siteId`: Site identifier

**Returns**: Latest performance metrics or null if none recorded

#### Get Recent Anomalies
```typescript
getRecentAnomalies(
  extensionId?: string,
  hours?: number
): AnomalyDetectionResult[]
```
Retrieves recently detected anomalies.

**Parameters**:
- `extensionId`: Optional filter by extension
- `hours`: Time window in hours (default: 24)

**Returns**: Array of anomaly detection results

### Extension Health Check Service

#### Perform Health Check
```typescript
async performHealthCheck(
  extensionId: string,
  siteId: string,
  config?: HealthCheckConfig
): Promise<ExtensionHealthCheck>
```
Performs comprehensive health check for an extension.

**Parameters**:
- `extensionId`: Extension identifier
- `siteId`: Site identifier
- `config`: Optional health check configuration

**Returns**: Complete health check result with issues and severity

**Configuration Options**:
```typescript
interface HealthCheckConfig {
  checkIntervalMinutes?: number; // Cache interval (default: 5)
  licenseExpiryWarningDaysBefore?: number; // License warning (default: 30)
  errorRateThresholdPercent?: number; // Error rate threshold (default: 5%)
  latencyThresholdMs?: number; // Latency threshold (default: 5000ms)
  memoryThresholdMB?: number; // Memory threshold (default: 2048MB)
  cpuThresholdPercent?: number; // CPU threshold (default: 80%)
}
```

**Example**:
```typescript
const health = await healthService.performHealthCheck('quality-dashboard', 'site-1', {
  latencyThresholdMs: 3000,
  errorRateThresholdPercent: 2,
  memoryThresholdMB: 1024,
  cpuThresholdPercent: 75
});

if (!health.healthy) {
  health.issues.forEach(issue => {
    console.warn(`${issue.type}: ${issue.message}`);
    if (issue.suggestedAction) {
      console.info(`Action: ${issue.suggestedAction}`);
    }
  });
}
```

#### Get Recent Alerts
```typescript
getRecentAlerts(
  extensionId?: string,
  hours?: number,
  severity?: 'critical' | 'warning' | 'info'
): HealthCheckAlert[]
```
Retrieves recent health check alerts.

**Parameters**:
- `extensionId`: Optional filter by extension
- `hours`: Time window in hours (default: 24)
- `severity`: Optional severity filter

**Returns**: Array of health check alerts

#### Acknowledge Alert
```typescript
async acknowledgeAlert(
  alertIndex: number,
  acknowledgedBy: string
): Promise<HealthCheckAlert | null>
```
Acknowledges a health check alert.

**Parameters**:
- `alertIndex`: Index of alert in recent alerts array
- `acknowledgedBy`: User acknowledging the alert

**Returns**: Acknowledged alert or null if index invalid

#### Get Unacknowledged Critical Alerts
```typescript
getUnacknowledgedCriticalAlerts(): HealthCheckAlert[]
```
Retrieves all unacknowledged critical alerts.

**Returns**: Array of unacknowledged critical alerts

## Usage Examples

### Recording Extension Usage

```typescript
import { ExtensionAnalyticsService, ExtensionEventType } from '../services/ExtensionAnalyticsService';

const analyticsService = new ExtensionAnalyticsService(prisma, logger);

// Record activation
await analyticsService.recordUsageEvent({
  extensionId: 'quality-dashboard',
  extensionVersion: '1.0.0',
  siteId: 'facility-1',
  eventType: ExtensionEventType.ACTIVATION,
  userId: 'admin-1',
  timestamp: new Date()
});

// Record feature usage
await analyticsService.recordUsageEvent({
  extensionId: 'quality-dashboard',
  extensionVersion: '1.0.0',
  siteId: 'facility-1',
  eventType: ExtensionEventType.FEATURE_USED,
  userId: 'user-1',
  userRole: 'quality-engineer',
  featureName: 'defect-analysis',
  metadata: {
    view: 'real-time-metrics',
    filters: ['line-1', 'shift-a'],
    resultCount: 42
  },
  timestamp: new Date()
});

// Record errors
await analyticsService.recordUsageEvent({
  extensionId: 'quality-dashboard',
  extensionVersion: '1.0.0',
  siteId: 'facility-1',
  eventType: ExtensionEventType.ERROR_OCCURRED,
  userId: 'user-1',
  metadata: {
    errorCode: 'TIMEOUT',
    errorMessage: 'Database query timeout after 30s',
    query: 'SELECT FROM defects WHERE...',
    affectedOperation: 'fetch-metrics'
  },
  timestamp: new Date()
});
```

### Monitoring Performance

```typescript
// Record performance metrics periodically (e.g., every minute)
await analyticsService.recordPerformanceMetrics({
  extensionId: 'quality-dashboard',
  siteId: 'facility-1',
  periodStart: new Date(Date.now() - 60000), // 1 minute ago
  periodEnd: new Date(),
  avgLatencyMs: 245,
  p50LatencyMs: 180,
  p95LatencyMs: 850,
  p99LatencyMs: 2100,
  maxLatencyMs: 5200,
  requestsPerSecond: 85,
  totalRequests: 5100,
  errorRate: 1.2,
  totalErrors: 61,
  errorTypes: {
    timeout: 35,
    network: 18,
    validation: 8
  },
  avgMemoryMB: 480,
  peakMemoryMB: 920,
  avgCpuPercent: 35,
  peakCpuPercent: 72,
  apiCallCount: 3400,
  uptime: 99.95
});

// Retrieve performance metrics
const metrics = await analyticsService.getPerformanceMetrics(
  'quality-dashboard',
  'facility-1'
);

console.log(`Avg Latency: ${metrics?.avgLatencyMs}ms`);
console.log(`Error Rate: ${metrics?.errorRate}%`);
console.log(`P99 Latency: ${metrics?.p99LatencyMs}ms`);
```

### Analyzing Usage Patterns

```typescript
// Get usage analytics for past 30 days
const usage = await analyticsService.getUsageAnalytics(
  'quality-dashboard',
  'facility-1',
  30
);

console.log(`Deployment: ${usage.isDeployed ? 'Active' : 'Inactive'}`);
console.log(`Adoption: ${usage.adoptionPercent}%`);
console.log(`Active Users: ${usage.dailyActiveUsers}/${usage.totalUsers}`);
console.log(`Trend: ${usage.adoptionTrend}`);

// Top features
usage.mostUsedFeatures.forEach(feature => {
  console.log(`${feature.name}: ${feature.usageCount} uses`);
});
```

### Health Monitoring

```typescript
import { ExtensionHealthCheckService } from '../services/ExtensionHealthCheckService';

const healthService = new ExtensionHealthCheckService(prisma, logger);

// Perform health check with custom thresholds
const health = await healthService.performHealthCheck(
  'quality-dashboard',
  'facility-1',
  {
    latencyThresholdMs: 3000,
    errorRateThresholdPercent: 2,
    memoryThresholdMB: 1024,
    cpuThresholdPercent: 75,
    licenseExpiryWarningDaysBefore: 45
  }
);

// Display health status
if (health.healthy) {
  console.log(`✓ ${health.extensionId} is healthy`);
} else {
  console.log(`✗ ${health.extensionId} has ${health.issues.length} issues:`);

  health.issues.forEach((issue, idx) => {
    const emoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
    console.log(`  ${emoji} ${issue.type}: ${issue.message}`);

    if (issue.suggestedAction) {
      console.log(`     Action: ${issue.suggestedAction}`);
    }
  });
}

// Check for critical alerts
const criticalAlerts = healthService.getUnacknowledgedCriticalAlerts();
if (criticalAlerts.length > 0) {
  console.warn(`⚠️  ${criticalAlerts.length} critical alerts require attention:`);
  criticalAlerts.forEach(alert => {
    console.warn(`   - ${alert.type}: ${alert.message}`);
  });
}
```

### Anomaly Detection

```typescript
// Get anomalies detected in the past 24 hours
const anomalies = analyticsService.getRecentAnomalies('quality-dashboard', 24);

anomalies.forEach(anomaly => {
  const change = ((anomaly.current - anomaly.baseline) / anomaly.baseline * 100).toFixed(1);
  console.warn(
    `Anomaly: ${anomaly.anomalyType} (${anomaly.anomalySeverity}) - ${change}% change`
  );
  console.warn(`  Baseline: ${anomaly.baseline}, Current: ${anomaly.current}`);
  console.warn(`  Confidence: ${anomaly.confidence}%`);
  console.warn(`  ${anomaly.message}`);
});
```

## Performance Characteristics

### Metric Collection Overhead
- **Per-event recording**: <10ms
- **Batch metric aggregation**: <50ms
- **Cache operations**: <1ms

### Dashboard Performance
- **Metric queries**: <100ms (cached)
- **Dashboard load**: <1 second
- **Anomaly detection**: <500ms

### Storage Requirements
- Usage events: ~100 bytes per event
- Performance metrics: ~500 bytes per metric
- Health checks: ~1KB per check result

## Health Check Details

### Severity Levels
- **Critical**: Immediate action required, functionality impaired
- **Warning**: Issue detected, monitor closely
- **Info**: Informational only, no action needed

### Check Types

1. **Availability Check**
   - Extension installed and registered
   - Extension enabled/disabled status
   - Extension active on site

2. **Dependency Health**
   - All required dependencies installed
   - Dependencies healthy and compatible
   - Dependency versions match requirements

3. **License Validity**
   - License exists and is valid
   - License not expired
   - Warning if expiring soon (configurable)

4. **Configuration Validation**
   - Configuration present and valid
   - Required parameters configured
   - No configuration conflicts

5. **Performance Health**
   - Latency within thresholds
   - Error rate acceptable
   - Throughput acceptable

6. **Integration Health**
   - Integration connections active
   - No recent integration failures
   - Integration endpoints responding

7. **Resource Health**
   - Memory usage within limits
   - CPU usage within limits
   - API calls within rate limits

## Alerting System

### Alert Types
- `not_found` - Extension not found
- `disabled` - Extension disabled
- `high_latency` - Latency exceeds threshold
- `high_error_rate` - Error rate exceeds threshold
- `resource_limit_exceeded` - Memory/CPU/API limits exceeded
- `integration_failed` - Integration connection failed
- `license_expiry_warning` - License expiring soon
- `config_invalid` - Configuration invalid

### Alert Lifecycle
1. **Detection**: Issue detected during health check
2. **Creation**: Alert created automatically
3. **Notification**: Alert sent (email, webhook, etc.)
4. **Acknowledgment**: User acknowledges alert
5. **Resolution**: Issue resolved, alert cleared

## Best Practices

### 1. Regular Metric Collection
```typescript
// Set up periodic metric collection (every minute)
setInterval(async () => {
  const metrics = collectMetrics(); // Your metric collection
  await analyticsService.recordPerformanceMetrics(metrics);
}, 60000);
```

### 2. Health Check Scheduling
```typescript
// Run health checks every 5 minutes
setInterval(async () => {
  const extensions = await getInstalledExtensions();
  for (const ext of extensions) {
    const health = await healthService.performHealthCheck(ext.id, 'site-1');
    if (!health.healthy) {
      // Handle unhealthy extension
    }
  }
}, 300000);
```

### 3. Alert Monitoring
```typescript
// Monitor critical alerts
const unacknowledged = healthService.getUnacknowledgedCriticalAlerts();
if (unacknowledged.length > 0) {
  // Send notification to ops team
  notifyOps(unacknowledged);
}
```

### 4. Cache Clearing
```typescript
// Clear caches when configuration changes
if (configurationChanged) {
  analyticsService.clearCache();
  healthService.clearCache();
}
```

## Related Issues

- **Issue #403**: Extension Type Taxonomy (uses manifests)
- **Issue #407**: Multi-Site Deployment (deployment metrics)
- **Issue #414**: Migration Tool (migration monitoring)

## See Also

- [Extension Conflict Detection Engine](./conflict-detection-engine.md)
- [Compatibility Matrix Service](./compatibility-matrix.md)
- [Extension Installation Guide](./installation-guide.md)
