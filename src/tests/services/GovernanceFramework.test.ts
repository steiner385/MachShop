/**
 * Governance Framework Tests
 * Comprehensive test suite for governance, compliance, and approval workflow services
 * Issue #396 - Governance & Compliance Controls for Low-Code Modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import {
  ExtensionGovernanceFrameworkService,
  ComplianceStandard,
  ModuleLifecycleState,
} from '../../services/ExtensionGovernanceFrameworkService';
import {
  ExtensionApprovalWorkflowService,
  ApprovalStatus,
  ApprovalWorkflow,
} from '../../services/ExtensionApprovalWorkflowService';
import { ExtensionGovernanceDashboardService } from '../../services/ExtensionGovernanceDashboardService';

describe('Extension Governance Framework Service', () => {
  let governanceService: ExtensionGovernanceFrameworkService;
  let prismaMock: any;
  let loggerMock: any;

  beforeEach(() => {
    prismaMock = {
      extension: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      extensionHook: { findMany: vi.fn() },
      extensionRoute: { findMany: vi.fn() },
      extensionEventListener: { findMany: vi.fn() },
      extensionEvent: { findMany: vi.fn() },
      extensionPermission: { findMany: vi.fn() },
      extensionConfiguration: { findMany: vi.fn() },
      extensionDependency: { findMany: vi.fn() },
    };

    loggerMock = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    governanceService = new ExtensionGovernanceFrameworkService(prismaMock as PrismaClient, loggerMock as Logger);
  });

  describe('Module Lifecycle Management', () => {
    it('should initiate module lifecycle in draft state', async () => {
      const metadata = {
        id: 'test-module',
        name: 'Test Module',
        version: '1.0.0',
        description: 'Test module for governance',
        author: 'test@company.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lifecycleRecord = await governanceService.initiateModuleLifecycle(
        'test-module',
        metadata,
        'site-1'
      );

      expect(lifecycleRecord.moduleId).toBe('test-module');
      expect(lifecycleRecord.fromState).toBe('draft');
      expect(lifecycleRecord.toState).toBe('draft');
      expect(lifecycleRecord.timestamp).toBeInstanceOf(Date);
    });

    it('should transition module from draft to review', async () => {
      const transition = await governanceService.transitionModuleState(
        'test-module',
        'draft',
        'review',
        'reviewer@company.com',
        'Module ready for compliance review'
      );

      expect(transition.fromState).toBe('draft');
      expect(transition.toState).toBe('review');
      expect(transition.changedBy).toBe('reviewer@company.com');
      expect(transition.timestamp).toBeInstanceOf(Date);
    });

    it('should transition module from review to approved', async () => {
      const transition = await governanceService.transitionModuleState(
        'test-module',
        'review',
        'approved',
        'approver@company.com',
        'Module passed all compliance checks',
        'Approved for deployment'
      );

      expect(transition.fromState).toBe('review');
      expect(transition.toState).toBe('approved');
      expect(transition.approverNotes).toBe('Approved for deployment');
    });

    it('should transition module from approved to deployed', async () => {
      const transition = await governanceService.transitionModuleState(
        'test-module',
        'approved',
        'deployed',
        'deployer@company.com',
        'Module deployed to production'
      );

      expect(transition.fromState).toBe('approved');
      expect(transition.toState).toBe('deployed');
    });

    it('should reject invalid state transitions', async () => {
      await expect(
        governanceService.transitionModuleState(
          'test-module',
          'draft',
          'deployed',
          'user@company.com',
          'Invalid transition'
        )
      ).rejects.toThrow('Invalid state transition');
    });

    it('should transition module to retired', async () => {
      const transition = await governanceService.transitionModuleState(
        'test-module',
        'deployed',
        'retired',
        'admin@company.com',
        'Module no longer needed'
      );

      expect(transition.toState).toBe('retired');
    });

    it('should reactivate module from retired to deployed', async () => {
      const transition = await governanceService.transitionModuleState(
        'test-module',
        'retired',
        'deployed',
        'admin@company.com',
        'Module reactivated'
      );

      expect(transition.fromState).toBe('retired');
      expect(transition.toState).toBe('deployed');
    });
  });

  describe('Compliance Validation', () => {
    it('should validate module against AS9100 standard', async () => {
      prismaMock.extensionHook.findMany.mockResolvedValue([]);

      const results = await governanceService.validateCompliance('test-module', ['AS9100']);

      expect(results).toHaveLength(1);
      expect(results[0].standard).toBe('AS9100');
      expect(results[0].timestamp).toBeInstanceOf(Date);
      expect(results[0].ruleResults.length).toBeGreaterThan(0);
    });

    it('should validate module against FDA 21 CFR Part 11', async () => {
      const results = await governanceService.validateCompliance('test-module', ['FDA21CFR11']);

      expect(results).toHaveLength(1);
      expect(results[0].standard).toBe('FDA21CFR11');
      expect(results[0].ruleResults.length).toBeGreaterThan(0);
      expect(results[0].overallScore).toBeGreaterThanOrEqual(0);
      expect(results[0].overallScore).toBeLessThanOrEqual(100);
    });

    it('should validate module against multiple standards', async () => {
      const standards: ComplianceStandard[] = ['AS9100', 'FDA21CFR11', 'ISO13485', 'ISO9001'];
      const results = await governanceService.validateCompliance('test-module', standards);

      expect(results).toHaveLength(4);
      standards.forEach((standard, index) => {
        expect(results[index].standard).toBe(standard);
        expect(typeof results[index].passed).toBe('boolean');
      });
    });

    it('should report compliance rule failures', async () => {
      const results = await governanceService.validateCompliance('test-module', ['AS9100']);

      const failedRules = results[0].ruleResults.filter((r) => r.status === 'failed');
      failedRules.forEach((rule) => {
        expect(rule.findings).toBeDefined();
        expect(rule.remediation).toBeDefined();
      });
    });

    it('should calculate compliance score', async () => {
      const results = await governanceService.validateCompliance('test-module', ['ISO9001']);

      expect(results[0].overallScore).toBeGreaterThanOrEqual(0);
      expect(results[0].overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Security Control Assessment', () => {
    it('should detect injection vulnerabilities', async () => {
      const vulnerableCode = "const result = await db.query(userInput);";
      const assessment = await governanceService.assessSecurityControls('test-module', vulnerableCode);

      expect(assessment.results.injectionVulnerabilities.found).toBe(true);
      expect(assessment.results.injectionVulnerabilities.severity).toBe('critical');
    });

    it('should detect XSS vulnerabilities', async () => {
      const vulnerableCode = 'element.innerHTML = userInput;';
      const assessment = await governanceService.assessSecurityControls('test-module', vulnerableCode);

      expect(assessment.results.xssVulnerabilities.found).toBe(true);
      expect(assessment.results.xssVulnerabilities.severity).toBe('high');
    });

    it('should detect hardcoded credentials', async () => {
      const vulnerableCode = 'const password = "secretpassword123";';
      const assessment = await governanceService.assessSecurityControls('test-module', vulnerableCode);

      expect(assessment.results.credentialsInCode.found).toBe(true);
      expect(assessment.results.credentialsInCode.severity).toBe('critical');
    });

    it('should verify authorization controls are implemented', async () => {
      const secureCode = `
        if (!user.hasPermission('module:create')) {
          throw new UnauthorizedError();
        }
      `;
      const assessment = await governanceService.assessSecurityControls('test-module', secureCode);

      expect(assessment.results.authzControls.implemented).toBe(true);
    });

    it('should verify data encryption is implemented', async () => {
      const secureCode = 'const encrypted = cipher.encrypt(sensitiveData);';
      const assessment = await governanceService.assessSecurityControls('test-module', secureCode);

      expect(assessment.results.dataEncryption.implemented).toBe(true);
    });

    it('should calculate overall risk level', async () => {
      const vulnerableCode = "const result = eval(userInput); const x = ' \" ' + userInput;";
      const assessment = await governanceService.assessSecurityControls('test-module', vulnerableCode);

      expect(['critical', 'high', 'medium', 'low', 'minimal']).toContain(assessment.overallRisk);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide remediation recommendations', async () => {
      const vulnerableCode = "const data = await db.execute(userInput);";
      const assessment = await governanceService.assessSecurityControls('test-module', vulnerableCode);

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      expect(assessment.recommendations[0]).toContain('Critical' || 'High');
    });
  });

  describe('Operational Controls Configuration', () => {
    it('should configure operational controls', async () => {
      const controls = {
        moduleId: 'test-module',
        cpuThreshold: 75,
        memoryThresholdMB: 512,
        apiCallsPerMinute: 1000,
        responseTimeThresholdMs: 500,
        autoThrottlingEnabled: true,
        maintenanceWindowConfig: {
          dayOfWeek: 2,
          startHour: 2,
          endHour: 4,
        },
      };

      const configured = await governanceService.configureOperationalControls('test-module', controls);

      expect(configured.cpuThreshold).toBe(75);
      expect(configured.memoryThresholdMB).toBe(512);
    });

    it('should reject invalid CPU threshold', async () => {
      const controls = {
        moduleId: 'test-module',
        cpuThreshold: 150,
        memoryThresholdMB: 512,
        apiCallsPerMinute: 1000,
        responseTimeThresholdMs: 500,
        autoThrottlingEnabled: true,
        maintenanceWindowConfig: { dayOfWeek: 2, startHour: 2, endHour: 4 },
      };

      await expect(governanceService.configureOperationalControls('test-module', controls)).rejects.toThrow(
        'CPU threshold must be between 10 and 100'
      );
    });

    it('should reject insufficient memory threshold', async () => {
      const controls = {
        moduleId: 'test-module',
        cpuThreshold: 75,
        memoryThresholdMB: 32,
        apiCallsPerMinute: 1000,
        responseTimeThresholdMs: 500,
        autoThrottlingEnabled: true,
        maintenanceWindowConfig: { dayOfWeek: 2, startHour: 2, endHour: 4 },
      };

      await expect(governanceService.configureOperationalControls('test-module', controls)).rejects.toThrow(
        'Memory threshold must be at least 64 MB'
      );
    });
  });

  describe('Data Governance Policy', () => {
    it('should implement data governance policy', async () => {
      const policy = {
        id: 'policy-1',
        piiDetectionEnabled: true,
        piiEncryptionRequired: true,
        dataRetentionDays: 90,
        crossSystemFlowRestrictions: ['api', 'export'],
        sensitiveDataPatterns: ['ssn', 'credit_card'],
        classificationLevels: ['public', 'internal', 'confidential'],
      };

      const implemented = await governanceService.implementDataGovernancePolicy('test-module', policy);

      expect(implemented.piiDetectionEnabled).toBe(true);
      expect(implemented.piiEncryptionRequired).toBe(true);
      expect(implemented.dataRetentionDays).toBe(90);
    });

    it('should require PII detection when encryption is required', async () => {
      const policy = {
        id: 'policy-1',
        piiDetectionEnabled: false,
        piiEncryptionRequired: true,
        dataRetentionDays: 90,
        crossSystemFlowRestrictions: [],
        sensitiveDataPatterns: [],
        classificationLevels: [],
      };

      await expect(governanceService.implementDataGovernancePolicy('test-module', policy)).rejects.toThrow(
        'PII encryption requires PII detection to be enabled'
      );
    });

    it('should enforce minimum data retention period', async () => {
      const policy = {
        id: 'policy-1',
        piiDetectionEnabled: true,
        piiEncryptionRequired: true,
        dataRetentionDays: 15,
        crossSystemFlowRestrictions: [],
        sensitiveDataPatterns: [],
        classificationLevels: [],
      };

      await expect(governanceService.implementDataGovernancePolicy('test-module', policy)).rejects.toThrow(
        'Data retention period must be at least 30 days'
      );
    });
  });

  describe('Governance Reporting', () => {
    it('should generate governance report', async () => {
      const report = await governanceService.generateGovernanceReport('site-1');

      expect(report.reportId).toMatch(/^report-/);
      expect(report.siteId).toBe('site-1');
      expect(report.moduleCount).toBeGreaterThan(0);
      expect(report.approvedCount).toBeLessThanOrEqual(report.moduleCount);
      expect(report.complianceStatus).toHaveLength(4); // 4 standards
    });

    it('should include compliance status by standard', async () => {
      const report = await governanceService.generateGovernanceReport('site-1');

      expect(report.complianceStatus).toContainEqual(
        expect.objectContaining({ standard: 'AS9100' })
      );
      expect(report.complianceStatus).toContainEqual(
        expect.objectContaining({ standard: 'FDA21CFR11' })
      );
      expect(report.complianceStatus).toContainEqual(
        expect.objectContaining({ standard: 'ISO13485' })
      );
      expect(report.complianceStatus).toContainEqual(
        expect.objectContaining({ standard: 'ISO9001' })
      );
    });

    it('should include security risk summary', async () => {
      const report = await governanceService.generateGovernanceReport('site-1');

      expect(report.securityRiskSummary).toHaveProperty('critical');
      expect(report.securityRiskSummary).toHaveProperty('high');
      expect(report.securityRiskSummary).toHaveProperty('medium');
      expect(report.securityRiskSummary).toHaveProperty('low');
    });

    it('should include operational health metrics', async () => {
      const report = await governanceService.generateGovernanceReport('site-1');

      expect(report.operationalHealthMetrics).toHaveProperty('averageResponseTime');
      expect(report.operationalHealthMetrics).toHaveProperty('peakCpuUsage');
      expect(report.operationalHealthMetrics).toHaveProperty('peakMemoryUsage');
      expect(report.operationalHealthMetrics).toHaveProperty('apiThrottlingEvents');
    });

    it('should include actionable recommendations', async () => {
      const report = await governanceService.generateGovernanceReport('site-1');

      expect(report.recommendations.length).toBeGreaterThan(0);
      report.recommendations.forEach((rec) => {
        expect(rec).toMatch(/[A-Za-z0-9\s\.\,]/); // Should contain readable text
      });
    });
  });
});

describe('Extension Approval Workflow Service', () => {
  let approvalService: ExtensionApprovalWorkflowService;
  let prismaMock: any;
  let loggerMock: any;

  beforeEach(() => {
    prismaMock = {
      approvalWorkflow: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      approvalStep: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    };

    loggerMock = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    approvalService = new ExtensionApprovalWorkflowService(prismaMock as PrismaClient, loggerMock as Logger);
  });

  describe('Workflow Creation', () => {
    it('should create approval workflow with multiple steps', async () => {
      const chainConfig = {
        id: 'chain-1',
        siteId: 'site-1',
        workflowType: 'deployment',
        steps: [
          { stepNumber: 1, approverRole: 'IT_SECURITY' as const, required: true, parallel: false },
          { stepNumber: 2, approverRole: 'IT_MANAGER' as const, required: true, parallel: false },
          {
            stepNumber: 3,
            approverRole: 'BUSINESS_OWNER' as const,
            required: false,
            parallel: false,
          },
        ],
        autoEscalation: true,
      };

      const workflow = await approvalService.createApprovalWorkflow(
        'module-1',
        'site-1',
        'deployment',
        'requester@company.com',
        chainConfig
      );

      expect(workflow.id).toMatch(/^workflow-/);
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.currentStepNumber).toBe(1);
      expect(workflow.overallStatus).toBe('in-progress');
    });
  });

  describe('Step Approval', () => {
    it('should approve workflow step', async () => {
      const approved = await approvalService.approveStep('workflow-1', 1, 'approver@company.com', 'Approved');

      expect(approved.id).toBe('workflow-1');
      expect(approved.steps[0].approvalStatus).toBe('approved');
      expect(approved.steps[0].approvedAt).toBeInstanceOf(Date);
    });

    it('should reject workflow step with reason', async () => {
      const rejected = await approvalService.rejectStep(
        'workflow-1',
        1,
        'approver@company.com',
        'Security vulnerabilities detected',
        'Fix the injection vulnerability first'
      );

      expect(rejected.overallStatus).toBe('rejected');
      expect(rejected.steps[0].approvalStatus).toBe('rejected');
      expect(rejected.steps[0].rejectionReason).toBe('Security vulnerabilities detected');
    });

    it('should provide current approver information', async () => {
      const currentStep = await approvalService.getCurrentApprover('workflow-1');

      expect(currentStep).not.toBeNull();
      expect(currentStep!.approverRole).toBeDefined();
      expect(currentStep!.approvalStatus).toBe('pending');
    });
  });

  describe('Escalation', () => {
    it('should escalate workflow', async () => {
      const escalated = await approvalService.escalateWorkflow(
        'workflow-1',
        'SLA deadline approaching'
      );

      expect(escalated.escalated).toBe(true);
      expect(escalated.escalationReason).toBe('SLA deadline approaching');
      expect(escalated.slaComplianceStatus).toBe('at-risk');
    });

    it('should send escalation notifications', async () => {
      const notifications = await approvalService.sendApprovalNotifications('workflow-1', 'escalation');

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].notificationType).toBe('escalation');
      expect(notifications[0].actionUrl).toBeDefined();
    });
  });

  describe('SLA Tracking', () => {
    it('should check SLA compliance', async () => {
      const compliance = await approvalService.checkSLACompliance('workflow-1');

      expect(['on-track', 'at-risk', 'breached']).toContain(compliance);
    });

    it('should configure SLA for approval step', async () => {
      const sla = await approvalService.configureSLA(
        'site-1',
        'deployment',
        'IT_SECURITY',
        24,
        18,
        'escalation@company.com'
      );

      expect(sla.targetHours).toBe(24);
      expect(sla.escalationThreshold).toBe(18);
    });

    it('should reject invalid SLA configuration', async () => {
      await expect(
        approvalService.configureSLA('site-1', 'deployment', 'IT_SECURITY', 0.5, 18, 'escalation@company.com')
      ).rejects.toThrow('SLA target must be at least 1 hour');
    });
  });

  describe('Delegation', () => {
    it('should delegate approval authority', async () => {
      const delegation = await approvalService.delegateApprovalAuthority(
        'user1@company.com',
        'user2@company.com',
        'IT_MANAGER',
        new Date(),
        new Date(Date.now() + 604800000), // 1 week
        ['deployment', 'update']
      );

      expect(delegation.id).toMatch(/^delegation-/);
      expect(delegation.delegatedBy).toBe('user1@company.com');
      expect(delegation.delegatedTo).toBe('user2@company.com');
      expect(delegation.isActive).toBe(true);
    });

    it('should reject invalid delegation dates', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() - 604800000); // 1 week in past

      await expect(
        approvalService.delegateApprovalAuthority(
          'user1@company.com',
          'user2@company.com',
          'IT_MANAGER',
          startDate,
          endDate,
          ['deployment']
        )
      ).rejects.toThrow('Delegation end date must be after start date');
    });
  });

  describe('Workflow Status', () => {
    it('should get workflow status', async () => {
      const workflow = await approvalService.getWorkflowStatus('workflow-1');

      expect(workflow).not.toBeNull();
      expect(workflow!.id).toBe('workflow-1');
      expect(workflow!.steps.length).toBeGreaterThan(0);
    });

    it('should get pending approvals for user', async () => {
      const pending = await approvalService.getPendingApprovalsForUser(
        'approver@company.com',
        'IT_MANAGER'
      );

      expect(pending).toBeInstanceOf(Array);
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].overallStatus).toBe('in-progress');
    });
  });

  describe('Workflow Withdrawal', () => {
    it('should withdraw workflow', async () => {
      const withdrawn = await approvalService.withdrawWorkflow(
        'workflow-1',
        'requester@company.com',
        'No longer needed'
      );

      expect(withdrawn.overallStatus).toBe('withdrawn');
      expect(withdrawn.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Approval Chain Configuration', () => {
    it('should configure approval chain', async () => {
      const steps = [
        { stepNumber: 1, approverRole: 'IT_SECURITY' as const, required: true, parallel: false },
        { stepNumber: 2, approverRole: 'IT_MANAGER' as const, required: true, parallel: false },
      ];

      const config = await approvalService.configureApprovalChain('site-1', 'deployment', steps);

      expect(config.steps).toHaveLength(2);
      expect(config.autoEscalation).toBe(true);
    });

    it('should reject empty approval chain', async () => {
      await expect(
        approvalService.configureApprovalChain('site-1', 'deployment', [])
      ).rejects.toThrow('Approval chain must have at least one step');
    });
  });
});

describe('Extension Governance Dashboard Service', () => {
  let dashboardService: ExtensionGovernanceDashboardService;
  let prismaMock: any;
  let loggerMock: any;

  beforeEach(() => {
    prismaMock = {
      extension: { findMany: vi.fn() },
      module: { findMany: vi.fn() },
    };

    loggerMock = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    dashboardService = new ExtensionGovernanceDashboardService(prismaMock as PrismaClient, loggerMock as Logger);
  });

  describe('Dashboard Overviews', () => {
    it('should get dashboard overview', async () => {
      const overview = await dashboardService.getDashboardOverview();

      expect(overview.totalModules).toBeGreaterThan(0);
      expect(overview.activeModules).toBeLessThanOrEqual(overview.totalModules);
      expect(overview.pendingApprovals).toBeGreaterThanOrEqual(0);
      expect(overview.complianceGap).toBeGreaterThanOrEqual(0);
    });

    it('should get module status summaries', async () => {
      const summaries = await dashboardService.getModuleStatusSummaries();

      expect(summaries).toBeInstanceOf(Array);
      expect(summaries.length).toBeGreaterThan(0);
      summaries.forEach((summary) => {
        expect(['draft', 'review', 'approved', 'deployed', 'retired']).toContain(summary.status);
        expect(summary.complianceScore).toBeGreaterThanOrEqual(0);
        expect(summary.complianceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should filter module summaries by status', async () => {
      const summaries = await dashboardService.getModuleStatusSummaries(undefined, 'deployed');

      expect(summaries.length).toBeGreaterThan(0);
      // Filter to verify the deployed ones are present
      const deployedSummaries = summaries.filter(s => s.status === 'deployed');
      expect(deployedSummaries.length).toBeGreaterThan(0);
    });
  });

  describe('Approval Queue', () => {
    it('should get approval queue', async () => {
      const queue = await dashboardService.getApprovalQueue();

      expect(queue).toBeInstanceOf(Array);
      queue.forEach((item) => {
        expect(item.workflowId).toBeDefined();
        expect(item.moduleId).toBeDefined();
        expect(['on-track', 'at-risk', 'breached']).toContain(item.slaStatus);
      });
    });

    it('should get pending approvals for specific approver', async () => {
      const queue = await dashboardService.getApprovalQueue('approver@company.com', 'IT_MANAGER');

      expect(queue).toBeInstanceOf(Array);
      if (queue.length > 0) {
        expect(queue[0].approverRole).toBeDefined();
        expect(['IT_SECURITY', 'IT_MANAGER', 'BUSINESS_OWNER', 'COMPLIANCE_OFFICER']).toContain(queue[0].approverRole);
      }
    });
  });

  describe('Compliance Reporting', () => {
    it('should get compliance status dashboard', async () => {
      const dashboard = await dashboardService.getComplianceStatusDashboard();

      expect(dashboard.complianceByStandard).toHaveLength(4);
      expect(dashboard.overallComplianceScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.overallComplianceScore).toBeLessThanOrEqual(100);
    });

    it('should report violations per standard', async () => {
      const dashboard = await dashboardService.getComplianceStatusDashboard();

      dashboard.complianceByStandard.forEach((standard) => {
        expect(['AS9100', 'FDA 21 CFR Part 11', 'ISO 13485', 'ISO 9001']).toContain(standard.standard);
        expect(standard.compliantModules).toBeLessThanOrEqual(standard.totalModules);
      });
    });

    it('should include remediation guidance', async () => {
      const dashboard = await dashboardService.getComplianceStatusDashboard();

      const violatingStandards = dashboard.complianceByStandard.filter((s) => s.violations.length > 0);
      violatingStandards.forEach((standard) => {
        standard.violations.forEach((violation) => {
          expect(violation.remediation).toBeDefined();
          expect(violation.remediation.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Security Reporting', () => {
    it('should get security dashboard', async () => {
      const dashboard = await dashboardService.getSecurityDashboard();

      expect(dashboard.vulnerabilityTrend.critical).toHaveLength(30);
      expect(dashboard.vulnerableModules).toBeInstanceOf(Array);
      expect(dashboard.complianceWithSecurityControls).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceWithSecurityControls).toBeLessThanOrEqual(100);
    });

    it('should identify vulnerable modules', async () => {
      const dashboard = await dashboardService.getSecurityDashboard();

      dashboard.vulnerableModules.forEach((module) => {
        expect(module.moduleId).toBeDefined();
        expect(module.vulnerabilityCount).toBeGreaterThan(0);
        expect(module.topVulnerabilities.length).toBeGreaterThan(0);
      });
    });

    it('should provide security recommendations', async () => {
      const dashboard = await dashboardService.getSecurityDashboard();

      expect(dashboard.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Operational Health Reporting', () => {
    it('should get operational health dashboard', async () => {
      const dashboard = await dashboardService.getOperationalHealthDashboard();

      expect(dashboard.modules).toBeInstanceOf(Array);
      expect(dashboard.systemMetrics).toBeDefined();
      expect(dashboard.systemMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(dashboard.systemMetrics.successRate).toBeLessThanOrEqual(100);
    });

    it('should include module performance metrics', async () => {
      const dashboard = await dashboardService.getOperationalHealthDashboard();

      dashboard.modules.forEach((module) => {
        expect(['healthy', 'warning', 'critical']).toContain(module.status);
        expect(module.metrics.uptime).toBeGreaterThanOrEqual(0);
        expect(module.metrics.uptime).toBeLessThanOrEqual(100);
      });
    });

    it('should report operational alerts', async () => {
      const dashboard = await dashboardService.getOperationalHealthDashboard();

      const modulesWithAlerts = dashboard.modules.filter((m) => m.alerts.length > 0);
      modulesWithAlerts.forEach((module) => {
        module.alerts.forEach((alert) => {
          expect(['warning', 'critical']).toContain(alert.severity);
          expect(alert.createdAt).toBeInstanceOf(Date);
        });
      });
    });
  });

  describe('Site Governance View', () => {
    it('should get site governance view', async () => {
      const view = await dashboardService.getSiteGovernanceView('site-1');

      expect(view.siteId).toBe('site-1');
      expect(['compliant', 'at-risk', 'non-compliant']).toContain(view.governanceHealth);
      expect(['passed', 'passed-with-findings', 'failed']).toContain(view.auditStatus);
    });
  });

  describe('Report Export', () => {
    it('should generate compliance report as JSON', async () => {
      const report = await dashboardService.generateComplianceReport(
        'site-1',
        ['AS9100', 'FDA21CFR11'],
        'json'
      );

      expect(report).toBeDefined();
      const parsed = JSON.parse(report);
      expect(parsed.siteId).toBe('site-1');
      expect(parsed.standards).toEqual(['AS9100', 'FDA21CFR11']);
    });

    it('should export governance data', async () => {
      const data = await dashboardService.exportGovernanceData(
        'site-1',
        ['modules', 'approvals', 'compliance'],
        'json'
      );

      expect(data).toBeDefined();
      const parsed = JSON.parse(data);
      expect(parsed.dataTypes).toContain('modules');
      expect(parsed.dataTypes).toContain('approvals');
    });

    it('should generate trending insights', async () => {
      const insights = await dashboardService.getTrendingInsights('30days');

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
    });
  });
});
