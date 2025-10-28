/**
 * Collaboration API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for real-time collaboration features
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { collaborationService } from '../services/CollaborationService';
import { logger } from '../utils/logger';
import { ConflictType, ResolutionStrategy } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const startSessionSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  sessionData: z.any().optional(),
  metadata: z.any().optional()
});

const detectConflictSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  conflictType: z.nativeEnum(ConflictType),
  conflictData: z.any(),
  affectedUsers: z.array(z.string()).min(1, 'At least one affected user is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
});

const resolveConflictSchema = z.object({
  conflictId: z.string().min(1, 'Conflict ID is required'),
  resolutionStrategy: z.nativeEnum(ResolutionStrategy),
  resolutionData: z.any(),
  notes: z.string().optional()
});

const subscribeSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  subscriptionTypes: z.array(z.string()).min(1, 'At least one subscription type is required'),
  preferences: z.any().optional()
});

const contentChangeSchema = z.object({
  documentType: z.string().min(1),
  documentId: z.string().min(1),
  changeData: z.any()
});

const collaborationStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ============================================================================
// EDIT SESSION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/collaboration/sessions/start
 * @desc    Start an edit session for a document
 * @access  Private
 */
router.post('/sessions/start', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = startSessionSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await collaborationService.startEditSession({
      ...validatedData,
      userId,
      userName
    });

    logger.info('Edit session started', {
      userId,
      sessionId: session.id,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId
    });

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/collaboration/sessions/:sessionId/end
 * @desc    End an edit session
 * @access  Private
 */
router.post('/sessions/:sessionId/end', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { sessionId } = req.params;
    const { documentType, documentId } = req.body;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!documentType || !documentId) {
      res.status(400).json({ error: 'Document type and ID are required' });
      return;
    }

    await collaborationService.endEditSession(documentType, documentId, userId);

    logger.info('Edit session ended', {
      userId,
      sessionId,
      documentType,
      documentId
    });

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/collaboration/sessions/:sessionId/heartbeat
 * @desc    Update session activity (heartbeat)
 * @access  Private
 */
router.post('/sessions/:sessionId/heartbeat', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { sessionId } = req.params;

    await collaborationService.updateSessionActivity(sessionId);

    res.json({ message: 'Session activity updated' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/collaboration/sessions/document/:documentType/:documentId
 * @desc    Get active sessions for a document
 * @access  Private
 */
router.get('/sessions/document/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const sessions = await collaborationService.getActiveDocumentSessions(documentType, documentId);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CONFLICT DETECTION AND RESOLUTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/collaboration/conflicts/detect
 * @desc    Detect and log a conflict
 * @access  Private
 */
router.post('/conflicts/detect', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = detectConflictSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conflict = await collaborationService.detectConflict({
      ...validatedData,
      detectedById: userId,
      detectedByName: userName
    });

    logger.info('Conflict detected', {
      userId,
      conflictId: conflict.id,
      conflictType: validatedData.conflictType,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId,
      severity: validatedData.severity
    });

    res.status(201).json(conflict);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/collaboration/conflicts/:conflictId/resolve
 * @desc    Resolve a conflict
 * @access  Private
 */
router.post('/conflicts/:conflictId/resolve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { conflictId } = req.params;
    const validatedData = resolveConflictSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const resolvedConflict = await collaborationService.resolveConflict({
      conflictId,
      resolutionStrategy: validatedData.resolutionStrategy,
      resolutionData: validatedData.resolutionData,
      resolvedById: userId,
      resolvedByName: userName,
      notes: validatedData.notes
    });

    logger.info('Conflict resolved', {
      userId,
      conflictId,
      resolutionStrategy: validatedData.resolutionStrategy
    });

    res.json(resolvedConflict);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/collaboration/conflicts/document/:documentType/:documentId
 * @desc    Get conflict history for a document
 * @access  Private
 */
router.get('/conflicts/document/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const conflicts = await collaborationService.getDocumentConflictHistory(documentType, documentId);

    res.json(conflicts);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SUBSCRIPTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/collaboration/subscriptions
 * @desc    Subscribe to document notifications
 * @access  Private
 */
router.post('/subscriptions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = subscribeSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const subscription = await collaborationService.subscribeToDocument({
      ...validatedData,
      userId,
      userName
    });

    logger.info('Document subscription created', {
      userId,
      subscriptionId: subscription.id,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId,
      subscriptionTypes: validatedData.subscriptionTypes
    });

    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/collaboration/subscriptions/:documentType/:documentId
 * @desc    Unsubscribe from document notifications
 * @access  Private
 */
router.delete('/subscriptions/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await collaborationService.unsubscribeFromDocument(documentType, documentId, userId);

    logger.info('Document subscription removed', {
      userId,
      documentType,
      documentId
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/collaboration/subscriptions/:documentType/:documentId
 * @desc    Get document subscribers
 * @access  Private
 */
router.get('/subscriptions/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const subscribers = await collaborationService.getDocumentSubscribers(documentType, documentId);

    res.json(subscribers);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// COLLABORATION STATE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/collaboration/state/:documentType/:documentId
 * @desc    Get collaboration state for a document
 * @access  Private
 */
router.get('/state/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const state = await collaborationService.getDocumentCollaborationState(documentType, documentId);

    res.json(state);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CONTENT CHANGE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/collaboration/content-change
 * @desc    Handle content change event
 * @access  Private
 */
router.post('/content-change', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = contentChangeSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await collaborationService.handleContentChange(
      validatedData.documentType,
      validatedData.documentId,
      userId,
      userName,
      validatedData.changeData
    );

    logger.debug('Content change handled', {
      userId,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId
    });

    res.json({ message: 'Content change processed' });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// STATISTICS AND ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/collaboration/stats/user/:userId
 * @desc    Get collaboration statistics for a user
 * @access  Private
 */
router.get('/stats/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access these statistics
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Parse time range from query parameters
    const timeRange = req.query.startDate && req.query.endDate ? {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    } : undefined;

    const stats = await collaborationService.getUserCollaborationStats(userId, timeRange);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REAL-TIME EVENT ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/collaboration/events/stream
 * @desc    Server-Sent Events stream for real-time updates
 * @access  Private
 */
router.get('/events/stream', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const userId = (req as any).user?.id;
    if (!userId) {
      res.write('event: error\ndata: {"error": "Unauthorized"}\n\n');
      res.end();
      return;
    }

    // Send initial connection event
    res.write('event: connected\ndata: {"message": "Connected to collaboration stream"}\n\n');

    // Set up event listener for real-time events
    const eventHandler = (event: any) => {
      try {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      } catch (writeError) {
        logger.error('Failed to write SSE event', { error: writeError, userId });
      }
    };

    // Listen for collaboration events
    collaborationService.on('realtime-event', eventHandler);

    // Handle client disconnect
    req.on('close', () => {
      collaborationService.removeListener('realtime-event', eventHandler);
      logger.info('SSE client disconnected', { userId });
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write('event: heartbeat\ndata: {"timestamp": "' + new Date().toISOString() + '"}\n\n');
      } catch (heartbeatError) {
        clearInterval(heartbeat);
        collaborationService.removeListener('realtime-event', eventHandler);
      }
    }, 30000); // Every 30 seconds

    logger.info('SSE client connected', { userId });
  } catch (error) {
    logger.error('SSE connection failed', { error: error, userId: (req as any).user?.id });
    res.status(500).json({ error: 'Failed to establish event stream' });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/collaboration/conflict-types
 * @desc    Get available conflict types
 * @access  Private
 */
router.get('/conflict-types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const conflictTypes = Object.values(ConflictType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getConflictTypeDescription(type)
    }));

    res.json(conflictTypes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/collaboration/resolution-strategies
 * @desc    Get available resolution strategies
 * @access  Private
 */
router.get('/resolution-strategies', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const strategies = Object.values(ResolutionStrategy).map(strategy => ({
      value: strategy,
      label: strategy.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getResolutionStrategyDescription(strategy)
    }));

    res.json(strategies);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getConflictTypeDescription(type: ConflictType): string {
  const descriptions: Record<ConflictType, string> = {
    [ConflictType.CONCURRENT_EDIT]: 'Multiple users editing simultaneously',
    [ConflictType.VERSION_MISMATCH]: 'Document version conflicts',
    [ConflictType.PERMISSION_CONFLICT]: 'Permission-related conflicts',
    [ConflictType.DATA_VALIDATION]: 'Data validation conflicts'
  };

  return descriptions[type] || 'Custom conflict type';
}

function getResolutionStrategyDescription(strategy: ResolutionStrategy): string {
  const descriptions: Record<ResolutionStrategy, string> = {
    [ResolutionStrategy.MANUAL_MERGE]: 'Manually merge conflicting changes',
    [ResolutionStrategy.FORCE_LATEST]: 'Use the latest version',
    [ResolutionStrategy.FORCE_ORIGINAL]: 'Keep the original version',
    [ResolutionStrategy.CREATE_BRANCH]: 'Create a new branch for changes'
  };

  return descriptions[strategy] || 'Custom resolution strategy';
}

export default router;