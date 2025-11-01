/**
 * Workflow Service
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 * Phase 1: Backend Infrastructure
 *
 * Handles CRUD operations for workflows
 */

import {
  Workflow,
  WorkflowStatus,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ValidationResult,
  WorkflowListResponse,
} from '../types/workflow';

/**
 * WorkflowService - CRUD operations for workflows
 */
export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private nextId = 1;

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    request: CreateWorkflowRequest
  ): Promise<Workflow> {
    const id = `wf-${this.nextId++}`;
    const now = new Date();

    const workflow: Workflow = {
      id,
      name: request.name,
      description: request.description,
      status: WorkflowStatus.DRAFT,
      version: 1,
      nodes: request.nodes || [],
      connections: request.connections || [],
      variables: request.variables || [],
      metadata: request.metadata,
      validationErrors: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  /**
   * List all workflows with pagination
   */
  async listWorkflows(
    page: number = 1,
    pageSize: number = 20,
    filters?: { status?: WorkflowStatus }
  ): Promise<WorkflowListResponse> {
    let workflows = Array.from(this.workflows.values());

    // Apply filters
    if (filters?.status) {
      workflows = workflows.filter(w => w.status === filters.status);
    }

    // Sort by creation date (newest first)
    workflows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedWorkflows = workflows.slice(start, end);

    return {
      workflows: paginatedWorkflows,
      total: workflows.length,
      page,
      pageSize,
    };
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    id: string,
    userId: string,
    request: UpdateWorkflowRequest
  ): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return null;
    }

    const now = new Date();

    // Update fields
    if (request.name !== undefined) workflow.name = request.name;
    if (request.description !== undefined) workflow.description = request.description;
    if (request.nodes !== undefined) workflow.nodes = request.nodes;
    if (request.connections !== undefined) workflow.connections = request.connections;
    if (request.variables !== undefined) workflow.variables = request.variables;
    if (request.metadata !== undefined) workflow.metadata = request.metadata;
    if (request.status !== undefined) workflow.status = request.status;

    workflow.updatedAt = now;
    workflow.updatedBy = userId;

    // Increment version on significant changes
    if (request.nodes || request.connections || request.variables) {
      workflow.version += 1;
    }

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  /**
   * Publish a workflow (change status from draft to active)
   */
  async publishWorkflow(id: string, userId: string): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return null;
    }

    workflow.status = WorkflowStatus.ACTIVE;
    workflow.updatedAt = new Date();
    workflow.updatedBy = userId;

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Disable a workflow
   */
  async disableWorkflow(id: string, userId: string): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return null;
    }

    workflow.status = WorkflowStatus.DISABLED;
    workflow.updatedAt = new Date();
    workflow.updatedBy = userId;

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Archive a workflow
   */
  async archiveWorkflow(id: string, userId: string): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return null;
    }

    workflow.status = WorkflowStatus.ARCHIVED;
    workflow.updatedAt = new Date();
    workflow.updatedBy = userId;

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Get all workflows for a given status
   */
  async getWorkflowsByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter(w => w.status === status);
  }

  /**
   * Search workflows by name
   */
  async searchWorkflows(query: string): Promise<Workflow[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.workflows.values()).filter(
      w => w.name.toLowerCase().includes(lowerQuery) ||
           w.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Duplicate a workflow
   */
  async duplicateWorkflow(id: string, userId: string, newName: string): Promise<Workflow | null> {
    const original = this.workflows.get(id);
    if (!original) {
      return null;
    }

    const duplicated: Workflow = {
      ...original,
      id: `wf-${this.nextId++}`,
      name: newName,
      status: WorkflowStatus.DRAFT,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    this.workflows.set(duplicated.id, duplicated);
    return duplicated;
  }

  /**
   * Get workflow count
   */
  async getWorkflowCount(): Promise<number> {
    return this.workflows.size;
  }

  /**
   * Clear all workflows (for testing)
   */
  async clearAllWorkflows(): Promise<void> {
    this.workflows.clear();
  }
}

export const workflowService = new WorkflowService();
