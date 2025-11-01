/**
 * Workflow Execution Service
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 * Phase 1: Backend Infrastructure
 *
 * Executes workflows and manages execution state
 */

import {
  Workflow,
  ExecutionStatus,
  ExecutionRequest,
  WorkflowExecution,
  NodeExecution,
  NodeType,
  ExecutionRequest as ExecutionRequestType,
} from '../types/workflow';

/**
 * WorkflowExecutionService - Executes workflows
 */
export class WorkflowExecutionService {
  private executions: Map<string, WorkflowExecution> = new Map();
  private nextId = 1;

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    request: ExecutionRequest
  ): Promise<WorkflowExecution> {
    const id = `exec-${this.nextId++}`;
    const now = new Date();

    const execution: WorkflowExecution = {
      id,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: ExecutionStatus.RUNNING,
      inputs: request.inputs,
      outputs: {},
      nodeExecutions: [],
      variables: { ...request.inputs },
      startedAt: now,
      context: request.context,
    };

    this.executions.set(id, execution);

    try {
      // Execute workflow nodes
      await this.executeNodes(workflow, execution);

      // Update execution status
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - now.getTime();
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - now.getTime();
      execution.error = {
        message: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR',
        details: error,
      };
    }

    return execution;
  }

  /**
   * Execute nodes in workflow
   */
  private async executeNodes(
    workflow: Workflow,
    execution: WorkflowExecution
  ): Promise<void> {
    // Find start node
    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new Error('Workflow has no START node');
    }

    // Track execution state
    const executedNodeIds = new Set<string>();
    let currentNodeId: string | null = startNode.id;

    while (currentNodeId) {
      if (executedNodeIds.has(currentNodeId)) {
        // Circular reference or already executed
        break;
      }

      const node = workflow.nodes.find(n => n.id === currentNodeId);
      if (!node) {
        break;
      }

      executedNodeIds.add(currentNodeId);

      // Execute the node
      const nodeExecution = await this.executeNode(node, execution, workflow);
      execution.nodeExecutions.push(nodeExecution);

      // Check if this is end node
      if (node.type === NodeType.END) {
        break;
      }

      // Find next node based on connections
      const connection = workflow.connections.find(c => c.source === currentNodeId);
      currentNodeId = connection ? connection.target : null;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: any,
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<NodeExecution> {
    const now = new Date();
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: ExecutionStatus.RUNNING,
      input: {},
      output: {},
      startedAt: now,
    };

    try {
      // Prepare inputs
      if (node.inputs) {
        for (const inputVar of node.inputs) {
          nodeExecution.input![inputVar] = execution.variables[inputVar];
        }
      }

      // Execute based on node type
      await this.executeNodeByType(node, execution, nodeExecution);

      nodeExecution.status = ExecutionStatus.COMPLETED;
    } catch (error) {
      nodeExecution.status = ExecutionStatus.FAILED;
      nodeExecution.error = {
        message: error instanceof Error ? error.message : String(error),
        code: 'NODE_EXECUTION_ERROR',
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Try error handler if defined
      if (node.errorHandler) {
        const errorHandlerNode = workflow.nodes.find(n => n.id === node.errorHandler);
        if (errorHandlerNode) {
          // Execute error handler node
          try {
            await this.executeNode(errorHandlerNode, execution, workflow);
          } catch (handlerError) {
            // Error handler also failed
            console.error('Error handler failed:', handlerError);
          }
        }
      }

      throw error;
    } finally {
      nodeExecution.completedAt = new Date();
      nodeExecution.duration = nodeExecution.completedAt.getTime() - now.getTime();
    }

    return nodeExecution;
  }

  /**
   * Execute node based on its type
   */
  private async executeNodeByType(
    node: any,
    execution: WorkflowExecution,
    nodeExecution: NodeExecution
  ): Promise<void> {
    switch (node.type) {
      case NodeType.START:
        // Start node - just pass inputs through
        nodeExecution.output = execution.inputs;
        break;

      case NodeType.END:
        // End node - collect outputs
        if (node.inputs) {
          const outputs: Record<string, any> = {};
          for (const outputVar of node.inputs) {
            outputs[outputVar] = execution.variables[outputVar];
          }
          execution.outputs = outputs;
        }
        break;

      case NodeType.DATA_TRANSFORMATION:
        // Transform variables
        this.executeDataTransformation(node, execution, nodeExecution);
        break;

      case NodeType.API_CALL:
        // Call external API
        await this.executeApiCall(node, execution, nodeExecution);
        break;

      case NodeType.IF_THEN_ELSE:
        // Evaluate condition
        this.evaluateCondition(node, execution, nodeExecution);
        break;

      case NodeType.QUALITY_CHECK:
        // Perform quality check
        this.executeQualityCheck(node, execution, nodeExecution);
        break;

      default:
        // Generic execution
        nodeExecution.output = nodeExecution.input;
    }

    // Update workflow variables with outputs
    if (node.outputs && nodeExecution.output) {
      for (const outputVar of node.outputs) {
        if (outputVar in nodeExecution.output) {
          execution.variables[outputVar] = nodeExecution.output[outputVar];
        }
      }
    }
  }

  /**
   * Execute data transformation node
   */
  private executeDataTransformation(
    node: any,
    execution: WorkflowExecution,
    nodeExecution: NodeExecution
  ): void {
    // Simple variable assignment
    if (node.properties && node.properties.assignments) {
      const output: Record<string, any> = {};
      for (const [varName, expression] of Object.entries(node.properties.assignments)) {
        // Evaluate expression (simplified)
        output[varName] = this.evaluateExpression(expression, execution.variables);
      }
      nodeExecution.output = output;
    }
  }

  /**
   * Execute API call node
   */
  private async executeApiCall(
    node: any,
    execution: WorkflowExecution,
    nodeExecution: NodeExecution
  ): Promise<void> {
    // Simulate API call
    const url = node.properties?.url || '';
    const method = node.properties?.method || 'GET';

    // In real implementation, would call actual API
    console.log(`API Call: ${method} ${url}`);

    // Simulate response
    nodeExecution.output = {
      statusCode: 200,
      body: { success: true },
    };
  }

  /**
   * Execute quality check node
   */
  private executeQualityCheck(
    node: any,
    execution: WorkflowExecution,
    nodeExecution: NodeExecution
  ): void {
    // Simulate quality check
    const checkType = node.properties?.checkType || 'visual';
    const result = node.properties?.expectedResult || 'pass';

    nodeExecution.output = {
      checkType,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(
    node: any,
    execution: WorkflowExecution,
    nodeExecution: NodeExecution
  ): void {
    const condition = node.condition || 'true';
    const result = this.evaluateExpression(condition, execution.variables);

    nodeExecution.output = {
      condition: condition,
      result: result,
      conditionMet: Boolean(result),
    };
  }

  /**
   * Simple expression evaluator
   * In production, would use a proper expression language
   */
  private evaluateExpression(expression: any, variables: Record<string, any>): any {
    if (typeof expression === 'string') {
      // Simple variable substitution
      let result = expression;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(`${key}`, String(value));
      }
      return result;
    }
    return expression;
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return this.executions.get(id) || null;
  }

  /**
   * Get execution history for workflow
   */
  async getExecutionHistory(
    workflowId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    executions: WorkflowExecution[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let executions = Array.from(this.executions.values()).filter(
      e => e.workflowId === workflowId
    );

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedExecutions = executions.slice(start, end);

    return {
      executions: paginatedExecutions,
      total: executions.length,
      page,
      pageSize,
    };
  }

  /**
   * Cancel execution
   */
  async cancelExecution(id: string): Promise<WorkflowExecution | null> {
    const execution = this.executions.get(id);
    if (!execution) {
      return null;
    }

    if (execution.status === ExecutionStatus.RUNNING) {
      execution.status = ExecutionStatus.CANCELLED;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    }

    return execution;
  }

  /**
   * Pause execution
   */
  async pauseExecution(id: string): Promise<WorkflowExecution | null> {
    const execution = this.executions.get(id);
    if (!execution) {
      return null;
    }

    if (execution.status === ExecutionStatus.RUNNING) {
      execution.status = ExecutionStatus.PAUSED;
    }

    return execution;
  }

  /**
   * Clear all executions (for testing)
   */
  async clearAllExecutions(): Promise<void> {
    this.executions.clear();
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
