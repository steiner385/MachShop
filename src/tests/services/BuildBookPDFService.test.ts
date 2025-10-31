import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BuildBookPDFService } from '../../services/BuildBookPDFService';
import { prisma } from '../../lib/prisma';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  prisma: {
    buildRecord: {
      findUnique: vi.fn(),
    },
    buildBookTemplate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('pdfkit', () => {
  const mockDoc = {
    pipe: vi.fn(),
    addPage: vi.fn(),
    fontSize: vi.fn().mockReturnThis(),
    font: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    image: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    fillColor: vi.fn().mockReturnThis(),
    strokeColor: vi.fn().mockReturnThis(),
    lineWidth: vi.fn().mockReturnThis(),
    end: vi.fn(),
    on: vi.fn(),
    x: 0,
    y: 0,
    page: {
      width: 612,
      height: 792,
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    },
  };
  return {
    default: vi.fn(() => mockDoc),
  };
});

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    createWriteStream: vi.fn(),
  },
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
    extname: vi.fn(),
  },
}));

describe('BuildBookPDFService', () => {
  let buildBookPDFService: BuildBookPDFService;
  const mockPrisma = prisma as any;
  const mockFs = fs as any;
  const mockPath = path as any;

  beforeEach(() => {
    buildBookPDFService = new BuildBookPDFService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockBuildRecord = {
    id: 'br-1',
    buildRecordNumber: 'BR-2024-001',
    status: 'COMPLETED',
    finalDisposition: 'ACCEPT',
    startedAt: new Date('2024-01-01T08:00:00Z'),
    completedAt: new Date('2024-01-01T17:00:00Z'),
    workOrder: {
      id: 'wo-1',
      orderNumber: 'WO-2024-001',
      engineSerial: 'ENG123456',
      engineModel: 'V12-TURBO',
      customer: 'Aerospace Corp',
      part: {
        partNumber: 'P12345',
        description: 'Turbine Engine Assembly',
      },
    },
    operator: {
      id: 'user-1',
      name: 'John Operator',
      email: 'john@example.com',
    },
    inspector: {
      id: 'user-2',
      name: 'Jane Inspector',
      email: 'jane@example.com',
    },
    operations: [
      {
        id: 'bro-1',
        operation: {
          operationNumber: '010',
          description: 'Assembly Operation',
          workCenter: {
            name: 'Assembly Station 1',
          },
        },
        status: 'COMPLETED',
        startedAt: new Date('2024-01-01T08:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:00Z'),
        actualTimeMinutes: 120,
        standardTimeMinutes: 90,
        operator: {
          name: 'John Operator',
        },
        inspector: {
          name: 'Jane Inspector',
        },
        notes: 'Assembly completed without issues',
        toolsUsed: ['Torque Wrench', 'Digital Caliper'],
        signatures: [
          {
            id: 'sig-1',
            type: 'OPERATOR',
            signedAt: new Date('2024-01-01T10:00:00Z'),
            signer: {
              name: 'John Operator',
              email: 'john@example.com',
            },
            comments: 'Operation completed successfully',
          },
          {
            id: 'sig-2',
            type: 'INSPECTOR',
            signedAt: new Date('2024-01-01T10:30:00Z'),
            signer: {
              name: 'Jane Inspector',
              email: 'jane@example.com',
            },
            comments: 'Inspection passed',
          },
        ],
      },
    ],
    deviations: [
      {
        id: 'dev-1',
        type: 'PROCESS',
        category: 'QUALITY',
        severity: 'MEDIUM',
        title: 'Torque specification deviation',
        description: 'Bolt torque was 5% over specification',
        rootCause: 'Calibration drift in torque wrench',
        correctiveAction: 'Re-torqued to specification',
        preventiveAction: 'Implement more frequent calibration schedule',
        status: 'RESOLVED',
        detectedAt: new Date('2024-01-01T09:30:00Z'),
        detector: {
          name: 'John Operator',
        },
        approvals: [
          {
            level: 'ENGINEER',
            approver: {
              name: 'Bob Engineer',
            },
            status: 'APPROVED',
            approvedAt: new Date('2024-01-01T11:00:00Z'),
            comments: 'Acceptable deviation, corrective action approved',
          },
        ],
      },
    ],
    photos: [
      {
        id: 'photo-1',
        filename: 'assembly_complete.jpg',
        originalName: 'Assembly Complete.jpg',
        filePath: '/uploads/photos/assembly_complete.jpg',
        caption: 'Final assembly state',
        takenAt: new Date('2024-01-01T16:00:00Z'),
        takenBy: 'John Operator',
        operation: {
          operationNumber: '010',
        },
      },
    ],
    signatures: [
      {
        id: 'sig-final',
        type: 'FINAL_APPROVAL',
        signedAt: new Date('2024-01-01T17:00:00Z'),
        signer: {
          name: 'Manager Smith',
          email: 'manager@example.com',
        },
        comments: 'Final approval granted',
      },
    ],
    statusHistory: [
      {
        id: 'hist-1',
        status: 'PENDING',
        changedAt: new Date('2024-01-01T08:00:00Z'),
        changer: {
          name: 'System',
        },
        reason: 'Build record created',
      },
      {
        id: 'hist-2',
        status: 'COMPLETED',
        changedAt: new Date('2024-01-01T17:00:00Z'),
        changer: {
          name: 'Manager Smith',
        },
        reason: 'All operations completed and approved',
      },
    ],
  };

  const mockTemplate = {
    id: 'template-1',
    name: 'Standard AS9100 Template',
    settings: {
      header: {
        enabled: true,
        logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        logoPosition: 'left',
        logoSize: 50,
        title: 'Electronic Build Book',
        subtitle: 'AS9100 Compliant Assembly Record',
        showPageNumbers: true,
        showDate: true,
      },
      footer: {
        enabled: true,
        text: 'Confidential - Aerospace Manufacturing Corp',
        showPageNumbers: true,
        showGeneratedBy: true,
        companyInfo: 'Aerospace Manufacturing Corp\n123 Industry Blvd\nAero City, AC 12345',
        certificationInfo: 'AS9100D Certified | FAA Repair Station #ABCR',
      },
      sections: {
        coverPage: true,
        tableOfContents: true,
        engineIdentification: true,
        asBuiltConfiguration: true,
        operationsList: true,
        deviationsList: true,
        photoGallery: true,
        signaturePages: true,
        appendices: false,
      },
      styling: {
        primaryColor: '#1890ff',
        secondaryColor: '#722ed1',
        fontFamily: 'Arial',
        fontSize: 11,
        headerFontSize: 14,
        lineSpacing: 1.2,
        marginTop: 72,
        marginBottom: 72,
        marginLeft: 72,
        marginRight: 72,
      },
      content: {
        includePhotos: true,
        photoMaxSize: 300,
        includeDeviations: true,
        includeNotes: true,
        includeTimestamps: true,
        includeSignatures: true,
        includeQRCode: true,
        watermark: 'CONFIDENTIAL',
      },
      compliance: {
        as9100: true,
        faaPart43: true,
        iso9001: false,
        customStandards: ['Company Quality Standard CQS-001'],
      },
    },
  };

  describe('generateBuildBook', () => {
    beforeEach(() => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('mock image data'));
      mockPath.join.mockImplementation((...args) => args.join('/'));
    });

    it('should generate build book with default template', async () => {
      const mockDoc = new (PDFDocument as any)();

      const result = await buildBookPDFService.generateBuildBook('br-1');

      expect(mockPrisma.buildRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'br-1' },
        include: {
          workOrder: {
            include: {
              part: true,
            },
          },
          operator: true,
          inspector: true,
          operations: {
            include: {
              operation: {
                include: {
                  workCenter: true,
                },
              },
              operator: true,
              inspector: true,
              signatures: {
                include: {
                  signer: true,
                },
              },
            },
            orderBy: {
              operation: {
                operationNumber: 'asc',
              },
            },
          },
          deviations: {
            include: {
              detector: true,
              assignee: true,
              approvals: {
                include: {
                  approver: true,
                },
              },
            },
          },
          photos: {
            include: {
              operation: true,
            },
            orderBy: {
              takenAt: 'asc',
            },
          },
          signatures: {
            include: {
              signer: true,
            },
          },
          statusHistory: {
            include: {
              changer: true,
            },
            orderBy: {
              changedAt: 'asc',
            },
          },
        },
      });

      expect(result).toBeInstanceOf(PDFDocument);
    });

    it('should generate build book with custom template', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);

      const result = await buildBookPDFService.generateBuildBook('br-1', mockTemplate);

      expect(result).toBeInstanceOf(PDFDocument);
    });

    it('should throw error if build record not found', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(null);

      await expect(
        buildBookPDFService.generateBuildBook('nonexistent')
      ).rejects.toThrow('Build record not found');
    });

    it('should include all required sections for AS9100 compliance', async () => {
      const mockDoc = new (PDFDocument as any)();
      vi.mocked(PDFDocument).mockReturnValue(mockDoc);

      await buildBookPDFService.generateBuildBook('br-1', mockTemplate);

      // Verify that PDF generation methods were called for each section
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Electronic Build Book'),
        expect.any(Number),
        expect.any(Number)
      );

      // Verify engine identification section
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('ENG123456'),
        expect.any(Number),
        expect.any(Number)
      );

      // Verify operations list
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Assembly Operation'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle missing photos gracefully', async () => {
      const buildRecordWithoutPhotos = {
        ...mockBuildRecord,
        photos: [],
      };

      mockPrisma.buildRecord.findUnique.mockResolvedValue(buildRecordWithoutPhotos);
      mockFs.existsSync.mockReturnValue(false);

      const result = await buildBookPDFService.generateBuildBook('br-1', mockTemplate);

      expect(result).toBeInstanceOf(PDFDocument);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should include deviations section when deviations exist', async () => {
      const mockDoc = new (PDFDocument as any)();
      vi.mocked(PDFDocument).mockReturnValue(mockDoc);

      await buildBookPDFService.generateBuildBook('br-1', mockTemplate);

      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Torque specification deviation'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should apply custom styling from template', async () => {
      const customTemplate = {
        ...mockTemplate,
        settings: {
          ...mockTemplate.settings,
          styling: {
            ...mockTemplate.settings.styling,
            primaryColor: '#ff0000',
            fontSize: 12,
            fontFamily: 'Times',
          },
        },
      };

      const mockDoc = new (PDFDocument as any)();
      vi.mocked(PDFDocument).mockReturnValue(mockDoc);

      await buildBookPDFService.generateBuildBook('br-1', customTemplate);

      expect(mockDoc.fontSize).toHaveBeenCalledWith(12);
      expect(mockDoc.font).toHaveBeenCalledWith('Times-Roman');
    });
  });

  describe('saveTemplate', () => {
    const templateData = {
      name: 'Custom Template',
      description: 'Custom template for specific customer',
      customerId: 'customer-1',
      isDefault: false,
      settings: mockTemplate.settings,
    };

    it('should create new template', async () => {
      const createdTemplate = {
        id: 'template-2',
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.buildBookTemplate.create.mockResolvedValue(createdTemplate);

      const result = await buildBookPDFService.saveTemplate(templateData);

      expect(mockPrisma.buildBookTemplate.create).toHaveBeenCalledWith({
        data: templateData,
      });

      expect(result).toEqual(createdTemplate);
    });

    it('should update existing template', async () => {
      const existingTemplate = {
        id: 'template-1',
        ...templateData,
        updatedAt: new Date(),
      };

      mockPrisma.buildBookTemplate.update.mockResolvedValue(existingTemplate);

      const result = await buildBookPDFService.saveTemplate({
        ...templateData,
        id: 'template-1',
      });

      expect(mockPrisma.buildBookTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: templateData,
      });

      expect(result).toEqual(existingTemplate);
    });

    it('should validate template settings', async () => {
      const invalidTemplate = {
        name: '',
        settings: null,
      };

      await expect(
        buildBookPDFService.saveTemplate(invalidTemplate as any)
      ).rejects.toThrow('Template name is required');
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      mockPrisma.buildBookTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await buildBookPDFService.getTemplate('template-1');

      expect(mockPrisma.buildBookTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });

      expect(result).toEqual(mockTemplate);
    });

    it('should return null if template not found', async () => {
      mockPrisma.buildBookTemplate.findUnique.mockResolvedValue(null);

      const result = await buildBookPDFService.getTemplate('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listTemplates', () => {
    const mockTemplates = [
      mockTemplate,
      {
        id: 'template-2',
        name: 'Customer Specific Template',
        customerId: 'customer-1',
        isDefault: false,
      },
    ];

    it('should return all templates', async () => {
      mockPrisma.buildBookTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await buildBookPDFService.listTemplates();

      expect(mockPrisma.buildBookTemplate.findMany).toHaveBeenCalledWith({
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(mockTemplates);
    });

    it('should filter templates by customer', async () => {
      const customerTemplates = [mockTemplates[1]];
      mockPrisma.buildBookTemplate.findMany.mockResolvedValue(customerTemplates);

      const result = await buildBookPDFService.listTemplates('customer-1');

      expect(mockPrisma.buildBookTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { customerId: 'customer-1' },
            { isDefault: true },
          ],
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(customerTemplates);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockPrisma.buildBookTemplate.delete.mockResolvedValue(mockTemplate);

      await buildBookPDFService.deleteTemplate('template-1');

      expect(mockPrisma.buildBookTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should throw error if trying to delete default template', async () => {
      const defaultTemplate = {
        ...mockTemplate,
        isDefault: true,
      };

      mockPrisma.buildBookTemplate.findUnique.mockResolvedValue(defaultTemplate);

      await expect(
        buildBookPDFService.deleteTemplate('template-1')
      ).rejects.toThrow('Cannot delete default template');
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with limited pages', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);

      const result = await buildBookPDFService.generatePreview('br-1', mockTemplate.settings);

      expect(result).toBeInstanceOf(PDFDocument);
    });

    it('should include preview watermark', async () => {
      const mockDoc = new (PDFDocument as any)();
      vi.mocked(PDFDocument).mockReturnValue(mockDoc);

      await buildBookPDFService.generatePreview('br-1', mockTemplate.settings);

      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('PREVIEW'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});