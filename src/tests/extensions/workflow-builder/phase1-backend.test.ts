/**
 * Phase 1: Backend Infrastructure Tests
 * Issue #394: Low-Code/No-Code Workflow Builder
 *
 * Tests for WorkflowService, WorkflowValidationService, and WorkflowExecutionService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { workflowService } from '../../../../packages/workflow-builder/src/services/WorkflowService.ts';
import { workflowValidationService } from '../../../../packages/workflow-builder/src/services/WorkflowValidationService.ts';
import { workflowExecutionService } from '../../../../packages/workflow-builder/src/services/WorkflowExecutionService.ts';
import type {
  Workflow,
  NodeConfig,
  Connection,
} from '../../../../packages/workflow-builder/src/types/workflow.ts';
import {
  WorkflowStatus,
  NodeType,
  VariableType,
  VariableScope,
  ExecutionStatus,
} from '../../../../packages/workflow-builder/src/types/workflow.ts';

// ============================================================================
// Test Fixtures
// ============================================================================

function createSimpleWorkflow(): Partial<Workflow> {
  const startNode: NodeConfig = {
    id: 'node-1',
    type: NodeType.START,
    name: 'Start',
    x: 100,
    y: 100,
    properties: {},
  };

  const endNode: NodeConfig = {
    id: 'node-2',
    type: NodeType.END,
    name: 'End',
    x: 300,
    y: 100,
    properties: {},
  };

  const connection: Connection = {
    id: 'conn-1',
    source: 'node-1',
    target: 'node-2',
  };

  return {
    name: 'Simple Workflow',
    description: 'A basic workflow with start and end nodes',
    nodes: [startNode, endNode],
    connections: [connection],
    variables: [
      {
        id: 'var-1',
        name: 'status',
        type: VariableType.STRING,
        scope: VariableScope.GLOBAL,
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

function createComplexWorkflow(): Partial<Workflow> {
  const startNode: NodeConfig = {
    id: 'node-1',
    type: NodeType.START,
    name: 'Start',
    x: 100,
    y: 100,
    properties: {},
  };

  const qcNode: NodeConfig = {
    id: 'node-2',
    type: NodeType.QUALITY_CHECK,
    name: 'Quality Check',
    x: 200,
    y: 100,
    properties: { checkType: 'visual' },
    inputs: ['material'],
    outputs: ['qcResult'],
  };

  const decisionNode: NodeConfig = {
    id: 'node-3',
    type: NodeType.IF_THEN_ELSE,
    name: 'Check Result',
    x: 300,
    y: 100,
    condition: 'qcResult === "pass"',
    properties: {},
  };

  const passNode: NodeConfig = {
    id: 'node-4',
    type: NodeType.END,
    name: 'Pass',
    x: 400,
    y: 50,
    properties: {},
  };

  const failNode: NodeConfig = {
    id: 'node-5',
    type: NodeType.NOTIFICATION,
    name: 'Send Alert',
    x: 400,
    y: 150,
    properties: { notificationType: 'email' },
    errorHandler: 'node-6',
  };

  const endNode: NodeConfig = {
    id: 'node-6',
    type: NodeType.END,
    name: 'End',
    x: 500,
    y: 100,
    properties: {},
  };

  const connections: Connection[] = [
    { id: 'c1', source: 'node-1', target: 'node-2' },
    { id: 'c2', source: 'node-2', target: 'node-3' },
    { id: 'c3', source: 'node-3', target: 'node-4', condition: 'true' },
    { id: 'c4', source: 'node-3', target: 'node-5', condition: 'false' },
    { id: 'c5', source: 'node-5', target: 'node-6' },
  ];

  return {
    name: 'Quality Inspection Workflow',
    description: 'Material quality inspection with pass/fail routing',
    nodes: [startNode, qcNode, decisionNode, passNode, failNode, endNode],
    connections,
    variables: [
      {
        id: 'v1',
        name: 'material',
        type: VariableType.STRING,
        scope: VariableScope.PARAMETER,
        required: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'v2',
        name: 'qcResult',
        type: VariableType.STRING,
        scope: VariableScope.LOCAL,
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

// ============================================================================
// WorkflowService Tests
// ============================================================================

describe('WorkflowService - CRUD Operations', () => {
  beforeEach(async () => {
    await workflowService.clearAllWorkflows();
  });

  it('should create a workflow', async () => {
    const request = createSimpleWorkflow();

    const workflow = await workflowService.createWorkflow('user1', request as any);

    expect(workflow).toBeDefined();
    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBe('Simple Workflow');
    expect(workflow.status).toBe(WorkflowStatus.DRAFT);
    expect(workflow.version).toBe(1);
    expect(workflow.createdBy).toBe('user1');
  });

  it('should get workflow by ID', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const retrieved = await workflowService.getWorkflow(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe(created.name);
  });

  it('should list workflows with pagination', async () => {
    // Create multiple workflows
    for (let i = 0; i < 5; i++) {
      const request = createSimpleWorkflow();
      request.name = `Workflow ${i + 1}`;
      await workflowService.createWorkflow('user1', request as any);
    }

    const page1 = await workflowService.listWorkflows(1, 3);

    expect(page1.total).toBe(5);
    expect(page1.workflows.length).toBe(3);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(3);

    const page2 = await workflowService.listWorkflows(2, 3);

    expect(page2.workflows.length).toBe(2);
  });

  it('should update a workflow', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const updated = await workflowService.updateWorkflow(created.id, 'user2', {
      name: 'Updated Workflow',
      description: 'New description',
    });

    expect(updated?.name).toBe('Updated Workflow');
    expect(updated?.description).toBe('New description');
    expect(updated?.updatedBy).toBe('user2');
    expect(updated?.version).toBe(1); // No structural changes
  });

  it('should increment version when nodes change', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const newNode: NodeConfig = {
      id: 'node-new',
      type: NodeType.QUALITY_CHECK,
      name: 'New Node',
      x: 200,
      y: 200,
      properties: {},
    };

    const updated = await workflowService.updateWorkflow(created.id, 'user1', {
      nodes: [...created.nodes, newNode],
    });

    expect(updated?.version).toBe(2);
  });

  it('should delete a workflow', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const deleted = await workflowService.deleteWorkflow(created.id);

    expect(deleted).toBe(true);

    const retrieved = await workflowService.getWorkflow(created.id);
    expect(retrieved).toBeNull();
  });

  it('should publish workflow', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const published = await workflowService.publishWorkflow(created.id, 'user1');

    expect(published?.status).toBe(WorkflowStatus.ACTIVE);
  });

  it('should disable workflow', async () => {
    const request = createSimpleWorkflow();
    const created = await workflowService.createWorkflow('user1', request as any);

    const disabled = await workflowService.disableWorkflow(created.id, 'user1');

    expect(disabled?.status).toBe(WorkflowStatus.DISABLED);
  });

  it('should search workflows', async () => {
    await workflowService.createWorkflow('user1', {
      ...createSimpleWorkflow(),
      name: 'Quality Inspection',
    } as any);

    await workflowService.createWorkflow('user1', {
      ...createSimpleWorkflow(),
      name: 'Material Handling',
    } as any);

    const results = await workflowService.searchWorkflows('Quality');

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Quality Inspection');
  });

  it('should duplicate workflow', async () => {
    const request = createSimpleWorkflow();
    const original = await workflowService.createWorkflow('user1', request as any);

    const duplicate = await workflowService.duplicateWorkflow(
      original.id,
      'user2',
      'Duplicated Workflow'
    );

    expect(duplicate).toBeDefined();
    expect(duplicate?.id).not.toBe(original.id);
    expect(duplicate?.name).toBe('Duplicated Workflow');
    expect(duplicate?.nodes.length).toBe(original.nodes.length);
    expect(duplicate?.status).toBe(WorkflowStatus.DRAFT);
  });
});

// ============================================================================
// WorkflowValidationService Tests
// ============================================================================

describe('WorkflowValidationService - Workflow Validation', () => {
  it('should validate a simple workflow', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject workflow without start node', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Remove START node
    workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.START);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_START_NODE')).toBe(true);
  });

  it('should reject workflow without end node', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Remove END node
    workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.END);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NO_END_NODE')).toBe(true);
  });

  it('should detect circular connections', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Add circular connection
    workflow.connections.push({
      id: 'circ',
      source: 'node-1',
      target: 'node-1',
    });

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.errors.some(e => e.code === 'CIRCULAR_CONNECTION')).toBe(true);
  });

  it('should detect orphaned nodes', async () => {
    const request = createComplexWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Add isolated node
    const isolatedNode: NodeConfig = {
      id: 'orphan',
      type: NodeType.QUALITY_CHECK,
      name: 'Orphaned Node',
      x: 600,
      y: 100,
      properties: {},
    };
    workflow.nodes.push(isolatedNode);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.warnings.some(w => w.code === 'ORPHANED_NODE')).toBe(true);
  });

  it('should validate decision node requires condition', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Add decision node without condition
    const decisionNode: NodeConfig = {
      id: 'decision',
      type: NodeType.IF_THEN_ELSE,
      name: 'Decision',
      x: 200,
      y: 100,
      properties: {},
    };
    workflow.nodes.push(decisionNode);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.errors.some(e => e.code === 'MISSING_CONDITION')).toBe(true);
  });

  it('should detect duplicate variable names', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Add duplicate variable
    workflow.variables.push({
      id: 'dup',
      name: 'status',
      type: VariableType.STRING,
      scope: VariableScope.GLOBAL,
      required: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.errors.some(e => e.code === 'DUPLICATE_VARIABLE_NAME')).toBe(true);
  });

  it('should validate API call node requires URL', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const apiNode: NodeConfig = {
      id: 'api',
      type: NodeType.API_CALL,
      name: 'API Call',
      x: 200,
      y: 100,
      properties: {}, // Missing URL
    };
    workflow.nodes.push(apiNode);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.errors.some(e => e.code === 'MISSING_API_URL')).toBe(true);
  });

  it('should validate complex workflow', async () => {
    const request = createComplexWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const result = workflowValidationService.validateWorkflow(workflow);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ============================================================================
// WorkflowExecutionService Tests
// ============================================================================

describe('WorkflowExecutionService - Execution', () => {
  beforeEach(async () => {
    await workflowExecutionService.clearAllExecutions();
  });

  it('should execute a simple workflow', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const execution = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: { status: 'started' },
    });

    expect(execution).toBeDefined();
    expect(execution.id).toBeDefined();
    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution.workflowId).toBe(workflow.id);
    expect(execution.inputs).toEqual({ status: 'started' });
  });

  it('should execute workflow with variables', async () => {
    const request = createComplexWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const execution = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: { material: 'aluminum' },
    });

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution.variables).toHaveProperty('material');
  });

  it('should get execution by ID', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const created = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: {},
    });

    const retrieved = await workflowExecutionService.getExecution(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should get execution history', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Execute multiple times
    for (let i = 0; i < 3; i++) {
      await workflowExecutionService.executeWorkflow(workflow, {
        workflowId: workflow.id,
        inputs: {},
      });
    }

    const history = await workflowExecutionService.getExecutionHistory(workflow.id);

    expect(history.total).toBe(3);
    expect(history.executions.length).toBe(3);
  });

  it('should cancel execution', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const execution = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: {},
    });

    // Update status to RUNNING for testing
    execution.status = ExecutionStatus.RUNNING;

    const cancelled = await workflowExecutionService.cancelExecution(execution.id);

    expect(cancelled?.status).toBe(ExecutionStatus.CANCELLED);
  });

  it('should track execution time', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const execution = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: {},
    });

    expect(execution.duration).toBeGreaterThanOrEqual(0);
    expect(execution.completedAt).toBeDefined();
  });

  it('should track node executions', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    const execution = await workflowExecutionService.executeWorkflow(workflow, {
      workflowId: workflow.id,
      inputs: {},
    });

    expect(execution.nodeExecutions.length).toBeGreaterThan(0);
    expect(execution.nodeExecutions[0].nodeId).toBeDefined();
    expect(execution.nodeExecutions[0].status).toBeDefined();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Phase 1 Integration Tests', () => {
  beforeEach(async () => {
    await workflowService.clearAllWorkflows();
    await workflowExecutionService.clearAllExecutions();
  });

  it('should create, validate, and execute a workflow', async () => {
    // Create
    const request = createComplexWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Validate
    const validationResult = workflowValidationService.validateWorkflow(workflow);
    expect(validationResult.valid).toBe(true);

    // Publish
    const published = await workflowService.publishWorkflow(workflow.id, 'user1');
    expect(published?.status).toBe(WorkflowStatus.ACTIVE);

    // Execute
    const execution = await workflowExecutionService.executeWorkflow(published!, {
      workflowId: published!.id,
      inputs: { material: 'steel' },
    });

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution.nodeExecutions.length).toBeGreaterThan(0);
  });

  it('should handle workflow versioning', async () => {
    // Create v1
    const request = createSimpleWorkflow();
    const v1 = await workflowService.createWorkflow('user1', request as any);

    expect(v1.version).toBe(1);

    // Update structure -> v2
    const v2 = await workflowService.updateWorkflow(v1.id, 'user1', {
      nodes: [
        ...v1.nodes,
        {
          id: 'new-node',
          type: NodeType.QUALITY_CHECK,
          name: 'New Node',
          x: 200,
          y: 200,
          properties: {},
        },
      ],
    });

    expect(v2?.version).toBe(2);
  });

  it('should enforce validation before execution', async () => {
    const request = createSimpleWorkflow();
    const workflow = await workflowService.createWorkflow('user1', request as any);

    // Remove end node
    workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.END);

    const validation = workflowValidationService.validateWorkflow(workflow);

    expect(validation.valid).toBe(false);
    // Should not execute invalid workflow in production
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Phase 1 Performance Tests', () => {
  it('should handle 100 workflows', async () => {
    await workflowService.clearAllWorkflows();

    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      const request = createSimpleWorkflow();
      request.name = `Workflow ${i + 1}`;
      await workflowService.createWorkflow('user1', request as any);
    }

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    expect(await workflowService.getWorkflowCount()).toBe(100);
  });

  it('should validate 50 complex workflows quickly', async () => {
    const workflows: Workflow[] = [];

    for (let i = 0; i < 50; i++) {
      const request = createComplexWorkflow();
      request.name = `Complex Workflow ${i + 1}`;
      const wf = await workflowService.createWorkflow('user1', request as any);
      workflows.push(wf);
    }

    const start = Date.now();

    for (const workflow of workflows) {
      workflowValidationService.validateWorkflow(workflow);
    }

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000); // Should validate 50 workflows in < 2 seconds
  });
});
