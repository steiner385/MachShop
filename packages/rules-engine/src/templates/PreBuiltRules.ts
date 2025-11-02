/**
 * Pre-Built Rule Templates
 * 50+ manufacturing-ready rule templates
 */

import { RuleTemplate, TriggerType, ActionType, ConditionOperator, LogicalOperator } from '../types';

/**
 * Pre-built rule templates for manufacturing
 */
export const preBuiltRules: RuleTemplate[] = [
  // Quality Rules
  {
    id: 'auto-hold-on-failure',
    name: 'Auto-Hold on Quality Failure',
    description: 'Automatically place quality hold when inspection fails',
    category: 'quality',
    trigger: { type: TriggerType.EVENT, event: 'quality.validateMetrics' },
    conditions: { field: 'passed', operator: ConditionOperator.EQUALS, value: false },
    actions: [
      {
        type: ActionType.QUALITY_HOLD,
        reason: 'Automatic hold due to failed quality check',
        holdType: 'hard',
        notifyRoles: ['quality-engineer', 'supervisor'],
      },
      {
        type: ActionType.EMAIL,
        recipients: ['quality-team@company.com'],
        subject: 'Quality Hold Placed',
        template: 'quality-hold-notification',
      },
    ],
    tags: ['quality', 'automated', 'critical'],
    documentation: 'Prevents non-conforming parts from proceeding',
  },

  {
    id: 'escalate-failed-inspection',
    name: 'Escalate Failed Inspections to Manager',
    description: 'Route failed quality inspections to management',
    category: 'quality',
    trigger: { type: TriggerType.EVENT, event: 'quality.validateMetrics' },
    conditions: { field: 'severity', operator: ConditionOperator.GREATER_EQUAL, value: 'high' },
    actions: [
      {
        type: ActionType.ESCALATE,
        escalateTo: ['quality-manager'],
        priority: 'high',
        reason: 'High severity quality failure',
      },
    ],
    tags: ['quality', 'escalation'],
  },

  // Work Order Rules
  {
    id: 'escalate-overdue-workorder',
    name: 'Escalate Overdue Work Orders',
    description: 'Alert supervisor when work order exceeds standard time',
    category: 'production',
    trigger: { type: TriggerType.THRESHOLD, field: 'elapsedTime', condition: ConditionOperator.GREATER_THAN, value: 'standardTime' },
    conditions: { field: 'status', operator: ConditionOperator.EQUALS, value: 'in_progress' },
    actions: [
      {
        type: ActionType.ESCALATE,
        escalateTo: ['production-supervisor'],
        priority: 'medium',
        reason: 'Work order exceeding standard completion time',
      },
      {
        type: ActionType.IN_APP_ALERT,
        recipients: ['production-supervisor'],
      },
    ],
    tags: ['production', 'escalation', 'performance'],
  },

  {
    id: 'auto-complete-workorder',
    name: 'Auto-Complete Work Order',
    description: 'Automatically complete work orders when all operations finish',
    category: 'production',
    trigger: { type: TriggerType.EVENT, event: 'workOrder.operation.complete' },
    conditions: { field: 'allOperationsComplete', operator: ConditionOperator.EQUALS, value: true },
    actions: [
      {
        type: ActionType.UPDATE_RECORD,
        entity: 'workOrder',
        data: { status: 'completed' },
      },
    ],
    tags: ['production', 'automation'],
  },

  // Inventory Rules
  {
    id: 'low-inventory-alert',
    name: 'Low Inventory Alert',
    description: 'Alert when material inventory falls below minimum',
    category: 'inventory',
    trigger: { type: TriggerType.THRESHOLD, field: 'quantity', condition: ConditionOperator.LESS_THAN, value: 'minimumLevel' },
    actions: [
      {
        type: ActionType.EMAIL,
        recipients: ['procurement@company.com'],
        subject: 'Low Inventory Alert',
      },
      {
        type: ActionType.SLACK,
        recipients: ['#inventory-alerts'],
      },
    ],
    tags: ['inventory', 'supply-chain', 'alerts'],
  },

  {
    id: 'auto-create-purchase-order',
    name: 'Auto-Create Purchase Order',
    description: 'Automatically create PO when inventory is low',
    category: 'inventory',
    trigger: { type: TriggerType.THRESHOLD, field: 'quantity', condition: ConditionOperator.LESS_EQUAL, value: 'reorderLevel' },
    conditions: { field: 'supplier', operator: ConditionOperator.EXISTS, value: true },
    actions: [
      {
        type: ActionType.CREATE_RECORD,
        entity: 'purchaseOrder',
        data: { status: 'pending', quantity: 100 },
      },
    ],
    tags: ['inventory', 'procurement', 'automation'],
  },

  {
    id: 'adjust-material-on-scrap',
    name: 'Adjust Material on Scrap Detection',
    description: 'Update material requirements when scrap is detected',
    category: 'material',
    trigger: { type: TriggerType.EVENT, event: 'material.scrapDetected' },
    actions: [
      {
        type: ActionType.UPDATE_RECORD,
        entity: 'material',
        data: { scrapQuantity: 'scrapQuantity + detectedScrap' },
      },
      {
        type: ActionType.NOTIFY,
        recipients: ['engineering'],
        subject: 'Material Scrap Detected',
      },
    ],
    tags: ['material', 'quality'],
  },

  // Equipment Rules
  {
    id: 'equipment-maintenance-alert',
    name: 'Schedule Equipment Maintenance',
    description: 'Schedule maintenance based on equipment usage',
    category: 'equipment',
    trigger: { type: TriggerType.THRESHOLD, field: 'usageHours', condition: ConditionOperator.GREATER_EQUAL, value: 'maintenanceInterval' },
    actions: [
      {
        type: ActionType.CREATE_RECORD,
        entity: 'maintenanceTask',
        data: { equipment: 'equipmentId', status: 'scheduled' },
      },
      {
        type: ActionType.EMAIL,
        recipients: ['maintenance@company.com'],
        subject: 'Equipment Maintenance Due',
      },
    ],
    tags: ['equipment', 'maintenance', 'preventive'],
  },

  {
    id: 'equipment-temp-alert',
    name: 'Equipment Temperature Alert',
    description: 'Alert when equipment temperature exceeds threshold',
    category: 'equipment',
    trigger: { type: TriggerType.THRESHOLD, field: 'temperature', condition: ConditionOperator.GREATER_THAN, value: 'maxTemp' },
    actions: [
      {
        type: ActionType.IN_APP_ALERT,
        recipients: ['equipment-operator'],
      },
      {
        type: ActionType.ESCALATE,
        escalateTo: ['maintenance-manager'],
        priority: 'critical',
      },
    ],
    tags: ['equipment', 'safety', 'alerts'],
  },

  // Scheduling Rules
  {
    id: 'auto-assign-workorder',
    name: 'Auto-Assign Work Order to Available Operator',
    description: 'Automatically assign work orders based on operator availability',
    category: 'scheduling',
    trigger: { type: TriggerType.EVENT, event: 'workOrder.ready' },
    conditions: { field: 'status', operator: ConditionOperator.EQUALS, value: 'ready' },
    actions: [
      {
        type: ActionType.API_CALL,
        url: '/api/operators/available',
        method: 'GET',
      },
      {
        type: ActionType.UPDATE_RECORD,
        entity: 'workOrder',
        data: { assignedTo: 'availableOperator' },
      },
    ],
    tags: ['scheduling', 'automation'],
  },

  {
    id: 'cascade-engineering-changes',
    name: 'Cascade Engineering Changes',
    description: 'Cascade approved engineering changes to dependent operations',
    category: 'engineering',
    trigger: { type: TriggerType.EVENT, event: 'engineeringChange.approved' },
    actions: [
      {
        type: ActionType.API_CALL,
        url: '/api/dependentOperations/update',
        method: 'PUT',
      },
    ],
    tags: ['engineering', 'change-management'],
  },

  // Notification Rules
  {
    id: 'shift-start-briefing',
    name: 'Send Shift Start Briefing',
    description: 'Send shift briefing at shift start',
    category: 'communication',
    trigger: { type: TriggerType.SCHEDULE, scheduleType: 'cron', scheduleExpression: '0 6,14,22 * * *' },
    actions: [
      {
        type: ActionType.EMAIL,
        recipients: ['shift-team'],
        template: 'shift-briefing',
      },
    ],
    tags: ['communication', 'scheduled'],
  },

  // Compliance Rules
  {
    id: 'daily-production-summary',
    name: 'Daily Production Summary',
    description: 'Generate and send daily production summary',
    category: 'reporting',
    trigger: { type: TriggerType.SCHEDULE, scheduleType: 'cron', scheduleExpression: '0 17 * * 1-5' },
    actions: [
      {
        type: ActionType.LOG_EVENT,
        message: 'Generating daily production summary',
      },
      {
        type: ActionType.EMAIL,
        recipients: ['management@company.com'],
        template: 'production-summary',
      },
    ],
    tags: ['reporting', 'compliance'],
  },

  // Multi-Condition Rules
  {
    id: 'high-value-workorder-approval',
    name: 'Require Approval for High-Value Work Orders',
    description: 'Route high-value work orders for approval',
    category: 'governance',
    trigger: { type: TriggerType.EVENT, event: 'workOrder.created' },
    conditions: {
      operator: LogicalOperator.AND,
      conditions: [
        { field: 'cost', operator: ConditionOperator.GREATER_THAN, value: 10000 },
        { field: 'priority', operator: ConditionOperator.EQUALS, value: 'high' },
      ],
    },
    actions: [
      {
        type: ActionType.ESCALATE,
        escalateTo: ['approval-manager'],
        priority: 'high',
        reason: 'High-value work order requires approval',
      },
    ],
    tags: ['governance', 'approval'],
  },

  // Dynamic Rules
  {
    id: 'sync-external-system',
    name: 'Sync Data with External ERP',
    description: 'Sync completed work orders to ERP system',
    category: 'integration',
    trigger: { type: TriggerType.EVENT, event: 'workOrder.completed' },
    actions: [
      {
        type: ActionType.WEBHOOK,
        url: 'https://erp.company.com/api/workorders',
        method: 'POST',
      },
    ],
    tags: ['integration', 'external-sync'],
  },

  {
    id: 'update-plm-system',
    name: 'Update PLM with Manufacturing Changes',
    description: 'Push manufacturing changes back to PLM',
    category: 'integration',
    trigger: { type: TriggerType.EVENT, event: 'engineeringChange.implemented' },
    actions: [
      {
        type: ActionType.API_CALL,
        url: '/api/plm/update',
        method: 'PUT',
      },
    ],
    tags: ['integration', 'plm'],
  },
];

/**
 * Get all pre-built rules
 */
export function getPreBuiltRules(): RuleTemplate[] {
  return preBuiltRules;
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): RuleTemplate[] {
  return preBuiltRules.filter((rule) => rule.category === category);
}

/**
 * Get rules by tags
 */
export function getRulesByTags(tags: string[]): RuleTemplate[] {
  return preBuiltRules.filter((rule) => rule.tags?.some((t) => tags.includes(t)));
}

/**
 * Get rule by ID
 */
export function getPreBuiltRule(id: string): RuleTemplate | undefined {
  return preBuiltRules.find((rule) => rule.id === id);
}
