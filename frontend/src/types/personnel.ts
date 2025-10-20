/**
 * Personnel Management Types
 * Phase 2: Personnel Management Enhancements
 */

// ============================================
// ENUMS
// ============================================

export type CompetencyLevel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'EXPERT';

export type CertificationStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'PENDING'
  | 'REVOKED';

export type AvailabilityType =
  | 'AVAILABLE'
  | 'ON_SHIFT'
  | 'ON_BREAK'
  | 'ON_LEAVE'
  | 'TRAINING'
  | 'UNAVAILABLE';

// ============================================
// ENTITY INTERFACES
// ============================================

export interface Personnel {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  personnelClassId?: string;
  supervisorId?: string;
  isActive: boolean;
  hireDate?: string;
  terminationDate?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Relations
  personnelClass?: {
    id: string;
    className: string;
  };
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  competencies?: PersonnelCompetency[];
  certifications?: PersonnelCertification[];
  qualifications?: PersonnelQualification[];
  workAssignments?: WorkCenterAssignment[];
  availability?: PersonnelAvailability[];
}

export interface PersonnelCompetency {
  id: string;
  personnelId: string;
  skillName: string;
  skillType?: string;
  level: CompetencyLevel;
  certifiedDate?: string;
  expirationDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelCertification {
  id: string;
  personnelId: string;
  certificationName: string;
  certificationNumber?: string;
  issuingAuthority?: string;
  issueDate: string;
  expirationDate?: string;
  status: CertificationStatus;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelQualification {
  id: string;
  personnelId: string;
  qualificationName: string;
  qualificationType?: string;
  achievedDate: string;
  expirationDate?: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCenterAssignment {
  id: string;
  personnelId: string;
  workCenterId: string;
  assignmentType?: string;
  startDate: string;
  endDate?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  workCenter?: {
    id: string;
    workcenterName: string;
  };
}

export interface PersonnelAvailability {
  id: string;
  personnelId: string;
  availabilityType: AvailabilityType;
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface PersonnelQueryParams {
  personnelClassId?: string;
  supervisorId?: string;
  department?: string;
  isActive?: boolean;
  includeRelations?: boolean;
}

export interface PersonnelFilters {
  search?: string | null;
  department?: string | null;
  personnelClassId?: string | null;
  isActive?: boolean | null;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface PersonnelStatistics {
  total: number;
  active: number;
  inactive: number;
  byDepartment: Record<string, number>;
  activeCertifications: number;
  expiringSoon: number;
}

// ============================================
// UI COLOR/LABEL MAPPINGS
// ============================================

export const COMPETENCY_LEVEL_COLORS: Record<CompetencyLevel, string> = {
  BEGINNER: 'blue',
  INTERMEDIATE: 'cyan',
  ADVANCED: 'green',
  EXPERT: 'gold',
};

export const COMPETENCY_LEVEL_LABELS: Record<CompetencyLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

export const CERTIFICATION_STATUS_COLORS: Record<CertificationStatus, string> = {
  ACTIVE: 'green',
  EXPIRED: 'red',
  PENDING: 'orange',
  REVOKED: 'default',
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  PENDING: 'Pending',
  REVOKED: 'Revoked',
};

export const AVAILABILITY_TYPE_COLORS: Record<AvailabilityType, string> = {
  AVAILABLE: 'green',
  ON_SHIFT: 'blue',
  ON_BREAK: 'orange',
  ON_LEAVE: 'red',
  TRAINING: 'purple',
  UNAVAILABLE: 'default',
};

export const AVAILABILITY_TYPE_LABELS: Record<AvailabilityType, string> = {
  AVAILABLE: 'Available',
  ON_SHIFT: 'On Shift',
  ON_BREAK: 'On Break',
  ON_LEAVE: 'On Leave',
  TRAINING: 'In Training',
  UNAVAILABLE: 'Unavailable',
};
