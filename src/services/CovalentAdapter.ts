import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Covalent Skills Tracking Adapter
 *
 * Integrates with Covalent for operator skills, competency, and certification management
 * with AS9100 compliance for aerospace manufacturing.
 *
 * Features:
 * - Operator skill matrix and competency tracking
 * - Certification management (expiration tracking, renewals)
 * - Training effectiveness monitoring
 * - AS9102 First Article Inspector qualification tracking
 * - Special process certifications (welding, NDT, composite layup, etc.)
 * - Work authorization validation (prevent unqualified operators from starting work)
 * - Digital signatures for qualified personnel
 * - Training records and audit trails
 * - Skill level progression tracking
 *
 * AS9100 Compliance:
 * - Clause 7.2: Competence (personnel qualification)
 * - Clause 7.3: Awareness (training and competence awareness)
 * - AS9102: First Article Inspector qualification requirements
 * - Special process personnel certification per NADCAP
 * - Training effectiveness evaluation
 * - Competency records retention
 *
 * Integration Points:
 * - Work Order Assignment: Validate operator qualified for operation
 * - DNC Program Loading: Validate operator certified for machine/process
 * - FAI: Validate inspector qualifications per AS9102
 * - Electronic Signatures: Link signature to competency records
 * - Material Review Board: Validate MRB member qualifications
 *
 * Covalent API Documentation:
 * https://www.covalent.com/api-documentation
 */

export interface CovalentConfig {
  baseUrl: string;              // Covalent server URL
  username: string;             // Authentication username
  password: string;             // Authentication password
  apiKey?: string;              // API Key for token-based auth
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
  autoSyncInterval?: number;    // Auto-sync interval in minutes (0 = disabled)
  validateBeforeWorkStart?: boolean; // Validate operator qualification before work starts
  blockExpiredCertifications?: boolean; // Prevent work if certification expired
}

/**
 * Operator/Personnel Record
 */
export interface CovalentOperator {
  operatorId: string;           // Unique operator ID (badge number)
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  shift?: string;
  hireDate?: Date;
  isActive: boolean;
  certifications: OperatorCertification[];
  skills: OperatorSkill[];
}

/**
 * Operator Certification
 */
export interface OperatorCertification {
  certificationId: string;
  operatorId: string;
  certificationType: string;    // Type (FAI_INSPECTOR, WELDER, NDT_LEVEL_2, CNC_PROGRAMMER, etc.)
  certificationLevel?: string;  // Level (BASIC, INTERMEDIATE, ADVANCED, LEVEL_1, LEVEL_2, etc.)
  certificationBody?: string;   // Issuing body (NADCAP, AWS, ASNT, etc.)
  certificationNumber?: string; // Certificate number
  issuedDate: Date;             // Issue date
  expirationDate?: Date;        // Expiration date
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'PENDING';
  requiresRenewal: boolean;     // Requires periodic renewal
  renewalFrequency?: number;    // Renewal frequency (days)
  certificateUrl?: string;      // URL to certificate document
  notes?: string;
}

/**
 * Operator Skill
 */
export interface OperatorSkill {
  skillId: string;
  operatorId: string;
  skillCategory: string;        // Category (MACHINING, INSPECTION, ASSEMBLY, etc.)
  skillName: string;            // Specific skill (CNC_MILLING, CMM_PROGRAMMING, etc.)
  skillLevel: 'TRAINEE' | 'QUALIFIED' | 'EXPERT'; // Proficiency level
  qualifiedDate?: Date;         // Date qualified at this level
  lastAssessmentDate?: Date;    // Last competency assessment
  nextAssessmentDate?: Date;    // Next assessment due date
  assessedBy?: string;          // Who performed assessment
  partComplexity?: string;      // Max part complexity (SIMPLE, MODERATE, COMPLEX)
  machineTypes?: string[];      // Qualified machine types
}

/**
 * Training Record
 */
