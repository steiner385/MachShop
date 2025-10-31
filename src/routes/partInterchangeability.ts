import express from 'express';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { PartInterchangeabilityService } from '../services/PartInterchangeabilityService';

const router = express.Router();

// ========================================
// INTERCHANGEABILITY GROUP ROUTES
// ========================================

/**
 * @route GET /api/v1/part-interchangeability/groups
 * @desc Get all interchangeability groups with optional filtering
 * @access Private
 */
router.get('/groups',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      type,
      status,
      search,
      page = '1',
      limit = '50',
      includeMembers = 'false',
      includeApprovals = 'false'
    } = req.query;

    const options = {
      type: type as string,
      status: status as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      includeMembers: includeMembers === 'true',
      includeApprovals: includeApprovals === 'true'
    };

    const result = await PartInterchangeabilityService.getInstance().searchInterchangeabilityGroups(options);
    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/groups/:id
 * @desc Get interchangeability group by ID
 * @access Private
 */
router.get('/groups/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Interchangeability group ID is required'
      });
    }

    const group = await PartInterchangeabilityService.getInstance().getInterchangeabilityGroupById(id);

    if (!group) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Interchangeability group with ID ${id} not found`
      });
    }

    return res.status(200).json(group);
  })
);

/**
 * @route POST /api/v1/part-interchangeability/groups
 * @desc Create a new interchangeability group
 * @access Private
 */
router.post('/groups',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      type,
      configurationControl,
      effectiveDate,
      expirationDate,
      restrictionConditions,
      createdBy
    } = req.body;

    // Validate required fields
    if (!name || !type || !configurationControl || !createdBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name, type, configurationControl, and createdBy are required'
      });
    }

    const groupData = {
      name,
      description,
      type,
      configurationControl,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      restrictionConditions,
      createdBy
    };

    const group = await PartInterchangeabilityService.getInstance().createInterchangeabilityGroup(groupData);
    return res.status(201).json(group);
  })
);

/**
 * @route PUT /api/v1/part-interchangeability/groups/:id
 * @desc Update an interchangeability group
 * @access Private
 */
router.put('/groups/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      configurationControl,
      effectiveDate,
      expirationDate,
      restrictionConditions,
      status,
      updatedBy
    } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Interchangeability group ID is required'
      });
    }

    if (!updatedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'updatedBy is required'
      });
    }

    const updateData = {
      name,
      description,
      configurationControl,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      restrictionConditions,
      status,
      updatedBy
    };

    const group = await PartInterchangeabilityService.getInstance().updateInterchangeabilityGroup(id, updateData);

    if (!group) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Interchangeability group with ID ${id} not found`
      });
    }

    return res.status(200).json(group);
  })
);

/**
 * @route DELETE /api/v1/part-interchangeability/groups/:id
 * @desc Delete an interchangeability group
 * @access Private
 */
router.delete('/groups/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deletedBy } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Interchangeability group ID is required'
      });
    }

    if (!deletedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'deletedBy is required'
      });
    }

    const result = await PartInterchangeabilityService.getInstance().deleteInterchangeabilityGroup(id, deletedBy);

    if (!result) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Interchangeability group with ID ${id} not found`
      });
    }

    return res.status(204).send();
  })
);

/**
 * @route POST /api/v1/part-interchangeability/groups/:id/members
 * @desc Add a part to an interchangeability group
 * @access Private
 */
router.post('/groups/:id/members',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id: groupId } = req.params;
    const { partId, addedBy } = req.body;

    if (!groupId || groupId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Interchangeability group ID is required'
      });
    }

    if (!partId || !addedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'partId and addedBy are required'
      });
    }

    const result = await PartInterchangeabilityService.getInstance().addPartToGroup(groupId, partId, addedBy);
    return res.status(201).json(result);
  })
);

/**
 * @route DELETE /api/v1/part-interchangeability/groups/:groupId/members/:partId
 * @desc Remove a part from an interchangeability group
 * @access Private
 */
router.delete('/groups/:groupId/members/:partId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { groupId, partId } = req.params;
    const { removedBy } = req.body;

    if (!groupId || groupId.trim() === '' || !partId || partId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Group ID and part ID are required'
      });
    }

    if (!removedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'removedBy is required'
      });
    }

    const result = await PartInterchangeabilityService.getInstance().removePartFromGroup(groupId, partId, removedBy);

    if (!result) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Part ${partId} not found in group ${groupId}`
      });
    }

    return res.status(204).send();
  })
);

// ========================================
// PART SUBSTITUTION ROUTES
// ========================================

