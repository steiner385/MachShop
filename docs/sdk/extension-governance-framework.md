# Extension Governance & Compliance Controls Framework

**Issue #396** - Governance & Compliance Controls for Low-Code Modules

## Overview

The Extension Governance Framework establishes comprehensive governance, compliance, and approval controls for low-code/no-code customizations and modules. This framework enables manufacturing organizations to safely extend the MES while maintaining regulatory compliance, data integrity, and security standards.

## Key Features

### 1. Module Lifecycle Management
- **States**: Draft → Review → Approved → Deployed → Retired
- **State Transitions**: Configured approval chains and validation at each state
- **Audit Trail**: Complete history of all state transitions with reasons and timestamps
- **Rollback Support**: Ability to revert modules and manage versions

### 2. Compliance Validation
- **Multi-Standard Support**: AS9100, FDA 21 CFR Part 11, ISO 13485, ISO 9001
- **Automated & Manual Rules**: Mix of automated checks and manual review gates
- **Compliance Scoring**: Overall compliance percentage per standard
- **Violation Tracking**: Detailed violation reporting with remediation guidance

### 3. Security Control Assessment
- **Vulnerability Detection**: Injection, XSS, privilege escalation, credential scanning
- **Authorization Verification**: RBAC integration and access control checks
- **Data Encryption**: Verification of encryption implementation
- **Risk Classification**: Critical, High, Medium, Low, Minimal risk levels

### 4. Approval Workflows
- **Configurable Chains**: IT Security → IT Manager → Business Owner (customizable)
- **SLA Tracking**: Deadline monitoring with escalation on approach
- **Delegation Support**: Authority delegation with date-based activation
- **Notifications**: Real-time notifications for assignments, escalations, deadlines

### 5. Data Governance
- **PII Detection**: Automated detection and encryption requirements
- **Data Classification**: Public, Internal, Confidential, Restricted levels
- **Retention Policies**: Configurable data retention periods
- **Cross-System Controls**: Restrictions on sensitive data movement

### 6. Operational Controls
- **Resource Monitoring**: CPU, memory, API call rate tracking
- **Performance Thresholds**: Configurable alerts and auto-throttling
- **Maintenance Windows**: Scheduled update and deployment periods
- **Health Checks**: Pre- and post-deployment validation

### 7. Governance Dashboard
- **Real-Time Visibility**: Dashboard with current governance status
- **Compliance Reports**: Per-standard compliance and violation tracking
- **Security Metrics**: Vulnerability trends and risk assessment
- **Operational Health**: Performance metrics and alert summaries
- **Site Governance View**: Multi-site compliance visibility

## Service Architecture

### ExtensionGovernanceFrameworkService

Core governance framework implementation for lifecycle management, compliance validation, security assessment, and operational controls.

**Key Methods:**

```typescript
// Module Lifecycle
async initiateModuleLifecycle(
  moduleId: string,
  metadata: ModuleMetadata,
  siteId: string
): Promise<LifecycleRecord>

async transitionModuleState(
  moduleId: string,
  fromState: ModuleLifecycleState,
  toState: ModuleLifecycleState,
  changedBy: string,
  reason: string,
  approverNotes?: string
): Promise<LifecycleRecord>

// Compliance Validation
async validateCompliance(
  moduleId: string,
  standards: ComplianceStandard[]
): Promise<ComplianceValidationResult[]>

// Security Assessment
async assessSecurityControls(
  moduleId: string,
  moduleCode: string
): Promise<SecurityControlAssessment>

// Operational Configuration
async configureOperationalControls(
  moduleId: string,
  controls: OperationalControl
): Promise<OperationalControl>

async implementDataGovernancePolicy(
  moduleId: string,
  policy: DataGovernancePolicy
): Promise<DataGovernancePolicy>

// Reporting
async generateGovernanceReport(
  siteId: string,
  startDate?: Date,
  endDate?: Date
): Promise<GovernanceReport>
```

### ExtensionApprovalWorkflowService

Manages approval workflows with multi-step chains, SLA tracking, escalation, and delegation.

**Key Methods:**

