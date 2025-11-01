# Temporal Permissions Migration Guide

## Overview

This guide provides step-by-step instructions for migrating to the Temporal Permissions System (Issue #126). The migration is designed to be **backward compatible** - existing role assignments will continue to work without modification.

## Migration Strategy

### Zero-Downtime Approach
- 🔄 **Backward Compatible**: Existing roles remain functional
- 📊 **Schema Extensions**: New fields added with sensible defaults
- 🚀 **Gradual Adoption**: Can adopt temporal features incrementally
- 🔒 **No Data Loss**: All existing data preserved

## Pre-Migration Checklist

### System Requirements
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database with backup
- [ ] System Administrator access
- [ ] Application downtime window (optional, recommended)

### Backup Requirements
```bash
# Database backup
pg_dump -h localhost -U mes_user mes_production > backup_pre_temporal_$(date +%Y%m%d_%H%M%S).sql

# Application code backup
git tag v1.0-pre-temporal
git push origin v1.0-pre-temporal
```

## Migration Steps

### Step 1: Database Schema Migration

#### 1.1 Run Prisma Migration
```bash
# Navigate to project directory
cd /path/to/MachShop2

# Generate and apply migration
npx prisma db push
# OR if using migrations
npx prisma migrate dev --name add-temporal-permissions
```

#### 1.2 Verify Schema Changes
```sql
-- Check UserRole table structure
\d user_roles

-- Expected new columns:
-- valid_from     timestamp(3)
-- expires_at     timestamp(3)
-- is_temporary   boolean default false
-- grant_reason   text

-- Check TemporalAccessLog table creation
\d temporal_access_logs
```

#### 1.3 Validate Data Integrity
```sql
-- Verify all existing roles are marked as permanent
SELECT COUNT(*) as total_roles,
       COUNT(*) FILTER (WHERE is_temporary = false) as permanent_roles,
       COUNT(*) FILTER (WHERE is_temporary = true) as temporal_roles
FROM user_roles;

-- Should show all roles as permanent (is_temporary = false)
```

### Step 2: Application Deployment

#### 2.1 Deploy Updated Code
```bash
# Pull latest changes
git checkout issue-126-temporal-permissions
git pull origin issue-126-temporal-permissions

# Install dependencies
npm install

# Build application
npm run build
```

#### 2.2 Update Environment Variables
```bash
# Add to .env (if needed)
# No new environment variables required for temporal permissions
```

#### 2.3 Restart Application Services
```bash
# Using PM2
pm2 restart mes-api

# Using systemd
sudo systemctl restart mes-api

# Using Docker
docker-compose restart api
```

### Step 3: Verification & Testing

#### 3.1 API Health Check
```bash
# Check application status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/v1/admin/temporal-roles/stats

# Expected response:
{
  "success": true,
  "statistics": {
    "activeTemporalRoles": 0,
    "expiredTemporalRoles": 0,
    "pendingTemporalRoles": 0,
    "emergencyAccessLast24h": 0,
    "auditActivityLast7d": 0
  }
}
```

#### 3.2 Permission System Verification
```bash
# Test existing user permissions (should work unchanged)
curl -H "Authorization: Bearer USER_TOKEN" \
     http://localhost:3001/api/v1/dashboard

# Test admin access to temporal endpoints
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:3001/api/v1/admin/temporal-roles/user/USER_ID
```

#### 3.3 Backward Compatibility Test
```sql
-- Verify existing role assignments still work
SELECT u.name, r.name as role_name, ur.assigned_at, ur.is_temporary
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
LIMIT 10;
```

### Step 4: Feature Enablement

#### 4.1 Test Temporal Role Assignment
```bash
# Test basic temporal role assignment
curl -X POST \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user-id",
       "roleId": "test-role-id",
       "isTemporary": true,
       "expiresAt": "2025-12-31T23:59:59Z",
       "grantReason": "Migration test assignment"
     }' \
     http://localhost:3001/api/v1/admin/temporal-roles/assign
```

#### 4.2 Test Emergency Access
```bash
# Test emergency access functionality
curl -X POST \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user-id",
       "roleId": "test-role-id",
       "emergencyReason": "Migration test - emergency access",
       "durationHours": 2
     }' \
     http://localhost:3001/api/v1/admin/temporal-roles/emergency-access
```

#### 4.3 Test Cleanup Process
```bash
# Test manual cleanup
curl -X POST \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:3001/api/v1/admin/temporal-roles/cleanup
```

## Post-Migration Tasks

### Setup Monitoring

#### 4.1 Configure Cleanup Scheduling
Add to your cron jobs or task scheduler:
```bash
# Run cleanup every hour
0 * * * * curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:3001/api/v1/admin/temporal-roles/cleanup

# Or integrate with your existing job scheduler
```

#### 4.2 Setup Alerts
Configure monitoring for:
- Emergency access usage
- Failed cleanup operations
- High temporal role usage
- Expired roles not cleaned up

```javascript
// Example monitoring check
const checkTemporalRoleHealth = async () => {
  const stats = await fetch('/api/v1/admin/temporal-roles/stats');
  const data = await stats.json();

  if (data.statistics.emergencyAccessLast24h > 5) {
    // Alert: High emergency access usage
  }

  if (data.statistics.expiredTemporalRoles > 100) {
    // Alert: Many expired roles not cleaned up
  }
};
```

### User Training

#### 4.3 Administrator Training
- [ ] Train system administrators on temporal role management
- [ ] Provide access to API documentation
- [ ] Establish emergency access approval workflows
- [ ] Set up audit log review procedures

#### 4.4 Update Operational Procedures
- [ ] Document temporal role assignment procedures
- [ ] Update security policies for emergency access
- [ ] Establish regular temporal role reviews
- [ ] Create cleanup monitoring procedures

## Rollback Procedures

### Emergency Rollback (if needed)

#### Option 1: Code Rollback (Recommended)
```bash
# Revert to previous version
git checkout v1.0-pre-temporal
npm install
npm run build
pm2 restart mes-api

# Database will remain compatible (schema is additive)
```

#### Option 2: Database Rollback (if necessary)
```sql
-- ONLY if database rollback is absolutely necessary
-- This will lose temporal permission data

-- Remove temporal-specific columns (use with caution)
ALTER TABLE user_roles
  DROP COLUMN IF EXISTS valid_from,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS is_temporary,
  DROP COLUMN IF EXISTS grant_reason;

-- Drop temporal access log table
DROP TABLE IF EXISTS temporal_access_logs;
```

⚠️ **Warning**: Database rollback will lose all temporal role assignments and audit logs.

## Common Issues & Solutions

### Issue 1: Migration Fails
**Symptoms**: Database migration errors
**Solution**:
```bash
# Check database connection
npx prisma db pull

# Manual migration if needed
npx prisma migrate reset
npx prisma db push
```

### Issue 2: Permission Cache Issues
**Symptoms**: Users don't see new permissions immediately
**Solution**:
```javascript
// Clear permission cache for all users
const { clearAllPermissionCaches } = require('./src/services/permissionService');
await clearAllPermissionCaches();
```

### Issue 3: API Endpoints Not Found
**Symptoms**: 404 errors on temporal role endpoints
**Solution**:
```bash
# Verify route registration in src/index.ts
grep -n "temporal-roles" src/index.ts

# Restart application
pm2 restart mes-api
```

### Issue 4: Test Failures
**Symptoms**: Tests failing after migration
**Solution**:
```bash
# Run temporal-specific tests
npm test -- --grep "temporal"

# Update test database
NODE_ENV=test npx prisma db push
```

## Validation Checklist

### ✅ Pre-Production Validation
- [ ] All existing users can still access their assigned resources
- [ ] System Administrator can access temporal role endpoints
- [ ] Database migration completed without errors
- [ ] No application errors in logs
- [ ] Backup created and verified
- [ ] Test temporal role assignment works
- [ ] Test emergency access works
- [ ] Test cleanup process works

### ✅ Production Validation
- [ ] Application starts successfully
- [ ] All existing functionality working
- [ ] Temporal role endpoints responding
- [ ] No errors in application logs
- [ ] Performance metrics normal
- [ ] User logins working
- [ ] Permission resolution working

### ✅ Post-Migration Monitoring
- [ ] Monitor application logs for 24 hours
- [ ] Check database performance
- [ ] Verify cleanup jobs running
- [ ] Monitor temporal role usage
- [ ] Review audit logs

## Performance Considerations

### Database Performance
- New indexes on temporal fields optimize queries
- Cleanup process runs efficiently with batch operations
- Permission cache reduces database load

### Application Performance
- Temporal validation adds minimal overhead
- Cache invalidation is optimized for affected users only
- API endpoints are properly authorized and rate-limited

### Monitoring Queries
```sql
-- Monitor temporal role usage
SELECT
  DATE_TRUNC('day', assigned_at) as date,
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE is_temporary = true) as temporal_assignments
FROM user_roles
WHERE assigned_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', assigned_at)
ORDER BY date;

-- Monitor cleanup efficiency
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as cleanup_operations
FROM temporal_access_logs
WHERE access_type = 'CLEANUP'
AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour;
```

## Support & Resources

### Documentation
- [Temporal Permissions Overview](./temporal-permissions.md)
- [API Reference](./temporal-permissions.md#api-reference)
- [Best Practices](./temporal-permissions.md#best-practices)

### Getting Help
- Check application logs: `pm2 logs mes-api`
- Review audit logs via API: `/api/v1/admin/temporal-roles/audit-logs`
- Check system statistics: `/api/v1/admin/temporal-roles/stats`

### Contact Information
- Technical Support: [Internal Support Channel]
- Database Issues: [DBA Team]
- Security Questions: [Security Team]

---

**Migration Completed Successfully! 🎉**

Your system now supports temporal permissions with full backward compatibility. Existing role assignments continue to work while new temporal features are available for gradual adoption.