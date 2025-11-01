/**
 * CAM Routing Generator
 * Issue #220 Phase 4: Generate manufacturing operations from PMI data
 *
 * Converts Product Manufacturing Information (PMI) from STEP files
 * into CNC/CAM operation instructions for manufacturing execution
 */

import { logger } from '../logging/logger';
import { PMIData, GDTAnnotation, PMIDimension } from '../types/step-ap242';

export interface CAMOperation {
  id: string;
  operationType: 'drill' | 'bore' | 'pocket' | 'profile' | 'thread' | 'deburr' | 'measure' | 'inspect';
  description: string;
  featureId: string;
  featureName: string;
  toolId?: string;
  toolDescription?: string;
  parameters: OperationParameters;
  tolerances: ToleranceData[];
  sequenceNumber: number;
  cycleTime?: number;
  safetyInstructions?: string[];
  inspectionPoints?: InspectionPoint[];
}

export interface OperationParameters {
  // For drilling/boring
  diameter?: number;
  depth?: number;
  feedRate?: number;
  spindleSpeed?: number;

  // For pockets/profiles
  width?: number;
  length?: number;
  stepOver?: number;
  cutDepth?: number;

  // For threading
  pitch?: number;
  threadType?: string;
  threadClass?: string;

  // General
  coolant?: string;
  material?: string;
  surfaceFinish?: string;
  [key: string]: any;
}

export interface ToleranceData {
  type: string; // POSITION, PERPENDICULAR, etc.
  tolerance: number;
  modifier?: string; // MMC, LMC, RFS
  datum?: string[];
  zone?: 'cylindrical' | 'planar' | 'spherical';
}

export interface InspectionPoint {
  id: string;
  description: string;
  position: { x: number; y: number; z: number };
  tolerance: number;
  measurementMethod: string;
}

export interface CAMRoutingResult {
  operations: CAMOperation[];
  totalCycleTime?: number;
  requiredTools: Set<string>;
  rawMaterial: {
    material?: string;
    stockDimensions?: { width: number; length: number; height: number };
  };
  warnings: string[];
  errors: string[];
}

export class CAMRoutingGenerator {
  /**
   * Generate CAM operations from PMI data
   */
  static generateRouting(pmiData: PMIData, partName: string): CAMRoutingResult {
    const result: CAMRoutingResult = {
      operations: [],
      requiredTools: new Set(),
      rawMaterial: {},
      warnings: [],
      errors: []
    };

    try {
      logger.info('Generating CAM routing from PMI', { part: partName });

      // Extract features and create operations
      const operations = this.extractOperationsFromFeatures(pmiData);
      result.operations = this.sequenceOperations(operations);

      // Map tolerances to operations
      this.mapTolerancesToOperations(pmiData, result.operations);

      // Generate tool list
      result.requiredTools = this.generateToolList(result.operations);

      // Extract material and stock info
      result.rawMaterial = this.extractMaterialInfo(pmiData);

      // Calculate total cycle time
      result.totalCycleTime = this.calculateTotalCycleTime(result.operations);

      // Validate operations
      this.validateOperations(result);

      logger.info('CAM routing generated successfully', {
        part: partName,
        operationCount: result.operations.length,
        cycleTime: result.totalCycleTime
      });
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      logger.error('Failed to generate CAM routing:', error);
    }

    return result;
  }

  /**
   * Extract operations from STEP features
   */
  private static extractOperationsFromFeatures(pmiData: PMIData): CAMOperation[] {
    const operations: CAMOperation[] = [];
    let sequenceNum = 10;

    if (!pmiData.features || !Array.isArray(pmiData.features)) {
      return operations;
    }

    pmiData.features.forEach((feature: any) => {
      const operation = this.createOperationFromFeature(feature, sequenceNum);
      if (operation) {
        operations.push(operation);
        sequenceNum += 10;
      }
    });

    return operations;
  }

