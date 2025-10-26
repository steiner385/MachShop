/**
 * Parameter Groups Routes
 *
 * REST API endpoints for hierarchical parameter group management including:
 * - Group CRUD operations
 * - Hierarchical tree operations
 * - Group moving and reorganization
 * - Parameter assignment to groups
 * - Group search and filtering
 */

import express, { Request, Response } from 'express';
import { parameterGroupService } from '../services/ParameterGroupService';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('ParameterGroupsRoutes');

// ======================
// GROUP CRUD OPERATIONS
// ======================

/**
 * POST /api/v1/parameter-groups
 * Create a new parameter group
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const group = await parameterGroupService.createGroup(req.body);

    logger.info('Parameter group created', { groupId: group.id });
    return res.status(201).json(group);
  } catch (error: any) {
    logger.error('Error creating parameter group', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/parameter-groups/:id
 * Get a parameter group by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeChildren = req.query.includeChildren === 'true';
    const includeParameters = req.query.includeParameters === 'true';

    const group = await parameterGroupService.getGroup(id, includeChildren, includeParameters);

    if (!group) {
      return res.status(404).json({ error: 'Parameter group not found' });
    }

    return res.json(group);
  } catch (error: any) {
    logger.error('Error fetching parameter group', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/parameter-groups/:id
 * Update a parameter group
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const group = await parameterGroupService.updateGroup(id, req.body);

    logger.info('Parameter group updated', { groupId: id });
    return res.json(group);
  } catch (error: any) {
    logger.error('Error updating parameter group', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/parameter-groups/:id
 * Delete a parameter group
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    await parameterGroupService.deleteGroup(id, force);

    logger.info('Parameter group deleted', { groupId: id, force });
    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting parameter group', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

// ======================
// HIERARCHY OPERATIONS
// ======================

/**
 * GET /api/v1/parameter-groups
 * Get root groups or complete tree
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeTree = req.query.tree === 'true';
    const groupType = req.query.groupType as any;

    if (groupType) {
      const groups = await parameterGroupService.getGroupsByType(groupType);
      return res.json(groups);
    }

    if (includeTree) {
      const tree = await parameterGroupService.getGroupTree();
      return res.json(tree);
    }

    const rootGroups = await parameterGroupService.getRootGroups();
    return res.json(rootGroups);
  } catch (error: any) {
    logger.error('Error fetching parameter groups', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/parameter-groups/:id/move
 * Move a group to a new parent
 * Body: { newParentId: string | null }
 */
router.post('/:id/move', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newParentId } = req.body;

    const group = await parameterGroupService.moveGroup(id, newParentId);

    logger.info('Parameter group moved', { groupId: id, newParentId });
    return res.json(group);
  } catch (error: any) {
    logger.error('Error moving parameter group', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/parameter-groups/:id/parameters
 * Get all parameters in a group
 */
router.get('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recursive = req.query.recursive === 'true';

    const parameters = await parameterGroupService.getGroupParameters(id, recursive);
    return res.json(parameters);
  } catch (error: any) {
    logger.error('Error fetching group parameters', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/parameter-groups/assign
 * Assign a parameter to a group
 * Body: { parameterId: string, groupId: string | null }
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { parameterId, groupId } = req.body;

    if (!parameterId) {
      return res.status(400).json({ error: 'parameterId is required' });
    }

    const parameter = await parameterGroupService.assignParameter(parameterId, groupId);

    logger.info('Parameter assigned to group', { parameterId, groupId });
    return res.json(parameter);
  } catch (error: any) {
    logger.error('Error assigning parameter to group', { error: error.message });
    return res.status(400).json({ error: error.message });
  }
});

// ======================
// SEARCH OPERATIONS
// ======================

/**
 * GET /api/v1/parameter-groups/search
 * Search groups by name, description, or tags
 */
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const groups = await parameterGroupService.searchGroups(query);
    return res.json(groups);
  } catch (error: any) {
    logger.error('Error searching parameter groups', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
