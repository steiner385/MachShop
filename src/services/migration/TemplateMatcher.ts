/**
 * Template Matcher Service
 * Issue #36: Paper-Based Traveler Digitization
 *
 * Handles template definition, matching, and field extraction
 * Supports pattern-based matching, regex patterns, and coordinate-based extraction
 */

import { logger } from '../../utils/logger';
import { OCRResult, TextBound } from './OCRService';

// ============================================================================
// Interfaces
// ============================================================================

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'signature' | 'table' | 'barcode';
  required: boolean;
  pattern?: string; // Regex pattern for validation
  extractionMethod: 'coordinate' | 'regex' | 'keyword' | 'proximity';
  coordinates?: {
    // For coordinate-based extraction
    x: number;
    y: number;
    width: number;
    height: number;
    tolerance?: number; // Percentage tolerance for coordinates
  };
  regexPattern?: string; // For regex extraction
  keywords?: string[]; // For keyword-based extraction
  proximityKeyword?: string; // For proximity-based extraction
  proximityDistance?: number; // Distance in pixels
}

export interface TravelerTemplate {
  id?: string;
  name: string;
  description?: string;
  version: number;
  documentType: string; // e.g., 'traveler', 'router', 'work_order'
  fields: FieldDefinition[];
  matchPatterns?: string[]; // Patterns to identify this template
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MatchResult {
  templateId: string;
  templateName: string;
  confidence: number;
  matchedPatterns: string[];
  extractedFields: ExtractedField[];
}

export interface ExtractedField {
  fieldName: string;
  fieldLabel: string;
  value: any;
  confidence: number;
  extractionMethod: string;
  sourceText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TemplateMatchingResult {
  matches: MatchResult[];
  bestMatch?: MatchResult;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Template Matcher Class
// ============================================================================

export class TemplateMatcher {
  private templates: Map<string, TravelerTemplate> = new Map();

  constructor() {
    // Initialize with empty templates
  }

  /**
   * Define a new template
   */
  defineTemplate(template: TravelerTemplate): void {
    try {
      if (!template.name) {
        throw new Error('Template name is required');
      }

      if (!template.fields || template.fields.length === 0) {
        throw new Error('Template must have at least one field');
      }

      const templateId = template.id || `template_${Date.now()}`;
      const newTemplate: TravelerTemplate = {
        ...template,
        id: templateId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.templates.set(templateId, newTemplate);

      logger.info('Template defined', {
        templateId,
        templateName: template.name,
        fieldCount: template.fields.length
      });
    } catch (error) {
      logger.error('Failed to define template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): TravelerTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): TravelerTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, updates: Partial<TravelerTemplate>): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updated: TravelerTemplate = {
      ...template,
      ...updates,
      id: templateId,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updated);
    logger.info('Template updated', { templateId });
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): void {
    this.templates.delete(templateId);
    logger.info('Template deleted', { templateId });
  }

  /**
   * Match document against templates and extract fields
   */
  matchTemplate(
    ocrResult: OCRResult,
    templateIds?: string[]
  ): TemplateMatchingResult {
    const result: TemplateMatchingResult = {
      matches: [],
      errors: [],
      warnings: []
    };

    try {
      // Get templates to match against
      const templatesToMatch = templateIds
        ? Array.from(this.templates.values()).filter((t) => templateIds.includes(t.id!))
        : Array.from(this.templates.values());

      if (templatesToMatch.length === 0) {
        result.warnings.push('No templates available for matching');
        return result;
      }

      // Match each template
      for (const template of templatesToMatch) {
        const matchResult = this.matchSingleTemplate(ocrResult, template);

        if (matchResult.confidence > 0) {
          result.matches.push(matchResult);
        }
      }

      // Sort by confidence
      result.matches.sort((a, b) => b.confidence - a.confidence);

      // Set best match
      if (result.matches.length > 0) {
        result.bestMatch = result.matches[0];
      }

      logger.info('Template matching completed', {
        totalMatches: result.matches.length,
        bestMatchConfidence: result.bestMatch?.confidence || 0
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      logger.error('Template matching error:', error);
    }

    return result;
  }

  /**
   * Match a single template
   */
  private matchSingleTemplate(ocrResult: OCRResult, template: TravelerTemplate): MatchResult {
    const matchResult: MatchResult = {
      templateId: template.id || '',
      templateName: template.name,
      confidence: 0,
      matchedPatterns: [],
      extractedFields: []
    };

    try {
      // Check match patterns
      if (template.matchPatterns && template.matchPatterns.length > 0) {
        for (const pattern of template.matchPatterns) {
          if (this.textMatches(ocrResult.text, pattern)) {
            matchResult.matchedPatterns.push(pattern);
          }
        }
      }

      // Extract fields
      for (const field of template.fields) {
        const extractedField = this.extractField(ocrResult, field);
        if (extractedField) {
          matchResult.extractedFields.push(extractedField);
        }
      }

      // Calculate confidence
      matchResult.confidence = this.calculateTemplateConfidence(
        matchResult,
        template,
        ocrResult
      );

      return matchResult;
    } catch (error) {
      logger.error('Error matching template:', error);
      matchResult.confidence = 0;
      return matchResult;
    }
  }

  /**
   * Extract a single field from OCR result
   */
  private extractField(ocrResult: OCRResult, field: FieldDefinition): ExtractedField | null {
    try {
      switch (field.extractionMethod) {
        case 'coordinate':
          return this.extractByCoordinate(ocrResult, field);

        case 'regex':
          return this.extractByRegex(ocrResult, field);

        case 'keyword':
          return this.extractByKeyword(ocrResult, field);

        case 'proximity':
          return this.extractByProximity(ocrResult, field);

        default:
          return null;
      }
    } catch (error) {
      logger.warn(`Failed to extract field '${field.name}':`, error);
      return null;
    }
  }

  /**
   * Extract field by coordinate
   */
  private extractByCoordinate(ocrResult: OCRResult, field: FieldDefinition): ExtractedField | null {
    if (!field.coordinates) {
      return null;
    }

    const coords = field.coordinates;
    const tolerance = (coords.tolerance || 10) / 100; // Convert percentage to decimal

    // Find text bounds within the coordinate range
    const matchingBounds = (ocrResult.bounds || []).filter((bound) => {
      return (
        bound.boundingBox.x >= coords.x * (1 - tolerance) &&
        bound.boundingBox.x + bound.boundingBox.width <= (coords.x + coords.width) * (1 + tolerance) &&
        bound.boundingBox.y >= coords.y * (1 - tolerance) &&
        bound.boundingBox.y + bound.boundingBox.height <= (coords.y + coords.height) * (1 + tolerance)
      );
    });

    if (matchingBounds.length === 0) {
      return null;
    }

    const extractedText = matchingBounds.map((b) => b.text).join(' ');
    const avgConfidence = matchingBounds.reduce((sum, b) => sum + b.confidence, 0) / matchingBounds.length;

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      value: this.parseFieldValue(extractedText, field),
      confidence: avgConfidence,
      extractionMethod: 'coordinate',
      sourceText: extractedText,
      boundingBox: {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      }
    };
  }

  /**
   * Extract field by regex pattern
   */
  private extractByRegex(ocrResult: OCRResult, field: FieldDefinition): ExtractedField | null {
    if (!field.regexPattern) {
      return null;
    }

    try {
      const regex = new RegExp(field.regexPattern, 'i');
      const match = ocrResult.text.match(regex);

      if (!match) {
        return null;
      }

      const extractedText = match[1] || match[0];

      return {
        fieldName: field.name,
        fieldLabel: field.label,
        value: this.parseFieldValue(extractedText, field),
        confidence: 0.8, // Regex match has fixed confidence
        extractionMethod: 'regex',
        sourceText: extractedText
      };
    } catch (error) {
      logger.warn(`Invalid regex pattern for field '${field.name}':`, error);
      return null;
    }
  }

  /**
   * Extract field by keyword
   */
  private extractByKeyword(ocrResult: OCRResult, field: FieldDefinition): ExtractedField | null {
    if (!field.keywords || field.keywords.length === 0) {
      return null;
    }

    const text = ocrResult.text.toLowerCase();

    for (const keyword of field.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // Find the text after the keyword
        const index = text.indexOf(keyword.toLowerCase());
        const afterKeyword = text.substring(index + keyword.length).trim();

        // Extract the next word(s)
        const words = afterKeyword.split(/\s+/).slice(0, 3).join(' ');

        return {
          fieldName: field.name,
          fieldLabel: field.label,
          value: this.parseFieldValue(words, field),
          confidence: 0.7,
          extractionMethod: 'keyword',
          sourceText: words
        };
      }
    }

    return null;
  }

  /**
   * Extract field by proximity to keyword
   */
  private extractByProximity(ocrResult: OCRResult, field: FieldDefinition): ExtractedField | null {
    if (!field.proximityKeyword || !ocrResult.bounds) {
      return null;
    }

    const keyword = field.proximityKeyword.toLowerCase();
    const distance = field.proximityDistance || 100;

    // Find the keyword in bounds
    const keywordBound = ocrResult.bounds.find((b) => b.text.toLowerCase() === keyword);

    if (!keywordBound) {
      return null;
    }

    // Find nearby text
    const nearbyBounds = ocrResult.bounds.filter((b) => {
      const dx = b.boundingBox.x - (keywordBound.boundingBox.x + keywordBound.boundingBox.width);
      const dy = b.boundingBox.y - keywordBound.boundingBox.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < distance && dist > 0;
    });

    if (nearbyBounds.length === 0) {
      return null;
    }

    const extractedText = nearbyBounds.map((b) => b.text).join(' ');
    const avgConfidence = nearbyBounds.reduce((sum, b) => sum + b.confidence, 0) / nearbyBounds.length;

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      value: this.parseFieldValue(extractedText, field),
      confidence: avgConfidence,
      extractionMethod: 'proximity',
      sourceText: extractedText
    };
  }

  /**
   * Parse field value based on type
   */
  private parseFieldValue(value: string, field: FieldDefinition): any {
    const trimmed = value.trim();

    switch (field.type) {
      case 'number':
        return parseInt(trimmed.replace(/\D/g, ''), 10);

      case 'date':
        return new Date(trimmed);

      case 'checkbox':
        return trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'yes';

      case 'text':
      default:
        return trimmed;
    }
  }

  /**
   * Calculate template matching confidence
   */
  private calculateTemplateConfidence(
    matchResult: MatchResult,
    template: TravelerTemplate,
    ocrResult: OCRResult
  ): number {
    let confidence = 0;
    let factors = 0;

    // Factor 1: Pattern matching (if patterns exist)
    if (template.matchPatterns && template.matchPatterns.length > 0) {
      const patternMatch = matchResult.matchedPatterns.length / template.matchPatterns.length;
      confidence += patternMatch * 0.3;
      factors += 0.3;
    }

    // Factor 2: Field extraction success rate
    const fieldExtraction = matchResult.extractedFields.length / template.fields.length;
    confidence += fieldExtraction * 0.4;
    factors += 0.4;

    // Factor 3: Average field confidence
    if (matchResult.extractedFields.length > 0) {
      const avgFieldConfidence =
        matchResult.extractedFields.reduce((sum, f) => sum + f.confidence, 0) / matchResult.extractedFields.length;
      confidence += avgFieldConfidence * 0.3;
      factors += 0.3;
    }

    // Normalize confidence
    return factors > 0 ? confidence / factors : 0;
  }

  /**
   * Check if text matches a pattern
   */
  private textMatches(text: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch (error) {
      logger.warn(`Invalid pattern: ${pattern}`, error);
      return false;
    }
  }
}

export default TemplateMatcher;
