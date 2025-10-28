/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 * REST API routes for workflow system supporting sequential stages,
 * parallel approvals, conditional routing, and role-based assignment
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  WorkflowType,
  WorkflowStatus,
  Priority,
  ImpactLevel,
  ApprovalAction,
  ApprovalType,
  AssignmentStrategy,
  ConditionOperator,
  RuleActionType,
  TaskStatus
} from '@prisma/client';
import {
  WorkflowDefinitionInput,
  WorkflowDefinitionUpdate,
  WorkflowInstanceInput,
  ApprovalActionInput,
  DelegationInput,
  WorkflowRuleInput,
  AssignmentInput,
  TaskFilters,
  TaskBulkAction,
  WorkflowTemplateInput
} from '../types/workflow';
import { WorkflowEngineService } from '../services/WorkflowEngineService';
import { WorkflowDefinitionService } from '../services/WorkflowDefinitionService';
import { WorkflowNotificationService } from '../services/WorkflowNotificationService';
import { logger } from '../utils/logger';

// Initialize services
const workflowEngine = new WorkflowEngineService();
const workflowDefinitionService = new WorkflowDefinitionService();
const notificationService = new WorkflowNotificationService();

// ============================================================================
// Validation Schemas
// ============================================================================

const createWorkflowDefinitionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  workflowType: z.nativeEnum(WorkflowType),
  version: z.string().optional(),
  structure: z.object({
    stages: z.array(z.object({
      stageNumber: z.number().int().positive(),
      stageName: z.string().min(1),
      description: z.string().optional(),
      approvalType: z.nativeEnum(ApprovalType),
      minimumApprovals: z.number().int().optional(),
      approvalThreshold: z.number().int().optional(),
      requiredRoles: z.array(z.string()),
      optionalRoles: z.array(z.string()),
      assignmentStrategy: z.nativeEnum(AssignmentStrategy),
      deadlineHours: z.number().int().positive().optional(),
      allowDelegation: z.boolean().default(false),
      allowSkip: z.boolean().default(false),
      requiresSignature: z.boolean().default(false),
      signatureType: z.string().optional()
    })),
    connections: z.array(z.object({
      fromStage: z.number().int(),
      toStage: z.number().int(),
      condition: z.string().optional()
    })),
    metadata: z.object({
      version: z.string(),
      createdAt: z.date(),
      createdBy: z.string(),
      tags: z.array(z.string())
    })
  }),
  isActive: z.boolean().default(true),
  isTemplate: z.boolean().default(false)
});

const updateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  structure: z.object({
    stages: z.array(z.object({
      stageNumber: z.number().int().positive(),
      stageName: z.string().min(1),
      description: z.string().optional(),
      approvalType: z.nativeEnum(ApprovalType),
      minimumApprovals: z.number().int().optional(),
      approvalThreshold: z.number().int().optional(),
      requiredRoles: z.array(z.string()),
      optionalRoles: z.array(z.string()),
      assignmentStrategy: z.nativeEnum(AssignmentStrategy),
      deadlineHours: z.number().int().positive().optional(),
      allowDelegation: z.boolean().default(false),
      allowSkip: z.boolean().default(false),
      requiresSignature: z.boolean().default(false),
      signatureType: z.string().optional()
    })),
    connections: z.array(z.object({
      fromStage: z.number().int(),
      toStage: z.number().int(),
      condition: z.string().optional()
    })),
    metadata: z.object({
      version: z.string(),
      createdAt: z.date(),
      createdBy: z.string(),
      tags: z.array(z.string())
    })
  }).optional()
});

const createWorkflowInstanceSchema = z.object({
  workflowId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  impactLevel: z.nativeEnum(ImpactLevel).optional(),
  contextData: z.record(z.any()).optional(),
  deadline: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
});

const approvalActionSchema = z.object({
  action: z.nativeEnum(ApprovalAction),
  comments: z.string().optional(),
  signatureId: z.string().optional(),
  signatureType: z.string().optional()
});

