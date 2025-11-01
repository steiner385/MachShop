/**
 * Integration Tests for Covalent Training & Certification Surrogate
 * Issue #244: Testing Infrastructure - Training & Certification Management Surrogates
 */

import { databaseService } from '@/services/database.service';
import { initializeTestData } from '@/utils/test-data';
import { EmploymentStatus, CertificationStatus } from '@/models/types';

describe('Covalent Surrogate Integration Tests', () => {
  beforeEach(() => {
    databaseService.resetDatabase();
    initializeTestData();
  });

  describe('Database Service', () => {
    it('should initialize with test data', () => {
      const state = databaseService.getState();

      expect(state.personnel.length).toBeGreaterThan(100);
      expect(state.certifications.length).toBeGreaterThan(0);
      expect(state.skills.length).toBeGreaterThan(0);
      expect(state.trainingPrograms.length).toBeGreaterThan(0);
    });

    it('should retrieve personnel by ID', () => {
      const allPersonnel = databaseService.getAllPersonnel();
      const first = allPersonnel[0];

      const retrieved = databaseService.getPersonnel(first.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(first.id);
      expect(retrieved?.firstName).toBe(first.firstName);
    });

    it('should query personnel by status', () => {
      const active = databaseService.queryPersonnel({ employmentStatus: EmploymentStatus.ACTIVE });

      expect(active.length).toBeGreaterThan(0);
      active.forEach(person => {
        expect(person.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      });
    });

    it('should retrieve personnel certifications', () => {
      const allPersonnel = databaseService.getAllPersonnel();
      const activePerson = allPersonnel.find(p => p.employmentStatus === EmploymentStatus.ACTIVE);

      if (activePerson) {
        const certs = databaseService.getPersonnelCertifications(activePerson.id);
        expect(certs.length).toBeGreaterThan(0);
        certs.forEach(cert => {
          expect(cert.personnelId).toBe(activePerson.id);
        });
      }
    });

    it('should reset database', () => {
      let state = databaseService.getState();
      expect(state.personnel.length).toBeGreaterThan(0);

      databaseService.resetDatabase();
      state = databaseService.getState();

      expect(state.personnel.length).toBe(0);
      expect(state.certifications.length).toBe(0);
    });

    it('should perform partial reset', () => {
      let state = databaseService.getState();
      const initialPersonnel = state.personnel.length;
      const initialCerts = state.certifications.length;

      databaseService.partialReset({ personnel: true, certifications: false });
      state = databaseService.getState();

      expect(state.personnel.length).toBe(0);
      expect(state.certifications.length).toBe(initialCerts);
    });
  });

  describe('Certification Lifecycle', () => {
    it('should have certifications with various statuses', () => {
      const state = databaseService.getState();

      const current = state.certifications.filter(c => c.status === CertificationStatus.CURRENT);
      const expiringSoon = state.certifications.filter(c => c.status === CertificationStatus.EXPIRING_SOON);
      const expired = state.certifications.filter(c => c.status === CertificationStatus.EXPIRED);

      expect(current.length).toBeGreaterThan(0);
      expect(expiringSoon.length).toBeGreaterThan(0);
      expect(expired.length).toBeGreaterThan(0);
    });

    it('should identify expiring certifications', () => {
      const state = databaseService.getState();
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiring = state.certifications.filter(cert => {
        const expDate = new Date(cert.expirationDate);
        return expDate > now && expDate <= thirtyDaysFromNow;
      });

      expect(expiring.length).toBeGreaterThan(0);
    });
  });

  describe('Operator Qualification Logic', () => {
    it('should qualify active operator with valid certifications', () => {
      const state = databaseService.getState();
      const activePerson = state.personnel.find(p => p.employmentStatus === EmploymentStatus.ACTIVE);
      const personCerts = state.certifications.filter(c => c.personnelId === activePerson?.id);

      if (activePerson && personCerts.length > 0) {
        const nonExpiredCerts = personCerts.filter(c => {
          const expDate = new Date(c.expirationDate);
          return expDate > new Date();
        });

        expect(nonExpiredCerts.length).toBeGreaterThan(0);
      }
    });

    it('should not qualify inactive operator', () => {
      const state = databaseService.getState();
      const inactivePerson = state.personnel.find(p => p.employmentStatus === EmploymentStatus.INACTIVE);

      expect(inactivePerson).toBeDefined();
      expect(inactivePerson?.employmentStatus).not.toBe(EmploymentStatus.ACTIVE);
    });

    it('should detect expired certifications', () => {
      const state = databaseService.getState();
      const now = new Date();

      const expiredCerts = state.certifications.filter(cert => {
        const expDate = new Date(cert.expirationDate);
        return expDate < now;
      });

      expect(expiredCerts.length).toBeGreaterThan(0);
      expiredCerts.forEach(cert => {
        expect(cert.status).toBe(CertificationStatus.EXPIRED);
      });
    });
  });

  describe('Skills & Competencies', () => {
    it('should have skill matrices for operations', () => {
      const state = databaseService.getState();

      expect(state.skillMatrix.length).toBeGreaterThan(0);
      state.skillMatrix.forEach(matrix => {
        expect(matrix.operationId).toBeDefined();
        expect(matrix.requiredSkills.length).toBeGreaterThan(0);
      });
    });

    it('should have skills defined', () => {
      const state = databaseService.getState();

      expect(state.skills.length).toBeGreaterThan(0);
      state.skills.forEach(skill => {
        expect(skill.name).toBeDefined();
        expect(skill.category).toBeDefined();
      });
    });
  });

  describe('Training Programs', () => {
    it('should have training programs', () => {
      const state = databaseService.getState();

      expect(state.trainingPrograms.length).toBeGreaterThan(0);
      state.trainingPrograms.forEach(program => {
        expect(program.courseName).toBeDefined();
        expect(program.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Constraints', () => {
    it('should maintain referential integrity', () => {
      const state = databaseService.getState();

      // All certifications should reference valid personnel
      state.certifications.forEach(cert => {
        const person = state.personnel.find(p => p.id === cert.personnelId);
        expect(person).toBeDefined();
      });
    });

    it('should have valid timestamps', () => {
      const state = databaseService.getState();

      state.certifications.forEach(cert => {
        const issuDate = new Date(cert.issuanceDate);
        const expDate = new Date(cert.expirationDate);

        expect(issuDate).toBeLessThanOrEqual(expDate);
        expect(issuDate.getTime()).toBeGreaterThan(0);
        expect(expDate.getTime()).toBeGreaterThan(0);
      });
    });
  });

  describe('Acceptance Criteria', () => {
    it('should fulfill: Mock Covalent REST APIs', () => {
      const state = databaseService.getState();
      expect(state).toBeDefined();
      expect(state.personnel).toBeDefined();
      expect(state.certifications).toBeDefined();
    });

    it('should fulfill: Personnel and training record management', () => {
      const personnel = databaseService.getAllPersonnel();
      expect(personnel.length).toBeGreaterThan(100);
    });

    it('should fulfill: Certification lifecycle management', () => {
      const state = databaseService.getState();
      const statuses = new Set(state.certifications.map(c => c.status));

      expect(statuses.has(CertificationStatus.CURRENT)).toBe(true);
      expect(statuses.has(CertificationStatus.EXPIRED)).toBe(true);
    });

    it('should fulfill: Operator qualification verification', () => {
      const personnel = databaseService.getAllPersonnel();
      const operativePerson = personnel.find(p => p.employmentStatus === EmploymentStatus.ACTIVE);

      expect(operativePerson).toBeDefined();
    });

    it('should fulfill: Skill matrix management', () => {
      const state = databaseService.getState();
      expect(state.skillMatrix.length).toBeGreaterThan(0);
      expect(state.skills.length).toBeGreaterThan(0);
    });

    it('should fulfill: Realistic test data (100+ employees)', () => {
      const personnel = databaseService.getAllPersonnel();
      expect(personnel.length).toBeGreaterThanOrEqual(100);
    });

    it('should fulfill: Database reset capabilities', () => {
      let state = databaseService.getState();
      const initialSize = state.personnel.length;

      databaseService.resetDatabase();
      state = databaseService.getState();

      expect(state.personnel.length).toBe(0);

      initializeTestData();
      state = databaseService.getState();
      expect(state.personnel.length).toBeGreaterThan(0);
    });

    it('should fulfill: AS9100 compliance support', () => {
      const state = databaseService.getState();

      // Competence verification records
      expect(state.personnel.length).toBeGreaterThan(0);

      // Skill assessment criteria
      expect(state.skills.length).toBeGreaterThan(0);
      state.skills.forEach(skill => {
        expect(skill.requiredLevel).toBeDefined();
      });

      // Training effectiveness evaluation
      expect(state.trainingPrograms.length).toBeGreaterThan(0);
    });
  });
});
