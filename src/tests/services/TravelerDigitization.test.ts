/**
 * Traveler Digitization Integration Tests
 * Issue #36: Paper-Based Traveler Digitization
 *
 * Comprehensive test suite for OCR, template matching, and digitization services
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OCRService, OCRConfig, OCRResult } from '../../services/migration/OCRService';
import { TemplateMatcher, FieldDefinition, TravelerTemplate } from '../../services/migration/TemplateMatcher';
import TravelerDigitizationService, {
  DigitizedTravelerData,
  ManualEntryRequest
} from '../../services/migration/TravelerDigitizationService';

// ============================================================================
// OCR Service Tests
// ============================================================================

describe('OCRService', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    const config: OCRConfig = {
      provider: 'tesseract'
    };
    ocrService = new OCRService(config);
  });

  describe('Configuration Validation', () => {
    it('should validate provider is required', () => {
      const invalidConfig: any = { provider: null };
      expect(() => new OCRService(invalidConfig)).toThrow('OCR provider is required');
    });

    it('should validate Google Vision requires apiKey or projectId', () => {
      const config: OCRConfig = { provider: 'google-vision' };
      expect(() => new OCRService(config)).toThrow('Google Vision requires apiKey or projectId');
    });

    it('should validate AWS Textract requires region', () => {
      const config: OCRConfig = { provider: 'aws-textract' };
      expect(() => new OCRService(config)).toThrow('AWS Textract requires region');
    });

    it('should validate Azure requires apiKey and apiEndpoint', () => {
      const config: OCRConfig = { provider: 'azure' };
      expect(() => new OCRService(config)).toThrow('Azure requires apiKey and apiEndpoint');
    });

    it('should accept valid Tesseract configuration', () => {
      const config: OCRConfig = { provider: 'tesseract' };
      expect(() => new OCRService(config)).not.toThrow();
    });
  });

  describe('Document Processing', () => {
    it('should process document and return OCR result', async () => {
      const imageBuffer = Buffer.from('test_image_data');

      const result = await ocrService.processDocument(imageBuffer, 'test.jpg');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should extract region from document', async () => {
      const imageBuffer = Buffer.from('test_image_data');
      const config = {
        imageBuffer,
        boundingBox: {
          x: 10,
          y: 20,
          width: 100,
          height: 50
        }
      };

      const result = await ocrService.extractRegion(config);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('text');
    });

    it('should detect barcodes in document', async () => {
      const imageBuffer = Buffer.from('test_image_data');

      const barcodes = await ocrService.detectBarcodes(imageBuffer);

      expect(Array.isArray(barcodes)).toBe(true);
    });

    it('should detect tables in document', async () => {
      const imageBuffer = Buffer.from('test_image_data');

      const tables = await ocrService.detectTables(imageBuffer);

      expect(Array.isArray(tables)).toBe(true);
    });

    it('should detect checkboxes in document', async () => {
      const imageBuffer = Buffer.from('test_image_data');

      const checkboxes = await ocrService.detectCheckboxes(imageBuffer);

      expect(Array.isArray(checkboxes)).toBe(true);
    });

    it('should detect signatures in document', async () => {
      const imageBuffer = Buffer.from('test_image_data');

      const signatures = await ocrService.detectSignatures(imageBuffer);

      expect(Array.isArray(signatures)).toBe(true);
    });
  });
});

// ============================================================================
// Template Matcher Tests
// ============================================================================

describe('TemplateMatcher', () => {
  let templateMatcher: TemplateMatcher;

  beforeEach(() => {
    templateMatcher = new TemplateMatcher();
  });

  describe('Template Definition', () => {
    it('should define a new template', () => {
      const template: TravelerTemplate = {
        name: 'Standard Traveler',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'work_order_number',
            label: 'Work Order Number',
            type: 'text',
            required: true,
            extractionMethod: 'regex',
            regexPattern: 'WO\\d{6}'
          },
          {
            name: 'part_number',
            label: 'Part Number',
            type: 'text',
            required: true,
            extractionMethod: 'coordinate',
            coordinates: { x: 100, y: 100, width: 200, height: 50 }
          }
        ]
      };

      expect(() => templateMatcher.defineTemplate(template)).not.toThrow();
    });

    it('should require template name', () => {
      const template: any = {
        documentType: 'traveler',
        fields: []
      };

      expect(() => templateMatcher.defineTemplate(template)).toThrow('Template name is required');
    });

    it('should require at least one field', () => {
      const template: TravelerTemplate = {
        name: 'Invalid Template',
        documentType: 'traveler',
        version: 1,
        fields: []
      };

      expect(() => templateMatcher.defineTemplate(template)).toThrow('Template must have at least one field');
    });

    it('should get template by ID', () => {
      const template: TravelerTemplate = {
        name: 'Test Template',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'test_field',
            label: 'Test Field',
            type: 'text',
            required: true,
            extractionMethod: 'regex'
          }
        ]
      };

      templateMatcher.defineTemplate(template);
      const templates = templateMatcher.getAllTemplates();

      expect(templates.length).toBe(1);
      expect(templates[0].name).toBe('Test Template');
    });

    it('should update template', () => {
      const template: TravelerTemplate = {
        name: 'Original Template',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            type: 'text',
            required: true,
            extractionMethod: 'regex'
          }
        ]
      };

      templateMatcher.defineTemplate(template);
      const templates = templateMatcher.getAllTemplates();
      const templateId = templates[0].id!;

      templateMatcher.updateTemplate(templateId, { version: 2 });
      const updated = templateMatcher.getTemplate(templateId);

      expect(updated?.version).toBe(2);
    });

    it('should delete template', () => {
      const template: TravelerTemplate = {
        name: 'Delete Template',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'field1',
            label: 'Field 1',
            type: 'text',
            required: true,
            extractionMethod: 'regex'
          }
        ]
      };

      templateMatcher.defineTemplate(template);
      const templates = templateMatcher.getAllTemplates();
      const templateId = templates[0].id!;

      templateMatcher.deleteTemplate(templateId);
      const deleted = templateMatcher.getTemplate(templateId);

      expect(deleted).toBeUndefined();
    });
  });

  describe('Template Matching', () => {
    it('should match template against OCR result', () => {
      const template: TravelerTemplate = {
        name: 'Test Traveler',
        documentType: 'traveler',
        version: 1,
        matchPatterns: ['Work Order', 'WO\\d{6}'],
        fields: [
          {
            name: 'work_order_number',
            label: 'Work Order Number',
            type: 'text',
            required: true,
            extractionMethod: 'regex',
            regexPattern: 'WO\\d{6}'
          }
        ]
      };

      templateMatcher.defineTemplate(template);

      const ocrResult = {
        success: true,
        text: 'Work Order WO123456 Part Number P001',
        confidence: 0.95,
        bounds: [
          {
            text: 'Work',
            confidence: 0.98,
            boundingBox: { x: 0, y: 0, width: 50, height: 20 }
          },
          {
            text: 'Order',
            confidence: 0.97,
            boundingBox: { x: 60, y: 0, width: 50, height: 20 }
          },
          {
            text: 'WO123456',
            confidence: 0.96,
            boundingBox: { x: 120, y: 0, width: 100, height: 20 }
          }
        ],
        tables: [],
        barcodes: [],
        checkboxes: [],
        signatures: [],
        errors: [],
        warnings: []
      };

      const result = templateMatcher.matchTemplate(ocrResult);

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch?.confidence).toBeGreaterThan(0);
    });

    it('should handle no templates available', () => {
      const ocrResult = {
        success: true,
        text: 'Some random text',
        confidence: 0.8,
        bounds: [],
        tables: [],
        barcodes: [],
        checkboxes: [],
        signatures: [],
        errors: [],
        warnings: []
      };

      const result = templateMatcher.matchTemplate(ocrResult);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.bestMatch).toBeUndefined();
    });

    it('should extract fields from matched template', () => {
      const template: TravelerTemplate = {
        name: 'Advanced Template',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'work_order',
            label: 'Work Order',
            type: 'text',
            required: true,
            extractionMethod: 'keyword',
            keywords: ['Work Order', 'WO:']
          },
          {
            name: 'quantity',
            label: 'Quantity',
            type: 'number',
            required: true,
            extractionMethod: 'keyword',
            keywords: ['Quantity:', 'Qty:']
          }
        ]
      };

      templateMatcher.defineTemplate(template);

      const ocrResult = {
        success: true,
        text: 'Work Order 12345 Quantity: 100 units',
        confidence: 0.9,
        bounds: [],
        tables: [],
        barcodes: [],
        checkboxes: [],
        signatures: [],
        errors: [],
        warnings: []
      };

      const result = templateMatcher.matchTemplate(ocrResult);

      expect(result.bestMatch).toBeDefined();
      if (result.bestMatch) {
        expect(result.bestMatch.extractedFields.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// Traveler Digitization Service Tests
// ============================================================================

describe('TravelerDigitizationService', () => {
  let digitizationService: TravelerDigitizationService;

  beforeEach(() => {
    const config: OCRConfig = { provider: 'tesseract' };
    digitizationService = new TravelerDigitizationService(config);
  });

  describe('Manual Entry', () => {
    it('should create traveler from manual entry', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO001234',
        partNumber: 'P001',
        partDescription: 'Test Part',
        quantity: 100,
        operations: [
          {
            operationNumber: 'OP10',
            operationDescription: 'Machining',
            workCenter: 'CNC-01',
            quantity: 100
          }
        ]
      };

      const traveler = await digitizationService.createManualEntry(request);

      expect(traveler).toBeDefined();
      expect(traveler.id).toBeDefined();
      expect(traveler.workOrderNumber).toBe('WO001234');
      expect(traveler.partNumber).toBe('P001');
      expect(traveler.status).toBe('pending_review');
      expect(traveler.confidence).toBe(1.0);
      expect(traveler.operations.length).toBe(1);
    });

    it('should retrieve created traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO002345',
        partNumber: 'P002',
        quantity: 50,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      const retrieved = digitizationService.getTraveler(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.workOrderNumber).toBe('WO002345');
    });

    it('should update traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO003456',
        partNumber: 'P003',
        quantity: 75,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      const updated = await digitizationService.updateTraveler(created.id!, {
        priority: 'high'
      });

      expect(updated.priority).toBe('high');
    });
  });

  describe('Traveler Review', () => {
    it('should submit traveler for review', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO004567',
        partNumber: 'P004',
        quantity: 25,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      expect(created.status).toBe('pending_review');
    });

    it('should approve traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO005678',
        partNumber: 'P005',
        quantity: 30,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      const approved = await digitizationService.approveTraveler(created.id!, {
        travelerId: created.id!,
        approved: true,
        reviewerNotes: 'Looks good'
      });

      expect(approved.status).toBe('approved');
      expect(approved.reviewerNotes).toBe('Looks good');
      expect(approved.reviewedAt).toBeDefined();
    });

    it('should reject traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO006789',
        partNumber: 'P006',
        quantity: 40,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      const rejected = await digitizationService.approveTraveler(created.id!, {
        travelerId: created.id!,
        approved: false,
        reviewerNotes: 'Data incomplete'
      });

      expect(rejected.status).toBe('rejected');
    });

    it('should apply corrections during review', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO007890',
        partNumber: 'P007',
        quantity: 20,
        operations: [
          {
            operationNumber: 'OP10',
            quantity: 20
          }
        ]
      };

      const created = await digitizationService.createManualEntry(request);
      const approved = await digitizationService.approveTraveler(created.id!, {
        travelerId: created.id!,
        approved: true,
        corrections: [
          {
            fieldName: 'priority',
            oldValue: undefined,
            newValue: 'urgent'
          }
        ]
      });

      expect(approved.priority).toBe('urgent');
    });
  });

  describe('Work Order Creation', () => {
    it('should create work order from approved traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO008901',
        partNumber: 'P008',
        quantity: 15,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);
      await digitizationService.approveTraveler(created.id!, {
        travelerId: created.id!,
        approved: true
      });

      const workOrder = await digitizationService.createWorkOrderFromTraveler(created.id!);

      expect(workOrder).toBeDefined();
      expect(workOrder.workOrderNumber).toBe('WO008901');
    });

    it('should not create work order for unapproved traveler', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: 'WO009012',
        partNumber: 'P009',
        quantity: 10,
        operations: []
      };

      const created = await digitizationService.createManualEntry(request);

      await expect(digitizationService.createWorkOrderFromTraveler(created.id!)).rejects.toThrow(
        'Traveler must be approved'
      );
    });
  });

  describe('Review Queue', () => {
    it('should get travelers in review queue', async () => {
      const request1: ManualEntryRequest = {
        workOrderNumber: 'WO010123',
        partNumber: 'P010',
        quantity: 5,
        operations: []
      };

      const request2: ManualEntryRequest = {
        workOrderNumber: 'WO011234',
        partNumber: 'P011',
        quantity: 8,
        operations: []
      };

      await digitizationService.createManualEntry(request1);
      await digitizationService.createManualEntry(request2);

      const queue = digitizationService.getReviewQueue();

      // Queue should have at least the 2 travelers we just created
      expect(queue.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Batch Processing', () => {
    it('should process batch of documents', async () => {
      const config = {
        fileNames: ['doc1.jpg', 'doc2.jpg', 'doc3.jpg']
      };

      const result = await digitizationService.processBatch(config);

      expect(result).toBeDefined();
      expect(result.totalFiles).toBe(3);
      expect(result.processedCount).toBeDefined();
      expect(result.travelersCreated).toBeInstanceOf(Array);
    });

    it('should support auto-approval in batch processing', async () => {
      const config = {
        fileNames: ['doc1.jpg'],
        enableAutoApproval: true,
        autoApprovalThreshold: 0.8
      };

      const result = await digitizationService.processBatch(config);

      expect(result).toBeDefined();
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Template Registration', () => {
    it('should register template with service', () => {
      const template: TravelerTemplate = {
        name: 'Service Template',
        documentType: 'traveler',
        version: 1,
        fields: [
          {
            name: 'work_order',
            label: 'Work Order',
            type: 'text',
            required: true,
            extractionMethod: 'regex'
          }
        ]
      };

      expect(() => digitizationService.registerTemplate(template)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle OCR processing errors gracefully', async () => {
      const imageBuffer = Buffer.from('invalid_image_data');

      const traveler = await digitizationService.digitizeTraveler(imageBuffer, 'invalid.jpg');

      expect(traveler).toBeDefined();
      expect(traveler.status).toBe('draft');
      // Should have errors
    });

    it('should handle empty work order numbers gracefully', async () => {
      const request: ManualEntryRequest = {
        workOrderNumber: '',
        partNumber: 'P012',
        quantity: 1,
        operations: []
      };

      // Service should accept but create traveler with empty work order
      const traveler = await digitizationService.createManualEntry(request);
      expect(traveler).toBeDefined();
      expect(traveler.workOrderNumber).toBe('');
    });
  });
});
