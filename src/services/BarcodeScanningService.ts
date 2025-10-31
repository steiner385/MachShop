/**
 * Barcode Scanning Service
 *
 * Provides barcode/QR code scanning functionality for kit management,
 * part identification, and inventory tracking in aerospace manufacturing.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ScannedData {
  type: 'kit' | 'part' | 'location' | 'serial' | 'batch';
  id: string;
  additionalData?: Record<string, any>;
  scanTimestamp: Date;
  scanLocation?: string;
  operatorId?: string;
}

export interface BarcodeValidationResult {
  isValid: boolean;
  data?: ScannedData;
  errors: string[];
  suggestions: string[];
  entity?: any; // The actual database entity if found
}

export interface KitScanResult {
  success: boolean;
  kit?: any;
  validation: BarcodeValidationResult;
  nextActions: string[];
  warnings: string[];
}

export interface PartScanResult {
  success: boolean;
  part?: any;
  inventory?: any[];
  location?: any;
  validation: BarcodeValidationResult;
  alternativeParts?: any[];
  kitAssociations?: any[];
}

export interface LocationScanResult {
  success: boolean;
  location?: any;
  currentKits?: any[];
  capacity?: {
    current: number;
    maximum: number;
    availableSpace: number;
  };
  validation: BarcodeValidationResult;
}

export class BarcodeScanningService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parse and validate a barcode string
   */
  async parseBarcodeData(barcodeString: string, expectedType?: string): Promise<BarcodeValidationResult> {
    logger.info('Parsing barcode data', {
      barcodeLength: barcodeString.length,
      expectedType,
      barcodePrefix: barcodeString.substring(0, 10)
    });

    const errors: string[] = [];
    const suggestions: string[] = [];

    try {
      // Detect barcode format and type
      const detectedType = this.detectBarcodeType(barcodeString);

      if (expectedType && detectedType !== expectedType) {
        errors.push(`Expected ${expectedType} barcode but detected ${detectedType}`);
        suggestions.push(`Scan a ${expectedType} barcode instead`);
      }

      // Parse the barcode based on format
      let parsedData: ScannedData | null = null;

      switch (detectedType) {
        case 'kit':
          parsedData = await this.parseKitBarcode(barcodeString);
          break;
        case 'part':
          parsedData = await this.parsePartBarcode(barcodeString);
          break;
        case 'location':
          parsedData = await this.parseLocationBarcode(barcodeString);
          break;
        case 'serial':
          parsedData = await this.parseSerialBarcode(barcodeString);
          break;
        case 'batch':
          parsedData = await this.parseBatchBarcode(barcodeString);
          break;
        default:
          errors.push('Unknown barcode format');
          suggestions.push('Ensure barcode is properly formatted and readable');
      }

      if (!parsedData && errors.length === 0) {
        errors.push('Could not parse barcode data');
      }

      return {
        isValid: errors.length === 0 && parsedData !== null,
        data: parsedData || undefined,
        errors,
        suggestions
      };

    } catch (error) {
      logger.error('Barcode parsing error', { error, barcodeString });
      return {
        isValid: false,
        errors: [`Barcode parsing failed: ${error.message}`],
        suggestions: ['Try scanning the barcode again', 'Ensure barcode is clean and undamaged']
      };
    }
  }

  /**
   * Scan and validate a kit barcode
   */
  async scanKit(barcodeString: string, operatorId?: string): Promise<KitScanResult> {
    logger.info('Scanning kit barcode', { barcodeString, operatorId });

    try {
      const validation = await this.parseBarcodeData(barcodeString, 'kit');

      if (!validation.isValid || !validation.data) {
        return {
          success: false,
          validation,
          nextActions: ['Try scanning again', 'Verify barcode is a kit barcode'],
          warnings: []
        };
      }

      // Find the kit in the database
      const kit = await this.prisma.kit.findUnique({
        where: { id: validation.data.id },
        include: {
          kitItems: {
            include: {
              part: true,
              unitOfMeasureRef: true
            }
          },
          workOrder: {
            select: {
              workOrderNumber: true,
              part: { select: { partNumber: true, partName: true } }
            }
          },
          stagingLocation: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      });

      if (!kit) {
        return {
          success: false,
          validation: {
            ...validation,
            isValid: false,
            errors: [...validation.errors, 'Kit not found in database'],
            suggestions: ['Verify kit ID is correct', 'Check if kit has been deleted']
          },
          nextActions: ['Verify kit barcode', 'Contact supervisor'],
          warnings: []
        };
      }

      // Determine next actions based on kit status
      const nextActions = this.determineKitNextActions(kit);
      const warnings = this.generateKitWarnings(kit);

      // Log successful scan
      await this.logScanEvent({
        entityType: 'kit',
        entityId: kit.id,
        barcodeData: barcodeString,
        operatorId,
        result: 'success'
      });

      return {
        success: true,
        kit,
        validation: { ...validation, entity: kit },
        nextActions,
        warnings
      };

    } catch (error) {
      logger.error('Kit scan error', { error, barcodeString });
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [`Kit scan failed: ${error.message}`],
          suggestions: ['Try scanning again', 'Contact technical support']
        },
        nextActions: ['Retry scan', 'Manual kit lookup'],
        warnings: []
      };
    }
  }

  /**
   * Scan and validate a part barcode
   */
  async scanPart(barcodeString: string, operatorId?: string): Promise<PartScanResult> {
    logger.info('Scanning part barcode', { barcodeString, operatorId });

    try {
      const validation = await this.parseBarcodeData(barcodeString, 'part');

      if (!validation.isValid || !validation.data) {
        return {
          success: false,
          validation,
          alternativeParts: [],
          kitAssociations: []
        };
      }

      // Find the part and related data
      const [part, inventory, kitAssociations] = await Promise.all([
        this.prisma.part.findUnique({
          where: {
            partNumber: validation.data.id
          },
          include: {
            unitOfMeasure: true,
            alternativeParts: {
              include: { alternativePart: true }
            },
            bomItems: {
              include: {
                bom: {
                  include: {
                    part: { select: { partNumber: true, partName: true } }
                  }
                }
              }
            }
          }
        }),
        this.prisma.inventory.findMany({
          where: { partId: validation.data.id },
          include: {
            location: true,
            binLocation: true
          }
        }),
        this.prisma.kitItem.findMany({
          where: { partId: validation.data.id },
          include: {
            kit: { select: { kitNumber: true, status: true } }
          },
          take: 10
        })
      ]);

      if (!part) {
        return {
          success: false,
          validation: {
            ...validation,
            isValid: false,
            errors: [...validation.errors, 'Part not found in database'],
            suggestions: ['Verify part number is correct', 'Check for typos in barcode']
          },
          alternativeParts: [],
          kitAssociations: []
        };
      }

      // Get alternative parts if available
      const alternativeParts = part.alternativeParts.map(alt => alt.alternativePart);

      // Find current location from inventory
      const location = inventory.length > 0 ? inventory[0].location : null;

      // Log successful scan
      await this.logScanEvent({
        entityType: 'part',
        entityId: part.id,
        barcodeData: barcodeString,
        operatorId,
        result: 'success'
      });

      return {
        success: true,
        part,
        inventory,
        location,
        validation: { ...validation, entity: part },
        alternativeParts,
        kitAssociations
      };

    } catch (error) {
      logger.error('Part scan error', { error, barcodeString });
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [`Part scan failed: ${error.message}`],
          suggestions: ['Try scanning again', 'Contact technical support']
        },
        alternativeParts: [],
        kitAssociations: []
      };
    }
  }

  /**
   * Scan and validate a location barcode
   */
  async scanLocation(barcodeString: string, operatorId?: string): Promise<LocationScanResult> {
    logger.info('Scanning location barcode', { barcodeString, operatorId });

    try {
      const validation = await this.parseBarcodeData(barcodeString, 'location');

      if (!validation.isValid || !validation.data) {
        return {
          success: false,
          validation
        };
      }

      // Find the location and current kits
      const location = await this.prisma.stagingLocation.findFirst({
        where: {
          OR: [
            { locationCode: validation.data.id },
            { id: validation.data.id }
          ]
        },
        include: {
          area: true,
          kits: {
            where: {
              status: { in: ['STAGING', 'STAGED'] }
            },
            select: {
              id: true,
              kitNumber: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      if (!location) {
        return {
          success: false,
          validation: {
            ...validation,
            isValid: false,
            errors: [...validation.errors, 'Location not found'],
            suggestions: ['Verify location code', 'Check if location exists']
          }
        };
      }

      const capacity = {
        current: location.currentOccupancy,
        maximum: location.maxCapacity,
        availableSpace: location.maxCapacity - location.currentOccupancy
      };

      // Log successful scan
      await this.logScanEvent({
        entityType: 'location',
        entityId: location.id,
        barcodeData: barcodeString,
        operatorId,
        result: 'success'
      });

      return {
        success: true,
        location,
        currentKits: location.kits,
        capacity,
        validation: { ...validation, entity: location }
      };

    } catch (error) {
      logger.error('Location scan error', { error, barcodeString });
      return {
        success: false,
        validation: {
          isValid: false,
          errors: [`Location scan failed: ${error.message}`],
          suggestions: ['Try scanning again', 'Verify location barcode']
        }
      };
    }
  }

  /**
   * Generate QR code data for a kit
   */
  generateKitQRData(kit: any): string {
    const qrData = {
      type: 'kit',
      id: kit.id,
      kitNumber: kit.kitNumber,
      workOrder: kit.workOrder?.workOrderNumber,
      status: kit.status,
      generated: new Date().toISOString()
    };

    return JSON.stringify(qrData);
  }

  /**
   * Generate QR code data for a part
   */
  generatePartQRData(part: any): string {
    const qrData = {
      type: 'part',
      id: part.id,
      partNumber: part.partNumber,
      partName: part.partName,
      generated: new Date().toISOString()
    };

    return JSON.stringify(qrData);
  }

  // Private helper methods
  private detectBarcodeType(barcodeString: string): string {
    // Kit barcodes: KIT-xxx or JSON with type: 'kit'
    if (barcodeString.startsWith('KIT-') ||
        (barcodeString.startsWith('{') && barcodeString.includes('"type":"kit"'))) {
      return 'kit';
    }

    // Location barcodes: LOC-, STG-, or locationCode patterns
    if (barcodeString.startsWith('LOC-') ||
        barcodeString.startsWith('STG-') ||
        (barcodeString.startsWith('{') && barcodeString.includes('"type":"location"'))) {
      return 'location';
    }

    // Serial number barcodes: SN- or long alphanumeric
    if (barcodeString.startsWith('SN-') ||
        (barcodeString.length > 15 && /^[A-Z0-9]{15,}$/.test(barcodeString))) {
      return 'serial';
    }

    // Batch barcodes: BATCH- or BAT-
    if (barcodeString.startsWith('BATCH-') || barcodeString.startsWith('BAT-')) {
      return 'batch';
    }

    // Default to part number
    return 'part';
  }

  private async parseKitBarcode(barcodeString: string): Promise<ScannedData> {
    let kitId: string;
    let additionalData: Record<string, any> = {};

    if (barcodeString.startsWith('{')) {
      // JSON QR code format
      const qrData = JSON.parse(barcodeString);
      kitId = qrData.id;
      additionalData = qrData;
    } else {
      // Simple KIT-ID format
      kitId = barcodeString.replace('KIT-', '');
    }

    return {
      type: 'kit',
      id: kitId,
      additionalData,
      scanTimestamp: new Date()
    };
  }

  private async parsePartBarcode(barcodeString: string): Promise<ScannedData> {
    // For parts, the barcode is typically the part number
    return {
      type: 'part',
      id: barcodeString,
      scanTimestamp: new Date()
    };
  }

  private async parseLocationBarcode(barcodeString: string): Promise<ScannedData> {
    let locationId: string;
    let additionalData: Record<string, any> = {};

    if (barcodeString.startsWith('{')) {
      // JSON QR code format
      const qrData = JSON.parse(barcodeString);
      locationId = qrData.id;
      additionalData = qrData;
    } else {
      // Simple location code format
      locationId = barcodeString.replace(/^(LOC-|STG-)/, '');
    }

    return {
      type: 'location',
      id: locationId,
      additionalData,
      scanTimestamp: new Date()
    };
  }

  private async parseSerialBarcode(barcodeString: string): Promise<ScannedData> {
    return {
      type: 'serial',
      id: barcodeString.replace('SN-', ''),
      scanTimestamp: new Date()
    };
  }

  private async parseBatchBarcode(barcodeString: string): Promise<ScannedData> {
    return {
      type: 'batch',
      id: barcodeString.replace(/^(BATCH-|BAT-)/, ''),
      scanTimestamp: new Date()
    };
  }

  private determineKitNextActions(kit: any): string[] {
    const actions: string[] = [];

    switch (kit.status) {
      case 'PLANNED':
        actions.push('Generate barcode labels', 'Stage kit items', 'Assign staging location');
        break;
      case 'STAGING':
        actions.push('Complete staging process', 'Verify all items staged');
        break;
      case 'STAGED':
        actions.push('Issue kit to production', 'Scan staging location');
        break;
      case 'ISSUED':
        actions.push('Begin consumption', 'Track usage', 'Scan consumed items');
        break;
      case 'PARTIAL':
        actions.push('Complete remaining items', 'Return unused items');
        break;
      case 'CONSUMED':
        actions.push('Close kit', 'Archive records');
        break;
      default:
        actions.push('Check kit status');
    }

    return actions;
  }

  private generateKitWarnings(kit: any): string[] {
    const warnings: string[] = [];

    // Check for overdue kits
    if (kit.dueDate && new Date(kit.dueDate) < new Date()) {
      warnings.push('Kit is overdue');
    }

    // Check for incomplete staging
    if (kit.status === 'STAGING') {
      const incompleteItems = kit.kitItems?.filter((item: any) =>
        item.status !== 'STAGED'
      ).length || 0;

      if (incompleteItems > 0) {
        warnings.push(`${incompleteItems} items not yet staged`);
      }
    }

    // Check capacity
    if (kit.stagingLocation && kit.stagingLocation.currentOccupancy >= kit.stagingLocation.maxCapacity) {
      warnings.push('Staging location at capacity');
    }

    return warnings;
  }

  private async logScanEvent(event: {
    entityType: string;
    entityId: string;
    barcodeData: string;
    operatorId?: string;
    result: string;
  }): Promise<void> {
    try {
      // Log to database or audit system
      logger.info('Barcode scan event', {
        ...event,
        timestamp: new Date().toISOString()
      });

      // Could store in a scan_events table for audit trail
      // await this.prisma.scanEvent.create({ data: event });

    } catch (error) {
      logger.warn('Failed to log scan event', { error, event });
    }
  }
}