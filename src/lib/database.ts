import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// In test mode, always create a fresh instance to respect DATABASE_URL changes
// In development, use singleton pattern to prevent multiple instances
let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  // Always create fresh instance in test mode
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: ['error', 'warn']
  });
} else {
  // Use singleton pattern in development/production
  prismaInstance = global.__prisma || new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  if (process.env.NODE_ENV === 'development') {
    global.__prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;