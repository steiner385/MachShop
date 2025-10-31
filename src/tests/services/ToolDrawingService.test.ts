import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToolDrawingService } from '../../services/ToolDrawingService';
import { PrismaClient, ToolType, MaintenanceType } from '@prisma/client';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock PrismaClient
const mockPrisma = {
  toolDrawing: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  toolMaintenanceRecord: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  toolCalibrationRecord: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  toolUsageLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
} as any;

describe('ToolDrawingService', () => {
  let service: ToolDrawingService;

  beforeEach(() => {
    service = new ToolDrawingService(mockPrisma as PrismaClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createToolDrawing', () => {
    const mockCreateInput = {
      title: 'Cutting Tool V1',
      description: 'High precision cutting tool',
      toolType: ToolType.CUTTING_TOOL,
      toolSubtype: 'End Mill',
      material: 'Carbide',
      weight: 150,
      weightUnit: 'g',
      vendorName: 'ToolCorp',
      catalogNumber: 'TC-001',
      cost: 250.00,
      costCurrency: 'USD',
      requiresCalibration: true,
      calibrationInterval: 30,
      quantityOnHand: 10,
      minimumQuantity: 5,
      createdById: 'user-1'
    };

    const mockCreatedTool = {
      id: 'tool-1',
      documentNumber: 'TD-2024-001',
      title: 'Cutting Tool V1',
      toolType: ToolType.CUTTING_TOOL,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create tool drawing successfully', async () => {
      // Arrange
      mockPrisma.toolDrawing.count.mockResolvedValue(0);
      mockPrisma.toolDrawing.create.mockResolvedValue(mockCreatedTool);

      // Act
      const result = await service.createToolDrawing(mockCreateInput);

      // Assert
      expect(result).toEqual(mockCreatedTool);
      expect(mockPrisma.toolDrawing.create).toHaveBeenCalled();
    });

    it('should handle creation with minimal required fields', async () => {
      // Arrange
      const minimalInput = {
        title: 'Simple Tool',
        toolType: ToolType.MEASURING_TOOL,
        createdById: 'user-1'
      };
      mockPrisma.toolDrawing.count.mockResolvedValue(0);
      mockPrisma.toolDrawing.create.mockResolvedValue({
        ...mockCreatedTool,
        title: 'Simple Tool',
        toolType: ToolType.MEASURING_TOOL
      });

      // Act
      await service.createToolDrawing(minimalInput);

      // Assert
      expect(mockPrisma.toolDrawing.create).toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      mockPrisma.toolDrawing.count.mockResolvedValue(0);
      mockPrisma.toolDrawing.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createToolDrawing(mockCreateInput))
        .rejects.toThrow('Database error');
    });
  });

  describe('getToolDrawingById', () => {
    const toolId = 'tool-1';
    const mockTool = {
      id: toolId,
      documentNumber: 'TD-2024-001',
      title: 'Test Tool',
      toolType: ToolType.CUTTING_TOOL,
      version: 1,
      isActive: true
    };

    it('should get tool drawing by id successfully', async () => {
      // Arrange
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(mockTool);

      // Act
      const result = await service.getToolDrawingById(toolId);

      // Assert
      expect(result).toEqual(mockTool);
      expect(mockPrisma.toolDrawing.findUnique).toHaveBeenCalledWith({
        where: { id: toolId }
      });
    });

    it('should return null if tool not found', async () => {
      // Arrange
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getToolDrawingById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getToolDrawingByDocumentNumber', () => {
    const documentNumber = 'TD-2024-001';
    const mockTool = {
      id: 'tool-1',
      documentNumber,
      title: 'Test Tool',
      toolType: ToolType.CUTTING_TOOL
    };

    it('should get tool drawing by document number', async () => {
      // Arrange
      mockPrisma.toolDrawing.findFirst.mockResolvedValue(mockTool);

      // Act
      const result = await service.getToolDrawingByDocumentNumber(documentNumber);

      // Assert
      expect(result).toEqual(mockTool);
      expect(mockPrisma.toolDrawing.findFirst).toHaveBeenCalledWith({
        where: { documentNumber }
      });
    });

    it('should return null if document not found', async () => {
      // Arrange
      mockPrisma.toolDrawing.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getToolDrawingByDocumentNumber('NON-EXISTENT');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getToolDrawings', () => {
    const mockTools = [
      {
        id: 'tool-1',
        title: 'Tool 1',
        toolType: ToolType.CUTTING_TOOL,
        isActive: true
      },
      {
        id: 'tool-2',
        title: 'Tool 2',
        toolType: ToolType.MEASURING_TOOL,
        isActive: true
      }
    ];

    it('should get tool drawings with filters', async () => {
      // Arrange
      const filters = {
        toolType: ToolType.CUTTING_TOOL,
        isActive: true,
        page: 1,
        limit: 10
      };
      mockPrisma.toolDrawing.findMany.mockResolvedValue([mockTools[0]]);

      // Act
      const result = await service.getToolDrawings(filters);

      // Assert
      expect(result).toEqual([mockTools[0]]);
      expect(mockPrisma.toolDrawing.findMany).toHaveBeenCalledWith({
        where: {
          toolType: ToolType.CUTTING_TOOL,
          isActive: true
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should get tool drawings without filters', async () => {
      // Arrange
      mockPrisma.toolDrawing.findMany.mockResolvedValue(mockTools);

      // Act
      const result = await service.getToolDrawings({});

      // Assert
      expect(result).toEqual(mockTools);
      expect(mockPrisma.toolDrawing.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('updateToolDrawing', () => {
    const toolId = 'tool-1';
    const mockUpdateData = {
      title: 'Updated Tool',
      description: 'Updated description',
      cost: 300.00,
      updatedById: 'user-2'
    };

    const mockUpdatedTool = {
      id: toolId,
      title: 'Updated Tool',
      description: 'Updated description',
      cost: 300.00,
      version: 2,
      updatedAt: new Date()
    };

    it('should update tool drawing successfully', async () => {
      // Arrange
      mockPrisma.toolDrawing.update.mockResolvedValue(mockUpdatedTool);

      // Act
      const result = await service.updateToolDrawing(toolId, mockUpdateData);

      // Assert
      expect(result).toEqual(mockUpdatedTool);
      expect(mockPrisma.toolDrawing.update).toHaveBeenCalledWith({
        where: { id: toolId },
        data: expect.objectContaining({
          title: 'Updated Tool',
          description: 'Updated description',
          cost: 300.00,
          updatedAt: expect.any(Date)
        })
      });
    });

    it('should handle update of non-existent tool', async () => {
      // Arrange
      mockPrisma.toolDrawing.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(service.updateToolDrawing('non-existent', mockUpdateData))
        .rejects.toThrow('Record not found');
    });
  });

  describe('deleteToolDrawing', () => {
    const toolId = 'tool-1';
    const deletedById = 'user-1';

    it('should delete tool drawing successfully', async () => {
      // Arrange
      mockPrisma.toolDrawing.update.mockResolvedValue({
        id: toolId,
        isActive: false,
        deletedAt: new Date(),
        deletedById
      });

      // Act
      await service.deleteToolDrawing(toolId, deletedById);

      // Assert
      expect(mockPrisma.toolDrawing.update).toHaveBeenCalledWith({
        where: { id: toolId },
        data: {
          isActive: false,
          deletedAt: expect.any(Date),
          deletedById
        }
      });
    });

    it('should handle deletion of non-existent tool', async () => {
      // Arrange
      mockPrisma.toolDrawing.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(service.deleteToolDrawing('non-existent', deletedById))
        .rejects.toThrow('Record not found');
    });
  });

  describe('recordToolMaintenance', () => {
    const mockMaintenanceInput = {
      toolDrawingId: 'tool-1',
      maintenanceType: MaintenanceType.PREVENTIVE,
      description: 'Regular maintenance',
      performedById: 'user-1',
      performedByName: 'John Doe',
      maintenanceDate: new Date(),
      nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cost: 50.00,
      notes: 'Routine check'
    };

    const mockMaintenanceRecord = {
      id: 'maintenance-1',
      toolDrawingId: 'tool-1',
      maintenanceType: MaintenanceType.PREVENTIVE,
      description: 'Regular maintenance',
      performedAt: new Date()
    };

    it('should record tool maintenance successfully', async () => {
      // Arrange
      mockPrisma.toolMaintenanceRecord.create.mockResolvedValue(mockMaintenanceRecord);

      // Act
      const result = await service.recordToolMaintenance(mockMaintenanceInput);

      // Assert
      expect(result).toEqual(mockMaintenanceRecord);
      expect(mockPrisma.toolMaintenanceRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          toolDrawingId: 'tool-1',
          maintenanceType: MaintenanceType.PREVENTIVE,
          description: 'Regular maintenance',
          performedById: 'user-1',
          performedByName: 'John Doe',
          cost: 50.00,
          notes: 'Routine check'
        })
      });
    });
  });

  describe('getToolMaintenanceRecords', () => {
    const toolId = 'tool-1';
    const mockRecords = [
      {
        id: 'maintenance-1',
        toolDrawingId: toolId,
        maintenanceType: MaintenanceType.PREVENTIVE,
        performedAt: new Date()
      },
      {
        id: 'maintenance-2',
        toolDrawingId: toolId,
        maintenanceType: MaintenanceType.CORRECTIVE,
        performedAt: new Date()
      }
    ];

    it('should get maintenance records for tool', async () => {
      // Arrange
      mockPrisma.toolMaintenanceRecord.findMany.mockResolvedValue(mockRecords);

      // Act
      const result = await service.getToolMaintenanceRecords(toolId);

      // Assert
      expect(result).toEqual(mockRecords);
      expect(mockPrisma.toolMaintenanceRecord.findMany).toHaveBeenCalledWith({
        where: { toolDrawingId: toolId },
        orderBy: { performedAt: 'desc' }
      });
    });

    it('should return empty array if no records found', async () => {
      // Arrange
      mockPrisma.toolMaintenanceRecord.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getToolMaintenanceRecords('tool-with-no-records');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('recordToolCalibration', () => {
    const mockCalibrationInput = {
      toolDrawingId: 'tool-1',
      calibratedById: 'user-1',
      calibratedByName: 'John Doe',
      calibrationDate: new Date(),
      nextCalibrationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      certificateNumber: 'CAL-2024-001',
      standardsUsed: ['NIST-123'],
      results: { accuracy: '±0.001mm' },
      cost: 100.00,
      notes: 'Annual calibration'
    };

    const mockCalibrationRecord = {
      id: 'calibration-1',
      toolDrawingId: 'tool-1',
      certificateNumber: 'CAL-2024-001',
      calibratedAt: new Date()
    };

    it('should record tool calibration successfully', async () => {
      // Arrange
      mockPrisma.toolCalibrationRecord.create.mockResolvedValue(mockCalibrationRecord);
      mockPrisma.toolDrawing.update.mockResolvedValue({
        id: 'tool-1',
        lastCalibrationDate: mockCalibrationInput.calibrationDate,
        nextCalibrationDate: mockCalibrationInput.nextCalibrationDate
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      // Act
      const result = await service.recordToolCalibration(mockCalibrationInput);

      // Assert
      expect(result).toEqual(mockCalibrationRecord);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getToolsDueForCalibration', () => {
    const mockToolsDue = [
      {
        id: 'tool-1',
        title: 'Tool needing calibration',
        nextCalibrationDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Past due
      }
    ];

    it('should get tools due for calibration', async () => {
      // Arrange
      mockPrisma.toolDrawing.findMany.mockResolvedValue(mockToolsDue);

      // Act
      const result = await service.getToolsDueForCalibration();

      // Assert
      expect(result).toEqual(mockToolsDue);
      expect(mockPrisma.toolDrawing.findMany).toHaveBeenCalledWith({
        where: {
          requiresCalibration: true,
          isActive: true,
          nextCalibrationDate: {
            lte: expect.any(Date)
          }
        },
        orderBy: { nextCalibrationDate: 'asc' }
      });
    });
  });

  describe('recordToolUsage', () => {
    const mockUsageInput = {
      toolDrawingId: 'tool-1',
      userId: 'user-1',
      userName: 'John Doe',
      workOrderId: 'wo-123',
      operationId: 'op-456',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      quantityUsed: 1,
      conditionBefore: 'Good',
      conditionAfter: 'Good'
    };

    const mockUsageLog = {
      id: 'usage-1',
      toolDrawingId: 'tool-1',
      userId: 'user-1',
      workOrderId: 'wo-123',
      startTime: mockUsageInput.startTime,
      endTime: mockUsageInput.endTime
    };

    it('should record tool usage successfully', async () => {
      // Arrange
      mockPrisma.toolUsageLog.create.mockResolvedValue(mockUsageLog);

      // Act
      const result = await service.recordToolUsage(mockUsageInput);

      // Assert
      expect(result).toEqual(mockUsageLog);
      expect(mockPrisma.toolUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          toolDrawingId: 'tool-1',
          userId: 'user-1',
          userName: 'John Doe',
          workOrderId: 'wo-123',
          operationId: 'op-456',
          quantityUsed: 1,
          conditionBefore: 'Good',
          conditionAfter: 'Good'
        })
      });
    });
  });

  describe('updateToolInventory', () => {
    const mockInventoryUpdate = {
      toolDrawingId: 'tool-1',
      quantityChange: -2,
      reason: 'Used in production',
      updatedById: 'user-1',
      reference: 'WO-123'
    };

    const mockUpdatedTool = {
      id: 'tool-1',
      quantityOnHand: 8,
      updatedAt: new Date()
    };

    it('should update tool inventory successfully', async () => {
      // Arrange
      const mockCurrentTool = { quantityOnHand: 10 };
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(mockCurrentTool);
      mockPrisma.toolDrawing.update.mockResolvedValue(mockUpdatedTool);

      // Act
      const result = await service.updateToolInventory(mockInventoryUpdate);

      // Assert
      expect(result).toEqual(mockUpdatedTool);
      expect(mockPrisma.toolDrawing.update).toHaveBeenCalledWith({
        where: { id: 'tool-1' },
        data: {
          quantityOnHand: 8,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle negative inventory', async () => {
      // Arrange
      const mockCurrentTool = { quantityOnHand: 1 };
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(mockCurrentTool);

      // Act & Assert
      await expect(service.updateToolInventory({
        ...mockInventoryUpdate,
        quantityChange: -5
      })).rejects.toThrow('Insufficient inventory');
    });
  });

  describe('getToolsWithLowInventory', () => {
    const mockLowInventoryTools = [
      {
        id: 'tool-1',
        title: 'Low Stock Tool',
        quantityOnHand: 2,
        minimumQuantity: 5
      }
    ];

    it('should get tools with low inventory', async () => {
      // Arrange
      mockPrisma.toolDrawing.findMany.mockResolvedValue(mockLowInventoryTools);

      // Act
      const result = await service.getToolsWithLowInventory();

      // Assert
      expect(result).toEqual(mockLowInventoryTools);
      expect(mockPrisma.toolDrawing.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          AND: [
            { quantityOnHand: { not: null } },
            { minimumQuantity: { not: null } },
            {
              quantityOnHand: {
                lte: expect.any(Object)
              }
            }
          ]
        },
        orderBy: [
          { quantityOnHand: 'asc' },
          { title: 'asc' }
        ]
      });
    });
  });

  describe('createVersion', () => {
    const originalToolId = 'tool-1';
    const mockVersionData = {
      notes: 'Updated for new specifications',
      createdById: 'user-1'
    };

    const mockOriginalTool = {
      id: originalToolId,
      title: 'Original Tool',
      version: 1,
      toolType: ToolType.CUTTING_TOOL
    };

    const mockNewVersion = {
      id: 'tool-2',
      title: 'Original Tool',
      version: 2,
      toolType: ToolType.CUTTING_TOOL,
      previousVersionId: originalToolId
    };

    it('should create new version successfully', async () => {
      // Arrange
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(mockOriginalTool);
      mockPrisma.toolDrawing.update.mockResolvedValue({ ...mockOriginalTool, isActive: false });
      mockPrisma.toolDrawing.create.mockResolvedValue(mockNewVersion);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      // Act
      const result = await service.createVersion(originalToolId, mockVersionData);

      // Assert
      expect(result).toEqual(mockNewVersion);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle versioning of non-existent tool', async () => {
      // Arrange
      mockPrisma.toolDrawing.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createVersion('non-existent', mockVersionData))
        .rejects.toThrow('Tool drawing not found');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      mockPrisma.toolDrawing.findMany.mockRejectedValue(new Error('Connection timeout'));

      // Act & Assert
      await expect(service.getToolDrawings({}))
        .rejects.toThrow('Connection timeout');
    });

    it('should handle invalid tool type in creation', async () => {
      // Arrange
      const invalidInput = {
        title: 'Invalid Tool',
        toolType: 'INVALID_TYPE' as ToolType,
        createdById: 'user-1'
      };
      mockPrisma.toolDrawing.create.mockRejectedValue(new Error('Invalid enum value'));

      // Act & Assert
      await expect(service.createToolDrawing(invalidInput))
        .rejects.toThrow('Invalid enum value');
    });
  });
});