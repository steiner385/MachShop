/**
 * SerializationService Tests
 * Comprehensive test suite for serial number generation and serialized part management
 *
 * GitHub Issue #176: Epic 2: Backend Service Testing - Phase 2 (Business Critical)
 * Priority: P1 - Milestone 2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SerializationService,
  SerialNumberFormat,
  GeneratedSerialNumber
} from '../../services/SerializationService';
import { SerializedPart } from '@prisma/client';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    serializedPart: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

describe('SerializationService', () => {
  let service: SerializationService;
  let mockPrisma: any;

  // Mock data
  const mockSerializedPart: SerializedPart = {
    id: 'part-1',
    serialNumber: 'SN-20231101-000001-7',
    partId: 'part-123',
    workOrderId: 'wo-456',
    lotNumber: 'LOT-789',
    status: 'IN_PRODUCTION',
    currentLocation: 'ASSEMBLY_CELL_1',
    manufactureDate: new Date('2023-11-01'),
    shipDate: null,
    customerInfo: 'Customer ABC',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new SerializationService();
    mockPrisma = prisma as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SerializationService);
    });

    it('should provide default format configuration', () => {
      const defaultFormat = (service as any).getDefaultFormat();
      expect(defaultFormat).toBeDefined();
      expect(defaultFormat.prefix).toBeDefined();
      expect(defaultFormat.sequencePadding).toBeDefined();
    });
  });

  describe('Serial Number Generation', () => {
    describe('generateSerialNumber', () => {
      beforeEach(() => {
        // Mock database sequence operations
        mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 123 }]);
      });

      it('should generate serial number with default format', async () => {
        const result = await service.generateSerialNumber();

        expect(result).toBeDefined();
        expect(result.serialNumber).toBeTruthy();
        expect(result.sequenceNumber).toBe(123);
        expect(result.generatedAt).toBeInstanceOf(Date);
        expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      });

      it('should generate serial number with custom format', async () => {
        const customFormat: SerialNumberFormat = {
          pattern: '{PREFIX}-{YYYY}{MM}{DD}-{SEQUENCE}-{CHECK}',
          prefix: 'FAI',
          sequencePadding: 8,
          includeCheckDigit: true,
        };

        const result = await service.generateSerialNumber(customFormat);

        expect(result).toBeDefined();
        expect(result.serialNumber).toContain('FAI-');
        expect(result.serialNumber).toMatch(/FAI-\d{8}-\d{8}-\d/);
        expect(result.checkDigit).toBeDefined();
      });

      it('should generate serial number without check digit', async () => {
        const format: SerialNumberFormat = {
          prefix: 'TEST',
          includeCheckDigit: false,
        };

        const result = await service.generateSerialNumber(format);

        expect(result.checkDigit).toBeUndefined();
        expect(result.serialNumber).not.toContain('-');
      });

      it('should handle custom sequence names', async () => {
        const format: SerialNumberFormat = {
          sequenceName: 'custom_sequence',
          prefix: 'CUSTOM',
        };

        await service.generateSerialNumber(format);

        expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringContaining('custom_sequence')])
        );
      });

      it('should handle date placeholders in pattern', async () => {
        const format: SerialNumberFormat = {
          pattern: '{PREFIX}-{YYYY}-{MM}-{DD}-{SEQUENCE}',
          prefix: 'DATE',
        };

        const result = await service.generateSerialNumber(format);
        const today = new Date();
        const expectedYear = today.getFullYear();
        const expectedMonth = String(today.getMonth() + 1).padStart(2, '0');
        const expectedDay = String(today.getDate()).padStart(2, '0');

        expect(result.serialNumber).toContain(`DATE-${expectedYear}-${expectedMonth}-${expectedDay}`);
      });

      it('should handle random placeholders', async () => {
        const format: SerialNumberFormat = {
          pattern: '{PREFIX}-{RANDOM}',
          prefix: 'RND',
          randomLength: 6,
        };

        const result = await service.generateSerialNumber(format);

        expect(result.serialNumber).toMatch(/RND-[A-Z0-9]{6}/);
      });

      it('should throw error on database failure', async () => {
        mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

        await expect(service.generateSerialNumber()).rejects.toThrow('Serial number generation failed');
      });
    });

    describe('generateSerialNumberBatch', () => {
      beforeEach(() => {
        mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 100 }]);
        mockPrisma.$executeRaw.mockResolvedValue({});
      });

      it('should generate batch of serial numbers', async () => {
        const count = 5;
        const result = await service.generateSerialNumberBatch(count);

        expect(result).toHaveLength(count);
        expect(result[0].sequenceNumber).toBe(100);
        expect(result[4].sequenceNumber).toBe(104);

        result.forEach((serial, index) => {
          expect(serial.serialNumber).toBeTruthy();
          expect(serial.sequenceNumber).toBe(100 + index);
          expect(serial.generatedAt).toBeInstanceOf(Date);
        });
      });

      it('should generate batch with custom format', async () => {
        const format: SerialNumberFormat = {
          prefix: 'BATCH',
          sequencePadding: 4,
        };

        const result = await service.generateSerialNumberBatch(3, format);

        expect(result).toHaveLength(3);
        result.forEach(serial => {
          expect(serial.serialNumber).toContain('BATCH');
        });
      });

      it('should validate batch count limits', async () => {
        await expect(service.generateSerialNumberBatch(0)).rejects.toThrow(
          'Batch count must be between 1 and 10,000'
        );

        await expect(service.generateSerialNumberBatch(10001)).rejects.toThrow(
          'Batch count must be between 1 and 10,000'
        );
      });

      it('should handle maximum batch size', async () => {
        const result = await service.generateSerialNumberBatch(10000);
        expect(result).toHaveLength(10000);
      });
    });

    describe('Check Digit Calculation', () => {
      it('should calculate valid check digits using Luhn algorithm', () => {
        const testCases = [
          { input: '123456789', expectedValid: true },
          { input: 'SN-20231101-000001', expectedValid: true },
          { input: 'SIMPLE123', expectedValid: true },
        ];

        testCases.forEach(({ input }) => {
          const checkDigit = (service as any).calculateCheckDigit(input);
          expect(checkDigit).toBeDefined();
          expect(checkDigit).toMatch(/^\d$/);
        });
      });

      it('should validate serial numbers with check digits', () => {
        const validSerial = 'SN-20231101-000001-7';
        const invalidSerial = 'SN-20231101-000001-9';

        expect((service as any).validateSerialNumber(validSerial)).toBe(true);
        expect((service as any).validateSerialNumber(invalidSerial)).toBe(false);
      });
    });
  });

  describe('Serialized Part Management', () => {
    describe('createSerializedPart', () => {
      beforeEach(() => {
        mockPrisma.serializedPart.create.mockResolvedValue(mockSerializedPart);
        mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      });

      it('should create serialized part with valid data', async () => {
        const partData = {
          serialNumber: 'SN-20231101-000001-7',
          partId: 'part-123',
          workOrderId: 'wo-456',
          lotNumber: 'LOT-789',
          status: 'IN_PRODUCTION',
          currentLocation: 'ASSEMBLY_CELL_1',
          manufactureDate: new Date('2023-11-01'),
          customerInfo: 'Customer ABC',
        };

        const result = await service.createSerializedPart(partData);

        expect(result).toEqual(mockSerializedPart);
        expect(mockPrisma.serializedPart.create).toHaveBeenCalledWith({
          data: partData,
        });
      });

      it('should reject invalid serial number format', async () => {
        const partData = {
          serialNumber: 'INVALID-SERIAL',
          partId: 'part-123',
          status: 'IN_PRODUCTION',
        };

        await expect(service.createSerializedPart(partData)).rejects.toThrow(
          'Invalid serial number format'
        );
      });

      it('should handle duplicate serial numbers with retry logic', async () => {
        mockPrisma.serializedPart.findUnique
          .mockResolvedValueOnce(mockSerializedPart) // First attempt: duplicate found
          .mockResolvedValueOnce(null); // Second attempt: available

        mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 124 }]);

        const partData = {
          serialNumber: 'SN-20231101-000001-7',
          partId: 'part-123',
          status: 'IN_PRODUCTION',
        };

        const result = await service.createSerializedPart(partData);

        expect(result).toEqual(mockSerializedPart);
        expect(mockPrisma.serializedPart.findUnique).toHaveBeenCalledTimes(2);
      });

      it('should fail after maximum retry attempts', async () => {
        mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
        mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 125 }]);

        const partData = {
          serialNumber: 'SN-20231101-000001-7',
          partId: 'part-123',
          status: 'IN_PRODUCTION',
        };

        await expect(service.createSerializedPart(partData)).rejects.toThrow(
          'Unable to create serialized part after 5 attempts'
        );
      });
    });

    describe('getSerializedPart', () => {
      it('should retrieve serialized part by serial number', async () => {
        mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);

        const result = await service.getSerializedPart('SN-20231101-000001-7');

        expect(result).toEqual(mockSerializedPart);
        expect(mockPrisma.serializedPart.findUnique).toHaveBeenCalledWith({
          where: { serialNumber: 'SN-20231101-000001-7' },
          include: {
            part: true,
            workOrder: true,
          },
        });
      });

      it('should return null for non-existent serial number', async () => {
        mockPrisma.serializedPart.findUnique.mockResolvedValue(null);

        const result = await service.getSerializedPart('NON-EXISTENT');

        expect(result).toBeNull();
      });

      it('should handle database errors gracefully', async () => {
        mockPrisma.serializedPart.findUnique.mockRejectedValue(new Error('Database error'));

        await expect(service.getSerializedPart('SN-123')).rejects.toThrow('Database error');
      });
    });

    describe('updateSerializedPartStatus', () => {
      it('should update part status and location', async () => {
        const updatedPart = { ...mockSerializedPart, status: 'COMPLETED' };
        mockPrisma.serializedPart.update.mockResolvedValue(updatedPart);

        const result = await service.updateSerializedPartStatus(
          'SN-20231101-000001-7',
          'COMPLETED',
          'SHIPPING_DOCK'
        );

        expect(result).toEqual(updatedPart);
        expect(mockPrisma.serializedPart.update).toHaveBeenCalledWith({
          where: { serialNumber: 'SN-20231101-000001-7' },
          data: {
            status: 'COMPLETED',
            currentLocation: 'SHIPPING_DOCK',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should update status only without location', async () => {
        const updatedPart = { ...mockSerializedPart, status: 'COMPLETED' };
        mockPrisma.serializedPart.update.mockResolvedValue(updatedPart);

        await service.updateSerializedPartStatus('SN-20231101-000001-7', 'COMPLETED');

        expect(mockPrisma.serializedPart.update).toHaveBeenCalledWith({
          where: { serialNumber: 'SN-20231101-000001-7' },
          data: {
            status: 'COMPLETED',
            updatedAt: expect.any(Date),
          },
        });
      });
    });

    describe('listSerializedParts', () => {
      it('should list parts with filters', async () => {
        const mockParts = [mockSerializedPart];
        mockPrisma.serializedPart.findMany.mockResolvedValue(mockParts);

        const filters = {
          partId: 'part-123',
          status: 'IN_PRODUCTION',
          workOrderId: 'wo-456',
        };

        const result = await service.listSerializedParts(filters);

        expect(result).toEqual(mockParts);
        expect(mockPrisma.serializedPart.findMany).toHaveBeenCalledWith({
          where: filters,
          include: {
            part: true,
            workOrder: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should handle pagination', async () => {
        const mockParts = [mockSerializedPart];
        mockPrisma.serializedPart.findMany.mockResolvedValue(mockParts);

        const filters = { limit: 10, offset: 20 };
        await service.listSerializedParts(filters);

        expect(mockPrisma.serializedPart.findMany).toHaveBeenCalledWith({
          where: {},
          include: {
            part: true,
            workOrder: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 20,
        });
      });

      it('should handle date range filters', async () => {
        const startDate = new Date('2023-11-01');
        const endDate = new Date('2023-11-30');
        const filters = { startDate, endDate };

        await service.listSerializedParts(filters);

        expect(mockPrisma.serializedPart.findMany).toHaveBeenCalledWith({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            part: true,
            workOrder: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      });
    });
  });

  describe('Sequence Management', () => {
    describe('initializeSequence', () => {
      beforeEach(() => {
        mockPrisma.$executeRaw.mockResolvedValue({});
      });

      it('should initialize new sequence with default start value', async () => {
        await service.initializeSequence('test_sequence');

        expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringContaining('CREATE SEQUENCE test_sequence')])
        );
      });

      it('should initialize sequence with custom start value', async () => {
        await service.initializeSequence('custom_sequence', 1000);

        expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('CREATE SEQUENCE custom_sequence START WITH 1000')
          ])
        );
      });

      it('should handle sequence creation errors', async () => {
        mockPrisma.$executeRaw.mockRejectedValue(new Error('Sequence exists'));

        await expect(service.initializeSequence('existing_sequence')).rejects.toThrow(
          'Failed to initialize sequence'
        );
      });
    });

    describe('Private Sequence Methods', () => {
      it('should get next sequence value', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 456 }]);

        const result = await (service as any).getNextSequence('test_sequence');

        expect(result).toBe(456);
        expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringContaining('SELECT nextval')])
        );
      });

      it('should increment sequence by count', async () => {
        mockPrisma.$executeRaw.mockResolvedValue({});

        await (service as any).incrementSequence('test_sequence', 5);

        expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('SELECT setval'),
            expect.stringContaining('+ 5')
          ])
        );
      });

      it('should ensure sequence exists before use', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);
        mockPrisma.$executeRaw.mockResolvedValue({});

        await (service as any).ensureSequenceExists('new_sequence');

        expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringContaining('SELECT EXISTS')])
        );
        expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringContaining('CREATE SEQUENCE')])
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('Format Building', () => {
      it('should build serial number from pattern with all placeholders', () => {
        const format: SerialNumberFormat = {
          pattern: '{PREFIX}-{YYYY}{MM}{DD}-{SEQUENCE}-{RANDOM}',
          prefix: 'TEST',
          sequencePadding: 6,
          randomLength: 4,
        };

        const result = (service as any).buildSerialNumber(format, 123);

        expect(result).toMatch(/^TEST-\d{8}-\d{6}-[A-Z0-9]{4}$/);
      });

      it('should handle missing pattern with default format', () => {
        const format: SerialNumberFormat = { prefix: 'DEF' };
        const result = (service as any).buildSerialNumber(format, 456);

        expect(result).toBeTruthy();
        expect(result).toContain('DEF');
      });

      it('should pad sequence numbers correctly', () => {
        const format: SerialNumberFormat = {
          pattern: '{SEQUENCE}',
          sequencePadding: 8,
        };

        const result = (service as any).buildSerialNumber(format, 42);

        expect(result).toBe('00000042');
      });
    });

    describe('Validation Methods', () => {
      it('should validate correctly formatted serial numbers', () => {
        const validSerials = [
          'SN-20231101-000001-7',
          'FAI-123456-8',
          'TEST-000001',
          'A1B2C3D4E5',
        ];

        validSerials.forEach(serial => {
          expect((service as any).validateSerialNumber(serial)).toBe(true);
        });
      });

      it('should reject invalid serial number formats', () => {
        const invalidSerials = [
          '',
          'TOO_SHORT',
          'CONTAINS SPACES',
          'has-lowercase',
          'SPECIAL!@#$%',
        ];

        invalidSerials.forEach(serial => {
          expect((service as any).validateSerialNumber(serial)).toBe(false);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      await expect(service.getSerializedPart('')).resolves.toBeNull();

      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      await expect(service.getSerializedPart('')).resolves.toBeNull();
    });

    it('should handle database connection errors', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      await expect(service.generateSerialNumber()).rejects.toThrow(
        'Serial number generation failed'
      );
    });

    it('should handle concurrent access scenarios', async () => {
      // Simulate concurrent sequence access
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ nextval: 100 }])
        .mockResolvedValueOnce([{ nextval: 101 }]);

      const [result1, result2] = await Promise.all([
        service.generateSerialNumber(),
        service.generateSerialNumber(),
      ]);

      expect(result1.sequenceNumber).toBe(100);
      expect(result2.sequenceNumber).toBe(101);
      expect(result1.serialNumber).not.toBe(result2.serialNumber);
    });

    it('should handle large batch generation performance', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 1000 }]);
      mockPrisma.$executeRaw.mockResolvedValue({});

      const startTime = Date.now();
      const largeBatch = await service.generateSerialNumberBatch(1000);
      const endTime = Date.now();

      expect(largeBatch).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Integration Scenarios', () => {
    it('should support aerospace traceability requirements', async () => {
      const aerospaceFormat: SerialNumberFormat = {
        pattern: 'AS-{YYYY}{MM}{DD}-{SEQUENCE}-{CHECK}',
        prefix: 'AS',
        sequencePadding: 8,
        includeCheckDigit: true,
        sequenceName: 'aerospace_serial_seq',
      };

      mockPrisma.$queryRaw.mockResolvedValue([{ nextval: 12345 }]);

      const result = await service.generateSerialNumber(aerospaceFormat);

      expect(result.serialNumber).toMatch(/^AS-\d{8}-\d{8}-\d$/);
      expect(result.checkDigit).toBeDefined();
    });

    it('should support manufacturing lot tracking', async () => {
      const partData = {
        serialNumber: 'LOT-20231101-000001-7',
        partId: 'turbine-blade-001',
        workOrderId: 'wo-aerospace-456',
        lotNumber: 'HEAT-TREAT-BATCH-789',
        status: 'IN_PRODUCTION',
        currentLocation: 'HEAT_TREAT_FURNACE_3',
        manufactureDate: new Date(),
      };

      mockPrisma.serializedPart.create.mockResolvedValue({
        ...mockSerializedPart,
        ...partData,
      });
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);

      const result = await service.createSerializedPart(partData);

      expect(result.lotNumber).toBe('HEAT-TREAT-BATCH-789');
      expect(result.currentLocation).toBe('HEAT_TREAT_FURNACE_3');
    });

    it('should support work order completion tracking', async () => {
      const filters = {
        workOrderId: 'wo-456',
        status: 'COMPLETED',
      };

      mockPrisma.serializedPart.findMany.mockResolvedValue([mockSerializedPart]);

      const completedParts = await service.listSerializedParts(filters);

      expect(completedParts).toHaveLength(1);
      expect(mockPrisma.serializedPart.findMany).toHaveBeenCalledWith({
        where: filters,
        include: {
          part: true,
          workOrder: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});