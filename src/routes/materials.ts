import express from 'express';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @route GET /api/v1/materials/inventory
 * @desc Get inventory levels
 * @access Private
 */
router.get('/inventory',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    // Mock response
    res.status(200).json([]);
  })
);

/**
 * @route POST /api/v1/materials/consumption
 * @desc Record material consumption
 * @access Private
 */
router.post('/consumption',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    // Mock response
    res.status(201).json({
      id: '1',
      message: 'Material consumption recorded'
    });
  })
);

export default router;