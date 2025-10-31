/**
 * Product Routes (ISA-95 Product Definition Model - Task 1.5)
 *
 * REST API endpoints for product/part management including:
 * - Part CRUD operations
 * - Product specifications
 * - Product configurations and variants
 * - Product lifecycle management
 * - BOM (Bill of Materials) operations
 */

import express, { Request, Response } from 'express';
import ProductService from '../services/ProductService';

const router = express.Router();

// ======================
// PART CRUD OPERATIONS
// ======================

/**
 * POST /api/v1/products
 * Create a new part/product
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const part = await ProductService.createPart(req.body);
    res.status(201).json(part);
  } catch (error: any) {
    console.error('Error creating part:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id
 * Get part by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const includeRelations = req.query.includeRelations !== 'false';

    const part = await ProductService.getPartById(id, includeRelations);
    res.json(part);
  } catch (error: any) {
    console.error('Error fetching part:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/part-number/:partNumber
 * Get part by part number
 */
router.get('/part-number/:partNumber', async (req: Request, res: Response) => {
  try {
    const { partNumber } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const part = await ProductService.getPartByPartNumber(partNumber, includeRelations);
    res.json(part);
  } catch (error: any) {
    console.error('Error fetching part by part number:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/uuid/:persistentUuid
 * Get part by persistent UUID (MBE traceability)
 */
router.get('/uuid/:persistentUuid', async (req: Request, res: Response) => {
  try {
    const { persistentUuid } = req.params;

    // Validate UUID format
    if (!persistentUuid || persistentUuid.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Persistent UUID is required'
      });
    }

    // Import UUID utilities
    const { isValidPersistentUUID } = await import('../utils/uuidUtils');

    if (!isValidPersistentUUID(persistentUuid)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid UUID format - must be a valid UUID v4 for MBE compliance'
      });
    }

    const includeRelations = req.query.includeRelations !== 'false';
    const part = await ProductService.getPartByPersistentUuid(persistentUuid, includeRelations);
    res.json(part);
  } catch (error: any) {
    console.error('Error fetching part by persistent UUID:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * GET /api/v1/products
 * Get all parts with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.partType) {
      filters.partType = req.query.partType as string;
    }

    if (req.query.productType) {
      filters.productType = req.query.productType as string;
    }

    if (req.query.lifecycleState) {
      filters.lifecycleState = req.query.lifecycleState as string;
    }

    if (req.query.makeOrBuy) {
      filters.makeOrBuy = req.query.makeOrBuy as string;
    }

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.isConfigurable !== undefined) {
      filters.isConfigurable = req.query.isConfigurable === 'true';
    }

    const includeRelations = req.query.includeRelations === 'true';

    const parts = await ProductService.getAllParts(filters, includeRelations);
    res.json(parts);
  } catch (error: any) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/products/:id
 * Update part
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const part = await ProductService.updatePart(id, req.body);
    res.json(part);
  } catch (error: any) {
    console.error('Error updating part:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/products/:id
 * Delete part (soft delete by default)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const hardDelete = req.query.hardDelete === 'true';

    const result = await ProductService.deletePart(id, hardDelete);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting part:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// SPECIFICATION ENDPOINTS
// ======================

/**
 * POST /api/v1/products/:id/specifications
 * Add specification to part
 */
router.post('/:id/specifications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const spec = await ProductService.addSpecification(id, req.body);
    res.status(201).json(spec);
  } catch (error: any) {
    console.error('Error adding specification:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id/specifications
 * Get all specifications for a part
 */
router.get('/:id/specifications', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const specs = await ProductService.getPartSpecifications(id);
    res.json(specs);
  } catch (error: any) {
    console.error('Error fetching specifications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/products/specifications/:specificationId
 * Update specification
 */
router.put('/specifications/:specificationId', async (req: Request, res: Response) => {
  try {
    const { specificationId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!specificationId || specificationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Specification ID is required'
      });
    }

    const spec = await ProductService.updateSpecification(specificationId, req.body);
    res.json(spec);
  } catch (error: any) {
    console.error('Error updating specification:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/products/specifications/:specificationId
 * Delete specification
 */
router.delete('/specifications/:specificationId', async (req: Request, res: Response) => {
  try {
    const { specificationId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!specificationId || specificationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Specification ID is required'
      });
    }

    const result = await ProductService.deleteSpecification(specificationId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting specification:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// CONFIGURATION ENDPOINTS
// ======================

/**
 * POST /api/v1/products/configurations/:configurationId/options
 * Add option to configuration
 * ✅ PHASE 9A FIX: Moved before /:id/configurations to prevent route conflict
 */
router.post('/configurations/:configurationId/options', async (req: Request, res: Response) => {
  try {
    const { configurationId } = req.params;

    // ✅ PHASE 8D FIX: Validate required parameter using comprehensive validation
    if (!configurationId || configurationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Configuration ID is required'
      });
    }

    const option = await ProductService.addConfigurationOption(configurationId, req.body);
    res.status(201).json(option);
  } catch (error: any) {
    console.error('Error adding configuration option:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/products/configurations/:configurationId
 * Update configuration
 * ✅ PHASE 9A FIX: Moved before /:id/configurations to prevent route conflict
 */
router.put('/configurations/:configurationId', async (req: Request, res: Response) => {
  try {
    const { configurationId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!configurationId || configurationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Configuration ID is required'
      });
    }

    const config = await ProductService.updateConfiguration(configurationId, req.body);
    res.json(config);
  } catch (error: any) {
    console.error('Error updating configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/products/configurations/:configurationId
 * Delete configuration
 * ✅ PHASE 9A FIX: Moved before /:id/configurations to prevent route conflict
 */
router.delete('/configurations/:configurationId', async (req: Request, res: Response) => {
  try {
    const { configurationId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!configurationId || configurationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Configuration ID is required'
      });
    }

    const result = await ProductService.deleteConfiguration(configurationId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/products/:id/configurations
 * Add configuration to part
 */
router.post('/:id/configurations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const config = await ProductService.addConfiguration(id, req.body);
    res.status(201).json(config);
  } catch (error: any) {
    console.error('Error adding configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id/configurations
 * Get all configurations for a part
 */
router.get('/:id/configurations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const configs = await ProductService.getPartConfigurations(id);
    res.json(configs);
  } catch (error: any) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/products/configurations/:configurationId
 * Update configuration
 */
router.put('/configurations/:configurationId', async (req: Request, res: Response) => {
  try {
    const { configurationId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!configurationId || configurationId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Configuration ID is required'
      });
    }

    const config = await ProductService.updateConfiguration(configurationId, req.body);
    res.json(config);
  } catch (error: any) {
    console.error('Error updating configuration:', error);
    res.status(400).json({ error: error.message });
  }
});

// ✅ PHASE 9A FIX: Removed duplicate routes - now properly ordered above

/**
 * PUT /api/v1/products/options/:optionId
 * Update configuration option
 */
router.put('/options/:optionId', async (req: Request, res: Response) => {
  try {
    const { optionId } = req.params;

    // ✅ PHASE 8D FIX: Validate required parameter using comprehensive validation
    if (!optionId || optionId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Option ID is required'
      });
    }

    const option = await ProductService.updateConfigurationOption(optionId, req.body);
    res.json(option);
  } catch (error: any) {
    console.error('Error updating configuration option:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/products/options/:optionId
 * Delete configuration option
 */
router.delete('/options/:optionId', async (req: Request, res: Response) => {
  try {
    const { optionId } = req.params;

    // ✅ PHASE 8D FIX: Validate required parameter using comprehensive validation
    if (!optionId || optionId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Option ID is required'
      });
    }

    const result = await ProductService.deleteConfigurationOption(optionId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting configuration option:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// LIFECYCLE ENDPOINTS
// ======================

/**
 * POST /api/v1/products/:id/lifecycle/transition
 * Transition part to new lifecycle state
 */
router.post('/:id/lifecycle/transition', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const lifecycleRecord = await ProductService.transitionLifecycleState(id, req.body);
    res.status(201).json(lifecycleRecord);
  } catch (error: any) {
    console.error('Error transitioning lifecycle state:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id/lifecycle/history
 * Get lifecycle history for a part
 */
router.get('/:id/lifecycle/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const history = await ProductService.getPartLifecycleHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching lifecycle history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// BOM ENDPOINTS
// ======================

/**
 * POST /api/v1/products/:id/bom
 * Add BOM item to part
 */
router.post('/:id/bom', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const bomItem = await ProductService.addBOMItem({
      parentPartId: id,
      ...req.body,
    });
    res.status(201).json(bomItem);
  } catch (error: any) {
    console.error('Error adding BOM item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id/bom
 * Get BOM for a part (all components)
 */
router.get('/:id/bom', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const includeProcessSegments = req.query.includeProcessSegments !== 'false';

    const bom = await ProductService.getPartBOM(id, includeProcessSegments);
    res.json(bom);
  } catch (error: any) {
    console.error('Error fetching BOM:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/:id/where-used
 * Get where-used for a part (all parents that use this part)
 */
router.get('/:id/where-used', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Part ID is required'
      });
    }

    const whereUsed = await ProductService.getPartWhereUsed(id);
    res.json(whereUsed);
  } catch (error: any) {
    console.error('Error fetching where-used:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/products/bom/:bomItemId
 * Update BOM item
 */
router.put('/bom/:bomItemId', async (req: Request, res: Response) => {
  try {
    const { bomItemId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!bomItemId || bomItemId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'BOM Item ID is required'
      });
    }

    const bomItem = await ProductService.updateBOMItem(bomItemId, req.body);
    res.json(bomItem);
  } catch (error: any) {
    console.error('Error updating BOM item:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/products/bom/:bomItemId
 * Delete BOM item
 */
router.delete('/bom/:bomItemId', async (req: Request, res: Response) => {
  try {
    const { bomItemId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!bomItemId || bomItemId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'BOM Item ID is required'
      });
    }

    const hardDelete = req.query.hardDelete === 'true';

    const result = await ProductService.deleteBOMItem(bomItemId, hardDelete);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting BOM item:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// STATISTICS & QUERY ENDPOINTS
// ======================

/**
 * GET /api/v1/products/statistics/overview
 * Get product definition statistics
 */
router.get('/statistics/overview', async (req: Request, res: Response) => {
  try {
    const stats = await ProductService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/configurable/list
 * Get all configurable parts
 */
router.get('/configurable/list', async (req: Request, res: Response) => {
  try {
    const parts = await ProductService.getConfigurableParts();
    res.json(parts);
  } catch (error: any) {
    console.error('Error fetching configurable parts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/products/lifecycle/:state
 * Get parts by lifecycle state
 */
router.get('/lifecycle/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    const parts = await ProductService.getPartsByLifecycleState(state as any);
    res.json(parts);
  } catch (error: any) {
    console.error('Error fetching parts by lifecycle state:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
