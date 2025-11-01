/**
 * 8D Problem Solving Framework Service Tests
 * Issue #57: Comprehensive testing of 8D methodology implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import EightDService from '../../services/EightDService';

describe('EightDService', () => {
  let prisma: PrismaClient;
  let service: EightDService;
  let testLeaderId: string;
  let testChampionId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new EightDService(prisma);

    // Create test users for 8D framework
    const leader = await prisma.user.create({
      data: {
        username: 'eightd_leader',
        email: 'leader@example.com',
        passwordHash: 'hashed',
        firstName: '8D',
        lastName: 'Leader',
      },
    });
    testLeaderId = leader.id;

    const champion = await prisma.user.create({
      data: {
        username: 'eightd_champion',
        email: 'champion@example.com',
        passwordHash: 'hashed',
        firstName: '8D',
        lastName: 'Champion',
      },
    });
    testChampionId = champion.id;
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await prisma.eightDApproval.deleteMany();
      await prisma.eightDAttachment.deleteMany();
      await prisma.eightDTeamMember.deleteMany();
      await prisma.eightDReport.deleteMany();
      await prisma.user.delete({ where: { id: testLeaderId } });
      await prisma.user.delete({ where: { id: testChampionId } });
    } catch (e) {
      // Handle cleanup errors gracefully
    }
    await prisma.$disconnect();
  });

  describe('8D Report CRUD Operations', () => {
    it('should create a new 8D report', async () => {
      const report = await service.createReport({
        title: 'Critical Quality Issue - Engine Assembly',
        leaderId: testLeaderId,
        championId: testChampionId,
        priority: 'CRITICAL',
      });

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.reportNumber).toMatch(/^8D-\d{4}-\d{4}$/);
      expect(report.title).toBe('Critical Quality Issue - Engine Assembly');
      expect(report.status).toBe('D0_PREPARATION');
      expect(report.currentDiscipline).toBe(0);
      expect(report.priority).toBe('CRITICAL');
    });

    it('should retrieve 8D report by ID', async () => {
      const created = await service.createReport({
        title: 'Test 8D Report',
        leaderId: testLeaderId,
      });

      const retrieved = await service.getReport(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Test 8D Report');
      expect(retrieved.reportNumber).toBe(created.reportNumber);
    });

    it('should list 8D reports with filtering', async () => {
      await service.createReport({
        title: 'Test Report 1',
        leaderId: testLeaderId,
        priority: 'CRITICAL',
      });

      await service.createReport({
        title: 'Test Report 2',
        leaderId: testLeaderId,
        priority: 'LOW',
      });

      const reports = await service.listReports({
        priority: 'CRITICAL',
      });

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].priority).toBe('CRITICAL');
    });
  });

  describe('8D Discipline Progression', () => {
    it('should update D2 (Problem Description) discipline', async () => {
      const report = await service.createReport({
        title: 'Problem Solving Test',
        leaderId: testLeaderId,
      });

      const updated = await service.updateDiscipline(report.id, {
        discipline: 2,
        content: {
          problemStatement: 'Defects found in batch 12345',
          isIsNotAnalysis: {
            what: { is: 'Defects in batch 12345', isNot: 'Other batches' },
            where: { is: 'Assembly line 3', isNot: 'Other lines' },
          },
          problemQuantification: {
            quantity: 150,
            frequency: 'High',
            costImpact: 25000,
          },
        },
        verified: true,
      });

      expect(updated.problemStatement).toBeDefined();
      expect(updated.problemVerified).toBe(true);
      expect(updated.problemVerificationDate).toBeDefined();
    });

    it('should update D4 (Root Cause Analysis) discipline', async () => {
      const report = await service.createReport({
        title: 'RCA Test',
        leaderId: testLeaderId,
      });

      const updated = await service.updateDiscipline(report.id, {
        discipline: 4,
        content: {
          rootCauseAnalysis: 'Detailed 5-Why analysis performed',
          techniques: ['5_WHYS', 'FISHBONE'],
          potentialCauses: [
            { cause: 'Worn tool', verified: true, evidence: 'SEM inspection' },
            { cause: 'Temperature drift', verified: false, evidence: 'Pending' },
          ],
          verifiedRootCause: 'Worn tool at Station 3',
          escapePoint: 'Final inspection failed to detect',
          systemFailureAnalysis: 'Inspection speed too fast',
        },
        verified: true,
      });

      expect(updated.rootCauseAnalysis).toBeDefined();
      expect(updated.verifiedRootCause).toBe('Worn tool at Station 3');
      expect(updated.potentialCauses).toBeDefined();
    });

    it('should progress to next discipline', async () => {
      const report = await service.createReport({
        title: 'Progression Test',
        leaderId: testLeaderId,
      });

      const progressed = await service.progressDiscipline(report.id);

      expect(progressed.currentDiscipline).toBe(1);
      expect(progressed.status).toBe('D1_TEAM');
    });

    it('should complete 8D process when discipline 8 completed', async () => {
      const report = await service.createReport({
        title: 'Completion Test',
        leaderId: testLeaderId,
      });

      // Progress through disciplines
      let current = report;
      for (let i = 0; i < 8; i++) {
        current = await service.progressDiscipline(current.id);
      }

      expect(current.status).toBe('COMPLETED');
      expect(current.completedAt).toBeDefined();
    });
  });

  describe('Team Member Management', () => {
    it('should add team member to 8D report', async () => {
      const report = await service.createReport({
        title: 'Team Test',
        leaderId: testLeaderId,
      });

      const teamMember = await service.addTeamMember(report.id, {
        userId: testChampionId,
        role: 'CORE_MEMBER',
        expertiseArea: 'Manufacturing Engineering',
        authorityLevel: 'DECISION_MAKER',
      });

      expect(teamMember.userId).toBe(testChampionId);
      expect(teamMember.role).toBe('CORE_MEMBER');
      expect(teamMember.expertiseArea).toBe('Manufacturing Engineering');
    });

    it('should remove team member from 8D report', async () => {
      const report = await service.createReport({
        title: 'Team Removal Test',
        leaderId: testLeaderId,
      });

      await service.addTeamMember(report.id, {
        userId: testChampionId,
        role: 'CORE_MEMBER',
      });

      await service.removeTeamMember(report.id, testChampionId);

      const updated = await service.getReport(report.id);
      const hasChampion = updated.teamMembers.some(m => m.userId === testChampionId);
      expect(hasChampion).toBe(false);
    });
  });

  describe('Approval Workflow', () => {
    it('should request approval for discipline', async () => {
      const report = await service.createReport({
        title: 'Approval Test',
        leaderId: testLeaderId,
      });

      const approval = await service.requestApproval(
        report.id,
        testChampionId,
        'D4',
        'Quality Manager',
      );

      expect(approval.status).toBe('PENDING');
      expect(approval.discipline).toBe('D4');
      expect(approval.approverUserId).toBe(testChampionId);
    });

    it('should approve discipline', async () => {
      const report = await service.createReport({
        title: 'Approval Completion Test',
        leaderId: testLeaderId,
      });

      const approval = await service.requestApproval(
        report.id,
        testChampionId,
        'D4',
        'Quality Manager',
      );

      const approved = await service.approveApproval(
        approval.id,
        'RCA meets quality standards',
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approvalNotes).toBe('RCA meets quality standards');
    });
  });

  describe('8D Metrics', () => {
    it('should calculate 8D metrics', async () => {
      await service.createReport({
        title: 'Metric Test 1',
        leaderId: testLeaderId,
        priority: 'HIGH',
      });

      await service.createReport({
        title: 'Metric Test 2',
        leaderId: testLeaderId,
        priority: 'CRITICAL',
      });

      const metrics = await service.getMetrics();

      expect(metrics.totalReports).toBeGreaterThanOrEqual(2);
      expect(metrics.byStatus).toBeDefined();
      expect(metrics.byPriority).toBeDefined();
      expect(metrics.averageCompletionTime).toBeGreaterThanOrEqual(0);
    });
  });
});
