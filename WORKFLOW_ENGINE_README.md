# Advanced Multi-Stage Approval Workflow Engine

> **✅ GITHUB ISSUE #21**: A comprehensive workflow engine for managing complex multi-stage approval processes with electronic signatures, conditional routing, and parallel coordination.

## 🚀 Overview

The Advanced Multi-Stage Approval Workflow Engine provides a robust, scalable solution for managing complex approval processes in manufacturing environments. It supports sequential and parallel approvals, conditional routing, electronic signatures, and comprehensive audit trails.

## 🌟 Key Features

### Core Workflow Management
- **Multi-Stage Workflows**: Support for complex workflows with multiple approval stages
- **5 Approval Types**: UNANIMOUS, MAJORITY, THRESHOLD, MINIMUM, ANY
- **Flexible Assignment**: Role-based, user-based, and dynamic assignments
- **Deadline Management**: Configurable deadlines with escalation
- **Priority Levels**: HIGH, MEDIUM, LOW priority workflows

### Advanced Capabilities
- **Conditional Routing**: Rules-based stage routing with complex conditions
- **Parallel Coordination**: Simultaneous approvals with group-based evaluation
- **Electronic Signatures**: Integration with 21 CFR Part 11 compliant signatures
- **Delegation & Escalation**: Task delegation and automatic escalation
- **Real-time Notifications**: Email and in-app notifications
- **Comprehensive Audit**: Complete audit trail with signature verification

### Assignment Strategies
- **PARALLEL_ALL**: All assignees must approve in parallel
- **PARALLEL_ROLE_GROUP**: Role-based parallel approval groups
- **ROUND_ROBIN**: Distribute tasks in round-robin fashion
- **LOAD_BALANCED**: Assign based on current workload
- **ROLE_BASED**: Traditional role-based assignments

## 🏗️ Architecture

### Database Schema
The workflow engine uses 12 database tables for comprehensive workflow management:

```sql
-- Core workflow tables
WorkflowDefinition     -- Workflow templates and definitions
WorkflowStage         -- Stage definitions within workflows
WorkflowRule          -- Conditional routing rules
WorkflowInstance      -- Running workflow instances
WorkflowStageInstance -- Stage instances within running workflows
WorkflowAssignment    -- Individual user assignments
WorkflowHistory       -- Complete audit trail
WorkflowDelegation    -- Task delegations
WorkflowTemplate      -- Reusable workflow templates
WorkflowTask          -- Task queue management
WorkflowMetrics       -- Performance analytics
WorkflowParallelCoordination -- Parallel approval coordination
```

### Services Architecture

```typescript
WorkflowEngineService
├── Lifecycle Management (start, complete, cancel)
├── Assignment Management (assign, delegate, escalate)
├── Stage Processing (sequential, parallel, conditional)
├── Electronic Signature Integration
├── Task Management (queue, filtering, progress)
└── Rules Engine (condition evaluation, action execution)

WorkflowDefinitionService
├── Definition CRUD Operations
├── Validation & Rules Management
├── Template Management
└── Cloning & Versioning

WorkflowNotificationService
├── Event-based Notifications
├── Template Processing
├── Bulk Notification Handling
└── User Preference Management
```

## 📋 API Endpoints

### Workflow Definitions
```http
POST   /api/v1/workflows/definitions              # Create workflow definition
GET    /api/v1/workflows/definitions              # List workflow definitions
GET    /api/v1/workflows/definitions/:id          # Get workflow definition
PUT    /api/v1/workflows/definitions/:id          # Update workflow definition
DELETE /api/v1/workflows/definitions/:id          # Delete workflow definition
POST   /api/v1/workflows/definitions/:id/clone    # Clone workflow definition
```

### Workflow Instances
```http
POST   /api/v1/workflows/instances                # Start new workflow
GET    /api/v1/workflows/instances                # List workflow instances
GET    /api/v1/workflows/instances/:id            # Get workflow instance
PUT    /api/v1/workflows/instances/:id            # Update workflow instance
POST   /api/v1/workflows/instances/:id/cancel     # Cancel workflow
GET    /api/v1/workflows/instances/:id/progress   # Get workflow progress
```

### Task Management
```http
GET    /api/v1/workflows/tasks/my-tasks           # Get user's tasks
POST   /api/v1/workflows/tasks/:id/approve        # Approve task
POST   /api/v1/workflows/tasks/:id/reject         # Reject task
POST   /api/v1/workflows/tasks/:id/delegate       # Delegate task
GET    /api/v1/workflows/tasks/:id/history        # Get task history
```

### Electronic Signature Integration
```http
POST   /api/v1/workflows/assignments/:id/approve-with-signature  # Approve with signature
GET    /api/v1/workflows/assignments/:id/signature-required      # Check signature requirement
GET    /api/v1/workflows/assignments/:id/signature               # Get signature details
GET    /api/v1/workflows/instances/:id/signatures                # Get all workflow signatures
POST   /api/v1/workflows/instances/:id/verify-signatures         # Verify workflow signatures
GET    /api/v1/workflows/instances/:id/signature-audit-report    # Generate audit report
```

