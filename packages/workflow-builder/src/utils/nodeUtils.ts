/**
 * Node Utility Functions
 * Helpers for node visualization and operations
 */

import { NodeType } from '../types/workflow';

/**
 * Get visual icon for node type
 */
export function getNodeIcon(type: NodeType): string {
  const icons: Record<NodeType, string> = {
    [NodeType.START]: '▶',
    [NodeType.END]: '⏹',
    [NodeType.MATERIAL_CONSUME]: '📦',
    [NodeType.EQUIPMENT_OPERATION]: '⚙',
    [NodeType.QUALITY_CHECK]: '✓',
    [NodeType.DATA_TRANSFORMATION]: '⟷',
    [NodeType.API_CALL]: '🔗',
    [NodeType.SUBPROCESS]: '⊞',
    [NodeType.IF_THEN_ELSE]: '◇',
    [NodeType.SWITCH]: '⊕',
    [NodeType.LOOP]: '⟳',
    [NodeType.WAIT]: '⏱',
    [NodeType.PARALLEL]: '∥',
    [NodeType.SALESFORCE_CONNECTOR]: 'SF',
    [NodeType.SAP_CONNECTOR]: 'SAP',
    [NodeType.NETSUITE_CONNECTOR]: 'NS',
    [NodeType.CUSTOM_API]: 'API',
    [NodeType.EVENT_PUBLISHER]: '📤',
    [NodeType.EVENT_SUBSCRIBER]: '📥',
    [NodeType.ERROR_HANDLER]: '⚠',
    [NodeType.RETRY_LOGIC]: '🔄',
    [NodeType.FALLBACK_PATH]: '↪',
    [NodeType.NOTIFICATION]: '🔔',
  };

  return icons[type] || '◌';
}

/**
 * Get color for node type
 */
export function getNodeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    [NodeType.START]: '#4CAF50', // Green
    [NodeType.END]: '#f44336', // Red
    [NodeType.MATERIAL_CONSUME]: '#FF9800', // Orange
    [NodeType.EQUIPMENT_OPERATION]: '#2196F3', // Blue
    [NodeType.QUALITY_CHECK]: '#9C27B0', // Purple
    [NodeType.DATA_TRANSFORMATION]: '#00BCD4', // Cyan
    [NodeType.API_CALL]: '#009688', // Teal
    [NodeType.SUBPROCESS]: '#795548', // Brown
    [NodeType.IF_THEN_ELSE]: '#FFEB3B', // Amber
    [NodeType.SWITCH]: '#FFC107', // Amber (darker)
    [NodeType.LOOP]: '#FF5722', // Deep Orange
    [NodeType.WAIT]: '#E91E63', // Pink
    [NodeType.PARALLEL]: '#673AB7', // Deep Purple
    [NodeType.SALESFORCE_CONNECTOR]: '#00A1DF', // Salesforce blue
    [NodeType.SAP_CONNECTOR]: '#1F497D', // SAP blue
    [NodeType.NETSUITE_CONNECTOR]: '#333333', // Dark gray
    [NodeType.CUSTOM_API]: '#607D8B', // Blue Grey
    [NodeType.EVENT_PUBLISHER]: '#4DD0E1', // Cyan
    [NodeType.EVENT_SUBSCRIBER]: '#4DD0E1', // Cyan
    [NodeType.ERROR_HANDLER]: '#d32f2f', // Red
    [NodeType.RETRY_LOGIC]: '#FF6F00', // Orange
    [NodeType.FALLBACK_PATH]: '#C62828', // Dark Red
    [NodeType.NOTIFICATION]: '#FBC02D', // Lime
  };

  return colors[type] || '#607D8B';
}

/**
 * Get category for node type
 */
export function getNodeCategory(type: NodeType): string {
  const categories: Record<NodeType, string> = {
    [NodeType.START]: 'start_end',
    [NodeType.END]: 'start_end',
    [NodeType.MATERIAL_CONSUME]: 'operations',
    [NodeType.EQUIPMENT_OPERATION]: 'operations',
    [NodeType.QUALITY_CHECK]: 'operations',
    [NodeType.DATA_TRANSFORMATION]: 'operations',
    [NodeType.API_CALL]: 'operations',
    [NodeType.SUBPROCESS]: 'operations',
    [NodeType.IF_THEN_ELSE]: 'decisions',
    [NodeType.SWITCH]: 'decisions',
    [NodeType.LOOP]: 'decisions',
    [NodeType.WAIT]: 'decisions',
    [NodeType.PARALLEL]: 'decisions',
    [NodeType.SALESFORCE_CONNECTOR]: 'integrations',
    [NodeType.SAP_CONNECTOR]: 'integrations',
    [NodeType.NETSUITE_CONNECTOR]: 'integrations',
    [NodeType.CUSTOM_API]: 'integrations',
    [NodeType.EVENT_PUBLISHER]: 'integrations',
    [NodeType.EVENT_SUBSCRIBER]: 'integrations',
    [NodeType.ERROR_HANDLER]: 'error_handling',
    [NodeType.RETRY_LOGIC]: 'error_handling',
    [NodeType.FALLBACK_PATH]: 'error_handling',
    [NodeType.NOTIFICATION]: 'error_handling',
  };

  return categories[type] || 'other';
}

