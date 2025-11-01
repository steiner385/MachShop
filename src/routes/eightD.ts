/**
 * 8D Problem Solving Framework Routes
 * Issue #57: REST API endpoints for 8D methodology
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import EightDService from '../services/EightDService';
import EightDConfigService from '../services/EightDConfigService';

const router = Router();
const prisma = new PrismaClient();
const eightDService = new EightDService(prisma);
const configService = new EightDConfigService(prisma);

/**
 * Configuration endpoints
 */

// Get 8D configuration for site
router.get('/config/:siteId?', async (req: Request, res: Response) => {
  try {
    const config = await configService.getConfig(req.params.siteId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update 8D configuration
router.put('/config/:siteId?', async (req: Request, res: Response) => {
  try {
    const config = await configService.upsertConfig({
      siteId: req.params.siteId,
      ...req.body,
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * 8D Report endpoints
 */

// Create new 8D report
router.post('/', async (req: Request, res: Response) => {
  try {
    const report = await eightDService.createReport(req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List 8D reports with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await eightDService.listReports({
      status: req.query.status as any,
      priority: req.query.priority as any,
      ncrId: req.query.ncrId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get specific 8D report
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const report = await eightDService.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: '8D report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update 8D discipline
router.put('/:id/discipline/:discipline', async (req: Request, res: Response) => {
  try {
    const discipline = parseInt(req.params.discipline);
    if (discipline < 0 || discipline > 8) {
      return res.status(400).json({ error: 'Invalid discipline number' });
    }

    const report = await eightDService.updateDiscipline(req.params.id, {
      discipline,
      content: req.body.content,
      verified: req.body.verified,
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Progress 8D to next discipline
router.post('/:id/progress', async (req: Request, res: Response) => {
  try {
    const report = await eightDService.progressDiscipline(req.params.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Complete 8D report
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const report = await eightDService.completeReport(req.params.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Team Member endpoints
 */

// Add team member
router.post('/:id/team-members', async (req: Request, res: Response) => {
  try {
    const member = await eightDService.addTeamMember(req.params.id, req.body);
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Remove team member
router.delete('/:id/team-members/:userId', async (req: Request, res: Response) => {
  try {
    await eightDService.removeTeamMember(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Attachment endpoints
 */

// Add attachment
router.post('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const { discipline, fileName, fileUrl, fileType, description, uploadedBy } = req.body;
    const attachment = await eightDService.addAttachment(
      req.params.id,
      discipline,
      fileName,
      fileUrl,
      fileType,
      description,
      uploadedBy,
    );
    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Approval endpoints
 */

// Request approval
router.post('/:id/approvals', async (req: Request, res: Response) => {
  try {
    const { approverUserId, discipline, role } = req.body;
    const approval = await eightDService.requestApproval(
      req.params.id,
      approverUserId,
      discipline,
      role,
    );
    res.status(201).json(approval);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Approve 8D discipline
router.post('/approvals/:approvalId/approve', async (req: Request, res: Response) => {
  try {
    const approval = await eightDService.approveApproval(
      req.params.approvalId,
      req.body.approvalNotes,
    );
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Metrics and Analytics endpoints
 */

// Get 8D metrics
router.get('/analytics/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await eightDService.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