```typescript
// Workflow Management
async createApprovalWorkflow(
  moduleId: string,
  siteId: string,
  workflowType: 'deployment' | 'update' | 'retirement' | 'urgent_patch',
  requestedBy: string,
  chainConfig: ApprovalChainConfig
): Promise<ApprovalWorkflow>

async approveStep(
  workflowId: string,
  stepNumber: number,
  approverName: string,
  comments?: string
): Promise<ApprovalWorkflow>

async rejectStep(
  workflowId: string,
  stepNumber: number,
  approverName: string,
  rejectionReason: string,
  comments?: string
): Promise<ApprovalWorkflow>

// SLA & Escalation
async escalateWorkflow(
  workflowId: string,
  escalationReason: string
): Promise<ApprovalWorkflow>

async checkSLACompliance(
  workflowId: string
): Promise<'on-track' | 'at-risk' | 'breached'>

// Notifications
async sendApprovalNotifications(
  workflowId: string,
  notificationType: 'assignment' | 'escalation' | 'deadline' | 'rejection'
): Promise<ApprovalNotification[]>

// Delegation
async delegateApprovalAuthority(
  delegatedBy: string,
  delegatedTo: string,
  delegatedRole: string,
  fromDate: Date,
  toDate: Date,
  workflowTypes: string[]
): Promise<ApprovalDelegation>

// Configuration
async configureApprovalChain(
  siteId: string,
  workflowType: string,
  steps: ApprovalChainConfig['steps']
): Promise<ApprovalChainConfig>

async configureSLA(
  siteId: string,
  workflowType: string,
  approverRole: string,
  targetHours: number,
  escalationThreshold: number,
  escalationRecipient: string
): Promise<SLAConfiguration>
```

### ExtensionGovernanceDashboardService

Provides comprehensive dashboards and reporting for governance, compliance, and security monitoring.

**Key Methods:**

```typescript
// Dashboard Overviews
async getDashboardOverview(siteId?: string): Promise<DashboardOverview>

async getModuleStatusSummaries(
  siteId?: string,
  filterStatus?: ModuleLifecycleState
): Promise<ModuleStatusSummary[]>

async getApprovalQueue(
  approverId?: string,
  approverRole?: string,
  limit?: number
): Promise<ApprovalQueueItem[]>

// Compliance Reporting
async getComplianceStatusDashboard(
  siteId?: string
): Promise<ComplianceStatusDashboard>

async generateComplianceReport(
  siteId: string,
  standards: string[],
  format?: 'json' | 'pdf' | 'csv'
): Promise<string>

// Security Reporting
async getSecurityDashboard(siteId?: string): Promise<SecurityDashboard>

// Operational Reporting
async getOperationalHealthDashboard(
  siteId?: string
): Promise<OperationalHealthDashboard>

// Site-Specific Views
async getSiteGovernanceView(siteId: string): Promise<SiteGovernanceView>

// Data Export
async exportGovernanceData(
  siteId: string,
  dataTypes: Array<'modules' | 'approvals' | 'compliance' | 'security' | 'operations'>,
  format?: 'json' | 'csv'
): Promise<string>

async getTrendingInsights(
  timeWindow?: '7days' | '30days' | '90days'
): Promise<string[]>
```

## Type Definitions

### Module Lifecycle

```typescript
type ModuleLifecycleState = 'draft' | 'review' | 'approved' | 'deployed' | 'retired';

interface LifecycleRecord {
  id: string;
  moduleId: string;
  fromState: ModuleLifecycleState;
  toState: ModuleLifecycleState;
  changedBy: string;
  changeReason: string;
  timestamp: Date;
  approverNotes?: string;
}
```

### Compliance

```typescript
type ComplianceStandard = 'AS9100' | 'FDA21CFR11' | 'ISO13485' | 'ISO9001';

interface ComplianceValidationResult {
  standard: ComplianceStandard;
  passed: boolean;
  timestamp: Date;
  ruleResults: Array<{
    ruleCode: string;
    ruleName: string;
    status: 'passed' | 'failed' | 'manual-review';
    findings?: string;
    remediation?: string;
  }>;
  overallScore: number; // 0-100
}
```

### Security Assessment

```typescript
interface SecurityControlAssessment {
  moduleId: string;
  assessmentDate: Date;
  results: {
    injectionVulnerabilities: VulnerabilityResult;
    xssVulnerabilities: VulnerabilityResult;
    privilegeEscalation: VulnerabilityResult;
    credentialsInCode: VulnerabilityResult;
    authzControls: { implemented: boolean; details: string };
    dataEncryption: { implemented: boolean; algorithm: string; details: string };
  };
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  recommendations: string[];
}
```

### Approval Workflow

```typescript
interface ApprovalWorkflow {
  id: string;
  moduleId: string;
  siteId: string;
  requestedBy: string;
  requestedAt: Date;
  workflowType: 'deployment' | 'update' | 'retirement' | 'urgent_patch';
  steps: ApprovalStep[];
  currentStepNumber: number;
  overallStatus: 'in-progress' | 'approved' | 'rejected' | 'withdrawn';
  completedAt?: Date;
  escalated: boolean;
  escalationReason?: string;
  slaComplianceStatus: 'on-track' | 'at-risk' | 'breached';
}

interface ApprovalStep {
  id: string;
  stepNumber: number;
  approverRole: 'IT_SECURITY' | 'IT_MANAGER' | 'BUSINESS_OWNER' | 'COMPLIANCE_OFFICER';
  approverName?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  approvedAt?: Date;
  rejectionReason?: string;
  comments?: string;
}
```

