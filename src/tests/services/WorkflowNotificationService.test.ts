/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * Comprehensive unit tests for WorkflowNotificationService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient, WorkflowEventType } from '@prisma/client';
import { WorkflowNotificationService } from '@/services/WorkflowNotificationService';

// Mock logger to avoid config validation issues
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock email service
const mockEmailService = {
  sendEmail: vi.fn(),
  sendBatchEmails: vi.fn(),
};

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    workflowInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    workflowAssignment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workflowHistory: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notificationTemplate: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    WorkflowEventType: {
      WORKFLOW_STARTED: 'WORKFLOW_STARTED',
      STAGE_STARTED: 'STAGE_STARTED',
      ASSIGNMENT_CREATED: 'ASSIGNMENT_CREATED',
      APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
      APPROVAL_SUBMITTED: 'APPROVAL_SUBMITTED',
      STAGE_COMPLETED: 'STAGE_COMPLETED',
      WORKFLOW_COMPLETED: 'WORKFLOW_COMPLETED',
      DEADLINE_APPROACHING: 'DEADLINE_APPROACHING',
      DEADLINE_EXCEEDED: 'DEADLINE_EXCEEDED',
      WORKFLOW_ESCALATED: 'WORKFLOW_ESCALATED',
      WORKFLOW_CANCELLED: 'WORKFLOW_CANCELLED',
    },
  };
});