/**
 * Get label for node type
 */
export function getNodeLabel(type: NodeType): string {
  const labels: Record<NodeType, string> = {
    [NodeType.START]: 'Start',
    [NodeType.END]: 'End',
    [NodeType.MATERIAL_CONSUME]: 'Consume Material',
    [NodeType.EQUIPMENT_OPERATION]: 'Equipment Operation',
    [NodeType.QUALITY_CHECK]: 'Quality Check',
    [NodeType.DATA_TRANSFORMATION]: 'Transform Data',
    [NodeType.API_CALL]: 'API Call',
    [NodeType.SUBPROCESS]: 'Subprocess',
    [NodeType.IF_THEN_ELSE]: 'If/Then/Else',
    [NodeType.SWITCH]: 'Switch',
    [NodeType.LOOP]: 'Loop',
    [NodeType.WAIT]: 'Wait',
    [NodeType.PARALLEL]: 'Parallel',
    [NodeType.SALESFORCE_CONNECTOR]: 'Salesforce',
    [NodeType.SAP_CONNECTOR]: 'SAP',
    [NodeType.NETSUITE_CONNECTOR]: 'NetSuite',
    [NodeType.CUSTOM_API]: 'Custom API',
    [NodeType.EVENT_PUBLISHER]: 'Publish Event',
    [NodeType.EVENT_SUBSCRIBER]: 'Subscribe Event',
    [NodeType.ERROR_HANDLER]: 'Error Handler',
    [NodeType.RETRY_LOGIC]: 'Retry',
    [NodeType.FALLBACK_PATH]: 'Fallback',
    [NodeType.NOTIFICATION]: 'Notification',
  };

  return labels[type] || type;
}

/**
 * Check if connection is valid between two node types
 */
export function isConnectionValid(sourceType: NodeType, targetType: NodeType): boolean {
  // END nodes cannot have outgoing connections
  if (sourceType === NodeType.END) return false;

  // START nodes cannot receive incoming connections
  if (targetType === NodeType.START) return false;

  // All other connections are valid
  return true;
}

/**
 * Get default properties for node type
 */
export function getDefaultNodeProperties(type: NodeType): Record<string, any> {
  const defaults: Record<NodeType, Record<string, any>> = {
    [NodeType.START]: {},
    [NodeType.END]: {},
    [NodeType.MATERIAL_CONSUME]: {
      material: '',
      quantity: 1,
      unit: 'pcs',
    },
    [NodeType.EQUIPMENT_OPERATION]: {
      equipment: '',
      operation: '',
      duration: 0,
    },
    [NodeType.QUALITY_CHECK]: {
      checkType: 'visual',
      expectedResult: 'pass',
    },
    [NodeType.DATA_TRANSFORMATION]: {
      assignments: {},
    },
    [NodeType.API_CALL]: {
      url: '',
      method: 'GET',
      headers: {},
      body: {},
    },
    [NodeType.SUBPROCESS]: {
      workflowId: '',
    },
    [NodeType.IF_THEN_ELSE]: {
      condition: '',
    },
    [NodeType.SWITCH]: {
      variable: '',
      cases: [],
    },
    [NodeType.LOOP]: {
      condition: '',
      maxIterations: 10,
    },
    [NodeType.WAIT]: {
      type: 'delay',
      duration: 0,
      event: '',
    },
    [NodeType.PARALLEL]: {
      paths: [],
    },
    [NodeType.SALESFORCE_CONNECTOR]: {
      operation: 'query',
      sobject: '',
    },
    [NodeType.SAP_CONNECTOR]: {
      rfc: '',
      parameters: {},
    },
    [NodeType.NETSUITE_CONNECTOR]: {
      recordType: '',
      operation: 'get',
    },
    [NodeType.CUSTOM_API]: {
      url: '',
      method: 'GET',
    },
    [NodeType.EVENT_PUBLISHER]: {
      eventType: '',
      payload: {},
    },
    [NodeType.EVENT_SUBSCRIBER]: {
      eventType: '',
    },
    [NodeType.ERROR_HANDLER]: {
      errorType: 'all',
    },
    [NodeType.RETRY_LOGIC]: {
      maxRetries: 3,
      backoffType: 'exponential',
      initialDelayMs: 1000,
    },
    [NodeType.FALLBACK_PATH]: {},
    [NodeType.NOTIFICATION]: {
      type: 'email',
      recipient: '',
      subject: '',
    },
  };

  return defaults[type] || {};
}

