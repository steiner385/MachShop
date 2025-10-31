# Andon System Developer Guide

## Table of Contents
- [Overview](#overview)
- [Development Environment](#development-environment)
- [Code Architecture](#code-architecture)
- [Database Schema](#database-schema)
- [Service Layer](#service-layer)
- [API Development](#api-development)
- [Frontend Components](#frontend-components)
- [Testing Strategy](#testing-strategy)
- [Extension Points](#extension-points)
- [Performance Optimization](#performance-optimization)
- [Security Implementation](#security-implementation)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)

## Overview

This guide provides comprehensive documentation for developers working on the Andon system. The system is built with TypeScript, React, Node.js, and Prisma ORM, following modern software engineering practices.

### Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React with TypeScript
- **State Management**: Zustand
- **API**: RESTful with JWT authentication
- **Testing**: Jest, React Testing Library
- **Build Tools**: Webpack, Babel, ESBuild

## Development Environment

### Prerequisites

```bash
# Required versions
Node.js: >= 18.0.0
npm: >= 9.0.0
PostgreSQL: >= 14.0
Redis: >= 6.0 (for caching/queues)
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/company/machshop3.git
cd machshop3

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Seed database with test data
npx prisma db seed

# Start development servers
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/machshop"

# Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRY="1d"

# Redis (for caching and queues)
REDIS_URL="redis://localhost:6379"

# Andon Configuration
ANDON_ESCALATION_INTERVAL=60000  # Check every minute
ANDON_MAX_ESCALATION_LEVELS=3
ANDON_DEFAULT_TIMEOUT_MINS=30

# Notifications
EMAIL_HOST="smtp.company.com"
EMAIL_PORT=587
EMAIL_USER="andon@company.com"
EMAIL_PASS="password"

SMS_PROVIDER="TWILIO"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+1234567890"

# Feature Flags
ENABLE_ANDON=true
ENABLE_NOTIFICATIONS=true
ENABLE_ESCALATIONS=true
```

## Code Architecture

### Directory Structure

```
MachShop3/
├── src/
│   ├── services/          # Business logic layer
│   │   ├── AndonService.ts
│   │   ├── AndonEscalationEngine.ts
│   │   └── NotificationService.ts
│   ├── routes/            # API endpoints
│   │   ├── andon.ts
│   │   └── andonConfig.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── utils/             # Utility functions
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── types/             # TypeScript type definitions
│       └── andon.d.ts
├── frontend/
│   └── src/
│       ├── components/    # React components
│       │   └── Andon/
│       ├── store/         # Zustand stores
│       │   ├── andonStore.ts
│       │   └── andonConfigStore.ts
│       ├── api/           # API client
│       │   └── andon.ts
│       └── types/         # Frontend types
│           └── andon.ts
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seeds/             # Seed data
│       └── seed-andon.ts
└── tests/                 # Test files
    ├── unit/
    └── integration/
```

### Design Patterns

#### Service Pattern

Services encapsulate business logic:

```typescript
// services/AndonService.ts
export class AndonService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createAlert(data: CreateAndonAlertData): Promise<AndonAlert> {
    // Validation
    this.validateAlertData(data);

    // Business logic
    const alertNumber = await this.generateAlertNumber();

    // Database operation
    const alert = await this.prisma.andonAlert.create({
      data: {
        ...data,
        alertNumber,
        status: AndonAlertStatus.OPEN
      }
    });

    // Side effects
    await this.triggerEscalationCheck(alert.id);

    return alert;
  }
}
```

#### Repository Pattern

Data access abstraction:

```typescript
// repositories/AndonAlertRepository.ts
export class AndonAlertRepository {
  async findById(id: string): Promise<AndonAlert | null> {
    return prisma.andonAlert.findUnique({
      where: { id },
      include: this.getDefaultIncludes()
    });
  }

  async findMany(filters: AndonAlertFilters): Promise<AndonAlert[]> {
    return prisma.andonAlert.findMany({
      where: this.buildWhereClause(filters),
      include: this.getDefaultIncludes(),
      orderBy: { createdAt: 'desc' }
    });
  }

  private getDefaultIncludes() {
    return {
      issueType: true,
      site: true,
      workCenter: true,
      raisedBy: true,
      assignedTo: true
    };
  }
}
```

#### Factory Pattern

Object creation:

```typescript
// factories/AlertFactory.ts
export class AlertFactory {
  static async createFromIssueType(
    issueTypeId: string,
    data: Partial<CreateAndonAlertData>
  ): Promise<AndonAlert> {
    const issueType = await prisma.andonIssueType.findUnique({
      where: { id: issueTypeId }
    });

    if (!issueType) {
      throw new Error('Issue type not found');
    }

    return AndonService.createAlert({
      ...data,
      issueTypeId,
      severity: data.severity || issueType.defaultSeverity,
      priority: data.priority || issueType.defaultPriority
    });
  }
}
```

## Database Schema

### Core Models

#### AndonAlert

```prisma
model AndonAlert {
  id                    String              @id @default(cuid())
  alertNumber           String              @unique
  title                 String
  description           String?

  // Classification
  issueTypeId           String
  severity              AndonSeverity
  priority              AndonPriority

  // Context
  siteId                String?
  areaId                String?
  workCenterId          String?
  equipmentId           String?
  workOrderId           String?

  // Status
  status                AndonAlertStatus
  statusHistory         Json[]

  // Escalation
  currentEscalationLevel Int                @default(0)
  nextEscalationAt      DateTime?

  // Timing
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  issueType             AndonIssueType      @relation(...)
  site                  Site?               @relation(...)
  // ... other relations
}
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_andon_models

# Apply migrations to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Query Optimization

```typescript
// Optimized query with selective loading
const alerts = await prisma.andonAlert.findMany({
  where: {
    status: { in: ['OPEN', 'IN_PROGRESS'] },
    severity: 'CRITICAL'
  },
  select: {
    id: true,
    alertNumber: true,
    title: true,
    status: true,
    issueType: {
      select: {
        typeName: true,
        colorCode: true
      }
    }
  },
  take: 50,
  orderBy: { createdAt: 'desc' }
});
```

## Service Layer

### AndonService Implementation

```typescript
// services/AndonService.ts
export class AndonService {
  // Alert number generation with transaction
  async generateAlertNumber(): Promise<string> {
    const result = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const lastAlert = await tx.andonAlert.findFirst({
        where: {
          alertNumber: {
            startsWith: `AND-${year}-`
          }
        },
        orderBy: {
          alertNumber: 'desc'
        }
      });

      let sequence = 1;
      if (lastAlert) {
        const lastSequence = parseInt(
          lastAlert.alertNumber.split('-')[2]
        );
        sequence = lastSequence + 1;
      }

      return `AND-${year}-${sequence.toString().padStart(6, '0')}`;
    });

    return result;
  }

  // Complex filtering logic
  async getAlerts(filters: AndonAlertFilters): Promise<{
    data: AndonAlert[];
    pagination: PaginationInfo;
  }> {
    const where: Prisma.AndonAlertWhereInput = {
      ...(filters.status && {
        status: { in: filters.status }
      }),
      ...(filters.severity && {
        severity: { in: filters.severity }
      }),
      ...(filters.dateFrom && {
        createdAt: { gte: filters.dateFrom }
      }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { alertNumber: { contains: filters.search } }
        ]
      })
    };

    const [data, total] = await Promise.all([
      prisma.andonAlert.findMany({
        where,
        include: this.getIncludes(filters.includeRelations),
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.andonAlert.count({ where })
    ]);

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }
}
```

### AndonEscalationEngine

```typescript
// services/AndonEscalationEngine.ts
export class AndonEscalationEngine {
  private isProcessing = false;

  async startEngine(): Promise<void> {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processEscalations();
      }
    }, ESCALATION_INTERVAL);
  }

  async processEscalations(): Promise<void> {
    this.isProcessing = true;

    try {
      // Get alerts needing escalation
      const alerts = await this.getAlertsForEscalation();

      // Process in batches
      const batches = chunk(alerts, BATCH_SIZE);
      for (const batch of batches) {
        await Promise.all(
          batch.map(alert => this.processAlert(alert))
        );
      }
    } catch (error) {
      logger.error('Escalation processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAlert(alert: AndonAlert): Promise<void> {
    // Find applicable rules
    const rules = await this.findApplicableRules(alert);

    // Execute rules
    for (const rule of rules) {
      await this.executeRule(alert, rule);
    }

    // Update next escalation time
    await this.updateNextEscalation(alert);
  }

  private async executeRule(
    alert: AndonAlert,
    rule: AndonEscalationRule
  ): Promise<void> {
    const actions = [];

    // Notify users
    if (rule.notifyUserIds?.length) {
      actions.push(
        this.notifyUsers(alert, rule.notifyUserIds, rule.notifyChannels)
      );
    }

    // Notify roles
    if (rule.notifyRoles?.length) {
      const users = await this.getUsersByRoles(rule.notifyRoles);
      actions.push(
        this.notifyUsers(alert, users, rule.notifyChannels)
      );
    }

    // Reassign alert
    if (rule.assignToUserId || rule.assignToRole) {
      actions.push(this.reassignAlert(alert, rule));
    }

    // Execute all actions
    await Promise.all(actions);

    // Log execution
    await this.logRuleExecution(alert, rule);
  }
}
```

## API Development

### Route Implementation

```typescript
// routes/andon.ts
import { Router } from 'express';
import { z } from 'zod';
import { AndonService } from '../services/AndonService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();
const andonService = new AndonService();

// Create alert with validation
router.post(
  '/alerts',
  authenticate,
  validate(createAlertSchema),
  async (req, res, next) => {
    try {
      const alert = await andonService.createAlert({
        ...req.body,
        raisedById: req.user.id
      });

      res.status(201).json(alert);
    } catch (error) {
      next(error);
    }
  }
);

// Get alerts with pagination
router.get('/alerts', authenticate, async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status?.split(','),
      severity: req.query.severity?.split(','),
      page: parseInt(req.query.page || '1'),
      limit: parseInt(req.query.limit || '20'),
      search: req.query.search
    };

    const result = await andonService.getAlerts(filters);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update alert with authorization
router.put(
  '/alerts/:id',
  authenticate,
  authorize('UPDATE_ALERT'),
  validate(updateAlertSchema),
  async (req, res, next) => {
    try {
      const alert = await andonService.updateAlert(
        req.params.id,
        req.body
      );

      res.json(alert);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Middleware Implementation

```typescript
// middleware/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  if (err instanceof ValidationError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details
      }
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message
      }
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: err.message
      }
    });
  }

  // Default error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  });
};
```

## Frontend Components

### React Component Architecture

```typescript
// components/Andon/AndonShopFloor.tsx
import React, { useState, useEffect } from 'react';
import { useAndonStore } from '../../store/andonStore';
import { AndonIssueType, AndonSeverity } from '../../types/andon';
import './AndonShopFloor.styles.css';

interface AndonShopFloorProps {
  workCenterId?: string;
  equipmentId?: string;
}

export const AndonShopFloor: React.FC<AndonShopFloorProps> = ({
  workCenterId,
  equipmentId
}) => {
  const {
    issueTypes,
    createAlert,
    loading,
    error
  } = useAndonStore();

  const [selectedIssueType, setSelectedIssueType] =
    useState<AndonIssueType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: AndonSeverity.MEDIUM,
    attachments: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIssueType) {
      return;
    }

    try {
      await createAlert({
        ...formData,
        issueTypeId: selectedIssueType.id,
        workCenterId,
        equipmentId
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        severity: AndonSeverity.MEDIUM,
        attachments: []
      });
      setSelectedIssueType(null);

      // Show success message
      showToast('Alert created successfully', 'success');
    } catch (error) {
      showToast('Failed to create alert', 'error');
    }
  };

  return (
    <div className="andon-shop-floor">
      {/* Issue type selection */}
      <div className="issue-type-grid">
        {issueTypes.map(type => (
          <button
            key={type.id}
            className={`issue-type-button ${
              selectedIssueType?.id === type.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedIssueType(type)}
            style={{
              backgroundColor: type.colorCode
            }}
          >
            <div className="issue-type-icon">
              {type.iconName}
            </div>
            <div className="issue-type-name">
              {type.typeName}
            </div>
          </button>
        ))}
      </div>

      {/* Alert form */}
      {selectedIssueType && (
        <form onSubmit={handleSubmit} className="alert-form">
          <input
            type="text"
            placeholder="Brief description of the issue"
            value={formData.title}
            onChange={(e) => setFormData({
              ...formData,
              title: e.target.value
            })}
            required
            className="alert-title-input"
          />

          <textarea
            placeholder="Additional details (optional)"
            value={formData.description}
            onChange={(e) => setFormData({
              ...formData,
              description: e.target.value
            })}
            className="alert-description-input"
          />

          <div className="severity-selector">
            {Object.values(AndonSeverity).map(severity => (
              <button
                key={severity}
                type="button"
                className={`severity-button ${
                  formData.severity === severity ? 'selected' : ''
                }`}
                onClick={() => setFormData({
                  ...formData,
                  severity
                })}
              >
                {severity}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      )}
    </div>
  );
};
```

### Zustand Store

```typescript
// store/andonStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AndonAPI } from '../api/andon';
import {
  AndonAlert,
  AndonIssueType,
  CreateAlertData
} from '../types/andon';

interface AndonStore {
  // State
  alerts: AndonAlert[];
  activeAlerts: AndonAlert[];
  issueTypes: AndonIssueType[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchAlerts: (filters?: any) => Promise<void>;
  createAlert: (data: CreateAlertData) => Promise<AndonAlert>;
  updateAlert: (id: string, data: any) => Promise<void>;
  resolveAlert: (id: string, notes: string) => Promise<void>;
  fetchIssueTypes: () => Promise<void>;

  // Real-time updates
  handleAlertUpdate: (alert: AndonAlert) => void;
  handleAlertEscalation: (alertId: string, level: number) => void;
}

export const useAndonStore = create<AndonStore>()(
  devtools(
    (set, get) => ({
      alerts: [],
      activeAlerts: [],
      issueTypes: [],
      loading: false,
      error: null,

      fetchAlerts: async (filters) => {
        set({ loading: true, error: null });
        try {
          const response = await AndonAPI.getAlerts(filters);
          set({
            alerts: response.data,
            activeAlerts: response.data.filter(
              a => ['OPEN', 'IN_PROGRESS'].includes(a.status)
            )
          });
        } catch (error) {
          set({ error: error.message });
        } finally {
          set({ loading: false });
        }
      },

      createAlert: async (data) => {
        set({ loading: true, error: null });
        try {
          const alert = await AndonAPI.createAlert(data);
          set(state => ({
            alerts: [alert, ...state.alerts],
            activeAlerts: [alert, ...state.activeAlerts]
          }));
          return alert;
        } catch (error) {
          set({ error: error.message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateAlert: async (id, data) => {
        const alert = await AndonAPI.updateAlert(id, data);
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === id ? alert : a
          ),
          activeAlerts: state.activeAlerts.map(a =>
            a.id === id ? alert : a
          )
        }));
      },

      resolveAlert: async (id, notes) => {
        const alert = await AndonAPI.resolveAlert(id, notes);
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === id ? alert : a
          ),
          activeAlerts: state.activeAlerts.filter(a => a.id !== id)
        }));
      },

      fetchIssueTypes: async () => {
        const issueTypes = await AndonAPI.getIssueTypes();
        set({ issueTypes });
      },

      handleAlertUpdate: (alert) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alert.id ? alert : a
          )
        }));
      },

      handleAlertEscalation: (alertId, level) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alertId
              ? { ...a, currentEscalationLevel: level }
              : a
          )
        }));
      }
    }),
    {
      name: 'andon-store'
    }
  )
);
```

## Testing Strategy

### Unit Testing

```typescript
// tests/services/AndonService.test.ts
import { AndonService } from '../../src/services/AndonService';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('AndonService', () => {
  let service: AndonService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new AndonService();
  });

  describe('createAlert', () => {
    it('should create alert with generated number', async () => {
      const mockAlert = {
        id: 'alert-123',
        alertNumber: 'AND-2024-000001',
        title: 'Test Alert',
        status: 'OPEN'
      };

      prisma.andonAlert.create.mockResolvedValue(mockAlert);

      const result = await service.createAlert({
        title: 'Test Alert',
        issueTypeId: 'type-123',
        raisedById: 'user-123'
      });

      expect(result).toEqual(mockAlert);
      expect(prisma.andonAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Alert',
            alertNumber: expect.stringMatching(/^AND-\d{4}-\d{6}$/)
          })
        })
      );
    });

    it('should trigger escalation check after creation', async () => {
      const spy = jest.spyOn(service, 'triggerEscalationCheck');

      await service.createAlert({
        title: 'Test Alert',
        issueTypeId: 'type-123',
        raisedById: 'user-123'
      });

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getAlerts', () => {
    it('should filter by status', async () => {
      const mockAlerts = [
        { id: '1', status: 'OPEN' },
        { id: '2', status: 'OPEN' }
      ];

      prisma.andonAlert.findMany.mockResolvedValue(mockAlerts);
      prisma.andonAlert.count.mockResolvedValue(2);

      const result = await service.getAlerts({
        status: ['OPEN'],
        page: 1,
        limit: 10
      });

      expect(result.data).toEqual(mockAlerts);
      expect(prisma.andonAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['OPEN'] }
          })
        })
      );
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/andon.integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Andon API Integration', () => {
  let authToken: string;
  let testAlert: any;

  beforeAll(async () => {
    // Setup test data
    await prisma.$executeRaw`TRUNCATE TABLE andon_alerts CASCADE`;

    // Get auth token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test@example.com',
        password: 'password'
      });

    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/andon/alerts', () => {
    it('should create a new alert', async () => {
      const response = await request(app)
        .post('/api/andon/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Alert',
          issueTypeId: 'test-issue-type',
          severity: 'HIGH',
          raisedById: 'test-user'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.alertNumber).toMatch(/^AND-\d{4}-\d{6}$/);
      expect(response.body.status).toBe('OPEN');

      testAlert = response.body;
    });
  });

  describe('GET /api/andon/alerts', () => {
    it('should list alerts with pagination', async () => {
      const response = await request(app)
        .get('/api/andon/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10,
          status: 'OPEN'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /api/andon/alerts/:id', () => {
    it('should update an alert', async () => {
      const response = await request(app)
        .put(`/api/andon/alerts/${testAlert.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
          assignedToId: 'assigned-user'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('IN_PROGRESS');
      expect(response.body.assignedToId).toBe('assigned-user');
    });
  });

  describe('POST /api/andon/alerts/:id/resolve', () => {
    it('should resolve an alert', async () => {
      const response = await request(app)
        .post(`/api/andon/alerts/${testAlert.id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resolutionNotes: 'Issue resolved',
          resolutionActionTaken: 'Fixed the problem'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('RESOLVED');
      expect(response.body.resolutionNotes).toBe('Issue resolved');
    });
  });
});
```

### Component Testing

```typescript
// tests/components/AndonShopFloor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AndonShopFloor } from '../../src/components/Andon/AndonShopFloor';
import { useAndonStore } from '../../src/store/andonStore';

jest.mock('../../src/store/andonStore');

describe('AndonShopFloor Component', () => {
  const mockCreateAlert = jest.fn();
  const mockIssueTypes = [
    {
      id: 'type-1',
      typeName: 'Equipment',
      typeCode: 'EQUIPMENT',
      colorCode: '#FF0000'
    },
    {
      id: 'type-2',
      typeName: 'Quality',
      typeCode: 'QUALITY',
      colorCode: '#00FF00'
    }
  ];

  beforeEach(() => {
    (useAndonStore as jest.Mock).mockReturnValue({
      issueTypes: mockIssueTypes,
      createAlert: mockCreateAlert,
      loading: false,
      error: null
    });
  });

  it('should render issue type buttons', () => {
    render(<AndonShopFloor />);

    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('should show form when issue type is selected', () => {
    render(<AndonShopFloor />);

    fireEvent.click(screen.getByText('Equipment'));

    expect(screen.getByPlaceholderText(
      'Brief description of the issue'
    )).toBeInTheDocument();
  });

  it('should create alert on form submission', async () => {
    render(<AndonShopFloor />);

    // Select issue type
    fireEvent.click(screen.getByText('Equipment'));

    // Fill form
    const titleInput = screen.getByPlaceholderText(
      'Brief description of the issue'
    );
    fireEvent.change(titleInput, {
      target: { value: 'Test Alert' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Create Alert'));

    await waitFor(() => {
      expect(mockCreateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Alert',
          issueTypeId: 'type-1'
        })
      );
    });
  });
});
```

## Extension Points

### Adding Custom Issue Types

```typescript
// extensions/CustomIssueTypes.ts
export interface CustomIssueType extends AndonIssueType {
  customField?: string;
  customBehavior?: () => void;
}

export class CustomIssueTypeHandler {
  async handleCustomType(
    alert: AndonAlert,
    issueType: CustomIssueType
  ): Promise<void> {
    // Custom logic for specific issue types
    if (issueType.typeCode === 'CUSTOM_SAFETY') {
      await this.notifyEmergencyContacts(alert);
      await this.lockoutEquipment(alert.equipmentId);
    }

    // Execute custom behavior
    if (issueType.customBehavior) {
      issueType.customBehavior();
    }
  }
}
```

### Custom Notification Channels

```typescript
// extensions/NotificationChannels.ts
export interface NotificationChannel {
  name: string;
  send(alert: AndonAlert, recipients: string[]): Promise<void>;
}

export class TeamsNotificationChannel implements NotificationChannel {
  name = 'TEAMS';

  async send(alert: AndonAlert, recipients: string[]): Promise<void> {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

    const message = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      'summary': `Alert: ${alert.title}`,
      'sections': [{
        'activityTitle': alert.title,
        'activitySubtitle': `Severity: ${alert.severity}`,
        'facts': [
          { 'name': 'Alert Number', 'value': alert.alertNumber },
          { 'name': 'Location', 'value': alert.workCenter?.name }
        ]
      }]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
}

// Register channel
NotificationService.registerChannel(new TeamsNotificationChannel());
```

### Custom Escalation Rules

```typescript
// extensions/CustomEscalationRules.ts
export class CustomEscalationRule {
  async evaluate(alert: AndonAlert): Promise<boolean> {
    // Custom rule logic
    if (alert.severity === 'CRITICAL' &&
        alert.issueType.typeCode === 'SAFETY') {
      // Check shift schedule
      const currentShift = await this.getCurrentShift();

      // Different escalation for night shift
      if (currentShift === 'NIGHT') {
        return true;
      }
    }

    return false;
  }

  async execute(alert: AndonAlert): Promise<void> {
    // Custom escalation actions
    await this.pageOnCallEngineer(alert);
    await this.createIncidentTicket(alert);
    await this.notifyExecutiveTeam(alert);
  }
}
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_alerts_status_severity
ON andon_alerts(status, severity)
WHERE status IN ('OPEN', 'IN_PROGRESS');

CREATE INDEX idx_alerts_escalation
ON andon_alerts(next_escalation_at)
WHERE status != 'CLOSED';

-- Partial indexes for active records
CREATE INDEX idx_issue_types_active
ON andon_issue_types(type_code)
WHERE is_active = true;

-- Composite indexes for filtering
CREATE INDEX idx_alerts_filter
ON andon_alerts(site_id, work_center_id, created_at DESC);
```

### Query Optimization

```typescript
// Optimized query with selective fields
const getActiveAlerts = async () => {
  return prisma.andonAlert.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] }
    },
    select: {
      id: true,
      alertNumber: true,
      title: true,
      status: true,
      severity: true,
      createdAt: true,
      issueType: {
        select: {
          typeName: true,
          colorCode: true
        }
      }
    }
  });
};

// Use raw SQL for complex aggregations
const getStatistics = async () => {
  return prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', created_at) as date,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved,
      AVG(resolution_time) as avg_resolution
    FROM andon_alerts
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `;
};
```

### Caching Strategy

```typescript
// services/CacheService.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl = 300
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate and cache
    const value = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(value));

    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}

// Usage in service
const getIssueTypes = async () => {
  return cache.getOrSet(
    'andon:issue-types',
    () => prisma.andonIssueType.findMany({ where: { isActive: true } }),
    600 // 10 minutes
  );
};
```

## Security Implementation

### Input Validation

```typescript
// validation/schemas.ts
import { z } from 'zod';

export const createAlertSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform(val => sanitizeHtml(val)),

  description: z.string()
    .max(1000, 'Description too long')
    .optional()
    .transform(val => val ? sanitizeHtml(val) : val),

  issueTypeId: z.string()
    .uuid('Invalid issue type ID'),

  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),

  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']),

  metadata: z.record(z.any())
    .optional()
    .refine(val => {
      // Prevent injection attacks
      const jsonStr = JSON.stringify(val);
      return !jsonStr.includes('<script>');
    }, 'Invalid metadata')
});
```

### Authorization

```typescript
// middleware/authorization.ts
export const authorize = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const resource = req.params.id;

    // Check permissions
    const hasPermission = await checkPermission(user, action, resource);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Permission checking
const checkPermission = async (
  user: User,
  action: string,
  resourceId?: string
): Promise<boolean> => {
  // Role-based permissions
  const rolePermissions = {
    ADMIN: ['*'],
    SUPERVISOR: ['CREATE_ALERT', 'UPDATE_ALERT', 'RESOLVE_ALERT'],
    OPERATOR: ['CREATE_ALERT', 'VIEW_ALERT']
  };

  if (rolePermissions[user.role]?.includes('*')) {
    return true;
  }

  if (rolePermissions[user.role]?.includes(action)) {
    // Additional resource-level checks
    if (resourceId) {
      const alert = await prisma.andonAlert.findUnique({
        where: { id: resourceId }
      });

      // Check ownership or assignment
      if (action === 'UPDATE_ALERT') {
        return alert?.assignedToId === user.id ||
               alert?.raisedById === user.id;
      }
    }

    return true;
  }

  return false;
};
```

## Debugging and Troubleshooting

### Logging Strategy

```typescript
// utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'logs/andon-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/andon-combined.log'
    })
  ]
});

// Structured logging
logger.info('Alert created', {
  alertId: alert.id,
  alertNumber: alert.alertNumber,
  severity: alert.severity,
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

### Debug Utilities

```typescript
// utils/debug.ts
export class DebugHelper {
  static async inspectAlert(alertId: string): Promise<void> {
    const alert = await prisma.andonAlert.findUnique({
      where: { id: alertId },
      include: {
        issueType: true,
        statusHistory: true,
        escalationHistory: true,
        escalationRuleResults: {
          include: {
            rule: true
          }
        }
      }
    });

    console.log('Alert Details:', JSON.stringify(alert, null, 2));
  }

  static async testEscalation(alertId: string): Promise<void> {
    const engine = new AndonEscalationEngine();
    const alert = await prisma.andonAlert.findUnique({
      where: { id: alertId }
    });

    const rules = await engine.findApplicableRules(alert);
    console.log('Applicable Rules:', rules);

    for (const rule of rules) {
      console.log(`Testing rule: ${rule.ruleName}`);
      const wouldTrigger = await engine.evaluateRule(alert, rule);
      console.log(`Would trigger: ${wouldTrigger}`);
    }
  }
}

// Usage
await DebugHelper.inspectAlert('alert-123');
await DebugHelper.testEscalation('alert-123');
```

### Performance Profiling

```typescript
// utils/profiler.ts
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      throw new Error(`Mark ${startMark} not found`);
    }

    const duration = performance.now() - start;
    logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);

    return duration;
  }
}

// Usage
const profiler = new PerformanceProfiler();

profiler.mark('fetchAlerts');
const alerts = await andonService.getAlerts(filters);
profiler.measure('Alert fetch', 'fetchAlerts');
```

---

*For additional development resources, refer to the project Wiki and API documentation.*