/**
 * Workflow Execution Engine
 * Handles workflow execution, state management, and error handling
 */

import { Workflow, WorkflowExecution, NodeConfig, ExecutionStatus } from '../types/workflow';
import { getNodeExecutor, getNodeTypeDefinition, ExecutionContext, ExecutionResult } from '../nodes/nodeTypeDefinitions';
import { WorkflowValidationService } from './WorkflowValidationService';

/**
 * Workflow execution options
 */
export interface ExecutionOptions {
  timeout?: number; // milliseconds
  maxNodeExecutions?: number;
  retryPolicy?: {
    maxRetries: number;
    initialDelayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Execution trace entry for debugging
 */
export interface ExecutionTrace {
  nodeId: string;
  nodeName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  result?: ExecutionResult;
  error?: { code: string; message: string };
}

/**
 * Workflow Execution Engine
 */
export class WorkflowExecutionEngine {
  private validationService = new WorkflowValidationService();

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    variables: Record<string, any> = {},
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const executionId = `exec-${Date.now()}`;
    const startTime = Date.now();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      startTime,
      variables,
      executionStack: [],
      startNodeId: this.findStartNodeId(workflow),
    };

    try {
      // Validate workflow before execution
      const validation = this.validationService.validateWorkflow(workflow);
      if (!validation.isValid) {
        execution.status = 'error';
        execution.error = {
          code: 'VALIDATION_ERROR',
          message: `Workflow validation failed: ${validation.errors.join(', ')}`,
        };
        execution.endTime = Date.now();
        return execution;
      }

      // Execute workflow
      const context: ExecutionContext = {
        workflowId: workflow.id,
        executionId,
        currentNode: this.findNodeById(workflow, execution.startNodeId!),
        variables,
        previousResults: new Map(),
        workflow,
      };

      const trace: ExecutionTrace[] = [];
      const nodeExecutions = new Set<string>();

      // Execute nodes in sequence
      let currentNodeId = execution.startNodeId;
      let nodeCount = 0;
      const maxNodes = options.maxNodeExecutions || 10000;

      while (currentNodeId && nodeCount < maxNodes) {
        nodeCount++;
        const node = this.findNodeById(workflow, currentNodeId);

        if (!node) {
          execution.status = 'error';
          execution.error = {
            code: 'NODE_NOT_FOUND',
            message: `Node ${currentNodeId} not found`,
          };
          break;
        }

        // Prevent infinite loops
        if (nodeExecutions.has(currentNodeId) && node.type !== 'LOOP') {
          execution.status = 'error';
          execution.error = {
            code: 'INFINITE_LOOP',
            message: `Node ${currentNodeId} executed multiple times`,
          };
          break;
        }

        nodeExecutions.add(currentNodeId);

        // Execute node
        const traceEntry: ExecutionTrace = {
          nodeId: node.id,
          nodeName: node.name,
          startTime: Date.now(),
          status: 'running',
        };

        try {
          context.currentNode = node;
          const result = await this.executeNode(context, node);

          traceEntry.endTime = Date.now();
          traceEntry.duration = traceEntry.endTime - traceEntry.startTime;
          traceEntry.result = result;
          traceEntry.status = result.status as 'success' | 'error';

          context.previousResults.set(node.id, result);

          if (result.status === 'error') {
            // Try to find error handler
            const errorHandler = this.findErrorHandler(workflow, node.id);
            if (errorHandler) {
              currentNodeId = errorHandler.id;
            } else {
              execution.status = 'error';
              execution.error = result.error;
              break;
            }
          } else if (result.status === 'success') {
            // Find next node based on output port
            const nextPort = result.output?.nextPort || 'output';
            currentNodeId = this.findNextNodeId(workflow, node.id, nextPort);
          } else {
            // Skipped or timeout
            currentNodeId = this.findNextNodeId(workflow, node.id, 'output');
          }

          if (!currentNodeId) {
            execution.status = 'success';
          }
        } catch (error) {
          traceEntry.endTime = Date.now();
          traceEntry.duration = traceEntry.endTime - traceEntry.startTime;
          traceEntry.status = 'error';
          traceEntry.error = {
            code: 'EXECUTION_ERROR',
            message: (error as Error).message,
          };

          execution.status = 'error';
          execution.error = traceEntry.error;
          break;
        }

        trace.push(traceEntry);
      }

      execution.executionStack = trace;
      execution.variables = context.variables;

      if (nodeCount >= maxNodes) {
        execution.status = 'error';
        execution.error = {
          code: 'MAX_NODES_EXCEEDED',
          message: `Maximum node execution count (${maxNodes}) exceeded`,
        };
      }

      execution.endTime = Date.now();
      return execution;
    } catch (error) {
      execution.status = 'error';
      execution.error = {
        code: 'EXECUTION_ENGINE_ERROR',
        message: (error as Error).message,
      };
      execution.endTime = Date.now();
      return execution;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(context: ExecutionContext, node: NodeConfig): Promise<ExecutionResult> {
    const executor = getNodeExecutor(node.type);

    if (!executor) {
      return {
        nodeId: node.id,
        status: 'error',
        error: {
          code: 'NO_EXECUTOR',
          message: `No executor found for node type ${node.type}`,
        },
        duration: 0,
        timestamp: Date.now(),
      };
    }

    try {
      return await executor(context, node.properties || {});
    } catch (error) {
      return {
        nodeId: node.id,
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
        },
        duration: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Find node by ID
   */
  private findNodeById(workflow: Workflow, nodeId: string): NodeConfig | undefined {
    return workflow.nodes?.find(n => n.id === nodeId);
  }

  /**
   * Find start node
   */
  private findStartNodeId(workflow: Workflow): string | undefined {
    const startNode = workflow.nodes?.find(n => n.type === 'START');
    return startNode?.id;
  }

  /**
   * Find next node based on output port
   */
  private findNextNodeId(workflow: Workflow, nodeId: string, outputPort: string): string | undefined {
    const connection = workflow.connections?.find(
      c => c.source === nodeId && c.condition === outputPort
    );
    return connection?.target;
  }

  /**
   * Find error handler for node
   */
  private findErrorHandler(workflow: Workflow, nodeId: string): NodeConfig | undefined {
    // Look for error handler connected to this node
    const errorHandler = workflow.nodes?.find(n => n.type === 'ERROR_HANDLER');
    return errorHandler;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(execution: WorkflowExecution): ExecutionStatus {
    return execution.status;
  }

  /**
   * Get execution trace
   */
  getExecutionTrace(execution: WorkflowExecution): ExecutionTrace[] {
    return execution.executionStack || [];
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(execution: WorkflowExecution): {
    totalDuration: number;
    nodeCount: number;
    successCount: number;
    errorCount: number;
    status: ExecutionStatus;
  } {
    const trace = this.getExecutionTrace(execution);
    const totalDuration = (execution.endTime || Date.now()) - execution.startTime;
    const successCount = trace.filter(t => t.status === 'success').length;
    const errorCount = trace.filter(t => t.status === 'error').length;

    return {
      totalDuration,
      nodeCount: trace.length,
      successCount,
      errorCount,
      status: execution.status,
    };
  }

  /**
   * Retry execution with backoff
   */
  async retryExecution(
    workflow: Workflow,
    variables: Record<string, any>,
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const retryPolicy = options.retryPolicy || {
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
    };

    let lastExecution: WorkflowExecution | null = null;
    let delay = retryPolicy.initialDelayMs;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      lastExecution = await this.executeWorkflow(workflow, variables, options);

      if (lastExecution.status === 'success') {
        return lastExecution;
      }

      if (attempt < retryPolicy.maxRetries) {
        await this.sleep(delay);
        delay *= retryPolicy.backoffMultiplier;
      }
    }

    return lastExecution!;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Pause execution (for future implementation)
   */
  pauseExecution(executionId: string): boolean {
    // TODO: Implement execution pause
    return true;
  }

  /**
   * Resume execution (for future implementation)
   */
  resumeExecution(executionId: string): boolean {
    // TODO: Implement execution resume
    return true;
  }

  /**
   * Abort execution
   */
  abortExecution(executionId: string): boolean {
    // TODO: Implement execution abort
    return true;
  }
}

export default WorkflowExecutionEngine;
