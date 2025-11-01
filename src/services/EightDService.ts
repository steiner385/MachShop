/**
 * 8D Problem Solving Framework Service
 * Issue #57: Structured methodology for complex quality problem resolution
 */

import { PrismaClient, EightDStatus, EightDPriority, TeamMemberRole, AuthorityLevel } from '@prisma/client';

// Type definitions for 8D framework
export interface CreateEightDReportInput {
  title: string;
  ncrId?: string;
  priority?: EightDPriority;
  leaderId: string;
  championId?: string;
  targetCompletionDate?: Date;
}

export interface UpdateEightDDisciplineInput {
  discipline: number; // 0-8
  content: Record<string, any>;
  verified?: boolean;
}

export interface AddTeamMemberInput {
  userId: string;
  role: TeamMemberRole;
  expertiseArea?: string;
  authorityLevel?: AuthorityLevel;
  timeCommitment?: string;
}

export interface EightDMetrics {
  totalReports: number;
  byStatus: Record<string, number>;
  averageCompletionTime: number;
  byPriority: Record<string, number>;
}

export class EightDService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new 8D report
   */
  async createReport(input: CreateEightDReportInput): Promise<any> {
    // Generate unique report number
    const reportNumber = await this.generateReportNumber();

    return this.prisma.eightDReport.create({
      data: {
        reportNumber,
        title: input.title,
        ncrId: input.ncrId,
        priority: input.priority || 'MEDIUM',
        leader: input.leaderId,
        champion: input.championId,
        targetCompletionDate: input.targetCompletionDate,
        status: 'D0_PREPARATION',
        currentDiscipline: 0,
        createdBy: input.leaderId,
      },
      include: {
        teamMembers: true,
        attachments: true,
        approvals: true,
      },
    });
  }

  /**
   * Generate unique 8D report number
   */
  private async generateReportNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastReport = await this.prisma.eightDReport.findMany({
      where: {
        reportNumber: {
          startsWith: `8D-${year}`,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const nextNumber = lastReport.length > 0
      ? parseInt(lastReport[0].reportNumber.split('-')[2]) + 1
      : 1;

    return `8D-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Get 8D report by ID
   */
  async getReport(reportId: string): Promise<any> {
    return this.prisma.eightDReport.findUnique({
      where: { id: reportId },
      include: {
        teamMembers: {
          include: { user: true },
        },
        attachments: true,
        approvals: {
          include: { approver: true },
        },
        ncr: true,
        creator: true,
        leader_user: true,
      },
    });
  }

  /**
   * Update specific discipline of 8D report
   */
  async updateDiscipline(reportId: string, input: UpdateEightDDisciplineInput): Promise<any> {
    const disciplineKey = this.getDisciplineKey(input.discipline);
    const updateData: Record<string, any> = {
      currentDiscipline: input.discipline,
    };

    // Map content to appropriate fields based on discipline
    if (input.discipline === 2) {
      updateData.problemStatement = input.content.problemStatement;
      updateData.isIsNotAnalysis = input.content.isIsNotAnalysis;
      updateData.problemQuantification = input.content.problemQuantification;
      updateData.problemVerified = input.verified || false;
      if (input.verified) updateData.problemVerificationDate = new Date();
    } else if (input.discipline === 4) {
      updateData.rootCauseAnalysis = input.content.rootCauseAnalysis;
      updateData.rootCauseTechniques = input.content.techniques;
      updateData.potentialCauses = input.content.potentialCauses;
      updateData.verifiedRootCause = input.content.verifiedRootCause;
      updateData.causeCodeId = input.content.causeCodeId;
      updateData.escapePoint = input.content.escapePoint;
      updateData.systemFailureAnalysis = input.content.systemFailureAnalysis;
    } else if (input.discipline === 5) {
      updateData.proposedPCAs = input.content.proposedPCAs;
      updateData.pcaValidation = input.content.pcaValidation;
      updateData.pcaVerified = input.verified || false;
      if (input.verified) updateData.pcaVerificationDate = new Date();
    } else if (input.discipline === 6) {
      updateData.implementationPlan = input.content.implementationPlan;
      updateData.implementationComplete = input.verified || false;
      if (input.verified) updateData.implementationDate = new Date();
      updateData.validationResults = input.content.validationResults;
      updateData.beforeAfterComparison = input.content.beforeAfterComparison;
    }

    // Progress status if verified
    if (input.verified) {
      updateData.status = this.getStatusForDiscipline(input.discipline + 1);
    }

    return this.prisma.eightDReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        teamMembers: true,
        attachments: true,
      },
    });
  }

  /**
   * Add team member to 8D report
   */
  async addTeamMember(reportId: string, input: AddTeamMemberInput): Promise<any> {
    return this.prisma.eightDTeamMember.create({
      data: {
        eightDReportId: reportId,
        userId: input.userId,
        role: input.role,
        expertiseArea: input.expertiseArea,
        authorityLevel: input.authorityLevel || 'CONTRIBUTOR',
        timeCommitment: input.timeCommitment,
      },
      include: {
        user: true,
        eightDReport: true,
      },
    });
  }

  /**
   * Remove team member from 8D report
   */
  async removeTeamMember(reportId: string, userId: string): Promise<void> {
    await this.prisma.eightDTeamMember.deleteMany({
      where: {
        eightDReportId: reportId,
        userId: userId,
      },
    });
  }

  /**
   * Upload attachment to 8D report
   */
  async addAttachment(reportId: string, discipline: string, fileName: string, fileUrl: string, fileType: string, description?: string, uploadedBy?: string): Promise<any> {
    return this.prisma.eightDAttachment.create({
      data: {
        eightDReportId: reportId,
        discipline,
        fileName,
        fileUrl,
        fileType,
        description,
        uploadedBy: uploadedBy || 'system',
      },
      include: {
        eightDReport: true,
      },
    });
  }

  /**
   * Progress 8D report to next discipline
   */
  async progressDiscipline(reportId: string): Promise<any> {
    const report = await this.getReport(reportId);
    if (!report) throw new Error('8D report not found');

    const nextDiscipline = (report.currentDiscipline || 0) + 1;
    if (nextDiscipline > 8) {
      // Complete 8D process
      return this.completeReport(reportId);
    }

    return this.prisma.eightDReport.update({
      where: { id: reportId },
      data: {
        currentDiscipline: nextDiscipline,
        status: this.getStatusForDiscipline(nextDiscipline),
      },
    });
  }

  /**
   * Complete 8D report
   */
  async completeReport(reportId: string): Promise<any> {
    return this.prisma.eightDReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        currentDiscipline: 8,
      },
      include: {
        teamMembers: true,
        attachments: true,
      },
    });
  }

  /**
   * Get 8D metrics and analytics
   */
  async getMetrics(): Promise<EightDMetrics> {
    const reports = await this.prisma.eightDReport.findMany();

    const byStatus = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = reports.reduce((acc, report) => {
      acc[report.priority] = (acc[report.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedReports = reports.filter(r => r.status === 'COMPLETED');
    let averageCompletionTime = 0;

    if (completedReports.length > 0) {
      const totalTime = completedReports.reduce((sum, report) => {
        if (report.completedAt && report.createdAt) {
          return sum + (report.completedAt.getTime() - report.createdAt.getTime());
        }
        return sum;
      }, 0);
      averageCompletionTime = Math.round(totalTime / completedReports.length / (1000 * 60 * 60 * 24)); // Days
    }

    return {
      totalReports: reports.length,
      byStatus,
      averageCompletionTime,
      byPriority,
    };
  }

  /**
   * List 8D reports with filtering
   */
  async listReports(filters?: {
    status?: EightDStatus;
    priority?: EightDPriority;
    ncrId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.ncrId) where.ncrId = filters.ncrId;

    return this.prisma.eightDReport.findMany({
      where,
      include: {
        teamMembers: true,
        attachments: true,
        ncr: true,
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Request approval for 8D discipline
   */
  async requestApproval(reportId: string, approverUserId: string, discipline: string, role: string): Promise<any> {
    return this.prisma.eightDApproval.create({
      data: {
        eightDReportId: reportId,
        approverUserId,
        discipline,
        approverRole: role,
        status: 'PENDING',
      },
      include: {
        approver: true,
      },
    });
  }

  /**
   * Approve 8D discipline
   */
  async approveApproval(approvalId: string, approvalNotes?: string): Promise<any> {
    return this.prisma.eightDApproval.update({
      where: { id: approvalId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvalNotes,
      },
    });
  }

  /**
   * Helper: Get status for discipline number
   */
  private getStatusForDiscipline(discipline: number): EightDStatus {
    const statusMap: Record<number, EightDStatus> = {
      0: 'D0_PREPARATION',
      1: 'D1_TEAM',
      2: 'D2_PROBLEM',
      3: 'D3_CONTAINMENT',
      4: 'D4_ROOT_CAUSE',
      5: 'D5_VERIFY_PCA',
      6: 'D6_IMPLEMENT_PCA',
      7: 'D7_PREVENT_RECURRENCE',
      8: 'D8_RECOGNITION',
    };
    return statusMap[discipline] || 'DRAFT';
  }

  /**
   * Helper: Get key name for discipline
   */
  private getDisciplineKey(discipline: number): string {
    const keys = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
    return keys[discipline] || 'D0';
  }
}

export default EightDService;
