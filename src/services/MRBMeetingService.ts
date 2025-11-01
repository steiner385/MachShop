/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * MRB (Material Review Board) Meeting Service - Phase 1-2
 *
 * Manages Material Review Board meetings and voting
 * Handles MRB scheduling, voting collection, and decision recording
 */

import {
  MRBMeeting,
  MRBMember,
  MRBVote,
  MRBVoteStatus,
  NCRDisposition,
} from '@/types/quality';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * MRB voting result
 */
export interface MRBVotingResult {
  allVotesReceived: boolean;
  decision?: NCRDisposition;
  voteCounts: Record<NCRDisposition, number>;
  majorityDisposition?: NCRDisposition;
}

/**
 * MRBMeetingService
 * Manages MRB meeting lifecycle and voting
 */
export class MRBMeetingService {
  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Schedule an MRB meeting
   */
  async scheduleMRBMeeting(
    ncrId: string,
    scheduledDate: Date,
    mrbMembers: MRBMember[],
    createdBy: string,
    meetingLocation?: string
  ): Promise<MRBMeeting> {
    if (scheduledDate < new Date()) {
      throw new Error('Meeting date must be in the future');
    }

    if (mrbMembers.length === 0) {
      throw new Error('At least one MRB member is required');
    }

    const meeting: MRBMeeting = {
      id: uuidv4(),
      ncrId,
      scheduledDate,
      meetingLocation,
      mrbMembers: mrbMembers.map(member => ({
        ...member,
        votingStatus: MRBVoteStatus.PENDING,
      })),
      mrbVotes: [],
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.prisma?.mRBMeeting.create({
      data: {
        id: meeting.id,
        ncrId: meeting.ncrId,
        scheduledDate: meeting.scheduledDate,
        meetingLocation: meeting.meetingLocation,
        status: meeting.status,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      },
    });

    return meeting;
  }

  /**
   * Get MRB meeting
   */
  async getMRBMeeting(mrbId: string): Promise<MRBMeeting | null> {
    const meeting = await this.prisma?.mRBMeeting.findUnique({
      where: { id: mrbId },
    });

    return meeting || null;
  }

  /**
   * Get MRB meeting by NCR ID
   */
  async getMRBMeetingByNCRId(ncrId: string): Promise<MRBMeeting | null> {
    const meeting = await this.prisma?.mRBMeeting.findUnique({
      where: { ncrId },
    });

    return meeting || null;
  }

  /**
   * Update MRB meeting
   */
  async updateMRBMeeting(
    mrbId: string,
    updates: Partial<Omit<MRBMeeting, 'id' | 'createdAt'>>
  ): Promise<MRBMeeting> {
    const meeting = await this.prisma?.mRBMeeting.update({
      where: { id: mrbId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return meeting!;
  }

  /**
   * Start MRB meeting
   */
  async startMRBMeeting(mrbId: string): Promise<MRBMeeting> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    if (meeting.status !== 'SCHEDULED') {
      throw new Error(`Cannot start meeting with status ${meeting.status}`);
    }

    return this.updateMRBMeeting(mrbId, {
      status: 'IN_PROGRESS',
    });
  }

  /**
   * Record a vote from an MRB member
   */
  async recordMRBVote(
    mrbId: string,
    memberId: string,
    memberEmail: string,
    disposition: NCRDisposition,
    voteReason: string
  ): Promise<MRBMeeting> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    if (meeting.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot record votes for meeting with status ${meeting.status}`);
    }

    // Validate member is part of this meeting
    const member = meeting.mrbMembers.find(m => m.email === memberEmail);
    if (!member) {
      throw new Error(`${memberEmail} is not a member of this MRB meeting`);
    }

    // Check if member already voted
    if (member.votingStatus !== MRBVoteStatus.PENDING) {
      throw new Error(`${memberEmail} has already voted`);
    }

    const vote: MRBVote = {
      memberId,
      memberEmail,
      disposition,
      voteReason,
      votedAt: new Date(),
    };

    // Update meeting with vote
    const updatedVotes = [...meeting.mrbVotes, vote];
    const updatedMembers = meeting.mrbMembers.map(m =>
      m.email === memberEmail
        ? { ...m, votingStatus: MRBVoteStatus.APPROVED }
        : m
    );

    return this.updateMRBMeeting(mrbId, {
      mrbVotes: updatedVotes,
      mrbMembers: updatedMembers,
    });
  }

  /**
   * Get voting status for an MRB meeting
   */
  async getMRBVoteStatus(mrbId: string): Promise<MRBVotingResult> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    // Count votes by disposition
    const voteCounts: Record<string, number> = {};
    for (const vote of meeting.mrbVotes) {
      voteCounts[vote.disposition] = (voteCounts[vote.disposition] || 0) + 1;
    }

    // Check if all votes received
    const pendingVotes = meeting.mrbMembers.filter(m => m.votingStatus === MRBVoteStatus.PENDING).length;
    const allVotesReceived = pendingVotes === 0;

    // Determine majority disposition
    let majorityDisposition: NCRDisposition | undefined;
    let maxVotes = 0;

    for (const [disposition, count] of Object.entries(voteCounts)) {
      if (count > maxVotes && count > meeting.mrbMembers.length / 2) {
        maxVotes = count;
        majorityDisposition = disposition as NCRDisposition;
      }
    }

    return {
      allVotesReceived,
      decision: majorityDisposition,
      voteCounts: voteCounts as Record<NCRDisposition, number>,
      majorityDisposition,
    };
  }

  /**
   * Complete MRB meeting with decision
   */
  async completeMRBMeeting(
    mrbId: string,
    decision: NCRDisposition,
    decisionReason: string,
    completedBy: string
  ): Promise<MRBMeeting> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    if (meeting.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot complete meeting with status ${meeting.status}`);
    }

    if (!decisionReason || decisionReason.trim().length === 0) {
      throw new Error('Decision reason is required');
    }

    return this.updateMRBMeeting(mrbId, {
      decision,
      decisionReason,
      decisionDate: new Date(),
      status: 'COMPLETED',
    });
  }

  /**
   * Cancel MRB meeting
   */
  async cancelMRBMeeting(
    mrbId: string,
    reason: string
  ): Promise<MRBMeeting> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    if (meeting.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed meeting');
    }

    return this.updateMRBMeeting(mrbId, {
      status: 'CANCELLED',
      meetingNotes: reason,
    });
  }

