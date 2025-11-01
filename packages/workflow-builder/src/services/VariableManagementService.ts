/**
 * Variable Management Service
 * Manages workflow variables, scope, and lifecycle
 */

import { WorkflowVariable, VariableScope, VariableType } from '../types/workflow';

/**
 * Variable scope context
 */
export interface VariableContext {
  executionId: string;
  nodeId?: string;
  scope: VariableScope;
}

/**
 * Variable value with metadata
 */
export interface VariableValueWithMetadata {
  value: any;
  type: VariableType;
  scope: VariableScope;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

/**
 * Variable Management Service
 */
export class VariableManagementService {
  private globalVariables = new Map<string, VariableValueWithMetadata>();
  private executionVariables = new Map<string, Map<string, VariableValueWithMetadata>>();
  private nodeVariables = new Map<string, Map<string, VariableValueWithMetadata>>();

  /**
   * Initialize workflow variables from definitions
   */
  initializeVariables(workflowVariables: WorkflowVariable[], executionId: string): void {
    if (!this.executionVariables.has(executionId)) {
      this.executionVariables.set(executionId, new Map());
    }

    const execVars = this.executionVariables.get(executionId)!;

    for (const variable of workflowVariables) {
      const metadata: VariableValueWithMetadata = {
        value: variable.defaultValue,
        type: variable.type,
        scope: variable.scope || 'workflow',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
      };

      if (variable.scope === 'global') {
        this.globalVariables.set(variable.name, metadata);
      } else {
        execVars.set(variable.name, metadata);
      }
    }
  }

  /**
   * Get variable value
   */
  getVariable(
    name: string,
    context: VariableContext
  ): any | undefined {
    // Try node scope first
    if (context.nodeId) {
      const nodeVars = this.nodeVariables.get(context.nodeId);
      if (nodeVars?.has(name)) {
        return nodeVars.get(name)?.value;
      }
    }

    // Try execution scope
    const execVars = this.executionVariables.get(context.executionId);
    if (execVars?.has(name)) {
      return execVars.get(name)?.value;
    }

    // Try global scope
    if (this.globalVariables.has(name)) {
      return this.globalVariables.get(name)?.value;
    }

    return undefined;
  }

  /**
   * Set variable value
   */
  setVariable(
    name: string,
    value: any,
    type: VariableType,
    context: VariableContext
  ): boolean {
    try {
      // Validate type
      if (!this.validateType(value, type)) {
        throw new Error(`Invalid type for variable ${name}. Expected ${type}`);
      }

      const metadata: VariableValueWithMetadata = {
        value,
        type,
        scope: context.scope,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: context.nodeId || 'system',
      };

      if (context.scope === 'global') {
        this.globalVariables.set(name, metadata);
      } else if (context.scope === 'node' && context.nodeId) {
        if (!this.nodeVariables.has(context.nodeId)) {
          this.nodeVariables.set(context.nodeId, new Map());
        }
        this.nodeVariables.get(context.nodeId)!.set(name, metadata);
      } else {
        const execVars = this.executionVariables.get(context.executionId);
        if (!execVars) {
          this.executionVariables.set(context.executionId, new Map());
        }
        this.executionVariables.get(context.executionId)!.set(name, metadata);
      }

      return true;
    } catch (error) {
      console.error(`Failed to set variable ${name}:`, error);
      return false;
    }
  }

  /**
   * Delete variable
   */
  deleteVariable(name: string, context: VariableContext): boolean {
    try {
      if (context.scope === 'global') {
        return this.globalVariables.delete(name);
      } else if (context.scope === 'node' && context.nodeId) {
        const nodeVars = this.nodeVariables.get(context.nodeId);
        return nodeVars ? nodeVars.delete(name) : false;
      } else {
        const execVars = this.executionVariables.get(context.executionId);
        return execVars ? execVars.delete(name) : false;
      }
    } catch (error) {
      console.error(`Failed to delete variable ${name}:`, error);
      return false;
    }
  }

