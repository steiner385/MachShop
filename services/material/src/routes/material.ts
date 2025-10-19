import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Materials
router.get('/materials', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [materials, total] = await Promise.all([
      prisma.material.findMany({ skip, take: limitNum }),
      prisma.material.count()
    ]);

    res.status(200).json({ materials, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/materials', async (req: Request, res: Response) => {
  try {
    const material = await prisma.material.create({ data: req.body });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Lots
router.get('/lots', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [lots, total] = await Promise.all([
      prisma.materialLot.findMany({ skip, take: limitNum }),
      prisma.materialLot.count()
    ]);

    res.status(200).json({ lots, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

router.post('/lots', async (req: Request, res: Response) => {
  try {
    const lot = await prisma.materialLot.create({ data: req.body });
    res.status(201).json(lot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// Transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.materialTransaction.findMany({ skip, take: limitNum }),
      prisma.materialTransaction.count()
    ]);

    res.status(200).json({ transactions, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const transactionNumber = 'TXN-' + Date.now();
    const transaction = await prisma.materialTransaction.create({
      data: { ...req.body, transactionNumber }
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

export default router;
