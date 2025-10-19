import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/configs', async (req: Request, res: Response) => {
  try {
    const configs = await prisma.integrationConfig.findMany();
    res.status(200).json({ configs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const job = await prisma.syncJob.create({
      data: {
        configId: req.body.configId,
        status: 'PENDING',
        dataType: req.body.dataType,
        direction: req.body.direction
      }
    });
    res.status(201).json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.syncJob.findMany({ take: 50 });
    res.status(200).json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

export default router;
