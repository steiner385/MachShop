# Temporal Permissions System (Issue #126)

## Overview

The Temporal Permissions System provides time-based role assignments with comprehensive audit trails, emergency access functionality, and automatic cleanup capabilities. This feature enhances the existing RBAC system by adding temporal constraints to role assignments.

## Key Features

### 🕐 Time-Based Role Assignments
- **Temporary Roles**: Assign roles with expiration dates
- **Scheduled Roles**: Assign roles that become active at a future date
- **Permanent Roles**: Traditional role assignments without time constraints

### 🚨 Emergency Access (Break-Glass)
- Grant immediate access for critical situations
- Time-limited emergency roles (maximum 7 days)
- Comprehensive audit trail for emergency access
- Supervisor approval workflow

### 📋 Comprehensive Audit Trail
- Track all temporal role operations (assign, extend, revoke)
- Emergency access logging
- Automated cleanup activity tracking
- Full audit trail for compliance

### 🧹 Automatic Cleanup
- Scheduled cleanup of expired roles
- Manual cleanup trigger via API
- Permission cache invalidation
- Error handling and reporting

## Architecture

### Database Schema Extensions

#### UserRole Model
```prisma
model UserRole {
  id          String    @id @default(cuid())
  userId      String
  roleId      String
  assignedAt  DateTime  @default(now())
  assignedBy  String?

  // Temporal fields
  validFrom   DateTime? // When the role becomes active
  expiresAt   DateTime? // When the role expires
  isTemporary Boolean   @default(false)
  grantReason String?   // Reason for assignment

  // Relationships
  role        Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([expiresAt])
  @@index([validFrom])
  @@index([isTemporary])
}
```

#### TemporalAccessLog Model
```prisma
model TemporalAccessLog {
  id            String   @id @default(cuid())
  userId        String
  roleId        String
  siteId        String?
  accessType    String   // ASSIGNMENT, EXTENSION, REVOCATION, EMERGENCY, CLEANUP
  timestamp     DateTime @default(now())
  performedBy   String
  reason        String?
  isEmergency   Boolean  @default(false)
  durationHours Int?
  details       Json?

  // Relationships
  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role  @relation(fields: [roleId], references: [id], onDelete: Cascade)
  site Site? @relation(fields: [siteId], references: [id], onDelete: SetNull)
}
```

### Service Architecture

#### TemporalRoleService
Core service providing:
- `assignTemporalRole()` - Assign time-based roles
- `extendTemporalRole()` - Extend role expiration
- `revokeTemporalRole()` - Revoke roles immediately or scheduled
- `grantEmergencyAccess()` - Emergency access functionality
- `cleanupExpiredRoles()` - Remove expired roles
- `getTemporalAccessLogs()` - Audit trail retrieval

#### Enhanced PermissionService
- Temporal validation during permission resolution
- Cache invalidation on temporal role changes
- Support for emergency access context
- Integration with existing permission system

## API Reference

### Base URL
All temporal role endpoints are available under:
```
/api/v1/admin/temporal-roles
```

### Authentication
All endpoints require:
- Valid authentication token
- System Administrator role

### Endpoints

#### Assign Temporal Role
```http
POST /admin/temporal-roles/assign
```

**Request Body:**
```json
{
  "userId": "user-123",
  "roleId": "role-456",
  "siteId": "site-789",      // Optional: for site-specific roles
  "validFrom": "2025-01-01T00:00:00Z", // Optional: role activation date
  "expiresAt": "2025-12-31T23:59:59Z", // Required for temporary roles
  "isTemporary": true,
  "grantReason": "Contractor assignment",
  "isEmergency": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Temporal role assigned successfully",
  "assignmentId": "assignment-abc123",
  "auditLogId": "log-def456"
}
```

#### Extend Temporal Role
```http
PUT /admin/temporal-roles/extend
```

**Request Body:**
```json
{
  "userRoleId": "assignment-abc123",     // For global roles
  "userSiteRoleId": "site-assignment-xyz", // For site roles
  "newExpiresAt": "2026-06-30T23:59:59Z",
  "extensionReason": "Project extended"
}
```

#### Revoke Temporal Role
```http
DELETE /admin/temporal-roles/revoke
```

**Request Body:**
```json
{
  "userRoleId": "assignment-abc123",
  "revocationReason": "Contract ended",
  "immediateRevocation": true
}
```

#### Grant Emergency Access
```http
POST /admin/temporal-roles/emergency-access
```

**Request Body:**
```json
{
  "userId": "user-123",
  "roleId": "emergency-role",
  "siteId": "site-789",     // Optional
  "emergencyReason": "Production line down - immediate access needed",
  "durationHours": 4,       // Max 168 hours (7 days)
  "approvedBy": "supervisor-id"
}
```

#### Get User Temporal Roles
```http
GET /admin/temporal-roles/user/{userId}?siteId={siteId}
```

**Response:**
```json
{
  "success": true,
  "userId": "user-123",
  "siteId": "site-789",
  "temporalRoles": [
    {
      "id": "assignment-abc123",
      "roleId": "role-456",
      "roleName": "Temporary Access",
      "isTemporary": true,
      "status": "active",       // active, expired, pending
      "validFrom": "2025-01-01T00:00:00Z",
      "expiresAt": "2025-12-31T23:59:59Z",
      "grantReason": "Contractor assignment",
      "assignedAt": "2025-01-01T00:00:00Z",
      "assignedBy": "admin-user",
      "isEmergency": false
    }
  ]
}
```