export interface TrainingRecord {
  trainingId: string;
  operatorId: string;
  trainingType: string;         // Type (INITIAL, REFRESHER, OJT, CLASSROOM, etc.)
  trainingTopic: string;        // Topic/course name
  instructor?: string;          // Instructor name
  trainingDate: Date;           // Date of training
  duration?: number;            // Duration (hours)
  score?: number;               // Test score (if applicable)
  passingScore?: number;        // Required passing score
  passed: boolean;              // Did operator pass?
  effectivenessScore?: number;  // Training effectiveness (1-5)
  certificateUrl?: string;      // Training certificate URL
  notes?: string;
}

/**
 * Work Authorization Check Result
 */
export interface WorkAuthorizationResult {
  authorized: boolean;
  operatorId: string;
  operatorName: string;
  workType: string;
  partNumber?: string;
  machineType?: string;
  reasons: string[];            // Authorization reasons or failure reasons
  requiredCertifications?: string[];
  missingCertifications?: string[];
  expiredCertifications?: string[];
}

/**
 * Sync Result
 */
export interface OperatorSyncResult {
  success: boolean;
  operatorsSynced: number;
  operatorsFailed: number;
  errors: Array<{ operatorId: string; error: string }>;
  duration: number;
}

export class CovalentAdapter {
  private config: CovalentConfig;
  private httpClient: AxiosInstance;

  constructor(config: CovalentConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      autoSyncInterval: 0,
      validateBeforeWorkStart: true,
      blockExpiredCertifications: true,
      ...config,
    };