describe('WorkflowNotificationService', () => {
  let workflowNotificationService: WorkflowNotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    workflowNotificationService = new WorkflowNotificationService(mockPrisma);

    // Replace the email service with mock
    (workflowNotificationService as any).emailService = mockEmailService;

    // Setup transaction mock
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockPrisma);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendWorkflowStartedNotification', () => {
    it('should send notification when workflow starts', async () => {
      const workflowInstanceId = 'workflow-1';

      const mockWorkflowInstance = {
        id: workflowInstanceId,
        entityType: 'work_instruction',
        entityId: 'entity-1',
        priority: 'HIGH',
        workflowDefinition: {
          name: 'Quality Review Workflow',
          workflowType: 'QUALITY_REVIEW'
        },
        requestedBy: {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        stageInstances: [
          {
            assignments: [
              {
                assignedTo: {
                  id: 'user-2',
                  email: 'user2@example.com',
                  firstName: 'Jane',
                  lastName: 'Smith'
                }
              }
            ]
          }
        ]
      };

      const mockTemplate = {
        id: 'template-1',
        subject: 'Workflow Started: {{workflowName}}',
        htmlContent: '<h1>Workflow {{workflowName}} has started</h1>',
        textContent: 'Workflow {{workflowName}} has started'
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockWorkflowInstance);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendBatchEmails.mockResolvedValue({ success: true });

      await workflowNotificationService.sendWorkflowStartedNotification(workflowInstanceId);

      expect(mockPrisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: workflowInstanceId },
        include: {
          workflowDefinition: true,
          requestedBy: true,
          stageInstances: {
            include: {
              assignments: {
                include: {
                  assignedTo: true
                }
              }
            }
          }
        }
      });

      expect(mockEmailService.sendBatchEmails).toHaveBeenCalledWith([
        {
          to: 'user1@example.com',
          subject: 'Workflow Started: Quality Review Workflow',
          html: '<h1>Workflow Quality Review Workflow has started</h1>',
          text: 'Workflow Quality Review Workflow has started'
        },
        {
          to: 'user2@example.com',
          subject: 'Workflow Started: Quality Review Workflow',
          html: '<h1>Workflow Quality Review Workflow has started</h1>',
          text: 'Workflow Quality Review Workflow has started'
        }
      ]);
    });

    it('should handle missing workflow instance', async () => {
      const workflowInstanceId = 'non-existent';
      mockPrisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(
        workflowNotificationService.sendWorkflowStartedNotification(workflowInstanceId)
      ).rejects.toThrow('Workflow instance non-existent not found');
    });
  });

  describe('sendAssignmentNotification', () => {
    it('should send assignment notification to assignee', async () => {
      const assignmentId = 'assignment-1';

      const mockAssignment = {
        id: assignmentId,
        assignedTo: {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        stageInstance: {
          stageName: 'Initial Review',
          deadline: new Date('2024-12-31T23:59:59Z'),
          workflowInstance: {
            id: 'workflow-1',
            entityType: 'work_instruction',
            priority: 'HIGH',
            workflowDefinition: {
              name: 'Quality Review Workflow'
            }
          }
        }
      };

      const mockTemplate = {
        subject: 'New Assignment: {{stageName}}',
        htmlContent: '<p>You have been assigned to {{stageName}}</p>',
        textContent: 'You have been assigned to {{stageName}}'
      };

      mockPrisma.workflowAssignment.findMany.mockResolvedValue([mockAssignment]);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      await workflowNotificationService.sendAssignmentNotification(assignmentId);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'user1@example.com',
        subject: 'New Assignment: Initial Review',
        html: '<p>You have been assigned to Initial Review</p>',
        text: 'You have been assigned to Initial Review'
      });
    });
  });

  describe('sendDeadlineReminder', () => {
    it('should send deadline reminder to pending assignments', async () => {
      const workflowInstanceId = 'workflow-1';

      const mockPendingAssignments = [
        {
          id: 'assignment-1',
          assignedTo: {
            email: 'user1@example.com',
            firstName: 'John'
          },
          stageInstance: {
            stageName: 'Review',
            deadline: new Date('2024-12-31T23:59:59Z'),
            workflowInstance: {
              workflowDefinition: {
                name: 'Quality Review'
              }
            }
          }
        }
      ];

      const mockTemplate = {
        subject: 'Deadline Reminder: {{stageName}}',
        htmlContent: '<p>Reminder: {{stageName}} deadline approaching</p>',
        textContent: 'Reminder: {{stageName}} deadline approaching'
      };

      mockPrisma.workflowAssignment.findMany.mockResolvedValue(mockPendingAssignments);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendBatchEmails.mockResolvedValue({ success: true });

      await workflowNotificationService.sendDeadlineReminder(workflowInstanceId);

      expect(mockPrisma.workflowAssignment.findMany).toHaveBeenCalledWith({
        where: {
          stageInstance: {
            workflowInstanceId,
            status: 'IN_PROGRESS'
          },
          action: null
        },
        include: {
          assignedTo: true,
          stageInstance: {
            include: {
              workflowInstance: {
                include: {
                  workflowDefinition: true
                }
              }
            }
          }
        }
      });

      expect(mockEmailService.sendBatchEmails).toHaveBeenCalledWith([
        {
          to: 'user1@example.com',
          subject: 'Deadline Reminder: Review',
          html: '<p>Reminder: Review deadline approaching</p>',
          text: 'Reminder: Review deadline approaching'
        }
      ]);
    });
  });

  describe('sendEscalationNotification', () => {
    it('should send escalation notification to supervisors', async () => {
      const assignmentId = 'assignment-1';
      const escalationLevel = 1;

      const mockAssignment = {
        id: assignmentId,
        assignedTo: {
          id: 'user-1',
          email: 'user1@example.com',
          supervisorId: 'supervisor-1'
        },
        stageInstance: {
          stageName: 'Review',
          workflowInstance: {
            workflowDefinition: {
              name: 'Quality Review'
            }
          }
        }
      };

      const mockSupervisor = {
        id: 'supervisor-1',
        email: 'supervisor@example.com',
        firstName: 'Jane',
        lastName: 'Manager'
      };

      const mockTemplate = {
        subject: 'Escalation: {{stageName}}',
        htmlContent: '<p>Assignment {{stageName}} has been escalated</p>',
        textContent: 'Assignment {{stageName}} has been escalated'
      };

      mockPrisma.workflowAssignment.findMany.mockResolvedValue([mockAssignment]);
      mockPrisma.user.findUnique.mockResolvedValue(mockSupervisor);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendEmail.mockResolvedValue({ success: true });

      await workflowNotificationService.sendEscalationNotification(assignmentId, escalationLevel);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'supervisor@example.com',
        subject: 'Escalation: Review',
        html: '<p>Assignment Review has been escalated</p>',
        text: 'Assignment Review has been escalated'
      });
    });
  });

  describe('sendWorkflowCompletedNotification', () => {
    it('should send completion notification to all participants', async () => {
      const workflowInstanceId = 'workflow-1';

      const mockWorkflowInstance = {
        id: workflowInstanceId,
        status: 'COMPLETED',
        completedAt: new Date('2024-12-25T10:00:00Z'),
        workflowDefinition: {
          name: 'Quality Review Workflow'
        },
        requestedBy: {
          email: 'requester@example.com'
        }
      };

      const mockParticipants = [
        {
          assignedTo: {
            email: 'user1@example.com'
          }
        },
        {
          assignedTo: {
            email: 'user2@example.com'
          }
        }
      ];

      const mockTemplate = {
        subject: 'Workflow Completed: {{workflowName}}',
        htmlContent: '<p>Workflow {{workflowName}} has been completed</p>',
        textContent: 'Workflow {{workflowName}} has been completed'
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockWorkflowInstance);
      mockPrisma.workflowAssignment.findMany.mockResolvedValue(mockParticipants);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendBatchEmails.mockResolvedValue({ success: true });

      await workflowNotificationService.sendWorkflowCompletedNotification(workflowInstanceId);

      expect(mockEmailService.sendBatchEmails).toHaveBeenCalledWith([
        {
          to: 'requester@example.com',
          subject: 'Workflow Completed: Quality Review Workflow',
          html: '<p>Workflow Quality Review Workflow has been completed</p>',
          text: 'Workflow Quality Review Workflow has been completed'
        },
        {
          to: 'user1@example.com',
          subject: 'Workflow Completed: Quality Review Workflow',
          html: '<p>Workflow Quality Review Workflow has been completed</p>',
          text: 'Workflow Quality Review Workflow has been completed'
        },
        {
          to: 'user2@example.com',
          subject: 'Workflow Completed: Quality Review Workflow',
          html: '<p>Workflow Quality Review Workflow has been completed</p>',
          text: 'Workflow Quality Review Workflow has been completed'
        }
      ]);
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send bulk notifications efficiently', async () => {
      const notificationInputs = [
        {
          workflowInstanceId: 'workflow-1',
          eventType: 'DEADLINE_APPROACHING' as const,
          recipients: ['user1@example.com', 'user2@example.com'],
          metadata: { hoursRemaining: 24 }
        },
        {
          workflowInstanceId: 'workflow-2',
          eventType: 'APPROVAL_REQUIRED' as const,
          recipients: ['user3@example.com'],
          metadata: { stageName: 'Final Review' }
        }
      ];

      const mockTemplate1 = {
        subject: 'Deadline Approaching',
        htmlContent: '<p>Deadline in {{hoursRemaining}} hours</p>',
        textContent: 'Deadline in {{hoursRemaining}} hours'
      };

      const mockTemplate2 = {
        subject: 'Approval Required',
        htmlContent: '<p>Approval required for {{stageName}}</p>',
        textContent: 'Approval required for {{stageName}}'
      };

      mockPrisma.notificationTemplate.findFirst
        .mockResolvedValueOnce(mockTemplate1)
        .mockResolvedValueOnce(mockTemplate2);

      mockEmailService.sendBatchEmails.mockResolvedValue({ success: true });

      await workflowNotificationService.sendBulkNotifications(notificationInputs);

      expect(mockEmailService.sendBatchEmails).toHaveBeenCalledWith([
        {
          to: 'user1@example.com',
          subject: 'Deadline Approaching',
          html: '<p>Deadline in 24 hours</p>',
          text: 'Deadline in 24 hours'
        },
        {
          to: 'user2@example.com',
          subject: 'Deadline Approaching',
          html: '<p>Deadline in 24 hours</p>',
          text: 'Deadline in 24 hours'
        },
        {
          to: 'user3@example.com',
          subject: 'Approval Required',
          html: '<p>Approval required for Final Review</p>',
          text: 'Approval required for Final Review'
        }
      ]);
    });
  });

  describe('logNotificationEvent', () => {
    it('should log notification events to database', async () => {
      const eventData = {
        workflowInstanceId: 'workflow-1',
        eventType: 'WORKFLOW_STARTED' as const,
        recipientId: 'user-1',
        notificationChannel: 'EMAIL' as const,
        metadata: { templateId: 'template-1' }
      };

      mockPrisma.workflowHistory.create.mockResolvedValue({
        id: 'history-1',
        ...eventData
      });

      await workflowNotificationService.logNotificationEvent(eventData);

      expect(mockPrisma.workflowHistory.create).toHaveBeenCalledWith({
        data: {
          workflowInstanceId: 'workflow-1',
          eventType: 'WORKFLOW_STARTED',
          performedById: 'user-1',
          metadata: {
            notificationChannel: 'EMAIL',
            ...eventData.metadata
          },
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('template processing', () => {
    it('should process template variables correctly', async () => {
      const template = 'Hello {{firstName}}, your task {{taskName}} is due on {{deadline}}';
      const variables = {
        firstName: 'John',
        taskName: 'Quality Review',
        deadline: '2024-12-31'
      };

      const result = (workflowNotificationService as any).processTemplate(template, variables);

      expect(result).toBe('Hello John, your task Quality Review is due on 2024-12-31');
    });

    it('should handle missing template variables gracefully', async () => {
      const template = 'Hello {{firstName}}, your task {{taskName}} is {{status}}';
      const variables = {
        firstName: 'John',
        taskName: 'Quality Review'
        // missing 'status'
      };

      const result = (workflowNotificationService as any).processTemplate(template, variables);

      expect(result).toBe('Hello John, your task Quality Review is {{status}}');
    });

    it('should handle nested object variables', async () => {
      const template = 'Workflow {{workflow.name}} assigned to {{user.firstName}} {{user.lastName}}';
      const variables = {
        workflow: { name: 'Quality Review' },
        user: { firstName: 'John', lastName: 'Doe' }
      };

      const result = (workflowNotificationService as any).processTemplate(template, variables);

      expect(result).toBe('Workflow Quality Review assigned to John Doe');
    });
  });

  describe('notification preferences', () => {
    it('should respect user notification preferences', async () => {
      const userId = 'user-1';
      const eventType = 'DEADLINE_APPROACHING';

      const mockUser = {
        id: userId,
        email: 'user1@example.com',
        notificationPreferences: {
          email: {
            DEADLINE_APPROACHING: true,
            WORKFLOW_COMPLETED: false
          },
          sms: {
            DEADLINE_APPROACHING: false
          }
        }
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const shouldSend = await (workflowNotificationService as any)
        .shouldSendNotification(userId, eventType, 'EMAIL');

      expect(shouldSend).toBe(true);
    });

    it('should default to send if no preferences set', async () => {
      const userId = 'user-1';
      const eventType = 'DEADLINE_APPROACHING';

      const mockUser = {
        id: userId,
        email: 'user1@example.com',
        notificationPreferences: null
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const shouldSend = await (workflowNotificationService as any)
        .shouldSendNotification(userId, eventType, 'EMAIL');

      expect(shouldSend).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle email service failures gracefully', async () => {
      const workflowInstanceId = 'workflow-1';

      const mockWorkflowInstance = {
        id: workflowInstanceId,
        requestedBy: { email: 'user@example.com' },
        workflowDefinition: { name: 'Test Workflow' },
        stageInstances: []
      };

      const mockTemplate = {
        subject: 'Test',
        htmlContent: 'Test',
        textContent: 'Test'
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockWorkflowInstance);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockEmailService.sendBatchEmails.mockRejectedValue(new Error('Email service unavailable'));

      // Should not throw, just log the error
      await expect(
        workflowNotificationService.sendWorkflowStartedNotification(workflowInstanceId)
      ).resolves.not.toThrow();
    });

    it('should handle missing email templates', async () => {
      const workflowInstanceId = 'workflow-1';

      const mockWorkflowInstance = {
        id: workflowInstanceId,
        requestedBy: { email: 'user@example.com' },
        workflowDefinition: { name: 'Test Workflow' },
        stageInstances: []
      };

      mockPrisma.workflowInstance.findUnique.mockResolvedValue(mockWorkflowInstance);
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);

      await workflowNotificationService.sendWorkflowStartedNotification(workflowInstanceId);

      // Should use default template
      expect(mockEmailService.sendBatchEmails).toHaveBeenCalledWith([
        {
          to: 'user@example.com',
          subject: 'Workflow Notification',
          html: expect.any(String),
          text: expect.any(String)
        }
      ]);
    });
  });
});