import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PersonnelService } from '../../services/PersonnelService';
import { CompetencyLevel, CertificationStatus, AvailabilityType } from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../../middleware/errorHandler';

// Mock Prisma Client
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    personnelClass: {
      findUnique: vi.fn(),
    },
    personnelQualification: {
      findUnique: vi.fn(),
    },
    personnelCertification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personnelSkill: {
      findUnique: vi.fn(),
    },
    personnelSkillAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
    personnelWorkCenterAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    personnelAvailability: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('PersonnelService', () => {
  let personnelService: PersonnelService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    personnelService = new PersonnelService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllPersonnel', () => {
    it('should get all personnel without filters', async () => {
      const mockPersonnel = [
        {
          id: 'user-1',
          username: 'jdoe',
          email: 'jdoe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          employeeNumber: 'EMP-001',
          isActive: true,
        },
        {
          id: 'user-2',
          username: 'asmith',
          email: 'asmith@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          employeeNumber: 'EMP-002',
          isActive: true,
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockPersonnel as any);

      const result = await personnelService.getAllPersonnel();

      expect(result).toEqual(mockPersonnel);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        orderBy: { employeeNumber: 'asc' },
      });
    });

    it('should filter personnel by personnel class', async () => {
      const mockPersonnel = [
        {
          id: 'user-1',
          employeeNumber: 'EMP-001',
          personnelClassId: 'class-1',
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockPersonnel as any);

      await personnelService.getAllPersonnel({ personnelClassId: 'class-1' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          personnelClassId: 'class-1',
        },
        include: undefined,
        orderBy: { employeeNumber: 'asc' },
      });
    });

    it('should filter personnel by supervisor', async () => {
      const mockPersonnel = [
        {
          id: 'user-1',
          supervisorId: 'super-1',
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockPersonnel as any);

      await personnelService.getAllPersonnel({ supervisorId: 'super-1' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          supervisorId: 'super-1',
        },
        include: undefined,
        orderBy: { employeeNumber: 'asc' },
      });
    });

    it('should filter personnel by department', async () => {
      const mockPersonnel = [
        {
          id: 'user-1',
          department: 'Manufacturing',
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockPersonnel as any);

      await personnelService.getAllPersonnel({ department: 'Manufacturing' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          department: 'Manufacturing',
        },
        include: undefined,
        orderBy: { employeeNumber: 'asc' },
      });
    });

    it('should filter by active status', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValue([] as any);

      await personnelService.getAllPersonnel({ isActive: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: undefined,
        orderBy: { employeeNumber: 'asc' },
      });
    });

    it('should include relations when requested', async () => {
      vi.mocked(mockPrisma.user.findMany).mockResolvedValue([] as any);

      await personnelService.getAllPersonnel({ includeRelations: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.objectContaining({
          personnelClass: true,
          supervisor: true,
          subordinates: true,
        }),
        orderBy: { employeeNumber: 'asc' },
      });
    });
  });

  describe('getPersonnelById', () => {
    it('should get personnel by ID with full relations', async () => {
      const mockPersonnel = {
        id: 'user-1',
        username: 'jdoe',
        email: 'jdoe@example.com',
        employeeNumber: 'EMP-001',
        personnelClass: { id: 'class-1', className: 'Operator' },
        certifications: [],
        skills: [],
        workCenterAssignments: [],
        availability: [],
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockPersonnel as any);

      const result = await personnelService.getPersonnelById('user-1');

      expect(result).toEqual(mockPersonnel);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: expect.objectContaining({
          personnelClass: true,
          supervisor: true,
          subordinates: true,
          certifications: expect.any(Object),
          skills: expect.any(Object),
          workCenterAssignments: expect.any(Object),
          availability: expect.any(Object),
        }),
      });
    });

    it('should return null for non-existent personnel', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      const result = await personnelService.getPersonnelById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getPersonnelByEmployeeNumber', () => {
    it('should get personnel by employee number', async () => {
      const mockPersonnel = {
        id: 'user-1',
        employeeNumber: 'EMP-001',
        username: 'jdoe',
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockPersonnel as any);

      const result = await personnelService.getPersonnelByEmployeeNumber('EMP-001');

      expect(result).toEqual(mockPersonnel);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { employeeNumber: 'EMP-001' },
      });
    });
  });

  describe('updatePersonnel', () => {
    it('should update personnel information', async () => {
      const existingPersonnel = {
        id: 'user-1',
        username: 'jdoe',
        employeeNumber: 'EMP-001',
      };

      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        department: 'Manufacturing',
      };

      const updatedPersonnel = {
        ...existingPersonnel,
        ...updateData,
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(existingPersonnel as any);
      vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedPersonnel as any);

      const result = await personnelService.updatePersonnel('user-1', updateData);

      expect(result).toEqual(updatedPersonnel);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
      });
    });

    it('should throw NotFoundError for non-existent personnel', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      await expect(
        personnelService.updatePersonnel('non-existent', { firstName: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSupervisorChain', () => {
    it('should get complete supervisor chain', async () => {
      const worker = {
        id: 'worker-1',
        supervisorId: 'supervisor-1',
        supervisor: {
          id: 'supervisor-1',
          firstName: 'Supervisor',
          lastName: 'One',
          supervisorId: 'manager-1',
        },
      };

      const supervisor = {
        id: 'supervisor-1',
        supervisorId: 'manager-1',
        supervisor: {
          id: 'manager-1',
          firstName: 'Manager',
          lastName: 'One',
          supervisorId: null,
        },
      };

      const manager = {
        id: 'manager-1',
        supervisorId: null,
        supervisor: null,
      };

      vi.mocked(mockPrisma.user.findUnique)
        .mockResolvedValueOnce(worker as any)
        .mockResolvedValueOnce(supervisor as any)
        .mockResolvedValueOnce(manager as any);

      const result = await personnelService.getSupervisorChain('worker-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('supervisor-1');
      expect(result[1].id).toBe('manager-1');
    });

    it('should prevent circular references in supervisor chain', async () => {
      const user1 = {
        id: 'user-1',
        supervisorId: 'user-2',
        supervisor: { id: 'user-2' },
      };

      const user2 = {
        id: 'user-2',
        supervisorId: 'user-1', // Circular reference
        supervisor: { id: 'user-1' },
      };

      vi.mocked(mockPrisma.user.findUnique)
        .mockResolvedValueOnce(user1 as any)
        .mockResolvedValueOnce(user2 as any);

      const result = await personnelService.getSupervisorChain('user-1');

      // Should stop when circular reference detected
      expect(result).toHaveLength(1);
    });

    it('should return empty array if personnel has no supervisor', async () => {
      const personnel = {
        id: 'user-1',
        supervisorId: null,
        supervisor: null,
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);

      const result = await personnelService.getSupervisorChain('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getAllSubordinates', () => {
    it('should get all subordinates recursively', async () => {
      const manager = {
        id: 'manager-1',
        subordinates: [
          { id: 'supervisor-1', firstName: 'Supervisor' },
          { id: 'supervisor-2', firstName: 'Supervisor' },
        ],
      };

      const supervisor1 = {
        id: 'supervisor-1',
        subordinates: [
          { id: 'worker-1', firstName: 'Worker' },
          { id: 'worker-2', firstName: 'Worker' },
        ],
      };

      const supervisor2 = {
        id: 'supervisor-2',
        subordinates: [{ id: 'worker-3', firstName: 'Worker' }],
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValueOnce(manager as any);
      vi.mocked(mockPrisma.user.findMany)
        .mockResolvedValueOnce([
          { id: 'supervisor-1', firstName: 'Supervisor' },
          { id: 'supervisor-2', firstName: 'Supervisor' },
        ] as any)
        .mockResolvedValueOnce([
          { id: 'worker-1', firstName: 'Worker' },
          { id: 'worker-2', firstName: 'Worker' },
        ] as any)
        .mockResolvedValueOnce([{ id: 'worker-3', firstName: 'Worker' }] as any)
        .mockResolvedValue([] as any);

      const result = await personnelService.getAllSubordinates('manager-1');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((u) => u.id === 'supervisor-1')).toBe(true);
      expect(result.some((u) => u.id === 'supervisor-2')).toBe(true);
    });
  });

  describe('Certification Management', () => {
    describe('getExpiringCertifications', () => {
      it('should get certifications expiring within 30 days', async () => {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 25);

        const mockCertifications = [
          {
            id: 'cert-1',
            expirationDate: futureDate,
            status: CertificationStatus.ACTIVE,
            personnel: { firstName: 'John', lastName: 'Doe' },
            qualification: { qualificationName: 'Welding Certification' },
          },
        ];

        vi.mocked(mockPrisma.personnelCertification.findMany).mockResolvedValue(
          mockCertifications as any
        );

        const result = await personnelService.getExpiringCertifications(30);

        expect(result).toHaveLength(1);
        expect(mockPrisma.personnelCertification.findMany).toHaveBeenCalledWith({
          where: {
            status: CertificationStatus.ACTIVE,
            expirationDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
          include: {
            personnel: true,
            qualification: true,
          },
          orderBy: { expirationDate: 'asc' },
        });
      });

      it('should support custom days ahead parameter', async () => {
        vi.mocked(mockPrisma.personnelCertification.findMany).mockResolvedValue([]);

        await personnelService.getExpiringCertifications(60);

        const call = vi.mocked(mockPrisma.personnelCertification.findMany).mock.calls[0][0];
        expect(call?.where?.expirationDate).toBeDefined();
      });
    });

    describe('getExpiredCertifications', () => {
      it('should get all expired certifications', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        const mockCertifications = [
          {
            id: 'cert-1',
            expirationDate: pastDate,
            status: CertificationStatus.EXPIRED,
          },
        ];

        vi.mocked(mockPrisma.personnelCertification.findMany).mockResolvedValue(
          mockCertifications as any
        );

        const result = await personnelService.getExpiredCertifications();

        expect(result).toHaveLength(1);
        expect(mockPrisma.personnelCertification.findMany).toHaveBeenCalledWith({
          where: {
            expirationDate: {
              lt: expect.any(Date),
            },
            status: CertificationStatus.ACTIVE,
          },
          include: {
            personnel: true,
            qualification: true,
          },
          orderBy: { expirationDate: 'asc' },
        });
      });
    });

    describe('createCertification', () => {
      it('should create new certification', async () => {
        const personnel = {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        };

        const qualification = {
          id: 'qual-1',
          qualificationName: 'Welding Level 1',
        };

        const certificationData = {
          personnelId: 'user-1',
          qualificationId: 'qual-1',
          certificationNumber: 'CERT-001',
          issuedDate: new Date('2025-01-01'),
          expirationDate: new Date('2026-01-01'),
          verifiedBy: 'admin-1',
          notes: 'Initial certification',
        };

        const createdCertification = {
          id: 'cert-1',
          ...certificationData,
          status: CertificationStatus.ACTIVE,
          personnel,
          qualification,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelQualification.findUnique).mockResolvedValue(
          qualification as any
        );
        vi.mocked(mockPrisma.personnelCertification.findUnique).mockResolvedValue(null);
        vi.mocked(mockPrisma.personnelCertification.create).mockResolvedValue(
          createdCertification as any
        );

        const result = await personnelService.createCertification(certificationData);

        expect(result).toEqual(createdCertification);
        expect(mockPrisma.personnelCertification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            personnelId: 'user-1',
            qualificationId: 'qual-1',
            status: CertificationStatus.ACTIVE,
          }),
          include: {
            personnel: true,
            qualification: true,
          },
        });
      });

      it('should throw NotFoundError for non-existent personnel', async () => {
        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

        await expect(
          personnelService.createCertification({
            personnelId: 'non-existent',
            qualificationId: 'qual-1',
            issuedDate: new Date(),
          })
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw NotFoundError for non-existent qualification', async () => {
        const personnel = { id: 'user-1' };
        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelQualification.findUnique).mockResolvedValue(null);

        await expect(
          personnelService.createCertification({
            personnelId: 'user-1',
            qualificationId: 'non-existent',
            issuedDate: new Date(),
          })
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw ConflictError for duplicate certification', async () => {
        const personnel = { id: 'user-1' };
        const qualification = { id: 'qual-1', qualificationName: 'Test' };
        const existingCert = { id: 'cert-1' };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelQualification.findUnique).mockResolvedValue(
          qualification as any
        );
        vi.mocked(mockPrisma.personnelCertification.findUnique).mockResolvedValue(
          existingCert as any
        );

        await expect(
          personnelService.createCertification({
            personnelId: 'user-1',
            qualificationId: 'qual-1',
            issuedDate: new Date(),
          })
        ).rejects.toThrow(ConflictError);
      });
    });

    describe('updateCertificationStatus', () => {
      it('should update certification status', async () => {
        const existingCert = {
          id: 'cert-1',
          status: CertificationStatus.ACTIVE,
        };

        const updatedCert = {
          ...existingCert,
          status: CertificationStatus.EXPIRED,
        };

        vi.mocked(mockPrisma.personnelCertification.findUnique).mockResolvedValue(
          existingCert as any
        );
        vi.mocked(mockPrisma.personnelCertification.update).mockResolvedValue(updatedCert as any);

        const result = await personnelService.updateCertificationStatus(
          'cert-1',
          CertificationStatus.EXPIRED
        );

        expect(result.status).toBe(CertificationStatus.EXPIRED);
      });
    });
  });

  describe('Skill Matrix Management', () => {
    describe('getSkillMatrix', () => {
      it('should get skill matrix for personnel', async () => {
        const mockPersonnel = { id: 'user-1', firstName: 'John' };
        const mockSkills = [
          {
            id: 'assignment-1',
            personnelId: 'user-1',
            skillId: 'skill-1',
            competencyLevel: CompetencyLevel.PROFICIENT,
            skill: {
              id: 'skill-1',
              skillName: 'CNC Programming',
            },
          },
        ];

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockPersonnel as any);
        vi.mocked(mockPrisma.personnelSkillAssignment.findMany).mockResolvedValue(mockSkills as any);

        const result = await personnelService.getSkillMatrix('user-1');

        expect(result).toHaveLength(1);
        expect(result[0].competencyLevel).toBe(CompetencyLevel.PROFICIENT);
        expect(mockPrisma.personnelSkillAssignment.findMany).toHaveBeenCalledWith({
          where: { personnelId: 'user-1' },
          include: { skill: true },
          orderBy: expect.arrayContaining([
            { competencyLevel: 'desc' },
            { lastUsedDate: 'desc' },
          ]),
        });
      });
    });

    describe('assignSkill', () => {
      it('should create new skill assignment', async () => {
        const personnel = { id: 'user-1' };
        const skill = { id: 'skill-1', skillName: 'Welding' };

        const skillData = {
          personnelId: 'user-1',
          skillId: 'skill-1',
          competencyLevel: CompetencyLevel.COMPETENT,
          assessedBy: 'supervisor-1',
          assessedAt: new Date(),
        };

        const createdAssignment = {
          id: 'assignment-1',
          ...skillData,
          personnel,
          skill,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelSkill.findUnique).mockResolvedValue(skill as any);
        vi.mocked(mockPrisma.personnelSkillAssignment.findUnique).mockResolvedValue(null);
        vi.mocked(mockPrisma.personnelSkillAssignment.create).mockResolvedValue(
          createdAssignment as any
        );

        const result = await personnelService.assignSkill(skillData);

        expect(result).toEqual(createdAssignment);
        expect(mockPrisma.personnelSkillAssignment.create).toHaveBeenCalled();
      });

      it('should update existing skill assignment', async () => {
        const personnel = { id: 'user-1' };
        const skill = { id: 'skill-1', skillName: 'Welding' };
        const existingAssignment = {
          id: 'assignment-1',
          competencyLevel: CompetencyLevel.COMPETENT,
        };

        const skillData = {
          personnelId: 'user-1',
          skillId: 'skill-1',
          competencyLevel: CompetencyLevel.PROFICIENT,
        };

        const updatedAssignment = {
          ...existingAssignment,
          ...skillData,
          personnel,
          skill,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelSkill.findUnique).mockResolvedValue(skill as any);
        vi.mocked(mockPrisma.personnelSkillAssignment.findUnique).mockResolvedValue(
          existingAssignment as any
        );
        vi.mocked(mockPrisma.personnelSkillAssignment.update).mockResolvedValue(
          updatedAssignment as any
        );

        const result = await personnelService.assignSkill(skillData);

        expect(result.competencyLevel).toBe(CompetencyLevel.PROFICIENT);
        expect(mockPrisma.personnelSkillAssignment.update).toHaveBeenCalled();
      });

      it('should throw NotFoundError for non-existent skill', async () => {
        const personnel = { id: 'user-1' };
        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.personnelSkill.findUnique).mockResolvedValue(null);

        await expect(
          personnelService.assignSkill({
            personnelId: 'user-1',
            skillId: 'non-existent',
            competencyLevel: CompetencyLevel.NOVICE,
          })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('getPersonnelBySkill', () => {
      it('should get all personnel with specific skill', async () => {
        const mockAssignments = [
          {
            personnel: {
              id: 'user-1',
              firstName: 'John',
              lastName: 'Doe',
              personnelClass: { className: 'Operator' },
            },
            competencyLevel: CompetencyLevel.EXPERT,
          },
          {
            personnel: {
              id: 'user-2',
              firstName: 'Jane',
              lastName: 'Smith',
              personnelClass: { className: 'Technician' },
            },
            competencyLevel: CompetencyLevel.PROFICIENT,
          },
        ];

        vi.mocked(mockPrisma.personnelSkillAssignment.findMany).mockResolvedValue(
          mockAssignments as any
        );

        const result = await personnelService.getPersonnelBySkill('skill-1');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('user-1');
      });

      it('should filter by minimum competency level', async () => {
        const mockAssignments = [
          {
            personnel: { id: 'user-1', firstName: 'Expert' },
            competencyLevel: CompetencyLevel.EXPERT,
          },
        ];

        vi.mocked(mockPrisma.personnelSkillAssignment.findMany).mockResolvedValue(
          mockAssignments as any
        );

        await personnelService.getPersonnelBySkill('skill-1', CompetencyLevel.PROFICIENT);

        const call = vi.mocked(mockPrisma.personnelSkillAssignment.findMany).mock.calls[0][0];
        expect(call?.where?.competencyLevel).toBeDefined();
      });
    });
  });

  describe('Work Center Assignment', () => {
    describe('assignToWorkCenter', () => {
      it('should assign personnel to work center', async () => {
        const personnel = { id: 'user-1' };
        const workCenter = { id: 'wc-1', name: 'Assembly Line 1' };

        const assignmentData = {
          personnelId: 'user-1',
          workCenterId: 'wc-1',
          isPrimary: false,
          effectiveDate: new Date(),
        };

        const createdAssignment = {
          id: 'assignment-1',
          ...assignmentData,
          personnel,
          workCenter,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.workCenter.findUnique).mockResolvedValue(workCenter as any);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.findUnique).mockResolvedValue(null);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.create).mockResolvedValue(
          createdAssignment as any
        );

        const result = await personnelService.assignToWorkCenter(assignmentData);

        expect(result).toEqual(createdAssignment);
      });

      it('should unset other primary assignments when assigning as primary', async () => {
        const personnel = { id: 'user-1' };
        const workCenter = { id: 'wc-1', name: 'Assembly Line 1' };

        const assignmentData = {
          personnelId: 'user-1',
          workCenterId: 'wc-1',
          isPrimary: true,
        };

        const createdAssignment = {
          id: 'assignment-1',
          ...assignmentData,
          personnel,
          workCenter,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.workCenter.findUnique).mockResolvedValue(workCenter as any);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.findUnique).mockResolvedValue(null);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.updateMany).mockResolvedValue({
          count: 1,
        } as any);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.create).mockResolvedValue(
          createdAssignment as any
        );

        await personnelService.assignToWorkCenter(assignmentData);

        expect(mockPrisma.personnelWorkCenterAssignment.updateMany).toHaveBeenCalledWith({
          where: {
            personnelId: 'user-1',
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      });

      it('should throw ConflictError for duplicate assignment', async () => {
        const personnel = { id: 'user-1' };
        const workCenter = { id: 'wc-1', name: 'Assembly Line 1' };
        const existingAssignment = { id: 'assignment-1' };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(personnel as any);
        vi.mocked(mockPrisma.workCenter.findUnique).mockResolvedValue(workCenter as any);
        vi.mocked(mockPrisma.personnelWorkCenterAssignment.findUnique).mockResolvedValue(
          existingAssignment as any
        );

        await expect(
          personnelService.assignToWorkCenter({
            personnelId: 'user-1',
            workCenterId: 'wc-1',
          })
        ).rejects.toThrow(ConflictError);
      });
    });

    describe('getPersonnelByWorkCenter', () => {
      it('should get all personnel assigned to work center', async () => {
        const mockAssignments = [
          {
            personnel: {
              id: 'user-1',
              firstName: 'John',
              personnelClass: { className: 'Operator' },
            },
            isPrimary: true,
          },
          {
            personnel: {
              id: 'user-2',
              firstName: 'Jane',
              personnelClass: { className: 'Technician' },
            },
            isPrimary: false,
          },
        ];

        vi.mocked(mockPrisma.personnelWorkCenterAssignment.findMany).mockResolvedValue(
          mockAssignments as any
        );

        const result = await personnelService.getPersonnelByWorkCenter('wc-1');

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Availability Management', () => {
    describe('createAvailability', () => {
      it('should create availability record', async () => {
        const mockPersonnel = { id: 'user-1', firstName: 'John' };
        const availabilityData = {
          personnelId: 'user-1',
          availabilityType: AvailabilityType.AVAILABLE,
          startDateTime: new Date('2025-10-20T08:00:00Z'),
          endDateTime: new Date('2025-10-20T17:00:00Z'),
          shiftCode: 'DAY',
        };

        const createdAvailability = {
          id: 'avail-1',
          ...availabilityData,
          isRecurring: false,
          approvedAt: null,
        };

        vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockPersonnel as any);
        vi.mocked(mockPrisma.personnelAvailability.create).mockResolvedValue(
          createdAvailability as any
        );

        const result = await personnelService.createAvailability(availabilityData);

        expect(result).toEqual(createdAvailability);
        expect(mockPrisma.personnelAvailability.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            personnelId: 'user-1',
            availabilityType: AvailabilityType.AVAILABLE,
            startDateTime: availabilityData.startDateTime,
            endDateTime: availabilityData.endDateTime,
            shiftCode: 'DAY',
            isRecurring: false,
          }),
          include: {
            personnel: true,
          },
        });
      });
    });

    describe('getAvailability', () => {
      it('should get availability for personnel in date range', async () => {
        const startDate = new Date('2025-10-20');
        const endDate = new Date('2025-10-27');

        const mockAvailability = [
          {
            id: 'avail-1',
            personnelId: 'user-1',
            availabilityType: AvailabilityType.AVAILABLE,
            startDateTime: new Date('2025-10-21T08:00:00Z'),
            endDateTime: new Date('2025-10-21T17:00:00Z'),
          },
        ];

        vi.mocked(mockPrisma.personnelAvailability.findMany).mockResolvedValue(
          mockAvailability as any
        );

        const result = await personnelService.getAvailability('user-1', startDate, endDate);

        expect(result).toHaveLength(1);
        expect(mockPrisma.personnelAvailability.findMany).toHaveBeenCalledWith({
          where: {
            personnelId: 'user-1',
            OR: expect.arrayContaining([
              expect.objectContaining({
                startDateTime: { gte: startDate, lte: endDate },
              }),
              expect.objectContaining({
                endDateTime: { gte: startDate, lte: endDate },
              }),
              expect.objectContaining({
                startDateTime: { lte: startDate },
                endDateTime: { gte: endDate },
              }),
            ]),
          },
          orderBy: { startDateTime: 'asc' },
        });
      });
    });
  });

  describe('ISA-95 Compliance', () => {
    it('should support all 5 competency levels', () => {
      const levels = Object.values(CompetencyLevel);
      expect(levels).toContain(CompetencyLevel.NOVICE);
      expect(levels).toContain(CompetencyLevel.ADVANCED_BEGINNER);
      expect(levels).toContain(CompetencyLevel.COMPETENT);
      expect(levels).toContain(CompetencyLevel.PROFICIENT);
      expect(levels).toContain(CompetencyLevel.EXPERT);
      expect(levels).toHaveLength(5);
    });

    it('should support all certification statuses', () => {
      const statuses = Object.values(CertificationStatus);
      expect(statuses).toContain(CertificationStatus.ACTIVE);
      expect(statuses).toContain(CertificationStatus.EXPIRED);
      expect(statuses).toContain(CertificationStatus.SUSPENDED);
      expect(statuses).toContain(CertificationStatus.REVOKED);
    });

    it('should support all availability types', () => {
      const types = Object.values(AvailabilityType);
      expect(types).toContain(AvailabilityType.AVAILABLE);
      expect(types).toContain(AvailabilityType.UNAVAILABLE);
      expect(types).toContain(AvailabilityType.VACATION);
      expect(types).toContain(AvailabilityType.SICK_LEAVE);
      expect(types).toContain(AvailabilityType.TRAINING);
      expect(types).toContain(AvailabilityType.MEETING);
      expect(types).toHaveLength(6);
    });
  });
});
