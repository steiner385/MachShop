import {
  User,
  PersonnelClass,
  PersonnelQualification,
  PersonnelCertification,
  PersonnelSkill,
  PersonnelSkillAssignment,
  PersonnelWorkCenterAssignment,
  PersonnelAvailability,
  CertificationStatus,
  CompetencyLevel,
  AvailabilityType,
  Prisma,
} from '@prisma/client';
import prisma from '../lib/database';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';

// Extended User type with personnel relations
export interface PersonnelWithRelations extends User {
  personnelClass?: PersonnelClass | null;
  supervisor?: User | null;
  subordinates?: User[];
  certifications?: PersonnelCertification[];
  skills?: PersonnelSkillAssignment[];
  workCenterAssignments?: PersonnelWorkCenterAssignment[];
  availability?: PersonnelAvailability[];
}

// Personnel update data
export interface UpdatePersonnelData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  employeeNumber?: string;
  personnelClassId?: string;
  department?: string;
  supervisorId?: string;
  costCenter?: string;
  laborRate?: number;
  hireDate?: Date;
  terminationDate?: Date;
  isActive?: boolean;
}

// Certification creation data
export interface CreateCertificationData {
  personnelId: string;
  qualificationId: string;
  certificationNumber?: string;
  issuedDate: Date;
  expirationDate?: Date;
  verifiedBy?: string;
  notes?: string;
}

// Skill assignment data
export interface CreateSkillAssignmentData {
  personnelId: string;
  skillId: string;
  competencyLevel: CompetencyLevel;
  assessedBy?: string;
  assessedAt?: Date;
  lastUsedDate?: Date;
  certifiedDate?: Date;
  notes?: string;
}

// Work center assignment data
export interface CreateWorkCenterAssignmentData {
  personnelId: string;
  workCenterId: string;
  isPrimary?: boolean;
  effectiveDate?: Date;
  certifiedDate?: Date;
  notes?: string;
}

// Availability data
export interface CreateAvailabilityData {
  personnelId: string;
  availabilityType: AvailabilityType;
  startDateTime: Date;
  endDateTime: Date;
  shiftCode?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  reason?: string;
  approvedBy?: string;
  notes?: string;
}

export class PersonnelService {
  constructor() {
  }

  /**
   * Get all personnel with optional filtering
   */
  async getAllPersonnel(options?: {
    personnelClassId?: string;
    supervisorId?: string;
    department?: string;
    isActive?: boolean;
    includeRelations?: boolean;
  }): Promise<PersonnelWithRelations[]> {
    const where: Prisma.UserWhereInput = {};

    if (options) {
      if (options.personnelClassId) where.personnelClassId = options.personnelClassId;
      if (options.supervisorId !== undefined) where.supervisorId = options.supervisorId || null;
      if (options.department) where.department = options.department;
      if (options.isActive !== undefined) where.isActive = options.isActive;
    }

    const include = options?.includeRelations
      ? {
          personnelClass: true,
          supervisor: true,
          subordinates: true,
          certifications: {
            include: {
              qualification: true,
            },
          },
          skills: {
            include: {
              skill: true,
            },
          },
          workCenterAssignments: {
            include: {
              workCenter: true,
            },
          },
          availability: true,
        }
      : undefined;

    return prisma.user.findMany({
      where,
      include,
      orderBy: { employeeNumber: 'asc' },
    });
  }