### Data Governance

```typescript
type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

interface DataGovernancePolicy {
  id: string;
  piiDetectionEnabled: boolean;
  piiEncryptionRequired: boolean;
  dataRetentionDays: number;
  crossSystemFlowRestrictions: string[];
  sensitiveDataPatterns: string[];
  classificationLevels: DataClassification[];
}
```

## Usage Examples

### Module Lifecycle Workflow

```typescript
const govService = new ExtensionGovernanceFrameworkService(prisma, logger);

// 1. Initiate module in draft state
const lifecycle = await govService.initiateModuleLifecycle(
  'my-module',
  {
    id: 'my-module',
    name: 'Inventory Management',
    version: '1.0.0',
    description: 'Custom inventory extension',
    author: 'dev@company.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  'site-chicago'
);

// 2. Validate compliance before review
const complianceResults = await govService.validateCompliance('my-module', [
  'AS9100',
  'ISO9001',
]);

// 3. Assess security controls
const securityAssessment = await govService.assessSecurityControls('my-module', moduleCode);

// 4. Transition to review
const review = await govService.transitionModuleState(
  'my-module',
  'draft',
  'review',
  'developer@company.com',
  'Ready for compliance review'
);

// 5. After approval, transition to deployed
const deployed = await govService.transitionModuleState(
  'my-module',
  'approved',
  'deployed',
  'deployer@company.com',
  'Deployed to production'
);
```

### Approval Workflow

```typescript
const approvalService = new ExtensionApprovalWorkflowService(prisma, logger);

// 1. Create approval workflow
const workflow = await approvalService.createApprovalWorkflow(
  'my-module',
  'site-chicago',
  'deployment',
  'developer@company.com',
  {
    id: 'chain-deploy',
    siteId: 'site-chicago',
    workflowType: 'deployment',
    steps: [
      { stepNumber: 1, approverRole: 'IT_SECURITY', required: true, parallel: false },
      { stepNumber: 2, approverRole: 'IT_MANAGER', required: true, parallel: false },
      { stepNumber: 3, approverRole: 'BUSINESS_OWNER', required: false, parallel: false },
    ],
    autoEscalation: true,
  }
);

// 2. Get current approver
const currentApprover = await approvalService.getCurrentApprover(workflow.id);

// 3. Send notification to approver
const notifications = await approvalService.sendApprovalNotifications(
  workflow.id,
  'assignment'
);

// 4. Approve step
const approved = await approvalService.approveStep(
  workflow.id,
  1,
  'security.officer@company.com',
  'Passed security review'
);

// 5. Monitor SLA compliance
const slaStatus = await approvalService.checkSLACompliance(workflow.id);
if (slaStatus === 'at-risk') {
  await approvalService.escalateWorkflow(
    workflow.id,
    'SLA deadline approaching'
  );
}
```

### Dashboard & Reporting

```typescript
const dashboardService = new ExtensionGovernanceDashboardService(prisma, logger);

// 1. Get overall governance status
const overview = await dashboardService.getDashboardOverview('site-chicago');
console.log(`${overview.activeModules} active modules, ${overview.pendingApprovals} pending approvals`);

// 2. Get compliance status
const compliance = await dashboardService.getComplianceStatusDashboard('site-chicago');
compliance.complianceByStandard.forEach((standard) => {
  console.log(`${standard.standard}: ${standard.compliancePercentage}% compliant`);
});

// 3. Get approval queue for user
const queue = await dashboardService.getApprovalQueue('approver@company.com', 'IT_MANAGER');
console.log(`${queue.length} approvals pending for you`);

// 4. Generate compliance report
const report = await dashboardService.generateComplianceReport(
  'site-chicago',
  ['AS9100', 'ISO9001'],
  'pdf'
);

// 5. Export governance data
const data = await dashboardService.exportGovernanceData(
  'site-chicago',
  ['modules', 'approvals', 'compliance', 'security'],
  'csv'
);
```

## Compliance Standards

### AS9100 Aerospace Compliance
- Configuration Management (8.5.6)
- Foreign Object Damage (FOD) Prevention (8.5.1)
- NADCAP Capability Verification
- Documentation Control (8.3)
- Traceability (8.5.5)

### FDA 21 CFR Part 11 Medical Device
- Authorization & Authentication (11.100)
- Audit Trail (11.200)
- Electronic Signatures (11.300)
- Data Validation (11.100)
- Archive & Retrieval (11.100)

### ISO 13485 Medical Device Quality
- Design Control (4.4.4)
- Identification & Traceability (7.5.4)
- Monitoring & Measurement (8.2.4)
- Change Control (8.4.2)
- Recall Procedures (8.5.3)

### ISO 9001 Quality Management
- Process Management (4.4)
- Competence (6.2)
- Control of Changes (8.6)
- Corrective Actions (10.2)
- Monitoring & Review (9.1)

