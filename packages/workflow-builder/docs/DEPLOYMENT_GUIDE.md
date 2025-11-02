# Rollout and Deployment Best Practices

Comprehensive guide for safely rolling out workflow changes across multiple manufacturing sites.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Rollout Strategies](#rollout-strategies)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Execution Procedures](#execution-procedures)
5. [Monitoring and Validation](#monitoring-and-validation)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Best Practices](#best-practices)
9. [Case Studies](#case-studies)

## Deployment Overview

### Deployment Workflow

```
Prepare Version
    ↓
Get Approval
    ↓
Create Recovery Point
    ↓
Execute Rollout
    ↓
Monitor Progress
    ↓
Validate Health
    ↓
Complete/Rollback
```

### Key Objectives

- **Minimize Disruption**: Reduce impact on manufacturing operations
- **Ensure Quality**: Verify deployment success at each step
- **Enable Recovery**: Maintain ability to rollback if needed
- **Track Changes**: Complete audit trail of all deployments
- **Validate Success**: Confirm workflow functionality post-deployment

## Rollout Strategies

### Strategy 1: Immediate Rollout

Deploy to all sites simultaneously.

**Use Cases:**
- Non-critical bug fixes
- Feature additions with no breaking changes
- Maintenance releases
- Configuration changes

**Example:**

```typescript
import { RolloutStrategyService } from '../services/RolloutStrategyService';
import { VersionManagementService } from '../services/VersionManagementService';

const rolloutService = new RolloutStrategyService();
const versionService = new VersionManagementService();

// Prepare
const version = versionService.getActiveVersion('wf-manufacturing');
const allSites = ['factory-ny', 'factory-boston', 'factory-la', 'factory-chicago'];

// Create rollout
const rollout = rolloutService.createRollout({
  workflowId: 'wf-manufacturing',
  versionId: version!.id,
  strategy: 'immediate',
  strategyConfig: {},
  createdBy: 'deploy@example.com'
});

// Execute
const success = rolloutService.startImmediateRollout(rollout.id, allSites);

// Monitor
const progress = rolloutService.getRolloutProgress(rollout.id);
console.log(`Progress: ${progress?.progressPercentage}%`);
```

**Advantages:**
- ✓ Fastest deployment
- ✓ No phased complexity
- ✓ Simple monitoring

**Disadvantages:**
- ✗ Highest risk if issues occur
- ✗ All sites affected simultaneously
- ✗ No opportunity to catch issues early

**Best For:** Low-risk changes with thorough testing

---

### Strategy 2: Staged Rollout

Deploy in phases across site groups.

**Use Cases:**
- Major feature releases
- Significant configuration changes
- New integrations
- Breaking API changes

**Example:**

```typescript
// Create staged rollout
const rollout = rolloutService.createRollout({
  workflowId: 'wf-manufacturing',
  versionId: version!.id,
  strategy: 'staged',
  strategyConfig: {
    stages: [
      {
        stageNumber: 1,
        sitesOrRegions: ['factory-boston'], // Single test site
        delayHours: 0,
        validateBeforeNext: true,
        successCriteriaPercentage: 100
      },
      {
        stageNumber: 2,
        sitesOrRegions: ['factory-ny', 'factory-chicago'], // US-East and Midwest
        delayHours: 24, // Wait 1 day after stage 1
        validateBeforeNext: true,
        successCriteriaPercentage: 98
      },
      {
        stageNumber: 3,
        sitesOrRegions: ['factory-la'], // US-West
        delayHours: 48, // Wait 2 days after stage 2
        validateBeforeNext: false,
        successCriteriaPercentage: 95
      }
    ]
  },
  createdBy: 'deploy@example.com'
});

// Start staging
rolloutService.startStagedRollout(rollout.id);

// Monitor each stage
async function monitorStaging() {
  let stageLogs = [];

  for (let stage = 1; stage <= 3; stage++) {
    console.log(`\n=== Monitoring Stage ${stage} ===`);

    // Watch for 24 hours
    for (let hour = 0; hour < 24; hour++) {
      const progress = rolloutService.getRolloutProgress(rollout.id);
      console.log(`Hour ${hour}: ${progress?.progressPercentage}% complete`);

      // Check for failures
      if (progress && progress.failedDeployments > 0) {
        console.log('Failures detected! Starting rollback...');
        rolloutService.rollbackRollout(rollout.id, 'Failures in stage ' + stage);
        return;
      }

      await sleep(3600000); // Wait 1 hour
    }

    console.log(`Stage ${stage} complete - proceeding to next stage`);
  }
}
```

**Advantages:**
- ✓ Risks limited to single stage
- ✓ Validation gates between stages
- ✓ Opportunity to catch issues early
- ✓ Faster fix deployment if needed

**Disadvantages:**
- ✗ Longer overall deployment time
- ✗ More complex coordination
- ✗ Multiple deployment windows

**Best For:** Critical changes requiring staged validation

---

### Strategy 3: Canary Rollout

Deploy to small percentage first, then expand.

**Use Cases:**
- Critical business workflows
- Machine learning models
- Performance-sensitive operations
- New algorithm implementations

**Example:**

```typescript
// Create canary rollout
const rollout = rolloutService.createRollout({
  workflowId: 'wf-manufacturing',
  versionId: version!.id,
  strategy: 'canary',
  strategyConfig: {
    canaryPercentage: 10, // Deploy to 10% of sites first
    canaryDurationHours: 12,
    metricsToMonitor: ['errorRate', 'responseTime', 'successRate'],
    errorThresholdPercentage: 2.0, // Max 2% error rate
    performanceThresholdPercentage: 10.0, // Max 10% slower
    autoPromoteIfSuccessful: true
  },
  createdBy: 'deploy@example.com'
});

// All 10 sites
const allSites = [
  'factory-ny', 'factory-boston', 'factory-chicago',
  'factory-la', 'factory-denver', 'factory-houston',
  'factory-miami', 'factory-seattle', 'factory-phoenix',
  'factory-atlanta'
];

rolloutService.startCanaryRollout(rollout.id, allSites);

// Monitor canary metrics
async function monitorCanary() {
  const startTime = Date.now();
  const durationMs = 12 * 60 * 60 * 1000; // 12 hours

  while (Date.now() - startTime < durationMs) {
    const progress = rolloutService.getRolloutProgress(rollout.id);

    if (progress) {
      console.log(`
        Canary Status:
        - Sites deployed: ${progress.completedDeployments} / ${progress.totalDeployments}
        - Success rate: ${
          (progress.successfulDeployments / progress.totalDeployments) * 100
        }%
        - Failed: ${progress.failedDeployments}
      `);

      // Check against thresholds
      const errorRate = calculateErrorRate(progress.failedDeployments, progress.totalDeployments);
      if (errorRate > 2.0) {
        console.log('Error rate exceeded! Aborting canary...');
        rolloutService.rollbackRollout(rollout.id, 'Canary error threshold exceeded');
        return false;
      }
    }

    await sleep(60000); // Check every minute
  }

  console.log('Canary successful! Promoting to full rollout...');
  return true;
}

function calculateErrorRate(failures, total) {
  return (failures / total) * 100;
}
```

**Advantages:**
- ✓ Minimal blast radius (10% of sites)
- ✓ Real-world metrics before full deployment
- ✓ Automatic rollback on failure
- ✓ Fast recovery from issues

**Disadvantages:**
- ✗ Still requires full deployment after canary
- ✗ More complex monitoring
- ✗ Longer time to full deployment

**Best For:** High-impact changes requiring real-world validation

---

### Strategy 4: Scheduled Rollout

Deploy at specific times with maintenance windows.

**Use Cases:**
- Time-sensitive changes
- Changes requiring maintenance windows
- Coordinated multi-site deployments
- Avoiding peak hours

**Example:**

```typescript
// Create scheduled rollout
const rollout = rolloutService.createRollout({
  workflowId: 'wf-manufacturing',
  versionId: version!.id,
  strategy: 'scheduled',
  strategyConfig: {
    startTime: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
    endTime: Date.now() + 2 * 24 * 60 * 60 * 1000, // Day after tomorrow
    maxParallelSites: 3, // Deploy to 3 sites in parallel
    maintenanceWindow: {
      startHour: 22, // 10 PM
      endHour: 6, // 6 AM
      daysOfWeek: [0, 1, 2, 3, 4] // Mon-Fri only
    }
  },
  createdBy: 'deploy@example.com'
});

// The system automatically schedules deployments within
// the maintenance window, respecting max parallel sites
```

**Advantages:**
- ✓ Controlled deployment timing
- ✓ Avoids peak business hours
- ✓ Respects maintenance windows
- ✓ Planned communication

**Disadvantages:**
- ✗ Requires scheduling coordination
- ✗ Extended deployment time
- ✗ Limited flexibility for urgent issues

**Best For:** Planned maintenance and critical updates

---

## Pre-Deployment Checklist

### Version Preparation

```typescript
// 1. Version Status Check
const version = versionService.getVersion(versionId);
assert(version!.status === 'published', 'Version must be published');

// 2. Compatibility Check
const currentVersion = versionService.getActiveVersion(workflowId);
const comparison = versionService.compareVersions(currentVersion!.id, versionId);

console.log('Deployment Compatibility Analysis:');
console.log(`- Changes: ${comparison?.changeCount}`);
console.log(`- Compatibility: ${comparison?.compatibility}`);

if (comparison?.compatibility === 'breaking') {
  console.warn('Breaking changes detected - requires data migration!');
  // Plan migration
}

// 3. Test Coverage
assert(version!.metrics?.nodeCount! > 0, 'Workflow must have nodes');
assert(version!.metrics?.executionCount! > 0, 'Workflow must have test executions');

// 4. Approval Status
const approvals = approvalService.getRequestStats();
assert(approvals.approved > 0, 'Requires approval before deployment');
```

### Site Readiness

```typescript
// 1. Configuration Validation
const siteIds = ['factory-ny', 'factory-boston'];
siteIds.forEach(siteId => {
  const validation = configService.validateConfig(siteId);
  assert(validation.valid, `Site ${siteId} config invalid: ${validation.errors}`);
});

// 2. Health Check
siteIds.forEach(siteId => {
  const health = recoveryService.getLatestHealthCheck(siteId);
  assert(health?.overallStatus === 'healthy', `Site ${siteId} not healthy`);
});

// 3. Resource Check
siteIds.forEach(siteId => {
  const site = configService.getSite(siteId);
  assert(site?.isActive, `Site ${siteId} not active`);
});
```

### Create Recovery Points

```typescript
// Create pre-deployment recovery point for each site
const sites = ['factory-ny', 'factory-boston'];
const recoveryPoints = {};

sites.forEach(siteId => {
  const config = configService.getFullConfig(siteId);

  recoveryPoints[siteId] = recoveryService.createRecoveryPoint({
    rolloutId: 'rollout-' + Date.now(),
    versionId: currentVersion!.id,
    type: 'pre_deployment',
    createdBy: 'deploy@example.com',
    description: `Pre-deployment backup for ${siteId}`,
    configSnapshot: config,
    variableSnapshot: {},
    deploymentState: { status: 'ready' }
  });

  console.log(`Created recovery point for ${siteId}: ${recoveryPoints[siteId].id}`);
});
```

## Execution Procedures

### Execute Deployment

```typescript
async function executeDeployment(strategy: 'immediate' | 'staged' | 'canary') {
  // Create rollout
  const rollout = rolloutService.createRollout({
    workflowId: 'wf-manufacturing',
    versionId: newVersion.id,
    strategy: strategy,
    strategyConfig: getStrategyConfig(strategy),
    createdBy: 'deploy@example.com',
    approvalRequestId: approvalId
  });

  // Start deployment
  const sites = ['factory-ny', 'factory-boston', 'factory-la'];

  if (strategy === 'immediate') {
    rolloutService.startImmediateRollout(rollout.id, sites);
  } else if (strategy === 'canary') {
    rolloutService.startCanaryRollout(rollout.id, sites);
  } else {
    rolloutService.startStagedRollout(rollout.id);
  }

  // Monitor
  return monitorRollout(rollout.id);
}

async function monitorRollout(rolloutId: string) {
  const startTime = Date.now();
  const maxDuration = 24 * 60 * 60 * 1000; // 24 hours max

  while (Date.now() - startTime < maxDuration) {
    const progress = rolloutService.getRolloutProgress(rolloutId);

    if (!progress) break;

    console.log(`
      Deployment Progress:
      - Status: ${progress.status}
      - Completed: ${progress.completedDeployments}/${progress.totalDeployments}
      - Success: ${progress.successfulDeployments}
      - Failed: ${progress.failedDeployments}
      - Progress: ${progress.progressPercentage.toFixed(1)}%
      - ETA: ${progress.estimatedTimeRemaining}ms
    `);

    if (progress.status === 'completed' || progress.status === 'rolled_back') {
      return progress;
    }

    await sleep(60000); // Check every minute
  }

  throw new Error('Deployment timeout');
}
```

## Monitoring and Validation

### Health Metrics

```typescript
interface HealthMetrics {
  errorRate: number;
  responseTime: number;
  throughput: number;
  uptime: number;
}

async function validateDeploymentHealth(
  siteId: string,
  timeWindow: number = 60 * 60 * 1000 // 1 hour
) {
  const checks: HealthMetrics[] = [];

  const startTime = Date.now();
  while (Date.now() - startTime < timeWindow) {
    const metrics = await gatherMetrics(siteId);

    checks.push({
      errorRate: metrics.errors / metrics.total,
      responseTime: metrics.avgResponseTime,
      throughput: metrics.operationsPerSecond,
      uptime: metrics.uptime
    });

    await sleep(60000);
  }

  return analyzeHealth(checks);
}

function analyzeHealth(checks: HealthMetrics[]) {
  const avgErrorRate = checks.reduce((sum, c) => sum + c.errorRate, 0) / checks.length;
  const avgResponseTime = checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length;

  return {
    healthy: avgErrorRate < 2.0 && avgResponseTime < 5000,
    errorRate: avgErrorRate,
    responseTime: avgResponseTime,
    trend: 'improving' // Calculate based on progression
  };
}
```

### Success Criteria

```typescript
function defineCriteria(strategy: string) {
  switch (strategy) {
    case 'immediate':
      return {
        errorRateMax: 1.0, // Max 1% errors
        responseTimeMax: 5000, // Max 5 seconds
        successRateMin: 99.0, // Min 99% success
        timeWindow: 60 * 60 * 1000 // 1 hour observation
      };

    case 'canary':
      return {
        errorRateMax: 2.0, // More lenient for canary
        responseTimeMax: 10000,
        successRateMin: 98.0,
        timeWindow: 12 * 60 * 60 * 1000 // 12 hour observation
      };

    case 'staged':
      return {
        errorRateMax: 0.5, // More strict for staged
        responseTimeMax: 3000,
        successRateMin: 99.5,
        timeWindow: 24 * 60 * 60 * 1000 // 24 hour observation
      };

    default:
      throw new Error('Unknown strategy: ' + strategy);
  }
}
```

## Rollback Procedures

### Automatic Rollback

```typescript
async function executeWithAutoRollback(
  rolloutId: string,
  recoveryPointId: string
) {
  const criteria = defineCriteria('immediate');
  const monitoring = monitorRollout(rolloutId);

  // Check health periodically
  const healthCheck = setInterval(async () => {
    const sites = await getDeployedSites(rolloutId);

    for (const siteId of sites) {
      const health = await validateDeploymentHealth(siteId, 5 * 60 * 1000); // 5 min check

      if (health.errorRate > criteria.errorRateMax) {
        console.error(`Health check failed for ${siteId} - initiating rollback`);

        clearInterval(healthCheck);
        await rollbackDeployment(rolloutId, recoveryPointId, 'Health check failed');
        return;
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}
```

### Manual Rollback

```typescript
async function rollbackDeployment(
  rolloutId: string,
  recoveryPointId: string,
  reason: string
) {
  console.log(`Initiating rollback for ${rolloutId}: ${reason}`);

  // Create rollback plan
  const plan = recoveryService.createRollbackPlan({
    rolloutId: rolloutId,
    recoveryPointId: recoveryPointId,
    rollbackReason: reason,
    initiatedBy: 'operator@example.com',
    targetVersion: getPreviousVersion(rolloutId),
    affectedSites: getAffectedSites(rolloutId)
  });

  if (!plan) {
    throw new Error('Failed to create rollback plan');
  }

  console.log(`Rollback plan created: ${plan.id}`);
  console.log(`Estimated duration: ${plan.estimatedDuration}ms`);
  console.log(`Rollback steps: ${plan.rollbackSteps.length}`);

  // Execute rollback
  const execution = recoveryService.executeRollbackPlan(plan.id, 'operator@example.com');

  if (!execution) {
    throw new Error('Failed to execute rollback');
  }

  // Monitor rollback
  return await monitorRollback(execution.id);
}
```

## Post-Deployment Verification

### Validation Checklist

```typescript
async function verifyDeployment(rolloutId: string, sites: string[]) {
  const checks = [];

  // 1. Workflow Execution Test
  for (const siteId of sites) {
    const testResult = await testWorkflowExecution(rolloutId, siteId);
    checks.push({
      name: `Workflow execution on ${siteId}`,
      passed: testResult.success,
      duration: testResult.duration
    });
  }

  // 2. Configuration Validation
  for (const siteId of sites) {
    const validation = configService.validateConfig(siteId);
    checks.push({
      name: `Configuration valid on ${siteId}`,
      passed: validation.valid,
      errors: validation.errors
    });
  }

  // 3. Integration Connectivity
  for (const siteId of sites) {
    const connTest = await testIntegrationConnections(siteId);
    checks.push({
      name: `Integration connectivity on ${siteId}`,
      passed: connTest.all_connected,
      details: connTest.results
    });
  }

  // 4. Performance Baseline
  for (const siteId of sites) {
    const perfMetrics = await gatherPerformanceMetrics(siteId);
    checks.push({
      name: `Performance baseline on ${siteId}`,
      passed: perfMetrics.degradation < 10, // Max 10% degradation
      degradation: perfMetrics.degradation
    });
  }

  return checks;
}
```

### Sign-Off

```typescript
async function signOffDeployment(rolloutId: string) {
  const verification = await verifyDeployment(rolloutId, ['factory-ny', 'factory-boston']);

  const allPassed = verification.every(check => check.passed);

  if (allPassed) {
    console.log('✓ All verification checks passed');

    // Mark deployment as complete
    rolloutService.completeRollout(rolloutId);

    // Archive old version
    const oldVersion = versionService.getActiveVersion(workflowId);
    versionService.deprecateVersion(oldVersion!.id, 'deploy@example.com', 'Replaced by new deployment');

    console.log('Deployment successfully completed and signed off');
  } else {
    console.error('✗ Verification checks failed:');
    verification.filter(c => !c.passed).forEach(check => {
      console.error(`  - ${check.name}: ${check.error}`);
    });

    throw new Error('Deployment verification failed');
  }
}
```

## Best Practices

### 1. Always Create Recovery Points

```typescript
// GOOD
const recoveryPoint = recoveryService.createRecoveryPoint({...});
// Then deploy

// BAD
// Deploy without recovery point
```

### 2. Test in Staging First

```typescript
// GOOD - Test in staging environment
const stagingRollout = rolloutService.createRollout({
  ...config,
  strategyConfig: {...}
}, 'staging');

await waitForCompletion(stagingRollout);
await validateSuccess(stagingRollout);

// Then deploy to production
const prodRollout = rolloutService.createRollout({
  ...config,
  strategyConfig: {...}
}, 'production');

// BAD - Deploy directly to production without testing
```

### 3. Document Every Deployment

```typescript
// Create comprehensive deployment record
const deploymentRecord = {
  timestamp: Date.now(),
  version: newVersion.id,
  strategy: 'canary',
  sites: affectedSites,
  approver: approvalInfo.approver,
  reason: approvalInfo.reason,
  result: 'success' | 'failed' | 'rolled_back',
  details: {
    startTime: rollout.startedAt,
    endTime: rollout.completedAt,
    duration: rollout.completedAt - rollout.startedAt,
    metrics: rollout.metrics
  },
  verification: verificationResults,
  notes: deploymentNotes
};

// Store in audit system
auditLog.recordDeployment(deploymentRecord);
```

### 4. Communicate with Stakeholders

```typescript
// Before deployment
notifyStakeholders({
  type: 'pre-deployment',
  version: newVersion.id,
  strategy: 'staged',
  sites: affectedSites,
  expectedDuration: '4 hours',
  maintenanceWindow: '10 PM - 2 AM EST'
});

// During deployment (updates every 30 minutes)
monitorAndNotify(rolloutId, 30 * 60 * 1000);

// After deployment
notifyStakeholders({
  type: 'deployment-complete',
  version: newVersion.id,
  status: 'success',
  affectedSites: affectedSites,
  rollbackPlan: 'Available for 7 days'
});
```

## Case Studies

### Case Study 1: Critical Bug Fix (Immediate Strategy)

**Scenario**: Production bug discovered, minimal changes needed

```typescript
// Version already tested and approved
// No breaking changes detected
// All sites passing health checks

const sites = getAllProductionSites();
const rollout = rolloutService.createRollout({
  workflowId: 'wf-critical',
  versionId: bugFixVersion.id,
  strategy: 'immediate',
  strategyConfig: {},
  createdBy: 'deploy@example.com'
});

rolloutService.startImmediateRollout(rollout.id, sites);

// Monitor closely
const startTime = Date.now();
const maxDuration = 30 * 60 * 1000; // 30 minutes max

while (Date.now() - startTime < maxDuration) {
  const progress = rolloutService.getRolloutProgress(rollout.id);

  if (progress?.failedDeployments > 0) {
    // Immediate rollback
    rolloutService.rollbackRollout(rollout.id, 'Deployment failed');
    break;
  }

  if (progress?.status === 'completed') {
    rolloutService.completeRollout(rollout.id);
    break;
  }

  await sleep(10000); // Check every 10 seconds
}
```

### Case Study 2: Major Feature Release (Canary Strategy)

**Scenario**: Large new feature, needs real-world validation before full rollout

```typescript
// Create canary deployment
const canaryRollout = rolloutService.createRollout({
  workflowId: 'wf-features',
  versionId: featureVersion.id,
  strategy: 'canary',
  strategyConfig: {
    canaryPercentage: 15, // 2 out of 13 sites
    canaryDurationHours: 12,
    metricsToMonitor: ['errorRate', 'responseTime', 'successRate'],
    errorThresholdPercentage: 1.0,
    performanceThresholdPercentage: 5.0,
    autoPromoteIfSuccessful: true
  },
  createdBy: 'deploy@example.com'
});

rolloutService.startCanaryRollout(canaryRollout.id, allSites);

// Monitor canary phase
await monitorCanary(canaryRollout.id);

// If successful, auto-promote to full rollout
// Otherwise, automatic rollback triggered
```

---

## Summary

Safe deployment requires:
- ✓ Careful strategy selection based on change risk
- ✓ Thorough pre-deployment validation
- ✓ Recovery point creation
- ✓ Continuous health monitoring
- ✓ Clear success criteria
- ✓ Ability to quickly rollback
- ✓ Complete documentation
- ✓ Stakeholder communication

Follow these practices to ensure reliable, safe deployments across your manufacturing operations.
