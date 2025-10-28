import express, { Request, Response } from 'express';
import { spcService } from '../services/SPCService';
import { westernElectricRulesEngine } from '../services/WesternElectricRulesEngine';
import { PrismaClient, SPCChartType } from '@prisma/client';
import authMiddleware from '../middleware/auth';
import { createLogger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const logger = createLogger('SPCRoutes');

/**
 * @route   POST /api/spc/configurations
 * @desc    Create SPC configuration for a parameter
 * @access  Private
 */
router.post('/configurations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      parameterId,
      chartType,
      subgroupSize,
      limitsBasedOn,
      historicalDataDays,
      historicalData,
      USL,
      LSL,
      targetValue,
      enabledRules,
      ruleSensitivity,
      enableCapability,
      confidenceLevel,
      isActive,
    } = req.body;

    // Validate required fields
    if (!parameterId || !chartType) {
      return res.status(400).json({
        error: 'Missing required fields: parameterId, chartType',
      });
    }

    // Verify parameter exists
    const parameter = await prisma.operationParameter.findUnique({
      where: { id: parameterId },
    });

    if (!parameter) {
      return res.status(404).json({ error: 'Parameter not found' });
    }

    // Validate chart type-specific requirements
    if ((chartType === 'X_BAR_R' || chartType === 'X_BAR_S') && !subgroupSize) {
      return res.status(400).json({
        error: `${chartType} chart requires subgroup size`,
      });
    }

    // Validate enabled rules (must be 1-8 only)
    if (enabledRules && Array.isArray(enabledRules)) {
      const invalidRules = enabledRules.filter((rule: number) => rule < 1 || rule > 8);
      if (invalidRules.length > 0) {
        return res.status(400).json({
          error: `Invalid rule numbers: ${invalidRules.join(', ')}. Rules must be between 1 and 8`,
        });
      }
    }

    // Check for existing configuration (prevent duplicates)
    const existingConfig = await prisma.sPCConfiguration.findUnique({
      where: { parameterId },
    });

    if (existingConfig) {
      return res.status(409).json({
        error: 'SPC configuration already exists for this parameter',
      });
    }

    // Create SPC configuration
    const config = await spcService.createSPCConfiguration(
      parameterId,
      chartType as SPCChartType,
      subgroupSize || null,
      historicalData || [],
      {
        USL,
        LSL,
        targetValue,
        limitsBasedOn,
        historicalDataDays,
        enabledRules,
        ruleSensitivity,
        enableCapability,
        confidenceLevel,
        isActive,
      },
      req.user!.username
    );

    logger.info('SPC configuration created', {
      parameterId,
      chartType,
      createdBy: req.user!.username,
    });

    return res.status(201).json(config);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('chart type') ||
        error.message.includes('subgroup') ||
        error.message.includes('duplicate')) {
      return res.status(400).json({ error: error.message });
    }
    // Check for duplicate configuration (409)
    if (error.message.includes('already exists') ||
        error.message.includes('Unique constraint')) {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Error creating SPC configuration', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/spc/configurations/:parameterId
 * @desc    Get SPC configuration by parameter ID
 * @access  Private
 */
router.get('/configurations/:parameterId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!parameterId || parameterId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Parameter ID is required'
      });
    }

    const config = await spcService.getSPCConfiguration(parameterId);

    if (!config) {
      return res.status(404).json({ error: 'SPC configuration not found' });
    }

    return res.json(config);
  } catch (error: any) {
    logger.error('Error fetching SPC configuration', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/spc/configurations
 * @desc    List all SPC configurations
 * @access  Private
 */
router.get('/configurations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { isActive, chartType } = req.query;

    const filters: any = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (chartType) {
      filters.chartType = chartType as SPCChartType;
    }

    const configurations = await spcService.listSPCConfigurations(filters);

    return res.json(configurations);
  } catch (error: any) {
    logger.error('Error listing SPC configurations', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/spc/configurations/:parameterId
 * @desc    Update SPC configuration
 * @access  Private
 */
router.put('/configurations/:parameterId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!parameterId || parameterId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Parameter ID is required'
      });
    }

    const updates = req.body;

    const config = await spcService.updateSPCConfiguration(
      parameterId,
      updates,
      req.user!.username
    );

    logger.info('SPC configuration updated', {
      parameterId,
      updatedBy: req.user!.username,
    });

    return res.json(config);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('chart type') ||
        error.message.includes('subgroup')) {
      return res.status(400).json({ error: error.message });
    }
    // Check for not found
    if (error.message.includes('not found') || error.code === 'P2025') {
      return res.status(404).json({ error: 'SPC configuration not found' });
    }
    logger.error('Error updating SPC configuration', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/spc/configurations/:parameterId
 * @desc    Delete SPC configuration
 * @access  Private
 */
router.delete('/configurations/:parameterId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;

    // ✅ PHASE 8C FIX: Validate required parameter
    if (!parameterId || parameterId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Parameter ID is required'
      });
    }

    await spcService.deleteSPCConfiguration(parameterId);

    logger.info('SPC configuration deleted', {
      parameterId,
      deletedBy: req.user!.username,
    });

    return res.status(200).json({ message: 'SPC configuration deleted successfully' });
  } catch (error: any) {
    // Handle not found gracefully
    if (error.message.includes('Record to delete does not exist') || error.code === 'P2025') {
      return res.status(404).json({ error: 'SPC configuration not found' });
    }
    logger.error('Error deleting SPC configuration', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/control-limits/xbar-r
 * @desc    Calculate X-bar and R control limits
 * @access  Private
 */
router.post('/control-limits/xbar-r', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subgroups, USL, LSL, target } = req.body;

    if (!subgroups || !Array.isArray(subgroups)) {
      return res.status(400).json({ error: 'Subgroups array required' });
    }

    const limits = await spcService.calculateXBarRLimits(subgroups, { USL, LSL, target });

    return res.json(limits);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('subgroup')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating X-bar R limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/control-limits/xbar-s
 * @desc    Calculate X-bar and S control limits
 * @access  Private
 */
router.post('/control-limits/xbar-s', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subgroups, USL, LSL, target } = req.body;

    if (!subgroups || !Array.isArray(subgroups)) {
      return res.status(400).json({ error: 'Subgroups array required' });
    }

    const limits = await spcService.calculateXBarSLimits(subgroups, { USL, LSL, target });

    return res.json(limits);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('subgroup')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating X-bar S limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/control-limits/imr
 * @desc    Calculate I-MR (Individual and Moving Range) control limits
 * @access  Private
 */
router.post('/control-limits/imr', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { individuals, movingRangeSpan } = req.body;

    if (!individuals || !Array.isArray(individuals)) {
      return res.status(400).json({ error: 'Individuals array required' });
    }

    const limits = await spcService.calculateIMRLimits(individuals, movingRangeSpan || 2);

    // Add property aliases for test compatibility
    return res.json({
      ...limits,
      movingRangeUCL: limits.rangeUCL,
      movingRangeCL: limits.rangeCL,
      movingRangeLCL: limits.rangeLCL,
    });
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('data points')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating I-MR limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/control-limits/p-chart
 * @desc    Calculate P-chart (proportion defective) control limits
 * @access  Private
 */
router.post('/control-limits/p-chart', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { defectCounts, sampleSizes } = req.body;

    // ✅ GITHUB ISSUE #13 FIX: Enhanced P-chart validation with detailed array checks
    if (!defectCounts || !sampleSizes) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Both defectCounts and sampleSizes arrays are required for P-chart calculation'
      });
    }

    // Validate arrays are actually arrays
    if (!Array.isArray(defectCounts) || !Array.isArray(sampleSizes)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Both defectCounts and sampleSizes must be arrays'
      });
    }

    // Validate arrays are not empty
    if (defectCounts.length === 0 || sampleSizes.length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Both defectCounts and sampleSizes arrays must contain at least one value'
      });
    }

    // ✅ GITHUB ISSUE #13 KEY FIX: Validate array lengths match before service call
    if (defectCounts.length !== sampleSizes.length) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Array length mismatch: defectCounts has ${defectCounts.length} values but sampleSizes has ${sampleSizes.length} values. Both arrays must have the same length for paired P-chart calculations.`,
        details: {
          defectCountsLength: defectCounts.length,
          sampleSizesLength: sampleSizes.length,
          suggestion: 'Ensure each defect count has a corresponding sample size value'
        }
      });
    }

    // Validate all values are numbers
    const invalidDefectCounts = defectCounts.filter((val, idx) => typeof val !== 'number' || isNaN(val));
    if (invalidDefectCounts.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'All defect count values must be valid numbers'
      });
    }

    const invalidSampleSizes = sampleSizes.filter((val, idx) => typeof val !== 'number' || isNaN(val));
    if (invalidSampleSizes.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'All sample size values must be valid numbers'
      });
    }

    const limits = await spcService.calculatePChartLimits(defectCounts, sampleSizes);

    return res.json(limits);
  } catch (error: any) {
    // ✅ GITHUB ISSUE #13 FIX: Enhanced error handling with specific P-chart error messages
    if (error.message.includes('same length')) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.message,
        suggestion: 'Verify that your defect counts and sample sizes data have matching array lengths'
      });
    }
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('negative')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating P-chart limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/control-limits/c-chart
 * @desc    Calculate C-chart (count of defects) control limits
 * @access  Private
 */
router.post('/control-limits/c-chart', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { defectCounts } = req.body;

    if (!defectCounts || !Array.isArray(defectCounts)) {
      return res.status(400).json({ error: 'Defect counts array required' });
    }

    const limits = await spcService.calculateCChartLimits(defectCounts);

    return res.json(limits);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating C-chart limits', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/capability
 * @desc    Calculate process capability indices (Cp, Cpk, Pp, Ppk, Cpm)
 * @access  Private
 */
router.post('/capability', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data, USL, LSL, target } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data array required' });
    }

    const indices = spcService.calculateCapabilityIndices(data, USL, LSL, target);

    if (!indices) {
      return res.status(400).json({ error: 'Specification limits (USL/LSL) required' });
    }

    return res.json(indices);
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error calculating capability indices', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/evaluate-rules
 * @desc    Evaluate Western Electric Rules
 * @access  Private
 */
router.post('/evaluate-rules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data, limits, enabledRules, sensitivity } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data array required with at least one point' });
    }

    if (!limits || !limits.UCL || !limits.centerLine || !limits.LCL || !limits.sigma) {
      return res.status(400).json({ error: 'Control limits required (UCL, centerLine, LCL, sigma)' });
    }

    // Extract values from data points (handle both number[] and object[] formats)
    const values = data.map((item: any) =>
      typeof item === 'number' ? item : item.value
    );

    const violations = westernElectricRulesEngine.evaluateRules(
      values,
      limits,
      enabledRules || [1, 2, 3, 4, 5, 6, 7, 8],
      sensitivity || 'NORMAL'
    );

    return res.json({
      violations,
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'CRITICAL').length,
      warningViolations: violations.filter(v => v.severity === 'WARNING').length,
      infoViolations: violations.filter(v => v.severity === 'INFO').length,
    });
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('data points')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error evaluating rules', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/spc/rule-violations/:parameterId
 * @desc    Get rule violations for a parameter
 * @access  Private
 */
router.get('/rule-violations/:parameterId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { parameterId } = req.params;
    const { acknowledged } = req.query;

    // Get SPC configuration
    const config = await spcService.getSPCConfiguration(parameterId);
    if (!config) {
      return res.status(404).json({ error: 'SPC configuration not found' });
    }

    // Get violations
    const filters: any = { configurationId: config.id };
    if (acknowledged !== undefined) {
      filters.acknowledged = acknowledged === 'true';
    }

    const violations = await prisma.sPCRuleViolation.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      take: 100, // Limit to last 100 violations
    });

    return res.json(violations);
  } catch (error: any) {
    logger.error('Error fetching rule violations', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/rule-violations/:violationId/acknowledge
 * @desc    Acknowledge a rule violation
 * @access  Private
 */
router.post('/rule-violations/:violationId/acknowledge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { violationId } = req.params;
    const { resolution } = req.body;

    const violation = await prisma.sPCRuleViolation.update({
      where: { id: violationId },
      data: {
        acknowledged: true,
        acknowledgedBy: req.user!.username,
        acknowledgedAt: new Date(),
        resolution: resolution || null,
      },
    });

    logger.info('Rule violation acknowledged', {
      violationId,
      acknowledgedBy: req.user!.username,
    });

    return res.json(violation);
  } catch (error: any) {
    logger.error('Error acknowledging rule violation', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/spc/rules
 * @desc    Get Western Electric Rules information
 * @access  Private
 */
router.get('/rules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rules = [1, 2, 3, 4, 5, 6, 7, 8].map(ruleNumber => ({
      number: ruleNumber,
      ruleNumber,
      name: `Rule ${ruleNumber}`,
      description: westernElectricRulesEngine.getRuleDescription(ruleNumber),
      severity: westernElectricRulesEngine.getRuleSeverity(ruleNumber),
    }));

    return res.json(rules);
  } catch (error: any) {
    logger.error('Error fetching rules information', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/spc/analyze
 * @desc    Comprehensive SPC analysis (limits, rules, capability)
 * @access  Private
 */
router.post('/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      data,
      chartType,
      subgroupSize,
      USL,
      LSL,
      target,
      enabledRules,
      sensitivity,
    } = req.body;

    // ✅ PHASE 8C FIX: Enhanced input validation for analyze endpoint
    if (!data || !chartType) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Data and chartType are required'
      });
    }

    // Validate data is array and not empty
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Data must be a non-empty array'
      });
    }

    // Validate chart type against enum values
    const validChartTypes = ['I_MR', 'X_BAR_R', 'X_BAR_S', 'P_CHART', 'C_CHART', 'NP_CHART', 'U_CHART', 'CUSUM', 'EWMA'] as const;
    if (!validChartTypes.includes(chartType as any)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Invalid chart type: ${chartType}. Valid types are: ${validChartTypes.join(', ')}`
      });
    }

    // Extract values from data points (handle both number[] and object[] formats)
    const values = data.map((item: any) =>
      typeof item === 'number' ? item : item.value
    );

    // Validate extracted values are numbers
    const invalidValues = values.filter(val => typeof val !== 'number' || isNaN(val));
    if (invalidValues.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'All data points must be valid numbers'
      });
    }

    let limits;

    // Calculate control limits based on chart type
    switch (chartType) {
      case 'I_MR':
        limits = await spcService.calculateIMRLimits(values);
        break;
      case 'X_BAR_R':
        if (!subgroupSize) {
          return res.status(400).json({ error: 'Subgroup size required for X-bar R chart' });
        }
        // Group data into subgroups
        const subgroups = [];
        for (let i = 0; i < values.length; i += subgroupSize) {
          subgroups.push(values.slice(i, i + subgroupSize));
        }
        limits = await spcService.calculateXBarRLimits(subgroups, { USL, LSL, target });
        break;
      default:
        return res.status(400).json({ error: `Unsupported chart type: ${chartType}` });
    }

    // Evaluate Western Electric Rules
    const ruleResults = westernElectricRulesEngine.evaluateRules(
      values,
      limits,
      enabledRules || [1, 2, 3, 4, 5, 6, 7, 8],
      sensitivity || 'NORMAL'
    );

    // Calculate capability indices
    const capability = spcService.calculateCapabilityIndices(values, USL, LSL, target);

    return res.json({
      controlLimits: limits,
      ruleViolations: {
        violations: ruleResults,
        totalViolations: ruleResults.length,
        criticalViolations: ruleResults.filter(v => v.severity === 'CRITICAL').length,
        warningViolations: ruleResults.filter(v => v.severity === 'WARNING').length,
        infoViolations: ruleResults.filter(v => v.severity === 'INFO').length,
      },
      capability,
      processStatus: ruleResults.length === 0 ? 'IN_CONTROL' : 'OUT_OF_CONTROL',
    });
  } catch (error: any) {
    // Check if this is a validation error
    if (error.message.includes('Minimum') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot') ||
        error.message.includes('invalid') ||
        error.message.includes('Unsupported') ||
        error.message.includes('Subgroup size')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error performing SPC analysis', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