const delegationSchema = z.object({
  delegateeId: z.string().uuid(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  expiry: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
});

const workflowRuleSchema = z.object({
  ruleName: z.string().min(1),
  description: z.string().optional(),
  conditionField: z.string().min(1),
  conditionOperator: z.nativeEnum(ConditionOperator),
  conditionValue: z.any(),
  actionType: z.nativeEnum(RuleActionType),
  actionConfig: z.record(z.any()),
  priority: z.number().int().default(1),
  isActive: z.boolean().default(true)
});

const assignmentSchema = z.object({
  assignedToId: z.string().uuid(),
  assignedToRole: z.string().optional(),
  assignmentType: z.string(),
  dueDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
});

const taskFiltersSchema = z.object({
  status: z.array(z.nativeEnum(TaskStatus)).optional(),
  priority: z.array(z.nativeEnum(Priority)).optional(),
  entityType: z.array(z.string()).optional(),
  dueDateBefore: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  dueDateAfter: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  overdue: z.boolean().optional(),
  assignedToId: z.string().optional(),
  workflowType: z.array(z.nativeEnum(WorkflowType)).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

const bulkActionSchema = z.object({
  assignmentIds: z.array(z.string().uuid()),
  action: z.nativeEnum(ApprovalAction),
  comments: z.string().optional()
});

const workflowTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workflowType: z.nativeEnum(WorkflowType),
  category: z.string().optional(),
  templateDefinition: z.object({
    stages: z.array(z.object({
      stageNumber: z.number().int().positive(),
      stageName: z.string().min(1),
      description: z.string().optional(),
      approvalType: z.nativeEnum(ApprovalType),
      minimumApprovals: z.number().int().optional(),
      approvalThreshold: z.number().int().optional(),
      requiredRoles: z.array(z.string()),
      optionalRoles: z.array(z.string()),
      assignmentStrategy: z.nativeEnum(AssignmentStrategy),
      deadlineHours: z.number().int().positive().optional(),
      allowDelegation: z.boolean().default(false),
      allowSkip: z.boolean().default(false),
      requiresSignature: z.boolean().default(false),
      signatureType: z.string().optional()
    })),
    connections: z.array(z.object({
      fromStage: z.number().int(),
      toStage: z.number().int(),
      condition: z.string().optional()
    })),
    metadata: z.object({
      version: z.string(),
      createdAt: z.date(),
      createdBy: z.string(),
      tags: z.array(z.string())
    })
  }),
  isActive: z.boolean().default(true)
});

const router = express.Router();

// ============================================================================
// Workflow Definition Routes
// ============================================================================

/**
 * @route   POST /api/v1/workflows/definitions
 * @desc    Create a new workflow definition
 * @access  Private
 */
router.post('/definitions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createWorkflowDefinitionSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workflow = await workflowDefinitionService.createWorkflow(validatedData);

    logger.info('Workflow definition created', {
      userId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowType: workflow.workflowType
    });

    res.status(201).json(workflow);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/definitions
 * @desc    List workflow definitions with filtering
 * @access  Private
 */
router.get('/definitions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      workflowType,
      isActive,
      isTemplate,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      workflowType: workflowType as WorkflowType,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isTemplate: isTemplate === 'true' ? true : isTemplate === 'false' ? false : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const workflows = await workflowDefinitionService.listWorkflows(filters);

    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/definitions/:id
 * @desc    Get workflow definition by ID
 * @access  Private
 */
router.get('/definitions/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const workflow = await workflowDefinitionService.getWorkflowById(id);

    if (!workflow) {
      res.status(404).json({ error: 'Workflow definition not found' });
      return;
    }

    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/workflows/definitions/:id
 * @desc    Update workflow definition
 * @access  Private
 */
router.put('/definitions/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateWorkflowDefinitionSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workflow = await workflowDefinitionService.updateWorkflow(id, validatedData);

    logger.info('Workflow definition updated', {
      userId,
      workflowId: id,
      changes: Object.keys(validatedData)
    });

    res.json(workflow);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/workflows/definitions/:id
 * @desc    Delete workflow definition
 * @access  Private
 */
router.delete('/definitions/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await workflowDefinitionService.deleteWorkflow(id);

    logger.info('Workflow definition deleted', {
      userId,
      workflowId: id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/definitions/:id/version
 * @desc    Create new version of workflow definition
 * @access  Private
 */
router.post('/definitions/:id/version', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { versionNotes } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const newVersion = await workflowDefinitionService.versionWorkflow(id, versionNotes);

    logger.info('Workflow definition versioned', {
      userId,
      originalWorkflowId: id,
      newWorkflowId: newVersion.id,
      version: newVersion.version
    });

    res.status(201).json(newVersion);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/definitions/:id/clone
 * @desc    Clone workflow definition
 * @access  Private
 */
router.post('/definitions/:id/clone', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required for cloned workflow' });
      return;
    }

    const clonedWorkflow = await workflowDefinitionService.cloneWorkflow(id, name, description);

    logger.info('Workflow definition cloned', {
      userId,
      originalWorkflowId: id,
      clonedWorkflowId: clonedWorkflow.id,
      clonedName: name
    });

    res.status(201).json(clonedWorkflow);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Workflow Instance Routes
// ============================================================================

/**
 * @route   POST /api/v1/workflows/instances
 * @desc    Start a new workflow instance
 * @access  Private
 */
router.post('/instances', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createWorkflowInstanceSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const instance = await workflowEngine.startWorkflow({
      ...validatedData,
      createdById: userId
    });

    logger.info('Workflow instance started', {
      userId,
      workflowId: validatedData.workflowId,
      instanceId: instance.id,
      entityType: validatedData.entityType,
      entityId: validatedData.entityId
    });

    res.status(201).json(instance);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances
 * @desc    List workflow instances with filtering
 * @access  Private
 */
router.get('/instances', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      status,
      priority,
      entityType,
      entityId,
      workflowType,
      createdById,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      status: status as WorkflowStatus,
      priority: priority as Priority,
      entityType: entityType as string,
      entityId: entityId as string,
      workflowType: workflowType as WorkflowType,
      createdById: createdById as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const instances = await workflowEngine.listWorkflowInstances(filters);

    res.json(instances);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances/:id
 * @desc    Get workflow instance by ID
 * @access  Private
 */
router.get('/instances/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const instance = await workflowEngine.getWorkflowInstance(id);

    if (!instance) {
      res.status(404).json({ error: 'Workflow instance not found' });
      return;
    }

    res.json(instance);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/instances/:id/advance
 * @desc    Advance workflow to next stage
 * @access  Private
 */
router.post('/instances/:id/advance', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { stageNumber } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const instance = await workflowEngine.advanceToNextStage(id, stageNumber);

    logger.info('Workflow instance advanced', {
      userId,
      instanceId: id,
      newStageNumber: instance.currentStageNumber
    });

    res.json(instance);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/instances/:id/abort
 * @desc    Abort workflow instance
 * @access  Private
 */
router.post('/instances/:id/abort', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Abortion reason is required' });
      return;
    }

    const instance = await workflowEngine.abortWorkflow(id, reason, userId);

    logger.info('Workflow instance aborted', {
      userId,
      instanceId: id,
      reason
    });

    res.json(instance);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/instances/:id/reset
 * @desc    Reset workflow instance to beginning
 * @access  Private
 */
router.post('/instances/:id/reset', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Reset reason is required' });
      return;
    }

    const instance = await workflowEngine.resetWorkflow(id, reason, userId);

    logger.info('Workflow instance reset', {
      userId,
      instanceId: id,
      reason
    });

    res.json(instance);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Workflow Task/Assignment Routes
// ============================================================================

/**
 * @route   GET /api/v1/workflows/tasks
 * @desc    Get approval tasks for current user
 * @access  Private
 */
router.get('/tasks', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const validatedFilters = taskFiltersSchema.parse({
      ...req.query,
      assignedToId: userId
    });

    const tasks = await workflowEngine.getUserTasks(userId, validatedFilters);

    res.json(tasks);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/tasks/:assignmentId/approve
 * @desc    Approve a workflow task
 * @access  Private
 */
router.post('/tasks/:assignmentId/approve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;
    const validatedData = approvalActionSchema.parse({
      ...req.body,
      action: 'APPROVED'
    });

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assignment = await workflowEngine.processApprovalAction({
      assignmentId,
      action: validatedData.action,
      comments: validatedData.comments,
      signatureId: validatedData.signatureId,
      signatureType: validatedData.signatureType
    }, userId);

    logger.info('Workflow task approved', {
      userId,
      assignmentId,
      comments: validatedData.comments
    });

    res.json(assignment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/tasks/:assignmentId/reject
 * @desc    Reject a workflow task
 * @access  Private
 */
router.post('/tasks/:assignmentId/reject', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;
    const validatedData = approvalActionSchema.parse({
      ...req.body,
      action: 'REJECTED'
    });

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!validatedData.comments || validatedData.comments.length < 10) {
      res.status(400).json({ error: 'Rejection comments must be at least 10 characters' });
      return;
    }

    const assignment = await workflowEngine.processApprovalAction({
      assignmentId,
      action: validatedData.action,
      comments: validatedData.comments,
      signatureId: validatedData.signatureId,
      signatureType: validatedData.signatureType
    }, userId);

    logger.info('Workflow task rejected', {
      userId,
      assignmentId,
      comments: validatedData.comments
    });

    res.json(assignment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/tasks/:assignmentId/delegate
 * @desc    Delegate a workflow task
 * @access  Private
 */
router.post('/tasks/:assignmentId/delegate', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;
    const validatedData = delegationSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const assignment = await workflowEngine.delegateAssignment({
      assignmentId,
      delegateeId: validatedData.delegateeId,
      reason: validatedData.reason,
      expiry: validatedData.expiry
    }, userId);

    logger.info('Workflow task delegated', {
      userId,
      assignmentId,
      delegateeId: validatedData.delegateeId,
      reason: validatedData.reason
    });

    res.json(assignment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/tasks/bulk-action
 * @desc    Perform bulk action on multiple tasks
 * @access  Private
 */
router.post('/tasks/bulk-action', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = bulkActionSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (validatedData.action === 'REJECTED' && (!validatedData.comments || validatedData.comments.length < 10)) {
      res.status(400).json({ error: 'Rejection comments must be at least 10 characters for bulk reject' });
      return;
    }

    const results = await workflowEngine.bulkProcessAssignments(validatedData, userId);

    logger.info('Bulk workflow action performed', {
      userId,
      action: validatedData.action,
      assignmentCount: validatedData.assignmentIds.length,
      successCount: results.filter(r => r.success).length
    });

    res.json(results);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// Workflow Analytics Routes
// ============================================================================

/**
 * @route   GET /api/v1/workflows/analytics
 * @desc    Get workflow analytics and metrics
 * @access  Private
 */
router.get('/analytics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      startDate,
      endDate,
      workflowType,
      includeDetails = false
    } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      workflowType: workflowType as WorkflowType,
      includeDetails: includeDetails === 'true'
    };

    const analytics = await workflowEngine.getWorkflowAnalytics(filters);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances/:id/status
 * @desc    Get detailed workflow instance status
 * @access  Private
 */
router.get('/instances/:id/status', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const status = await workflowEngine.getWorkflowStatus(id);

    if (!status) {
      res.status(404).json({ error: 'Workflow instance not found' });
      return;
    }

    res.json(status);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Workflow Template Routes
// ============================================================================

/**
 * @route   GET /api/v1/workflows/templates
 * @desc    List workflow templates
 * @access  Private
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      workflowType,
      category,
      isActive = true,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      workflowType: workflowType as WorkflowType,
      category: category as string,
      isActive: isActive === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const templates = await workflowDefinitionService.listTemplates(filters);

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/templates
 * @desc    Create workflow template
 * @access  Private
 */
router.post('/templates', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = workflowTemplateSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const template = await workflowDefinitionService.createTemplate(validatedData, userId);

    logger.info('Workflow template created', {
      userId,
      templateId: template.id,
      templateName: template.name,
      workflowType: template.workflowType
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/templates/:id
 * @desc    Get workflow template by ID
 * @access  Private
 */
router.get('/templates/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const template = await workflowDefinitionService.getTemplateById(id);

    if (!template) {
      res.status(404).json({ error: 'Workflow template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/templates/:id/instantiate
 * @desc    Create workflow definition from template
 * @access  Private
 */
router.post('/templates/:id/instantiate', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, description, customizations } = req.body;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required for workflow created from template' });
      return;
    }

    const workflow = await workflowDefinitionService.instantiateTemplate(
      id,
      name,
      description,
      customizations,
      userId
    );

    logger.info('Workflow created from template', {
      userId,
      templateId: id,
      workflowId: workflow.id,
      workflowName: name
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Workflow Rule Routes
// ============================================================================

/**
 * @route   POST /api/v1/workflows/definitions/:workflowId/rules
 * @desc    Add rule to workflow definition
 * @access  Private
 */
router.post('/definitions/:workflowId/rules', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;
    const validatedData = workflowRuleSchema.parse(req.body);

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rule = await workflowDefinitionService.addRule(workflowId, validatedData);

    logger.info('Workflow rule added', {
      userId,
      workflowId,
      ruleId: rule.id,
      ruleName: rule.ruleName
    });

    res.status(201).json(rule);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/definitions/:workflowId/rules
 * @desc    List rules for workflow definition
 * @access  Private
 */
router.get('/definitions/:workflowId/rules', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;
    const { isActive } = req.query;

    const filters = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    };

    const rules = await workflowDefinitionService.listRules(workflowId, filters);

    res.json(rules);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ✅ PHASE 6A: Electronic Signature Integration Routes
// ============================================================================

/**
 * @route   POST /api/v1/workflows/assignments/:assignmentId/approve-with-signature
 * @desc    Process approval action with electronic signature
 * @access  Private
 */
router.post('/assignments/:assignmentId/approve-with-signature', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const approvalInput = {
      assignmentId,
      action: req.body.action as 'APPROVED' | 'REJECTED',
      notes: req.body.notes
    };

    const signatureInput = {
      userId,
      password: req.body.password,
      signatureType: req.body.signatureType || 'ELECTRONIC',
      signatureLevel: req.body.signatureLevel || 'BASIC',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      biometricType: req.body.biometricType,
      biometricTemplate: req.body.biometricTemplate,
      biometricScore: req.body.biometricScore,
      certificateId: req.body.certificateId
    };

    await workflowEngineService.processApprovalWithSignature(approvalInput, signatureInput, userId);

    logger.info('Approval with signature processed', {
      assignmentId,
      action: approvalInput.action,
      userId
    });

    res.json({
      success: true,
      message: 'Approval processed successfully with electronic signature'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/assignments/:assignmentId/signature-required
 * @desc    Check if electronic signature is required for assignment
 * @access  Private
 */
router.get('/assignments/:assignmentId/signature-required', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;

    const isRequired = await workflowEngineService.isSignatureRequired(assignmentId);

    res.json({
      assignmentId,
      signatureRequired: isRequired
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/assignments/:assignmentId/signature
 * @desc    Get signature details for workflow assignment
 * @access  Private
 */
router.get('/assignments/:assignmentId/signature', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { assignmentId } = req.params;

    const signature = await workflowEngineService.getAssignmentSignature(assignmentId);

    if (!signature) {
      res.status(404).json({ error: 'No signature found for this assignment' });
      return;
    }

    res.json(signature);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances/:workflowId/signatures
 * @desc    Get all signatures for workflow instance
 * @access  Private
 */
router.get('/instances/:workflowId/signatures', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;

    const signatures = await workflowEngineService.getWorkflowSignatures(workflowId);

    res.json({
      workflowId,
      signatureCount: signatures.length,
      signatures
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/workflows/instances/:workflowId/verify-signatures
 * @desc    Verify all signatures in workflow instance
 * @access  Private
 */
router.post('/instances/:workflowId/verify-signatures', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;

    const verificationResult = await workflowEngineService.verifyWorkflowSignatures(workflowId);

    logger.info('Workflow signature verification completed', {
      workflowId,
      isValid: verificationResult.isValid,
      signatureCount: verificationResult.signatureCount,
      invalidCount: verificationResult.invalidSignatures.length
    });

    res.json({
      workflowId,
      verificationResult
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances/:workflowId/signature-audit-report
 * @desc    Generate comprehensive signature audit report
 * @access  Private
 */
router.get('/instances/:workflowId/signature-audit-report', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;

    const auditReport = await workflowEngineService.generateSignatureAuditReport(workflowId);

    logger.info('Signature audit report generated', {
      workflowId,
      signatureCount: auditReport.signatureSummary.totalSignatures,
      integrityStatus: auditReport.signatureSummary.signatureIntegrityStatus
    });

    res.json({
      workflowId,
      generatedAt: new Date(),
      auditReport
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/workflows/instances/:workflowId/signature-status
 * @desc    Get signature status summary for workflow
 * @access  Private
 */
router.get('/instances/:workflowId/signature-status', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { workflowId } = req.params;

    const signatures = await workflowEngineService.getWorkflowSignatures(workflowId);
    const verificationResult = await workflowEngineService.verifyWorkflowSignatures(workflowId);

    const status = {
      workflowId,
      signatureCount: signatures.length,
      allSignaturesValid: verificationResult.isValid,
      validSignatures: verificationResult.signatureCount - verificationResult.invalidSignatures.length,
      invalidSignatures: verificationResult.invalidSignatures.length,
      integrityStatus: verificationResult.isValid ? 'VERIFIED' : 'COMPROMISED',
      lastSignatureDate: signatures.length > 0
        ? Math.max(...signatures.map(s => new Date(s.signatureTimestamp).getTime()))
        : null
    };

    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;