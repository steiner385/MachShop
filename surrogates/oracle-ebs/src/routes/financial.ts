/**
 * Oracle EBS Surrogate - Financial Routes
 * REST API endpoints for cost tracking and financial management
 */

import express, { Router, Request, Response } from 'express';
import { FinancialService } from '../services/financial.service';
import { Logger } from '../utils/logger';

const router: Router = express.Router();
const logger = Logger.getInstance();
const financialService = FinancialService.getInstance();

/**
 * POST /financial/costs/labor
 * Record labor cost transaction
 */
router.post('/costs/labor', async (req: Request, res: Response) => {
  try {
    const { workOrderId, hours, hourlyRate, costCenter, description } = req.body;

    if (!workOrderId || !hours || !hourlyRate || !costCenter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: workOrderId, hours, hourlyRate, costCenter'
      });
    }

    const result = await financialService.recordLaborCost(
      workOrderId,
      hours,
      hourlyRate,
      costCenter,
      description
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('Labor cost recording error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /financial/costs/material
 * Record material cost transaction
 */
router.post('/costs/material', async (req: Request, res: Response) => {
  try {
    const { workOrderId, partNumber, quantity, unitCost, costCenter, description } = req.body;

    if (!workOrderId || !partNumber || !quantity || !unitCost || !costCenter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await financialService.recordMaterialCost(
      workOrderId,
      partNumber,
      quantity,
      unitCost,
      costCenter,
      description
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('Material cost recording error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /financial/costs/overhead
 * Allocate overhead cost
 */
router.post('/costs/overhead', async (req: Request, res: Response) => {
  try {
    const { workOrderId, amount, costCenter, description } = req.body;

    if (!workOrderId || !amount || !costCenter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await financialService.allocateOverheadCost(
      workOrderId,
      amount,
      costCenter,
      description
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('Overhead allocation error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /financial/costs/batch
 * Record multiple cost transactions in batch
 */
router.post('/costs/batch', async (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        error: 'Transactions must be an array'
      });
    }

    const result = await financialService.recordBatchCosts(transactions);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('Batch cost recording error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/costs/allocation/:workOrderId
 * Get cost allocation for work order
 */
router.get('/costs/allocation/:workOrderId', async (req: Request, res: Response) => {
  try {
    const { workOrderId } = req.params;
    const allocation = await financialService.getCostAllocation(workOrderId);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: `No allocation found for work order ${workOrderId}`
      });
    }

    res.json({
      success: true,
      data: allocation
    });
  } catch (error) {
    logger.error('Cost allocation retrieval error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/costs/work-order/:workOrderId
 * Get all costs for a work order
 */
router.get('/costs/work-order/:workOrderId', async (req: Request, res: Response) => {
  try {
    const { workOrderId } = req.params;
    const costs = await financialService.getWorkOrderCosts(workOrderId);

    res.json({
      success: true,
      data: costs,
      count: costs.length
    });
  } catch (error) {
    logger.error('Work order costs retrieval error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/reports/cost-center/:costCenter
 * Get cost center report
 */
router.get('/reports/cost-center/:costCenter', async (req: Request, res: Response) => {
  try {
    const { costCenter } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }

    const report = await financialService.getCostCenterReport(
      costCenter,
      startDate as string,
      endDate as string
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: `No data found for cost center ${costCenter}`
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Cost center report error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/reports/variance
 * Get cost variance analysis
 */
router.get('/reports/variance', async (req: Request, res: Response) => {
  try {
    const { costCenter, budget, startDate, endDate } = req.query;

    if (!costCenter || !budget || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'costCenter, budget, startDate, and endDate are required'
      });
    }

    const variance = await financialService.calculateCostVariance(
      costCenter as string,
      parseFloat(budget as string),
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      data: variance
    });
  } catch (error) {
    logger.error('Variance analysis error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/summary
 * Get cost summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await financialService.getCostSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Cost summary error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /financial/gl-mapping
 * Get GL account mapping
 */
router.get('/gl-mapping', async (req: Request, res: Response) => {
  try {
    const mapping = await financialService.getGLAccountMapping();

    res.json({
      success: true,
      data: mapping
    });
  } catch (error) {
    logger.error('GL mapping error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
