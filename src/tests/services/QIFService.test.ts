import { describe, it, expect, beforeEach } from 'vitest';
import { QIFService } from '../../services/QIFService';
import { QIFDocument } from '../../types/qif';

describe('QIFService', () => {
  let qifService: QIFService;

  beforeEach(() => {
    qifService = new QIFService();
  });

  describe('generateQIF', () => {
    it('should generate valid QIF 3.0 XML document', () => {
      const qifDoc: QIFDocument = {
        QIFDocument: {
          '@_xmlns': 'http://qifstandards.org/xsd/qif3',
          '@_versionQIF': '3.0.0',
          '@_idMax': 2,
          Version: {
            QIFVersion: '3.0.0',
            TimeCreated: '2025-10-18T12:00:00Z',
          },
          Header: {
            Application: {
              Name: 'MES Test',
              Organization: 'Test Organization',
            },
          },
          FileUnits: {
            PrimaryUnits: {
              LinearUnit: 'mm',
              AngularUnit: 'degree',
            },
          },
        },
      };

      const xml = qifService.generateQIF(qifDoc);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<QIFDocument');
      expect(xml).toContain('xmlns="http://qifstandards.org/xsd/qif3"');
      expect(xml).toContain('versionQIF="3.0.0"');
      expect(xml).toContain('<QIFVersion>3.0.0</QIFVersion>');
      expect(xml).toContain('</QIFDocument>');
    });

    it('should include Product section when provided', () => {
      const qifDoc: QIFDocument = {
        QIFDocument: {
          '@_versionQIF': '3.0.0',
          '@_idMax': 1,
          Version: {
            QIFVersion: '3.0.0',
          },
          Product: [{
            '@_id': '1',
            PartNumber: 'PN-12345',
            PartRevision: 'Rev C',
            PartName: 'Test Part',
          }],
        },
      };

      const xml = qifService.generateQIF(qifDoc);

      expect(xml).toContain('<Product');
      expect(xml).toContain('<PartNumber>PN-12345</PartNumber>');
      expect(xml).toContain('<PartRevision>Rev C</PartRevision>');
      expect(xml).toContain('<PartName>Test Part</PartName>');
    });
  });

  describe('parseQIF', () => {
    it('should parse valid QIF XML string', () => {
      const qifXml = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0" idMax="1">
  <Version>
    <QIFVersion>3.0.0</QIFVersion>
  </Version>
  <Header>
    <Application>
      <Name>Test App</Name>
    </Application>
  </Header>
</QIFDocument>`;

      const parsed = qifService.parseQIF(qifXml);

      expect(parsed).toBeDefined();
      expect(parsed.QIFDocument).toBeDefined();
      expect(parsed.QIFDocument['@_versionQIF']).toBe('3.0.0');
      expect(parsed.QIFDocument.Version.QIFVersion).toBe('3.0.0');
    });

    it('should handle XML with Product array', () => {
      const qifXml = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0">
  <Version><QIFVersion>3.0.0</QIFVersion></Version>
  <Product id="1">
    <PartNumber>PN-001</PartNumber>
    <PartRevision>A</PartRevision>
  </Product>
</QIFDocument>`;

      const parsed = qifService.parseQIF(qifXml);

      expect(parsed.QIFDocument.Product).toBeDefined();
    });
  });

  describe('validateQIF', () => {
    it('should validate correct QIF structure', () => {
      const qifDoc: QIFDocument = {
        QIFDocument: {
          '@_versionQIF': '3.0.0',
          '@_idMax': 1,
          Version: {
            QIFVersion: '3.0.0',
          },
        },
      };

      const result = qifService.validateQIF(qifDoc);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing QIFVersion', () => {
      const qifDoc: any = {
        QIFDocument: {
          '@_versionQIF': '3.0.0',
          '@_idMax': 1,
          Version: {},
        },
      };

      const result = qifService.validateQIF(qifDoc);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('QIF Version is required');
    });

    it('should detect missing idMax', () => {
      const qifDoc: any = {
        QIFDocument: {
          '@_versionQIF': '3.0.0',
          Version: {
            QIFVersion: '3.0.0',
          },
        },
      };

      const result = qifService.validateQIF(qifDoc);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('idMax is required');
    });
  });

  describe('createMeasurementPlan', () => {
    it('should create QIF measurement plan from MES data', () => {
      const params = {
        partNumber: 'PN-12345',
        revision: 'Rev C',
        characteristics: [
          {
            balloonNumber: '1',
            description: 'Overall Length',
            nominalValue: 100.0,
            upperTolerance: 0.1,
            lowerTolerance: 0.1,
          },
          {
            balloonNumber: '2',
            description: 'Hole Diameter',
            nominalValue: 10.0,
            upperTolerance: 0.05,
            lowerTolerance: 0.05,
          },
        ],
      };

      const qifDoc = qifService.createMeasurementPlan(params);

      expect(qifDoc.QIFDocument).toBeDefined();
      expect(qifDoc.QIFDocument.Product).toBeDefined();
      expect(qifDoc.QIFDocument.Product![0].PartNumber).toBe('PN-12345');
      expect(qifDoc.QIFDocument.Product![0].PartRevision).toBe('Rev C');
      expect(qifDoc.QIFDocument.MeasurementPlan).toBeDefined();
      expect(qifDoc.QIFDocument.MeasurementPlan?.Characteristics).toBeDefined();
    });

    it('should generate unique characteristic IDs', () => {
      const params = {
        partNumber: 'PN-001',
        revision: 'A',
        characteristics: [
          { balloonNumber: '1', description: 'Char 1', nominalValue: 10, upperTolerance: 0.1, lowerTolerance: 0.1 },
          { balloonNumber: '2', description: 'Char 2', nominalValue: 20, upperTolerance: 0.2, lowerTolerance: 0.2 },
        ],
      };

      const qifDoc = qifService.createMeasurementPlan(params);
      const chars = qifDoc.QIFDocument.MeasurementPlan?.Characteristics;

      expect(chars).toBeDefined();
      expect(chars).toHaveLength(2);
    });
  });

  describe('createMeasurementResults', () => {
    it('should create QIF measurement results from inspection data', () => {
      const params = {
        partNumber: 'PN-12345',
        serialNumber: 'SN-001',
        measurements: [
          {
            characteristicId: 'CHAR-1',
            measuredValue: 100.02,
            status: 'PASS' as const,
          },
          {
            characteristicId: 'CHAR-2',
            measuredValue: 10.03,
            status: 'PASS' as const,
          },
        ],
        inspectedBy: 'Inspector-1',
      };

      const qifDoc = qifService.createMeasurementResults(params);

      expect(qifDoc.QIFDocument).toBeDefined();
      expect(qifDoc.QIFDocument.Product).toBeDefined();
      expect(qifDoc.QIFDocument.Product![0].PartNumber).toBe('PN-12345');
      expect(qifDoc.QIFDocument.Product![0].SerialNumber).toBe('SN-001');
      expect(qifDoc.QIFDocument.MeasurementResults).toBeDefined();
      expect(qifDoc.QIFDocument.MeasurementResults?.MeasuredBy).toBe('Inspector-1');
    });

    it('should calculate overall PASS status when all measurements pass', () => {
      const params = {
        partNumber: 'PN-001',
        measurements: [
          { characteristicId: 'CHAR-1', measuredValue: 10.0, status: 'PASS' as const },
          { characteristicId: 'CHAR-2', measuredValue: 20.0, status: 'PASS' as const },
        ],
      };

      const qifDoc = qifService.createMeasurementResults(params);

      expect(qifDoc.QIFDocument.MeasurementResults?.InspectionStatus).toBe('PASS');
    });

    it('should calculate overall FAIL status when any measurement fails', () => {
      const params = {
        partNumber: 'PN-001',
        measurements: [
          { characteristicId: 'CHAR-1', measuredValue: 10.0, status: 'PASS' as const },
          { characteristicId: 'CHAR-2', measuredValue: 20.5, status: 'FAIL' as const },
        ],
      };

      const qifDoc = qifService.createMeasurementResults(params);

      expect(qifDoc.QIFDocument.MeasurementResults?.InspectionStatus).toBe('FAIL');
    });
  });

  describe('importQIF', () => {
    it('should import and extract data from QIF XML', async () => {
      const qifXml = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0" idMax="3">
  <Version><QIFVersion>3.0.0</QIFVersion></Version>
  <Product id="1">
    <PartNumber>PN-12345</PartNumber>
    <PartRevision>Rev C</PartRevision>
  </Product>
  <MeasurementResults id="2">
    <MeasuredBy>Inspector-1</MeasuredBy>
    <InspectionStatus>PASS</InspectionStatus>
  </MeasurementResults>
</QIFDocument>`;

      const result = await qifService.importQIF(qifXml);

      expect(result).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].partNumber).toBe('PN-12345');
      expect(result.products[0].revision).toBe('Rev C');
    });

    it('should extract measurement results with status', async () => {
      const qifXml = `<?xml version="1.0" encoding="UTF-8"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0" idMax="1">
  <Version><QIFVersion>3.0.0</QIFVersion></Version>
  <MeasurementResults id="1">
    <MeasuredBy>Inspector-1</MeasuredBy>
    <InspectionStatus>PASS</InspectionStatus>
    <MeasurementDate>2025-10-18T10:00:00Z</MeasurementDate>
  </MeasurementResults>
</QIFDocument>`;

      const result = await qifService.importQIF(qifXml);

      expect(result.measurementResults).toBeDefined();
      expect(result.measurementResults.measuredBy).toBe('Inspector-1');
      expect(result.measurementResults.overallStatus).toBe('PASS');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through generate → parse cycle', () => {
      const originalDoc: QIFDocument = {
        QIFDocument: {
          '@_xmlns': 'http://qifstandards.org/xsd/qif3',
          '@_versionQIF': '3.0.0',
          '@_idMax': 1,
          Version: {
            QIFVersion: '3.0.0',
            TimeCreated: '2025-10-18T12:00:00Z',
          },
          Product: [{
            '@_id': '1',
            PartNumber: 'PN-99999',
            PartRevision: 'Rev Z',
          }],
        },
      };

      // Generate XML
      const xml = qifService.generateQIF(originalDoc);

      // Parse it back
      const parsedDoc = qifService.parseQIF(xml);

      // Verify key data preserved
      expect(parsedDoc.QIFDocument['@_versionQIF']).toBe('3.0.0');
      expect(parsedDoc.QIFDocument.Version.QIFVersion).toBe('3.0.0');
      expect(parsedDoc.QIFDocument.Product).toBeDefined();
    });
  });

  describe('createResourcesDocument', () => {
    it('should create QIF Resources document for measurement equipment', () => {
      const params = {
        devices: [
          {
            deviceId: 'CMM-001',
            name: 'Hexagon CMM',
            manufacturer: 'Hexagon',
            model: 'Global S',
            serialNumber: 'SN-CMM-12345',
            deviceType: 'CMM',
            calibrationStatus: 'IN_CAL',
            lastCalibrationDate: '2025-01-15',
            nextCalibrationDate: '2026-01-15',
          },
        ],
      };

      const qifDoc = qifService.createResourcesDocument(params);

      expect(qifDoc.QIFDocument).toBeDefined();
      expect(qifDoc.QIFDocument.Resources).toBeDefined();
      expect(qifDoc.QIFDocument.Resources?.MeasurementDevices).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid XML', () => {
      const invalidXml = '<invalid>xml<broken>';

      expect(() => qifService.parseQIF(invalidXml)).toThrow();
    });

    it('should handle empty QIF document', () => {
      const emptyDoc: QIFDocument = {
        QIFDocument: {
          '@_versionQIF': '3.0.0',
          '@_idMax': 0,
          Version: {
            QIFVersion: '3.0.0',
          },
        },
      };

      const xml = qifService.generateQIF(emptyDoc);

      expect(xml).toContain('<QIFDocument');
      expect(xml).toContain('</QIFDocument>');
    });
  });
});
