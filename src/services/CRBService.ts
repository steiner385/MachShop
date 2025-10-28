/**
 * ✅ GITHUB ISSUE #22: CRB (Change Review Board) Service
 *
 * CRBService - Service for managing Change Review Board operations,
 * meeting scheduling, agenda generation, and decision recording
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  ECOCRBReviewCreateInput,
  ECOCRBReviewResponse,
  CRBMember,
  CRBActionItem,
  ECOError,
  ECOValidationError
} from '../types/eco';
import {
  CRBDecision,
  VotingRule,
  ECOStatus,
  ECOEventType
} from '@prisma/client';

export interface CRBConfigurationInput {
  boardMembers: CRBMember[];
  meetingFrequency?: string;
  meetingDay?: string;
  meetingTime?: string;
  votingRule?: VotingRule;
  quorumRequired?: number;
  preReviewDays?: number;
}

export interface CRBConfigurationResponse {
  id: string;
  boardMembers: CRBMember[];
  meetingFrequency?: string;
  meetingDay?: string;
  meetingTime?: string;
  votingRule: VotingRule;
  quorumRequired?: number;
  preReviewDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRBMeetingAgendaItem {
  ecoId: string;
  ecoNumber: string;
  title: string;
  priority: string;
  requestorName: string;
  estimatedDiscussionTime: number; // minutes
  hasPreReviewComments: boolean;
}

export interface CRBMeetingAgenda {
  meetingDate: Date;
  agenda: CRBMeetingAgendaItem[];
  totalEstimatedTime: number;
  boardMembers: CRBMember[];
  meetingLocation?: string;
  dialInDetails?: string;
}

export interface CRBDecisionInput {
  decision: CRBDecision;
  decisionRationale?: string;
  votingDetails: {
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    memberVotes: Array<{
      userId: string;
      vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
    }>;
  };
  conditions?: string;
  actionItems?: Omit<CRBActionItem, 'id'>[];
  nextReviewDate?: Date;
}

export class CRBService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // CRB Configuration Management
  // ============================================================================

  /**
   * Get current CRB configuration
   */
  async getCRBConfiguration(): Promise<CRBConfigurationResponse | null> {
    try {
      const config = await this.prisma.cRBConfiguration.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      return config ? this.mapConfigurationToResponse(config) : null;

    } catch (error) {
      logger.error('Error getting CRB configuration:', error);
      throw new ECOError(`Failed to get CRB configuration: ${error.message}`);
    }
  }

  /**
   * Update CRB configuration
   */
  async updateCRBConfiguration(input: CRBConfigurationInput): Promise<CRBConfigurationResponse> {
    try {
      await this.validateCRBConfiguration(input);

      // Deactivate current configuration
      await this.prisma.cRBConfiguration.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Create new configuration
      const config = await this.prisma.cRBConfiguration.create({
        data: {
          boardMembers: input.boardMembers,
          meetingFrequency: input.meetingFrequency,
          meetingDay: input.meetingDay,
          meetingTime: input.meetingTime,
          votingRule: input.votingRule || VotingRule.MAJORITY,
          quorumRequired: input.quorumRequired,
          preReviewDays: input.preReviewDays || 3
        }
      });

      logger.info('CRB configuration updated successfully', { configId: config.id });
      return this.mapConfigurationToResponse(config);

    } catch (error) {
      logger.error('Error updating CRB configuration:', error);
      throw new ECOError(`Failed to update CRB configuration: ${error.message}`);
    }
  }

  // ============================================================================
  // Meeting Management
  // ============================================================================

  /**
   * Schedule CRB review for an ECO
   */
  async scheduleCRBReview(ecoId: string, meetingDate: Date): Promise<ECOCRBReviewResponse> {
    try {
      // Validate ECO exists and is in correct status
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId }
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      if (eco.status !== ECOStatus.PENDING_CRB) {
        throw new ECOError(`ECO is not ready for CRB review. Current status: ${eco.status}`, 'INVALID_STATUS');
      }

      // Get CRB configuration
      const config = await this.getCRBConfiguration();
      if (!config) {
        throw new ECOError('CRB configuration not found. Please configure the Change Review Board first.');
      }

      // Check if review already exists for this ECO
      const existingReview = await this.prisma.eCOCRBReview.findFirst({
        where: {
          ecoId,
          decision: { in: [CRBDecision.APPROVED, CRBDecision.REJECTED] }
        }
      });

      if (existingReview) {
        throw new ECOError(`ECO already has a CRB decision: ${existingReview.decision}`);
      }

      // Create or update review record
      const review = await this.prisma.eCOCRBReview.upsert({
        where: {
          // Use a compound where clause since we don't have a unique constraint
          id: 'temp'
        },
        update: {},
        create: {
          ecoId,
          meetingDate,
          members: config.boardMembers,
          decision: CRBDecision.REQUEST_MORE_INFO, // Temporary status
          createdById: 'system'
        }
      });

      // Update ECO with CRB review date
      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: { crbReviewDate: meetingDate }
      });

      // Create history entry
      await this.prisma.eCOHistory.create({
        data: {
          ecoId,
          eventType: ECOEventType.CRB_REVIEW_SCHEDULED,
          eventDescription: `CRB review scheduled for ${meetingDate.toDateString()}`,
          performedById: 'system',
          performedByName: 'System',
          performedByRole: 'CRB Scheduler'
        }
      });

      logger.info(`CRB review scheduled for ECO ${eco.ecoNumber}`, { ecoId, meetingDate });
      return this.mapCRBReviewToResponse(review);

    } catch (error) {
      logger.error('Error scheduling CRB review:', error);
      throw new ECOError(`Failed to schedule CRB review: ${error.message}`);
    }
  }

  /**
   * Generate meeting agenda for a specific date
   */
  async generateAgenda(meetingDate: Date): Promise<CRBMeetingAgenda> {
    try {
      const config = await this.getCRBConfiguration();
      if (!config) {
        throw new ECOError('CRB configuration not found');
      }

      // Find all ECOs scheduled for review on this date
      const ecosForReview = await this.prisma.engineeringChangeOrder.findMany({
        where: {
          crbReviewDate: {
            gte: new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate()),
            lt: new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate() + 1)
          },
          status: ECOStatus.PENDING_CRB
        },
        include: {
          crbReviews: true
        },
        orderBy: [
          { priority: 'desc' },
          { requestDate: 'asc' }
        ]
      });

      const agendaItems: CRBMeetingAgendaItem[] = ecosForReview.map(eco => ({
        ecoId: eco.id,
        ecoNumber: eco.ecoNumber,
        title: eco.title,
        priority: eco.priority,
        requestorName: eco.requestorName,
        estimatedDiscussionTime: this.calculateDiscussionTime(eco.priority, eco.ecoType),
        hasPreReviewComments: eco.crbReviews.length > 0
      }));

      const totalEstimatedTime = agendaItems.reduce((sum, item) => sum + item.estimatedDiscussionTime, 0);

      return {
        meetingDate,
        agenda: agendaItems,
        totalEstimatedTime,
        boardMembers: config.boardMembers,
        meetingLocation: 'Conference Room A', // Could be configurable
        dialInDetails: 'Teams: +1-xxx-xxx-xxxx, Conference ID: 123456'
      };

    } catch (error) {
      logger.error('Error generating CRB agenda:', error);
      throw new ECOError(`Failed to generate CRB agenda: ${error.message}`);
    }
  }

  /**
   * Distribute materials to board members
   */
  async distributeMaterials(reviewId: string): Promise<void> {
    try {
      const review = await this.prisma.eCOCRBReview.findUnique({
        where: { id: reviewId },
        include: {
          eco: {
            include: {
              attachments: true,
              affectedDocuments: true
            }
          }
        }
      });

      if (!review) {
        throw new ECOError(`CRB review not found: ${reviewId}`, 'REVIEW_NOT_FOUND');
      }

      // In a real implementation, this would:
      // 1. Generate review package PDF
      // 2. Send emails to board members
      // 3. Upload materials to shared location
      // 4. Send calendar invites

      logger.info(`Materials distributed for CRB review`, {
        reviewId,
        ecoNumber: review.eco.ecoNumber,
        memberCount: review.members.length
      });

      // Create history entry
      await this.prisma.eCOHistory.create({
        data: {
          ecoId: review.ecoId,
          eventType: ECOEventType.CRB_REVIEW_SCHEDULED,
          eventDescription: 'CRB review materials distributed to board members',
          performedById: 'system',
          performedByName: 'System',
          performedByRole: 'CRB System'
        }
      });

    } catch (error) {
      logger.error('Error distributing CRB materials:', error);
      throw new ECOError(`Failed to distribute CRB materials: ${error.message}`);
    }
  }

  /**
   * Record CRB decision
   */
  async recordCRBDecision(
    reviewId: string,
    input: ECOCRBReviewCreateInput,
    deciderId: string
  ): Promise<ECOCRBReviewResponse> {
    try {
      const existingReview = await this.prisma.eCOCRBReview.findUnique({
        where: { id: reviewId },
        include: { eco: true }
      });

      if (!existingReview) {
        throw new ECOError(`CRB review not found: ${reviewId}`, 'REVIEW_NOT_FOUND');
      }

      // Validate quorum if required
      const config = await this.getCRBConfiguration();
      if (config?.quorumRequired) {
        const presentMembers = input.members.filter(m => m.isPresent).length;
        if (presentMembers < config.quorumRequired) {
          throw new ECOValidationError(`Quorum not met. Required: ${config.quorumRequired}, Present: ${presentMembers}`);
        }
      }

      // Validate voting results
      await this.validateVotingResults(input, config?.votingRule || VotingRule.MAJORITY);

      // Generate action items with IDs
      const actionItemsWithIds = (input.actionItems || []).map(item => ({
        ...item,
        id: this.generateActionItemId()
      }));

      // Update review with decision
      const updatedReview = await this.prisma.eCOCRBReview.update({
        where: { id: reviewId },
        data: {
          meetingAgenda: input.meetingAgenda,
          members: input.members,
          discussionNotes: input.discussionNotes,
          questionsConcerns: input.questionsConcerns,
          decision: input.decision,
          decisionRationale: input.decisionRationale,
          votesFor: input.votesFor,
          votesAgainst: input.votesAgainst,
          votesAbstain: input.votesAbstain,
          conditions: input.conditions,
          actionItems: actionItemsWithIds,
          nextReviewDate: input.nextReviewDate
        }
      });

      // Update ECO status based on decision
      const newECOStatus = this.getECOStatusFromDecision(input.decision);
      if (newECOStatus) {
        await this.prisma.engineeringChangeOrder.update({
          where: { id: existingReview.ecoId },
          data: {
            status: newECOStatus,
            crbDecision: input.decision,
            crbNotes: input.decisionRationale
          }
        });
      }

      // Create history entry
      await this.prisma.eCOHistory.create({
        data: {
          ecoId: existingReview.ecoId,
          eventType: ECOEventType.CRB_REVIEW_COMPLETED,
          eventDescription: `CRB decision: ${input.decision}`,
          fromStatus: existingReview.eco.status,
          toStatus: newECOStatus,
          performedById: deciderId,
          performedByName: 'CRB Chair',
          performedByRole: 'CRB Chair',
          details: {
            decision: input.decision,
            rationale: input.decisionRationale,
            voting: {
              for: input.votesFor,
              against: input.votesAgainst,
              abstain: input.votesAbstain
            }
          }
        }
      });

      logger.info(`CRB decision recorded: ${input.decision}`, {
        reviewId,
        ecoNumber: existingReview.eco.ecoNumber,
        decision: input.decision
      });

      return this.mapCRBReviewToResponse(updatedReview);

    } catch (error) {
      logger.error('Error recording CRB decision:', error);
      throw new ECOError(`Failed to record CRB decision: ${error.message}`);
    }
  }

  /**
   * Get CRB reviews for an ECO
   */
  async getECOCRBReviews(ecoId: string): Promise<ECOCRBReviewResponse[]> {
    try {
      const reviews = await this.prisma.eCOCRBReview.findMany({
        where: { ecoId },
        orderBy: { meetingDate: 'desc' }
      });

      return reviews.map(this.mapCRBReviewToResponse);

    } catch (error) {
      logger.error('Error getting ECO CRB reviews:', error);
      throw new ECOError(`Failed to get ECO CRB reviews: ${error.message}`);
    }
  }

  /**
   * Get upcoming CRB meetings
   */
  async getUpcomingMeetings(days: number = 30): Promise<CRBMeetingAgenda[]> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + days);

      const ecosForReview = await this.prisma.engineeringChangeOrder.findMany({
        where: {
          crbReviewDate: {
            gte: startDate,
            lte: endDate
          },
          status: ECOStatus.PENDING_CRB
        },
        orderBy: { crbReviewDate: 'asc' }
      });

      // Group by meeting date
      const meetingsByDate = new Map<string, typeof ecosForReview>();
      ecosForReview.forEach(eco => {
        if (eco.crbReviewDate) {
          const dateKey = eco.crbReviewDate.toDateString();
          if (!meetingsByDate.has(dateKey)) {
            meetingsByDate.set(dateKey, []);
          }
          meetingsByDate.get(dateKey)!.push(eco);
        }
      });

      // Generate agenda for each meeting date
      const meetings: CRBMeetingAgenda[] = [];
      for (const [dateKey, ecos] of meetingsByDate) {
        const meetingDate = new Date(dateKey);
        const agenda = await this.generateAgenda(meetingDate);
        meetings.push(agenda);
      }

      return meetings;

    } catch (error) {
      logger.error('Error getting upcoming CRB meetings:', error);
      throw new ECOError(`Failed to get upcoming CRB meetings: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateCRBConfiguration(input: CRBConfigurationInput): Promise<void> {
    if (!input.boardMembers || input.boardMembers.length === 0) {
      throw new ECOValidationError('Board members are required', 'boardMembers');
    }

    if (input.quorumRequired && input.quorumRequired > input.boardMembers.length) {
      throw new ECOValidationError('Quorum cannot exceed number of board members', 'quorumRequired');
    }

    // Validate board member roles are unique
    const roles = input.boardMembers.map(m => m.role);
    const uniqueRoles = new Set(roles);
    if (roles.length !== uniqueRoles.size) {
      throw new ECOValidationError('Board member roles must be unique', 'boardMembers');
    }
  }

  private async validateVotingResults(input: ECOCRBReviewCreateInput, votingRule: VotingRule): Promise<void> {
    const totalVotes = (input.votesFor || 0) + (input.votesAgainst || 0) + (input.votesAbstain || 0);
    const presentMembers = input.members.filter(m => m.isPresent).length;

    if (totalVotes !== presentMembers) {
      throw new ECOValidationError(`Total votes (${totalVotes}) must equal present members (${presentMembers})`);
    }

    // Validate decision matches voting rule
    if (input.decision === CRBDecision.APPROVED) {
      const votesFor = input.votesFor || 0;
      const votesAgainst = input.votesAgainst || 0;

      switch (votingRule) {
        case VotingRule.UNANIMOUS:
          if (votesAgainst > 0) {
            throw new ECOValidationError('Unanimous approval required but there were votes against');
          }
          break;
        case VotingRule.MAJORITY:
          if (votesFor <= votesAgainst) {
            throw new ECOValidationError('Majority approval required but not achieved');
          }
          break;
        case VotingRule.SUPERMAJORITY:
          if (votesFor < Math.ceil(totalVotes * 2 / 3)) {
            throw new ECOValidationError('Supermajority (2/3) approval required but not achieved');
          }
          break;
      }
    }
  }

  private calculateDiscussionTime(priority: string, ecoType: string): number {
    // Base time by priority
    const priorityMinutes = {
      'LOW': 10,
      'MEDIUM': 15,
      'HIGH': 20,
      'CRITICAL': 30,
      'EMERGENCY': 45
    }[priority] || 15;

    // Additional time for complex types
    const typeMultiplier = {
      'CORRECTIVE': 1.0,
      'IMPROVEMENT': 1.2,
      'COST_REDUCTION': 1.1,
      'COMPLIANCE': 1.3,
      'CUSTOMER_REQUEST': 1.4,
      'ENGINEERING': 1.5,
      'EMERGENCY': 2.0
    }[ecoType] || 1.0;

    return Math.ceil(priorityMinutes * typeMultiplier);
  }

  private getECOStatusFromDecision(decision: CRBDecision): ECOStatus | null {
    switch (decision) {
      case CRBDecision.APPROVED:
        return ECOStatus.CRB_APPROVED;
      case CRBDecision.REJECTED:
        return ECOStatus.REJECTED;
      case CRBDecision.DEFERRED:
      case CRBDecision.REQUEST_MORE_INFO:
        return ECOStatus.UNDER_REVIEW;
      default:
        return null;
    }
  }

  private generateActionItemId(): string {
    return `AI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapConfigurationToResponse(config: any): CRBConfigurationResponse {
    return {
      id: config.id,
      boardMembers: config.boardMembers,
      meetingFrequency: config.meetingFrequency,
      meetingDay: config.meetingDay,
      meetingTime: config.meetingTime,
      votingRule: config.votingRule,
      quorumRequired: config.quorumRequired,
      preReviewDays: config.preReviewDays,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }

  private mapCRBReviewToResponse(review: any): ECOCRBReviewResponse {
    return {
      id: review.id,
      ecoId: review.ecoId,
      meetingDate: review.meetingDate,
      meetingAgenda: review.meetingAgenda,
      members: review.members,
      discussionNotes: review.discussionNotes,
      questionsConcerns: review.questionsConcerns,
      decision: review.decision,
      decisionRationale: review.decisionRationale,
      votesFor: review.votesFor,
      votesAgainst: review.votesAgainst,
      votesAbstain: review.votesAbstain,
      conditions: review.conditions,
      actionItems: review.actionItems,
      nextReviewDate: review.nextReviewDate,
      createdById: review.createdById,
      createdAt: review.createdAt
    };
  }
}