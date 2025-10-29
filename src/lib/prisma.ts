/**
 * Re-export prisma instance from database.ts
 * This provides a consistent import path for services and tests
 */
export { prisma } from './database';
export { default } from './database';
