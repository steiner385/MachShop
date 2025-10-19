import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = {
      productionCount: 1000,
      qualityRate: 95.5,
      utilizationRate: 87.3,
      oee: {
        availability: 90,
        performance: 95,
        quality: 98,
        oee: 83.7
      }
    };
    res.status(200).json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/oee', async (req: Request, res: Response) => {
  try {
    const oee = await prisma.oEERecord.findMany({ take: 10 });
    res.status(200).json({ oee });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OEE' });
  }
});

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const reports = await prisma.customReport.findMany();
    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;