  /**
   * Create single operation from feature
   */
  private static createOperationFromFeature(feature: any, sequence: number): CAMOperation | null {
    try {
      const featureType = feature.type?.toLowerCase() || 'unknown';
      const operationType = this.mapFeatureToOperationType(featureType);

      const parameters = this.extractOperationParameters(feature);

      return {
        id: `OP${sequence}`,
        operationType,
        description: `${operationType.toUpperCase()} - ${feature.name || feature.type}`,
        featureId: feature.id || '',
        featureName: feature.name || featureType,
        parameters,
        tolerances: [],
        sequenceNumber: sequence,
        safetyInstructions: this.generateSafetyInstructions(operationType, parameters),
        inspectionPoints: this.generateInspectionPoints(feature, parameters)
      };
    } catch (error) {
      logger.warn('Failed to create operation from feature:', error);
      return null;
    }
  }

  /**
   * Map STEP feature type to CAM operation type
   */
  private static mapFeatureToOperationType(
    featureType: string
  ): 'drill' | 'bore' | 'pocket' | 'profile' | 'thread' | 'deburr' | 'measure' | 'inspect' {
    const typeMap: Record<string, any> = {
      'hole': 'drill',
      'counterbore': 'bore',
      'pocket': 'pocket',
      'profile': 'profile',
      'pattern': 'pattern',
      'thread': 'thread',
      'bore': 'bore',
      'slot': 'pocket',
      'groove': 'pocket',
      'chamfer': 'deburr',
      'fillet': 'deburr'
    };

    return typeMap[featureType] || 'drill';
  }

  /**
   * Extract operation parameters from feature
   */
  private static extractOperationParameters(feature: any): OperationParameters {
    const params: OperationParameters = {};

    // Diameter
    if (feature.diameter) {
      params.diameter = feature.diameter;
    } else if (feature.radius) {
      params.diameter = feature.radius * 2;
    }

    // Depth
    if (feature.depth) {
      params.depth = feature.depth;
    }

    // Dimensions
    if (feature.width) params.width = feature.width;
    if (feature.length) params.length = feature.length;
    if (feature.height) params.height = feature.height;

    // Threading
    if (feature.pitch) params.pitch = feature.pitch;
    if (feature.threadType) params.threadType = feature.threadType;

    // Surface finish
    if (feature.surfaceFinish) {
      params.surfaceFinish = feature.surfaceFinish;
    }

    // Material
    if (feature.material) {
      params.material = feature.material;
    }

    // Default machining parameters based on feature type
    const defaults = this.getDefaultParameters(feature.type);
    return { ...defaults, ...params };
  }

  /**
   * Get default machining parameters for feature type
   */
  private static getDefaultParameters(featureType?: string): OperationParameters {
    const defaults: Record<string, OperationParameters> = {
      'hole': {
        feedRate: 0.05, // mm per tooth
        spindleSpeed: 1500, // RPM
        coolant: 'flood'
      },
      'pocket': {
        feedRate: 0.1,
        spindleSpeed: 1200,
        stepOver: 5,
        cutDepth: 5,
        coolant: 'flood'
      },
      'profile': {
        feedRate: 0.08,
        spindleSpeed: 1500,
        coolant: 'mist'
      },
      'thread': {
        feedRate: 0.03,
        spindleSpeed: 300,
        coolant: 'flood'
      }
    };

    return defaults[featureType?.toLowerCase() || ''] || {
      feedRate: 0.05,
      spindleSpeed: 1500,
      coolant: 'flood'
    };
  }

  /**
   * Sequence operations based on manufacturing logic
   */
  private static sequenceOperations(operations: CAMOperation[]): CAMOperation[] {
    // Simple sequencing: drills first, then pockets, then profiles
    const priority: Record<string, number> = {
      'drill': 1,
      'bore': 2,
      'thread': 3,
      'pocket': 4,
      'profile': 5,
      'deburr': 6,
      'inspect': 7,
      'measure': 8
    };

    const sorted = operations.sort((a, b) => {
      const priorityA = priority[a.operationType] || 99;
      const priorityB = priority[b.operationType] || 99;
      return priorityA - priorityB;
    });

    // Renumber sequence
    sorted.forEach((op, idx) => {
      op.sequenceNumber = (idx + 1) * 10;
      op.id = `OP${op.sequenceNumber}`;
    });

    return sorted;
  }

