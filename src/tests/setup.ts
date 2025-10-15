// IMPORTANT: Set environment variables BEFORE any imports
// This ensures Prisma connects to the test database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://mes_user:mes_password@localhost:5432/mes_test';

// Clear any cached Prisma instances to force fresh connection
declare global {
  var __prisma: any;
}
global.__prisma = undefined;

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Setup test database, mock services, etc.
  // Environment variables are already set at the top of this file
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Reset state before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Mock Date.now() to return consistent timestamps in tests
const mockDateNow = new Date('2024-01-15T10:30:00Z').getTime();
global.Date.now = () => mockDateNow;