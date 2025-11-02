# Workflow Builder API Reference

Complete API documentation for the Low-Code/No-Code Workflow Builder system.

## Table of Contents

1. [Core Types](#core-types)
2. [Node Type Definitions](#node-type-definitions)
3. [Workflow Execution Engine](#workflow-execution-engine)
4. [Variable Management](#variable-management)
5. [Error Handling](#error-handling)
6. [Integration Connectors](#integration-connectors)
7. [Site Configuration](#site-configuration)
8. [Approval Workflows](#approval-workflows)
9. [Rollout Strategies](#rollout-strategies)
10. [Version Management](#version-management)
11. [Rollback & Recovery](#rollback--recovery)

---

## Core Types

### Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, Variable>;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  isActive: boolean;
  version?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

### WorkflowNode

```typescript
interface WorkflowNode {
  id: string;
  type: string; // One of 24 node types
  position?: { x: number; y: number };
  properties?: Record<string, any>;
  inputs?: NodePort[];
  outputs?: NodePort[];
  metadata?: Record<string, any>;
}
```

### WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  properties?: Record<string, any>;
}
```

---

## Node Type Definitions

### Available Node Types (24 total)

#### Entry/Exit Nodes
- **START**: Workflow entry point
- **END**: Workflow exit point

#### Operation Nodes
- **MATERIAL_CONSUME**: Track material consumption
- **EQUIPMENT_OPERATION**: Schedule equipment usage
- **QUALITY_CHECK**: Perform quality verification
- **DATA_TRANSFORMATION**: Transform data format
- **API_CALL**: Call external APIs
- **SUBPROCESS**: Execute nested workflows

#### Decision Nodes
- **IF_THEN_ELSE**: Conditional branching
- **LOOP**: Iterative execution
- **WAIT**: Delay execution
- **SWITCH**: Multi-way branching
- **PARALLEL**: Concurrent execution

#### Integration Nodes
- **SALESFORCE_CONNECTOR**: Salesforce CRM integration
- **SAP_CONNECTOR**: SAP ERP integration
- **NETSUITE_CONNECTOR**: NetSuite integration
- **CUSTOM_API**: Custom API integration

#### Event Nodes
- **EVENT_PUBLISHER**: Publish events
- **EVENT_SUBSCRIBER**: Subscribe to events

#### Error Handling Nodes
- **ERROR_HANDLER**: Handle errors
- **RETRY_LOGIC**: Automatic retry
- **FALLBACK_PATH**: Fallback execution
- **NOTIFICATION**: Send notifications

### Node Executor Function Signature

```typescript
type NodeExecutor = (
  context: ExecutionContext,
  properties: Record<string, any>
) => Promise<NodeExecutionResult>;

interface ExecutionContext {
  currentNode: WorkflowNode;
  variables: Record<string, any>;
  previousResults: NodeExecutionResult[];
  workflow: Workflow;
  executionId: string;
  userId: string;
}

interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped';
  output?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
  duration: number;
  timestamp: number;
}
```

---

## Workflow Execution Engine

### WorkflowExecutionEngine

Main orchestrator for workflow execution.

#### Methods

##### executeWorkflow()

Execute a workflow from start to finish.

```typescript
executeWorkflow(workflow: Workflow, userId: string): Promise<WorkflowExecutionResult> {
  // Validates workflow structure
  // Identifies start node
  // Executes nodes sequentially
  // Handles errors and retries
  // Returns complete execution summary
}

interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'error' | 'partial';
  nodeResults: Map<string, NodeExecutionResult>;
  variables: Record<string, any>;
  executionTrace: ExecutionTrace[];
  summary: {
    totalNodes: number;
    successfulNodes: number;
    failedNodes: number;
    totalDuration: number;
    startTime: number;
    endTime: number;
  };
}
```

##### executeNode()

Execute a single node.

```typescript
executeNode(
  nodeId: string,
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult>
```

##### getExecutionStatus()

Get current execution status.

```typescript
getExecutionStatus(executionId: string): ExecutionStatus | undefined
```

##### getExecutionTrace()

Get execution trace for debugging.

```typescript
getExecutionTrace(executionId: string): ExecutionTrace[]
```

##### retryExecution()

Retry execution with exponential backoff.

```typescript
retryExecution(
  executionId: string,
  options?: { maxRetries?: number; backoffMs?: number }
): Promise<WorkflowExecutionResult>
```

---

## Variable Management

### VariableManagementService

Manages workflow variables across different scopes.

#### Types

```typescript
type VariableScope = 'global' | 'execution' | 'node';
type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface Variable {
  name: string;
  value: any;
  type: VariableType;
  scope: VariableScope;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface VariableContext {
  executionId: string;
  nodeId?: string;
}
```

#### Methods

##### setVariable()

Set a variable value.

```typescript
setVariable(
  name: string,
  value: any,
  context: VariableContext,
  type?: VariableType
): boolean
```

##### getVariable()

Get a variable value (follows scope hierarchy).

```typescript
getVariable(name: string, context: VariableContext): any | undefined
```

##### evaluateExpression()

Evaluate JavaScript expression with variable context.

```typescript
evaluateExpression(
  expression: string,
  context: VariableContext
): any
```

##### interpolateString()

Replace `${variableName}` patterns in string.

```typescript
interpolateString(
  template: string,
  context: VariableContext
): string
```

##### exportVariables()

Export variables for persistence.

```typescript
exportVariables(context: VariableContext): Record<string, any>
```

##### importVariables()

Import variables from persistence.

```typescript
importVariables(
  data: Record<string, any>,
  context: VariableContext
): boolean
```

---

## Error Handling

### ErrorHandlingService

Manages error detection, handling, and recovery.

#### Types

```typescript
interface ErrorHandler {
  id: string;
  pattern: string; // Regex pattern for error code matching
  action: 'retry' | 'skip' | 'fallback' | 'notify' | 'abort';
  retryStrategy?: {
    maxRetries: number;
    backoffMs: number;
    jitter: boolean;
  };
  fallbackNodeId?: string;
  notificationConfig?: {
    channels: string[];
    message: string;
  };
  priority: number; // Higher priority handlers match first
}

interface ErrorRecord {
  id: string;
  nodeId: string;
  error: {
    code: string;
    message: string;
  };
  timestamp: number;
  handledBy?: string;
  recoveryAction?: string;
}

interface CircuitBreakerStatus {
  status: 'healthy' | 'degraded' | 'broken';
  errorCount: number;
  lastErrorTime?: number;
}
```

#### Methods

##### registerErrorHandler()

Register error handler.

```typescript
registerErrorHandler(handler: ErrorHandler): boolean
```

##### handleError()

Handle error with appropriate recovery action.

```typescript
handleError(
  nodeId: string,
  error: Error,
  context: ExecutionContext
): Promise<ErrorHandlingResult>
```

##### getCircuitBreakerStatus()

Get circuit breaker status for node.

```typescript
getCircuitBreakerStatus(
  nodeId: string,
  windowMs?: number
): CircuitBreakerStatus
```

##### getErrorStatistics()

Get error statistics.

```typescript
getErrorStatistics(): {
  totalErrors: number;
  errorsByNode: Record<string, number>;
  errorsByType: Record<string, number>;
  handledCount: number;
  unhandledCount: number;
}
```

---

## Integration Connectors

### IntegrationConnectorService

Manages connections to external systems.

#### Base Connector

```typescript
abstract class BaseIntegrationConnector {
  constructor(config: ConnectorConfig);

  abstract executeOperation(
    operationName: string,
    params: Record<string, any>
  ): Promise<ApiResponse>;

  abstract testConnection(): Promise<boolean>;

  getOperations(): ConnectorOperation[];
  getOperation(name: string): ConnectorOperation | undefined;
}
```

#### Salesforce Connector

**Operations:**
- `createAccount` - Create new account
- `getAccount` - Retrieve account by ID
- `updateAccount` - Update account details
- `createContact` - Create new contact
- `createOpportunity` - Create new opportunity
- `query` - Execute SOQL query

**Example:**
```typescript
const connector = new SalesforceConnector({
  system: 'salesforce',
  apiKey: 'your-api-key',
  baseUrl: 'https://your-instance.salesforce.com',
  environment: 'production'
});

const result = await connector.executeOperation('createAccount', {
  name: 'Acme Corp',
  phone: '555-0100',
  website: 'https://acme.com'
});
```

#### SAP Connector

**Operations:**
- `createPO` - Create purchase order
- `getPO` - Get purchase order
- `getMaterial` - Get material details
- `updateInventory` - Update inventory
- `createProductionOrder` - Create production order
- `getCostCenter` - Get cost center

**Example:**
```typescript
const connector = new SAPConnector({
  system: 'sap',
  apiKey: 'your-api-key',
  baseUrl: 'https://sap-instance.com/api',
  environment: 'production'
});

const result = await connector.executeOperation('createPO', {
  vendor: 'VENDOR-001',
  items: [{ material: 'MAT-001', quantity: 100 }],
  deliveryDate: Date.now() + 86400000
});
```

#### NetSuite Connector

**Operations:**
- `createSalesOrder` - Create sales order
- `getSalesOrder` - Get sales order
- `updateInventoryLevel` - Update inventory
- `createCustomer` - Create customer
- `createPurchaseOrder` - Create purchase order
- `createJournalEntry` - Create journal entry

---

## Site Configuration

### SiteConfigurationService

Manages multi-site configuration with inheritance.

#### Types

```typescript
interface Site {
  id: string;
  name: string;
  location: string;
  region: string;
  environment: 'production' | 'staging' | 'development';
  parentSiteId?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

interface ConfigParameter {
  key: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'select';
  defaultValue?: any;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => boolean;
  requiredAtLevel?: 'global' | 'regional' | 'site';
  category?: string;
}

interface ConfigValue {
  key: string;
  value: any;
  type: ConfigParameter['type'];
  scope: 'global' | 'regional' | 'site';
  inheritedFrom?: string;
  overriddenAt?: string;
  setBy: string;
  setAt: number;
}
```

#### Methods

##### registerParameter()

Register configuration parameter.

```typescript
registerParameter(param: ConfigParameter): boolean
```

##### createSite()

Create new site.

```typescript
createSite(site: Site): boolean
```

##### setGlobalConfig()

Set global configuration.

```typescript
setGlobalConfig(
  key: string,
  value: any,
  setBy: string,
  reason?: string
): boolean
```

##### setRegionalConfig()

Set regional configuration.

```typescript
setRegionalConfig(
  region: string,
  key: string,
  value: any,
  setBy: string,
  reason?: string
): boolean
```

##### setSiteConfig()

Set site-level configuration.

```typescript
setSiteConfig(
  siteId: string,
  key: string,
  value: any,
  setBy: string,
  reason?: string
): boolean
```

##### getConfig()

Get configuration value (with inheritance).

```typescript
getConfig(siteId: string, key: string): ConfigValue | undefined
```

##### getFullConfig()

Get complete configuration for site.

```typescript
getFullConfig(siteId: string): Record<string, any>
```

##### validateConfig()

Validate site configuration.

```typescript
validateConfig(siteId: string): { valid: boolean; errors: string[] }
```

##### cloneSiteConfig()

Clone configuration from one site to another.

```typescript
cloneSiteConfig(
  sourceSiteId: string,
  targetSiteId: string,
  clonedBy: string
): boolean
```

##### getChangeHistory()

Get configuration change history.

```typescript
getChangeHistory(filters?: {
  siteId?: string;
  key?: string;
  scope?: 'global' | 'regional' | 'site';
  startTime?: number;
  endTime?: number;
}): ConfigChangeRecord[]
```

---

## Approval Workflows

### ApprovalWorkflowService

Manages multi-step approval workflows.

#### Types

```typescript
interface Approver {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'technical_lead';
  active: boolean;
}

interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: number;
  expiresAt: number;
  title: string;
  description: string;
  data: Record<string, any>;
  steps: ApprovalStep[];
  currentStepIndex: number;
  completedAt?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

interface ApprovalPolicy {
  id: string;
  name: string;
  requestType: ApprovalRequestType;
  steps: Array<{
    stepNumber: number;
    approverRoles: string[];
    requiredApprovals: number;
    timeoutHours: number;
  }>;
  enabled: boolean;
  priority: number;
  notificationRules?: Array<{
    event: 'created' | 'approved' | 'rejected' | 'expiring';
    recipients: string[];
  }>;
}
```

#### Methods

##### registerApprover()

Register approver.

```typescript
registerApprover(approver: Approver): boolean
```

##### createPolicy()

Create approval policy.

```typescript
createPolicy(policy: ApprovalPolicy): boolean
```

##### createRequest()

Create approval request.

```typescript
createRequest(
  request: Omit<ApprovalRequest, 'id' | 'steps' | 'currentStepIndex'>
): ApprovalRequest | null
```

##### approveRequest()

Approve request (advance to next step).

```typescript
approveRequest(
  requestId: string,
  approverId: string,
  comments?: string
): boolean
```

##### rejectRequest()

Reject request.

```typescript
rejectRequest(
  requestId: string,
  approverId: string,
  rejectionReason: string
): boolean
```

##### getPendingRequests()

Get pending requests for approver.

```typescript
getPendingRequests(approverId: string): ApprovalRequest[]
```

##### getRequestStats()

Get approval statistics.

```typescript
getRequestStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  averageApprovalTime: number;
}
```

---

## Rollout Strategies

### RolloutStrategyService

Manages gradual rollout strategies.

#### Types

```typescript
type RolloutStrategyType = 'immediate' | 'staged' | 'canary' | 'scheduled';
type RolloutStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'rolled_back' | 'failed';

interface StagedRolloutConfig {
  stages: Array<{
    stageNumber: number;
    sitesOrRegions: string[];
    delayHours?: number;
    validateBeforeNext: boolean;
    successCriteriaPercentage?: number;
  }>;
}

interface CanaryRolloutConfig {
  canaryPercentage: number; // 1-100
  canaryDurationHours: number;
  metricsToMonitor: string[];
  errorThresholdPercentage: number;
  performanceThresholdPercentage: number;
  autoPromoteIfSuccessful: boolean;
}

interface ScheduledRolloutConfig {
  startTime: number;
  endTime?: number;
  maxParallelSites?: number;
  maintenanceWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
}

interface RolloutExecution {
  id: string;
  workflowId: string;
  versionId: string;
  strategy: RolloutStrategyType;
  config: StagedRolloutConfig | CanaryRolloutConfig | ScheduledRolloutConfig;
  status: RolloutStatus;
  startedAt: number;
  completedAt?: number;
  failureReason?: string;
  deployments: RolloutDeployment[];
  metrics?: RolloutMetrics;
  createdBy: string;
}

interface RolloutDeployment {
  id: string;
  rolloutId: string;
  siteId: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  metrics?: DeploymentMetrics;
}

interface DeploymentMetrics {
  errorRate: number; // 0-100
  responseTimeMs: number;
  successCount: number;
  failureCount: number;
  executionCount: number;
  timestamp: number;
}

interface RolloutMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  successRate: number;
  averageErrorRate: number;
  averageResponseTime: number;
  totalDuration: number;
}
```

#### Methods

##### createRollout()

Create rollout execution.

```typescript
createRollout(config: {
  workflowId: string;
  versionId: string;
  strategy: RolloutStrategyType;
  strategyConfig: StagedRolloutConfig | CanaryRolloutConfig | ScheduledRolloutConfig;
  createdBy: string;
  approvalRequestId?: string;
}): RolloutExecution
```

##### startImmediateRollout()

Start immediate rollout to all sites.

```typescript
startImmediateRollout(rolloutId: string, targetSites: string[]): boolean
```

##### startStagedRollout()

Start staged rollout.

```typescript
startStagedRollout(rolloutId: string): boolean
```

##### startCanaryRollout()

Start canary rollout.

```typescript
startCanaryRollout(rolloutId: string, allSites: string[]): boolean
```

##### updateDeploymentStatus()

Update deployment status with metrics.

```typescript
updateDeploymentStatus(
  deploymentId: string,
  status: RolloutDeployment['status'],
  metrics?: DeploymentMetrics,
  error?: string
): boolean
```

##### completeRollout()

Complete rollout and calculate metrics.

```typescript
completeRollout(rolloutId: string): boolean
```

##### pauseRollout()

Pause in-progress rollout.

```typescript
pauseRollout(rolloutId: string): boolean
```

##### resumeRollout()

Resume paused rollout.

```typescript
resumeRollout(rolloutId: string): boolean
```

##### rollbackRollout()

Rollback complete rollout.

```typescript
rollbackRollout(rolloutId: string, reason: string): boolean
```

##### getRolloutProgress()

Get rollout progress.

```typescript
getRolloutProgress(rolloutId: string): {
  status: RolloutStatus;
  totalDeployments: number;
  completedDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
} | null
```

---

## Version Management

### VersionManagementService

Manages workflow versions with comparison and promotion.

#### Types

```typescript
type VersionStatus = 'draft' | 'published' | 'active' | 'deprecated' | 'archived';

interface VersionMetadata {
  id: string;
  workflowId: string;
  version: string; // semantic versioning
  status: VersionStatus;
  description?: string;
  changelog?: string;
  author: string;
  createdAt: number;
  publishedAt?: number;
  deprecatedAt?: number;
  archivedAt?: number;
  tags?: string[];
  parentVersionId?: string;
  compatibility?: {
    minApiVersion?: string;
    maxApiVersion?: string;
    requiredFeatures?: string[];
  };
  metrics?: {
    nodeCount: number;
    executionCount?: number;
    successRate?: number;
    averageExecutionTime?: number;
  };
}

interface VersionSnapshot {
  id: string;
  versionId: string;
  workflow: any;
  nodeDefinitions: Record<string, any>;
  variables: Record<string, any>;
  configuration: Record<string, any>;
  timestamp: number;
}

interface VersionComparison {
  versionA: VersionMetadata;
  versionB: VersionMetadata;
  isDifferent: boolean;
  changeCount: number;
  changes: Array<{
    type: 'node_added' | 'node_removed' | 'node_modified' | 'config_changed' | 'variable_changed';
    path: string;
    oldValue?: any;
    newValue?: any;
  }>;
  compatibility: 'compatible' | 'breaking' | 'requires_migration';
}
```

#### Methods

##### createVersion()

Create new version.

```typescript
createVersion(config: {
  workflowId: string;
  workflow: any;
  description?: string;
  author: string;
  parentVersionId?: string;
  tags?: string[];
}): VersionMetadata
```

##### publishVersion()

Publish draft version.

```typescript
publishVersion(versionId: string, publishedBy: string): boolean
```

##### activateVersion()

Activate version (promotes to active status).

```typescript
activateVersion(
  versionId: string,
  activatedBy: string,
  approval?: { approverId: string; approvedAt: number }
): boolean
```

##### deprecateVersion()

Deprecate version.

```typescript
deprecateVersion(
  versionId: string,
  deprecatedBy: string,
  reason?: string
): boolean
```

##### archiveVersion()

Archive version.

```typescript
archiveVersion(versionId: string, archivedBy: string): boolean
```

##### compareVersions()

Compare two versions.

```typescript
compareVersions(
  versionIdA: string,
  versionIdB: string
): VersionComparison | null
```

##### getActiveVersion()

Get active version for workflow.

```typescript
getActiveVersion(workflowId: string): VersionMetadata | undefined
```

##### getWorkflowVersions()

Get all versions for workflow.

```typescript
getWorkflowVersions(workflowId: string): VersionMetadata[]
```

##### getPromotionHistory()

Get version promotion history.

```typescript
getPromotionHistory(filters?: {
  versionId?: string;
  workflowId?: string;
  status?: VersionStatus;
  startTime?: number;
  endTime?: number;
}): VersionPromotion[]
```

##### exportVersion()

Export version for backup.

```typescript
exportVersion(versionId: string): Record<string, any> | null
```

##### importVersion()

Import version from backup.

```typescript
importVersion(
  exported: Record<string, any>,
  importedBy: string
): string | null
```

---

## Rollback & Recovery

### RollbackRecoveryService

Manages recovery points and rollback procedures.

#### Types

```typescript
type RecoveryPointType = 'pre_deployment' | 'post_deployment' | 'manual' | 'automatic';

interface RecoveryPoint {
  id: string;
  rolloutId: string;
  timestamp: number;
  type: RecoveryPointType;
  createdBy: string;
  description?: string;
  versionId: string;
  configSnapshot: Record<string, any>;
  variableSnapshot: Record<string, any>;
  deploymentState: Record<string, any>;
  metadata?: Record<string, any>;
}

interface RollbackPlan {
  id: string;
  rolloutId: string;
  recoveryPointId: string;
  rollbackReason: string;
  initiatedBy: string;
  initiatedAt: number;
  targetVersion: string;
  affectedSites: string[];
  estimatedDuration: number;
  rollbackSteps: Array<{
    stepNumber: number;
    action: string;
    siteIds: string[];
    estimatedTimeMs: number;
    dependencies?: number[];
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  completedAt?: number;
  failureReason?: string;
}

interface RollbackExecution {
  id: string;
  rollbackPlanId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'aborted';
  startedAt?: number;
  completedAt?: number;
  executionSteps: Array<{
    stepNumber: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    result?: Record<string, any>;
    error?: string;
  }>;
  siteRollbacks: Map<string, {
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';
    startedAt?: number;
    completedAt?: number;
    result?: Record<string, any>;
    error?: string;
  }>;
}

interface HealthCheckResult {
  id: string;
  rolloutId: string;
  timestamp: number;
  siteId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
    duration?: number;
  }>;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  failureCount: number;
  warningCount: number;
}
```

#### Methods

##### createRecoveryPoint()

Create recovery point.

```typescript
createRecoveryPoint(config: {
  rolloutId: string;
  versionId: string;
  type: RecoveryPointType;
  createdBy: string;
  description?: string;
  configSnapshot: Record<string, any>;
  variableSnapshot: Record<string, any>;
  deploymentState: Record<string, any>;
}): RecoveryPoint
```

##### createRollbackPlan()

Create rollback plan.

```typescript
createRollbackPlan(config: {
  rolloutId: string;
  recoveryPointId: string;
  rollbackReason: string;
  initiatedBy: string;
  targetVersion: string;
  affectedSites: string[];
}): RollbackPlan | null
```

##### executeRollbackPlan()

Execute rollback plan.

```typescript
executeRollbackPlan(
  planId: string,
  executedBy: string
): RollbackExecution | null
```

##### updateRollbackStep()

Update rollback execution step.

```typescript
updateRollbackStep(
  executionId: string,
  stepNumber: number,
  status: 'in_progress' | 'completed' | 'failed',
  result?: Record<string, any>,
  error?: string
): boolean
```

##### updateSiteRollbackStatus()

Update site rollback status.

```typescript
updateSiteRollbackStatus(
  executionId: string,
  siteId: string,
  status: 'in_progress' | 'success' | 'failed' | 'partial',
  result?: Record<string, any>,
  error?: string
): boolean
```

##### completeRollbackExecution()

Complete rollback execution.

```typescript
completeRollbackExecution(
  executionId: string,
  status: 'completed' | 'failed' | 'aborted',
  failureReason?: string
): boolean
```

##### performHealthCheck()

Perform health check.

```typescript
performHealthCheck(config: {
  rolloutId: string;
  siteId: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
    duration?: number;
  }>;
}): HealthCheckResult
```

##### getLatestHealthCheck()

Get latest health check for site.

```typescript
getLatestHealthCheck(siteId: string): HealthCheckResult | undefined
```

##### getHealthCheckHistory()

Get health check history.

```typescript
getHealthCheckHistory(siteId: string, limit?: number): HealthCheckResult[]
```

##### getRecoveryStats()

Get recovery statistics.

```typescript
getRecoveryStats(): {
  totalRecoveryPoints: number;
  totalRollbacks: number;
  successfulRollbacks: number;
  failedRollbacks: number;
  pendingRollbacks: number;
  averageRollbackDuration: number;
}
```

---

## Error Codes

### Common Error Codes

| Code | Message | Resolution |
|------|---------|-----------|
| `WORKFLOW_NOT_FOUND` | Workflow does not exist | Verify workflow ID |
| `INVALID_WORKFLOW` | Workflow validation failed | Check workflow structure |
| `NODE_NOT_FOUND` | Node does not exist in workflow | Verify node ID |
| `INVALID_NODE_TYPE` | Node type not supported | Use one of 24 supported types |
| `EXECUTION_FAILED` | Workflow execution failed | Check error logs and variables |
| `VARIABLE_NOT_FOUND` | Variable does not exist | Check variable scope |
| `INVALID_VARIABLE_TYPE` | Variable type mismatch | Use correct type |
| `APPROVAL_REQUIRED` | Approval workflow required | Create approval request |
| `APPROVAL_REJECTED` | Approval request rejected | Address rejection reason |
| `CONFIG_INVALID` | Configuration validation failed | Fix missing/invalid parameters |
| `DEPLOYMENT_FAILED` | Deployment failed | Check deployment logs |
| `HEALTH_CHECK_FAILED` | Health check failed | Investigate site health |
| `ROLLBACK_FAILED` | Rollback failed | Check rollback plan |

---

## Best Practices

### Workflow Design
1. Use meaningful node and variable names
2. Keep workflows focused on single business process
3. Add error handlers for critical nodes
4. Document complex logic with comments
5. Test with different input data

### Configuration Management
1. Use global config for organization-wide settings
2. Use regional config for region-specific overrides
3. Use site config for site-specific customizations
4. Document all configuration parameters
5. Validate configuration before deployment

### Approval Workflows
1. Define clear approval policies
2. Set appropriate approval timeouts
3. Notify approvers of pending requests
4. Log all approval decisions
5. Review approval history regularly

### Deployments
1. Always create recovery points before deployment
2. Use canary deployments for critical workflows
3. Monitor deployment metrics continuously
4. Have rollback plan before deployment
5. Perform post-deployment health checks

### Error Handling
1. Register handlers for all error codes
2. Set appropriate retry limits
3. Use fallback paths for critical operations
4. Log all errors and recovery actions
5. Monitor error trends

---

## Rate Limits

- Workflow executions: 100 per minute per user
- Configuration changes: 50 per minute
- Approval requests: 500 per hour
- Version comparisons: 100 per hour
- Rollout operations: 10 per hour

---

## Support

For issues, questions, or feature requests, contact the workflow builder team or refer to the troubleshooting guide.