  /**
   * Get personnel by ID with full relations
   */
  async getPersonnelById(id: string): Promise<PersonnelWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        personnelClass: true,
        supervisor: true,
        subordinates: true,
        certifications: {
          include: {
            qualification: true,
          },
          orderBy: { expirationDate: 'asc' },
        },
        skills: {
          include: {
            skill: true,
          },
          orderBy: { competencyLevel: 'desc' },
        },
        workCenterAssignments: {
          include: {
            workCenter: true,
          },
        },
        availability: {
          orderBy: { startDateTime: 'desc' },
          take: 20, // Last 20 availability records
        },
      },
    });
  }

  /**
   * Get personnel by employee number
   */
  async getPersonnelByEmployeeNumber(employeeNumber: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { employeeNumber },
    });
  }

  /**
   * Update personnel information
   */
  async updatePersonnel(id: string, data: UpdatePersonnelData): Promise<User> {
    const personnel = await this.getPersonnelById(id);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${id} not found`);
    }

    // Validate supervisor if changing
    if (data.supervisorId !== undefined && data.supervisorId) {
      // Prevent self-supervision
      if (data.supervisorId === id) {
        throw new ValidationError('Personnel cannot supervise themselves');
      }

      const supervisor = await this.getPersonnelById(data.supervisorId);
      if (!supervisor) {
        throw new NotFoundError(`Supervisor with ID ${data.supervisorId} not found`);
      }

      // Check for circular supervision
      const isCircular = await this.wouldCreateCircularSupervision(id, data.supervisorId);
      if (isCircular) {
        throw new ValidationError('Cannot set supervisor: would create circular supervision chain');
      }
    }

    // Validate personnel class if changing
    if (data.personnelClassId) {
      const personnelClass = await prisma.personnelClass.findUnique({
        where: { id: data.personnelClassId },
      });
      if (!personnelClass) {
        throw new NotFoundError(`Personnel class with ID ${data.personnelClassId} not found`);
      }
    }

    // Validate employee number uniqueness if changing
    if (data.employeeNumber && data.employeeNumber !== personnel.employeeNumber) {
      const existing = await this.getPersonnelByEmployeeNumber(data.employeeNumber);
      if (existing) {
        throw new ConflictError(`Employee number ${data.employeeNumber} is already in use`);
      }
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Check if setting supervisorId would create a circular reference
   */
  private async wouldCreateCircularSupervision(
    personnelId: string,
    proposedSupervisorId: string
  ): Promise<boolean> {
    // Get all supervisors up the chain from the proposed supervisor
    const supervisors = await this.getSupervisorChain(proposedSupervisorId);

    // If personnelId is in the supervisor chain, it would be circular
    return supervisors.some((supervisor) => supervisor.id === personnelId);
  }

  /**
   * Get supervisor chain (all supervisors up the hierarchy)
   */
  async getSupervisorChain(personnelId: string): Promise<User[]> {
    const personnel = await this.getPersonnelById(personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${personnelId} not found`);
    }

    const supervisors: User[] = [];
    let current = personnel;

    while (current.supervisorId) {
      const supervisor = await prisma.user.findUnique({
        where: { id: current.supervisorId },
      });
      if (!supervisor) break;
      supervisors.push(supervisor);
      current = supervisor;
    }

    return supervisors;
  }

  /**
   * Get subordinates (all personnel reporting to this person, recursively)
   */
  async getAllSubordinates(personnelId: string): Promise<User[]> {
    const personnel = await this.getPersonnelById(personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${personnelId} not found`);
    }

    return this.getSubordinatesRecursive(personnelId);
  }

  /**
   * Get subordinates recursively
   */
  private async getSubordinatesRecursive(personnelId: string): Promise<User[]> {
    const directReports = await prisma.user.findMany({
      where: { supervisorId: personnelId },
    });

    const subordinates: User[] = [...directReports];

    for (const report of directReports) {
      const reportsSubordinates = await this.getSubordinatesRecursive(report.id);
      subordinates.push(...reportsSubordinates);
    }

    return subordinates;
  }

  /**
   * Get expiring certifications within specified days
   */
  async getExpiringCertifications(daysAhead: number = 30): Promise<PersonnelCertification[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return prisma.personnelCertification.findMany({
      where: {
        status: 'ACTIVE',
        expirationDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        personnel: true,
        qualification: true,
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  /**
   * Get expired certifications
   */
  async getExpiredCertifications(): Promise<PersonnelCertification[]> {
    const today = new Date();

    return prisma.personnelCertification.findMany({
      where: {
        status: 'ACTIVE',
        expirationDate: {
          lt: today,
        },
      },
      include: {
        personnel: true,
        qualification: true,
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  /**
   * Create certification for personnel
   */
  async createCertification(data: CreateCertificationData): Promise<PersonnelCertification> {
    // Validate personnel exists
    const personnel = await this.getPersonnelById(data.personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${data.personnelId} not found`);
    }

    // Validate qualification exists
    const qualification = await prisma.personnelQualification.findUnique({
      where: { id: data.qualificationId },
    });
    if (!qualification) {
      throw new NotFoundError(`Qualification with ID ${data.qualificationId} not found`);
    }

    // Check for existing certification
    const existing = await prisma.personnelCertification.findUnique({
      where: {
        personnelId_qualificationId: {
          personnelId: data.personnelId,
          qualificationId: data.qualificationId,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Personnel already has certification for ${qualification.qualificationName}`
      );
    }

    return prisma.personnelCertification.create({
      data: {
        personnelId: data.personnelId,
        qualificationId: data.qualificationId,
        certificationNumber: data.certificationNumber,
        issuedDate: data.issuedDate,
        expirationDate: data.expirationDate,
        status: 'ACTIVE',
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedBy ? new Date() : null,
        notes: data.notes,
      },
      include: {
        personnel: true,
        qualification: true,
      },
    });
  }

  /**
   * Update certification status (expire, suspend, revoke)
   */
  async updateCertificationStatus(
    certificationId: string,
    status: CertificationStatus
  ): Promise<PersonnelCertification> {
    const certification = await prisma.personnelCertification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      throw new NotFoundError(`Certification with ID ${certificationId} not found`);
    }

    return prisma.personnelCertification.update({
      where: { id: certificationId },
      data: { status },
    });
  }

  /**
   * Get skill matrix for personnel (all skill assignments)
   */
  async getSkillMatrix(personnelId: string): Promise<PersonnelSkillAssignment[]> {
    const personnel = await this.getPersonnelById(personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${personnelId} not found`);
    }

    return prisma.personnelSkillAssignment.findMany({
      where: { personnelId },
      include: {
        skill: true,
      },
      orderBy: [{ competencyLevel: 'desc' }, { lastUsedDate: 'desc' }],
    });
  }

  /**
   * Assign skill to personnel with competency level
   */
  async assignSkill(data: CreateSkillAssignmentData): Promise<PersonnelSkillAssignment> {
    // Validate personnel exists
    const personnel = await this.getPersonnelById(data.personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${data.personnelId} not found`);
    }

    // Validate skill exists
    const skill = await prisma.personnelSkill.findUnique({
      where: { id: data.skillId },
    });
    if (!skill) {
      throw new NotFoundError(`Skill with ID ${data.skillId} not found`);
    }

    // Check for existing assignment
    const existing = await prisma.personnelSkillAssignment.findUnique({
      where: {
        personnelId_skillId: {
          personnelId: data.personnelId,
          skillId: data.skillId,
        },
      },
    });

    if (existing) {
      // Update existing assignment
      return prisma.personnelSkillAssignment.update({
        where: { id: existing.id },
        data: {
          competencyLevel: data.competencyLevel,
          assessedBy: data.assessedBy,
          assessedAt: data.assessedAt || new Date(),
          lastUsedDate: data.lastUsedDate,
          certifiedDate: data.certifiedDate,
          notes: data.notes,
        },
        include: {
          personnel: true,
          skill: true,
        },
      });
    }

    // Create new assignment
    return prisma.personnelSkillAssignment.create({
      data: {
        personnelId: data.personnelId,
        skillId: data.skillId,
        competencyLevel: data.competencyLevel,
        assessedBy: data.assessedBy,
        assessedAt: data.assessedAt || new Date(),
        lastUsedDate: data.lastUsedDate,
        certifiedDate: data.certifiedDate,
        notes: data.notes,
      },
      include: {
        personnel: true,
        skill: true,
      },
    });
  }

  /**
   * Get personnel by skill and minimum competency level
   */
  async getPersonnelBySkill(
    skillId: string,
    minCompetencyLevel?: CompetencyLevel
  ): Promise<User[]> {
    const competencyOrder: CompetencyLevel[] = [
      'NOVICE',
      'ADVANCED_BEGINNER',
      'COMPETENT',
      'PROFICIENT',
      'EXPERT',
    ];

    const where: Prisma.PersonnelSkillAssignmentWhereInput = {
      skillId,
    };

    if (minCompetencyLevel) {
      const minIndex = competencyOrder.indexOf(minCompetencyLevel);
      const allowedLevels = competencyOrder.slice(minIndex);
      where.competencyLevel = { in: allowedLevels };
    }

    const assignments = await prisma.personnelSkillAssignment.findMany({
      where,
      include: {
        personnel: {
          include: {
            personnelClass: true,
          },
        },
      },
      orderBy: { competencyLevel: 'desc' },
    });

    return assignments.map((a) => a.personnel);
  }

  /**
   * Assign personnel to work center
   */
  async assignToWorkCenter(
    data: CreateWorkCenterAssignmentData
  ): Promise<PersonnelWorkCenterAssignment> {
    // Validate personnel exists
    const personnel = await this.getPersonnelById(data.personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${data.personnelId} not found`);
    }

    // Validate work center exists
    const workCenter = await prisma.workCenter.findUnique({
      where: { id: data.workCenterId },
    });
    if (!workCenter) {
      throw new NotFoundError(`Work center with ID ${data.workCenterId} not found`);
    }

    // Check for existing assignment
    const existing = await prisma.personnelWorkCenterAssignment.findUnique({
      where: {
        personnelId_workCenterId: {
          personnelId: data.personnelId,
          workCenterId: data.workCenterId,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Personnel is already assigned to work center ${workCenter.name}`
      );
    }

    // If this is primary, unset other primary assignments for this personnel
    if (data.isPrimary) {
      await prisma.personnelWorkCenterAssignment.updateMany({
        where: {
          personnelId: data.personnelId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    return prisma.personnelWorkCenterAssignment.create({
      data: {
        personnelId: data.personnelId,
        workCenterId: data.workCenterId,
        isPrimary: data.isPrimary || false,
        effectiveDate: data.effectiveDate || new Date(),
        certifiedDate: data.certifiedDate,
        notes: data.notes,
      },
      include: {
        personnel: true,
        workCenter: true,
      },
    });
  }

  /**
   * Get personnel assigned to work center
   */
  async getPersonnelByWorkCenter(workCenterId: string): Promise<User[]> {
    const assignments = await prisma.personnelWorkCenterAssignment.findMany({
      where: {
        workCenterId,
        endDate: null, // Only active assignments
      },
      include: {
        personnel: {
          include: {
            personnelClass: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { effectiveDate: 'desc' }],
    });

    return assignments.map((a) => a.personnel);
  }

  /**
   * Create availability record (shift schedule, time off, etc.)
   */
  async createAvailability(data: CreateAvailabilityData): Promise<PersonnelAvailability> {
    // Validate personnel exists
    const personnel = await this.getPersonnelById(data.personnelId);
    if (!personnel) {
      throw new NotFoundError(`Personnel with ID ${data.personnelId} not found`);
    }

    // Validate date range
    if (data.startDateTime >= data.endDateTime) {
      throw new ValidationError('End date/time must be after start date/time');
    }

    return prisma.personnelAvailability.create({
      data: {
        personnelId: data.personnelId,
        availabilityType: data.availabilityType,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        shiftCode: data.shiftCode,
        isRecurring: data.isRecurring || false,
        recurrenceRule: data.recurrenceRule,
        reason: data.reason,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedBy ? new Date() : null,
        notes: data.notes,
      },
      include: {
        personnel: true,
      },
    });
  }

  /**
   * Get availability for personnel within date range
   */
  async getAvailability(
    personnelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PersonnelAvailability[]> {
    return prisma.personnelAvailability.findMany({
      where: {
        personnelId,
        OR: [
          // Records that start within the range
          {
            startDateTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Records that end within the range
          {
            endDateTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Records that span the entire range
          {
            startDateTime: { lte: startDate },
            endDateTime: { gte: endDate },
          },
        ],
      },
      orderBy: { startDateTime: 'asc' },
    });
  }
}

// Export singleton instance for use in routes
export default new PersonnelService();
