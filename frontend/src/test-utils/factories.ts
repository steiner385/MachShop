/**
 * Test Data Factories
 *
 * Factory functions for creating consistent test data objects.
 * These factories help ensure tests use realistic, consistent data
 * while being easy to customize for specific test scenarios.
 */

import { Site } from '@/contexts/SiteContext';

// Site factories
export const createMockSite = (overrides: Partial<Site> = {}): Site => ({
  id: 'site-1',
  siteName: 'Test Manufacturing Site',
  siteCode: 'TMS01',
  location: 'Test Location, USA',
  isActive: true,
  timezone: 'America/New_York',
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockSites = (count: number = 3): Site[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockSite({
      id: `site-${index + 1}`,
      siteName: `Test Site ${index + 1}`,
      siteCode: `TS${String(index + 1).padStart(2, '0')}`,
      location: `Location ${index + 1}`,
    })
  );
};

// User factories
export interface MockUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'operator',
  isActive: true,
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockUsers = (count: number = 3): MockUser[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockUser({
      id: `user-${index + 1}`,
      username: `testuser${index + 1}`,
      email: `test${index + 1}@example.com`,
      firstName: `User${index + 1}`,
      lastName: 'Test',
    })
  );
};

// Comment factories
export interface MockComment {
  id: string;
  documentType: string;
  documentId: string;
  content: string;
  type: 'GENERAL' | 'QUESTION' | 'ISSUE' | 'SUGGESTION';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  reactions: MockReaction[];
  replies?: MockComment[];
}

export interface MockReaction {
  id: string;
  commentId: string;
  userId: string;
  type: 'LIKE' | 'DISLIKE' | 'HEART' | 'THUMBS_UP';
  createdAt: string;
}

export const createMockReaction = (overrides: Partial<MockReaction> = {}): MockReaction => ({
  id: 'reaction-1',
  commentId: 'comment-1',
  userId: 'user-1',
  type: 'LIKE',
  createdAt: '2023-01-01T10:05:00Z',
  ...overrides,
});

export const createMockComment = (overrides: Partial<MockComment> = {}): MockComment => ({
  id: 'comment-1',
  documentType: 'work-instruction',
  documentId: 'doc-1',
  content: 'This is a test comment',
  type: 'GENERAL',
  authorId: 'user-1',
  authorName: 'John Doe',
  authorAvatar: 'https://example.com/avatar1.jpg',
  parentId: null,
  createdAt: '2023-01-01T10:00:00Z',
  updatedAt: '2023-01-01T10:00:00Z',
  reactions: [],
  replies: [],
  ...overrides,
});

export const createMockCommentThread = (count: number = 3): MockComment[] => {
  const parentComment = createMockComment();
  const replies = Array.from({ length: count - 1 }, (_, index) =>
    createMockComment({
      id: `comment-${index + 2}`,
      parentId: parentComment.id,
      authorId: `user-${index + 2}`,
      authorName: `User ${index + 2}`,
      content: `Reply ${index + 1} to the comment`,
    })
  );

  return [parentComment, ...replies];
};

// Equipment factories
export interface MockEquipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  location: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockEquipment = (overrides: Partial<MockEquipment> = {}): MockEquipment => ({
  id: 'equipment-1',
  name: 'Test Machine 1',
  type: 'CNC Machine',
  model: 'Model X1000',
  serialNumber: 'SN123456',
  location: 'Production Line A',
  status: 'ACTIVE',
  isActive: true,
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

// Work Order factories
export interface MockWorkOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockWorkOrder = (overrides: Partial<MockWorkOrder> = {}): MockWorkOrder => ({
  id: 'wo-1',
  orderNumber: 'WO-2023-001',
  productId: 'product-1',
  productName: 'Test Product',
  quantity: 100,
  priority: 'MEDIUM',
  status: 'PLANNED',
  scheduledStart: new Date('2023-01-02T08:00:00Z'),
  scheduledEnd: new Date('2023-01-02T17:00:00Z'),
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

// OEE Metrics factories
export interface MockOEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  timestamp: Date;
  equipmentId?: string;
  shiftId?: string;
}

export const createMockOEEMetrics = (overrides: Partial<MockOEEMetrics> = {}): MockOEEMetrics => ({
  availability: 85.5,
  performance: 92.0,
  quality: 96.5,
  oee: 75.8,
  timestamp: new Date('2023-01-01T12:00:00Z'),
  equipmentId: 'equipment-1',
  shiftId: 'shift-1',
  ...overrides,
});

// Production Summary factories
export interface MockProductionSummary {
  planned: number;
  actual: number;
  efficiency: number;
  variance: number;
  date: Date;
  shiftId?: string;
}

export const createMockProductionSummary = (overrides: Partial<MockProductionSummary> = {}): MockProductionSummary => ({
  planned: 100,
  actual: 85,
  efficiency: 85.0,
  variance: -15,
  date: new Date('2023-01-01T00:00:00Z'),
  shiftId: 'shift-1',
  ...overrides,
});

// Routing factories
export interface MockRouting {
  id: string;
  name: string;
  version: string;
  productId: string;
  isActive: boolean;
  operations: MockOperation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOperation {
  id: string;
  sequence: number;
  name: string;
  description: string;
  equipmentId: string;
  estimatedTime: number;
  instructions?: string;
}

export const createMockOperation = (overrides: Partial<MockOperation> = {}): MockOperation => ({
  id: 'operation-1',
  sequence: 1,
  name: 'Setup',
  description: 'Machine setup operation',
  equipmentId: 'equipment-1',
  estimatedTime: 30,
  instructions: 'Follow setup procedure A',
  ...overrides,
});

export const createMockRouting = (overrides: Partial<MockRouting> = {}): MockRouting => ({
  id: 'routing-1',
  name: 'Standard Assembly Routing',
  version: '1.0',
  productId: 'product-1',
  isActive: true,
  operations: [createMockOperation()],
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  ...overrides,
});

// Presence factories
export interface MockPresenceUser {
  userId: string;
  username: string;
  avatar?: string;
  lastSeen: Date;
  currentPage?: string;
  isActive: boolean;
}

export const createMockPresenceUser = (overrides: Partial<MockPresenceUser> = {}): MockPresenceUser => ({
  userId: 'user-1',
  username: 'testuser',
  avatar: 'https://example.com/avatar.jpg',
  lastSeen: new Date(),
  currentPage: '/dashboard',
  isActive: true,
  ...overrides,
});

export const createMockPresenceUsers = (count: number = 3): MockPresenceUser[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockPresenceUser({
      userId: `user-${index + 1}`,
      username: `user${index + 1}`,
      currentPage: index === 0 ? '/dashboard' : index === 1 ? '/work-orders' : '/equipment',
    })
  );
};

// Auth Store State factories
export interface MockAuthState {
  user: MockUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const createMockAuthState = (overrides: Partial<MockAuthState> = {}): MockAuthState => ({
  user: createMockUser(),
  token: 'mock-jwt-token',
  isAuthenticated: true,
  isLoading: false,
  error: null,
  ...overrides,
});

// Form data factories
export const createMockFormData = (fields: Record<string, any> = {}) => {
  const defaultData = {
    id: '',
    name: '',
    description: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultData, ...fields };
};

// Error factories
export const createMockError = (message: string = 'Test error', code?: string) => ({
  message,
  code,
  stack: 'Error stack trace...',
});

export const createMockApiError = (status: number = 500, message: string = 'API Error') => ({
  status,
  message,
  data: null,
  error: true,
});

// Utility to create arrays of mock data
export const createMockArray = <T>(factory: () => T, count: number): T[] => {
  return Array.from({ length: count }, factory);
};