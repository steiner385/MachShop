# Teamcenter Quality MRB Integration

## Overview

This document describes the integration between the MES (Manufacturing Execution System) and Teamcenter Quality system for Material Review Board (MRB) management. The integration enables bidirectional synchronization of MRB data, automatic conflict resolution, and comprehensive audit logging for compliance with aerospace quality standards.

## Architecture

### Components

1. **TeamcenterQualityAPIClient** - Handles authentication and API communication
2. **TeamcenterMRBSyncService** - Manages bidirectional synchronization
3. **TeamcenterSecurityService** - Encryption and role-based access control
4. **TeamcenterAuditService** - Comprehensive audit logging
5. **Data Models** - MRBReview, MRBDisposition, MRBMember, and related types

### Integration Points

The integration connects with Teamcenter at the following points:

- Non-conformance (NCR) creation triggers MRB initiation in Teamcenter
- MRB status changes are synchronized bidirectionally
- Disposition decisions are synchronized and linked to NCR records
- Webhook notifications trigger sync events

## Authentication

### Supported Methods

1. **OAuth2** (Recommended)
   - Uses client credentials flow
   - Automatic token refresh with 5-minute expiration threshold
   - Secure credential storage with encryption

2. **API Key**
   - Static key authentication
   - Suitable for service-to-service communication

3. **Basic Authentication**
   - Username/password authentication
   - Credentials encrypted at rest

### Configuration

```typescript
const config: MRBSyncConfig = {
  id: 'config-1',
  teamcenterId: 'TC-001',
  teamcenterUrl: 'https://teamcenter.example.com',
  apiVersion: 'v1',
  authenticationType: 'OAUTH2',
  credentialId: 'cred-1',
  syncInterval: 30,
  autoSync: true,
  conflictResolutionStrategy: 'MES_WINS',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Synchronization

### Sync Direction

**Teamcenter to MES:**
- When MRB is created or updated in Teamcenter
- Pulls complete MRB data including members, dispositions, and signatures

**MES to Teamcenter:**
- When NCR disposition is decided in MES
- Pushes disposition and closure information to Teamcenter

### Conflict Resolution

When the same field is modified in both systems, the configured strategy determines the winner:

1. **MES_WINS** - MES value takes precedence
2. **TEAMCENTER_WINS** - Teamcenter value takes precedence
3. **MANUAL** - Conflicts are flagged for manual resolution

### Bulk Synchronization

For initial data migration or recovery:

```typescript
const bulkRequest: MRBBulkSyncRequest = {
  id: 'bulk-1',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  filters: {
    status: ['IN_REVIEW', 'APPROVED'],
    partNumber: ['PN-123456'],
  },
  totalRecords: 0,
  processedRecords: 0,
  failedRecords: 0,
  status: 'PENDING',
  createdAt: new Date(),
  createdBy: 'user-1',
  errors: [],
};

const result = await syncService.bulkSyncFromTeamcenter(bulkRequest);
```

## Data Models

### MRBReview

Represents a Material Review Board review in Teamcenter, linked to a non-conformance.

Key fields:
- `mrbNumber` - Unique MRB identifier in Teamcenter
- `status` - Current MRB status (INITIATED, IN_REVIEW, APPROVED, REJECTED, DEFERRED, CLOSED)
- `members` - MRB team members with roles
- `dispositions` - Part disposition records
- `syncStatus` - Sync status (PENDING, IN_PROGRESS, SYNCED, FAILED, CONFLICT)

### MRBDisposition

Records the decision for affected parts in an MRB.

Key fields:
- `status` - Disposition type (USE_AS_IS, REPAIR, REWORK, SCRAP, RETURN_TO_SUPPLIER)
- `justification` - Reason for disposition
- `customerApprovalRequired` - Whether customer approval is needed
- `inspectionLevel` - Level of inspection required

### MRBMember

Represents a member of the MRB team.

Key fields:
- `role` - Team member role (CHAIRMAN, QUALITY_ENGINEER, ENGINEERING, MANUFACTURING, etc.)
- `approvalStatus` - Individual member approval status
- `signatureImage` - Electronic signature (21 CFR Part 11 compliant)
- `signatureTimestamp` - When signature was captured

## Security

### Credential Encryption

All sensitive credentials are encrypted at rest using the encryption provider:

```typescript
const security = new TeamcenterSecurityService(prisma, logger);
const encrypted = await security.encryptCredentials(credentials);
const decrypted = await security.decryptCredentials(encrypted);
```

### Role-Based Access Control

Four predefined roles with permission matrix:

1. **TEAMCENTER_ADMIN** - Full access
2. **TEAMCENTER_MANAGER** - Read, write, and audit access
3. **TEAMCENTER_OPERATOR** - Read and write access
4. **TEAMCENTER_VIEWER** - Read-only access

```typescript
const security = new TeamcenterSecurityService(prisma, logger);
security.verifyPermission(userRole, TeamcenterOperation.WRITE_MRB);
```

### Permission Operations

- `read:mrb` - Read MRB records
- `write:mrb` - Create and update MRB records
- `delete:mrb` - Delete MRB records
- `manage:config` - Modify integration configuration
- `view:audit` - Access audit logs
- `manage:credentials` - Create and manage credentials

## Audit Logging

### 21 CFR Part 11 Compliance

The audit service maintains immutable audit logs for regulatory compliance:

```typescript
const audit = new TeamcenterAuditService(prisma, logger);

