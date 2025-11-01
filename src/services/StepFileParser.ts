/**
 * STEP AP242 File Parser
 * Issue #220 Phase 2: Extract geometry and PMI from STEP files
 *
 * Parses STEP (ISO 10303-21) files to extract:
 * - Part geometry (features, surfaces, edges)
 * - Product Manufacturing Information (PMI)
 * - Geometric Dimensioning & Tolerancing (GD&T)
 * - Assembly structure and relationships
 */

import { promises as fs } from 'fs';
import { logger } from '../logging/logger';
import {
  PMIData,
  PMIFeature,
  PMIAnnotation,
  ToleranceSpecification,
  DimensionSpecification,
  DatumDefinition,
  MaterialSpecification,
  SurfaceFinish
} from '../types/step-ap242';

export interface StepFile {
  fileName: string;
  fileSize: number;
  entities: Map<number, StepEntity>;
  header: StepHeader;
  sections: StepSection[];
}

export interface StepEntity {
  id: number;
  type: string;
  attributes: any[];
  references: number[];
}

export interface StepHeader {
  fileName: string;
  timeStamp: Date;
  author: string;
  organization: string;
  preprocessor: string;
  originatingSystem: string;
  authorization: string;
  fileSchema: string;
}

export interface StepSection {
  name: string;
  entities: StepEntity[];
}

export class StepFileParser {
  /**
   * Parse STEP file and extract PMI data
   */
  static async parseStepFile(filePath: string, stepUuid: string): Promise<PMIData> {
    try {
      logger.info(`Parsing STEP file: ${filePath}`, { filePath, stepUuid });

      const content = await fs.readFile(filePath, 'utf-8');
      const stepFile = this.parseStepFormat(content);

      // Extract PMI components
      const features = this.extractFeatures(stepFile);
      const annotations = this.extractAnnotations(stepFile);
      const tolerances = this.extractTolerances(stepFile);
      const dimensions = this.extractDimensions(stepFile);
      const datums = this.extractDatums(stepFile);
      const materials = this.extractMaterials(stepFile);
      const surfaceFinishes = this.extractSurfaceFinishes(stepFile);

      const pmiData: PMIData = {
        uuid: stepUuid,
        cadModelUuid: stepUuid,
        extractionDate: new Date(),
        hasPMI: tolerances.length > 0 || dimensions.length > 0,
        features,
        annotations,
        tolerances,
        dimensions,
        datums,
        materials,
        surfaceFinishes
      };

      logger.info(`Successfully parsed STEP file: ${filePath}`, {
        features: features.length,
        tolerances: tolerances.length,
        dimensions: dimensions.length,
        hasPMI: pmiData.hasPMI
      });

      return pmiData;
    } catch (error) {
      logger.error('Failed to parse STEP file:', error);
      throw error;
    }
  }

  /**
   * Parse STEP file format (ISO 10303-21)
   */
  private static parseStepFormat(content: string): StepFile {
    const lines = content.split('\n');
    const stepFile: StepFile = {
      fileName: 'unknown.step',
      fileSize: content.length,
      entities: new Map(),
      header: this.parseHeader(lines),
      sections: []
    };

    let currentSection: StepSection | null = null;
    let inData = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse ISO standard header
      if (trimmed.startsWith('ISO-10303-21')) {
        continue;
      }

      // Detect sections
      if (trimmed === 'HEADER;') {
        inData = false;
        currentSection = { name: 'HEADER', entities: [] };
      } else if (trimmed === 'DATA;') {
        inData = true;
        currentSection = { name: 'DATA', entities: [] };
        if (currentSection) stepFile.sections.push(currentSection);
      }

      // Parse entities in DATA section
      if (inData && trimmed.match(/^#\d+\s*=/)) {
        const entity = this.parseEntity(trimmed);
        if (entity) {
          stepFile.entities.set(entity.id, entity);
          if (currentSection) {
            currentSection.entities.push(entity);
          }
        }
      }
    }

    return stepFile;
  }

  /**
   * Parse STEP file header
   */
  private static parseHeader(lines: string[]): StepHeader {
    const header: StepHeader = {
      fileName: 'unknown',
      timeStamp: new Date(),
      author: 'Unknown',
      organization: 'Unknown',
      preprocessor: 'Unknown',
      originatingSystem: 'Unknown',
      authorization: 'Unknown',
      fileSchema: 'AP242'
    };

    for (const line of lines) {
      if (line.includes("FILE_NAME")) {
        const match = line.match(/FILE_NAME\s*\(\s*'([^']+)'/);
        if (match) header.fileName = match[1];
      }
      if (line.includes("AUTHOR")) {
        const match = line.match(/AUTHOR\s*\(\s*'([^']+)'/);
        if (match) header.author = match[1];
      }
      if (line.includes("ORGANIZATION")) {
        const match = line.match(/ORGANIZATION\s*\(\s*'([^']+)'/);
        if (match) header.organization = match[1];
      }
    }

    return header;
  }

