/**
 * Serial Number Management Service
 * Issue #90: Lot Tracking & Serialization System
 *
 * Provides comprehensive serial number generation and assignment with:
 * - Configurable format generation
 * - Serial number uniqueness validation
 * - Traceability per serial number
 * - As-built BOM capture
 */

import prisma from '../lib/database';
import { SerializedPart, PartGenealogy } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface SerialNumberFormatConfig {
  pattern: string; // e.g., "PREFIX-{YYYY}{MM}-{SEQ6}", "{PARTNO}-{RANDOM}"
  prefix?: string;
  suffix?: string;
  sequenceStart?: number;
  incrementing?: boolean;
}

export interface AssignSerialInput {
  partId: string;
  lotNumber?: string;
  workOrderId?: string;
  formatConfigId?: string;
  quantity: number;
  manufactuDate?: Date;
  locationId?: string;
}

export interface AsBuiltBOMInput {
  serialNumber: string;
  componentPartId: string;
  componentSerialNumber?: string;
  quantity: number;
  workOrderId: string;
  operationId?: string;
  assemblyDate?: Date;
  operatorId?: string;
}

export class SerialNumberService {
  constructor() {}

  // ==================== SERIAL NUMBER GENERATION ====================

  /**
   * Generate serial numbers using configurable format
   */
  async generateSerialNumbers(input: AssignSerialInput): Promise<string[]> {
    const { partId, lotNumber, quantity, formatConfigId } = input;

    // Get part info
    const part = await prisma.part.findUnique({
      where: { id: partId },
    });

    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }

    // Get format config if specified
    let formatConfig: SerialNumberFormatConfig | null = null;
    if (formatConfigId) {
      const config = await prisma.serialNumberFormatConfig.findUnique({
        where: { id: formatConfigId },
      });
      if (config) {
        formatConfig = {
          pattern: config.pattern,
          prefix: config.prefix || undefined,
          suffix: config.suffix || undefined,
          sequenceStart: config.sequenceStart || 1,
          incrementing: config.incrementing ?? true,
        };
      }
    }

    // Generate serial numbers
    const serials: string[] = [];
    const now = new Date();

    for (let i = 0; i < quantity; i++) {
      let serial = this.formatSerialNumber(
        {
          pattern: formatConfig?.pattern || 'SN-{YYYY}{MM}{DD}-{SEQ6}',
          prefix: formatConfig?.prefix,
          suffix: formatConfig?.suffix,
          sequenceStart: formatConfig?.sequenceStart || 1,
        },
        part.partNumber,
        i
      );

      // Ensure uniqueness
      let attempts = 0;
      while (
        await prisma.serializedPart.findUnique({
          where: { serialNumber: serial },
        })
      ) {
        attempts++;
        if (attempts > 100) {
          throw new Error(`Could not generate unique serial number after 100 attempts`);
        }

        // Append random suffix for retry
        serial = serial + `-${uuidv4().substring(0, 4)}`;
      }

      serials.push(serial);
    }

