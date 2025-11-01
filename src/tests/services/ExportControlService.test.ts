/**
 * Export Control Services - Unit Tests
 * Tests for classification, screening, licensing, and compliance services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ExportControlClassificationService from '../../services/ExportControlClassificationService';
import PersonScreeningService from '../../services/PersonScreeningService';
import ExportLicenseService from '../../services/ExportLicenseService';
import ExportComplianceService from '../../services/ExportComplianceService';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ExportControlClassificationService', () => {
  let classificationService: ExportControlClassificationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    classificationService = new ExportControlClassificationService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(classificationService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(classificationService.classifyPart).toBeDefined();
      expect(classificationService.getClassification).toBeDefined();
      expect(classificationService.determineCommodityJurisdiction).toBeDefined();
      expect(classificationService.validateECCN).toBeDefined();
      expect(classificationService.validateUSMLCategory).toBeDefined();
      expect(classificationService.getUSMLCategories).toBeDefined();
      expect(classificationService.checkCountryAuthorization).toBeDefined();
      expect(classificationService.scheduleNextReview).toBeDefined();
    });
  });

  describe('classifyPart', () => {
    it('should classify ITAR controlled part', async () => {
      const input = {
        partNumber: 'PART-001',
        partName: 'Defense Article',
        isITARControlled: true,
        isEARControlled: false,
        usmlCategory: 'V',
        classificationBasis: 'Defense article per USML',
      };

      const result = await classificationService.classifyPart(input, 'user-1');

      expect(result).toBeDefined();
      expect(result.partNumber).toBe('PART-001');
      expect(result.isITARControlled).toBe(true);
      expect(result.usmlCategory).toBe('V');
      expect(result.requiresExportLicense).toBe(true);
    });

    it('should classify EAR controlled part', async () => {
      const input = {
        partNumber: 'PART-002',
        partName: 'Controlled Item',
        isITARControlled: false,
        isEARControlled: true,
        eccn: '7A103',
        classificationBasis: 'Encryption/dual-use',
      };

      const result = await classificationService.classifyPart(input, 'user-1');

      expect(result).toBeDefined();
      expect(result.isEARControlled).toBe(true);
      expect(result.eccn).toBe('7A103');
      expect(result.requiresExportLicense).toBe(true);
    });

    it('should throw error if neither ITAR nor EAR controlled', async () => {
      const input = {
        partNumber: 'PART-003',
        partName: 'Non-controlled',
        isITARControlled: false,
        isEARControlled: false,
        classificationBasis: 'Public domain',
      };

      await expect(classificationService.classifyPart(input, 'user-1')).rejects.toThrow();
    });
  });

  describe('validateECCN', () => {
    it('should validate correct ECCN format', () => {
      const result = classificationService.validateECCN('3A001');

      expect(result.valid).toBe(true);
    });

    it('should validate EAR99', () => {
      const result = classificationService.validateECCN('EAR99');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid ECCN format', () => {
      const result = classificationService.validateECCN('INVALID');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateUSMLCategory', () => {
    it('should validate USML category I', () => {
      const result = classificationService.validateUSMLCategory('I');

      expect(result.valid).toBe(true);
      expect(result.description).toBeDefined();
    });

    it('should reject invalid USML category', () => {
      const result = classificationService.validateUSMLCategory('INVALID');

      expect(result.valid).toBe(false);
    });
  });

  describe('getUSMLCategories', () => {
    it('should return all USML categories', () => {
      const categories = classificationService.getUSMLCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('checkCountryAuthorization', () => {
    it('should authorize non-prohibited country', () => {
      const result = classificationService.checkCountryAuthorization('CA', ['IR', 'KP']);

      expect(result.authorized).toBe(true);
    });

    it('should deny prohibited country', () => {
      const result = classificationService.checkCountryAuthorization('IR', ['IR', 'KP']);

      expect(result.authorized).toBe(false);
    });

    it('should check authorized countries list', () => {
      const result = classificationService.checkCountryAuthorization('CA', [], ['US', 'CA']);

      expect(result.authorized).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await classificationService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('PersonScreeningService', () => {
  let screeningService: PersonScreeningService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    screeningService = new PersonScreeningService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(screeningService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(screeningService.screenPerson).toBeDefined();
      expect(screeningService.batchScreenPersons).toBeDefined();
      expect(screeningService.verifyUSPersonStatus).toBeDefined();
      expect(screeningService.getScreeningHistory).toBeDefined();
      expect(screeningService.scheduleRescreen).toBeDefined();
    });
  });

  describe('screenPerson', () => {
    it('should screen U.S. person as cleared', async () => {
      const result = await screeningService.screenPerson('person-1', {
        firstName: 'John',
        lastName: 'Smith',
        isUSPerson: true,
        createdById: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('CLEARED');
      expect(result.overallRisk).toBe('LOW');
    });

    it('should detect foreign person from high-risk country', async () => {
      const result = await screeningService.screenPerson('person-2', {
        firstName: 'Test',
        lastName: 'Person',
        isUSPerson: false,
        countryOfCitizenship: 'IR',
        createdById: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.overallRisk).toBe('MEDIUM');
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('batchScreenPersons', () => {
    it('should batch screen multiple persons', async () => {
      const results = await screeningService.batchScreenPersons(['person-1', 'person-2']);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });
  });

  describe('verifyUSPersonStatus', () => {
    it('should verify U.S. person status', async () => {
      const result = await screeningService.verifyUSPersonStatus('person-1');

      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
      expect(typeof result.isUSPerson).toBe('boolean');
    });
  });

  describe('screening lists', () => {
    it('should get DPL info', () => {
      const info = screeningService.getDeniedPartiesListInfo();

      expect(info).toBeDefined();
      expect(info.count).toBeGreaterThanOrEqual(0);
      expect(info.lastUpdated).toBeDefined();
    });

    it('should get Entity List info', () => {
      const info = screeningService.getEntityListInfo();

      expect(info).toBeDefined();
      expect(info.count).toBeGreaterThanOrEqual(0);
      expect(info.source).toBeDefined();
    });

    it('should get SDN List info', () => {
      const info = screeningService.getSDNListInfo();

      expect(info).toBeDefined();
      expect(info.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await screeningService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('ExportLicenseService', () => {
  let licenseService: ExportLicenseService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    licenseService = new ExportLicenseService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(licenseService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(licenseService.createLicense).toBeDefined();
      expect(licenseService.getLicense).toBeDefined();
      expect(licenseService.validateLicenseCoverage).toBeDefined();
      expect(licenseService.recordUtilization).toBeDefined();
      expect(licenseService.getExpiringLicenses).toBeDefined();
      expect(licenseService.revokeLicense).toBeDefined();
    });
  });

  describe('createLicense', () => {
    it('should create DSP-5 export license', async () => {
      const input = {
        licenseNumber: 'DTC-12345',
        licenseType: 'DSP_5' as const,
        issuingAgency: 'DDTC' as const,
        coveredParts: ['PART-001'],
        authorizedCountries: ['CA', 'GB'],
        issueDate: new Date(2024, 0, 1),
        expirationDate: new Date(2026, 0, 1),
        createdById: 'user-1',
      };

      const result = await licenseService.createLicense(input);

      expect(result).toBeDefined();
      expect(result.licenseNumber).toBe('DTC-12345');
      expect(result.status).toBe('ACTIVE');
      expect(result.daysUntilExpiration).toBeGreaterThan(0);
    });

    it('should throw error if expiration before issue date', async () => {
      const input = {
        licenseNumber: 'BAD-001',
        licenseType: 'DSP_5' as const,
        issuingAgency: 'DDTC' as const,
        coveredParts: [],
        authorizedCountries: [],
        issueDate: new Date(2026, 0, 1),
        expirationDate: new Date(2024, 0, 1),
        createdById: 'user-1',
      };

      await expect(licenseService.createLicense(input)).rejects.toThrow();
    });
  });

  describe('validateLicenseCoverage', () => {
    it('should validate license covers part and destination', async () => {
      const result = await licenseService.validateLicenseCoverage('DTC-12345', 'PART-001', 'CA');

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });
  });

  describe('recordUtilization', () => {
    it('should record license utilization', async () => {
      const result = await licenseService.recordUtilization(
        'DTC-12345',
        new Date(),
        'PART-001',
        10,
        'CA',
        'Company Ltd'
      );

      expect(result).toBeDefined();
      expect(result.licenseNumber).toBe('DTC-12345');
      expect(result.quantity).toBe(10);
    });
  });

  describe('getExpiringLicenses', () => {
    it('should get licenses expiring within threshold', async () => {
      const licenses = await licenseService.getExpiringLicenses(90);

      expect(licenses).toBeDefined();
      expect(Array.isArray(licenses)).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await licenseService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});

describe('ExportComplianceService', () => {
  let complianceService: ExportComplianceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    complianceService = new ExportComplianceService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(complianceService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(complianceService.createAudit).toBeDefined();
      expect(complianceService.getComplianceMetrics).toBeDefined();
      expect(complianceService.recordCorrectiveAction).toBeDefined();
      expect(complianceService.generateComplianceReport).toBeDefined();
    });
  });

  describe('createAudit', () => {
    it('should create internal audit', async () => {
      const result = await complianceService.createAudit('INTERNAL_AUDIT', 'Scope: Part classification review', 'auditor-1');

      expect(result).toBeDefined();
      expect(result.auditType).toBe('INTERNAL_AUDIT');
      expect(result.status).toBe('PLANNED');
    });
  });

  describe('getComplianceMetrics', () => {
    it('should get compliance metrics', async () => {
      const metrics = await complianceService.getComplianceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalPersonsScreened).toBeGreaterThanOrEqual(0);
      expect(metrics.activeExportLicenses).toBeGreaterThanOrEqual(0);
      expect(metrics.complianceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 11, 31);

      const report = await complianceService.generateComplianceReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.auditsCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await complianceService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