#### Get Audit Logs
```http
GET /admin/temporal-roles/audit-logs?userId={userId}&roleId={roleId}&accessType={type}&startDate={date}&endDate={date}&limit={limit}
```

#### Manual Cleanup
```http
POST /admin/temporal-roles/cleanup
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "result": {
    "expiredRolesRemoved": 15,
    "globalRoles": 10,
    "siteRoles": 5,
    "auditLogsCreated": 15,
    "errorCount": 0,
    "errors": []
  }
}
```

#### Get Statistics
```http
GET /admin/temporal-roles/stats
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-31T10:00:00Z",
  "statistics": {
    "activeTemporalRoles": 25,
    "expiredTemporalRoles": 8,
    "pendingTemporalRoles": 3,
    "emergencyAccessLast24h": 2,
    "auditActivityLast7d": 45
  }
}
```

## Usage Examples

### Scenario 1: Contractor Assignment
```javascript
// Assign temporary role to contractor
const response = await fetch('/api/v1/admin/temporal-roles/assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'contractor-001',
    roleId: 'contractor-role',
    isTemporary: true,
    expiresAt: '2025-03-31T23:59:59Z',
    grantReason: '3-month contract for Project Alpha'
  })
});
```

### Scenario 2: Emergency Access
```javascript
// Grant emergency access for production issue
const response = await fetch('/api/v1/admin/temporal-roles/emergency-access', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'operator-005',
    roleId: 'maintenance-admin',
    emergencyReason: 'Production Line 3 down - critical repair needed',
    durationHours: 8,
    approvedBy: 'supervisor-002'
  })
});
```

### Scenario 3: Project Extension
```javascript
// Extend existing temporal role
const response = await fetch('/api/v1/admin/temporal-roles/extend', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userRoleId: 'assignment-abc123',
    newExpiresAt: '2025-06-30T23:59:59Z',
    extensionReason: 'Project timeline extended by 3 months'
  })
});
```

## Security Considerations

### Access Control
- All temporal role operations require System Administrator privileges
- Emergency access requires supervisor approval
- Audit logs are immutable and logged for all operations

### Validation
- Maximum emergency access duration: 168 hours (7 days)
- Expiration dates validated for future dates
- Role and user existence validated before assignment
- Duplicate role assignments prevented

### Audit Trail
- All operations logged with timestamps and responsible parties
- Emergency access specially flagged for compliance
- Cleanup operations tracked for accountability

## Best Practices

### Role Assignment
1. **Use Specific Reasons**: Always provide clear, specific reasons for temporal role assignments
2. **Minimum Duration**: Grant the minimum access duration necessary
3. **Regular Review**: Implement regular reviews of active temporal roles
4. **Emergency Documentation**: Document emergency access scenarios and approval workflows

### Monitoring
1. **Set Up Alerts**: Configure alerts for emergency access usage
2. **Regular Audits**: Review temporal access logs regularly
3. **Cleanup Monitoring**: Monitor automatic cleanup results
4. **Statistics Review**: Use statistics endpoint for access pattern analysis

### Performance
1. **Cache Management**: Temporal role changes automatically invalidate permission caches
2. **Batch Operations**: Use cleanup endpoint for maintenance windows
3. **Index Utilization**: Database indexes optimize temporal queries

## Troubleshooting

### Common Issues

#### Permission Not Applied Immediately
**Symptom**: User doesn't have access despite role assignment
**Solution**: Check if role has `validFrom` date in future, verify role is active

#### Cleanup Not Working
**Symptom**: Expired roles not being removed
**Solution**: Check cleanup service logs, verify database connectivity, run manual cleanup

#### Emergency Access Denied
**Symptom**: Emergency access request fails
**Solution**: Verify duration ≤ 168 hours, check role existence, ensure proper approval

### Debug Commands

```bash
# Check temporal role status
GET /api/v1/admin/temporal-roles/user/{userId}

# Review recent audit logs
GET /api/v1/admin/temporal-roles/audit-logs?limit=50

# Get system statistics
GET /api/v1/admin/temporal-roles/stats

# Manual cleanup
POST /api/v1/admin/temporal-roles/cleanup
```

## Integration Points

### Existing Systems
- **Permission Service**: Transparent integration with existing permission resolution
- **Authentication**: Uses existing auth middleware and role-based access control
- **Audit System**: Integrates with existing logging infrastructure
- **Cache System**: Automatic cache invalidation on temporal role changes

### External Integrations
- **HR Systems**: Can integrate with employee lifecycle events
- **Project Management**: Role assignments can align with project timelines
- **Compliance Systems**: Audit logs support compliance reporting requirements

## Migration Guide

See [Migration Guide](./temporal-permissions-migration.md) for detailed upgrade instructions.

## Testing

Comprehensive test coverage includes:
- Unit tests for temporal role service
- API endpoint tests with authentication
- Permission service integration tests
- Edge cases and error handling

Run tests:
```bash
npm test -- --grep "temporal"
```

## Related Documentation

- [RBAC System Overview](./rbac-system.md)
- [Permission Management](./permission-management.md)
- [API Authentication](../api/authentication.md)
- [Audit Trail System](./audit-trail.md)