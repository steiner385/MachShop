/**
 * Life-Limited Parts (LLP) Service
 *
 * Core service for managing LLP life tracking, back-to-birth traceability,
 * retirement management, and regulatory compliance.
 *
 * Features:
 * - Complete life cycle tracking (cycles, time, inspections)
 * - Back-to-birth traceability for regulatory compliance
 * - Automated retirement and alert management
 * - IATA, FAA, EASA compliance support
 * - Real-time status calculations and notifications
 *
 * Safety-critical system for aerospace manufacturing.
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import {
  LLPLifeStatus,
  LLPLifeStatusType,
  LLPBackToBirthTrace,
  LLPSerializedPart,
  LLPLifeEventRequest,
  LLPConfigurationRequest,
  LLPRetirementRequest,
  LLPLifeStatusResponse,
  LLPNextAction,
  LLPComplianceStatus,
  LLPCertificationStatus,
  LLPInstallationRecord,
  LLPMaintenanceRecord,
  LLPValidationResult,
  LLPError,
  LLPErrorType,
  LLPQueryFilters,
  LLPSortOptions,
  LLPQueryResult,
  CreateLLPLifeHistory
} from '../types/llp';

/**
 * Core LLP Service for life tracking and traceability
 */
export class LLPService extends EventEmitter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  // ============================================================================
  // LLP CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Configure a part as Life-Limited with retirement criteria
   */
  async configureLLP(config: LLPConfigurationRequest): Promise<void> {
    // Validate configuration
    const validation = this.validateLLPConfiguration(config);
    if (!validation.isValid) {
      throw new Error(`LLP Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Update part with LLP configuration
    await this.prisma.part.update({
      where: { id: config.partId },
      data: {
        isLifeLimited: config.isLifeLimited,
        llpCriticalityLevel: config.criticalityLevel,
        llpRetirementType: config.retirementType,
        llpCycleLimit: config.cycleLimit,
        llpTimeLimit: config.timeLimit,
        llpInspectionInterval: config.inspectionInterval,
        llpRegulatoryReference: config.regulatoryReference,
        llpCertificationRequired: config.certificationRequired,
        llpNotes: config.notes
      }
    });

    // Emit configuration event
    this.emit('llpConfigured', {
      partId: config.partId,
      configuration: config,
      timestamp: new Date()
    });
  }

  /**
   * Validate LLP configuration
   */
  private validateLLPConfiguration(config: LLPConfigurationRequest): LLPValidationResult {
    const errors: LLPError[] = [];

    // Validate retirement criteria
    if (config.isLifeLimited) {
      if (!config.cycleLimit && !config.timeLimit) {
        errors.push({
          type: LLPErrorType.VALIDATION_ERROR,
          code: 'LLP_001',
          message: 'LLP must have either cycle limit or time limit specified'
        });
      }

      if (config.cycleLimit && config.cycleLimit <= 0) {
        errors.push({
          type: LLPErrorType.VALIDATION_ERROR,
          code: 'LLP_002',
          message: 'Cycle limit must be greater than 0'
        });
      }

      if (config.timeLimit && config.timeLimit <= 0) {
        errors.push({
          type: LLPErrorType.VALIDATION_ERROR,
          code: 'LLP_003',
          message: 'Time limit must be greater than 0'
        });
      }

      if (config.inspectionInterval && config.inspectionInterval <= 0) {
        errors.push({
          type: LLPErrorType.VALIDATION_ERROR,
          code: 'LLP_004',
          message: 'Inspection interval must be greater than 0'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // ============================================================================
  // LIFE EVENT TRACKING
  // ============================================================================

  /**
   * Record a life event (install, remove, inspect, repair, etc.)
   */
  async recordLifeEvent(eventRequest: LLPLifeEventRequest): Promise<string> {
    // Validate the life event
    const validation = await this.validateLifeEvent(eventRequest);
    if (!validation.isValid) {
      throw new Error(`Life event validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Create life history record
    const lifeHistory = await this.prisma.lLPLifeHistory.create({
      data: {
        serializedPartId: eventRequest.serializedPartId,
        eventType: eventRequest.eventType,
        eventDate: eventRequest.eventDate,
        cyclesAtEvent: eventRequest.cyclesAtEvent,
        hoursAtEvent: eventRequest.hoursAtEvent,
        parentAssemblyId: eventRequest.parentAssemblyId,
        parentSerialNumber: eventRequest.parentSerialNumber,
        workOrderId: eventRequest.workOrderId,
        operationId: eventRequest.operationId,
        performedBy: eventRequest.performedBy,
        location: eventRequest.location,
        notes: eventRequest.notes,
        certificationUrls: eventRequest.certificationUrls || [],
        inspectionResults: eventRequest.inspectionResults,
        repairDetails: eventRequest.repairDetails,
        metadata: eventRequest.metadata
      }
    });

    // Update life status and check for alerts
    await this.updateLifeStatusAndCheckAlerts(eventRequest.serializedPartId);

    // Emit life event
    this.emit('lifeEventRecorded', {
      serializedPartId: eventRequest.serializedPartId,
      eventType: eventRequest.eventType,
      eventId: lifeHistory.id,
      timestamp: new Date()
    });

    return lifeHistory.id;
  }

  /**
   * Validate life event data
   */
  private async validateLifeEvent(eventRequest: LLPLifeEventRequest): Promise<LLPValidationResult> {
    const errors: LLPError[] = [];

    // Check if serialized part exists and is LLP
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: eventRequest.serializedPartId },
      include: { part: true }
    });

    if (!serializedPart) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'LLP_010',
        message: 'Serialized part not found',
        serializedPartId: eventRequest.serializedPartId
      });
      return { isValid: false, errors, warnings: [] };
    }

    if (!serializedPart.part.isLifeLimited) {
      errors.push({
        type: LLPErrorType.BUSINESS_RULE_VIOLATION,
        code: 'LLP_011',
        message: 'Part is not configured as Life-Limited',
        serializedPartId: eventRequest.serializedPartId
      });
    }

    // Validate cycles progression
    if (eventRequest.cyclesAtEvent !== null) {
      const lastEvent = await this.prisma.lLPLifeHistory.findFirst({
        where: { serializedPartId: eventRequest.serializedPartId },
        orderBy: { eventDate: 'desc' }
      });

      if (lastEvent && lastEvent.cyclesAtEvent && eventRequest.cyclesAtEvent < lastEvent.cyclesAtEvent) {
        errors.push({
          type: LLPErrorType.BUSINESS_RULE_VIOLATION,
          code: 'LLP_012',
          message: 'Cycles cannot decrease from previous event',
          serializedPartId: eventRequest.serializedPartId
        });
      }
    }

    // Validate retirement status
    if (eventRequest.eventType === 'INSTALL') {
      const currentStatus = await this.calculateLifeStatus(eventRequest.serializedPartId);
      if (currentStatus.isRetired || currentStatus.isExpired) {
        errors.push({
          type: LLPErrorType.COMPLIANCE_VIOLATION,
          code: 'LLP_013',
          message: 'Cannot install retired or expired LLP',
          serializedPartId: eventRequest.serializedPartId
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // ============================================================================
  // LIFE STATUS CALCULATION
  // ============================================================================

  /**
   * Calculate current life status for an LLP
   */
  async calculateLifeStatus(serializedPartId: string): Promise<LLPLifeStatus> {
    // Get serialized part with part configuration
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: serializedPartId },
      include: {
        part: true,
        llpLifeHistory: {
          orderBy: { eventDate: 'desc' }
        }
      }
    });

    if (!serializedPart) {
      throw new Error(`Serialized part ${serializedPartId} not found`);
    }

    if (!serializedPart.part.isLifeLimited) {
      throw new Error(`Part ${serializedPart.part.partNumber} is not configured as Life-Limited`);
    }

    const part = serializedPart.part;
    const history = serializedPart.llpLifeHistory;

    // Calculate current cycles and time
    const currentCycles = this.getCurrentCycles(history);
    const currentYears = this.getCurrentYears(history, serializedPart.manufactureDate);

    // Calculate cycle percentages
    const cyclePercentageUsed = part.llpCycleLimit ? (currentCycles / part.llpCycleLimit) * 100 : 0;
    const remainingCycles = part.llpCycleLimit ? Math.max(0, part.llpCycleLimit - currentCycles) : null;

    // Calculate time percentages
    const timePercentageUsed = part.llpTimeLimit ? (currentYears / part.llpTimeLimit) * 100 : 0;
    const remainingYears = part.llpTimeLimit ? Math.max(0, part.llpTimeLimit - currentYears) : null;

    // Determine overall percentage used based on retirement type
    let overallPercentageUsed = 0;
    switch (part.llpRetirementType) {
      case 'CYCLES_ONLY':
        overallPercentageUsed = cyclePercentageUsed;
        break;
      case 'TIME_ONLY':
        overallPercentageUsed = timePercentageUsed;
        break;
      case 'CYCLES_OR_TIME':
        overallPercentageUsed = Math.max(cyclePercentageUsed, timePercentageUsed);
        break;
      case 'CYCLES_AND_TIME':
        overallPercentageUsed = Math.min(cyclePercentageUsed, timePercentageUsed);
        break;
      default:
        overallPercentageUsed = Math.max(cyclePercentageUsed, timePercentageUsed);
    }

    // Calculate retirement due date
    const retirementDue = this.calculateRetirementDueDate(part, currentCycles, currentYears, serializedPart.manufactureDate);

    // Determine status and alert level
    const { status, alertLevel } = this.determineStatusAndAlert(overallPercentageUsed);

    // Calculate inspection information
    const { lastInspectionCycles, lastInspectionDate, nextInspectionDue, nextInspectionDate } =
      this.calculateInspectionStatus(history, part.llpInspectionInterval, currentCycles);

    // Determine compliance flags
    const isRetired = overallPercentageUsed >= 100;
    const isExpired = retirementDue ? new Date() > retirementDue : false;
    const canBeInstalled = !isRetired && !isExpired && overallPercentageUsed < 95;

    return {
      totalCycles: currentCycles,
      cycleLimit: part.llpCycleLimit,
      cyclePercentageUsed,
      remainingCycles,
      totalYears: currentYears,
      timeLimit: part.llpTimeLimit,
      timePercentageUsed,
      remainingYears,
      overallPercentageUsed,
      retirementDue,
      status,
      alertLevel,
      lastInspectionCycles,
      lastInspectionDate,
      nextInspectionDue,
      nextInspectionDate,
      isRetired,
      isExpired,
      canBeInstalled,
      retirementReason: isRetired ? this.getRetirementReason(part, cyclePercentageUsed, timePercentageUsed) : undefined
    };
  }

  /**
   * Get current cycles from life history
   */
  private getCurrentCycles(history: any[]): number {
    const latestWithCycles = history.find(h => h.cyclesAtEvent !== null);
    return latestWithCycles?.cyclesAtEvent || 0;
  }

  /**
   * Get current years since manufacture
   */
  private getCurrentYears(history: any[], manufactureDate: Date | null): number {
    const startDate = manufactureDate || history[history.length - 1]?.eventDate || new Date();
    const yearsDiff = (new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, yearsDiff);
  }

  /**
   * Calculate retirement due date
   */
  private calculateRetirementDueDate(
    part: any,
    currentCycles: number,
    currentYears: number,
    manufactureDate: Date | null
  ): Date | null {
    const retirementDates: Date[] = [];

    // Cycle-based retirement
    if (part.llpCycleLimit && part.llpCycleLimit > currentCycles) {
      // Estimate based on historical cycle rate (simplified)
      const cyclesRemaining = part.llpCycleLimit - currentCycles;
      const estimatedCyclesPerYear = currentCycles / Math.max(1, currentYears);
      const yearsToRetirement = cyclesRemaining / Math.max(1, estimatedCyclesPerYear);
      retirementDates.push(new Date(Date.now() + yearsToRetirement * 365.25 * 24 * 60 * 60 * 1000));
    }

    // Time-based retirement
    if (part.llpTimeLimit && manufactureDate) {
      const timeRetirementDate = new Date(manufactureDate);
      timeRetirementDate.setFullYear(timeRetirementDate.getFullYear() + part.llpTimeLimit);
      retirementDates.push(timeRetirementDate);
    }

    if (retirementDates.length === 0) return null;

    // Return earliest retirement date for OR logic, latest for AND logic
    return part.llpRetirementType === 'CYCLES_AND_TIME'
      ? new Date(Math.max(...retirementDates.map(d => d.getTime())))
      : new Date(Math.min(...retirementDates.map(d => d.getTime())));
  }

  /**
   * Determine status and alert level based on life percentage
   */
  private determineStatusAndAlert(percentageUsed: number): {
    status: LLPLifeStatusType;
    alertLevel: import('../types/llp').LLPAlertSeverity
  } {
    if (percentageUsed >= 100) {
      return { status: LLPLifeStatusType.RETIRED, alertLevel: 'EXPIRED' };
    } else if (percentageUsed >= 95) {
      return { status: LLPLifeStatusType.NEAR_RETIREMENT, alertLevel: 'URGENT' };
    } else if (percentageUsed >= 90) {
      return { status: LLPLifeStatusType.CRITICAL, alertLevel: 'CRITICAL' };
    } else if (percentageUsed >= 80) {
      return { status: LLPLifeStatusType.AGING, alertLevel: 'WARNING' };
    } else if (percentageUsed >= 20) {
      return { status: LLPLifeStatusType.ACTIVE, alertLevel: 'INFO' };
    } else {
      return { status: LLPLifeStatusType.NEW, alertLevel: 'INFO' };
    }
  }

  /**
   * Calculate inspection status
   */
  private calculateInspectionStatus(
    history: any[],
    inspectionInterval: number | null,
    currentCycles: number
  ) {
    const inspectionEvents = history.filter(h => h.eventType === 'INSPECT');
    const lastInspection = inspectionEvents[0];

    const lastInspectionCycles = lastInspection?.cyclesAtEvent || null;
    const lastInspectionDate = lastInspection?.eventDate || null;

    let nextInspectionDue: number | null = null;
    let nextInspectionDate: Date | null = null;

    if (inspectionInterval && lastInspectionCycles !== null) {
      nextInspectionDue = lastInspectionCycles + inspectionInterval;

      // Estimate date based on cycle rate (simplified)
      if (nextInspectionDue > currentCycles) {
        const cyclesUntilInspection = nextInspectionDue - currentCycles;
        // This is a simplified estimation - in practice, you'd use more sophisticated cycle rate calculation
        const estimatedDaysPerCycle = 1; // Placeholder
        nextInspectionDate = new Date(Date.now() + cyclesUntilInspection * estimatedDaysPerCycle * 24 * 60 * 60 * 1000);
      }
    }

    return {
      lastInspectionCycles,
      lastInspectionDate,
      nextInspectionDue,
      nextInspectionDate
    };
  }

  /**
   * Get retirement reason
   */
  private getRetirementReason(part: any, cyclePercentage: number, timePercentage: number): string {
    if (cyclePercentage >= 100 && timePercentage >= 100) {
      return 'Both cycle and time limits exceeded';
    } else if (cyclePercentage >= 100) {
      return 'Cycle limit exceeded';
    } else if (timePercentage >= 100) {
      return 'Time limit exceeded';
    } else {
      return 'Retirement limit reached';
    }
  }

  // ============================================================================
  // BACK-TO-BIRTH TRACEABILITY
  // ============================================================================

  /**
   * Generate complete back-to-birth traceability record
   */
  async generateBackToBirthTrace(serializedPartId: string): Promise<LLPBackToBirthTrace> {
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: serializedPartId },
      include: {
        part: true,
        llpLifeHistory: {
          orderBy: { eventDate: 'asc' }
        },
        llpCertifications: {
          where: { isActive: true },
          orderBy: { issuedDate: 'asc' }
        }
      }
    });

    if (!serializedPart) {
      throw new Error(`Serialized part ${serializedPartId} not found`);
    }

    // Get manufacturing info
    const manufacturingEvent = serializedPart.llpLifeHistory.find(h => h.eventType === 'MANUFACTURE');
    const manufacturingDate = manufacturingEvent?.eventDate || serializedPart.manufactureDate;
    const manufacturingLocation = manufacturingEvent?.location;

    // Get material certifications
    const materialCertifications = serializedPart.llpCertifications.filter(
      c => ['MATERIAL_CERT', 'HEAT_LOT_CERT', 'OEM_CERT'].includes(c.certificationType)
    );

    // Extract heat lot from certifications or metadata
    const heatLot = materialCertifications.find(c => c.certificationType === 'HEAT_LOT_CERT')?.batchNumber ||
                   manufacturingEvent?.metadata?.heatLot;

    // Build installation history
    const installationHistory: LLPInstallationRecord[] = serializedPart.llpLifeHistory
      .filter(h => ['INSTALL', 'REMOVE'].includes(h.eventType))
      .map(h => ({
        eventDate: h.eventDate,
        eventType: h.eventType as 'INSTALL' | 'REMOVE',
        cyclesAtEvent: h.cyclesAtEvent,
        hoursAtEvent: h.hoursAtEvent,
        parentAssemblyId: h.parentAssemblyId,
        parentSerialNumber: h.parentSerialNumber,
        location: h.location,
        performedBy: h.performedBy,
        workOrderId: h.workOrderId,
        notes: h.notes
      }));

    // Build maintenance history
    const maintenanceHistory: LLPMaintenanceRecord[] = serializedPart.llpLifeHistory
      .filter(h => ['REPAIR', 'INSPECT', 'OVERHAUL', 'REWORK'].includes(h.eventType))
      .map(h => ({
        eventDate: h.eventDate,
        eventType: h.eventType as 'REPAIR' | 'INSPECT' | 'OVERHAUL' | 'REWORK',
        cyclesAtEvent: h.cyclesAtEvent,
        hoursAtEvent: h.hoursAtEvent,
        maintenanceDetails: h.repairDetails,
        inspectionResults: h.inspectionResults,
        location: h.location,
        performedBy: h.performedBy,
        workOrderId: h.workOrderId,
        certificationUrls: h.certificationUrls,
        notes: h.notes
      }));

    // Calculate current life status
    const currentLifeStatus = await this.calculateLifeStatus(serializedPartId);

    // Calculate compliance status
    const complianceStatus = await this.calculateComplianceStatus(serializedPartId);

    return {
      serializedPartId,
      partNumber: serializedPart.part.partNumber,
      serialNumber: serializedPart.serialNumber,
      manufacturingDate,
      manufacturingLocation,
      heatLot,
      materialCertifications,
      installationHistory,
      maintenanceHistory,
      allCertifications: serializedPart.llpCertifications,
      currentLifeStatus,
      complianceStatus
    };
  }

  /**
   * Calculate compliance status for regulatory requirements
   */
  async calculateComplianceStatus(serializedPartId: string): Promise<LLPComplianceStatus> {
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: serializedPartId },
      include: {
        part: true,
        llpLifeHistory: true,
        llpCertifications: { where: { isActive: true } }
      }
    });

    if (!serializedPart) {
      throw new Error(`Serialized part ${serializedPartId} not found`);
    }

    const issues: string[] = [];
    const notes: string[] = [];

    // Check back-to-birth traceability
    const hasManufacturingRecord = serializedPart.llpLifeHistory.some(h => h.eventType === 'MANUFACTURE') ||
                                  serializedPart.manufactureDate !== null;
    const hasBackToBirthTrace = hasManufacturingRecord && serializedPart.llpLifeHistory.length > 0;

    if (!hasBackToBirthTrace) {
      issues.push('Missing complete back-to-birth traceability');
    }

    // Check Part 43 records (maintenance records)
    const hasMaintenanceRecords = serializedPart.llpLifeHistory.some(h =>
      ['REPAIR', 'INSPECT', 'OVERHAUL'].includes(h.eventType)
    );

    // Check certifications
    const hasForm1 = serializedPart.llpCertifications.some(c => c.certificationType === 'FORM_1');
    const hasMaterialCert = serializedPart.llpCertifications.some(c =>
      ['MATERIAL_CERT', 'HEAT_LOT_CERT'].includes(c.certificationType)
    );

    // IATA compliance
    const iataCompliant = hasBackToBirthTrace;
    if (!iataCompliant) {
      issues.push('IATA: Missing back-to-birth traceability');
    }

    // FAA compliance
    const faaCompliant = hasMaintenanceRecords || serializedPart.llpLifeHistory.length === 0;
    if (!faaCompliant) {
      issues.push('FAA: Missing Part 43 maintenance records');
    }

    // EASA compliance
    const easaCompliant = hasMaterialCert;
    if (!easaCompliant) {
      issues.push('EASA: Missing material certification and marking requirements');
    }

    const overallCompliant = iataCompliant && faaCompliant && easaCompliant;

    return {
      iataCompliant,
      hasBackToBirthTrace,
      faaCompliant,
      hasPart43Records: hasMaintenanceRecords,
      easaCompliant,
      hasMarkingRequirements: hasMaterialCert,
      overallCompliant,
      complianceIssues: issues,
      complianceNotes: notes
    };
  }

  // ============================================================================
  // RETIREMENT MANAGEMENT
  // ============================================================================

  /**
   * Retire an LLP with proper documentation
   */
  async retireLLP(retirementRequest: LLPRetirementRequest): Promise<void> {
    // Validate retirement request
    const validation = await this.validateRetirement(retirementRequest);
    if (!validation.isValid) {
      throw new Error(`Retirement validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Record retirement event
    await this.recordLifeEvent({
      serializedPartId: retirementRequest.serializedPartId,
      eventType: 'RETIRE',
      eventDate: retirementRequest.retirementDate,
      cyclesAtEvent: retirementRequest.retirementCycles,
      performedBy: retirementRequest.performedBy,
      location: retirementRequest.location,
      notes: `RETIRED: ${retirementRequest.retirementReason}. Disposition: ${retirementRequest.disposition}. ${retirementRequest.notes || ''}`,
      metadata: {
        retirementReason: retirementRequest.retirementReason,
        disposition: retirementRequest.disposition
      }
    });

    // Update serialized part status
    await this.prisma.serializedPart.update({
      where: { id: retirementRequest.serializedPartId },
      data: { status: 'RETIRED' }
    });

    // Close any active alerts
    await this.prisma.lLPAlert.updateMany({
      where: {
        serializedPartId: retirementRequest.serializedPartId,
        isActive: true
      },
      data: {
        isActive: false,
        resolvedBy: retirementRequest.performedBy,
        resolvedAt: new Date()
      }
    });

    // Emit retirement event
    this.emit('llpRetired', {
      serializedPartId: retirementRequest.serializedPartId,
      retirementReason: retirementRequest.retirementReason,
      disposition: retirementRequest.disposition,
      timestamp: new Date()
    });
  }

  /**
   * Validate retirement request
   */
  private async validateRetirement(request: LLPRetirementRequest): Promise<LLPValidationResult> {
    const errors: LLPError[] = [];

    // Check if part exists
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: request.serializedPartId },
      include: { part: true }
    });

    if (!serializedPart) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'LLP_020',
        message: 'Serialized part not found'
      });
      return { isValid: false, errors, warnings: [] };
    }

    // Check if already retired
    if (serializedPart.status === 'RETIRED') {
      errors.push({
        type: LLPErrorType.BUSINESS_RULE_VIOLATION,
        code: 'LLP_021',
        message: 'Part is already retired'
      });
    }

    // Validate retirement date is not in future
    if (request.retirementDate > new Date()) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'LLP_022',
        message: 'Retirement date cannot be in the future'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // ============================================================================
  // QUERY AND SEARCH
  // ============================================================================

  /**
   * Query LLPs with filtering, sorting, and pagination
   */
  async queryLLPs(
    filters: LLPQueryFilters = {},
    sort: LLPSortOptions = { field: 'partNumber', direction: 'asc' },
    page: number = 1,
    limit: number = 50
  ): Promise<LLPQueryResult<LLPLifeStatusResponse>> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      part: { isLifeLimited: true }
    };

    if (filters.partNumbers?.length) {
      where.part.partNumber = { in: filters.partNumbers };
    }

    if (filters.serialNumbers?.length) {
      where.serialNumber = { in: filters.serialNumbers };
    }

    if (filters.hasActiveAlerts) {
      where.llpAlerts = {
        some: { isActive: true }
      };
    }

    // Get total count
    const total = await this.prisma.serializedPart.count({ where });

    // Get data
    const serializedParts = await this.prisma.serializedPart.findMany({
      where,
      include: {
        part: true,
        llpAlerts: { where: { isActive: true } }
      },
      orderBy: this.buildOrderBy(sort),
      skip,
      take: limit
    });

    // Calculate life status for each part
    const data: LLPLifeStatusResponse[] = await Promise.all(
      serializedParts.map(async (sp) => {
        const lifeStatus = await this.calculateLifeStatus(sp.id);
        const nextActions = this.generateNextActions(lifeStatus);

        return {
          serializedPartId: sp.id,
          partNumber: sp.part.partNumber,
          serialNumber: sp.serialNumber,
          lifeStatus,
          activeAlerts: sp.llpAlerts,
          nextActions
        };
      })
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters,
      sort
    };
  }

  /**
   * Build Prisma orderBy clause from sort options
   */
  private buildOrderBy(sort: LLPSortOptions): any {
    switch (sort.field) {
      case 'partNumber':
        return { part: { partNumber: sort.direction } };
      case 'serialNumber':
        return { serialNumber: sort.direction };
      default:
        return { part: { partNumber: sort.direction } };
    }
  }

  /**
   * Generate next action recommendations
   */
  private generateNextActions(lifeStatus: LLPLifeStatus): LLPNextAction[] {
    const actions: LLPNextAction[] = [];

    // Retirement actions
    if (lifeStatus.overallPercentageUsed >= 95) {
      actions.push({
        actionType: 'RETIRE',
        priority: lifeStatus.overallPercentageUsed >= 100 ? 'CRITICAL' : 'HIGH',
        dueDate: lifeStatus.retirementDue,
        dueCycles: null,
        description: 'Part approaching/exceeding retirement limit',
        actionRequired: lifeStatus.overallPercentageUsed >= 100
      });
    } else if (lifeStatus.overallPercentageUsed >= 80) {
      actions.push({
        actionType: 'PLAN_REPLACEMENT',
        priority: 'MEDIUM',
        dueDate: lifeStatus.retirementDue,
        dueCycles: null,
        description: 'Plan replacement part procurement',
        actionRequired: false
      });
    }

    // Inspection actions
    if (lifeStatus.nextInspectionDue && lifeStatus.nextInspectionDue <= lifeStatus.totalCycles + 500) {
      actions.push({
        actionType: 'INSPECT',
        priority: 'MEDIUM',
        dueDate: lifeStatus.nextInspectionDate,
        dueCycles: lifeStatus.nextInspectionDue,
        description: 'Inspection due based on cycle interval',
        actionRequired: lifeStatus.nextInspectionDue <= lifeStatus.totalCycles
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Update life status and check for new alerts
   */
  private async updateLifeStatusAndCheckAlerts(serializedPartId: string): Promise<void> {
    const lifeStatus = await this.calculateLifeStatus(serializedPartId);

    // Check for retirement alerts
    if (lifeStatus.overallPercentageUsed >= 95 && !lifeStatus.isRetired) {
      await this.createAlertIfNeeded(serializedPartId, 'RETIREMENT_WARNING', lifeStatus);
    }

    // Check for inspection alerts
    if (lifeStatus.nextInspectionDue && lifeStatus.nextInspectionDue <= lifeStatus.totalCycles + 100) {
      await this.createAlertIfNeeded(serializedPartId, 'INSPECTION_DUE', lifeStatus);
    }

    // Emit life status updated event
    this.emit('lifeStatusUpdated', {
      serializedPartId,
      lifeStatus,
      timestamp: new Date()
    });
  }

  /**
   * Create alert if one doesn't already exist
   */
  private async createAlertIfNeeded(
    serializedPartId: string,
    alertType: string,
    lifeStatus: LLPLifeStatus
  ): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = await this.prisma.lLPAlert.findFirst({
      where: {
        serializedPartId,
        alertType,
        isActive: true
      }
    });

    if (existingAlert) return;

    // Create new alert
    await this.prisma.lLPAlert.create({
      data: {
        serializedPartId,
        alertType,
        severity: lifeStatus.alertLevel,
        triggerCycles: lifeStatus.totalCycles,
        triggerDate: new Date(),
        thresholdPercentage: lifeStatus.overallPercentageUsed,
        message: this.generateAlertMessage(alertType, lifeStatus),
        actionRequired: this.getActionRequired(alertType, lifeStatus),
        dueDate: this.getAlertDueDate(alertType, lifeStatus)
      }
    });

    // Emit alert created event
    this.emit('alertCreated', {
      serializedPartId,
      alertType,
      severity: lifeStatus.alertLevel,
      timestamp: new Date()
    });
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(alertType: string, lifeStatus: LLPLifeStatus): string {
    switch (alertType) {
      case 'RETIREMENT_WARNING':
        return `Part at ${lifeStatus.overallPercentageUsed.toFixed(1)}% of retirement limit. ${lifeStatus.retirementReason || 'Retirement planning required.'}`;
      case 'INSPECTION_DUE':
        return `Inspection due at ${lifeStatus.nextInspectionDue} cycles (current: ${lifeStatus.totalCycles} cycles)`;
      default:
        return `LLP alert: ${alertType}`;
    }
  }

  /**
   * Get action required for alert type
   */
  private getActionRequired(alertType: string, lifeStatus: LLPLifeStatus): string | null {
    switch (alertType) {
      case 'RETIREMENT_WARNING':
        return lifeStatus.overallPercentageUsed >= 100 ? 'Immediate retirement required' : 'Plan retirement';
      case 'INSPECTION_DUE':
        return 'Schedule inspection';
      default:
        return null;
    }
  }

  /**
   * Get alert due date
   */
  private getAlertDueDate(alertType: string, lifeStatus: LLPLifeStatus): Date | null {
    switch (alertType) {
      case 'RETIREMENT_WARNING':
        return lifeStatus.retirementDue;
      case 'INSPECTION_DUE':
        return lifeStatus.nextInspectionDate;
      default:
        return null;
    }
  }
}

export default LLPService;