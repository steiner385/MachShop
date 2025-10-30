import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';
import type {
  QIFDocument,
  QIFHeader,
  QIFProduct,
  QIFMeasurementPlan,
  QIFMeasurementResults,
  QIFResources,
  QIFStatistics,
  QIFExportOptions,
  QIFImportResult,
  MESQIFPlan,
  MESQIFResults,
  Characteristic,
  MeasurementResult,
  MeasurementDevice,
  InspectionStep,
  QIFServiceConfig,
  QIFIdentifier,
  QIFUUIDValidationResult,
  QIFMigrationStatus,
  ExtendedMESQIFPlan,
  ExtendedMESQIFResults,
} from '../types/qif';

/**
 * QIF Service
 *
 * Core service for Quality Information Framework (QIF) 3.0 operations
 * Handles parsing, generation, and validation of QIF XML documents
 * Updated to support NIST AMS 300-12 UUID standards
 *
 * QIF Applications:
 * - CMM measurement plan import/export
 * - AS9102 First Article Inspection reports
 * - Measurement results exchange with suppliers
 * - Digital thread quality data integration
 * - Gauge calibration data (QIF Resources)
 * - NIST AMS 300-12 compliant UUID-based identification
 *
 * ANSI/DMSC QIF 3.0 Standard:
 * https://qifstandards.org/
 *
 * NIST AMS 300-12 Standard:
 * https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.300-12.pdf
 */
export class QIFService {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  private config: QIFServiceConfig;