    // Create HTTP client for Covalent API
    const authHeader = this.config.apiKey
      ? { 'X-API-Key': this.config.apiKey }
      : { 'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}` };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeader,
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('Covalent API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('Covalent Skills Tracking Adapter initialized');
  }

  /**
   * Test connection to Covalent
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/v1/system/health');
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Sync operators from Covalent to MES
   */
  async syncOperatorsFromCovalent(activeOnly: boolean = true): Promise<OperatorSyncResult> {
    const startTime = Date.now();
    const result: OperatorSyncResult = {
      success: false,
      operatorsSynced: 0,
      operatorsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const params: any = {};
      if (activeOnly) {
        params.status = 'active';
      }

      const response = await this.httpClient.get('/api/v1/operators', { params });
      const operators = response.data.operators || [];

      for (const operator of operators) {
        try {
          const existingOperator = await prisma.user.findFirst({
            where: { employeeNumber: operator.operatorId },
          });

          const operatorData = {
            employeeNumber: operator.operatorId,
            firstName: operator.firstName,
            lastName: operator.lastName,
            email: operator.email,
            department: operator.department,
            shift: operator.shift,
            hireDate: operator.hireDate ? new Date(operator.hireDate) : null,
            isActive: operator.isActive,
            lastSyncedAt: new Date(),
          };

          if (existingOperator) {
            await prisma.user.update({
              where: { id: existingOperator.id },
              data: operatorData,
            });
          } else {
            await prisma.user.create({
              data: operatorData as any,
            });
          }

          result.operatorsSynced++;
        } catch (error: any) {
          result.operatorsFailed++;
          result.errors.push({
            operatorId: operator.operatorId,
            error: error.message,
          });
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Synced ${result.operatorsSynced} operators from Covalent (${result.operatorsFailed} failed)`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        operatorId: 'bulk_sync',
        error: error.message,
      });
      console.error('Failed to sync operators from Covalent:', error.message);
      return result;
    }
  }

  /**
   * Get operator details including certifications and skills
   */
  async getOperator(operatorId: string): Promise<CovalentOperator | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/operators/${operatorId}`, {
        params: { include: 'certifications,skills' },
      });

      const operator = response.data.operator;
      if (!operator) {
        return null;
      }

      return {
        operatorId: operator.operatorId,
        firstName: operator.firstName,
        lastName: operator.lastName,
        email: operator.email,
        department: operator.department,
        shift: operator.shift,
        hireDate: operator.hireDate ? new Date(operator.hireDate) : undefined,
        isActive: operator.isActive,
        certifications: operator.certifications || [],
        skills: operator.skills || [],
      };
    } catch (error: any) {
      console.error(`Failed to get operator ${operatorId}:`, error.message);
      return null;
    }
  }

  /**
   * Check if operator is authorized to perform work
   * Critical for DNC authorization handshake and work order assignment
   */
  async checkWorkAuthorization(params: {
    operatorId: string;
    workType: string;           // 'MACHINING', 'INSPECTION', 'ASSEMBLY', 'FAI', etc.
    partNumber?: string;
    partComplexity?: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
    machineType?: string;
    operationCode?: string;
    requiredCertifications?: string[];
  }): Promise<WorkAuthorizationResult> {
    try {
      const response = await this.httpClient.post('/api/v1/authorization/check', params);
      const auth = response.data.authorization;

      const operator = await this.getOperator(params.operatorId);
      const operatorName = operator ? `${operator.firstName} ${operator.lastName}` : params.operatorId;

      const result: WorkAuthorizationResult = {
        authorized: auth.authorized,
        operatorId: params.operatorId,
        operatorName,
        workType: params.workType,
        partNumber: params.partNumber,
        machineType: params.machineType,
        reasons: auth.reasons || [],
        requiredCertifications: auth.requiredCertifications || [],
        missingCertifications: auth.missingCertifications || [],
        expiredCertifications: auth.expiredCertifications || [],
      };

      if (!auth.authorized) {
        console.warn(`Work authorization DENIED for ${operatorName}: ${result.reasons.join(', ')}`);
      } else {
        console.log(`Work authorization APPROVED for ${operatorName}`);
      }

      return result;
    } catch (error: any) {
      console.error('Failed to check work authorization:', error.message);
      return {
        authorized: false,
        operatorId: params.operatorId,
        operatorName: params.operatorId,
        workType: params.workType,
        partNumber: params.partNumber,
        machineType: params.machineType,
        reasons: [`Authorization check failed: ${error.message}`],
      };
    }
  }

  /**
   * Validate FAI Inspector qualifications per AS9102
   * FAI inspectors must meet specific qualification requirements
   */
  async validateFAIInspector(operatorId: string): Promise<{
    qualified: boolean;
    certificationValid: boolean;
    certificationExpiry?: Date;
    reasons: string[];
  }> {
    try {
      const operator = await this.getOperator(operatorId);
      if (!operator) {
        return {
          qualified: false,
          certificationValid: false,
          reasons: [`Operator ${operatorId} not found`],
        };
      }

      // Check for FAI Inspector certification
      const faiCert = operator.certifications.find(
        cert => cert.certificationType === 'FAI_INSPECTOR' && cert.status === 'ACTIVE'
      );

      if (!faiCert) {
        return {
          qualified: false,
          certificationValid: false,
          reasons: ['No active FAI Inspector certification found'],
        };
      }

      // Check expiration
      const now = new Date();
      if (faiCert.expirationDate && faiCert.expirationDate < now) {
        return {
          qualified: false,
          certificationValid: false,
          certificationExpiry: faiCert.expirationDate,
          reasons: [`FAI Inspector certification expired on ${faiCert.expirationDate.toISOString()}`],
        };
      }

      return {
        qualified: true,
        certificationValid: true,
        certificationExpiry: faiCert.expirationDate,
        reasons: ['FAI Inspector qualifications verified'],
      };
    } catch (error: any) {
      console.error('Failed to validate FAI inspector:', error.message);
      return {
        qualified: false,
        certificationValid: false,
        reasons: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Get certifications expiring soon
   * For proactive renewal management
   */
  async getCertificationsExpiringSoon(days: number = 30): Promise<OperatorCertification[]> {
    try {
      const response = await this.httpClient.get('/api/v1/certifications/expiring', {
        params: { days },
      });

      return response.data.certifications || [];
    } catch (error: any) {
      console.error('Failed to get expiring certifications:', error.message);
      return [];
    }
  }

  /**
   * Get training records for an operator
   */
  async getTrainingRecords(operatorId: string, dateFrom?: Date): Promise<TrainingRecord[]> {
    try {
      const params: any = {};
      if (dateFrom) {
        params.from = dateFrom.toISOString();
      }

      const response = await this.httpClient.get(`/api/v1/operators/${operatorId}/training`, { params });
      return response.data.trainingRecords || [];
    } catch (error: any) {
      console.error(`Failed to get training records for ${operatorId}:`, error.message);
      return [];
    }
  }

  /**
   * Record training completion
   * Push training data from MES to Covalent when training is completed
   */
  async recordTrainingCompletion(training: {
    operatorId: string;
    trainingTopic: string;
    trainingDate: Date;
    instructor?: string;
    duration?: number;
    score?: number;
    passed: boolean;
    notes?: string;
  }): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/api/v1/training', training);
      console.log(`Training recorded for operator ${training.operatorId}: ${training.trainingTopic}`);
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error('Failed to record training:', error.message);
      throw new Error(`Failed to record training: ${error.message}`);
    }
  }

  /**
   * Evaluate training effectiveness
   * AS9100 requires monitoring training effectiveness
   */
  async evaluateTrainingEffectiveness(
    trainingId: string,
    effectivenessScore: number, // 1-5 scale
    evaluatedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.patch(`/api/v1/training/${trainingId}/effectiveness`, {
        effectivenessScore,
        evaluatedBy,
        notes,
        evaluationDate: new Date().toISOString(),
      });

      console.log(`Training effectiveness evaluated: ${trainingId} = ${effectivenessScore}/5`);
      return response.status === 200;
    } catch (error: any) {
      console.error('Failed to evaluate training effectiveness:', error.message);
      throw new Error(`Failed to evaluate training effectiveness: ${error.message}`);
    }
  }

  /**
   * Get qualified operators for a specific operation
   * Used for work order assignment and scheduling
   */
  async getQualifiedOperators(criteria: {
    workType: string;
    machineType?: string;
    partComplexity?: string;
    requiredCertifications?: string[];
    shift?: string;
  }): Promise<CovalentOperator[]> {
    try {
      const response = await this.httpClient.post('/api/v1/operators/qualified', criteria);
      return response.data.operators || [];
    } catch (error: any) {
      console.error('Failed to get qualified operators:', error.message);
      return [];
    }
  }

  /**
   * Link work performed to operator for competency tracking
   * Digital thread requirement
   */
  async linkWorkToOperator(params: {
    operatorId: string;
    workOrderNumber: string;
    operationCode: string;
    partNumber: string;
    serialNumber?: string;
    startTime: Date;
    endTime?: Date;
    quality?: 'PASS' | 'FAIL';
  }): Promise<void> {
    try {
      await this.httpClient.post('/api/v1/work-history', {
        ...params,
        recordedAt: new Date().toISOString(),
      });

      console.log(`Linked work to operator ${params.operatorId}: ${params.workOrderNumber} - ${params.operationCode}`);
    } catch (error: any) {
      console.error('Failed to link work to operator:', error.message);
      throw error;
    }
  }

  /**
   * Check operator certification for DNC program loading
   * Part of DNC authorization handshake
   */
  async checkDNCAuthorization(params: {
    operatorId: string;
    machineType: string;
    programName: string;
    partNumber: string;
    partComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  }): Promise<WorkAuthorizationResult> {
    return this.checkWorkAuthorization({
      operatorId: params.operatorId,
      workType: 'MACHINING',
      machineType: params.machineType,
      partNumber: params.partNumber,
      partComplexity: params.partComplexity,
      requiredCertifications: [`MACHINE_${params.machineType}`, 'CNC_OPERATOR'],
    });
  }

  /**
   * Get competency matrix for department
   * Overview of all operator skills and certifications
   */
  async getCompetencyMatrix(department?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (department) {
        params.department = department;
      }

      const response = await this.httpClient.get('/api/v1/competency-matrix', { params });
      return response.data.matrix || [];
    } catch (error: any) {
      console.error('Failed to get competency matrix:', error.message);
      return [];
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime?: number;
    lastSync?: Date;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      return { connected, responseTime };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('Covalent adapter cleanup completed');
  }
}

export default CovalentAdapter;