/**
 * @route GET /api/v1/part-interchangeability/substitutions
 * @desc Get all part substitutions with optional filtering
 * @access Private
 */
router.get('/substitutions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      fromPartId,
      toPartId,
      groupId,
      type,
      direction,
      status,
      page = '1',
      limit = '50',
      includeApprovals = 'false'
    } = req.query;

    const options = {
      fromPartId: fromPartId as string,
      toPartId: toPartId as string,
      groupId: groupId as string,
      type: type as string,
      direction: direction as string,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      includeApprovals: includeApprovals === 'true'
    };

    const result = await PartInterchangeabilityService.getInstance().searchPartSubstitutions(options);
    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/substitutions/:id
 * @desc Get part substitution by ID
 * @access Private
 */
router.get('/substitutions/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part substitution ID is required'
      });
    }

    const substitution = await PartInterchangeabilityService.getInstance().getPartSubstitutionById(id);

    if (!substitution) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Part substitution with ID ${id} not found`
      });
    }

    return res.status(200).json(substitution);
  })
);

/**
 * @route POST /api/v1/part-interchangeability/substitutions
 * @desc Create a new part substitution
 * @access Private
 */
router.post('/substitutions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      fromPartId,
      toPartId,
      groupId,
      type,
      direction,
      quantityRatio,
      priority,
      effectiveDate,
      expirationDate,
      conditions,
      requiresApproval,
      createdBy
    } = req.body;

    // Validate required fields
    if (!fromPartId || !toPartId || !groupId || !type || !direction || !createdBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'fromPartId, toPartId, groupId, type, direction, and createdBy are required'
      });
    }

    const substitutionData = {
      fromPartId,
      toPartId,
      groupId,
      type,
      direction,
      quantityRatio: quantityRatio || 1.0,
      priority: priority || 1,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      conditions,
      requiresApproval: requiresApproval || false,
      createdBy
    };

    const substitution = await PartInterchangeabilityService.getInstance().createPartSubstitution(substitutionData);
    return res.status(201).json(substitution);
  })
);

/**
 * @route PUT /api/v1/part-interchangeability/substitutions/:id
 * @desc Update a part substitution
 * @access Private
 */
router.put('/substitutions/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      quantityRatio,
      priority,
      effectiveDate,
      expirationDate,
      conditions,
      requiresApproval,
      status,
      updatedBy
    } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part substitution ID is required'
      });
    }

    if (!updatedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'updatedBy is required'
      });
    }

    const updateData = {
      quantityRatio,
      priority,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      conditions,
      requiresApproval,
      status,
      updatedBy
    };

    const substitution = await PartInterchangeabilityService.getInstance().updatePartSubstitution(id, updateData);

    if (!substitution) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Part substitution with ID ${id} not found`
      });
    }

    return res.status(200).json(substitution);
  })
);

/**
 * @route DELETE /api/v1/part-interchangeability/substitutions/:id
 * @desc Delete a part substitution
 * @access Private
 */
router.delete('/substitutions/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deletedBy } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part substitution ID is required'
      });
    }

    if (!deletedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'deletedBy is required'
      });
    }

    const result = await PartInterchangeabilityService.getInstance().deletePartSubstitution(id, deletedBy);

    if (!result) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Part substitution with ID ${id} not found`
      });
    }

    return res.status(204).send();
  })
);

// ========================================
// VALIDATION ROUTES
// ========================================

/**
 * @route POST /api/v1/part-interchangeability/validate
 * @desc Validate if a part substitution is allowed
 * @access Private
 */
router.post('/validate',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { fromPartId, toPartId, workOrderId, operationId, quantity } = req.body;

    if (!fromPartId || !toPartId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'fromPartId and toPartId are required'
      });
    }

    const validation = await PartInterchangeabilityService.getInstance().validateSubstitution(
      fromPartId,
      toPartId,
      workOrderId,
      operationId,
      quantity
    );

    return res.status(200).json(validation);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/parts/:partId/substitutes
 * @desc Get all available substitutes for a part
 * @access Private
 */
router.get('/parts/:partId/substitutes',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;
    const { workOrderId, operationId, quantity } = req.query;

    if (!partId || partId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const substitutes = await PartInterchangeabilityService.getInstance().getAvailableSubstitutes(
      partId,
      workOrderId as string,
      operationId as string,
      quantity ? parseFloat(quantity as string) : undefined
    );

    return res.status(200).json(substitutes);
  })
);

// ========================================
// APPROVAL ROUTES
// ========================================

/**
 * @route GET /api/v1/part-interchangeability/approvals
 * @desc Get all interchangeability approvals with optional filtering
 * @access Private
 */
router.get('/approvals',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      type,
      status,
      approverId,
      page = '1',
      limit = '50'
    } = req.query;

    const options = {
      type: type as string,
      status: status as string,
      approverId: approverId as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await PartInterchangeabilityService.getInstance().searchApprovals(options);
    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/approvals/:id
 * @desc Get approval by ID
 * @access Private
 */
router.get('/approvals/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Approval ID is required'
      });
    }

    const approval = await PartInterchangeabilityService.getInstance().getApprovalById(id);

    if (!approval) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Approval with ID ${id} not found`
      });
    }

    return res.status(200).json(approval);
  })
);