  /**
   * Map GD&T tolerances to operations
   */
  private static mapTolerancesToOperations(pmiData: PMIData, operations: CAMOperation[]): void {
    if (!pmiData.gdtAnnotations || !Array.isArray(pmiData.gdtAnnotations)) {
      return;
    }

    pmiData.gdtAnnotations.forEach((gdt: GDTAnnotation) => {
      // Find operation that relates to this tolerance
      const relatedOp = operations.find(op => {
        const geoName = gdt.appliedToGeometry?.toLowerCase() || '';
        return (
          op.featureName.toLowerCase().includes(geoName) ||
          gdt.appliedToGeometry?.includes(op.featureId)
        );
      });

      if (relatedOp) {
        relatedOp.tolerances.push({
          type: gdt.type || 'POSITION',
          tolerance: gdt.tolerance || 0.1,
          modifier: gdt.modifier,
          datum: gdt.datumReferences,
          zone: this.getToleranceZone(gdt.type)
        });
      }
    });
  }

  /**
   * Get tolerance zone type from GD&T type
   */
  private static getToleranceZone(
    gdtType?: string
  ): 'cylindrical' | 'planar' | 'spherical' {
    const type = gdtType?.toUpperCase() || '';

    if (type.includes('CYLINDRICAL') || type === 'POSITION') {
      return 'cylindrical';
    } else if (type.includes('SPHERICAL')) {
      return 'spherical';
    }

    return 'planar';
  }

  /**
   * Generate tool list from operations
   */
  private static generateToolList(operations: CAMOperation[]): Set<string> {
    const tools = new Set<string>();

    operations.forEach(op => {
      // Generate tool ID based on operation type and parameters
      const toolId = this.generateToolId(op);
      if (toolId) {
        tools.add(toolId);
        op.toolId = toolId;
      }
    });

    return tools;
  }

  /**
   * Generate unique tool ID from operation
   */
  private static generateToolId(operation: CAMOperation): string {
    switch (operation.operationType) {
      case 'drill':
        return `DRILL_${operation.parameters.diameter}mm`;
      case 'bore':
        return `BORE_${operation.parameters.diameter}mm`;
      case 'thread':
        return `THREAD_${operation.parameters.diameter}mm_${operation.parameters.pitch}mm`;
      case 'pocket':
      case 'profile':
        return `END_MILL_${operation.parameters.width || 10}mm`;
      default:
        return `TOOL_${operation.operationType}`;
    }
  }

  /**
   * Extract material and stock information
   */
  private static extractMaterialInfo(pmiData: PMIData): { material?: string; stockDimensions?: any } {
    const result: any = {};

    // Look for material spec in metadata or dimensions
    if (pmiData.metadata?.material) {
      result.material = pmiData.metadata.material;
    }

    // Look for raw stock dimensions
    if (pmiData.rawMaterialSpecs) {
      result.stockDimensions = pmiData.rawMaterialSpecs;
    }

    return result;
  }

  /**
   * Calculate total cycle time
   */
  private static calculateTotalCycleTime(operations: CAMOperation[]): number {
    let totalTime = 0;

    operations.forEach(op => {
      if (op.cycleTime) {
        totalTime += op.cycleTime;
      } else {
        // Estimate cycle time based on operation type and parameters
        op.cycleTime = this.estimateCycleTime(op);
        totalTime += op.cycleTime;
      }
    });

    return totalTime;
  }

  /**
   * Estimate cycle time for operation
   */
  private static estimateCycleTime(operation: CAMOperation): number {
    // Simple estimation: depends on operation type and parameters
    const baseTime: Record<string, number> = {
      'drill': 5,
      'bore': 10,
      'pocket': 30,
      'profile': 45,
      'thread': 15,
      'deburr': 10,
      'measure': 20,
      'inspect': 15
    };

    let time = baseTime[operation.operationType] || 10;

    // Add depth factor
    if (operation.parameters.depth) {
      time += operation.parameters.depth / 5;
    }

    // Add complexity factor
    if (operation.parameters.width && operation.parameters.length) {
      const area = operation.parameters.width * operation.parameters.length;
      time += area / 100;
    }

    return Math.round(time);
  }