await audit.logAction(
  mrbId,
  AuditActionType.MRB_APPROVE,
  'user@example.com',
  'Approved MRB-2024-001',
  {
    severity: AuditSeverity.HIGH,
    previousValue: { status: 'IN_REVIEW' },
    newValue: { status: 'APPROVED' },
    ipAddress: '192.168.1.100',
    complianceRelevant: true,
  }
);
```

### Audit Entry Fields

- `id` - Immutable entry identifier
- `timestamp` - UTC timestamp of action
- `actor` - User or system that performed action
- `action` - Type of action performed
- `details` - Description of action
- `previousValue` - State before change
- `newValue` - State after change
- `ipAddress` - Source IP address
- `sessionId` - User session identifier
- `severity` - Action severity level
- `complianceRelevant` - Whether entry is compliance-critical

### Audit Reports

Generate compliance reports for specific time periods:

```typescript
const report = await audit.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  {
    severity: AuditSeverity.HIGH,
  }
);

console.log(`Total critical actions: ${report.summary.criticalActions}`);
console.log(`Actions by type:`, report.summary.byAction);
```

## API Endpoints

### MRB Operations

**Get MRB Review**
```
GET /api/quality/mrb/:mrbNumber
```

**Search MRB Reviews**
```
GET /api/quality/mrb/search?startDate=ISO8601&endDate=ISO8601&status=IN_REVIEW
```

**Create MRB Review**
```
POST /api/quality/mrb
Body: MRBReview data
```

**Update MRB Review**
```
PUT /api/quality/mrb/:mrbNumber
Body: Partial MRBReview data
```

**Get Dispositions**
```
GET /api/quality/mrb/:mrbNumber/dispositions
```

**Add Disposition**
```
POST /api/quality/mrb/:mrbNumber/dispositions
Body: MRBDisposition data
```

## Configuration

### Environment Variables

```
TEAMCENTER_ENCRYPTION_KEY=your-secret-key-here
TEAMCENTER_LOG_LEVEL=info
TEAMCENTER_SYNC_INTERVAL=30
TEAMCENTER_AUTO_SYNC=true
```

### Database Schema

Required tables:
- `teamcenterCredentials` - Encrypted credential storage
- `teamcenterSyncConfig` - Integration configuration
- `teamcenterAuditLog` - Immutable audit trail
- `mrbReview` - MRB review records
- `mrbDisposition` - MRB disposition records
- `mrbMember` - MRB team members
- `mrbConflict` - Detected conflicts
- `mrbSyncEvent` - Sync event audit trail

## Error Handling

### Common Errors

1. **TeamcenterAPIError**
   - API communication failures
   - Authentication failures
   - Invalid credentials

2. **SyncConflictError**
   - Conflicting changes detected
   - Conflict resolution strategy determination

3. **ValidationError**
   - Invalid configuration
   - Missing required fields
   - Data constraint violations

### Retry Strategy

Sync failures are retried with exponential backoff:
- Initial delay: 1 second
- Max delay: 5 minutes
- Max retries: 5

## Troubleshooting

### Connection Issues

1. Verify Teamcenter URL is accessible
2. Confirm OAuth2 client credentials are correct
3. Check firewall rules for API connectivity
4. Verify token expiration is not immediate

### Sync Failures

1. Check audit logs for detailed error messages
2. Verify MRB data consistency in Teamcenter
3. Review conflict detection rules
4. Check configured conflict resolution strategy

### Credential Issues

1. Ensure encryption key is set correctly
2. Verify credentials haven't been revoked
3. Check token expiration dates
4. Confirm credential type matches authentication method

## Testing

Run the comprehensive test suite:

```bash
npm test -- src/tests/services/TeamcenterMRBIntegration.test.ts
```

Test coverage includes:
- Authentication flows (OAuth2, API Key, Basic Auth)
- MRB CRUD operations
- Disposition management
- Bidirectional synchronization
- Conflict detection and resolution
- Bulk synchronization
- Audit trail recording
- 21 CFR Part 11 compliance verification

## Future Enhancements

1. **Webhook Integration** - Real-time Teamcenter event notifications
2. **Advanced Conflict Resolution** - Machine learning-based conflict resolution
3. **Multi-System Support** - Support for additional PLM systems
4. **Performance Optimization** - Caching and batch operations
5. **Advanced Reporting** - Dashboard and analytics integration

## Support

For issues or questions regarding Teamcenter integration:
1. Check the audit logs for detailed error messages
2. Review the troubleshooting section above
3. Contact the integration team with MRB ID and timestamp

## References

- [Teamcenter Quality API Documentation](https://docs.teamcenter.com/api/quality)
- [21 CFR Part 11 Compliance Guide](https://www.fda.gov/drugs/guidances-drugs/part-11-electronic-records-electronic-signatures)
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)
