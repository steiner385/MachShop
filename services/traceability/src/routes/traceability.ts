import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/serials', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [serials, total] = await Promise.all([
      prisma.serializedPart.findMany({ skip, take: limitNum }),
      prisma.serializedPart.count()
    ]);

    res.status(200).json({ serials, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch serials' });
  }
});

router.post('/serials', async (req: Request, res: Response) => {
  try {
    const serial = await prisma.serializedPart.create({ data: req.body });
    res.status(201).json(serial);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create serial' });
  }
});

router.get('/genealogy/:serialNumber', async (req: Request, res: Response) => {
  try {
    const { serialNumber } = req.params;
    const records = await prisma.genealogyRecord.findMany({
      where: {
        OR: [
          { childSerialNumber: serialNumber },
          { parentSerialNumber: serialNumber }
        ]
      }
    });
    res.status(200).json({ genealogy: records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch genealogy' });
  }
});

export default router;