## Operational Controls

### CPU Threshold
- **Min**: 10%, **Max**: 100%
- **Recommended**: 75%
- **Auto-Throttling**: Enabled when threshold exceeded

### Memory Threshold
- **Min**: 64 MB
- **Recommended**: 512 MB
- **Auto-Throttling**: Enabled when threshold exceeded

### API Rate Limiting
- **Default**: 1000 requests/minute
- **Throttling**: Automatic when limit exceeded
- **Configurable**: Per module and per site

### Response Time
- **Minimum Threshold**: 100 ms
- **Warning Threshold**: 300-500 ms
- **Critical Threshold**: 1000+ ms

### Maintenance Windows
- **Configurable**: Per site
- **Default**: Tuesday 2:00-4:00 AM UTC
- **Scheduled**: For module updates and rollouts

## Data Governance

### PII Detection Patterns
- Social Security Numbers (SSN)
- Credit Card Numbers
- Phone Numbers
- Email Addresses
- Bank Account Numbers
- Healthcare Identifiers

### Data Classification Levels
- **Public**: Non-sensitive, no restrictions
- **Internal**: Organization use only, basic controls
- **Confidential**: Limited access, encryption required
- **Restricted**: Maximum security, strict audit logging

### Data Retention
- **Minimum Period**: 30 days
- **Recommended**: 90 days for operational data, 365 days for audit trails
- **Configurable**: Per data classification and compliance standard

## Testing

Comprehensive test suite with 64 tests covering:

- **Governance Framework** (27 tests)
  - Module lifecycle transitions
  - Compliance validation
  - Security assessment
  - Operational controls
  - Data governance
  - Governance reporting

- **Approval Workflow** (21 tests)
  - Workflow creation and management
  - Step approval and rejection
  - Escalation handling
  - SLA tracking
  - Delegation
  - Configuration

- **Dashboard Service** (16 tests)
  - Dashboard overviews
  - Compliance reporting
  - Security metrics
  - Operational health
  - Report generation
  - Data export

**Run Tests:**
```bash
npm test -- src/tests/services/GovernanceFramework.test.ts
```

## Integration Points

### RBAC Integration (Issue #125)
- Role-based access control for approvers
- Permission checking for governance functions
- Delegation support with role-based authorization

### Approval Workflows (Issue #147)
- Integration with unified workflow system
- SLA and escalation management
- Notification delivery

### Error Handling (Issue #158)
- Comprehensive error handling and logging
- Audit trail recording of errors
- Error recovery procedures

### Database & Repository (Issue #157)
- Persistent storage of governance data
- Compliance rule repositories
- Audit log persistence

### License Management (Issue #405)
- Per-site module entitlements
- License enforcement in governance
- Compliance reporting per license tier

### Compatibility Matrix (Issue #404)
- Detection of incompatible compliance modules
- Conflict resolution guidance
- Deployment validation

### Multi-Site Service (Issue #407)
- Site-level governance enforcement
- Enterprise approval policies
- Cross-site compliance reporting

## Performance Considerations

- **Compliance Validation**: ~500-1000ms per standard
- **Security Assessment**: ~200-500ms per module
- **Governance Report Generation**: ~2-5 seconds
- **Dashboard Queries**: ~100-200ms

## Best Practices

1. **Governance-First**: Establish governance policies before module deployment
2. **Automated Where Possible**: Use automated compliance checks to reduce review time
3. **Clear Approval Chains**: Define explicit approval chains per workflow type and site
4. **Regular Audits**: Generate compliance reports on regular cadence (weekly/monthly)
5. **Dashboard Monitoring**: Monitor governance dashboards for trends and issues
6. **Delegation Management**: Maintain active delegations and review periodically
7. **Documentation**: Keep module documentation current during lifecycle
8. **Training**: Ensure developers understand compliance requirements

## Troubleshooting

### Common Issues

**Compliance Validation Takes Too Long**
- Reduce number of standards validated
- Run automated checks only for initial review
- Schedule manual reviews for off-peak hours

**Approval Workflow Stuck in Review**
- Check SLA compliance status
- Escalate if approaching deadline
- Verify approver availability

**Governance Report Empty**
- Verify data exists in database
- Check time window parameters
- Confirm site ID is valid

**Dashboard Performance Slow**
- Limit query time windows
- Use caching for frequently accessed reports
- Archive old governance data

## Future Enhancements

1. **AI Compliance Assistant**: ML-powered compliance guidance
2. **Automated Remediation**: Automatic fixing of compliance violations
3. **Integration with External Tools**: JIRA, ServiceNow, etc.
4. **Advanced Predictive Analytics**: Risk forecasting and trend analysis
5. **Mobile Dashboard**: Mobile-friendly governance monitoring
