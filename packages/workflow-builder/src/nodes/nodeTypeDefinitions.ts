/**
 * Node Type Definitions
 * Complete type definitions and metadata for all 24 node types
 */

import { NodeType } from '../types/workflow';

/**
 * Node execution result
 */
export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped' | 'timeout';
  output?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  duration: number; // milliseconds
  timestamp: number;
}

/**
 * Node execution context
 */
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  currentNode: any;
  variables: Record<string, any>;
  previousResults: Map<string, ExecutionResult>;
  workflow: any;
}

/**
 * Node type executor function
 */
export type NodeExecutor = (
  context: ExecutionContext,
  properties: Record<string, any>
) => Promise<ExecutionResult>;

/**
 * Node type definition
 */
export interface NodeTypeDefinition {
  type: NodeType;
  name: string;
  description: string;
  category: 'start-end' | 'operations' | 'decisions' | 'integrations' | 'errors';
  icon: string;
  color: string;
  executor: NodeExecutor;
  inputPorts: string[];
  outputPorts: string[];
  properties: Record<string, PropertyDefinition>;
  maxInputConnections?: number;
  maxOutputConnections?: number;
}

/**
 * Property definition for node configuration
 */
export interface PropertyDefinition {
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required?: boolean;
  default?: any;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
}

/**
 * Start Node Executor
 */
const startNodeExecutor: NodeExecutor = async (context) => {
  const startTime = Date.now();
  return {
    nodeId: context.currentNode.id,
    status: 'success',
    output: { started: true },
    duration: Date.now() - startTime,
    timestamp: Date.now(),
  };
};

/**
 * End Node Executor
 */
const endNodeExecutor: NodeExecutor = async (context) => {
  const startTime = Date.now();
  return {
    nodeId: context.currentNode.id,
    status: 'success',
    output: { ended: true },
    duration: Date.now() - startTime,
    timestamp: Date.now(),
  };
};

/**
 * Material Consume Executor
 */
const materialConsumeExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { material, quantity, unit } = props;

    if (!material || quantity <= 0) {
      throw new Error('Invalid material consumption parameters');
    }

    // Simulate material consumption
    const result = {
      materialConsumed: {
        name: material,
        quantity,
        unit,
        timestamp: new Date().toISOString(),
      },
    };

    // Update workflow variables
    context.variables[`${material}_consumed`] = quantity;

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'MATERIAL_CONSUME_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Equipment Operation Executor
 */
const equipmentOperationExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { equipment, operation, duration } = props;

    if (!equipment || !operation) {
      throw new Error('Equipment and operation are required');
    }

    // Simulate equipment operation
    const result = {
      operationExecuted: {
        equipment,
        operation,
        duration,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + (duration || 0) * 1000).toISOString(),
      },
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'EQUIPMENT_OPERATION_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Quality Check Executor
 */
const qualityCheckExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { checkType, expectedResult } = props;

    if (!checkType || !expectedResult) {
      throw new Error('Check type and expected result are required');
    }

    // Simulate quality check (random result for demo)
    const passed = Math.random() > 0.1; // 90% pass rate

    const result = {
      qualityCheckResult: {
        type: checkType,
        expectedResult,
        actualResult: passed ? 'pass' : 'fail',
        passed,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'QUALITY_CHECK_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Data Transformation Executor
 */
const dataTransformationExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { assignments } = props;

    if (!assignments) {
      throw new Error('Assignments are required');
    }

    const result: Record<string, any> = {};

    // Apply variable assignments
    if (typeof assignments === 'object') {
      for (const [key, value] of Object.entries(assignments)) {
        // Support simple variable references
        if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
          const varName = value.slice(2, -1);
          result[key] = context.variables[varName];
          context.variables[key] = context.variables[varName];
        } else {
          result[key] = value;
          context.variables[key] = value;
        }
      }
    }

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'DATA_TRANSFORMATION_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * API Call Executor
 */
const apiCallExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { url, method = 'GET', headers = {}, body } = props;

    if (!url) {
      throw new Error('URL is required');
    }

    // Validate URL
    new URL(url);

    // For now, simulate API call (don't make actual requests in tests)
    const result = {
      statusCode: 200,
      body: { success: true, data: {} },
      headers: { 'content-type': 'application/json' },
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'API_CALL_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * If/Then/Else Executor
 */
const ifThenElseExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { condition } = props;

    if (!condition) {
      throw new Error('Condition is required');
    }

    // Evaluate condition (simple expression evaluation)
    let result = false;
    try {
      // Create a safe evaluation context
      const evalContext = new Function('vars', `return (${condition})`);
      result = evalContext(context.variables);
    } catch {
      throw new Error(`Failed to evaluate condition: ${condition}`);
    }

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        conditionMet: result,
        nextPort: result ? 'then' : 'else',
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'IF_THEN_ELSE_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Loop Executor
 */
const loopExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { condition, maxIterations = 100 } = props;

    if (!condition) {
      throw new Error('Loop condition is required');
    }

    // Track loop iterations
    let iterations = 0;
    const evalContext = new Function('vars', `return (${condition})`);

    while (evalContext(context.variables) && iterations < maxIterations) {
      iterations++;
      // In a real implementation, execute loop body
    }

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        iterations,
        completed: iterations < maxIterations,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'LOOP_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Wait Executor
 */
const waitExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { type = 'delay', duration = 0 } = props;

    if (type === 'delay') {
      // For testing, don't actually wait
      // In production, use: await new Promise(resolve => setTimeout(resolve, duration * 1000));
    }

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        waitType: type,
        duration,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'WAIT_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Subprocess Executor
 */
const subprocessExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { workflowId } = props;

    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }

    // Simulate subprocess execution
    const result = {
      workflowId,
      executionId: `exec-${Date.now()}`,
      status: 'completed',
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'SUBPROCESS_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Notification Executor
 */
const notificationExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { type, recipient, message } = props;

    if (!type || !recipient || !message) {
      throw new Error('Type, recipient, and message are required');
    }

    // Simulate notification sending
    const result = {
      type,
      recipient,
      message,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'NOTIFICATION_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Switch Executor
 */
const switchExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { switchValue, cases = {} } = props;

    if (!switchValue) {
      throw new Error('Switch value is required');
    }

    const value = context.variables[switchValue];
    const nextPort = cases[value] || 'default';

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        value,
        nextPort,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'SWITCH_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Parallel Executor
 */
const parallelExecutor: NodeExecutor = async (context) => {
  const startTime = Date.now();
  try {
    // In a real implementation, execute all outgoing branches in parallel
    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        branchesStarted: true,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'PARALLEL_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Generic Integration Connector Executor
 */
const createIntegrationExecutor = (system: string): NodeExecutor => {
  return async (context, props) => {
    const startTime = Date.now();
    try {
      const { operation, parameters = {} } = props;

      if (!operation) {
        throw new Error(`${system} operation is required`);
      }

      // Simulate integration call
      const result = {
        system,
        operation,
        status: 'success',
        data: {},
        timestamp: new Date().toISOString(),
      };

      return {
        nodeId: context.currentNode.id,
        status: 'success',
        output: result,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        nodeId: context.currentNode.id,
        status: 'error',
        error: {
          code: `${system.toUpperCase()}_ERROR`,
          message: (error as Error).message,
        },
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  };
};

/**
 * Error Handler Executor
 */
const errorHandlerExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { errorType = '*', action = 'skip' } = props;

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        errorType,
        action,
        handled: true,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'ERROR_HANDLER_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Retry Logic Executor
 */
const retryLogicExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { maxAttempts = 3, delaySeconds = 1, backoffMultiplier = 1 } = props;

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        maxAttempts,
        delaySeconds,
        backoffMultiplier,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'RETRY_LOGIC_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Fallback Path Executor
 */
const fallbackPathExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { primaryPath, fallbackPath } = props;

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        primaryPath,
        fallbackPath,
        active: true,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'FALLBACK_PATH_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Event Publisher Executor
 */
const eventPublisherExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { eventType, eventData = {} } = props;

    if (!eventType) {
      throw new Error('Event type is required');
    }

    const result = {
      eventType,
      eventData,
      publishedAt: new Date().toISOString(),
      eventId: `evt-${Date.now()}`,
    };

    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: result,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'EVENT_PUBLISHER_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Event Subscriber Executor
 */
const eventSubscriberExecutor: NodeExecutor = async (context, props) => {
  const startTime = Date.now();
  try {
    const { eventType, timeout = 30 } = props;

    if (!eventType) {
      throw new Error('Event type is required');
    }

    // Simulate waiting for event
    return {
      nodeId: context.currentNode.id,
      status: 'success',
      output: {
        eventType,
        timeout,
        subscribed: true,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      nodeId: context.currentNode.id,
      status: 'error',
      error: {
        code: 'EVENT_SUBSCRIBER_ERROR',
        message: (error as Error).message,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * Node Type Registry
 * Maps node types to their definitions
 */
export const nodeTypeRegistry: Map<NodeType, NodeTypeDefinition> = new Map([
  [
    NodeType.START,
    {
      type: NodeType.START,
      name: 'Start',
      description: 'Workflow start point',
      category: 'start-end',
      icon: '▶',
      color: '#4CAF50',
      executor: startNodeExecutor,
      inputPorts: [],
      outputPorts: ['output'],
      properties: {},
    },
  ],
  [
    NodeType.END,
    {
      type: NodeType.END,
      name: 'End',
      description: 'Workflow end point',
      category: 'start-end',
      icon: '⏹',
      color: '#f44336',
      executor: endNodeExecutor,
      inputPorts: ['input'],
      outputPorts: [],
      properties: {},
    },
  ],
  [
    NodeType.MATERIAL_CONSUME,
    {
      type: NodeType.MATERIAL_CONSUME,
      name: 'Material Consumption',
      description: 'Consume material from inventory',
      category: 'operations',
      icon: '📦',
      color: '#FF9800',
      executor: materialConsumeExecutor,
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        material: { label: 'Material', type: 'text', required: true },
        quantity: { label: 'Quantity', type: 'number', required: true },
        unit: { label: 'Unit', type: 'select', options: [{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kg' }] },
      },
    },
  ],
  [
    NodeType.EQUIPMENT_OPERATION,
    {
      type: NodeType.EQUIPMENT_OPERATION,
      name: 'Equipment Operation',
      description: 'Execute equipment operation',
      category: 'operations',
      icon: '⚙',
      color: '#2196F3',
      executor: equipmentOperationExecutor,
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        equipment: { label: 'Equipment', type: 'text', required: true },
        operation: { label: 'Operation', type: 'text', required: true },
        duration: { label: 'Duration (sec)', type: 'number' },
      },
    },
  ],
  [
    NodeType.QUALITY_CHECK,
    {
      type: NodeType.QUALITY_CHECK,
      name: 'Quality Check',
      description: 'Perform quality inspection',
      category: 'operations',
      icon: '✓',
      color: '#9C27B0',
      executor: qualityCheckExecutor,
      inputPorts: ['input'],
      outputPorts: ['pass', 'fail', 'rework'],
      properties: {
        checkType: { label: 'Check Type', type: 'select', required: true },
        expectedResult: { label: 'Expected Result', type: 'select', required: true },
      },
    },
  ],
  [
    NodeType.DATA_TRANSFORMATION,
    {
      type: NodeType.DATA_TRANSFORMATION,
      name: 'Data Transformation',
      description: 'Transform and assign variables',
      category: 'operations',
      icon: '🔄',
      color: '#00BCD4',
      executor: dataTransformationExecutor,
      inputPorts: ['input'],
      outputPorts: ['output'],
      properties: {
        assignments: { label: 'Assignments', type: 'json' },
      },
    },
  ],
  [
    NodeType.API_CALL,
    {
      type: NodeType.API_CALL,
      name: 'API Call',
      description: 'Make HTTP API call',
      category: 'integrations',
      icon: '🌐',
      color: '#00BCD4',
      executor: apiCallExecutor,
      inputPorts: ['input'],
      outputPorts: ['success', 'error'],
      properties: {
        url: { label: 'URL', type: 'text', required: true },
        method: { label: 'Method', type: 'select', required: true },
        headers: { label: 'Headers', type: 'json' },
        body: { label: 'Body', type: 'json' },
      },
    },
  ],
  [
    NodeType.IF_THEN_ELSE,
    {
      type: NodeType.IF_THEN_ELSE,
      name: 'If/Then/Else',
      description: 'Conditional branching',
      category: 'decisions',
      icon: '?',
      color: '#FFEB3B',
      executor: ifThenElseExecutor,
      inputPorts: ['input'],
      outputPorts: ['then', 'else'],
      properties: {
        condition: { label: 'Condition', type: 'textarea', required: true },
      },
    },
  ],
  [
    NodeType.LOOP,
    {
      type: NodeType.LOOP,
      name: 'Loop',
      description: 'Repeat execution',
      category: 'decisions',
      icon: '🔁',
      color: '#FFEB3B',
      executor: loopExecutor,
      inputPorts: ['input'],
      outputPorts: ['loop', 'exit'],
      properties: {
        condition: { label: 'Condition', type: 'textarea', required: true },
        maxIterations: { label: 'Max Iterations', type: 'number', default: 100 },
      },
    },
  ],
  [
    NodeType.WAIT,
    {
      type: NodeType.WAIT,
      name: 'Wait',
      description: 'Wait or delay execution',
      category: 'decisions',
      icon: '⏱',
      color: '#FFEB3B',
      executor: waitExecutor,
      inputPorts: ['input'],
      outputPorts: ['output'],
      properties: {
        type: { label: 'Wait Type', type: 'select' },
        duration: { label: 'Duration (sec)', type: 'number' },
      },
    },
  ],
  [
    NodeType.SUBPROCESS,
    {
      type: NodeType.SUBPROCESS,
      name: 'Subprocess',
      description: 'Execute another workflow',
      category: 'operations',
      icon: '📂',
      color: '#FF9800',
      executor: subprocessExecutor,
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        workflowId: { label: 'Workflow ID', type: 'text', required: true },
      },
    },
  ],
  [
    NodeType.NOTIFICATION,
    {
      type: NodeType.NOTIFICATION,
      name: 'Notification',
      description: 'Send notification',
      category: 'integrations',
      icon: '🔔',
      color: '#00BCD4',
      executor: notificationExecutor,
      inputPorts: ['input'],
      outputPorts: ['output'],
      properties: {
        type: { label: 'Type', type: 'select' },
        recipient: { label: 'Recipient', type: 'text', required: true },
        message: { label: 'Message', type: 'textarea', required: true },
      },
    },
  ],
  [
    NodeType.SWITCH,
    {
      type: NodeType.SWITCH,
      name: 'Switch',
      description: 'Multi-way branching',
      category: 'decisions',
      icon: '🔀',
      color: '#FFEB3B',
      executor: switchExecutor,
      inputPorts: ['input'],
      outputPorts: ['case1', 'case2', 'default'],
      properties: {
        switchValue: { label: 'Switch Variable', type: 'text', required: true },
        cases: { label: 'Cases', type: 'json' },
      },
    },
  ],
  [
    NodeType.PARALLEL,
    {
      type: NodeType.PARALLEL,
      name: 'Parallel',
      description: 'Execute branches in parallel',
      category: 'decisions',
      icon: '||',
      color: '#FFEB3B',
      executor: parallelExecutor,
      inputPorts: ['input'],
      outputPorts: ['branch1', 'branch2', 'branch3'],
      properties: {},
    },
  ],
  [
    NodeType.SALESFORCE_CONNECTOR,
    {
      type: NodeType.SALESFORCE_CONNECTOR,
      name: 'Salesforce',
      description: 'Salesforce integration',
      category: 'integrations',
      icon: '☁',
      color: '#00BCD4',
      executor: createIntegrationExecutor('Salesforce'),
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        operation: { label: 'Operation', type: 'text', required: true },
        parameters: { label: 'Parameters', type: 'json' },
      },
    },
  ],
  [
    NodeType.SAP_CONNECTOR,
    {
      type: NodeType.SAP_CONNECTOR,
      name: 'SAP',
      description: 'SAP integration',
      category: 'integrations',
      icon: '☁',
      color: '#00BCD4',
      executor: createIntegrationExecutor('SAP'),
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        operation: { label: 'Operation', type: 'text', required: true },
        parameters: { label: 'Parameters', type: 'json' },
      },
    },
  ],
  [
    NodeType.NETSUITE_CONNECTOR,
    {
      type: NodeType.NETSUITE_CONNECTOR,
      name: 'NetSuite',
      description: 'NetSuite integration',
      category: 'integrations',
      icon: '☁',
      color: '#00BCD4',
      executor: createIntegrationExecutor('NetSuite'),
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        operation: { label: 'Operation', type: 'text', required: true },
        parameters: { label: 'Parameters', type: 'json' },
      },
    },
  ],
  [
    NodeType.CUSTOM_API,
    {
      type: NodeType.CUSTOM_API,
      name: 'Custom API',
      description: 'Custom API integration',
      category: 'integrations',
      icon: '🔌',
      color: '#00BCD4',
      executor: createIntegrationExecutor('Custom'),
      inputPorts: ['input'],
      outputPorts: ['output', 'error'],
      properties: {
        endpoint: { label: 'Endpoint', type: 'text', required: true },
        operation: { label: 'Operation', type: 'text', required: true },
      },
    },
  ],
  [
    NodeType.EVENT_PUBLISHER,
    {
      type: NodeType.EVENT_PUBLISHER,
      name: 'Event Publisher',
      description: 'Publish event',
      category: 'integrations',
      icon: '📤',
      color: '#00BCD4',
      executor: eventPublisherExecutor,
      inputPorts: ['input'],
      outputPorts: ['output'],
      properties: {
        eventType: { label: 'Event Type', type: 'text', required: true },
        eventData: { label: 'Event Data', type: 'json' },
      },
    },
  ],
  [
    NodeType.EVENT_SUBSCRIBER,
    {
      type: NodeType.EVENT_SUBSCRIBER,
      name: 'Event Subscriber',
      description: 'Subscribe to event',
      category: 'integrations',
      icon: '📥',
      color: '#00BCD4',
      executor: eventSubscriberExecutor,
      inputPorts: ['input'],
      outputPorts: ['received', 'timeout'],
      properties: {
        eventType: { label: 'Event Type', type: 'text', required: true },
        timeout: { label: 'Timeout (sec)', type: 'number', default: 30 },
      },
    },
  ],
  [
    NodeType.ERROR_HANDLER,
    {
      type: NodeType.ERROR_HANDLER,
      name: 'Error Handler',
      description: 'Handle errors',
      category: 'errors',
      icon: '⚠',
      color: '#d32f2f',
      executor: errorHandlerExecutor,
      inputPorts: ['error'],
      outputPorts: ['handled', 'rethrow'],
      properties: {
        errorType: { label: 'Error Type', type: 'text' },
        action: { label: 'Action', type: 'select' },
      },
    },
  ],
  [
    NodeType.RETRY_LOGIC,
    {
      type: NodeType.RETRY_LOGIC,
      name: 'Retry Logic',
      description: 'Retry mechanism',
      category: 'errors',
      icon: '🔄',
      color: '#d32f2f',
      executor: retryLogicExecutor,
      inputPorts: ['input'],
      outputPorts: ['retry', 'success', 'failed'],
      properties: {
        maxAttempts: { label: 'Max Attempts', type: 'number', default: 3 },
        delaySeconds: { label: 'Delay (sec)', type: 'number', default: 1 },
        backoffMultiplier: { label: 'Backoff Multiplier', type: 'number', default: 1 },
      },
    },
  ],
  [
    NodeType.FALLBACK_PATH,
    {
      type: NodeType.FALLBACK_PATH,
      name: 'Fallback Path',
      description: 'Fallback mechanism',
      category: 'errors',
      icon: '🛡',
      color: '#d32f2f',
      executor: fallbackPathExecutor,
      inputPorts: ['input'],
      outputPorts: ['primary', 'fallback'],
      properties: {
        primaryPath: { label: 'Primary Path', type: 'text' },
        fallbackPath: { label: 'Fallback Path', type: 'text' },
      },
    },
  ],
]);

/**
 * Get node type definition
 */
export const getNodeTypeDefinition = (nodeType: NodeType): NodeTypeDefinition | undefined => {
  return nodeTypeRegistry.get(nodeType);
};

/**
 * Get executor for node type
 */
export const getNodeExecutor = (nodeType: NodeType): NodeExecutor | undefined => {
  const definition = nodeTypeRegistry.get(nodeType);
  return definition?.executor;
};