/**
 * Validate node configuration
 */
export function validateNodeConfiguration(
  type: NodeType,
  properties: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (type) {
    case NodeType.API_CALL:
      if (!properties.url) errors.push('URL is required');
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(properties.method)) {
        errors.push('Invalid HTTP method');
      }
      break;

    case NodeType.IF_THEN_ELSE:
    case NodeType.SWITCH:
    case NodeType.LOOP:
      if (!properties.condition) {
        errors.push('Condition is required');
      }
      break;

    case NodeType.SUBPROCESS:
      if (!properties.workflowId) {
        errors.push('Workflow ID is required');
      }
      break;

    case NodeType.WAIT:
      if (properties.type === 'delay' && !properties.duration) {
        errors.push('Duration is required for delay');
      }
      if (properties.type === 'event' && !properties.event) {
        errors.push('Event type is required');
      }
      break;

    case NodeType.MATERIAL_CONSUME:
      if (!properties.material) errors.push('Material is required');
      if (!properties.quantity || properties.quantity <= 0) {
        errors.push('Quantity must be greater than 0');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get input ports for node type
 */
export function getInputPorts(type: NodeType): string[] {
  const ports: Record<NodeType, string[]> = {
    [NodeType.START]: [],
    [NodeType.END]: ['*'], // All variables
    [NodeType.MATERIAL_CONSUME]: ['*'],
    [NodeType.EQUIPMENT_OPERATION]: ['*'],
    [NodeType.QUALITY_CHECK]: ['*'],
    [NodeType.DATA_TRANSFORMATION]: ['*'],
    [NodeType.API_CALL]: ['*'],
    [NodeType.SUBPROCESS]: ['*'],
    [NodeType.IF_THEN_ELSE]: ['*'],
    [NodeType.SWITCH]: ['*'],
    [NodeType.LOOP]: ['*'],
    [NodeType.WAIT]: ['*'],
    [NodeType.PARALLEL]: ['*'],
    [NodeType.SALESFORCE_CONNECTOR]: ['*'],
    [NodeType.SAP_CONNECTOR]: ['*'],
    [NodeType.NETSUITE_CONNECTOR]: ['*'],
    [NodeType.CUSTOM_API]: ['*'],
    [NodeType.EVENT_PUBLISHER]: ['*'],
    [NodeType.EVENT_SUBSCRIBER]: [],
    [NodeType.ERROR_HANDLER]: [],
    [NodeType.RETRY_LOGIC]: ['*'],
    [NodeType.FALLBACK_PATH]: [],
    [NodeType.NOTIFICATION]: ['*'],
  };

  return ports[type] || ['*'];
}

/**
 * Get output ports for node type
 */
export function getOutputPorts(type: NodeType): string[] {
  const ports: Record<NodeType, string[]> = {
    [NodeType.START]: ['*'],
    [NodeType.END]: [],
    [NodeType.MATERIAL_CONSUME]: ['*'],
    [NodeType.EQUIPMENT_OPERATION]: ['*'],
    [NodeType.QUALITY_CHECK]: ['result', '*'],
    [NodeType.DATA_TRANSFORMATION]: ['*'],
    [NodeType.API_CALL]: ['response', '*'],
    [NodeType.SUBPROCESS]: ['*'],
    [NodeType.IF_THEN_ELSE]: ['true', 'false', '*'],
    [NodeType.SWITCH]: ['default', '*'],
    [NodeType.LOOP]: ['*'],
    [NodeType.WAIT]: ['*'],
    [NodeType.PARALLEL]: ['*'],
    [NodeType.SALESFORCE_CONNECTOR]: ['result', '*'],
    [NodeType.SAP_CONNECTOR]: ['result', '*'],
    [NodeType.NETSUITE_CONNECTOR]: ['result', '*'],
    [NodeType.CUSTOM_API]: ['response', '*'],
    [NodeType.EVENT_PUBLISHER]: ['*'],
    [NodeType.EVENT_SUBSCRIBER]: ['event', '*'],
    [NodeType.ERROR_HANDLER]: ['*'],
    [NodeType.RETRY_LOGIC]: ['*'],
    [NodeType.FALLBACK_PATH]: ['*'],
    [NodeType.NOTIFICATION]: ['*'],
  };

  return ports[type] || ['*'];
}
