/**
 * Workflow Builder - Main Module Export
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 */

// Export types
export type {
  Workflow,
  WorkflowExecution,
  WorkflowVersion,
  NodeConfig,
  Connection,
  WorkflowVariable,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ExecutionRequest,
  HealthCheckResult,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowListResponse,
  ExecutionHistoryResponse,
  NodeExecution,
} from './types/workflow';

// Export enums
export {
  WorkflowStatus,
  ExecutionStatus,
  NodeType,
  VariableType,
  VariableScope,
} from './types/workflow';

// Export services
export { WorkflowService, workflowService } from './services/WorkflowService';
export { WorkflowValidationService, workflowValidationService } from './services/WorkflowValidationService';
export { WorkflowExecutionService, workflowExecutionService } from './services/WorkflowExecutionService';

/**
 * Workflow Builder Module
 *
 * Complete backend infrastructure for the Low-Code/No-Code Workflow Builder.
 * Provides services for workflow management, validation, and execution.
 *
 * @example
 * ```typescript
 * import { workflowService, workflowValidationService, workflowExecutionService } from '@machshop/workflow-builder';
 *
 * // Create a workflow
 * const workflow = await workflowService.createWorkflow('user123', {
 *   name: 'My Workflow',
 *   nodes: [...],
 *   connections: [...],
 *   variables: [...]
 * });
 *
 * // Validate it
 * const validation = workflowValidationService.validateWorkflow(workflow);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 *
 * // Execute it
 * const execution = await workflowExecutionService.executeWorkflow(workflow, {
 *   workflowId: workflow.id,
 *   inputs: { /* ... */ }
 * });
 *
 * console.log('Execution status:', execution.status);
 * ```
 */