  /**
   * Generate safety instructions
   */
  private static generateSafetyInstructions(
    operationType: string,
    parameters: OperationParameters
  ): string[] {
    const instructions: string[] = [
      'Verify workholding security before starting',
      'Ensure chip evacuation path is clear',
      'Check coolant level and flow'
    ];

    if (operationType === 'drill' || operationType === 'bore') {
      instructions.push('Verify drill/boring tool is securely seated');
      instructions.push('Use caution at breakthrough - feed rate may need reduction');
    }

    if (operationType === 'thread') {
      instructions.push('Monitor spindle load for thread chatter');
      instructions.push('Ensure proper thread mill or tap selection');
    }

    if (parameters.spindleSpeed && parameters.spindleSpeed > 2000) {
      instructions.push(`High spindle speed (${parameters.spindleSpeed} RPM) - ensure machine is stable`);
    }

    return instructions;
  }

  /**
   * Generate inspection points for quality verification
   */
  private static generateInspectionPoints(
    feature: any,
    parameters: OperationParameters
  ): InspectionPoint[] {
    const points: InspectionPoint[] = [];

    if (feature.type === 'hole' || feature.type === 'bore') {
      points.push({
        id: `INSP_${feature.id}_DIAMETER`,
        description: `Verify hole diameter: ${parameters.diameter}mm ±${feature.tolerance || 0.1}mm`,
        position: {
          x: feature.position?.x || 0,
          y: feature.position?.y || 0,
          z: (feature.position?.z || 0) + (parameters.depth || 0) / 2
        },
        tolerance: feature.tolerance || 0.1,
        measurementMethod: 'Caliper or CMM'
      });

      points.push({
        id: `INSP_${feature.id}_DEPTH`,
        description: `Verify hole depth: ${parameters.depth}mm ±${feature.depthTolerance || 0.1}mm`,
        position: {
          x: feature.position?.x || 0,
          y: feature.position?.y || 0,
          z: (feature.position?.z || 0) + (parameters.depth || 0)
        },
        tolerance: feature.depthTolerance || 0.1,
        measurementMethod: 'Depth gauge or CMM'
      });
    }

    if (feature.type === 'pocket' || feature.type === 'profile') {
      points.push({
        id: `INSP_${feature.id}_PROFILE`,
        description: `Verify pocket/profile dimensions`,
        position: {
          x: (feature.position?.x || 0) + (parameters.width || 0) / 2,
          y: (feature.position?.y || 0) + (parameters.length || 0) / 2,
          z: (feature.position?.z || 0) - (parameters.depth || 0)
        },
        tolerance: feature.tolerance || 0.1,
        measurementMethod: 'CMM or caliper'
      });
    }

    return points;
  }

  /**
   * Validate generated operations
   */
  private static validateOperations(result: CAMRoutingResult): void {
    // Check for missing critical parameters
    result.operations.forEach(op => {
      if ((op.operationType === 'drill' || op.operationType === 'bore') && !op.parameters.diameter) {
        result.warnings.push(`${op.description}: Missing diameter specification`);
      }

      if (op.operationType === 'pocket' && (!op.parameters.width || !op.parameters.length)) {
        result.warnings.push(`${op.description}: Missing pocket dimensions`);
      }

      if (!op.parameters.feedRate) {
        result.warnings.push(`${op.description}: Using default feed rate`);
      }

      if (!op.parameters.spindleSpeed) {
        result.warnings.push(`${op.description}: Using default spindle speed`);
      }
    });

    // Check for tool conflicts
    if (result.requiredTools.size === 0) {
      result.warnings.push('No tools identified - verify feature extraction');
    }
  }
}

export default CAMRoutingGenerator;
