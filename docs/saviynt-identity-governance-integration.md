# Saviynt Identity Governance Integration

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Workflow Documentation](#workflow-documentation)
5. [Configuration Guide](#configuration-guide)
6. [Integration Guide](#integration-guide)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Overview

The Saviynt Identity Governance Integration provides automated identity and access management (IAM) capabilities for the Manufacturing Execution System (MES). This integration enables:

- **Automated User Provisioning/Deprovisioning**: Streamlined user lifecycle management
- **Role-Based Access Control (RBAC)**: Dynamic role assignment and validation
- **Attribute Synchronization**: Bi-directional data sync between MES and Saviynt
- **Access Certification**: Automated compliance reporting and access reviews
- **Real-time Event Processing**: Webhook-based synchronization for immediate updates
- **Segregation of Duties (SOD)**: Automated violation detection and prevention

## Architecture

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MES Frontend  │    │   MES Backend   │    │    Saviynt IGA  │
│                 │    │                 │    │                 │
│ • User Mgmt UI  │◄──►│ • SaviyntService│◄──►│ • User Store    │
│ • Role Mgmt UI  │    │ • API Client    │    │ • Role Mgmt     │
│ • Reports UI    │    │ • Sync Services │    │ • Workflows     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │                 │
                       │ • User Data     │
                       │ • Role Mappings │
                       │ • Sync Logs     │
                       └─────────────────┘
```

### Service Components

| Service | Purpose | Key Features |
|---------|---------|-------------|
| `SaviyntService` | Main orchestration layer | Health monitoring, statistics, coordination |
| `SaviyntApiClient` | API communication | Authentication, CRUD operations, bulk processing |
| `UserProvisioningService` | User lifecycle automation | Rule-based provisioning, approval workflows |
| `UserDeprovisioningService` | User deactivation workflows | Grace periods, scheduled actions, compliance |
| `AttributeSynchronizationService` | Data synchronization | Bi-directional sync, conflict resolution |
| `RoleMappingService` | RBAC management | Role hierarchy, SOD validation |
| `AccessCertificationExportService` | Compliance reporting | Multi-format exports, scheduled reviews |
| `SaviyntWebhookService` | Real-time events | HMAC validation, event processing |

## API Reference

### Authentication

All API interactions with Saviynt require OAuth 2.0 authentication:

```typescript
interface AuthenticationConfig {
  baseUrl: string;          // Saviynt instance URL
  clientId: string;         // OAuth client ID
  clientSecret: string;     // OAuth client secret
  scope: string;            // Required scopes
}

// Authentication response
interface AuthenticationResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}
```

### Core API Endpoints

#### User Management

```typescript
// Create User
POST /api/v1/users
{
  "username": "john.smith",
  "email": "john.smith@company.com",
  "firstName": "John",
  "lastName": "Smith",
  "department": "Engineering",
  "manager": "jane.doe@company.com",
  "startDate": "2024-01-15T00:00:00Z"
}

// Update User
PUT /api/v1/users/{userId}
{
  "department": "Engineering - Cloud Platform",
  "jobTitle": "Senior Software Engineer"
}

// Get User
GET /api/v1/users/{userId}
Response: {
  "id": "sav-user-001",
  "username": "john.smith",
  "email": "john.smith@company.com",
  "status": "ACTIVE",
  "roles": ["ENGINEER", "DEVELOPER_TOOLS_ACCESS"],
  "lastLogin": "2024-01-20T10:30:00Z",
  "attributes": {
    "department": "Engineering",
    "jobTitle": "Software Engineer"
  }
}
```

#### Role Management

```typescript
// Assign Role
POST /api/v1/users/{userId}/roles
{
  "roleId": "sav-eng-001",
  "roleName": "ENGINEER",
  "assignedBy": "admin@company.com",
  "effectiveDate": "2024-01-15T00:00:00Z"
}

// Revoke Role
DELETE /api/v1/users/{userId}/roles/{roleId}
{
  "reason": "Job role change",
  "revokedBy": "admin@company.com",
  "effectiveDate": "2024-01-20T00:00:00Z"
}

// Get User Roles
GET /api/v1/users/{userId}/roles
Response: [
  {
    "roleId": "sav-eng-001",
    "roleName": "ENGINEER",
    "assignedDate": "2024-01-15T00:00:00Z",
    "assignedBy": "admin@company.com",
    "permissions": ["READ_PROJECTS", "CREATE_BUILDS"]
  }
]
```

#### Bulk Operations

```typescript
// Bulk User Creation
POST /api/v1/users/bulk
{
  "users": [
    {
      "username": "user1",
      "email": "user1@company.com",
      "department": "Finance"
    },
    {
      "username": "user2",
      "email": "user2@company.com",
      "department": "HR"
    }
  ],
  "defaultRoles": ["EMPLOYEE"],
  "dryRun": false
}

Response: {
  "processed": 2,
  "succeeded": 2,
  "failed": 0,
  "results": [
    {
      "username": "user1",
      "status": "SUCCESS",
      "userId": "sav-user-100"
    },
    {
      "username": "user2",
      "status": "SUCCESS",
      "userId": "sav-user-101"
    }
  ]
}
```

### MES Internal API

#### Service Health and Status

```typescript
// Get Service Health
GET /api/internal/saviynt/health
Response: {
  "status": "healthy",
  "lastSync": "2024-01-20T10:30:00Z",
  "syncStatus": "SUCCESS",
  "connectedUsers": 1250,
  "pendingOperations": 5
}

// Get Synchronization Statistics
GET /api/internal/saviynt/stats
Response: {
  "totalUsers": 1250,
  "activeUsers": 1200,
  "totalRoles": 45,
  "lastSyncDuration": 12.5,
  "successfulSyncs": 150,
  "failedSyncs": 2,
  "conflictsResolved": 8
}
```

#### Configuration Management

```typescript
// Update Saviynt Configuration
PUT /api/internal/saviynt/config
{
  "baseUrl": "https://company.saviynt.com",
  "syncInterval": 3600,
  "enableWebhooks": true,
  "conflictResolution": "MOST_RECENT_WINS",
  "enableSODValidation": true
}

// Test Connection
POST /api/internal/saviynt/test-connection
Response: {
  "success": true,
  "latency": 45,
  "version": "v23.11",
  "lastTestAt": "2024-01-20T10:35:00Z"
}
```

## Workflow Documentation

### 1. User Provisioning Workflow

```mermaid
sequenceDiagram
    participant HR as HR System
    participant MES as MES Backend
    participant Saviynt as Saviynt IGA
    participant DB as PostgreSQL

    HR->>MES: New Employee Request
    MES->>DB: Check if user exists
    DB-->>MES: User not found
    MES->>MES: Evaluate provisioning rules
    MES->>DB: Create user record
    MES->>Saviynt: Create user in Saviynt
    Saviynt-->>MES: User created (ID: sav-user-001)
    MES->>DB: Update user with Saviynt ID
    MES->>Saviynt: Assign default roles
    MES->>DB: Log provisioning operation
    MES-->>HR: Provisioning completed
```

**Steps:**
1. **Request Reception**: HR system submits new employee data
2. **Validation**: Check for existing user and validate required fields
3. **Rule Evaluation**: Apply department-based provisioning rules
4. **User Creation**: Create user in both MES and Saviynt
5. **Role Assignment**: Assign roles based on job function and department
6. **Audit Trail**: Log all operations for compliance tracking

**Error Handling:**
- If Saviynt user creation fails, rollback MES user creation
- If role assignment fails, flag for manual review
- All failures logged with detailed error information

### 2. User Deprovisioning Workflow

```mermaid
flowchart TD
    A[Termination Request] --> B{User Exists?}
    B -->|No| C[Log Error]
    B -->|Yes| D[Get User Roles]
    D --> E[Revoke All Roles]
    E --> F[Deactivate in Saviynt]
    F --> G[Update MES Status]
    G --> H[Generate Compliance Report]
    H --> I[Schedule Data Archival]
    I --> J[Notify Stakeholders]
```

**Grace Period Handling:**
- **Immediate**: Security incidents, policy violations
- **24 Hours**: Voluntary resignation, planned departure
- **7 Days**: Leave of absence, temporary suspension

### 3. Attribute Synchronization Workflow

```mermaid
flowchart LR
    A[Scheduled Sync] --> B[Fetch MES Users]
    B --> C[Fetch Saviynt Users]
    C --> D[Compare Attributes]
    D --> E{Conflicts Detected?}
    E -->|Yes| F[Apply Resolution Strategy]
    E -->|No| G[Apply Updates]
    F --> G
    G --> H[Update Both Systems]
    H --> I[Log Sync Results]
```

**Conflict Resolution Strategies:**
- **MOST_RECENT_WINS**: Use most recently modified data
- **MES_AUTHORITATIVE**: MES data takes precedence
- **SAVIYNT_AUTHORITATIVE**: Saviynt data takes precedence
- **MANUAL_REVIEW**: Flag for administrator review

### 4. Role Mapping and SOD Validation

```mermaid
flowchart TD
    A[Role Assignment Request] --> B[Validate Role Exists]
    B --> C[Check SOD Rules]
    C --> D{SOD Violation?}
    D -->|Yes| E[Block Assignment]
    D -->|No| F[Assign Role]
    E --> G[Notify Administrator]
    F --> H[Update Role Mappings]
    H --> I[Sync to Saviynt]
```

**SOD Rule Examples:**
```typescript
const sodRules = [
  {
    role1: "FINANCIAL_ANALYST",
    role2: "FINANCIAL_APPROVER",
    reason: "Cannot analyze and approve same transactions"
  },
  {
    role1: "PURCHASE_REQUESTER",
    role2: "PURCHASE_APPROVER",
    reason: "Cannot request and approve same purchases"
  }
];
```

### 5. Access Certification Workflow

```mermaid
gantt
    title Access Certification Timeline
    dateFormat  YYYY-MM-DD
    section Preparation
    Data Collection     :2024-01-01, 7d
    Report Generation   :2024-01-08, 3d
    section Review
    Manager Review      :2024-01-11, 14d
    Exception Handling  :2024-01-25, 5d
    section Remediation
    Access Adjustments  :2024-01-30, 7d
    Final Verification  :2024-02-06, 3d
```

**Certification Report Contents:**
- User access summary
- Role assignments with timestamps
- Last login activity
- Permission details
- SOD violations (if any)
- Recommendations for access adjustments

### 6. Webhook Event Processing

```mermaid
sequenceDiagram
    participant Saviynt
    participant Webhook as Webhook Service
    participant MES as MES Backend
    participant DB as PostgreSQL

    Saviynt->>Webhook: POST /webhook/saviynt
    Webhook->>Webhook: Validate HMAC Signature
    Webhook->>Webhook: Parse Event Data
    Webhook->>MES: Process Event
    MES->>DB: Update User/Role Data
    DB-->>MES: Update Successful
    MES-->>Webhook: Processing Complete
    Webhook-->>Saviynt: 200 OK
```

**Supported Event Types:**
- `USER_CREATED`: New user added in Saviynt
- `USER_UPDATED`: User attributes changed
- `USER_DELETED`: User deactivated
- `USER_ROLE_ASSIGNED`: Role granted to user
- `USER_ROLE_REVOKED`: Role removed from user
- `ROLE_CREATED`: New role defined
- `ROLE_UPDATED`: Role permissions changed

## Configuration Guide

### Environment Variables

```bash
# Saviynt Connection
SAVIYNT_BASE_URL=https://company.saviynt.com
SAVIYNT_CLIENT_ID=mes_integration_client
SAVIYNT_CLIENT_SECRET=your_secret_here
SAVIYNT_SCOPE=user:read user:write role:read role:write

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/mes_db

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_here
WEBHOOK_PORT=3001

# Sync Configuration
SYNC_INTERVAL_MINUTES=60
CONFLICT_RESOLUTION=MOST_RECENT_WINS
ENABLE_SOD_VALIDATION=true
```

### Database Schema

```sql
-- Saviynt Configuration
CREATE TABLE saviynt_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_url VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    sync_interval INTEGER DEFAULT 3600,
    conflict_resolution VARCHAR(50) DEFAULT 'MOST_RECENT_WINS',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Extensions for Saviynt
ALTER TABLE users ADD COLUMN saviynt_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN last_sync_at TIMESTAMP;

-- Role Mappings
CREATE TABLE saviynt_role_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_role_id UUID REFERENCES roles(id),
    saviynt_role_id VARCHAR(255) NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sync Logs
CREATE TABLE saviynt_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    affected_users INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Initial Setup

1. **Configure Saviynt Instance**:
   ```typescript
   await saviyntService.configure({
     baseUrl: 'https://company.saviynt.com',
     clientId: 'mes_integration',
     clientSecret: process.env.SAVIYNT_CLIENT_SECRET,
     enableWebhooks: true,
     syncInterval: 3600
   });
   ```

2. **Test Connection**:
   ```typescript
   const healthCheck = await saviyntService.testConnection();
   console.log('Connection Status:', healthCheck.status);
   ```

3. **Initial Data Sync**:
   ```typescript
   await saviyntService.performInitialSync({
     syncUsers: true,
     syncRoles: true,
     dryRun: false
   });
   ```

## Integration Guide

### Frontend Integration

#### User Management UI

```typescript
// User provisioning form
const provisionUser = async (userData: NewUserRequest) => {
  const response = await fetch('/api/internal/saviynt/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  if (response.ok) {
    const result = await response.json();
    notifySuccess(`User ${result.username} provisioned successfully`);
  } else {
    const error = await response.json();
    notifyError(`Provisioning failed: ${error.message}`);
  }
};

// Role assignment component
const RoleAssignment = ({ userId, availableRoles }) => {
  const [selectedRoles, setSelectedRoles] = useState([]);

  const assignRoles = async () => {
    for (const roleId of selectedRoles) {
      // Check for SOD violations before assignment
      const sodCheck = await fetch(`/api/internal/saviynt/sod-check`, {
        method: 'POST',
        body: JSON.stringify({ userId, roleId })
      });

      if (!sodCheck.ok) {
        const violation = await sodCheck.json();
        alert(`SOD Violation: ${violation.reason}`);
        return;
      }
    }

    // Proceed with role assignments
    await assignRolesToUser(userId, selectedRoles);
  };

  return (
    <div>
      <RoleSelector
        roles={availableRoles}
        selected={selectedRoles}
        onChange={setSelectedRoles}
      />
      <button onClick={assignRoles}>Assign Roles</button>
    </div>
  );
};
```

#### Status Dashboard

```typescript
const SaviyntStatusDashboard = () => {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/internal/saviynt/health'),
        fetch('/api/internal/saviynt/stats')
      ]);

      setStatus(await statusRes.json());
      setStats(await statsRes.json());
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="saviynt-dashboard">
      <StatusIndicator status={status?.status} />
      <StatsDisplay
        totalUsers={stats?.totalUsers}
        lastSync={stats?.lastSyncDuration}
        conflicts={stats?.conflictsResolved}
      />
    </div>
  );
};
```

### Backend Integration

#### Express.js Routes

```typescript
import express from 'express';
import { SaviyntService } from '../services/SaviyntService';

const router = express.Router();
const saviyntService = new SaviyntService();

// User provisioning endpoint
router.post('/provision', async (req, res) => {
  try {
    const result = await saviyntService.provisionUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SOD validation endpoint
router.post('/sod-check', async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const violation = await saviyntService.checkSODViolation(userId, roleId);

    if (violation.hasViolation) {
      res.status(409).json(violation);
    } else {
      res.json({ valid: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-saviynt-signature'];
    const result = await saviyntService.processWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Scheduled Jobs

```typescript
import cron from 'node-cron';
import { SaviyntService } from '../services/SaviyntService';

const saviyntService = new SaviyntService();

// Hourly attribute synchronization
cron.schedule('0 * * * *', async () => {
  console.log('Starting hourly Saviynt sync...');
  try {
    await saviyntService.synchronizeAttributes();
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
  }
});

// Daily access certification
cron.schedule('0 2 * * *', async () => {
  console.log('Generating daily access certification report...');
  try {
    await saviyntService.generateAccessCertificationReport();
    console.log('Certification report generated');
  } catch (error) {
    console.error('Certification failed:', error);
  }
});

// Weekly cleanup of old sync logs
cron.schedule('0 3 * * 0', async () => {
  console.log('Cleaning up old sync logs...');
  try {
    await saviyntService.cleanupSyncLogs(30); // Keep 30 days
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});
```

## Security Considerations

### Authentication and Authorization

1. **OAuth 2.0 Flow**:
   - Use secure client credentials storage
   - Implement token refresh logic
   - Handle token expiration gracefully

2. **Webhook Security**:
   - Validate HMAC signatures for all webhook requests
   - Use secure webhook endpoints (HTTPS only)
   - Implement rate limiting and DDoS protection

3. **Data Encryption**:
   - Encrypt sensitive configuration data at rest
   - Use TLS 1.3 for all API communications
   - Implement proper key rotation policies

### Access Control

```typescript
// Role-based access control for Saviynt operations
const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Apply to sensitive endpoints
router.post('/provision', requireRole('USER_ADMIN'), provisionUser);
router.delete('/deprovision', requireRole('USER_ADMIN'), deprovisionUser);
router.get('/audit-logs', requireRole('SECURITY_AUDITOR'), getAuditLogs);
```

### Data Privacy

1. **PII Handling**:
   - Minimize data transmission to Saviynt
   - Implement data masking for non-production environments
   - Ensure GDPR/CCPA compliance for user data

2. **Audit Logging**:
   - Log all identity governance operations
   - Include timestamps, user IDs, and operation details
   - Implement secure log storage with retention policies

## Troubleshooting

### Common Issues

#### Connection Problems

**Issue**: "Authentication failed against Saviynt"
```bash
# Check configuration
curl -X POST "https://company.saviynt.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Solution**: Verify client credentials and network connectivity

#### Sync Failures

**Issue**: "User not found in Saviynt"
```sql
-- Check sync logs
SELECT * FROM saviynt_sync_logs
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

**Solution**: Verify user exists in Saviynt or create missing users

#### SOD Violations

**Issue**: "Segregation of duties violation detected"
```typescript
// Check SOD rules configuration
const sodViolations = await roleMappingService.validateSOD(userId, newRoleId);
console.log('Violations:', sodViolations);
```

**Solution**: Review role assignments and SOD rule configuration

### Monitoring and Alerting

```typescript
// Health check endpoint for monitoring
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check Saviynt connectivity
    const saviyntStatus = await saviyntService.testConnection();
    health.services.saviynt = saviyntStatus;

    // Check database connectivity
    const dbStatus = await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: 'healthy' };

    // Check recent sync operations
    const recentSyncs = await prisma.saviyntSyncLog.findMany({
      where: { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    health.services.recentSyncs = recentSyncs;

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503);
  }

  res.json(health);
});
```

### Log Analysis

```bash
# Monitor sync operations
tail -f /var/log/mes/saviynt-sync.log | grep ERROR

# Check webhook processing
grep "webhook" /var/log/mes/application.log | tail -20

# Monitor API response times
awk '/saviynt.*ms/ { print $0 }' /var/log/mes/performance.log
```

## Best Practices

### Development

1. **Error Handling**:
   ```typescript
   try {
     await saviyntService.provisionUser(userData);
   } catch (error) {
     if (error instanceof SaviyntApiError) {
       // Handle API-specific errors
       logger.error('Saviynt API error:', error.apiResponse);
     } else if (error instanceof ValidationError) {
       // Handle validation errors
       logger.warn('Validation failed:', error.details);
     } else {
       // Handle unexpected errors
       logger.error('Unexpected error:', error);
     }
     throw error;
   }
   ```

2. **Retry Logic**:
   ```typescript
   const retryConfig = {
     retries: 3,
     retryDelay: 1000,
     retryCondition: (error) => {
       return error.response?.status >= 500 || error.code === 'ECONNRESET';
     }
   };
   ```

3. **Testing**:
   - Use comprehensive unit tests for all service components
   - Implement integration tests for end-to-end workflows
   - Use mock data for development and testing environments

### Operations

1. **Monitoring**:
   - Set up alerts for sync failures
   - Monitor API response times and error rates
   - Track SOD violations and security events

2. **Backup and Recovery**:
   - Regular backups of role mappings and configurations
   - Document recovery procedures for sync failures
   - Test disaster recovery scenarios regularly

3. **Performance Optimization**:
   - Use bulk operations for large user sets
   - Implement connection pooling for database operations
   - Cache frequently accessed data (roles, configurations)

### Security

1. **Credential Management**:
   - Use environment variables for sensitive configuration
   - Rotate API credentials regularly
   - Implement secure key storage solutions

2. **Network Security**:
   - Use VPN or private networks for Saviynt connectivity
   - Implement IP whitelisting for webhook endpoints
   - Enable request rate limiting and DDoS protection

3. **Compliance**:
   - Regular access reviews and certifications
   - Maintain audit trails for all identity operations
   - Ensure data retention policies are followed

---

## Support and Maintenance

For issues with the Saviynt Identity Governance Integration:

1. Check the troubleshooting section above
2. Review recent sync logs in the database
3. Verify network connectivity to Saviynt
4. Contact the system administrator or development team

**Last Updated**: January 2024
**Version**: 1.0.0