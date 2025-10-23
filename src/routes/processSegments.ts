/**
 * Process Segment Routes
 * ISA-95 Process Segment Model (Task 1.4)
 *
 * REST API endpoints for process segment management
 */

import express, { Request, Response } from 'express';
import OperationService from '../services/OperationService';

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
    const segment = await OperationService.createOperation(req.body);
    res.status(201).json(segment);
  } catch (error: any) {
    console.error('Error creating process segment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments
 * Get all process segments with optional filters
 * NOTE: Must come BEFORE /:id route to avoid being shadowed
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

    const segments = await OperationService.getAllOperations(filters, includeRelations);
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching process segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/code/:segmentCode
 * Get process segment by code
 * NOTE: Must come BEFORE /:id route to match /code/... correctly
 */
router.get('/code/:segmentCode', async (req: Request, res: Response) => {
  try {
    const { segmentCode } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const segment = await OperationService.getOperationByCode(segmentCode, includeRelations);
    res.json(segment);
  } catch (error: any) {
    console.error('Error fetching process segment by code:', error);
    res.status(404).json({ error: error.message });
  }
});

// ======================
// ORACLE TERMINOLOGY ENDPOINTS
// NOTE: Must come BEFORE /:id route to avoid shadowing
// ======================

/**
 * GET /api/process-segments/by-code/:operationCode
 * Get process segment by operation code (Oracle ERP / Teamcenter PLM terminology)
 * Searches both operationCode and segmentCode fields
 * NOTE: Must come BEFORE /:id route
 */
router.get('/by-code/:operationCode', async (req: Request, res: Response) => {
  try {
    const { operationCode } = req.params;
    const segment = await OperationService.getOperationByCode(operationCode);
    res.json(segment);
  } catch (error: any) {
    console.error('Error fetching operation by code:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/by-classification/:classification
 * Get process segments by operation classification (Oracle ERP terminology)
 * Classification: MAKE, ASSEMBLY, INSPECTION, TEST, REWORK, SETUP, SUBCONTRACT, PACKING
 * NOTE: Must come BEFORE /:id route
 */
router.get('/by-classification/:classification', async (req: Request, res: Response) => {
  try {
    const { classification } = req.params;
    const segments = await OperationService.getOperationsByClassification(classification);
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching operations by classification:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/search
 * Search process segments across both ISA-95 and Oracle/Teamcenter terminology
 * Query parameter: q (search term)
 * Searches: segmentCode, segmentName, operationCode, operationName, description
 * NOTE: Must come BEFORE /:id route
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      res.status(400).json({ error: 'Search query parameter "q" is required' });
      return;
    }

    const segments = await OperationService.searchOperations(searchTerm);
    res.json(segments);
  } catch (error: any) {
    console.error('Error searching operations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// HIERARCHY ENDPOINTS
// NOTE: Specific routes like /hierarchy/roots MUST come before /:id
// ======================

/**
 * GET /api/process-segments/hierarchy/roots
 * Get root segments (top-level, no parent)
 * NOTE: Must come BEFORE /:id route to match /hierarchy/roots correctly
 */
router.get('/hierarchy/roots', async (req: Request, res: Response) => {
  try {
    const roots = await OperationService.getRootOperations();
    res.json(roots);
  } catch (error: any) {
    console.error('Error fetching root segments:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// STATISTICS & REPORTING ENDPOINTS
// NOTE: /statistics/overview MUST come before /:id
// ======================

/**
 * GET /api/process-segments/statistics/overview
 * Get process segment statistics
 * NOTE: Must come BEFORE /:id route to match /statistics/overview correctly
 */
router.get('/statistics/overview', async (req: Request, res: Response) => {
  try {
    const stats = await OperationService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// GENERIC ID-BASED ROUTES
// NOTE: These MUST come after all specific routes to avoid shadowing
// ======================

/**
 * GET /api/process-segments/:id
 * Get process segment by ID
 * NOTE: Must come AFTER all specific routes like /code/:code, /hierarchy/roots, /statistics/overview
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const segment = await OperationService.getOperationById(id, includeRelations);
    res.json(segment);
  } catch (error: any) {
    console.error('Error fetching process segment:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/process-segments/:id
 * Update process segment
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await OperationService.updateOperation(id, req.body);
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

    const result = await OperationService.deleteOperation(id, hardDelete);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting process segment:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/hierarchy-tree
 * Get full hierarchy tree starting from a segment
 */
router.get('/:id/hierarchy-tree', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tree = await OperationService.getOperationHierarchyTree(id);
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
    const ancestors = await OperationService.getAncestorChain(id);
    res.json(ancestors);
  } catch (error: any) {
    console.error('Error fetching ancestor chain:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/children
 * Get child segments of a process segment
 */
router.get('/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const children = await OperationService.getChildOperations(id);
    res.json(children);
  } catch (error: any) {
    console.error('Error fetching child segments:', error);
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
    const parameter = await OperationService.addParameter(id, req.body);
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
    const parameters = await OperationService.getOperationParameters(id);
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
    const parameter = await OperationService.updateParameter(parameterId, req.body);
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
    const result = await OperationService.deleteParameter(parameterId);
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
    const dependency = await OperationService.addDependency(req.body);
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
    const dependencies = await OperationService.getOperationDependencies(id);
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
    const result = await OperationService.deleteDependency(dependencyId);
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
    const spec = await OperationService.addPersonnelSpec(id, req.body);
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
    const spec = await OperationService.addEquipmentSpec(id, req.body);
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
    const spec = await OperationService.addMaterialSpec(id, req.body);
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
    const spec = await OperationService.addPhysicalAssetSpec(id, req.body);
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
    const specs = await OperationService.getOperationResourceSpecs(id);
    res.json(specs);
  } catch (error: any) {
    console.error('Error fetching resource specs:', error);
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
    const totalTime = await OperationService.getOperationTotalTime(id);
    res.json({ segmentId: id, totalTimeSeconds: totalTime });
  } catch (error: any) {
    console.error('Error calculating total time:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// ORACLE TERMINOLOGY UPDATE ENDPOINTS
// ======================

/**
 * PUT /api/process-segments/:id/terminology
 * Update Oracle/Teamcenter PLM terminology fields for a process segment
 * Body: { operationCode?, operationName?, operationClassification? }
 */
router.put('/:id/terminology', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await OperationService.updateOperationTerminology(id, req.body);
    res.json(segment);
  } catch (error: any) {
    console.error('Error updating operation terminology:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// WORK INSTRUCTION LINKAGE ENDPOINTS
// ======================

/**
 * POST /api/process-segments/:id/work-instruction
 * Assign standard work instruction to a process segment
 * Body: { workInstructionId: string }
 */
router.post('/:id/work-instruction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { workInstructionId } = req.body;

    if (!workInstructionId) {
      res.status(400).json({ error: 'workInstructionId is required' });
      return;
    }

    const segment = await OperationService.assignStandardWorkInstruction(id, workInstructionId);
    res.json(segment);
  } catch (error: any) {
    console.error('Error assigning standard work instruction:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/process-segments/:id/work-instruction
 * Get the standard work instruction for a process segment
 */
router.get('/:id/work-instruction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const workInstruction = await OperationService.getStandardWorkInstruction(id);

    if (!workInstruction) {
      res.status(404).json({ error: 'No standard work instruction assigned to this process segment' });
      return;
    }

    res.json(workInstruction);
  } catch (error: any) {
    console.error('Error fetching standard work instruction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/process-segments/:id/work-instruction
 * Remove standard work instruction from a process segment
 */
router.delete('/:id/work-instruction', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await OperationService.removeStandardWorkInstruction(id);
    res.json(segment);
  } catch (error: any) {
    console.error('Error removing standard work instruction:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