/**
 * @route POST /api/v1/part-interchangeability/approvals
 * @desc Create a new approval request
 * @access Private
 */
router.post('/approvals',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      type,
      entityId,
      requestedBy,
      approverId,
      requestReason,
      priority,
      effectiveDate,
      expirationDate
    } = req.body;

    if (!type || !entityId || !requestedBy || !approverId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'type, entityId, requestedBy, and approverId are required'
      });
    }

    const approvalData = {
      type,
      entityId,
      requestedBy,
      approverId,
      requestReason,
      priority: priority || 'MEDIUM',
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined
    };

    const approval = await PartInterchangeabilityService.getInstance().createApproval(approvalData);
    return res.status(201).json(approval);
  })
);

/**
 * @route POST /api/v1/part-interchangeability/approvals/:id/process
 * @desc Process an approval (approve/reject)
 * @access Private
 */
router.post('/approvals/:id/process',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comments, processedBy } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Approval ID is required'
      });
    }

    if (!decision || !processedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'decision and processedBy are required'
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'decision must be either APPROVED or REJECTED'
      });
    }

    const approval = await PartInterchangeabilityService.getInstance().processApproval(
      id,
      decision,
      processedBy,
      comments
    );

    if (!approval) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Approval with ID ${id} not found`
      });
    }

    return res.status(200).json(approval);
  })
);

// ========================================
// WORK ORDER INTEGRATION ROUTES
// ========================================

/**
 * @route POST /api/v1/part-interchangeability/work-orders/:workOrderId/substitutions
 * @desc Log a part substitution used in work order execution
 * @access Private
 */
router.post('/work-orders/:workOrderId/substitutions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { workOrderId } = req.params;
    const {
      operationId,
      fromPartId,
      toPartId,
      quantitySubstituted,
      reason,
      authorizedBy,
      approvalId
    } = req.body;

    if (!workOrderId || workOrderId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Work order ID is required'
      });
    }

    if (!operationId || !fromPartId || !toPartId || !quantitySubstituted || !authorizedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'operationId, fromPartId, toPartId, quantitySubstituted, and authorizedBy are required'
      });
    }

    const substitutionData = {
      workOrderId,
      operationId,
      fromPartId,
      toPartId,
      quantitySubstituted,
      reason,
      authorizedBy,
      approvalId
    };

    const substitution = await PartInterchangeabilityService.getInstance().logWorkOrderSubstitution(substitutionData);
    return res.status(201).json(substitution);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/work-orders/:workOrderId/substitutions
 * @desc Get all substitutions used in a work order
 * @access Private
 */
router.get('/work-orders/:workOrderId/substitutions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { workOrderId } = req.params;

    if (!workOrderId || workOrderId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Work order ID is required'
      });
    }

    const substitutions = await PartInterchangeabilityService.getInstance().getWorkOrderSubstitutions(workOrderId);
    return res.status(200).json(substitutions);
  })
);

// ========================================
// AUDIT AND REPORTING ROUTES
// ========================================

/**
 * @route GET /api/v1/part-interchangeability/audit-logs
 * @desc Get audit logs for interchangeability operations
 * @access Private
 */
router.get('/audit-logs',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const options = {
      entityType: entityType as string,
      entityId: entityId as string,
      action: action as string,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await PartInterchangeabilityService.getInstance().getAuditLogs(options);
    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/part-interchangeability/parts/:partId/usage-history
 * @desc Get usage history for a part across work orders
 * @access Private
 */
router.get('/parts/:partId/usage-history',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;
    const { startDate, endDate, includeSubstitutions = 'true' } = req.query;

    if (!partId || partId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const options = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      includeSubstitutions: includeSubstitutions === 'true'
    };

    const history = await PartInterchangeabilityService.getInstance().getPartUsageHistory(partId, options);
    return res.status(200).json(history);
  })
);

export default router;