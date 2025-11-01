/**
 * Andon System Seed Data
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * Comprehensive seed data for Andon system including:
 * - Default issue types for common manufacturing scenarios
 * - Global configuration settings
 * - Notification templates
 * - System settings
 * - Escalation rules
 */

import { PrismaClient, AndonSeverity, AndonPriority, AndonAlertStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DEFAULT ISSUE TYPES
// ============================================================================

export const DEFAULT_ISSUE_TYPES = [
  {
    typeCode: 'QUALITY',
    typeName: 'Quality Issue',
    description: 'Product quality concerns, defects, or non-conforming materials',
    defaultSeverity: AndonSeverity.HIGH,
    defaultPriority: AndonPriority.HIGH,
    requiresAttachment: true,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'QUALITY_INSPECTOR',
    enableEscalation: true,
    escalationTimeoutMins: 15,
    iconName: '🔍',
    colorCode: '#f5222d',
    displayOrder: 1
  },
  {
    typeCode: 'SAFETY',
    typeName: 'Safety Concern',
    description: 'Safety hazards, incidents, or unsafe conditions requiring immediate attention',
    defaultSeverity: AndonSeverity.CRITICAL,
    defaultPriority: AndonPriority.URGENT,
    requiresAttachment: true,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'SAFETY_MANAGER',
    enableEscalation: true,
    escalationTimeoutMins: 5,
    iconName: '⚠️',
    colorCode: '#fa541c',
    displayOrder: 2
  },
  {
    typeCode: 'EQUIPMENT',
    typeName: 'Equipment Issue',
    description: 'Equipment malfunction, breakdown, or maintenance required',
    defaultSeverity: AndonSeverity.HIGH,
    defaultPriority: AndonPriority.HIGH,
    requiresAttachment: false,
    requiresWorkOrder: true,
    requiresEquipment: true,
    autoAssignRole: 'MAINTENANCE_TECHNICIAN',
    enableEscalation: true,
    escalationTimeoutMins: 30,
    iconName: '🔧',
    colorCode: '#722ed1',
    displayOrder: 3
  },
  {
    typeCode: 'MATERIAL',
    typeName: 'Material Issue',
    description: 'Material shortage, defect, or supply chain disruption',
    defaultSeverity: AndonSeverity.MEDIUM,
    defaultPriority: AndonPriority.NORMAL,
    requiresAttachment: false,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'MATERIALS_MANAGER',
    enableEscalation: true,
    escalationTimeoutMins: 45,
    iconName: '📦',
    colorCode: '#fa8c16',
    displayOrder: 4
  },
  {
    typeCode: 'PROCESS',
    typeName: 'Process Issue',
    description: 'Manufacturing process problems or deviations from standard procedures',
    defaultSeverity: AndonSeverity.MEDIUM,
    defaultPriority: AndonPriority.NORMAL,
    requiresAttachment: false,
    requiresWorkOrder: true,
    requiresEquipment: false,
    autoAssignRole: 'PROCESS_ENGINEER',
    enableEscalation: true,
    escalationTimeoutMins: 60,
    iconName: '⚙️',
    colorCode: '#13c2c2',
    displayOrder: 5
  },
  {
    typeCode: 'TOOLING',
    typeName: 'Tooling Issue',
    description: 'Tool malfunction, wear, or calibration issues',
    defaultSeverity: AndonSeverity.MEDIUM,
    defaultPriority: AndonPriority.NORMAL,
    requiresAttachment: false,
    requiresWorkOrder: false,
    requiresEquipment: true,
    autoAssignRole: 'TOOL_ROOM_MANAGER',
    enableEscalation: true,
    escalationTimeoutMins: 30,
    iconName: '🔨',
    colorCode: '#52c41a',
    displayOrder: 6
  },
  {
    typeCode: 'ENVIRONMENTAL',
    typeName: 'Environmental Issue',
    description: 'Environmental controls, temperature, humidity, or cleanliness issues',
    defaultSeverity: AndonSeverity.MEDIUM,
    defaultPriority: AndonPriority.NORMAL,
    requiresAttachment: false,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'FACILITIES_MANAGER',
    enableEscalation: true,
    escalationTimeoutMins: 90,
    iconName: '🌡️',
    colorCode: '#1890ff',
    displayOrder: 7
  },
  {
    typeCode: 'LOGISTICS',
    typeName: 'Logistics Issue',
    description: 'Material handling, transportation, or staging problems',
    defaultSeverity: AndonSeverity.LOW,
    defaultPriority: AndonPriority.NORMAL,
    requiresAttachment: false,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'LOGISTICS_COORDINATOR',
    enableEscalation: true,
    escalationTimeoutMins: 120,
    iconName: '🚛',
    colorCode: '#eb2f96',
    displayOrder: 8
  },
  {
    typeCode: 'SUPPORT',
    typeName: 'Support Request',
    description: 'General support requests or assistance needed',
    defaultSeverity: AndonSeverity.LOW,
    defaultPriority: AndonPriority.LOW,
    requiresAttachment: false,
    requiresWorkOrder: false,
    requiresEquipment: false,
    autoAssignRole: 'SUPERVISOR',
    enableEscalation: true,
    escalationTimeoutMins: 180,
    iconName: '🤝',
    colorCode: '#595959',
    displayOrder: 9
  }
];

// ============================================================================
// DEFAULT GLOBAL CONFIGURATIONS
// ============================================================================

export const DEFAULT_GLOBAL_CONFIGURATIONS = [
  // General Settings
  {
    configKey: 'andon.system.enabled',
    configValue: true,
    description: 'Enable or disable the entire Andon system',
    dataType: 'BOOLEAN',
    category: 'GENERAL',
    isRequired: true,
    defaultValue: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.system.name',
    configValue: 'Manufacturing Andon System',
    description: 'Display name for the Andon system',
    dataType: 'STRING',
    category: 'GENERAL',
    isRequired: true,
    defaultValue: 'Andon System',
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.system.auto_refresh_seconds',
    configValue: 30,
    description: 'Auto-refresh interval for active alerts in seconds',
    dataType: 'NUMBER',
    category: 'GENERAL',
    isRequired: false,
    defaultValue: 30,
    accessLevel: 'MANAGER'
  },

  // Escalation Settings
  {
    configKey: 'andon.escalation.enabled',
    configValue: true,
    description: 'Enable automatic alert escalation',
    dataType: 'BOOLEAN',
    category: 'ESCALATION',
    isRequired: true,
    defaultValue: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.escalation.default_delay_minutes',
    configValue: 30,
    description: 'Default escalation delay in minutes',
    dataType: 'NUMBER',
    category: 'ESCALATION',
    isRequired: true,
    defaultValue: 30,
    accessLevel: 'MANAGER'
  },
  {
    configKey: 'andon.escalation.max_levels',
    configValue: 5,
    description: 'Maximum number of escalation levels',
    dataType: 'NUMBER',
    category: 'ESCALATION',
    isRequired: true,
    defaultValue: 5,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.escalation.weekend_behavior',
    configValue: 'DELAY',
    description: 'How to handle escalations on weekends (NORMAL, DELAY, SKIP)',
    dataType: 'STRING',
    category: 'ESCALATION',
    isRequired: false,
    defaultValue: 'DELAY',
    accessLevel: 'MANAGER'
  },

  // Notification Settings
  {
    configKey: 'andon.notifications.email.enabled',
    configValue: true,
    description: 'Enable email notifications',
    dataType: 'BOOLEAN',
    category: 'NOTIFICATION',
    isRequired: true,
    defaultValue: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.notifications.sms.enabled',
    configValue: false,
    description: 'Enable SMS notifications',
    dataType: 'BOOLEAN',
    category: 'NOTIFICATION',
    isRequired: false,
    defaultValue: false,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.notifications.push.enabled',
    configValue: true,
    description: 'Enable push notifications',
    dataType: 'BOOLEAN',
    category: 'NOTIFICATION',
    isRequired: false,
    defaultValue: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.notifications.digest.enabled',
    configValue: true,
    description: 'Enable daily notification digests',
    dataType: 'BOOLEAN',
    category: 'NOTIFICATION',
    isRequired: false,
    defaultValue: true,
    accessLevel: 'MANAGER'
  },

  // UI Settings
  {
    configKey: 'andon.ui.theme',
    configValue: { primaryColor: '#1890ff', errorColor: '#f5222d', warningColor: '#fa541c' },
    description: 'UI theme configuration',
    dataType: 'JSON',
    category: 'UI',
    isRequired: false,
    defaultValue: { primaryColor: '#1890ff', errorColor: '#f5222d', warningColor: '#fa541c' },
    accessLevel: 'MANAGER'
  },
  {
    configKey: 'andon.ui.kiosk_mode.enabled',
    configValue: true,
    description: 'Enable kiosk mode for touch screen terminals',
    dataType: 'BOOLEAN',
    category: 'UI',
    isRequired: false,
    defaultValue: true,
    accessLevel: 'MANAGER'
  },
  {
    configKey: 'andon.ui.mobile_enabled',
    configValue: true,
    description: 'Enable mobile access to Andon system',
    dataType: 'BOOLEAN',
    category: 'UI',
    isRequired: false,
    defaultValue: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.ui.quick_alerts',
    configValue: ['QUALITY', 'SAFETY', 'EQUIPMENT', 'MATERIAL'],
    description: 'Quick alert buttons to display on shop floor interface',
    dataType: 'ARRAY',
    category: 'UI',
    isRequired: false,
    defaultValue: ['QUALITY', 'SAFETY', 'EQUIPMENT', 'MATERIAL'],
    accessLevel: 'MANAGER'
  },

  // Integration Settings
  {
    configKey: 'andon.integration.email.smtp_config',
    configValue: {
      host: 'localhost',
      port: 587,
      secure: false,
      from: 'andon@company.com'
    },
    description: 'SMTP configuration for email notifications',
    dataType: 'JSON',
    category: 'INTEGRATION',
    isRequired: false,
    isEncrypted: true,
    accessLevel: 'ADMIN'
  },
  {
    configKey: 'andon.integration.external_systems',
    configValue: [],
    description: 'List of external systems to integrate with',
    dataType: 'ARRAY',
    category: 'INTEGRATION',
    isRequired: false,
    defaultValue: [],
    accessLevel: 'ADMIN'
  }
];

// ============================================================================
// DEFAULT NOTIFICATION TEMPLATES
// ============================================================================

export const DEFAULT_NOTIFICATION_TEMPLATES = [
  {
    templateKey: 'ALERT_CREATED',
    templateName: 'New Alert Created',
    description: 'Notification sent when a new Andon alert is created',
    subject: 'New Andon Alert: {{alert.title}}',
    bodyTemplate: `A new Andon alert has been created:

Alert Number: {{alert.alertNumber}}
Title: {{alert.title}}
Severity: {{alert.severity}}
Priority: {{alert.priority}}
Location: {{alert.site.siteName}} - {{alert.area.areaName}}
Created By: {{alert.raisedBy.firstName}} {{alert.raisedBy.lastName}}
Created At: {{alert.createdAt}}

Description: {{alert.description}}

Please review and take appropriate action.

View Alert: {{actionUrl}}`,
    variables: {
      alert: 'Alert object with all properties',
      actionUrl: 'URL to view the alert'
    },
    emailTemplate: `<!DOCTYPE html>
<html>
<head><title>New Andon Alert</title></head>
<body>
<h2 style="color: #f5222d;">🚨 New Andon Alert</h2>
<p><strong>{{alert.title}}</strong></p>
<table style="border-collapse: collapse; width: 100%;">
<tr><td><strong>Alert Number:</strong></td><td>{{alert.alertNumber}}</td></tr>
<tr><td><strong>Severity:</strong></td><td><span style="color: #f5222d;">{{alert.severity}}</span></td></tr>
<tr><td><strong>Priority:</strong></td><td>{{alert.priority}}</td></tr>
<tr><td><strong>Location:</strong></td><td>{{alert.site.siteName}} - {{alert.area.areaName}}</td></tr>
<tr><td><strong>Created By:</strong></td><td>{{alert.raisedBy.firstName}} {{alert.raisedBy.lastName}}</td></tr>
</table>
<p>{{alert.description}}</p>
<a href="{{actionUrl}}" style="background: #1890ff; color: white; padding: 10px 20px; text-decoration: none;">View Alert</a>
</body>
</html>`,
    smsTemplate: 'Andon Alert: {{alert.title}} ({{alert.severity}}) at {{alert.site.siteName}}. View: {{actionUrl}}',
    priority: 100
  },
  {
    templateKey: 'ALERT_ESCALATED',
    templateName: 'Alert Escalated',
    description: 'Notification sent when an alert is escalated',
    subject: 'Escalated Andon Alert: {{alert.title}}',
    bodyTemplate: `An Andon alert has been escalated:

Alert Number: {{alert.alertNumber}}
Title: {{alert.title}}
Severity: {{alert.severity}}
Escalation Level: {{escalationLevel}}
Time Since Created: {{timeSinceCreated}}

This alert requires immediate attention.

View Alert: {{actionUrl}}`,
    variables: {
      alert: 'Alert object',
      escalationLevel: 'Current escalation level',
      timeSinceCreated: 'Time elapsed since alert creation',
      actionUrl: 'URL to view the alert'
    },
    priority: 90
  },
  {
    templateKey: 'ALERT_RESOLVED',
    templateName: 'Alert Resolved',
    description: 'Notification sent when an alert is resolved',
    subject: 'Resolved Andon Alert: {{alert.title}}',
    bodyTemplate: `An Andon alert has been resolved:

Alert Number: {{alert.alertNumber}}
Title: {{alert.title}}
Resolved By: {{alert.resolvedBy.firstName}} {{alert.resolvedBy.lastName}}
Resolution Time: {{alert.resolutionTime}} minutes

Resolution Notes: {{alert.resolutionNotes}}
Action Taken: {{alert.resolutionActionTaken}}

View Alert: {{actionUrl}}`,
    variables: {
      alert: 'Alert object',
      actionUrl: 'URL to view the alert'
    },
    priority: 80
  }
];

// ============================================================================
// DEFAULT SYSTEM SETTINGS
// ============================================================================

export const DEFAULT_SYSTEM_SETTINGS = {
  // Core features
  andonEnabled: true,
  escalationEnabled: true,
  notificationsEnabled: true,

  // Default behaviors
  defaultSeverity: AndonSeverity.MEDIUM,
  defaultPriority: AndonPriority.NORMAL,
  autoAssignEnabled: true,

  // Timing settings
  defaultResponseTimeMin: 15,
  maxEscalationLevels: 5,
  baseEscalationDelayMin: 30,

  // UI/UX settings
  enableMobileAccess: true,
  enableKioskMode: true,
  requireComments: false,
  allowAnonymousReports: false,

  // Integration settings
  integrationSettings: {
    enableWebhooks: false,
    webhookUrl: null,
    enableApiAccess: true,
    apiRateLimit: 1000
  }
};

// ============================================================================
// DEFAULT ESCALATION RULES
// ============================================================================

export const DEFAULT_ESCALATION_RULES = [
  {
    ruleName: 'Critical Safety Escalation',
    description: 'Immediate escalation for critical safety issues',
    triggerSeverity: [AndonSeverity.CRITICAL],
    triggerAfterMinutes: 5,
    escalationLevel: 1,
    notifyRoles: ['SAFETY_MANAGER', 'PLANT_MANAGER'],
    notifyChannels: ['EMAIL', 'SMS', 'PUSH'],
    assignToRole: 'SAFETY_MANAGER',
    priority: 10
  },
  {
    ruleName: 'Quality Issue Escalation',
    description: 'Escalation for unresolved quality issues',
    triggerSeverity: [AndonSeverity.HIGH, AndonSeverity.CRITICAL],
    triggerAfterMinutes: 15,
    escalationLevel: 1,
    notifyRoles: ['QUALITY_MANAGER', 'PRODUCTION_MANAGER'],
    notifyChannels: ['EMAIL', 'PUSH'],
    assignToRole: 'QUALITY_MANAGER',
    priority: 20
  },
  {
    ruleName: 'Equipment Down Escalation',
    description: 'Escalation for equipment downtime issues',
    triggerSeverity: [AndonSeverity.HIGH, AndonSeverity.CRITICAL],
    triggerAfterMinutes: 30,
    escalationLevel: 1,
    notifyRoles: ['MAINTENANCE_MANAGER', 'PRODUCTION_MANAGER'],
    notifyChannels: ['EMAIL', 'PUSH'],
    assignToRole: 'MAINTENANCE_MANAGER',
    priority: 30
  },
  {
    ruleName: 'General Issue Level 2',
    description: 'Second level escalation for unresolved issues',
    triggerSeverity: [AndonSeverity.MEDIUM, AndonSeverity.HIGH, AndonSeverity.CRITICAL],
    triggerAfterMinutes: 60,
    escalationLevel: 2,
    notifyRoles: ['PLANT_MANAGER'],
    notifyChannels: ['EMAIL', 'SMS'],
    assignToRole: 'PLANT_MANAGER',
    priority: 40
  },
  {
    ruleName: 'Executive Escalation',
    description: 'Final escalation to executive level',
    triggerSeverity: [AndonSeverity.CRITICAL],
    triggerAfterMinutes: 120,
    escalationLevel: 3,
    notifyRoles: ['OPERATIONS_DIRECTOR'],
    notifyChannels: ['EMAIL', 'SMS'],
    priority: 50
  }
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seed default issue types
 */
export async function seedAndonIssueTypes(siteId?: string, createdBy: string = 'system') {
  console.log('Seeding Andon issue types...');

  const issueTypes = [];
  for (const typeData of DEFAULT_ISSUE_TYPES) {
    try {
      const issueType = await prisma.andonIssueType.upsert({
        where: { typeCode: typeData.typeCode },
        update: typeData,
        create: {
          ...typeData,
          siteId,
          createdBy
        }
      });
      issueTypes.push(issueType);
      console.log(`✓ Created issue type: ${typeData.typeName}`);
    } catch (error) {
      console.error(`✗ Failed to create issue type ${typeData.typeCode}:`, error);
    }
  }

  return issueTypes;
}

/**
 * Seed default global configurations
 */
export async function seedAndonGlobalConfigurations(lastModifiedBy: string = 'system') {
  console.log('Seeding Andon global configurations...');

  const configurations = [];
  for (const configData of DEFAULT_GLOBAL_CONFIGURATIONS) {
    try {
      const configuration = await prisma.andonConfiguration.upsert({
        where: { configKey: configData.configKey },
        update: { ...configData, lastModifiedBy },
        create: { ...configData, lastModifiedBy }
      });
      configurations.push(configuration);
      console.log(`✓ Created configuration: ${configData.configKey}`);
    } catch (error) {
      console.error(`✗ Failed to create configuration ${configData.configKey}:`, error);
    }
  }

  return configurations;
}

/**
 * Seed default notification templates
 */
export async function seedAndonNotificationTemplates(siteId?: string, createdBy: string = 'system') {
  console.log('Seeding Andon notification templates...');

  const templates = [];
  for (const templateData of DEFAULT_NOTIFICATION_TEMPLATES) {
    try {
      const template = await prisma.andonNotificationTemplate.upsert({
        where: { templateKey: templateData.templateKey },
        update: templateData,
        create: {
          ...templateData,
          siteId,
          createdBy
        }
      });
      templates.push(template);
      console.log(`✓ Created notification template: ${templateData.templateName}`);
    } catch (error) {
      console.error(`✗ Failed to create notification template ${templateData.templateKey}:`, error);
    }
  }

  return templates;
}

/**
 * Seed default system settings
 */
export async function seedAndonSystemSettings(siteId?: string, lastModifiedBy: string = 'system') {
  console.log('Seeding Andon system settings...');

  try {
    const settings = await prisma.andonSystemSettings.upsert({
      where: { siteId: siteId || 'global-settings' },
      update: { ...DEFAULT_SYSTEM_SETTINGS, lastModifiedBy },
      create: {
        siteId,
        ...DEFAULT_SYSTEM_SETTINGS,
        lastModifiedBy
      }
    });

    console.log(`✓ Created system settings for ${siteId || 'global'}`);
    return settings;
  } catch (error) {
    console.error('✗ Failed to create system settings:', error);
    throw error;
  }
}

/**
 * Seed default escalation rules
 */
export async function seedAndonEscalationRules(siteId?: string, createdBy: string = 'system') {
  console.log('Seeding Andon escalation rules...');

  const rules = [];
  for (const ruleData of DEFAULT_ESCALATION_RULES) {
    try {
      const rule = await prisma.andonEscalationRule.create({
        data: {
          ...ruleData,
          siteId,
          createdBy
        }
      });
      rules.push(rule);
      console.log(`✓ Created escalation rule: ${ruleData.ruleName}`);
    } catch (error) {
      console.error(`✗ Failed to create escalation rule ${ruleData.ruleName}:`, error);
    }
  }

  return rules;
}

/**
 * Seed all Andon default data
 */
export async function seedAllAndonData(siteId?: string, userId: string = 'system') {
  console.log('🚀 Starting Andon system seeding...');

  try {
    // Seed in order of dependencies
    const issueTypes = await seedAndonIssueTypes(siteId, userId);
    const configurations = await seedAndonGlobalConfigurations(userId);
    const templates = await seedAndonNotificationTemplates(siteId, userId);
    const settings = await seedAndonSystemSettings(siteId, userId);
    const rules = await seedAndonEscalationRules(siteId, userId);

    console.log('✅ Andon system seeding completed successfully!');
    console.log(`   Issue Types: ${issueTypes.length}`);
    console.log(`   Configurations: ${configurations.length}`);
    console.log(`   Notification Templates: ${templates.length}`);
    console.log(`   Escalation Rules: ${rules.length}`);

    return {
      issueTypes,
      configurations,
      templates,
      settings,
      rules
    };
  } catch (error) {
    console.error('❌ Andon system seeding failed:', error);
    throw error;
  }
}

/**
 * Clean up all Andon seed data (for testing)
 */
export async function cleanupAndonSeedData() {
  console.log('🧹 Cleaning up Andon seed data...');

  try {
    await prisma.andonEscalationRuleResult.deleteMany();
    await prisma.andonEscalationRule.deleteMany();
    await prisma.andonAlert.deleteMany();
    await prisma.andonSystemSettings.deleteMany();
    await prisma.andonNotificationTemplate.deleteMany();
    await prisma.andonSiteConfiguration.deleteMany();
    await prisma.andonConfiguration.deleteMany();
    await prisma.andonIssueType.deleteMany();

    console.log('✅ Andon seed data cleanup completed');
  } catch (error) {
    console.error('❌ Andon seed data cleanup failed:', error);
    throw error;
  }
}

// Export for direct usage
export {
  seedAndonIssueTypes,
  seedAndonGlobalConfigurations,
  seedAndonNotificationTemplates,
  seedAndonSystemSettings,
  seedAndonEscalationRules,
  seedAllAndonData,
  cleanupAndonSeedData
};

// CLI execution
if (require.main === module) {
  seedAllAndonData()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}