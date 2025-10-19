import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/equipment', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment.findMany();
    res.status(200).json({ equipment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

router.get('/personnel', async (req: Request, res: Response) => {
  try {
    const personnel = await prisma.personnel.findMany();
    res.status(200).json({ personnel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personnel' });
  }
});

router.get('/workcenters', async (req: Request, res: Response) => {
  try {
    const workCenters = await prisma.workCenter.findMany();
    res.status(200).json({ workCenters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work centers' });
  }
});

export default router;