  constructor(config?: Partial<QIFServiceConfig>) {
    // Default configuration
    this.config = {
      preferUuids: true,
      requireUuids: false,
      allowLegacyIds: true,
      validateUuidFormat: true,
      migrationMode: true,
      nistCompliance: true,
      ...config,
    };
    // Configure XML parser for QIF documents
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      cdataPropName: '__cdata',
      commentPropName: '__comment',
      processEntities: true,
      htmlEntities: false,
    });

    // Configure XML builder for generating QIF documents
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
      processEntities: true,
      cdataPropName: '__cdata',
      commentPropName: '__comment',
    });

    console.log(`QIF Service initialized (QIF 3.0 + NIST AMS 300-12 UUID support, mode: ${this.config.migrationMode ? 'migration' : 'production'})`);
  }

  // =======================
  // UUID Support Methods
  // =======================

  /**
   * Validate QIF identifier format (UUID or legacy string)
   */
  validateIdentifier(identifier: string): QIFUUIDValidationResult {
    if (!identifier || identifier.trim() === '') {
      return {
        isValid: false,
        format: 'INVALID',
        errors: ['Identifier cannot be empty'],
      };
    }

    const trimmedId = identifier.trim();

    // Check if it's a valid UUID
    if (validateUUID(trimmedId)) {
      return {
        isValid: true,
        format: 'UUID',
        normalizedValue: trimmedId.toLowerCase(),
      };
    }

    // Check if it's clearly an invalid UUID format (contains uuid-like structure but invalid)
    if (trimmedId.toLowerCase().includes('uuid') ||
        (trimmedId.includes('-') && trimmedId.length > 20 && trimmedId.split('-').length >= 4)) {
      return {
        isValid: false,
        format: 'INVALID',
        errors: ['Invalid UUID format'],
      };
    }

    // Check if it's a legacy string ID (non-empty, reasonable length, alphanumeric with limited special chars)
    if (trimmedId.length > 0 && trimmedId.length <= 100) {
      // Legacy IDs should be alphanumeric with limited special characters (letters, numbers, dashes, underscores)
      const legacyIdPattern = /^[a-zA-Z0-9\-_]+$/;
      if (!legacyIdPattern.test(trimmedId)) {
        return {
          isValid: false,
          format: 'INVALID',
          errors: ['Invalid identifier format'],
        };
      }

      if (this.config.requireUuids) {
        return {
          isValid: false,
          format: 'LEGACY',
          errors: ['UUID required in current configuration, legacy IDs not allowed'],
        };
      }

      return {
        isValid: this.config.allowLegacyIds,
        format: 'LEGACY',
        normalizedValue: trimmedId,
        errors: this.config.allowLegacyIds ? [] : ['Legacy IDs not allowed in current configuration'],
      };
    }

    return {
      isValid: false,
      format: 'INVALID',
      errors: ['Invalid identifier format'],
    };
  }

  /**
   * Generate NIST AMS 300-12 compliant UUID
   */
  generateQIFUUID(): string {
    return uuidv4();
  }

  /**
   * Resolve QIF identifier from legacy ID or UUID
   */
  resolveQIFIdentifier(uuidField?: string, legacyField?: string): QIFIdentifier {
    // Validate UUID field if provided
    if (uuidField) {
      const uuidValidation = this.validateIdentifier(uuidField);
      if (!uuidValidation.isValid) {
        throw new Error(`Invalid UUID: ${uuidValidation.errors?.join(', ')}`);
      }
    }

    // Validate legacy field if provided
    if (legacyField && !this.config.allowLegacyIds) {
      throw new Error('Legacy IDs not allowed in current configuration');
    }

    if (this.config.requireUuids && !uuidField) {
      throw new Error('UUID is required but not provided');
    }

    const hasUuid = uuidField && this.validateIdentifier(uuidField).format === 'UUID';
    const hasLegacy = legacyField && this.validateIdentifier(legacyField).format === 'LEGACY';

    let primary: string;

    if (this.config.preferUuids && hasUuid) {
      primary = uuidField!;
    } else if (hasLegacy && this.config.allowLegacyIds) {
      primary = legacyField!;
    } else if (hasUuid) {
      primary = uuidField!;
    } else if (hasLegacy) {
      primary = legacyField!;
    } else {
      throw new Error('No valid identifier found');
    }

    return {
      uuid: hasUuid ? uuidField : undefined,
      legacyId: hasLegacy ? legacyField : undefined,
      primary,
    };
  }

  /**
   * Analyze migration status of QIF entity
   */
  analyzeQIFMigrationStatus(uuidField?: string, legacyField?: string): QIFMigrationStatus {
    const hasUuid = Boolean(uuidField && this.validateIdentifier(uuidField).format === 'UUID');
    const hasLegacyId = Boolean(legacyField && this.validateIdentifier(legacyField).format === 'LEGACY');

    let identifierType: 'UUID_ONLY' | 'LEGACY_ONLY' | 'HYBRID';
    if (hasUuid && hasLegacyId) {
      identifierType = 'HYBRID';
    } else if (hasUuid) {
      identifierType = 'UUID_ONLY';
    } else {
      identifierType = 'LEGACY_ONLY';
    }

    return {
      hasUuid,
      hasLegacyId,
      migrationComplete: hasUuid,
      identifierType,
    };
  }

  /**
   * Convert legacy MES QIF Plan to UUID-enhanced format
   */
  enhanceMESQIFPlan(plan: MESQIFPlan): ExtendedMESQIFPlan {
    const identifiers = this.resolveQIFIdentifier(plan.qifPlanUuid, plan.qifPlanId);
    const migrationStatus = this.analyzeQIFMigrationStatus(plan.qifPlanUuid, plan.qifPlanId);

    return {
      ...plan,
      identifiers,
      migrationStatus,
    };
  }

  /**
   * Convert legacy MES QIF Results to UUID-enhanced format
   */
  enhanceMESQIFResults(results: MESQIFResults): ExtendedMESQIFResults {
    const identifiers = this.resolveQIFIdentifier(results.qifResultsUuid, results.qifResultsId);
    const planIdentifiers = this.resolveQIFIdentifier(results.qifPlanUuid, results.qifPlanId);
    const migrationStatus = this.analyzeQIFMigrationStatus(results.qifResultsUuid, results.qifResultsId);

    return {
      ...results,
      identifiers,
      planIdentifiers,
      migrationStatus,
    };
  }

  // =======================
  // Enhanced QIF Methods
  // =======================

  /**
   * Parse QIF XML string into QIF Document object
   */
  parseQIF(xmlString: string): QIFDocument {
    try {
      const parsed = this.xmlParser.parse(xmlString);
      return parsed as QIFDocument;
    } catch (error: any) {
      console.error('Failed to parse QIF XML:', error.message);
      throw new Error(`QIF parsing failed: ${error.message}`);
    }
  }

  /**
   * Generate QIF XML string from QIF Document object
   */
  generateQIF(qifDocument: QIFDocument, options?: QIFExportOptions): string {
    try {
      // Apply export options
      const doc = this.applyExportOptions(qifDocument, options);

      // Generate XML
      const xmlString = this.xmlBuilder.build(doc);

      // Add XML declaration
      const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
      return xmlDeclaration + xmlString;
    } catch (error: any) {
      console.error('Failed to generate QIF XML:', error.message);
      throw new Error(`QIF generation failed: ${error.message}`);
    }
  }

  /**
   * Validate QIF document structure
   * Basic validation - full XSD validation would require additional libraries
   */
  validateQIF(qifDocument: QIFDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check QIF version
    if (!qifDocument.QIFDocument) {
      errors.push('Missing QIFDocument root element');
      return { valid: false, errors };
    }

    const doc = qifDocument.QIFDocument;

    if (!doc.Version) {
      errors.push('Missing QIF Version');
    } else if (!doc.Version.startsWith('3.')) {
      errors.push(`Unsupported QIF version: ${doc.Version}. Expected QIF 3.x`);
    }

    // Validate Product
    if (doc.Product) {
      for (const product of doc.Product) {
        if (!product.id) {
          errors.push('Product missing required id attribute');
        }
        if (product.Characteristics) {
          for (const char of product.Characteristics) {
            if (!char.id) {
              errors.push(`Characteristic missing required id attribute`);
            }
          }
        }
      }
    }

    // Validate MeasurementPlan
    if (doc.MeasurementPlan) {
      if (!doc.MeasurementPlan.id) {
        errors.push('MeasurementPlan missing required id attribute');
      }
    }

    // Validate MeasurementResults
    if (doc.MeasurementResults) {
      if (!doc.MeasurementResults.id) {
        errors.push('MeasurementResults missing required id attribute');
      }
      if (doc.MeasurementResults.Results) {
        for (const result of doc.MeasurementResults.Results) {
          if (!result.CharacteristicId) {
            errors.push('MeasurementResult missing CharacteristicId reference');
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Import QIF document and convert to MES format
   */
  async importQIF(xmlString: string): Promise<QIFImportResult> {
    try {
      // Parse QIF XML
      const qifDoc = this.parseQIF(xmlString);

      // Validate
      const validation = this.validateQIF(qifDoc);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      const doc = qifDoc.QIFDocument;

      // Extract information
      const characteristics = this.extractCharacteristics(doc);
      const measurements = this.extractMeasurements(doc);

      return {
        success: true,
        qifVersion: doc.Version,
        characteristics: characteristics.length,
        measurements: measurements.length,
        warnings: [],
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Extract characteristics from QIF Product
   */
  private extractCharacteristics(doc: any): Characteristic[] {
    const characteristics: Characteristic[] = [];

    if (doc.Product) {
      for (const product of doc.Product) {
        if (product.Characteristics) {
          characteristics.push(...product.Characteristics);
        }
      }
    }

    return characteristics;
  }

  /**
   * Extract measurements from QIF MeasurementResults
   */
  private extractMeasurements(doc: any): MeasurementResult[] {
    const measurements: MeasurementResult[] = [];

    if (doc.MeasurementResults?.Results) {
      measurements.push(...doc.MeasurementResults.Results);
    }

    return measurements;
  }

  /**
   * Create QIF Measurement Plan from MES data
   * Enhanced to support NIST AMS 300-12 UUID standards
   */
  createMeasurementPlan(params: {
    partNumber: string;
    revision: string;
    characteristics: {
      balloonNumber: string;
      description: string;
      nominalValue: number;
      upperTolerance: number;
      lowerTolerance: number;
      characteristicType: string;
      characteristicUuid?: string;  // NIST AMS 300-12 compliant UUID
      characteristicId?: string;    // Legacy ID for backward compatibility
    }[];
    author?: string;
    organization?: string;
    planUuid?: string;              // NIST AMS 300-12 compliant plan UUID
    planId?: string;                // Legacy plan ID for backward compatibility
  }): QIFDocument {
    const now = new Date().toISOString();

    // Create characteristics with UUID support
    const characteristics: Characteristic[] = params.characteristics.map((char, index) => {
      // Use provided UUID or generate new one, fallback to legacy format
      let characteristicId: string;

      if (char.characteristicUuid && this.validateIdentifier(char.characteristicUuid).format === 'UUID') {
        characteristicId = char.characteristicUuid;
      } else if (char.characteristicId && this.config.allowLegacyIds) {
        characteristicId = char.characteristicId;
      } else if (this.config.preferUuids || this.config.requireUuids) {
        characteristicId = this.generateQIFUUID();
      } else {
        characteristicId = `CHAR_${index + 1}`;
      }

      return {
        id: characteristicId,
        CharacteristicNominal: {
          CharacteristicDesignator: char.balloonNumber,
          Name: char.description,
          Description: char.description,
          TargetValue: char.nominalValue,
          PlusTolerance: char.upperTolerance,
          MinusTolerance: char.lowerTolerance,
        },
        CharacteristicItem: this.createCharacteristicItem(char.characteristicType, char.nominalValue),
      };
    });

    // Create inspection steps with UUID support
    const inspectionSteps: InspectionStep[] = characteristics.map((char, index) => {
      const stepId = this.config.preferUuids ? this.generateQIFUUID() : `STEP_${index + 1}`;

      return {
        id: stepId,
        StepNumber: index + 1,
        StepName: char.CharacteristicNominal.Name || `Step ${index + 1}`,
        CharacteristicId: char.id,
        SampleSize: 1,
      };
    });

    // Generate plan ID with UUID support
    let measurementPlanId: string;
    if (params.planUuid && this.validateIdentifier(params.planUuid).format === 'UUID') {
      measurementPlanId = params.planUuid;
    } else if (params.planId && this.config.allowLegacyIds) {
      measurementPlanId = params.planId;
    } else if (this.config.preferUuids || this.config.requireUuids) {
      measurementPlanId = this.generateQIFUUID();
    } else {
      measurementPlanId = 'PLAN_1';
    }

    const qifDoc: QIFDocument = {
      QIFDocument: {
        Version: '3.0.0',
        idMax: characteristics.length + inspectionSteps.length + 10,
        FileUnits: {
          PrimaryUnits: {
            UnitName: 'millimeter',
          },
          AngularUnits: {
            UnitName: 'degree',
          },
        },
        Header: {
          Author: params.author || 'MES System',
          Organization: params.organization || 'Manufacturing',
          CreationDate: now,
          ApplicationName: 'MachShop MES',
          ApplicationVersion: '1.0.0',
        },
        Product: [
          {
            id: 'PRODUCT_1',
            PartNumber: params.partNumber,
            PartVersion: params.revision,
            Revision: params.revision,
            Characteristics: characteristics,
          },
        ],
        MeasurementPlan: {
          id: measurementPlanId,
          Version: '1.0',
          CreationDate: now,
          Author: params.author || 'MES System',
          InspectionSteps: inspectionSteps,
        },
      },
    };

    return qifDoc;
  }

  /**
   * Create QIF Measurement Results from MES inspection data
   */
  createMeasurementResults(params: {
    partNumber: string;
    serialNumber?: string;
    measurements: {
      balloonNumber: string;
      characteristicId: string;
      measuredValue: number;
      status: 'PASS' | 'FAIL';
      measurementDevice?: string;
      uncertainty?: number;
    }[];
    inspectedBy?: string;
    inspectionDate?: Date;
  }): QIFDocument {
    const inspectionDate = params.inspectionDate || new Date();
    const dateString = inspectionDate.toISOString();

    // Create measurement results
    const results: MeasurementResult[] = params.measurements.map((meas, index) => ({
      id: `RESULT_${index + 1}`,
      CharacteristicId: meas.characteristicId,
      MeasuredValue: meas.measuredValue,
      Status: meas.status,
      MeasuredBy: params.inspectedBy,
      MeasurementDate: dateString,
      MeasurementDeviceId: meas.measurementDevice,
      Uncertainty: meas.uncertainty
        ? {
            Value: meas.uncertainty,
            CoverageFactor: 2,
            ConfidenceLevel: 0.95,
            UncertaintyType: 'EXPANDED',
          }
        : undefined,
    }));

    // Calculate summary
    const passedCount = results.filter((r) => r.Status === 'PASS').length;
    const failedCount = results.filter((r) => r.Status === 'FAIL').length;
    const overallStatus = failedCount === 0 ? 'PASS' : 'FAIL';

    const qifDoc: QIFDocument = {
      QIFDocument: {
        Version: '3.0.0',
        idMax: results.length + 10,
        FileUnits: {
          PrimaryUnits: {
            UnitName: 'millimeter',
          },
        },
        Header: {
          Author: params.inspectedBy || 'Inspector',
          CreationDate: dateString,
          ApplicationName: 'MachShop MES',
          ApplicationVersion: '1.0.0',
        },
        Product: [
          {
            id: 'PRODUCT_1',
            PartNumber: params.partNumber,
            SerialNumber: params.serialNumber,
          },
        ],
        MeasurementResults: {
          id: 'RESULTS_1',
          Version: '1.0',
          MeasurementDate: dateString,
          MeasuredBy: params.inspectedBy,
          InspectionStatus: overallStatus,
          Results: results,
          Summary: {
            TotalCharacteristics: results.length,
            PassedCharacteristics: passedCount,
            FailedCharacteristics: failedCount,
            OverallStatus: overallStatus,
            InspectionDate: dateString,
            Inspector: params.inspectedBy,
          },
        },
      },
    };

    return qifDoc;
  }

  /**
   * Create QIF Resources document for gauge/CMM capabilities
   */
  createResourcesDocument(params: {
    measurementDevices: {
      deviceId: string;
      deviceType: string;
      manufacturer: string;
      model: string;
      serialNumber?: string;
      calibrationStatus: string;
      calibrationDate?: Date;
      accuracy?: number;
      resolution?: number;
    }[];
  }): QIFDocument {
    const now = new Date().toISOString();

    const devices: any = params.measurementDevices.map((dev, index) => ({
      id: `DEVICE_${index + 1}`,
      DeviceType: dev.deviceType,
      Manufacturer: dev.manufacturer,
      Model: dev.model,
      SerialNumber: dev.serialNumber,
      CalibrationDate: dev.calibrationDate?.toISOString(),
      Accuracy: dev.accuracy,
      Resolution: dev.resolution,
    }));

    const qifDoc: QIFDocument = {
      QIFDocument: {
        Version: '3.0.0',
        idMax: devices.length + 10,
        Header: {
          CreationDate: now,
          ApplicationName: 'MachShop MES',
          ApplicationVersion: '1.0.0',
        },
        Resources: {
          MeasurementDevices: devices,
        },
      },
    };

    return qifDoc;
  }

  /**
   * Convert MES QIF Plan to QIF XML
   */
  convertMESPlanToQIF(mesPlan: MESQIFPlan): string {
    // If XML content already exists, return it
    if (mesPlan.xmlContent) {
      return mesPlan.xmlContent;
    }

    // Otherwise, create QIF from MES data
    const qifDoc = this.createMeasurementPlan({
      partNumber: mesPlan.partNumber,
      revision: mesPlan.revision,
      characteristics: mesPlan.characteristics.map((char) => ({
        balloonNumber: char.balloonNumber,
        description: char.description,
        nominalValue: char.nominalValue,
        upperTolerance: char.upperTolerance,
        lowerTolerance: char.lowerTolerance,
        characteristicType: char.toleranceType,
      })),
    });

    return this.generateQIF(qifDoc);
  }

  /**
   * Convert MES QIF Results to QIF XML
   */
  convertMESResultsToQIF(mesResults: MESQIFResults): string {
    // If XML content already exists, return it
    if (mesResults.xmlContent) {
      return mesResults.xmlContent;
    }

    // Otherwise, create QIF from MES data
    const qifDoc = this.createMeasurementResults({
      partNumber: mesResults.serialNumber || 'UNKNOWN',
      serialNumber: mesResults.serialNumber,
      measurements: mesResults.measurements.map((meas) => ({
        balloonNumber: meas.characteristicId,
        characteristicId: meas.characteristicId,
        measuredValue: meas.measuredValue,
        status: meas.status,
        measurementDevice: meas.measurementDevice,
        uncertainty: meas.uncertainty,
      })),
      inspectedBy: mesResults.inspectedBy,
      inspectionDate: mesResults.inspectionDate,
    });

    return this.generateQIF(qifDoc);
  }

  /**
   * Apply export options to QIF document
   */
  private applyExportOptions(qifDoc: QIFDocument, options?: QIFExportOptions): QIFDocument {
    if (!options) {
      return qifDoc;
    }

    const doc = { ...qifDoc };
    const qif = { ...doc.QIFDocument };

    // Remove sections based on options
    if (!options.includeHeader && qif.Header) {
      delete qif.Header;
    }

    if (!options.includeProduct && qif.Product) {
      delete qif.Product;
    }

    if (!options.includePlan && qif.MeasurementPlan) {
      delete qif.MeasurementPlan;
    }

    if (!options.includeResults && qif.MeasurementResults) {
      delete qif.MeasurementResults;
    }

    if (!options.includeResources && qif.Resources) {
      delete qif.Resources;
    }

    if (!options.includeStatistics && qif.Statistics) {
      delete qif.Statistics;
    }

    doc.QIFDocument = qif;
    return doc;
  }

  /**
   * Create characteristic item based on type
   */
  private createCharacteristicItem(characteristicType: string, nominalValue: number): any {
    // Simplified - in production, would need full GD&T support
    const charType = characteristicType.toUpperCase();

    if (charType.includes('DIAMETER')) {
      return {
        DiameterCharacteristicItem: {
          Nominal: nominalValue,
        },
      };
    }

    if (charType.includes('LENGTH') || charType.includes('DISTANCE')) {
      return {
        LengthCharacteristicItem: {
          Nominal: nominalValue,
        },
      };
    }

    if (charType.includes('ANGLE')) {
      return {
        AngleBetweenCharacteristicItem: {
          Nominal: nominalValue,
        },
      };
    }

    if (charType.includes('POSITION')) {
      return {
        PositionCharacteristicItem: {
          ToleranceValue: nominalValue,
        },
      };
    }

    if (charType.includes('FLATNESS')) {
      return {
        FlatnessCharacteristicItem: {
          ToleranceValue: nominalValue,
        },
      };
    }

    // Default to length
    return {
      LengthCharacteristicItem: {
        Nominal: nominalValue,
      },
    };
  }

  /**
   * Extract part number from QIF document
   */
  getPartNumber(qifDoc: QIFDocument): string | undefined {
    const product = qifDoc.QIFDocument.Product?.[0];
    return product?.PartNumber;
  }

  /**
   * Extract serial number from QIF document
   */
  getSerialNumber(qifDoc: QIFDocument): string | undefined {
    const product = qifDoc.QIFDocument.Product?.[0];
    return product?.SerialNumber;
  }

  /**
   * Extract inspection status from QIF measurement results
   */
  getInspectionStatus(qifDoc: QIFDocument): 'PASS' | 'FAIL' | 'CONDITIONAL' | undefined {
    return qifDoc.QIFDocument.MeasurementResults?.InspectionStatus;
  }

  /**
   * Count characteristics in QIF document
   */
  getCharacteristicCount(qifDoc: QIFDocument): number {
    let count = 0;

    if (qifDoc.QIFDocument.Product) {
      for (const product of qifDoc.QIFDocument.Product) {
        if (product.Characteristics) {
          count += product.Characteristics.length;
        }
      }
    }

    return count;
  }

  /**
   * Count measurements in QIF results
   */
  getMeasurementCount(qifDoc: QIFDocument): number {
    return qifDoc.QIFDocument.MeasurementResults?.Results?.length || 0;
  }
}

export default QIFService;