  /**
   * Get all variables in scope
   */
  getVariables(context: VariableContext): Record<string, any> {
    const variables: Record<string, any> = {};

    // Include global variables
    for (const [name, meta] of this.globalVariables) {
      variables[name] = meta.value;
    }

    // Include execution variables
    const execVars = this.executionVariables.get(context.executionId);
    if (execVars) {
      for (const [name, meta] of execVars) {
        variables[name] = meta.value;
      }
    }

    // Include node variables if in node scope
    if (context.nodeId) {
      const nodeVars = this.nodeVariables.get(context.nodeId);
      if (nodeVars) {
        for (const [name, meta] of nodeVars) {
          variables[name] = meta.value;
        }
      }
    }

    return variables;
  }

  /**
   * Validate variable type
   */
  private validateType(value: any, type: VariableType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string' || value === null;
      case 'number':
        return typeof value === 'number' || value === null;
      case 'boolean':
        return typeof value === 'boolean' || value === null;
      case 'array':
        return Array.isArray(value) || value === null;
      case 'object':
        return typeof value === 'object' || value === null;
      default:
        return true;
    }
  }

  /**
   * Get variable metadata
   */
  getVariableMetadata(
    name: string,
    context: VariableContext
  ): VariableValueWithMetadata | undefined {
    // Try node scope first
    if (context.nodeId) {
      const nodeVars = this.nodeVariables.get(context.nodeId);
      if (nodeVars?.has(name)) {
        return nodeVars.get(name);
      }
    }

    // Try execution scope
    const execVars = this.executionVariables.get(context.executionId);
    if (execVars?.has(name)) {
      return execVars.get(name);
    }

    // Try global scope
    if (this.globalVariables.has(name)) {
      return this.globalVariables.get(name);
    }

    return undefined;
  }

  /**
   * Clear execution variables
   */
  clearExecutionVariables(executionId: string): boolean {
    return this.executionVariables.delete(executionId);
  }

  /**
   * Clear node variables
   */
  clearNodeVariables(nodeId: string): boolean {
    return this.nodeVariables.delete(nodeId);
  }

  /**
   * Resolve variable references in expression
   */
  resolveExpression(expression: string, context: VariableContext): any {
    try {
      const variables = this.getVariables(context);

      // Create function to evaluate expression safely
      const func = new Function(
        ...Object.keys(variables),
        `return (${expression})`
      );

      return func(...Object.values(variables));
    } catch (error) {
      console.error(`Failed to resolve expression "${expression}":`, error);
      return undefined;
    }
  }

  /**
   * Interpolate variables in string
   */
  interpolateString(str: string, context: VariableContext): string {
    const variables = this.getVariables(context);

    return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  /**
   * Get variable type
   */
  getVariableType(
    name: string,
    context: VariableContext
  ): VariableType | undefined {
    const metadata = this.getVariableMetadata(name, context);
    return metadata?.type;
  }

  /**
   * Check if variable exists
   */
  hasVariable(name: string, context: VariableContext): boolean {
    return this.getVariable(name, context) !== undefined;
  }

  /**
   * Get all variable names
   */
  getVariableNames(context: VariableContext): string[] {
    const names = new Set<string>();

    // Add global variable names
    for (const name of this.globalVariables.keys()) {
      names.add(name);
    }

    // Add execution variable names
    const execVars = this.executionVariables.get(context.executionId);
    if (execVars) {
      for (const name of execVars.keys()) {
        names.add(name);
      }
    }

    // Add node variable names
    if (context.nodeId) {
      const nodeVars = this.nodeVariables.get(context.nodeId);
      if (nodeVars) {
        for (const name of nodeVars.keys()) {
          names.add(name);
        }
      }
    }

    return Array.from(names);
  }

  /**
   * Export variables for persistence
   */
  exportVariables(context: VariableContext): Record<string, any> {
    return this.getVariables(context);
  }

  /**
   * Import variables from persistence
   */
  importVariables(
    variables: Record<string, any>,
    context: VariableContext
  ): void {
    for (const [name, value] of Object.entries(variables)) {
      const type = this.getVariableType(name, context) || 'object';
      this.setVariable(name, value, type, context);
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): {
    globalVariables: number;
    executionVariables: number;
    nodeVariables: number;
    total: number;
  } {
    const globalSize = JSON.stringify(this.globalVariables).length;
    const executionSize = JSON.stringify(this.executionVariables).length;
    const nodeSize = JSON.stringify(this.nodeVariables).length;

    return {
      globalVariables: globalSize,
      executionVariables: executionSize,
      nodeVariables: nodeSize,
      total: globalSize + executionSize + nodeSize,
    };
  }
}

export default VariableManagementService;