  /**
   * Get pending MRB meetings (not yet completed)
   */
  async getPendingMRBMeetings(): Promise<MRBMeeting[]> {
    const pending = await this.prisma?.mRBMeeting.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    return pending || [];
  }

  /**
   * Get overdue MRB meetings (scheduled date has passed)
   */
  async getOverdueMRBMeetings(): Promise<MRBMeeting[]> {
    const now = new Date();

    const overdue = await this.prisma?.mRBMeeting.findMany({
      where: {
        AND: [
          { scheduledDate: { lt: now } },
          { status: { in: ['SCHEDULED'] } },
        ],
      },
    });

    return overdue || [];
  }

  /**
   * Get MRB statistics
   */
  async getMRBStats(): Promise<{
    totalMeetings: number;
    scheduledCount: number;
    inProgressCount: number;
    completedCount: number;
    cancelledCount: number;
    averageAttendance: number;
    mostCommonDecision?: NCRDisposition;
  }> {
    const all = await this.prisma?.mRBMeeting.findMany();

    if (!all || all.length === 0) {
      return {
        totalMeetings: 0,
        scheduledCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        averageAttendance: 0,
      };
    }

    const stats = {
      totalMeetings: all.length,
      scheduledCount: all.filter(m => m.status === 'SCHEDULED').length,
      inProgressCount: all.filter(m => m.status === 'IN_PROGRESS').length,
      completedCount: all.filter(m => m.status === 'COMPLETED').length,
      cancelledCount: all.filter(m => m.status === 'CANCELLED').length,
      averageAttendance: 0,
      mostCommonDecision: undefined as NCRDisposition | undefined,
    };

    // Calculate average attendance
    let totalMembers = 0;
    let totalAttended = 0;
    const decisionCounts: Record<string, number> = {};

    for (const meeting of all) {
      totalMembers += meeting.mrbMembers.length;
      totalAttended += meeting.mrbVotes.length;

      if (meeting.decision) {
        decisionCounts[meeting.decision] = (decisionCounts[meeting.decision] || 0) + 1;
      }
    }

    if (totalMembers > 0) {
      stats.averageAttendance = totalAttended / all.length;
    }

    // Find most common decision
    let maxCount = 0;
    for (const [decision, count] of Object.entries(decisionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stats.mostCommonDecision = decision as NCRDisposition;
      }
    }

    return stats;
  }

  /**
   * Check if all MRB members have voted
   */
  async haveAllMembersVoted(mrbId: string): Promise<boolean> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    return meeting.mrbMembers.every(m => m.votingStatus !== MRBVoteStatus.PENDING);
  }

  /**
   * Get voting summary for an MRB meeting
   */
  async getVotingSummary(mrbId: string): Promise<{
    voteCount: number;
    memberCount: number;
    votesByDisposition: Record<NCRDisposition, string[]>;
    pendingVoters: string[];
  }> {
    const meeting = await this.getMRBMeeting(mrbId);

    if (!meeting) {
      throw new Error(`MRB meeting ${mrbId} not found`);
    }

    const votesByDisposition: Record<string, string[]> = {};
    const pendingVoters: string[] = [];

    for (const vote of meeting.mrbVotes) {
      if (!votesByDisposition[vote.disposition]) {
        votesByDisposition[vote.disposition] = [];
      }
      votesByDisposition[vote.disposition].push(vote.memberEmail);
    }

    for (const member of meeting.mrbMembers) {
      if (member.votingStatus === MRBVoteStatus.PENDING) {
        pendingVoters.push(member.email);
      }
    }

    return {
      voteCount: meeting.mrbVotes.length,
      memberCount: meeting.mrbMembers.length,
      votesByDisposition: votesByDisposition as Record<NCRDisposition, string[]>,
      pendingVoters,
    };
  }

  /**
   * Close connection to database
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