## 🔧 Configuration

### Environment Variables
```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/mes_db"

# Email Configuration (for notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="workflow@company.com"
SMTP_PASS="password"

# Signature Configuration
SIGNATURE_ENCRYPTION_KEY="your-encryption-key"
SIGNATURE_VERIFICATION_TIMEOUT=300
```

### Workflow Definition Example
```json
{
  "name": "Quality Review Workflow",
  "description": "Multi-stage quality review process",
  "workflowType": "QUALITY_REVIEW",
  "version": "1.0",
  "stages": [
    {
      "stageNumber": 1,
      "stageName": "Initial Review",
      "description": "First-level quality review",
      "assignees": ["reviewer1@company.com", "reviewer2@company.com"],
      "approvalType": "MAJORITY",
      "deadlineHours": 24,
      "isOptional": false,
      "allowDelegation": true,
      "allowSkip": false,
      "requiresSignature": false
    },
    {
      "stageNumber": 2,
      "stageName": "Manager Approval",
      "description": "Manager-level approval",
      "assignees": ["manager@company.com"],
      "approvalType": "UNANIMOUS",
      "deadlineHours": 48,
      "isOptional": false,
      "allowDelegation": false,
      "allowSkip": false,
      "requiresSignature": true,
      "signatureType": "ADVANCED"
    }
  ],
  "connections": [
    {
      "fromStage": 1,
      "toStage": 2,
      "condition": "APPROVED"
    }
  ],
  "rules": [
    {
      "name": "Skip Review for Low Priority",
      "priority": 10,
      "conditions": {
        "AND": [
          {"field": "priority", "operator": "eq", "value": "LOW"},
          {"field": "currentStageNumber", "operator": "eq", "value": 1}
        ]
      },
      "actions": [
        {"type": "SKIP_TO_STAGE", "skipToStageNumber": 2}
      ]
    }
  ]
}
```

## 🎯 Usage Examples

### Starting a Workflow
```typescript
const workflowInput = {
  workflowDefinitionId: 'workflow-def-123',
  entityType: 'work_instruction',
  entityId: 'wi-456',
  priority: 'HIGH',
  requestedById: 'user-789',
  metadata: {
    department: 'Quality',
    criticality: 'high'
  }
};

const workflowInstance = await workflowEngineService.startWorkflow(workflowInput);
```

### Processing Approvals
```typescript
const approvalInput = {
  assignmentId: 'assignment-123',
  action: 'APPROVED',
  notes: 'Quality standards met'
};

await workflowEngineService.processApprovalAction(approvalInput, 'user-123');
```

### Approvals with Electronic Signatures
```typescript
const approvalInput = {
  assignmentId: 'assignment-123',
  action: 'APPROVED',
  notes: 'Final approval granted'
};

const signatureInput = {
  userId: 'user-123',
  password: 'user-password',
  signatureType: 'ADVANCED',
  signatureLevel: 'MANAGER'
};

await workflowEngineService.processApprovalWithSignature(
  approvalInput,
  signatureInput,
  'user-123'
);
```

### Getting User Tasks
```typescript
const tasks = await workflowEngineService.getMyTasks('user-123', {
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  page: 1,
  limit: 20
});
```

## 🧪 Testing

### Unit Tests
```bash
# Run workflow engine unit tests
npm test WorkflowEngineService
npm test WorkflowDefinitionService
npm test WorkflowNotificationService
```

### End-to-End Tests
```bash
# Run comprehensive E2E workflow tests
npx playwright test src/tests/e2e/advanced-workflow-engine.spec.ts
```

### Test Coverage
- **28 Unit Tests** for WorkflowEngineService covering all functionality
- **15 Unit Tests** for WorkflowDefinitionService
- **12 Unit Tests** for WorkflowNotificationService
- **25 E2E Tests** covering complete user workflows

## 🔐 Security Features

### Electronic Signatures
- **21 CFR Part 11 Compliance**: FDA-compliant electronic signatures
- **Multi-level Signatures**: BASIC, ADVANCED, QUALIFIED levels
- **Biometric Support**: Fingerprint, facial, iris, voice recognition
- **Integrity Verification**: SHA-256 hashing for signature integrity
- **Audit Trail**: Complete signature audit with verification

### Access Control
- **Role-based Permissions**: Fine-grained permission control
- **Assignment Validation**: Users can only act on assigned tasks
- **Delegation Tracking**: Complete delegation audit trail
- **Signature Authorization**: Password and biometric verification

## 📊 Monitoring & Analytics

### Performance Metrics
- **Workflow Completion Rates**: Track successful completion percentages
- **Average Processing Time**: Monitor workflow duration
- **Stage Bottlenecks**: Identify slow approval stages
- **User Performance**: Track individual approval times
- **Escalation Frequency**: Monitor deadline escalations

