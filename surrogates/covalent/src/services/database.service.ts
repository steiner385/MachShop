/**
 * In-Memory Database Service
 * Manages persistent state for training and certification data
 */

import { DatabaseState, PersonnelRecord, Skill, SkillMatrix, TrainingProgram, TrainingEnrollment, Certification, CertificationType, WebhookEvent } from '@/models/types';

class DatabaseService {
  private state: DatabaseState;

  constructor() {
    this.state = this.initializeEmptyState();
  }

  private initializeEmptyState(): DatabaseState {
    return {
      personnel: [],
      skills: [],
      skillMatrix: [],
      trainingPrograms: [],
      trainingEnrollments: [],
      certifications: [],
      certificationTypes: [],
      webhookLogs: [],
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Get current database state
   */
  getState(): DatabaseState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Personnel management
   */
  addPersonnel(personnel: PersonnelRecord): void {
    const existingIndex = this.state.personnel.findIndex(p => p.id === personnel.id);
    if (existingIndex >= 0) {
      this.state.personnel[existingIndex] = personnel;
    } else {
      this.state.personnel.push(personnel);
    }
  }

  getPersonnel(id: string): PersonnelRecord | undefined {
    return this.state.personnel.find(p => p.id === id);
  }

  getAllPersonnel(): PersonnelRecord[] {
    return JSON.parse(JSON.stringify(this.state.personnel));
  }

  queryPersonnel(filter: Partial<PersonnelRecord>): PersonnelRecord[] {
    return this.state.personnel.filter(p => {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && (p as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Skills management
   */
  addSkill(skill: Skill): void {
    const existingIndex = this.state.skills.findIndex(s => s.id === skill.id);
    if (existingIndex >= 0) {
      this.state.skills[existingIndex] = skill;
    } else {
      this.state.skills.push(skill);
    }
  }

  getSkill(id: string): Skill | undefined {
    return this.state.skills.find(s => s.id === id);
  }

  getAllSkills(): Skill[] {
    return JSON.parse(JSON.stringify(this.state.skills));
  }

  /**
   * Skill matrix management
   */
  addSkillMatrix(matrix: SkillMatrix): void {
    const existingIndex = this.state.skillMatrix.findIndex(m => m.id === matrix.id);
    if (existingIndex >= 0) {
      this.state.skillMatrix[existingIndex] = matrix;
    } else {
      this.state.skillMatrix.push(matrix);
    }
  }

  getSkillMatrixByOperation(operationId: string): SkillMatrix | undefined {
    return this.state.skillMatrix.find(m => m.operationId === operationId);
  }

  /**
   * Training program management
   */
  addTrainingProgram(program: TrainingProgram): void {
    const existingIndex = this.state.trainingPrograms.findIndex(p => p.id === program.id);
    if (existingIndex >= 0) {
      this.state.trainingPrograms[existingIndex] = program;
    } else {
      this.state.trainingPrograms.push(program);
    }
  }

  getTrainingProgram(id: string): TrainingProgram | undefined {
    return this.state.trainingPrograms.find(p => p.id === id);
  }

  getAllTrainingPrograms(): TrainingProgram[] {
    return JSON.parse(JSON.stringify(this.state.trainingPrograms));
  }

  /**
   * Training enrollment management
   */
  addTrainingEnrollment(enrollment: TrainingEnrollment): void {
    const existingIndex = this.state.trainingEnrollments.findIndex(e => e.id === enrollment.id);
    if (existingIndex >= 0) {
      this.state.trainingEnrollments[existingIndex] = enrollment;
    } else {
      this.state.trainingEnrollments.push(enrollment);
    }
  }

  getTrainingEnrollment(id: string): TrainingEnrollment | undefined {
    return this.state.trainingEnrollments.find(e => e.id === id);
  }

  getPersonnelTraining(personnelId: string): TrainingEnrollment[] {
    return this.state.trainingEnrollments.filter(e => e.personnelId === personnelId);
  }

  /**
   * Certification management
   */
  addCertification(cert: Certification): void {
    const existingIndex = this.state.certifications.findIndex(c => c.id === cert.id);
    if (existingIndex >= 0) {
      this.state.certifications[existingIndex] = cert;
    } else {
      this.state.certifications.push(cert);
    }
  }

  getCertification(id: string): Certification | undefined {
    return this.state.certifications.find(c => c.id === id);
  }

  getPersonnelCertifications(personnelId: string): Certification[] {
    return this.state.certifications.filter(c => c.personnelId === personnelId);
  }

  /**
   * Certification type management
   */
  addCertificationType(type: CertificationType): void {
    const existingIndex = this.state.certificationTypes.findIndex(t => t.id === type.id);
    if (existingIndex >= 0) {
      this.state.certificationTypes[existingIndex] = type;
    } else {
      this.state.certificationTypes.push(type);
    }
  }

  getCertificationType(id: string): CertificationType | undefined {
    return this.state.certificationTypes.find(t => t.id === id);
  }

  /**
   * Webhook logging
   */
  logWebhookEvent(event: WebhookEvent): void {
    this.state.webhookLogs.push(event);
  }

  getWebhookLogs(limit: number = 100): WebhookEvent[] {
    return this.state.webhookLogs.slice(-limit);
  }

  /**
   * Database reset
   */
  resetDatabase(): void {
    this.state = this.initializeEmptyState();
  }

  /**
   * Partial reset
   */
  partialReset(options: { personnel?: boolean; training?: boolean; certifications?: boolean; skills?: boolean; webhooks?: boolean }): void {
    if (options.personnel) this.state.personnel = [];
    if (options.training) {
      this.state.trainingPrograms = [];
      this.state.trainingEnrollments = [];
    }
    if (options.certifications) {
      this.state.certifications = [];
      this.state.certificationTypes = [];
    }
    if (options.skills) this.state.skills = [];
    if (options.webhooks) this.state.webhookLogs = [];
    this.state.lastReset = new Date().toISOString();
  }

  /**
   * Load initial data
   */
  loadInitialData(data: Partial<DatabaseState>): void {
    if (data.personnel) this.state.personnel = data.personnel;
    if (data.skills) this.state.skills = data.skills;
    if (data.skillMatrix) this.state.skillMatrix = data.skillMatrix;
    if (data.trainingPrograms) this.state.trainingPrograms = data.trainingPrograms;
    if (data.trainingEnrollments) this.state.trainingEnrollments = data.trainingEnrollments;
    if (data.certifications) this.state.certifications = data.certifications;
    if (data.certificationTypes) this.state.certificationTypes = data.certificationTypes;
  }
}

export const databaseService = new DatabaseService();
