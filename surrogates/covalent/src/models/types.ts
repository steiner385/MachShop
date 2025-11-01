/**
 * Covalent Training & Certification Management - Type Definitions
 * Issue #244: Training & Certification Management Surrogates
 */

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE'
}

export enum SkillLevel {
  NOVICE = 'NOVICE',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER'
}

export enum CertificationStatus {
  ISSUED = 'ISSUED',
  CURRENT = 'CURRENT',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  RENEWAL_IN_PROGRESS = 'RENEWAL_IN_PROGRESS'
}

export enum TrainingStatus {
  ENROLLED = 'ENROLLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ASSESSED = 'ASSESSED',
  CERTIFIED = 'CERTIFIED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum CourseDeliveryMethod {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID',
  SELF_PACED = 'SELF_PACED'
}

// Personnel Models
export interface PersonnelRecord {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  shift: string;
  reportingManager: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillAssessment {
  id: string;
  personnelId: string;
  skillId: string;
  currentLevel: SkillLevel;
  assessmentDate: string;
  assessorName: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

// Skill Models
export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  requiredLevel: SkillLevel;
  certificationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillMatrix {
  id: string;
  operationId: string;
  operationName: string;
  equipmentId?: string;
  requiredSkills: SkillRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillRequirement {
  skillId: string;
  skillName: string;
  requiredLevel: SkillLevel;
  isCritical: boolean;
}

// Training Models
export interface TrainingProgram {
  id: string;
  courseCode: string;
  courseName: string;
  description: string;
  category: string;
  deliveryMethod: CourseDeliveryMethod;
  duration: number; // in hours
  instructorId: string;
  instructorName: string;
  prerequisites: string[]; // Course IDs
  successRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingEnrollment {
  id: string;
  personnelId: string;
  courseId: string;
  enrollmentDate: string;
  status: TrainingStatus;
  completionDate?: string;
  assessmentScore?: number;
  assessmentPassed?: boolean;
  instructor?: string;
  createdAt: string;
  updatedAt: string;
}

// Certification Models
export interface Certification {
  id: string;
  personnelId: string;
  certificationTypeId: string;
  certificationName: string;
  certificateNumber: string;
  issuanceDate: string;
  expirationDate: string;
  status: CertificationStatus;
  issuer: string;
  requirements?: string[];
  renewalTrainingRequired?: string;
  suspendedUntil?: string;
  revocationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationType {
  id: string;
  name: string;
  standard?: string; // e.g., "AWS D17.1", "AS9100"
  description: string;
  validityPeriodMonths: number;
  requiredTrainingCourses: string[]; // Course IDs
  assessmentRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// Webhook Models
export interface WebhookEvent {
  id: string;
  eventType: string; // e.g., 'CERTIFICATION_EXPIRING', 'TRAINING_COMPLETED'
  timestamp: string;
  payload: Record<string, any>;
  retryCount: number;
  nextRetry?: string;
}

// API Request/Response Models
export interface QualificationCheckRequest {
  personnelId: string;
  operationId: string;
}

export interface QualificationCheckResponse {
  personnelId: string;
  operationId: string;
  qualified: boolean;
  reason?: string;
  missingSkills?: string[];
  expiredCertifications?: string[];
  expiringCertifications?: {
    certificationId: string;
    certificationName: string;
    daysUntilExpiration: number;
  }[];
  certificationDetails?: {
    id: string;
    name: string;
    status: CertificationStatus;
    expirationDate: string;
  }[];
}

export interface AlertPayload {
  alertType: 'CERTIFICATION_EXPIRING' | 'CERTIFICATION_EXPIRED' | 'MISSING_SKILLS' | 'TRAINING_DUE';
  personnelId: string;
  personalName: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ResetStateRequest {
  includePersonnel?: boolean;
  includeTraining?: boolean;
  includeCertifications?: boolean;
  includeSkills?: boolean;
  includeWebhookLogs?: boolean;
}

export interface DatabaseState {
  personnel: PersonnelRecord[];
  skills: Skill[];
  skillMatrix: SkillMatrix[];
  trainingPrograms: TrainingProgram[];
  trainingEnrollments: TrainingEnrollment[];
  certifications: Certification[];
  certificationTypes: CertificationType[];
  webhookLogs: WebhookEvent[];
  lastReset: string;
}