### Reporting
- **Workflow Analytics Dashboard**: Real-time workflow metrics
- **Signature Audit Reports**: Complete signature verification reports
- **Performance Reports**: Team and individual performance analytics
- **Compliance Reports**: Regulatory compliance tracking

## 🚀 Deployment

### Database Migration
```bash
# Generate and run Prisma migrations
npx prisma db push
npx prisma generate
```

### Application Deployment
```bash
# Build application
npm run build

# Start production server
npm run start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration Management

### Workflow Templates
The system includes pre-configured templates for common scenarios:
- Quality Review Workflows
- Change Control Processes
- Document Approval Workflows
- Production Release Approvals

### Notification Templates
Customizable email templates for:
- Workflow Start Notifications
- Assignment Notifications
- Deadline Reminders
- Completion Notifications
- Escalation Alerts

## 🎛️ Admin Configuration

### Workflow Definition Management
- **Visual Workflow Builder**: Drag-and-drop workflow creation
- **Rule Configuration**: Complex conditional routing setup
- **Template Management**: Reusable workflow templates
- **Version Control**: Workflow definition versioning

### User Management
- **Role Assignment**: Configure user roles and permissions
- **Delegation Rules**: Set up automatic delegation rules
- **Notification Preferences**: User-specific notification settings
- **Signature Setup**: Configure electronic signature requirements

## 🔍 Troubleshooting

### Common Issues

#### Workflow Not Starting
```typescript
// Check workflow definition exists and is active
const definition = await workflowDefinitionService.getWorkflow(definitionId);
if (!definition || !definition.isActive) {
  throw new Error('Workflow definition not found or inactive');
}
```

#### Task Not Appearing in Queue
```typescript
// Verify user assignment
const assignment = await prisma.workflowAssignment.findFirst({
  where: {
    assignedToId: userId,
    action: null // Pending action
  }
});
```

#### Signature Verification Failing
```typescript
// Check signature integrity
const verificationResult = await workflowEngineService.verifyWorkflowSignatures(workflowId);
if (!verificationResult.isValid) {
  console.log('Invalid signatures:', verificationResult.invalidSignatures);
}
```

### Logging and Debugging
The workflow engine provides comprehensive logging for troubleshooting:

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check workflow events in database
const events = await prisma.workflowHistory.findMany({
  where: { workflowInstanceId: 'workflow-123' },
  orderBy: { timestamp: 'desc' }
});
```

## 📚 Integration Examples

### Work Instruction Integration
```typescript
// Start workflow when work instruction needs approval
router.post('/work-instructions/:id/start-workflow', async (req, res) => {
  const workflowInstance = await workflowEngineService.startWorkflow({
    workflowDefinitionId: req.body.workflowDefinitionId,
    entityType: 'work_instruction',
    entityId: req.params.id,
    priority: req.body.priority,
    requestedById: req.user.id
  });

  res.json(workflowInstance);
});
```

### Quality Check Integration
```typescript
// Automatic workflow triggering for quality checks
async function onQualityCheckCreated(qualityCheck) {
  if (qualityCheck.requiresApproval) {
    await workflowEngineService.startWorkflow({
      workflowDefinitionId: 'quality-review-workflow',
      entityType: 'quality_check',
      entityId: qualityCheck.id,
      priority: qualityCheck.priority,
      requestedById: qualityCheck.createdById
    });
  }
}
```

## 🎯 Future Enhancements

### Planned Features
- **Visual Workflow Designer**: Drag-and-drop workflow creation UI
- **Advanced Analytics**: Machine learning-based workflow optimization
- **Mobile App Integration**: Mobile approval capabilities
- **Integration APIs**: REST and GraphQL APIs for external systems
- **Workflow Versioning**: Advanced version control and rollback
- **Custom Actions**: Plugin architecture for custom workflow actions

### Roadmap
- **Q1 2025**: Visual workflow designer
- **Q2 2025**: Advanced analytics and reporting
- **Q3 2025**: Mobile application
- **Q4 2025**: External system integrations

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone https://github.com/company/mes.git
cd mes

# Install dependencies
npm install

# Setup database
npx prisma db push
npx prisma generate

# Run development server
npm run dev
```

### Code Standards
- **TypeScript**: Strict typing for all workflow components
- **Testing**: Comprehensive unit and E2E test coverage
- **Documentation**: JSDoc comments for all public methods
- **Linting**: ESLint with strict rules for code quality

## 📄 License

This workflow engine is part of the Manufacturing Execution System (MES) and is proprietary software. All rights reserved.

## 🆘 Support

For technical support and questions:
- **Documentation**: Internal wiki at `/docs/workflow-engine`
- **Issue Tracking**: GitHub Issues for bug reports
- **Team Contact**: workflow-team@company.com
- **Emergency**: On-call rotation for production issues

---

**Built with ❤️ by the MES Development Team**