  /**
   * Parse individual STEP entity
   */
  private static parseEntity(line: string): StepEntity | null {
    const idMatch = line.match(/^#(\d+)\s*=/);
    if (!idMatch) return null;

    const id = parseInt(idMatch[1]);
    const typeAndAttrs = line.substring(idMatch[0].length).trim();
    const typeMatch = typeAndAttrs.match(/^([A-Z_]+)\s*\((.*)\)\s*;?$/);

    if (!typeMatch) return null;

    const type = typeMatch[1];
    const attrsStr = typeMatch[2];

    // Simple attribute parsing (handle nested parens later if needed)
    const attributes = this.parseAttributes(attrsStr);
    const references = this.extractReferences(attributes);

    return {
      id,
      type,
      attributes,
      references
    };
  }

  /**
   * Parse entity attributes
   */
  private static parseAttributes(attrStr: string): any[] {
    const attributes: any[] = [];
    let current = '';
    let parenDepth = 0;
    let inQuotes = false;

    for (let i = 0; i < attrStr.length; i++) {
      const char = attrStr[i];

      if (char === "'" && attrStr[i - 1] !== '\\') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '(' && !inQuotes) {
        parenDepth++;
        current += char;
      } else if (char === ')' && !inQuotes) {
        parenDepth--;
        current += char;
      } else if (char === ',' && parenDepth === 0 && !inQuotes) {
        attributes.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      attributes.push(current.trim());
    }

    return attributes;
  }

  /**
   * Extract entity references from attributes
   */
  private static extractReferences(attributes: any[]): number[] {
    const refs: number[] = [];
    for (const attr of attributes) {
      const matches = attr.match(/#(\d+)/g);
      if (matches) {
        for (const match of matches) {
          const id = parseInt(match.substring(1));
          if (!refs.includes(id)) {
            refs.push(id);
          }
        }
      }
    }
    return refs;
  }

  /**
   * Extract geometric features from STEP entities
   */
  private static extractFeatures(stepFile: StepFile): PMIFeature[] {
    const features: PMIFeature[] = [];
    const featureIds = new Set<string>();

    // Look for relevant geometry entities
    const featureEntityTypes = [
      'FACE',
      'EDGE',
      'VERTEX',
      'HOLE',
      'POCKET',
      'PAD',
      'SLOT',
      'CHAMFER',
      'FILLET',
      'BOSS',
      'PATTERN'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (featureEntityTypes.includes(entity.type)) {
        const featureId = `FEATURE_${id}`;
        if (!featureIds.has(featureId)) {
          features.push({
            id: featureId,
            uuid: featureId,
            name: `${entity.type} ${id}`,
            geometry: {
              type: entity.type,
              entityId: id,
              attributes: entity.attributes.slice(0, 3) // First 3 attributes
            },
            annotations: []
          });
          featureIds.add(featureId);
        }
      }
    }

    return features;
  }

  /**
   * Extract PMI annotations from STEP entities
   */
  private static extractAnnotations(stepFile: StepFile): PMIAnnotation[] {
    const annotations: PMIAnnotation[] = [];
    const annotationTypes = [
      'SURFACE_ANNOTATION',
      'SURFACE_MEMBER',
      'ANNOTATION',
      'PRESENTATION_ITEM'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (annotationTypes.includes(entity.type)) {
        annotations.push({
          id: `ANNOTATION_${id}`,
          uuid: `ANNOTATION_${id}`,
          type: entity.type,
          description: `${entity.type} ${id}`,
          featureId: this.findLinkedFeature(id, stepFile),
          content: entity.attributes.join(', ').substring(0, 255)
        });
      }
    }

    return annotations;
  }

  /**
   * Extract GD&T tolerances from STEP entities
   */
  private static extractTolerances(stepFile: StepFile): ToleranceSpecification[] {
    const tolerances: ToleranceSpecification[] = [];
    const toleranceEntityTypes = [
      'TOLERANCE',
      'GEOMETRIC_TOLERANCE',
      'POSITIONAL_TOLERANCE',
      'PERPENDICULAR_TOLERANCE',
      'PARALLEL_TOLERANCE',
      'FLATNESS_TOLERANCE',
      'RUNOUT_TOLERANCE',
      'PROFILE_TOLERANCE'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (toleranceEntityTypes.includes(entity.type)) {
        const value = this.extractNumericAttribute(entity.attributes, 0);
        const unit = this.extractStringAttribute(entity.attributes, 1) || 'mm';

        if (value !== null) {
          tolerances.push({
            type: entity.type
              .replace('_TOLERANCE', '')
              .replace(/_/g, ' ')
              .toUpperCase(),
            value,
            unit,
            featureId: this.findLinkedFeature(id, stepFile),
            modifier: this.extractModifier(entity.type),
            datumReferences: this.extractDatumRefs(entity.attributes)
          });
        }
      }
    }

    return tolerances;
  }

  /**
   * Extract dimensions from STEP entities
   */
  private static extractDimensions(stepFile: StepFile): DimensionSpecification[] {
    const dimensions: DimensionSpecification[] = [];
    const dimensionEntityTypes = [
      'DIMENSION',
      'LINEAR_DIMENSION',
      'ANGULAR_DIMENSION',
      'DIAMETER_DIMENSION',
      'RADIUS_DIMENSION',
      'DISTANCE_DIMENSION'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (dimensionEntityTypes.includes(entity.type)) {
        const value = this.extractNumericAttribute(entity.attributes, 0);
        const unit = this.extractStringAttribute(entity.attributes, 1) || 'mm';

        if (value !== null) {
          dimensions.push({
            type: entity.type
              .replace('_DIMENSION', '')
              .replace(/_/g, ' ')
              .toUpperCase(),
            value,
            unit,
            featureId: this.findLinkedFeature(id, stepFile)
          });
        }
      }
    }

    return dimensions;
  }

  /**
   * Extract datum references from STEP entities
   */
  private static extractDatums(stepFile: StepFile): DatumDefinition[] {
    const datums: DatumDefinition[] = [];
    const datumEntityTypes = [
      'DATUM',
      'DATUM_TARGET',
      'DATUM_FEATURE',
      'DATUM_PLANE',
      'DATUM_AXIS',
      'DATUM_POINT'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (datumEntityTypes.includes(entity.type)) {
        datums.push({
          id: `DATUM_${id}`,
          name: `${entity.type} ${id}`,
          type: entity.type,
          description: this.extractStringAttribute(entity.attributes, 0) || '',
          featureId: this.findLinkedFeature(id, stepFile)
        });
      }
    }

    return datums;
  }

  /**
   * Extract material specifications from STEP entities
   */
  private static extractMaterials(stepFile: StepFile): MaterialSpecification[] {
    const materials: MaterialSpecification[] = [];
    const materialEntityTypes = [
      'MATERIAL',
      'MATERIAL_DESIGNATION',
      'PROPERTY_DEFINITION'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (materialEntityTypes.includes(entity.type)) {
        materials.push({
          id: `MATERIAL_${id}`,
          name: this.extractStringAttribute(entity.attributes, 0) || 'Unknown',
          specification: this.extractStringAttribute(entity.attributes, 1) || '',
          density: this.extractNumericAttribute(entity.attributes, 2),
          properties: {
            tensileStrength: this.extractNumericAttribute(entity.attributes, 3),
            yieldStrength: this.extractNumericAttribute(entity.attributes, 4)
          }
        });
      }
    }

    return materials;
  }

  /**
   * Extract surface finish specifications from STEP entities
   */
  private static extractSurfaceFinishes(stepFile: StepFile): SurfaceFinish[] {
    const finishes: SurfaceFinish[] = [];
    const finishEntityTypes = [
      'SURFACE_FINISH',
      'SURFACE_TEXTURE',
      'ROUGHNESS_PARAMETER',
      'PROPERTY_DEFINITION'
    ];

    for (const [id, entity] of stepFile.entities) {
      if (finishEntityTypes.includes(entity.type)) {
        const roughness = this.extractNumericAttribute(entity.attributes, 0);
        if (roughness !== null) {
          finishes.push({
            id: `FINISH_${id}`,
            type: 'ROUGHNESS',
            specification: entity.type,
            roughnessRa: roughness,
            roughnessRz: this.extractNumericAttribute(entity.attributes, 1),
            method: this.extractStringAttribute(entity.attributes, 2) || 'ISO_1997',
            description: this.extractStringAttribute(entity.attributes, 3) || ''
          });
        }
      }
    }

    return finishes;
  }

  /**
   * Find feature linked to an entity
   */
  private static findLinkedFeature(entityId: number, stepFile: StepFile): string {
    // Simple heuristic: entities with nearby IDs are often related
    for (let offset = -5; offset <= 5; offset++) {
      const ref = entityId + offset;
      const entity = stepFile.entities.get(ref);
      if (entity && ['FACE', 'EDGE', 'HOLE', 'POCKET'].includes(entity.type)) {
        return `FEATURE_${ref}`;
      }
    }
    return `FEATURE_${entityId}`;
  }

  /**
   * Extract numeric attribute from array
   */
  private static extractNumericAttribute(attributes: any[], index: number): number | null {
    if (index < attributes.length) {
      const attr = attributes[index];
      const num = parseFloat(attr);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Extract string attribute from array
   */
  private static extractStringAttribute(attributes: any[], index: number): string | null {
    if (index < attributes.length) {
      const attr = attributes[index];
      return attr?.replace(/^'|'$/g, '') || null;
    }
    return null;
  }

  /**
   * Extract tolerance modifier (MMC, LMC, RFS)
   */
  private static extractModifier(entityType: string): string {
    if (entityType.includes('MAXIMUM')) return 'MMC';
    if (entityType.includes('MINIMUM')) return 'LMC';
    return 'RFS';
  }

  /**
   * Extract datum references from attributes
   */
  private static extractDatumRefs(attributes: any[]): string[] {
    const refs: string[] = [];
    for (const attr of attributes) {
      if (attr && attr.includes('DATUM')) {
        refs.push(attr);
      }
    }
    return refs;
  }
}

export default StepFileParser;
