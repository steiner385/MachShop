# Troubleshooting and Disaster Recovery Guide

Comprehensive guide for diagnosing issues and recovering from failures in the Workflow Builder system.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Workflow Execution Problems](#workflow-execution-problems)
4. [Configuration Issues](#configuration-issues)
5. [Deployment Failures](#deployment-failures)
6. [Integration Connectivity](#integration-connectivity)
7. [Performance Degradation](#performance-degradation)
8. [Disaster Recovery](#disaster-recovery)
9. [Getting Support](#getting-support)

## Quick Diagnostics

### Diagnostic Script

```typescript
import { WorkflowExecutionEngine } from '../services/WorkflowExecutionEngine';
import { SiteConfigurationService } from '../services/SiteConfigurationService';
import { VersionManagementService } from '../services/VersionManagementService';
import { RollbackRecoveryService } from '../services/RollbackRecoveryService';

async function runSystemDiagnostics() {
  console.log('=== Workflow Builder System Diagnostics ===\n');

  const results = {
    timestamp: Date.now(),
    checks: [],
    status: 'passing'
  };

  // 1. Configuration Service
  try {
    const configService = new SiteConfigurationService();
    const sites = configService.getAllSites();
    const stats = configService.getConfigStats();

    results.checks.push({
      name: 'Configuration Service',
      status: 'healthy',
      details: {
        totalSites: sites.length,
        totalRegions: stats.totalRegions,
        configuredParams: stats.registeredParams
      }
    });
  } catch (error) {
    results.status = 'failing';
    results.checks.push({
      name: 'Configuration Service',
      status: 'error',
      error: error.message
    });
  }

  // 2. Version Management
  try {
    const versionService = new VersionManagementService();
    const stats = versionService.getVersionStats();

    results.checks.push({
      name: 'Version Management',
      status: 'healthy',
      details: {
        totalVersions: stats.totalVersions,
        activeVersions: stats.activeVersions,
        draftVersions: stats.draftVersions
      }
    });
  } catch (error) {
    results.status = 'failing';
    results.checks.push({
      name: 'Version Management',
      status: 'error',
      error: error.message
    });
  }

  // 3. Recovery System
  try {
    const recoveryService = new RollbackRecoveryService();
    const stats = recoveryService.getRecoveryStats();

    results.checks.push({
      name: 'Recovery System',
      status: 'healthy',
      details: {
        recoveryPoints: stats.totalRecoveryPoints,
        successfulRollbacks: stats.successfulRollbacks,
        failedRollbacks: stats.failedRollbacks
      }
    });
  } catch (error) {
    results.status = 'failing';
    results.checks.push({
      name: 'Recovery System',
      status: 'error',
      error: error.message
    });
  }

  // 4. Execution Engine
  try {
    const engine = new WorkflowExecutionEngine();

    // Test with simple workflow
    const testWorkflow = {
      id: 'test-wf',
      name: 'Diagnostic Test',
      nodes: [
        { id: 'start', type: 'START', position: { x: 0, y: 0 } },
        { id: 'end', type: 'END', position: { x: 100, y: 0 } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'end' }
      ],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'diagnostic',
      isActive: true
    };

    const result = await engine.executeWorkflow(testWorkflow, 'diagnostic');

    results.checks.push({
      name: 'Execution Engine',
      status: result.status === 'success' ? 'healthy' : 'error',
      details: {
        testExecution: result.status,
        duration: result.summary.totalDuration
      }
    });
  } catch (error) {
    results.status = 'failing';
    results.checks.push({
      name: 'Execution Engine',
      status: 'error',
      error: error.message
    });
  }

  // Print results
  console.log('\n=== Diagnostic Results ===');
  console.log(`Overall Status: ${results.status.toUpperCase()}`);
  console.log(`Timestamp: ${new Date(results.timestamp).toISOString()}\n`);

  results.checks.forEach(check => {
    const icon = check.status === 'healthy' ? '✓' : '✗';
    console.log(`${icon} ${check.name}: ${check.status}`);

    if (check.details) {
      Object.entries(check.details).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
    }

    if (check.error) {
      console.log(`  Error: ${check.error}`);
    }
  });

  return results;
}
```

---

## Common Issues

### Issue 1: Workflow Not Executing

**Symptoms:**
- Workflow status remains "pending"
- No execution trace recorded
- No error message

**Diagnosis:**

```typescript
function diagnoseNonExecution(workflowId: string, executionId: string) {
  const engine = new WorkflowExecutionEngine();
  const versionService = new VersionManagementService();

  // Check 1: Workflow exists
  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    return { issue: 'Workflow not found', solution: 'Verify workflow ID' };
  }

  // Check 2: Workflow is active
  if (!workflow.isActive) {
    return { issue: 'Workflow not active', solution: 'Activate workflow before executing' };
  }

  // Check 3: Has valid nodes
  if (!workflow.nodes || workflow.nodes.length === 0) {
    return { issue: 'Workflow has no nodes', solution: 'Add nodes to workflow' };
  }

  // Check 4: Has START node
  const hasStart = workflow.nodes.some(n => n.type === 'START');
  if (!hasStart) {
    return { issue: 'Missing START node', solution: 'Add START node to workflow' };
  }

  // Check 5: Edges are valid
  const nodeIds = new Set(workflow.nodes.map(n => n.id));
  const invalidEdges = workflow.edges.filter(
    e => !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );

  if (invalidEdges.length > 0) {
    return {
      issue: `Invalid edges found: ${invalidEdges.map(e => e.id).join(', ')}`,
      solution: 'Fix or remove invalid edge connections'
    };
  }

  // Check 6: Execution trace
  const trace = engine.getExecutionTrace(executionId);
  if (!trace || trace.length === 0) {
    return { issue: 'No execution trace', solution: 'Check execution engine logs' };
  }

  return { issue: 'Unknown', solution: 'Check detailed logs' };
}
```

**Solutions:**

```typescript
// Solution 1: Activate workflow
workflow.isActive = true;
updateWorkflow(workflow);

// Solution 2: Add missing nodes
workflow.nodes.push({
  id: 'start',
  type: 'START',
  position: { x: 0, y: 0 }
});

// Solution 3: Fix edge connections
workflow.edges = workflow.edges.filter(e => {
  const sourceExists = workflow.nodes.some(n => n.id === e.source);
  const targetExists = workflow.nodes.some(n => n.id === e.target);
  return sourceExists && targetExists;
});

// Solution 4: Re-execute workflow
const result = await engine.executeWorkflow(workflow, userId);
```

---

### Issue 2: Variables Not Available

**Symptoms:**
- Variable not found errors
- Expression evaluation fails
- Unexpected undefined values

**Diagnosis:**

```typescript
function diagnoseVariableIssue(
  variableName: string,
  context: { executionId: string; nodeId?: string }
) {
  const varService = new VariableManagementService();

  // Check 1: Variable exists at node level
  if (context.nodeId) {
    const nodeVar = varService.getVariable(variableName, context);
    if (nodeVar !== undefined) {
      return { found: true, scope: 'node', value: nodeVar };
    }
  }

  // Check 2: Variable exists at execution level
  const execVar = varService.getVariable(variableName, context);
  if (execVar !== undefined) {
    return { found: true, scope: 'execution', value: execVar };
  }

  // Check 3: Variable exists at global level
  const globalVar = varService.getVariable(variableName, {
    executionId: 'global'
  });
  if (globalVar !== undefined) {
    return { found: true, scope: 'global', value: globalVar };
  }

  // Check 4: Check for typos
  const allVars = getAllVariables(context);
  const similarNames = findSimilarNames(variableName, Object.keys(allVars));

  if (similarNames.length > 0) {
    return {
      found: false,
      suggestion: `Did you mean: ${similarNames.join(', ')}?`
    };
  }

  return { found: false, scope: 'none', suggestion: 'Variable never set' };
}
```

**Solutions:**

```typescript
// Solution 1: Set missing variable
varService.setVariable(variableName, value, context);

// Solution 2: Check variable scope
const scope = diagnoseVariableIssue(variableName, context);
if (!scope.found) {
  // Set at appropriate scope
  if (context.nodeId) {
    varService.setVariable(variableName, value, context, 'string');
  }
}

// Solution 3: Use correct variable name
// If typo detected, rename in workflow nodes

// Solution 4: Initialize variables before use
const workflow = {
  ...workflow,
  variables: {
    ...workflow.variables,
    [variableName]: {
      name: variableName,
      value: defaultValue,
      type: 'string',
      scope: 'execution'
    }
  }
};
```

---

## Workflow Execution Problems

### Problem 1: Slow Execution

**Diagnosis:**

```typescript
function diagnoseSlowExecution(executionId: string) {
  const engine = new WorkflowExecutionEngine();
  const trace = engine.getExecutionTrace(executionId);
  const result = engine.getExecutionStatus(executionId);

  if (!result) {
    return { issue: 'Execution not found' };
  }

  // Find slowest nodes
  const nodePerformance = Array.from(result.nodeResults.entries())
    .map(([nodeId, nodeResult]) => ({
      nodeId,
      duration: nodeResult.duration,
      status: nodeResult.status
    }))
    .sort((a, b) => b.duration - a.duration);

  const slowestNode = nodePerformance[0];
  const totalDuration = result.summary.totalDuration;
  const slowestPercent = (slowestNode.duration / totalDuration) * 100;

  return {
    slowestNode: slowestNode.nodeId,
    duration: slowestNode.duration,
    percentOfTotal: slowestPercent.toFixed(1),
    recommendation: slowestPercent > 50
      ? 'Optimize slowest node'
      : 'Check parallel execution potential'
  };
}
```

**Solutions:**

```typescript
// Solution 1: Parallel execution
{
  id: 'parallel-step',
  type: 'PARALLEL',
  properties: { branches: 2 }
}

// Solution 2: Caching
{
  id: 'cache-api-call',
  type: 'API_CALL',
  properties: {
    ...apiConfig,
    cache: { enabled: true, ttl: 3600 }
  }
}

// Solution 3: Batch operations
{
  id: 'batch-process',
  type: 'LOOP',
  properties: {
    batchSize: 100,
    iterableVar: '${items}'
  }
}

// Solution 4: Async operations
{
  id: 'async-task',
  type: 'API_CALL',
  properties: {
    ...apiConfig,
    async: true,
    pollInterval: 5000
  }
}
```

---

## Configuration Issues

### Issue: Configuration Validation Fails

**Diagnosis:**

```typescript
function diagnoseConfigError(siteId: string) {
  const configService = new SiteConfigurationService();
  const validation = configService.validateConfig(siteId);

  if (validation.valid) {
    return { status: 'valid' };
  }

  return {
    status: 'invalid',
    errors: validation.errors,
    siteInfo: configService.getSite(siteId),
    currentConfig: configService.getFullConfig(siteId)
  };
}
```

**Solutions:**

```typescript
function fixConfigurationErrors(siteId: string) {
  const configService = new SiteConfigurationService();
  const validation = configService.validateConfig(siteId);

  // Extract missing required parameters
  const missingParams = validation.errors
    .filter(e => e.includes('Missing required'))
    .map(e => e.match(/Missing required parameter: (\w+)/)[1]);

  // Set missing parameters to defaults or inherited values
  for (const param of missingParams) {
    const globalValue = configService.getConfig(siteId, param);
    if (globalValue) {
      console.log(`Using inherited value for ${param}`);
    } else {
      const defaultValue = getParameterDefault(param);
      configService.setSiteConfig(siteId, param, defaultValue, 'admin', 'Auto-fix');
    }
  }

  // Validate again
  const revalidation = configService.validateConfig(siteId);
  return revalidation.valid;
}
```

---

## Deployment Failures

### Issue: Deployment Gets Stuck

**Diagnosis:**

```typescript
function diagnoseStuckDeployment(rolloutId: string) {
  const rolloutService = new RolloutStrategyService();
  const rollout = rolloutService.getRollout(rolloutId);

  if (!rollout) {
    return { issue: 'Rollout not found' };
  }

  // Check status
  if (rollout.status !== 'in_progress') {
    return {
      issue: 'Rollout not in progress',
      status: rollout.status
    };
  }

  // Find stuck deployments
  const stuckDeployments = rollout.deployments.filter(d => {
    if (d.status !== 'in_progress') return false;

    const age = Date.now() - (d.startedAt || 0);
    const timeout = 60 * 60 * 1000; // 1 hour

    return age > timeout;
  });

  if (stuckDeployments.length === 0) {
    return { issue: 'No stuck deployments' };
  }

  return {
    issue: 'Deployments stuck',
    stuckDeployments: stuckDeployments.map(d => ({
      siteId: d.siteId,
      age: Date.now() - (d.startedAt || 0),
      status: d.status
    }))
  };
}
```

**Solutions:**

```typescript
function unstuckDeployment(rolloutId: string) {
  const rolloutService = new RolloutStrategyService();

  // Option 1: Manually update status
  const stuckDeployment = findStuckDeployment(rolloutId);
  rolloutService.updateDeploymentStatus(
    stuckDeployment.id,
    'failed',
    undefined,
    'Deployment timeout'
  );

  // Option 2: Pause and resume
  rolloutService.pauseRollout(rolloutId);
  // Investigate issue
  rolloutService.resumeRollout(rolloutId);

  // Option 3: Rollback entire rollout
  rolloutService.rollbackRollout(rolloutId, 'Deployment timeout');
}
```

---

## Integration Connectivity

### Issue: Integration Connection Failed

**Diagnosis:**

```typescript
async function diagnoseIntegrationFailure(
  system: 'salesforce' | 'sap' | 'netsuite',
  operationName: string
) {
  const factory = new IntegrationConnectorFactory();
  const connector = factory.createConnector({
    system: system,
    environment: 'production'
  });

  // Test 1: Connection test
  const connectionOk = await connector.testConnection();
  if (!connectionOk) {
    return {
      issue: 'Connection test failed',
      solution: 'Check API credentials and network connectivity'
    };
  }

  // Test 2: Check operation exists
  const operation = connector.getOperation(operationName);
  if (!operation) {
    return {
      issue: `Operation "${operationName}" not found`,
      availableOperations: connector.getOperations().map(o => o.name),
      solution: 'Use one of the available operations'
    };
  }

  // Test 3: Validate parameters
  const sampleParams = getSampleParameters(operation);
  const validation = connector.validateParams(operation, sampleParams);

  if (!validation.valid) {
    return {
      issue: 'Parameter validation failed',
      errors: validation.errors,
      requiredParams: operation.requiredParams,
      solution: 'Provide all required parameters'
    };
  }

  // Test 4: Try operation
  try {
    const response = await connector.executeOperation(operationName, sampleParams);
    return {
      status: 'success',
      response: response
    };
  } catch (error) {
    return {
      issue: 'Operation execution failed',
      error: error.message,
      solution: 'Check operation parameters and integration system health'
    };
  }
}
```

**Solutions:**

```typescript
async function fixIntegrationConnection(system: string) {
  // Step 1: Verify credentials
  const credentials = process.env[`${system.toUpperCase()}_API_KEY`];
  if (!credentials) {
    console.error(`Missing ${system} API credentials`);
    return false;
  }

  // Step 2: Test connection
  const factory = new IntegrationConnectorFactory();
  const connector = factory.createConnector({
    system: system,
    apiKey: credentials,
    environment: 'production'
  });

  const connected = await connector.testConnection();
  if (!connected) {
    console.error(`${system} connection test failed`);
    // Check network, firewall, API status
    return false;
  }

  console.log(`${system} connection successful`);
  return true;
}
```

---

## Performance Degradation

### Issue: System Running Slowly

**Diagnosis:**

```typescript
function performanceAudit() {
  const configService = new SiteConfigurationService();
  const versionService = new VersionManagementService();
  const engine = new WorkflowExecutionEngine();

  const audit = {
    timestamp: Date.now(),
    issues: [],
    recommendations: []
  };

  // Check 1: Configuration size
  const configStats = configService.getConfigStats();
  if (configStats.changeRecords > 100000) {
    audit.issues.push('Large configuration history may impact performance');
    audit.recommendations.push('Archive old configuration records');
  }

  // Check 2: Version count
  const versionStats = versionService.getVersionStats();
  if (versionStats.totalVersions > 1000) {
    audit.issues.push('Large number of versions may impact lookup');
    audit.recommendations.push('Archive old workflow versions');
  }

  // Check 3: Execution history
  // Check memory usage
  // Check database size

  return audit;
}
```

**Solutions:**

```typescript
async function optimizeSystem() {
  const configService = new SiteConfigurationService();
  const versionService = new VersionManagementService();

  // Clean up old versions
  const workflows = getAllWorkflows();
  workflows.forEach(wf => {
    const cleaned = versionService.cleanupOldVersions(wf.id, 10); // Keep last 10
    console.log(`Cleaned up ${cleaned} old versions for ${wf.id}`);
  });

  // Archive old configuration changes
  const archiveDate = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 year ago
  const oldChanges = configService.getChangeHistory({
    endTime: archiveDate
  });

  console.log(`Found ${oldChanges.length} old configuration records to archive`);
  // Archive to cold storage

  // Rebuild indices
  rebuildIndices();

  console.log('System optimization complete');
}
```

---

## Disaster Recovery

### Recovery Scenario 1: Corrupted Configuration

```typescript
async function recoverCorruptedConfiguration(siteId: string) {
  const configService = new SiteConfigurationService();
  const recoveryService = new RollbackRecoveryService();

  console.log(`Recovering configuration for ${siteId}...`);

  // Step 1: Find latest healthy recovery point
  const recoveryPoints = recoveryService.getRolloutRecoveryPoints(siteId);
  let lastHealthy = null;

  for (const point of recoveryPoints) {
    if (isHealthyRecoveryPoint(point)) {
      lastHealthy = point;
      break;
    }
  }

  if (!lastHealthy) {
    console.error('No healthy recovery point found');
    return false;
  }

  // Step 2: Restore configuration
  const config = lastHealthy.configSnapshot;

  Object.entries(config).forEach(([key, value]) => {
    configService.setSiteConfig(siteId, key, value, 'admin', 'Disaster recovery restore');
  });

  // Step 3: Validate restored configuration
  const validation = configService.validateConfig(siteId);
  if (!validation.valid) {
    console.error('Restored configuration is invalid:', validation.errors);
    return false;
  }

  console.log(`Configuration restored successfully for ${siteId}`);
  return true;
}
```

### Recovery Scenario 2: Failed Deployment Recovery

```typescript
async function recoverFailedDeployment(rolloutId: string) {
  const rolloutService = new RolloutStrategyService();
  const recoveryService = new RollbackRecoveryService();

  console.log(`Recovering from failed deployment ${rolloutId}...`);

  // Step 1: Get rollout details
  const rollout = rolloutService.getRollout(rolloutId);
  if (!rollout) {
    console.error('Rollout not found');
    return false;
  }

  // Step 2: Get recovery point
  const recoveryPoints = recoveryService.getRolloutRecoveryPoints(rolloutId);
  if (recoveryPoints.length === 0) {
    console.error('No recovery points available');
    return false;
  }

  const recoveryPoint = recoveryPoints[0]; // Most recent

  // Step 3: Create rollback plan
  const rollbackPlan = recoveryService.createRollbackPlan({
    rolloutId: rolloutId,
    recoveryPointId: recoveryPoint.id,
    rollbackReason: 'Deployment failure recovery',
    initiatedBy: 'admin@example.com',
    targetVersion: recoveryPoint.versionId,
    affectedSites: rollout.deployments.map(d => d.siteId)
  });

  if (!rollbackPlan) {
    console.error('Failed to create rollback plan');
    return false;
  }

  // Step 4: Execute rollback
  const execution = recoveryService.executeRollbackPlan(rollbackPlan.id, 'admin@example.com');
  if (!execution) {
    console.error('Failed to execute rollback');
    return false;
  }

  // Step 5: Monitor completion
  const maxAttempts = 240; // 4 hours (1 min intervals)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const plan = recoveryService.getRolloutRollbackPlan(rolloutId);

    if (plan?.status === 'completed') {
      console.log('Rollback completed successfully');
      return true;
    }

    if (plan?.status === 'failed') {
      console.error('Rollback failed:', plan.failureReason);
      return false;
    }

    await sleep(60000); // Check every minute
  }

  console.error('Rollback timeout');
  return false;
}
```

### Recovery Scenario 3: Site Isolated from Network

```typescript
async function recoverIsolatedSite(siteId: string) {
  const configService = new SiteConfigurationService();
  const recoveryService = new RollbackRecoveryService();

  console.log(`Attempting to recover isolated site: ${siteId}`);

  // Step 1: Check if recovery is needed
  const health = recoveryService.getLatestHealthCheck(siteId);

  if (health?.overallStatus === 'unhealthy') {
    console.log('Site is unhealthy - isolation likely');
  }

  // Step 2: Restore from latest recovery point
  const points = recoveryService.getRolloutRecoveryPoints(siteId);

  if (points.length === 0) {
    console.error('No recovery points available');
    return false;
  }

  const latestPoint = points[0];

  // Step 3: Roll back to previous version
  const previousVersion = getPreviousVersion(siteId);

  // Step 4: Restore configuration
  const configToRestore = latestPoint.configSnapshot;

  Object.entries(configToRestore).forEach(([key, value]) => {
    configService.setSiteConfig(siteId, key, value, 'admin', 'Site recovery');
  });

  // Step 5: Perform health check
  const newHealth = await performHealthCheck(siteId);

  if (newHealth.overallStatus === 'healthy') {
    console.log('Site recovered successfully');
    return true;
  } else {
    console.error('Site still unhealthy after recovery');
    return false;
  }
}
```

---

## Emergency Procedures

### Emergency Shutdown

```typescript
async function emergencyShutdown(reason: string) {
  console.log(`EMERGENCY SHUTDOWN: ${reason}`);

  // Stop all active rollouts
  const allRollouts = rolloutService.getAllRollouts();
  const activeRollouts = allRollouts.filter(r =>
    r.status === 'in_progress' || r.status === 'pending'
  );

  for (const rollout of activeRollouts) {
    rolloutService.pauseRollout(rollout.id);
    console.log(`Paused rollout: ${rollout.id}`);
  }

  // Notify all stakeholders
  notifyEmergency({
    type: 'SHUTDOWN',
    reason: reason,
    timestamp: Date.now(),
    affectedRollouts: activeRollouts.length,
    nextSteps: 'Waiting for manual intervention'
  });

  // Log incident
  recordIncident({
    type: 'emergency_shutdown',
    reason: reason,
    timestamp: Date.now(),
    pausedRollouts: activeRollouts.map(r => r.id)
  });
}
```

---

## Getting Support

### When to Contact Support

**Contact immediately if:**
- System is not responding
- All deployments failing
- Data corruption suspected
- Security incident detected

**Information to provide:**
- Diagnostic results from `runSystemDiagnostics()`
- Execution trace logs
- Configuration validation results
- Recent deployment history
- Error messages and timestamps

### Log Collection

```typescript
function collectDiagnosticLogs() {
  return {
    timestamp: Date.now(),
    diagnostics: runSystemDiagnostics(),
    recentExecutions: getRecentExecutionTraces(100),
    systemStats: gatherSystemMetrics(),
    configStats: configService.getConfigStats(),
    versionStats: versionService.getVersionStats(),
    recoveryStats: recoveryService.getRecoveryStats(),
    errorLogs: getErrorLogs(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  };
}
```

---

## Summary

Common issues can be diagnosed and resolved using:
- ✓ Diagnostic scripts for quick health checks
- ✓ Detailed troubleshooting for specific issues
- ✓ Recovery procedures for various failure modes
- ✓ Emergency procedures for critical situations
- ✓ Support escalation paths

Always collect diagnostic information before seeking support!
