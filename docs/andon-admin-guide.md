# Andon System Administrator Guide

## Table of Contents
- [Overview](#overview)
- [System Administration](#system-administration)
- [Configuration Management](#configuration-management)
- [Issue Type Setup](#issue-type-setup)
- [Escalation Rules](#escalation-rules)
- [Notification Templates](#notification-templates)
- [System Settings](#system-settings)
- [Site-Specific Configuration](#site-specific-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Best Practices](#best-practices)

## Overview

As an Andon system administrator, you are responsible for:
- Configuring issue types and categories
- Setting up escalation rules and workflows
- Managing notification templates
- Maintaining system settings
- Monitoring system performance
- Supporting users and resolving issues

This guide provides comprehensive instructions for all administrative tasks.

## System Administration

### Access Requirements

Administrators need:
- **Role**: ADMIN or ANDON_ADMIN role in the system
- **Permissions**: Full CRUD access to Andon configuration
- **Access Path**: `/admin/andon` or Configuration Manager interface

### Administrative Dashboard

```
┌─────────────────────────────────────────────────────────┐
│               ANDON ADMINISTRATION PANEL                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  System Status: ● OPERATIONAL                           │
│  Active Alerts: 47 | Escalated: 3 | Response Rate: 94% │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │Issue Types   │ │Escalation    │ │Notification  │  │
│  │             │ │Rules         │ │Templates     │  │
│  │[Configure]  │ │[Configure]   │ │[Configure]   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │System        │ │Site Config   │ │Analytics &   │  │
│  │Settings      │ │              │ │Reports       │  │
│  │[Configure]  │ │[Configure]   │ │[View]        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Configuration Management

### Configuration Hierarchy

The Andon system uses a hierarchical configuration model:

```
Global Configuration (Default for all sites)
    ↓
Site Configuration (Overrides for specific site)
    ↓
Issue Type Configuration (Specific to issue categories)
    ↓
Alert Instance (Inherits from above)
```

### Managing Global Configurations

Navigate to **Configuration Manager** → **Global Settings**

#### Core Configuration Keys

| Configuration Key | Type | Description | Default Value |
|------------------|------|-------------|---------------|
| `andon.enabled` | Boolean | Master on/off switch | `true` |
| `andon.auto_assign` | Boolean | Enable automatic assignment | `true` |
| `andon.escalation.enabled` | Boolean | Enable auto escalation | `true` |
| `andon.escalation.base_delay` | Number | Base escalation delay (minutes) | `30` |
| `andon.notification.channels` | Array | Active notification channels | `["email", "web"]` |
| `andon.ui.theme` | String | UI theme selection | `"industrial"` |
| `andon.ui.kiosk_mode` | Boolean | Enable kiosk mode for shop floor | `true` |

#### Adding a New Configuration

```json
{
  "configKey": "andon.custom.setting",
  "configValue": "value",
  "description": "Description of the setting",
  "dataType": "STRING",
  "category": "CUSTOM",
  "isRequired": false,
  "defaultValue": "default",
  "accessLevel": "ADMIN"
}
```

### Configuration Categories

Organize configurations by category:

- **GENERAL**: Basic system settings
- **ESCALATION**: Escalation behavior
- **NOTIFICATION**: Notification preferences
- **UI**: User interface settings
- **INTEGRATION**: External system settings
- **SECURITY**: Security-related settings
- **PERFORMANCE**: Performance tuning

## Issue Type Setup

### Creating Issue Types

Navigate to **Issue Types** → **Add New**

#### Required Fields

```yaml
Issue Type Configuration:
  typeCode: QUALITY           # Unique identifier
  typeName: "Quality Issue"   # Display name
  description: "Quality-related problems"
  defaultSeverity: MEDIUM
  defaultPriority: NORMAL

Options:
  requiresAttachment: false   # Mandate photo/file
  requiresWorkOrder: false    # Link to work order required
  requiresEquipment: false    # Equipment selection required

Auto-Assignment:
  autoAssignRole: "QUALITY_INSPECTOR"
  autoAssignUserId: null      # Or specific user ID

Escalation:
  enableEscalation: true
  escalationTimeoutMins: 15   # First escalation after

Visual:
  iconName: "quality-icon"
  colorCode: "#FFA500"        # Orange for quality
  displayOrder: 1              # Sort position
```

### Standard Issue Types

Recommended standard issue types:

| Type Code | Type Name | Default Severity | Color | Icon | Auto-Assign Role |
|-----------|-----------|-----------------|--------|------|------------------|
| SAFETY | Safety | CRITICAL | Red | ⚠️ | SAFETY_OFFICER |
| QUALITY | Quality | HIGH | Orange | 🔍 | QUALITY_INSPECTOR |
| EQUIPMENT | Equipment | HIGH | Yellow | 🔧 | MAINTENANCE_TECH |
| MATERIAL | Material | MEDIUM | Blue | 📦 | MATERIAL_HANDLER |
| PROCESS | Process | MEDIUM | Green | ⚙️ | PROCESS_ENGINEER |
| MAINTENANCE | Maintenance | MEDIUM | Gray | 🔨 | MAINTENANCE_TECH |
| TOOLING | Tooling | LOW | Purple | 🔧 | TOOL_CRIB |
| OTHER | Other | LOW | Gray | ❓ | SUPERVISOR |

### Issue Type Best Practices

1. **Keep it Simple**: Limit to 6-8 core types
2. **Clear Naming**: Use terms familiar to workers
3. **Logical Defaults**: Set severity/priority based on typical impact
4. **Role Mapping**: Ensure auto-assign roles exist and are staffed
5. **Visual Distinction**: Use unique colors and icons

## Escalation Rules

### Understanding Escalation Rules

Escalation rules define:
- **When** to escalate (trigger conditions)
- **Who** to notify (users/roles)
- **How** to notify (channels)
- **What** to do (actions)

### Creating Escalation Rules

Navigate to **Escalation Rules** → **Create Rule**

#### Basic Rule Structure

```json
{
  "ruleName": "Critical Safety Escalation",
  "description": "Immediate escalation for critical safety issues",
  "siteId": null,  // null = all sites
  "issueTypeId": "safety-issue-type-id",

  "triggers": {
    "severity": ["CRITICAL"],
    "afterMinutes": 5,
    "escalationLevel": 0
  },

  "actions": {
    "notifyUserIds": ["user1", "user2"],
    "notifyRoles": ["SAFETY_MANAGER", "PLANT_MANAGER"],
    "notifyChannels": ["EMAIL", "SMS", "PUSH"],
    "assignToRole": "SAFETY_MANAGER"
  },

  "priority": 100,  // Higher = evaluated first
  "isActive": true
}
```

### Advanced Rule Conditions

Use JSON conditions for complex logic:

```json
{
  "conditions": {
    "AND": [
      {"field": "severity", "operator": "IN", "value": ["HIGH", "CRITICAL"]},
      {"field": "responseTime", "operator": ">", "value": 30},
      {
        "OR": [
          {"field": "workCenter", "operator": "=", "value": "WC-001"},
          {"field": "equipment.type", "operator": "=", "value": "CNC"}
        ]
      }
    ]
  }
}
```

### Escalation Level Strategy

```
Level 0 (Immediate Response):
  - Trigger: 0-15 minutes
  - Notify: Direct supervisor, area lead
  - Channel: Web notification

Level 1 (First Escalation):
  - Trigger: 15-30 minutes
  - Notify: Department manager
  - Channel: Email + Web

Level 2 (Second Escalation):
  - Trigger: 30-60 minutes
  - Notify: Production manager
  - Channel: Email + SMS

Level 3 (Critical Escalation):
  - Trigger: 60+ minutes
  - Notify: Plant manager, executive team
  - Channel: All channels
```

### Example Escalation Rules

#### Rule 1: Safety Critical Response

```yaml
Name: "Safety Critical Immediate"
Scope: All Sites
Issue Type: SAFETY
Trigger:
  Severity: CRITICAL
  After: 0 minutes
  Level: 0
Actions:
  Notify Roles: [SAFETY_OFFICER, AREA_MANAGER, PLANT_MANAGER]
  Channels: [EMAIL, SMS, PUSH, PHONE]
  Assign To: SAFETY_OFFICER
Priority: 1000
```

#### Rule 2: Quality Escalation Chain

```yaml
Name: "Quality Progressive Escalation"
Scope: All Sites
Issue Type: QUALITY
Trigger:
  Severity: [HIGH, MEDIUM]
  After: 20 minutes
  Level: 1
Actions:
  Notify Roles: [QUALITY_MANAGER]
  Channels: [EMAIL]
  Escalate: true
Priority: 500
```

## Notification Templates

### Template Management

Navigate to **Notification Templates** → **Manage**

### Template Structure

```handlebars
Subject: {{alertType}} Alert #{{alertNumber}} - {{severity}}

Body:
Alert Details:
- Number: {{alertNumber}}
- Title: {{title}}
- Type: {{issueType.typeName}}
- Severity: {{severity}}
- Priority: {{priority}}
- Location: {{site.siteName}} / {{workCenter.name}}
- Raised By: {{raisedBy.name}}
- Time: {{createdAt}}

Description:
{{description}}

Action Required:
Please acknowledge and respond to this alert immediately.

View Alert: {{alertUrl}}
```

### Standard Templates

#### ALERT_CREATED Template
```
Subject: New {{severity}} Alert: {{title}}
Body: A new alert has been created requiring your attention...
```

#### ALERT_ESCALATED Template
```
Subject: ESCALATED - Alert #{{alertNumber}}
Body: This alert has been escalated to Level {{escalationLevel}}...
```

#### ALERT_RESOLVED Template
```
Subject: Resolved - Alert #{{alertNumber}}
Body: Alert has been resolved. Resolution: {{resolutionNotes}}...
```

### Channel-Specific Templates

#### Email Template (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .alert-box {
      border: 2px solid #ff0000;
      padding: 20px;
      background: #ffe6e6;
    }
  </style>
</head>
<body>
  <div class="alert-box">
    <h2>{{severity}} Alert: {{title}}</h2>
    <p>{{description}}</p>
    <a href="{{alertUrl}}">View Alert</a>
  </div>
</body>
</html>
```

#### SMS Template (160 chars max)
```
{{severity}} Alert #{{alertNumber}}: {{title}}. Reply ACK to acknowledge. {{shortUrl}}
```

#### Slack Template
```json
{
  "text": "New Alert",
  "attachments": [{
    "color": "danger",
    "title": "{{title}}",
    "fields": [
      {"title": "Severity", "value": "{{severity}}", "short": true},
      {"title": "Location", "value": "{{location}}", "short": true}
    ],
    "footer": "Andon System",
    "ts": "{{timestamp}}"
  }]
}
```

### Template Variables

Available variables for templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{alertNumber}}` | Unique alert ID | AND-2024-001234 |
| `{{title}}` | Alert title | "Machine jam at Station 3" |
| `{{severity}}` | Severity level | CRITICAL |
| `{{priority}}` | Priority level | URGENT |
| `{{issueType.typeName}}` | Issue category | "Equipment" |
| `{{site.siteName}}` | Site name | "Plant A" |
| `{{workCenter.name}}` | Work center | "Assembly Line 1" |
| `{{raisedBy.name}}` | Reporter name | "John Smith" |
| `{{createdAt}}` | Creation time | "2024-01-15 10:30:00" |
| `{{alertUrl}}` | Direct link | "https://..." |

## System Settings

### Global System Settings

Navigate to **System Settings** → **Global**

#### Core Settings

```yaml
System Features:
  andonEnabled: true           # Master enable/disable
  escalationEnabled: true       # Auto-escalation on/off
  notificationsEnabled: true    # Notifications on/off

Default Behaviors:
  defaultSeverity: MEDIUM       # If not specified
  defaultPriority: NORMAL       # If not specified
  autoAssignEnabled: true       # Auto-assignment

Timing Configuration:
  defaultResponseTimeMin: 15    # Target response time
  maxEscalationLevels: 3       # Maximum escalation depth
  baseEscalationDelayMin: 30   # Base delay multiplier

UI/UX Settings:
  enableMobileAccess: true     # Mobile interface
  enableKioskMode: true        # Shop floor kiosks
  requireComments: false       # Mandatory comments
  allowAnonymousReports: false # Anonymous alerts
```

### Performance Tuning

```yaml
Performance Settings:
  escalationBatchSize: 50      # Alerts per batch
  escalationIntervalSec: 60    # Check interval
  notificationQueueSize: 100   # Max queued notifications
  notificationRetryCount: 3    # Retry failed notifications
  apiRateLimit: 1000           # Requests per minute
  alertRetentionDays: 90       # Keep closed alerts
```

### Integration Settings

```json
{
  "integrationSettings": {
    "email": {
      "provider": "SMTP",
      "host": "smtp.company.com",
      "port": 587,
      "secure": true,
      "auth": {
        "user": "andon@company.com",
        "pass": "encrypted_password"
      }
    },
    "sms": {
      "provider": "TWILIO",
      "accountSid": "AC...",
      "authToken": "encrypted_token",
      "fromNumber": "+1234567890"
    },
    "slack": {
      "webhookUrl": "https://hooks.slack.com/...",
      "channel": "#andon-alerts",
      "username": "Andon Bot"
    }
  }
}
```

## Site-Specific Configuration

### Managing Site Configurations

Navigate to **Site Configuration** → Select Site

### Site Override Strategy

```yaml
Site: Plant-A
Overrides:
  andon.escalation.base_delay: 15  # Faster than global
  andon.notification.channels: ["email", "sms", "slack"]
  andon.ui.theme: "plant-a-custom"

Inheritance:
  Use Global For: All non-overridden settings
  Override Scope: This site only
  Child Sites: Do not inherit
```

### Common Site Customizations

| Setting | Use Case | Example Override |
|---------|----------|------------------|
| Escalation Timing | High-volume sites need faster response | 10 min vs 30 min |
| Notification Channels | Site has local Slack workspace | Add Slack channel |
| Auto-Assignment | Different staffing model | Assign to pool |
| UI Theme | Site branding | Custom colors |
| Work Hours | Different shifts | 24/7 vs business hours |

## Monitoring and Maintenance

### System Health Monitoring

#### Key Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                 SYSTEM HEALTH METRICS                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Performance Indicators:                                │
│  ├─ Alert Creation Rate: 45/hour (↑12% from average)   │
│  ├─ Avg Response Time: 8.3 minutes (Target: 10 min)    │
│  ├─ Escalation Rate: 15% (Target: <20%)               │
│  └─ Resolution Time: 47 minutes (Target: 60 min)       │
│                                                          │
│  System Status:                                         │
│  ├─ Database: ● Healthy (45ms avg query)              │
│  ├─ Queue Depth: 12 messages (Normal)                  │
│  ├─ API Response: 230ms average                        │
│  └─ Error Rate: 0.2% (Acceptable)                      │
│                                                          │
│  Active Issues:                                         │
│  ├─ None                                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Maintenance Tasks

#### Daily Tasks
- [ ] Review escalated alerts
- [ ] Check notification delivery failures
- [ ] Monitor response time metrics
- [ ] Verify system health indicators

#### Weekly Tasks
- [ ] Review alert patterns and trends
- [ ] Audit escalation rule effectiveness
- [ ] Check user access and permissions
- [ ] Clean up test/cancelled alerts

#### Monthly Tasks
- [ ] Generate performance reports
- [ ] Review and update escalation rules
- [ ] Audit configuration changes
- [ ] Update notification templates
- [ ] Archive old alerts (based on retention policy)

#### Quarterly Tasks
- [ ] Full system audit
- [ ] Update issue type definitions
- [ ] Review site configurations
- [ ] Performance optimization
- [ ] Disaster recovery test

### Database Maintenance

```sql
-- Check alert distribution
SELECT
  issue_type_id,
  severity,
  COUNT(*) as alert_count,
  AVG(resolution_time) as avg_resolution
FROM andon_alerts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY issue_type_id, severity;

-- Find stuck escalations
SELECT *
FROM andon_alerts
WHERE status = 'ESCALATED'
  AND next_escalation_at < NOW()
  AND updated_at < NOW() - INTERVAL '1 hour';

-- Clean up old closed alerts
DELETE FROM andon_alerts
WHERE status = 'CLOSED'
  AND updated_at < NOW() - INTERVAL '90 days';
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Alerts Not Escalating

**Symptoms**: Alerts remain unescalated past trigger time

**Diagnosis Steps**:
1. Check if escalation is enabled globally
2. Verify escalation rules are active
3. Check rule conditions match alert
4. Review escalation engine logs

**Solution**:
```bash
# Check escalation engine status
systemctl status andon-escalation

# Review recent escalation attempts
tail -f /var/log/andon/escalation.log

# Manually trigger escalation check
npm run escalation:check
```

#### Issue: Notifications Not Sending

**Symptoms**: Users not receiving notifications

**Diagnosis Steps**:
1. Verify notification channels enabled
2. Check user notification preferences
3. Review notification queue status
4. Test notification channels

**Solution**:
```javascript
// Test notification channel
await NotificationService.testChannel('email', {
  to: 'test@example.com',
  subject: 'Test',
  body: 'Test message'
});
```

#### Issue: Poor Performance

**Symptoms**: Slow response times, timeouts

**Diagnosis Steps**:
1. Check database query performance
2. Review API response times
3. Monitor queue depth
4. Check for blocking operations

**Solution**:
```sql
-- Add missing indexes
CREATE INDEX idx_alerts_status_created
ON andon_alerts(status, created_at);

-- Optimize slow queries
EXPLAIN ANALYZE <slow_query>;
```

#### Issue: Configuration Not Applied

**Symptoms**: Changes not taking effect

**Diagnosis Steps**:
1. Verify configuration saved
2. Check configuration hierarchy
3. Review site-specific overrides
4. Clear configuration cache

**Solution**:
```bash
# Clear configuration cache
redis-cli FLUSHDB

# Reload configuration
npm run config:reload

# Verify active configuration
curl /api/andon/config/active
```

### Error Messages Reference

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| AND-001 | Invalid issue type | Type doesn't exist | Check issue type ID |
| AND-002 | Escalation failed | Rule execution error | Review rule conditions |
| AND-003 | Notification failed | Channel unavailable | Check channel config |
| AND-004 | Permission denied | Insufficient rights | Verify user permissions |
| AND-005 | Configuration invalid | Bad config value | Validate configuration |

## Best Practices

### Configuration Management

1. **Version Control**: Track all configuration changes
2. **Test First**: Test in staging before production
3. **Document Changes**: Record why changes were made
4. **Gradual Rollout**: Deploy to pilot site first
5. **Regular Review**: Audit configurations quarterly

### Escalation Rules

1. **Start Simple**: Begin with basic rules, add complexity as needed
2. **Avoid Overlaps**: Ensure rules don't conflict
3. **Test Thoroughly**: Simulate various scenarios
4. **Monitor Effectiveness**: Track escalation success rates
5. **Regular Tuning**: Adjust based on metrics

### Performance Optimization

1. **Index Properly**: Add indexes for frequent queries
2. **Archive Regularly**: Move old data to archive
3. **Cache Wisely**: Cache static configurations
4. **Batch Operations**: Process escalations in batches
5. **Monitor Continuously**: Set up alerting for degradation

### Security Best Practices

1. **Least Privilege**: Grant minimum required permissions
2. **Audit Everything**: Log all administrative actions
3. **Encrypt Sensitive Data**: Protect PII and credentials
4. **Regular Updates**: Keep dependencies current
5. **Access Reviews**: Audit user access quarterly

### User Support

1. **Clear Documentation**: Maintain up-to-date guides
2. **Training Programs**: Regular training sessions
3. **Quick Response**: Address issues promptly
4. **Feedback Loop**: Gather and act on user feedback
5. **Continuous Improvement**: Iterate based on usage

## Appendix: Configuration Templates

### Minimal Configuration

```json
{
  "configurations": [
    {"key": "andon.enabled", "value": true},
    {"key": "andon.escalation.enabled", "value": true},
    {"key": "andon.notification.channels", "value": ["email"]}
  ]
}
```

### Standard Production Configuration

```json
{
  "configurations": [
    {"key": "andon.enabled", "value": true},
    {"key": "andon.escalation.enabled", "value": true},
    {"key": "andon.escalation.base_delay", "value": 30},
    {"key": "andon.notification.channels", "value": ["email", "web", "sms"]},
    {"key": "andon.ui.kiosk_mode", "value": true},
    {"key": "andon.auto_assign", "value": true},
    {"key": "andon.require_comments", "value": false}
  ]
}
```

### High-Availability Configuration

```json
{
  "configurations": [
    {"key": "andon.enabled", "value": true},
    {"key": "andon.escalation.enabled", "value": true},
    {"key": "andon.escalation.base_delay", "value": 15},
    {"key": "andon.escalation.max_levels", "value": 5},
    {"key": "andon.notification.channels", "value": ["email", "sms", "push", "slack"]},
    {"key": "andon.notification.retry_count", "value": 5},
    {"key": "andon.performance.cache_ttl", "value": 300},
    {"key": "andon.performance.batch_size", "value": 100}
  ]
}
```

---

*For additional support or advanced configuration needs, contact the Andon system team or refer to the technical documentation.*