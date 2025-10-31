# Time Entry Management System - Quick Setup Guide

**GitHub Issue #51 - Rapid Deployment Instructions**

## 🚀 Quick Start (5 Minutes)

### 1. Database Setup
```bash
# Apply the new schema
npx prisma migrate deploy
npx prisma generate
```

### 2. Environment Configuration
Add to your `.env` file:
```env
# Time Entry Management Settings
AUTO_STOP_CHECK_INTERVAL=60000
DEFAULT_RISK_THRESHOLD=25
MAX_BULK_APPROVAL_SIZE=100
NOTIFICATION_QUEUE_ENABLED=true
```

### 3. Start the Background Services
The auto-stop service will automatically start with your application. Monitor the logs:
```bash
# Look for these log messages
[AutoStopService] Background monitoring started
[TimeEntryNotificationService] Templates initialized
```

### 4. Verify Installation
```bash
# Run the test suite to verify everything works
npm test

# Check that new routes are available
curl http://localhost:3000/api/time-entry-management/health
```

## ⚡ Essential Configuration

### Auto-Approval Thresholds
Navigate to: **Admin → Time Entry Settings → Auto-Approval**

**Recommended Starting Values:**
- **Auto-Approve Threshold**: 25 (low risk)
- **Require Approval Threshold**: 50 (medium risk)
- **Escalation Threshold**: 75 (high risk)

### Auto-Stop Rules
Navigate to: **Admin → Time Entry Settings → Auto-Stop**

**Essential Rules to Create:**

1. **Overtime Prevention**
   ```json
   {
     "name": "12-Hour Limit",
     "maxDuration": 720,
     "behavior": "PROMPT_OPERATOR",
     "isActive": true
   }
   ```

2. **Weekend Monitoring**
   ```json
   {
     "name": "Weekend Check",
     "dayOfWeek": ["SATURDAY", "SUNDAY"],
     "behavior": "STOP_WITH_CONFIRMATION",
     "isActive": true
   }
   ```

### User Permissions
Ensure these roles have proper access:
- **Operators**: Can submit edits, view their history
- **Supervisors**: Can approve/reject edits, view team metrics
- **Managers**: Can configure rules, view system analytics

## 📱 User Access Points

### For Operators
- **Main Interface**: Time Tracking → My Time Entries
- **Submit Correction**: Click "Request Correction" on any entry
- **Check Status**: Time Tracking → Correction History

### For Supervisors
- **Approval Dashboard**: Supervision → Time Entry Approvals
- **Team Metrics**: Supervision → Team Performance
- **Delegation**: Supervision → Approval Settings

### For Admins
- **System Configuration**: Admin → Time Entry Settings
- **Auto-Stop Rules**: Admin → Auto-Stop Configuration
- **Notification Templates**: Admin → Notification Settings

## 🔧 Day-One Customization

### 1. Adjust Risk Scoring
Based on your organization's tolerance:
- **Conservative**: Lower thresholds (15/35/65)
- **Moderate**: Default thresholds (25/50/75)
- **Liberal**: Higher thresholds (35/65/85)

### 2. Configure Business Rules
```javascript
// Example: Stricter rules for payroll accuracy
{
  "maxTimeAdjustment": 15,        // Only 15-minute changes
  "allowCrossDayEdits": false,    // No cross-day edits
  "maxEditsPerDay": 2,            // Max 2 edits per day
  "requireReasonMinLength": 15    // Detailed reasons required
}
```

### 3. Set Up Notifications
Test notification delivery:
```bash
# Send a test notification
curl -X POST http://localhost:3000/api/time-entry-management/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "type": "EDIT_SUBMITTED"}'
```

## 📊 Monitoring Dashboard

### Key Metrics to Watch
1. **Auto-Approval Rate**: Should be 60-80% for optimal efficiency
2. **Average Approval Time**: Target <2 hours during business hours
3. **Rejection Rate**: Should be <10% with good user training
4. **Auto-Stop Triggers**: Monitor for patterns indicating issues

### Health Checks
```bash
# System health endpoint
curl http://localhost:3000/api/time-entry-management/health

# Check background services
curl http://localhost:3000/api/time-entry-management/services/status
```

## 🚨 Common First-Day Issues

### Issue: Auto-Approvals Not Working
**Solution**: Check that `DEFAULT_RISK_THRESHOLD` is set and restart the service.

### Issue: Notifications Not Sending
**Solution**: Verify email/SMS provider credentials in environment variables.

### Issue: Auto-Stop Not Triggering
**Solution**: Confirm background service is running and configurations are active.

### Issue: Permission Errors
**Solution**: Verify user roles are properly assigned in the database.

## 📞 Quick Support

### Log Locations
- **Application Logs**: `/var/log/machshop/app.log`
- **Time Entry Logs**: `/var/log/machshop/time-entry.log`
- **Background Service Logs**: `/var/log/machshop/background.log`

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
TIME_ENTRY_DEBUG=true
```

### Emergency Contacts
- **System Down**: Contact DevOps team immediately
- **Data Issues**: Contact Database Administrator
- **User Training**: Contact HR/Training team

## ✅ Go-Live Checklist

- [ ] Database migration completed successfully
- [ ] Environment variables configured
- [ ] Auto-approval thresholds set appropriately
- [ ] Auto-stop rules configured and active
- [ ] User roles and permissions verified
- [ ] Notification system tested
- [ ] Monitoring dashboard accessible
- [ ] Backup procedures in place
- [ ] User training materials distributed
- [ ] Support team briefed

## 🎯 Success Metrics (Week 1)

Track these metrics to ensure successful deployment:
- **User Adoption**: >70% of operators use self-correction
- **Supervisor Efficiency**: <2 hour average approval time
- **System Reliability**: <1% error rate
- **User Satisfaction**: Positive feedback from initial users

---

**Need Help?** Check the full documentation: `docs/time-entry-management-system.md`

**Quick Reference Card**: Print this guide for operators and supervisors