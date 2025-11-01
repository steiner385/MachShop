/**
 * Workflow Validation Service
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 * Phase 1: Backend Infrastructure
 *
 * Validates workflow structure and logic
 */

import {
  Workflow,
  NodeType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  NodeConfig,
  Connection,
} from '../types/workflow';

/**
 * WorkflowValidationService - Validates workflow structure and logic
 */
export class WorkflowValidationService {
  /**
   * Validate a complete workflow
   */
  validateWorkflow(workflow: Workflow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check basic structure
    this.validateBasicStructure(workflow, errors);

    // Check nodes
    this.validateNodes(workflow, errors, warnings);

    // Check connections
    this.validateConnections(workflow, errors, warnings);

    // Check variables
    this.validateVariables(workflow, errors, warnings);

    // Check routing logic
    this.validateRoutingLogic(workflow, errors, warnings);

    // Check for orphaned nodes
    this.checkOrphanedNodes(workflow, warnings);

    // Check for unreachable nodes
    this.checkUnreachableNodes(workflow, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic workflow structure
   */
  private validateBasicStructure(
    workflow: Workflow,
    errors: ValidationError[]
  ): void {
    // Check workflow has a name
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push({
        code: 'MISSING_WORKFLOW_NAME',
        message: 'Workflow must have a name',
        severity: 'error',
      });
    }

    // Check workflow has nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push({
        code: 'NO_NODES',
        message: 'Workflow must contain at least one node',
        severity: 'error',
      });
      return; // Can't validate further without nodes
    }

    // Check for start node
    const hasStartNode = workflow.nodes.some(n => n.type === NodeType.START);
    if (!hasStartNode) {
      errors.push({
        code: 'NO_START_NODE',
        message: 'Workflow must have a START node',
        severity: 'error',
      });
    }

    // Check for end node
    const hasEndNode = workflow.nodes.some(n => n.type === NodeType.END);
    if (!hasEndNode) {
      errors.push({
        code: 'NO_END_NODE',
        message: 'Workflow must have an END node',
        severity: 'error',
      });
    }
  }

  /**
   * Validate all nodes in workflow
   */
  private validateNodes(
    workflow: Workflow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const node of workflow.nodes) {
      // Check node has required fields
      if (!node.id || !node.name) {
        errors.push({
          code: 'INVALID_NODE_STRUCTURE',
          message: `Node missing required fields (id, name)`,
          nodeId: node.id,
          severity: 'error',
        });
        continue;
      }

      // Check node type is valid
      if (!Object.values(NodeType).includes(node.type)) {
        errors.push({
          code: 'INVALID_NODE_TYPE',
          message: `Node has invalid type: ${node.type}`,
          nodeId: node.id,
          severity: 'error',
        });
      }

      // Check node properties
      if (!node.properties || typeof node.properties !== 'object') {
        warnings.push({
          code: 'MISSING_NODE_PROPERTIES',
          message: `Node "${node.name}" has no properties defined`,
          nodeId: node.id,
          suggestion: 'Add configuration properties for this node',
        });
      }

      // Validate specific node types
      this.validateNodeType(node, errors);
    }
  }

  /**
   * Validate specific node type constraints
   */
  private validateNodeType(node: NodeConfig, errors: ValidationError[]): void {
    switch (node.type) {
      case NodeType.START:
        // START nodes should have no inputs
        if (node.inputs && node.inputs.length > 0) {
          errors.push({
            code: 'START_NODE_HAS_INPUTS',
            message: 'START node should not have inputs',
            nodeId: node.id,
            severity: 'warning',
          });
        }
        break;

      case NodeType.END:
        // END nodes should have no outputs
        if (node.outputs && node.outputs.length > 0) {
          errors.push({
            code: 'END_NODE_HAS_OUTPUTS',
            message: 'END node should not have outputs',
            nodeId: node.id,
            severity: 'warning',
          });
        }
        break;

      case NodeType.IF_THEN_ELSE:
      case NodeType.SWITCH:
        // Decision nodes should have condition
        if (!node.condition) {
          errors.push({
            code: 'MISSING_CONDITION',
            message: `${node.type} node must have a condition expression`,
            nodeId: node.id,
            severity: 'error',
          });
        }
        break;

      case NodeType.API_CALL:
        // API call nodes need URL
        if (!node.properties.url) {
          errors.push({
            code: 'MISSING_API_URL',
            message: 'API Call node must specify a URL',
            nodeId: node.id,
            severity: 'error',
          });
        }
        break;

      case NodeType.LOOP:
        // Loop nodes need condition or count
        if (!node.condition && !node.properties.maxIterations) {
          errors.push({
            code: 'MISSING_LOOP_CONDITION',
            message: 'Loop node must have either a condition or max iterations',
            nodeId: node.id,
            severity: 'error',
          });
        }
        break;
    }
  }

  /**
   * Validate all connections
   */
  private validateConnections(
    workflow: Workflow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!workflow.connections) {
      return;
    }

    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    for (const conn of workflow.connections) {
      // Check connection references valid nodes
      if (!nodeIds.has(conn.source)) {
        errors.push({
          code: 'INVALID_CONNECTION_SOURCE',
          message: `Connection references invalid source node: ${conn.source}`,
          connectionId: conn.id,
          severity: 'error',
        });
      }

      if (!nodeIds.has(conn.target)) {
        errors.push({
          code: 'INVALID_CONNECTION_TARGET',
          message: `Connection references invalid target node: ${conn.target}`,
          connectionId: conn.id,
          severity: 'error',
        });
      }

      // Check for circular connections (basic check)
      if (conn.source === conn.target) {
        errors.push({
          code: 'CIRCULAR_CONNECTION',
          message: `Node cannot connect to itself: ${conn.source}`,
          connectionId: conn.id,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate workflow variables
   */
  private validateVariables(
    workflow: Workflow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!workflow.variables) {
      return;
    }

    const variableNames = new Set<string>();

    for (const variable of workflow.variables) {
      // Check for unique names
      if (variableNames.has(variable.name)) {
        errors.push({
          code: 'DUPLICATE_VARIABLE_NAME',
          message: `Duplicate variable name: ${variable.name}`,
          field: 'variables',
          severity: 'error',
        });
      }
      variableNames.add(variable.name);

      // Check variable has required fields
      if (!variable.name || !variable.type) {
        errors.push({
          code: 'INVALID_VARIABLE',
          message: 'Variable must have name and type',
          field: 'variables',
          severity: 'error',
        });
      }

      // Check constraints are valid
      if (variable.constraints) {
        if (variable.type === 'string') {
          if (variable.constraints.minLength && variable.constraints.maxLength &&
              variable.constraints.minLength > variable.constraints.maxLength) {
            errors.push({
              code: 'INVALID_CONSTRAINT',
              message: 'minLength cannot be greater than maxLength',
              field: `variables.${variable.name}`,
              severity: 'error',
            });
          }
        }

        if (variable.type === 'number') {
          if (variable.constraints.minimum && variable.constraints.maximum &&
              variable.constraints.minimum > variable.constraints.maximum) {
            errors.push({
              code: 'INVALID_CONSTRAINT',
              message: 'minimum cannot be greater than maximum',
              field: `variables.${variable.name}`,
              severity: 'error',
            });
          }
        }
      }
    }
  }

  /**
   * Validate routing logic
   */
  private validateRoutingLogic(
    workflow: Workflow,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check that START node has at least one outgoing connection
    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (startNode) {
      const hasOutgoing = workflow.connections.some(c => c.source === startNode.id);
      if (!hasOutgoing) {
        errors.push({
          code: 'START_NODE_ISOLATED',
          message: 'START node must have at least one outgoing connection',
          nodeId: startNode.id,
          severity: 'error',
        });
      }
    }

    // Check that END node has at least one incoming connection
    const endNode = workflow.nodes.find(n => n.type === NodeType.END);
    if (endNode) {
      const hasIncoming = workflow.connections.some(c => c.target === endNode.id);
      if (!hasIncoming) {
        errors.push({
          code: 'END_NODE_ISOLATED',
          message: 'END node must have at least one incoming connection',
          nodeId: endNode.id,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Check for orphaned nodes (nodes with no connections)
   */
  private checkOrphanedNodes(
    workflow: Workflow,
    warnings: ValidationWarning[]
  ): void {
    const connectedNodeIds = new Set<string>();

    for (const conn of workflow.connections) {
      connectedNodeIds.add(conn.source);
      connectedNodeIds.add(conn.target);
    }

    for (const node of workflow.nodes) {
      // START node is allowed to be the only node
      if (node.type === NodeType.START && workflow.nodes.length === 1) {
        continue;
      }

      if (!connectedNodeIds.has(node.id)) {
        warnings.push({
          code: 'ORPHANED_NODE',
          message: `Node "${node.name}" is not connected to any other nodes`,
          nodeId: node.id,
          suggestion: 'Add connections to integrate this node',
        });
      }
    }
  }

  /**
   * Check for unreachable nodes
   */
  private checkUnreachableNodes(
    workflow: Workflow,
    warnings: ValidationWarning[]
  ): void {
    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      return;
    }

    const reachableNodes = this.findReachableNodes(workflow, startNode.id);

    for (const node of workflow.nodes) {
      if (node.id !== startNode.id && !reachableNodes.has(node.id)) {
        warnings.push({
          code: 'UNREACHABLE_NODE',
          message: `Node "${node.name}" is not reachable from START node`,
          nodeId: node.id,
          suggestion: 'Add connections to make this node reachable',
        });
      }
    }
  }

  /**
   * Find all nodes reachable from a given node
   */
  private findReachableNodes(workflow: Workflow, startNodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      // Find all outgoing connections
      const outgoing = workflow.connections.filter(c => c.source === nodeId);
      for (const conn of outgoing) {
        if (!visited.has(conn.target)) {
          queue.push(conn.target);
        }
      }
    }

    return visited;
  }
}

export const workflowValidationService = new WorkflowValidationService();
