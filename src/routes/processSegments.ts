/**
 * Process Segment Routes
 * ISA-95 Process Segment Model (Task 1.4)
 *
 * REST API endpoints for process segment management
 */

import express, { Request, Response } from 'express';
import ProcessSegmentService from '../services/ProcessSegmentService';

const router = express.Router();

// ======================
// PROCESS SEGMENT CRUD
// ======================

/**
 * POST /api/process-segments
 * Create a new process segment
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const segment = await ProcessSegmentService.createProcessSegment(req.body);
    res.status(201).json(segment);
  } catch (error: any) {
    console.error('Error creating process segment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id
 * Get process segment by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const segment = await ProcessSegmentService.getProcessSegmentById(id, includeRelations);
    res.json(segment);
  } catch (error: any) {
    console.error('Error fetching process segment:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/code/:segmentCode
 * Get process segment by code
 */
router.get('/code/:segmentCode', async (req: Request, res: Response) => {
  try {
    const { segmentCode } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const segment = await ProcessSegmentService.getProcessSegmentByCode(segmentCode, includeRelations);
    res.json(segment);
  } catch (error: any) {
    console.error('Error fetching process segment by code:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments
 * Get all process segments with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.segmentType) {
      filters.segmentType = req.query.segmentType as string;
    }

    if (req.query.category) {
      filters.category = req.query.category as string;
    }

    if (req.query.level) {
      filters.level = parseInt(req.query.level as string);
    }

    if (req.query.parentSegmentId !== undefined) {
      filters.parentSegmentId = req.query.parentSegmentId === 'null'
        ? 'null'
        : req.query.parentSegmentId as string;
    }

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    const includeRelations = req.query.includeRelations === 'true';

    const segments = await ProcessSegmentService.getAllProcessSegments(filters, includeRelations);
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching process segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/process-segments/:id
 * Update process segment
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await ProcessSegmentService.updateProcessSegment(id, req.body);
    res.json(segment);
  } catch (error: any) {
    console.error('Error updating process segment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/process-segments/:id
 * Delete process segment (soft delete by default)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hardDelete === 'true';

    const result = await ProcessSegmentService.deleteProcessSegment(id, hardDelete);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting process segment:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// HIERARCHY ENDPOINTS
// ======================

/**
 * GET /api/process-segments/:id/children
 * Get child segments of a process segment
 */
router.get('/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const children = await ProcessSegmentService.getChildSegments(id);
    res.json(children);
  } catch (error: any) {
    console.error('Error fetching child segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/hierarchy/roots
 * Get root segments (top-level, no parent)
 */
router.get('/hierarchy/roots', async (req: Request, res: Response) => {
  try {
    const roots = await ProcessSegmentService.getRootSegments();
    res.json(roots);
  } catch (error: any) {
    console.error('Error fetching root segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/hierarchy-tree
 * Get full hierarchy tree starting from a segment
 */
router.get('/:id/hierarchy-tree', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tree = await ProcessSegmentService.getSegmentHierarchyTree(id);
    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/ancestors
 * Get ancestor chain (path to root)
 */
router.get('/:id/ancestors', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ancestors = await ProcessSegmentService.getAncestorChain(id);
    res.json(ancestors);
  } catch (error: any) {
    console.error('Error fetching ancestor chain:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// PARAMETER ENDPOINTS
// ======================

/**
 * POST /api/process-segments/:id/parameters
 * Add parameter to segment
 */
router.post('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parameter = await ProcessSegmentService.addParameter(id, req.body);
    res.status(201).json(parameter);
  } catch (error: any) {
    console.error('Error adding parameter:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/parameters
 * Get all parameters for a segment
 */
router.get('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parameters = await ProcessSegmentService.getSegmentParameters(id);
    res.json(parameters);
  } catch (error: any) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/process-segments/parameters/:parameterId
 * Update parameter
 */
router.put('/parameters/:parameterId', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const parameter = await ProcessSegmentService.updateParameter(parameterId, req.body);
    res.json(parameter);
  } catch (error: any) {
    console.error('Error updating parameter:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/process-segments/parameters/:parameterId
 * Delete parameter
 */
router.delete('/parameters/:parameterId', async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const result = await ProcessSegmentService.deleteParameter(parameterId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting parameter:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// DEPENDENCY ENDPOINTS
// ======================

/**
 * POST /api/process-segments/dependencies
 * Add dependency between segments
 */
router.post('/dependencies', async (req: Request, res: Response) => {
  try {
    const dependency = await ProcessSegmentService.addDependency(req.body);
    res.status(201).json(dependency);
  } catch (error: any) {
    console.error('Error adding dependency:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/dependencies
 * Get all dependencies for a segment
 */
router.get('/:id/dependencies', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dependencies = await ProcessSegmentService.getSegmentDependencies(id);
    res.json(dependencies);
  } catch (error: any) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/process-segments/dependencies/:dependencyId
 * Delete dependency
 */
router.delete('/dependencies/:dependencyId', async (req: Request, res: Response) => {
  try {
    const { dependencyId } = req.params;
    const result = await ProcessSegmentService.deleteDependency(dependencyId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting dependency:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// RESOURCE SPECIFICATION ENDPOINTS
// ======================

/**
 * POST /api/process-segments/:id/personnel-specs
 * Add personnel specification to segment
 */
router.post('/:id/personnel-specs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spec = await ProcessSegmentService.addPersonnelSpec(id, req.body);
    res.status(201).json(spec);
  } catch (error: any) {
    console.error('Error adding personnel spec:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/process-segments/:id/equipment-specs
 * Add equipment specification to segment
 */
router.post('/:id/equipment-specs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spec = await ProcessSegmentService.addEquipmentSpec(id, req.body);
    res.status(201).json(spec);
  } catch (error: any) {
    console.error('Error adding equipment spec:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/process-segments/:id/material-specs
 * Add material specification to segment
 */
router.post('/:id/material-specs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spec = await ProcessSegmentService.addMaterialSpec(id, req.body);
    res.status(201).json(spec);
  } catch (error: any) {
    console.error('Error adding material spec:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/process-segments/:id/asset-specs
 * Add physical asset specification to segment
 */
router.post('/:id/asset-specs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spec = await ProcessSegmentService.addPhysicalAssetSpec(id, req.body);
    res.status(201).json(spec);
  } catch (error: any) {
    console.error('Error adding asset spec:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/resource-specs
 * Get all resource specifications for a segment
 */
router.get('/:id/resource-specs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const specs = await ProcessSegmentService.getSegmentResourceSpecs(id);
    res.json(specs);
  } catch (error: any) {
    console.error('Error fetching resource specs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// STATISTICS & REPORTING ENDPOINTS
// ======================

/**
 * GET /api/process-segments/statistics/overview
 * Get process segment statistics
 */
router.get('/statistics/overview', async (req: Request, res: Response) => {
  try {
    const stats = await ProcessSegmentService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/total-time
 * Get total estimated time for a segment (including all children)
 */
router.get('/:id/total-time', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const totalTime = await ProcessSegmentService.getSegmentTotalTime(id);
    res.json({ segmentId: id, totalTimeSeconds: totalTime });
  } catch (error: any) {
    console.error('Error calculating total time:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
