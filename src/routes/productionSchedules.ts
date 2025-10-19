/**
 * Production Schedule Routes (ISA-95 Production Scheduling - Task 1.6)
 *
 * REST API endpoints for production scheduling including:
 * - Schedule CRUD operations
 * - Schedule entry management
 * - Constraint operations
 * - State management (FORECAST → RELEASED → DISPATCHED → RUNNING → COMPLETED → CLOSED)
 * - Scheduling algorithms (Priority-based, EDD sequencing)
 * - Dispatch operations (converting schedule entries to work orders)
 * - Feasibility analysis
 * - Statistics and reporting
 */

import express, { Request, Response } from 'express';
import ProductionScheduleService from '../services/ProductionScheduleService';

const router = express.Router();

// ======================
// SCHEDULE CRUD OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules
 * Create a new production schedule
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const schedule = await ProductionScheduleService.createSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('Error creating production schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/:id
 * Get schedule by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const schedule = await ProductionScheduleService.getScheduleById(id, includeRelations);
    res.json(schedule);
  } catch (error: any) {
    console.error('Error fetching production schedule:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/number/:scheduleNumber
 * Get schedule by schedule number
 */
router.get('/number/:scheduleNumber', async (req: Request, res: Response) => {
  try {
    const { scheduleNumber } = req.params;
    const includeRelations = req.query.includeRelations !== 'false';

    const schedule = await ProductionScheduleService.getScheduleByNumber(scheduleNumber, includeRelations);
    res.json(schedule);
  } catch (error: any) {
    console.error('Error fetching production schedule by number:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules
 * Get all schedules with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: any = {};

    if (req.query.state) {
      filters.state = req.query.state as string;
    }

    if (req.query.priority) {
      filters.priority = req.query.priority as string;
    }

    if (req.query.siteId) {
      filters.siteId = req.query.siteId as string;
    }

    if (req.query.periodStart) {
      filters.periodStart = new Date(req.query.periodStart as string);
    }

    if (req.query.periodEnd) {
      filters.periodEnd = new Date(req.query.periodEnd as string);
    }

    if (req.query.isLocked !== undefined) {
      filters.isLocked = req.query.isLocked === 'true';
    }

    if (req.query.isFeasible !== undefined) {
      filters.isFeasible = req.query.isFeasible === 'true';
    }

    const includeRelations = req.query.includeRelations === 'true';

    const schedules = await ProductionScheduleService.getAllSchedules(filters, includeRelations);
    res.json(schedules);
  } catch (error: any) {
    console.error('Error fetching production schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/production-schedules/:id
 * Update schedule
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await ProductionScheduleService.updateSchedule(id, req.body);
    res.json(schedule);
  } catch (error: any) {
    console.error('Error updating production schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/production-schedules/:id
 * Delete schedule (soft delete by locking, hard delete if specified)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hardDelete === 'true';

    const result = await ProductionScheduleService.deleteSchedule(id, hardDelete);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting production schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// SCHEDULE ENTRY OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules/:id/entries
 * Add entry to schedule
 */
router.post('/:id/entries', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await ProductionScheduleService.addScheduleEntry(id, req.body);
    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error adding schedule entry:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/:id/entries
 * Get all entries for a schedule
 */
router.get('/:id/entries', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeConstraints = req.query.includeConstraints !== 'false';

    const entries = await ProductionScheduleService.getScheduleEntries(id, includeConstraints);
    res.json(entries);
  } catch (error: any) {
    console.error('Error fetching schedule entries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/production-schedules/entries/:entryId
 * Update schedule entry
 */
router.put('/entries/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const entry = await ProductionScheduleService.updateScheduleEntry(entryId, req.body);
    res.json(entry);
  } catch (error: any) {
    console.error('Error updating schedule entry:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/entries/:entryId/cancel
 * Cancel schedule entry
 */
router.post('/entries/:entryId/cancel', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { reason, cancelledBy } = req.body;

    const entry = await ProductionScheduleService.cancelScheduleEntry(entryId, reason, cancelledBy);
    res.json(entry);
  } catch (error: any) {
    console.error('Error cancelling schedule entry:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// CONSTRAINT OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules/entries/:entryId/constraints
 * Add constraint to schedule entry
 */
router.post('/entries/:entryId/constraints', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const constraint = await ProductionScheduleService.addConstraint(entryId, req.body);
    res.status(201).json(constraint);
  } catch (error: any) {
    console.error('Error adding constraint:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/entries/:entryId/constraints
 * Get all constraints for a schedule entry
 */
router.get('/entries/:entryId/constraints', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const constraints = await ProductionScheduleService.getEntryConstraints(entryId);
    res.json(constraints);
  } catch (error: any) {
    console.error('Error fetching entry constraints:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v1/production-schedules/constraints/:constraintId
 * Update constraint
 */
router.put('/constraints/:constraintId', async (req: Request, res: Response) => {
  try {
    const { constraintId } = req.params;
    const constraint = await ProductionScheduleService.updateConstraint(constraintId, req.body);
    res.json(constraint);
  } catch (error: any) {
    console.error('Error updating constraint:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/constraints/:constraintId/resolve
 * Resolve constraint violation
 */
router.post('/constraints/:constraintId/resolve', async (req: Request, res: Response) => {
  try {
    const { constraintId } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    const constraint = await ProductionScheduleService.resolveConstraint(constraintId, resolvedBy, resolutionNotes);
    res.json(constraint);
  } catch (error: any) {
    console.error('Error resolving constraint:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/constraints/:constraintId/check
 * Check constraint violation status
 */
router.post('/constraints/:constraintId/check', async (req: Request, res: Response) => {
  try {
    const { constraintId } = req.params;
    const result = await ProductionScheduleService.checkConstraintViolation(constraintId);
    res.json(result);
  } catch (error: any) {
    console.error('Error checking constraint violation:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// STATE MANAGEMENT OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules/:id/state/transition
 * Transition schedule to new state
 */
router.post('/:id/state/transition', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stateHistory = await ProductionScheduleService.transitionScheduleState(id, req.body);
    res.status(201).json(stateHistory);
  } catch (error: any) {
    console.error('Error transitioning schedule state:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/:id/state/history
 * Get state history for schedule
 */
router.get('/:id/state/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await ProductionScheduleService.getScheduleStateHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching state history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// SCHEDULING ALGORITHM OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules/:id/sequencing/priority
 * Apply priority-based sequencing
 */
router.post('/:id/sequencing/priority', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const count = await ProductionScheduleService.applyPrioritySequencing(id);
    res.json({ message: `Priority sequencing applied to ${count} entries`, entriesAffected: count });
  } catch (error: any) {
    console.error('Error applying priority sequencing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/:id/sequencing/edd
 * Apply Earliest Due Date (EDD) sequencing
 */
router.post('/:id/sequencing/edd', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const count = await ProductionScheduleService.applyEDDSequencing(id);
    res.json({ message: `EDD sequencing applied to ${count} entries`, entriesAffected: count });
  } catch (error: any) {
    console.error('Error applying EDD sequencing:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/:id/feasibility/check
 * Check schedule feasibility
 */
router.post('/:id/feasibility/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ProductionScheduleService.checkScheduleFeasibility(id);
    res.json(result);
  } catch (error: any) {
    console.error('Error checking schedule feasibility:', error);
    res.status(400).json({ error: error.message });
  }
});

// ======================
// DISPATCH OPERATIONS
// ======================

/**
 * POST /api/v1/production-schedules/entries/:entryId/dispatch
 * Dispatch schedule entry (create work order)
 */
router.post('/entries/:entryId/dispatch', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { dispatchedBy } = req.body;

    const result = await ProductionScheduleService.dispatchScheduleEntry(entryId, dispatchedBy);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error dispatching schedule entry:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/production-schedules/:id/dispatch/all
 * Dispatch all entries in schedule
 */
router.post('/:id/dispatch/all', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dispatchedBy } = req.body;

    const result = await ProductionScheduleService.dispatchAllEntries(id, dispatchedBy);
    res.json(result);
  } catch (error: any) {
    console.error('Error dispatching all entries:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/dispatch/ready
 * Get entries ready for dispatch
 */
router.get('/dispatch/ready', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId as string | undefined;
    const entries = await ProductionScheduleService.getEntriesReadyForDispatch(siteId);
    res.json(entries);
  } catch (error: any) {
    console.error('Error fetching entries ready for dispatch:', error);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// STATISTICS & QUERY ENDPOINTS
// ======================

/**
 * GET /api/v1/production-schedules/statistics/overview
 * Get production scheduling statistics
 */
router.get('/statistics/overview', async (req: Request, res: Response) => {
  try {
    const stats = await ProductionScheduleService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/production-schedules/state/:state
 * Get schedules by state
 */
router.get('/state/:state', async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    const schedules = await ProductionScheduleService.getSchedulesByState(state as any);
    res.json(schedules);
  } catch (error: any) {
    console.error('Error fetching schedules by state:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