    return serials;
  }

  /**
   * Assign serial numbers to manufactured parts
   */
  async assignSerialNumbers(input: AssignSerialInput): Promise<SerializedPart[]> {
    const { partId, lotNumber, workOrderId, quantity, manufactuDate, locationId, formatConfigId } = input;

    // Generate serials
    const serials = await this.generateSerialNumbers(input);

    // Create serialized parts
    const serializedParts: SerializedPart[] = [];

    for (const serial of serials) {
      const part = await prisma.serializedPart.create({
        data: {
          serialNumber: serial,
          partId,
          workOrderId,
          lotNumber,
          status: 'MANUFACTURED',
          currentLocationId: locationId,
          currentLocation: locationId ? (await prisma.location.findUnique({
            where: { id: locationId },
            select: { locationCode: true },
          })).locationCode : undefined,
          manufactureDate: manufactuDate || new Date(),
          createdAt: new Date(),
        },
      });

      serializedParts.push(part);
    }

    return serializedParts;
  }

  /**
   * Format serial number based on pattern
   */
  private formatSerialNumber(
    config: SerialNumberFormatConfig,
    partNumber: string,
    sequence: number
  ): string {
    let serial = config.pattern || 'SN-{YYYY}{MM}{DD}-{SEQ6}';
    const now = new Date();

    // Replace date tokens
    serial = serial.replace('{YYYY}', now.getFullYear().toString());
    serial = serial.replace('{YY}', (now.getFullYear() % 100).toString().padStart(2, '0'));
    serial = serial.replace('{MM}', (now.getMonth() + 1).toString().padStart(2, '0'));
    serial = serial.replace('{DD}', now.getDate().toString().padStart(2, '0'));
    serial = serial.replace('{HH}', now.getHours().toString().padStart(2, '0'));

    // Replace part tokens
    serial = serial.replace('{PARTNO}', partNumber);

    // Replace sequence tokens
    const sequenceStart = config.sequenceStart || 1;
    const seq = sequenceStart + sequence;

    serial = serial.replace('{SEQ}', seq.toString());
    serial = serial.replace('{SEQ3}', seq.toString().padStart(3, '0'));
    serial = serial.replace('{SEQ4}', seq.toString().padStart(4, '0'));
    serial = serial.replace('{SEQ6}', seq.toString().padStart(6, '0'));

    // Replace random tokens
    serial = serial.replace('{RANDOM}', uuidv4().substring(0, 8).toUpperCase());
    serial = serial.replace('{UUID}', uuidv4());

    // Add prefix and suffix
    if (config.prefix) {
      serial = config.prefix + serial;
    }
    if (config.suffix) {
      serial = serial + config.suffix;
    }

    return serial;
  }

  // ==================== SERIAL TRACEABILITY ====================

  /**
   * Get all components used in a serial number (as-built BOM)
   */
  async getAsBuiltBOM(serialNumber: string): Promise<any[]> {
    const serial = await prisma.serializedPart.findUnique({
      where: { serialNumber },
    });

    if (!serial) {
      throw new Error(`Serial number ${serialNumber} not found`);
    }

    // Get all components used in this serial
    const components = await prisma.partGenealogy.findMany({
      where: {
        parentPartId: serial.partId,
      },
      include: {
        componentPart: true,
      },
    });

    // Get actual serial numbers used (if available)
    const asBuiltBOM = [];

    for (const component of components) {
      const genealogies = await prisma.partGenealogy.findMany({
        where: {
          parentPartId: serial.partId,
          componentPartId: component.componentPartId,
        },
        include: {
          componentPart: true,
        },
      });

      asBuiltBOM.push({
        componentPartId: component.componentPartId,
        componentPartNumber: component.componentPart?.partNumber,
        componentPartName: component.componentPart?.partName,
        quantity: genealogies.length,
        assemblyDate: component.assemblyDate,
        workOrderId: genealogies[0]?.workOrderId,
      });
    }

    return asBuiltBOM;
  }

  /**
   * Record component usage in serial (as-built BOM)
   */
  async recordComponentUsage(input: AsBuiltBOMInput): Promise<PartGenealogy> {
    const { serialNumber, componentPartId, componentSerialNumber, workOrderId, operationId, assemblyDate, operatorId } = input;

    // Get parent serial
    const parentSerial = await prisma.serializedPart.findUnique({
      where: { serialNumber },
    });

    if (!parentSerial) {
      throw new Error(`Serial number ${serialNumber} not found`);
    }

    // Get component part
    const componentPart = await prisma.part.findUnique({
      where: { id: componentPartId },
    });

    if (!componentPart) {
      throw new Error(`Component part ${componentPartId} not found`);
    }

    // Create genealogy record
    const genealogy = await prisma.partGenealogy.create({
      data: {
        parentPartId: parentSerial.partId,
        componentPartId,
        assemblyDate: assemblyDate || new Date(),
        assemblyOperator: operatorId,
        workOrderId,
        operationId,
        createdAt: new Date(),
      },
    });

    return genealogy;
  }

  /**
   * Get all products containing a specific component (where-used)
   */
  async getWhereUsed(componentPartId: string): Promise<any[]> {
    const genealogies = await prisma.partGenealogy.findMany({
      where: { componentPartId },
      include: {
        parentPart: true,
      },
      distinct: ['parentPartId'],
    });

    return genealogies.map((g) => ({
      parentPartId: g.parentPartId,
      parentPartNumber: g.parentPart?.partNumber,
      parentPartName: g.parentPart?.partName,
      usageCount: genealogies.filter((gg) => gg.parentPartId === g.parentPartId).length,
    }));
  }

  /**
   * Get component history for a part
   */
  async getComponentHistory(partId: string): Promise<any[]> {
    const genealogies = await prisma.partGenealogy.findMany({
      where: { parentPartId: partId },
      include: {
        componentPart: true,
      },
      orderBy: { assemblyDate: 'desc' },
    });

    return genealogies.map((g) => ({
      componentPartId: g.componentPartId,
      componentPartNumber: g.componentPart?.partNumber,
      componentPartName: g.componentPart?.partName,
      assemblyDate: g.assemblyDate,
      assemblyOperator: g.assemblyOperator,
      workOrderId: g.workOrderId,
    }));
  }

  // ==================== SERIAL LIFECYCLE ====================

  /**
   * Update serial status
   */
  async updateSerialStatus(
    serialNumber: string,
    status: string,
    updatedBy: string,
    notes?: string
  ): Promise<SerializedPart> {
    const serial = await prisma.serializedPart.findUnique({
      where: { serialNumber },
    });

    if (!serial) {
      throw new Error(`Serial number ${serialNumber} not found`);
    }

    return prisma.serializedPart.update({
      where: { serialNumber },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update serial location
   */
  async updateSerialLocation(
    serialNumber: string,
    locationId: string,
    updatedBy: string
  ): Promise<SerializedPart> {
    const serial = await prisma.serializedPart.findUnique({
      where: { serialNumber },
    });

    if (!serial) {
      throw new Error(`Serial number ${serialNumber} not found`);
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    return prisma.serializedPart.update({
      where: { serialNumber },
      data: {
        currentLocationId: locationId,
        currentLocation: location.locationCode,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get serial number lifecycle events
   */
  async getSerialLifecycle(serialNumber: string): Promise<any> {
    const serial = await prisma.serializedPart.findUnique({
      where: { serialNumber },
      include: {
        part: true,
        components: true,
        genealogy: { include: { componentPart: true } },
      },
    });

    if (!serial) {
      throw new Error(`Serial number ${serialNumber} not found`);
    }

    return {
      serialNumber,
      partNumber: serial.part?.partNumber,
      partName: serial.part?.partName,
      status: serial.status,
      currentLocation: serial.currentLocation,
      manufactureDate: serial.manufactureDate,
      shipDate: serial.shipDate,
      customerInfo: serial.customerInfo,
      components: serial.genealogy.map((g) => ({
        componentPartNumber: g.componentPart?.partNumber,
        assemblyDate: g.assemblyDate,
      })),
    };
  }

  /**
   * Validate serial number format
   */
  validateSerialFormat(serial: string, pattern: string): boolean {
    // Basic validation - can be extended with regex patterns
    if (!serial || serial.length < 5) {
      return false;
    }

    // Check for required patterns
    if (pattern.includes('{PARTNO}') && !serial.includes('-')) {
      return false;
    }

    return true;
  }

  /**
   * Find serials by lot number
   */
  async findSerialsByLot(lotNumber: string): Promise<SerializedPart[]> {
    return prisma.serializedPart.findMany({
      where: { lotNumber },
      include: { part: true },
    });
  }

  /**
   * Find serials by work order
   */
  async findSerialsByWorkOrder(workOrderId: string): Promise<SerializedPart[]> {
    return prisma.serializedPart.findMany({
      where: { workOrderId },
      include: { part: true },
      orderBy: { serialNumber: 'asc' },
    });
  }

  /**
   * Count serials by status
   */
  async countSerialsByStatus(partId: string): Promise<Record<string, number>> {
    const result = await prisma.serializedPart.groupBy({
      by: ['status'],
      where: { partId },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.status] = row._count;
    }

    return counts;
  }
}

export default SerialNumberService;
