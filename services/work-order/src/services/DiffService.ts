/**
 * Diff Service
 * Advanced content comparison and delta management for work instructions
 * GitHub Issue #20: Comprehensive Revision Control System
 */

import * as diff from 'diff';
import * as jsondiffpatch from 'jsondiffpatch';
import * as crypto from 'crypto-js';
import {
  DiffData,
  DiffSection,
  DiffChange,
  DeltaOperation,
  ChangeType,
  ImpactLevel,
  DiffAlgorithm,
  ComparisonSummary,
  ConflictInfo
} from '../types/versionControl';

export interface DiffOptions {
  algorithm?: DiffAlgorithm;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignoreFormatting?: boolean;
  contextLines?: number;
  detectMoves?: boolean;
  semanticCleanup?: boolean;
  focusAreas?: string[];
  includeMetadata?: boolean;
}

export interface DiffAnalysisResult {
  diffData: DiffData;
  summary: ComparisonSummary;
  complexityScore: number;
  comparisonTime: number;
  changesByType: Record<ChangeType, number>;
  impactLevel: ImpactLevel;
}

export interface ContentStructure {
  id: string;
  version: string;
  title: string;
  description?: string;
  content: any;
  steps: StepContent[];
  media: MediaContent[];
  metadata: Record<string, any>;
  checksum: string;
}

export interface StepContent {
  stepNumber: number;
  title: string;
  content: string;
  estimatedDuration?: number;
  isCritical: boolean;
  requiresSignature: boolean;
  dataEntryFields?: any;
  media: MediaReference[];
}

export interface MediaContent {
  id: string;
  type: 'image' | 'video' | 'document' | 'diagram' | 'cad_model' | 'animation';
  filename: string;
  url: string;
  size: number;
  checksum: string;
  annotations?: any;
  metadata?: Record<string, any>;
}

export interface MediaReference {
  mediaId: string;
  position: 'inline' | 'attachment' | 'sidebar';
  description?: string;
}

export interface ConflictResolutionStrategy {
  strategy: 'manual' | 'auto_source' | 'auto_target' | 'auto_merge';
  confidence: number; // 0-1
  reasoning: string;
  suggestedAction?: string;
}

export class DiffService {
  private jsondiff: any;

  constructor() {
    // Configure jsondiffpatch with custom settings
    this.jsondiff = jsondiffpatch.create({
      objectHash: (obj: any, index: number) => {
        return obj.id || obj.stepNumber || obj.name || `${index}`;
      },
      arrays: {
        detectMove: true,
        includeValueOnMove: false
      },
      textDiff: {
        minLength: 20 // Minimum length for text diff
      },
      cloneDiffValues: false
    });
  }

  // ============================================================================
  // Core Diff Operations
  // ============================================================================

  /**
   * Compares two work instruction versions and generates comprehensive diff
   */
  async compareInstructions(
    sourceVersion: ContentStructure,
    targetVersion: ContentStructure,
    options: DiffOptions = {}
  ): Promise<DiffAnalysisResult> {
    const startTime = Date.now();

    try {
      // Normalize content for comparison
      const normalizedSource = this.normalizeContent(sourceVersion, options);
      const normalizedTarget = this.normalizeContent(targetVersion, options);

      // Generate diff data
      const diffData = await this.generateDiffData(
        normalizedSource,
        normalizedTarget,
        options
      );

      // Analyze changes
      const analysis = this.analyzeChanges(diffData, sourceVersion, targetVersion);

      // Calculate complexity score
      const complexityScore = this.calculateComplexityScore(diffData);

      // Generate summary
      const summary = this.generateSummary(diffData, analysis);

      const comparisonTime = Date.now() - startTime;

      return {
        diffData,
        summary,
        complexityScore,
        comparisonTime,
        changesByType: analysis.changesByType,
        impactLevel: analysis.impactLevel
      };
    } catch (error) {
      throw new Error(`Diff comparison failed: ${(error as Error).message}`);
    }
  }

  /**
   * Compares two specific sections (e.g., single step)
   */
  async compareSections(
    sourceSection: any,
    targetSection: any,
    sectionType: string,
    options: DiffOptions = {}
  ): Promise<DiffSection> {
    const changes: DiffChange[] = [];

    switch (sectionType) {
      case 'step':
        return this.compareSteps(sourceSection, targetSection, options);
      case 'media':
        return this.compareMedia(sourceSection, targetSection, options);
      case 'metadata':
        return this.compareMetadata(sourceSection, targetSection, options);
      default:
        return this.compareGenericContent(sourceSection, targetSection, sectionType, options);
    }
  }

  /**
   * Detects and analyzes merge conflicts
   */
  async detectConflicts(
    baseVersion: ContentStructure,
    sourceVersion: ContentStructure,
    targetVersion: ContentStructure,
    options: DiffOptions = {}
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // Compare base->source and base->target
    const [sourceDiff, targetDiff] = await Promise.all([
      this.compareInstructions(baseVersion, sourceVersion, options),
      this.compareInstructions(baseVersion, targetVersion, options)
    ]);

    // Find overlapping changes
    const sourceChanges = this.extractChangePaths(sourceDiff.diffData);
    const targetChanges = this.extractChangePaths(targetDiff.diffData);

    const conflictPaths = sourceChanges.filter(path => targetChanges.includes(path));

    for (const path of conflictPaths) {
      const sourceValue = this.getValueAtPath(sourceVersion, path);
      const targetValue = this.getValueAtPath(targetVersion, path);

      if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
        const conflict: ConflictInfo = {
          fieldPath: path,
          conflictType: this.determineConflictType(path),
          description: `Conflicting changes to ${path}`,
          sourceBranchValue: sourceValue,
          targetBranchValue: targetValue,
          resolutionStrategy: 'manual',
          suggestedResolution: this.suggestResolution(sourceValue, targetValue, path)
        };

        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Applies conflict resolution
   */
  async resolveConflicts(
    conflicts: ConflictInfo[],
    resolutions: Record<string, any>
  ): Promise<any> {
    const resolvedContent: any = {};

    for (const conflict of conflicts) {
      const resolution = resolutions[conflict.fieldPath];
      if (resolution !== undefined) {
        this.setValueAtPath(resolvedContent, conflict.fieldPath, resolution);
      }
    }

    return resolvedContent;
  }

  // ============================================================================
  // Specialized Comparison Methods
  // ============================================================================

  /**
   * Compares instruction steps
   */
  private compareSteps(
    sourceStep: StepContent,
    targetStep: StepContent,
    options: DiffOptions
  ): DiffSection {
    const changes: DiffChange[] = [];

    // Compare step properties
    if (sourceStep.stepNumber !== targetStep.stepNumber) {
      changes.push({
        fieldPath: 'stepNumber',
        fieldName: 'Step Number',
        operation: DeltaOperation.CHANGE,
        oldValue: sourceStep.stepNumber,
        newValue: targetStep.stepNumber
      });
    }

    if (sourceStep.title !== targetStep.title) {
      changes.push({
        fieldPath: 'title',
        fieldName: 'Step Title',
        operation: DeltaOperation.CHANGE,
        oldValue: sourceStep.title,
        newValue: targetStep.title
      });
    }

    // Compare content with text diff
    if (sourceStep.content !== targetStep.content) {
      const textDiff = this.generateTextDiff(
        sourceStep.content,
        targetStep.content,
        options
      );

      changes.push({
        fieldPath: 'content',
        fieldName: 'Step Content',
        operation: DeltaOperation.CHANGE,
        oldValue: sourceStep.content,
        newValue: targetStep.content,
        context: {
          surrounding: textDiff.context
        }
      });
    }

    // Compare media references
    const mediaChanges = this.compareMediaReferences(
      sourceStep.media,
      targetStep.media
    );
    changes.push(...mediaChanges);

    return {
      sectionType: 'step',
      sectionId: targetStep.stepNumber.toString(),
      sectionName: `Step ${targetStep.stepNumber}: ${targetStep.title}`,
      changeType: this.determineChangeType(changes),
      changes,
      impactLevel: this.calculateStepImpactLevel(sourceStep, targetStep, changes)
    };
  }

  /**
   * Compares media content
   */
  private compareMedia(
    sourceMedia: MediaContent[],
    targetMedia: MediaContent[],
    options: DiffOptions
  ): DiffSection {
    const changes: DiffChange[] = [];

    // Create maps for easier comparison
    const sourceMap = new Map(sourceMedia.map(m => [m.id, m]));
    const targetMap = new Map(targetMedia.map(m => [m.id, m]));

    // Find added media
    for (const [id, media] of targetMap) {
      if (!sourceMap.has(id)) {
        changes.push({
          fieldPath: `media.${id}`,
          fieldName: `Media: ${media.filename}`,
          operation: DeltaOperation.ADD,
          newValue: media
        });
      }
    }

    // Find removed media
    for (const [id, media] of sourceMap) {
      if (!targetMap.has(id)) {
        changes.push({
          fieldPath: `media.${id}`,
          fieldName: `Media: ${media.filename}`,
          operation: DeltaOperation.REMOVE,
          oldValue: media
        });
      }
    }

    // Find modified media
    for (const [id, targetMediaItem] of targetMap) {
      const sourceMediaItem = sourceMap.get(id);
      if (sourceMediaItem) {
        const mediaChanges = this.compareMediaItem(sourceMediaItem, targetMediaItem);
        changes.push(...mediaChanges);
      }
    }

    return {
      sectionType: 'media',
      sectionId: 'media-library',
      sectionName: 'Media Library',
      changeType: this.determineChangeType(changes),
      changes,
      impactLevel: this.calculateMediaImpactLevel(changes)
    };
  }

  /**
   * Compares metadata
   */
  private compareMetadata(
    sourceMetadata: Record<string, any>,
    targetMetadata: Record<string, any>,
    options: DiffOptions
  ): DiffSection {
    const changes: DiffChange[] = [];
    const delta = this.jsondiff.diff(sourceMetadata, targetMetadata);

    if (delta) {
      changes.push(...this.convertJsonDeltaToChanges(delta, 'metadata'));
    }

    return {
      sectionType: 'metadata',
      sectionId: 'metadata',
      sectionName: 'Metadata',
      changeType: this.determineChangeType(changes),
      changes,
      impactLevel: ImpactLevel.LOW
    };
  }

  /**
   * Compares generic content
   */
  private compareGenericContent(
    sourceContent: any,
    targetContent: any,
    sectionType: string,
    options: DiffOptions
  ): DiffSection {
    const changes: DiffChange[] = [];
    const delta = this.jsondiff.diff(sourceContent, targetContent);

    if (delta) {
      changes.push(...this.convertJsonDeltaToChanges(delta, sectionType));
    }

    return {
      sectionType: sectionType as any,
      sectionId: sectionType,
      sectionName: this.formatSectionName(sectionType),
      changeType: this.determineChangeType(changes),
      changes,
      impactLevel: this.calculateGenericImpactLevel(changes)
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Normalizes content for comparison
   */
  private normalizeContent(
    content: ContentStructure,
    options: DiffOptions
  ): ContentStructure {
    let normalized = { ...content };

    if (options.ignoreWhitespace) {
      normalized = this.trimWhitespace(normalized);
    }

    if (options.ignoreCase) {
      normalized = this.normalizeCase(normalized);
    }

    if (options.ignoreFormatting) {
      normalized = this.removeFormatting(normalized);
    }

    return normalized;
  }

  /**
   * Generates structured diff data
   */
  private async generateDiffData(
    source: ContentStructure,
    target: ContentStructure,
    options: DiffOptions
  ): Promise<DiffData> {
    const sections: DiffSection[] = [];

    // Compare main content
    if (source.content !== target.content) {
      const contentSection = await this.compareSections(
        source.content,
        target.content,
        'content',
        options
      );
      sections.push(contentSection);
    }

    // Compare steps
    const stepSections = await this.compareStepArrays(
      source.steps,
      target.steps,
      options
    );
    sections.push(...stepSections);

    // Compare media
    const mediaSection = await this.compareSections(
      source.media,
      target.media,
      'media',
      options
    );
    if (mediaSection.changes.length > 0) {
      sections.push(mediaSection);
    }

    // Compare metadata
    if (options.includeMetadata) {
      const metadataSection = await this.compareSections(
        source.metadata,
        target.metadata,
        'metadata',
        options
      );
      if (metadataSection.changes.length > 0) {
        sections.push(metadataSection);
      }
    }

    // Calculate metadata
    const changesByType = this.calculateChangesByType(sections);
    const affectedSteps = this.extractAffectedSteps(sections);
    const affectedFields = this.extractAffectedFields(sections);

    return {
      sections,
      metadata: {
        totalSections: sections.length,
        changesByType,
        affectedSteps,
        affectedFields
      }
    };
  }

  /**
   * Compares arrays of steps
   */
  private async compareStepArrays(
    sourceSteps: StepContent[],
    targetSteps: StepContent[],
    options: DiffOptions
  ): Promise<DiffSection[]> {
    const sections: DiffSection[] = [];

    // Create maps for easier comparison
    const sourceMap = new Map(sourceSteps.map(s => [s.stepNumber, s]));
    const targetMap = new Map(targetSteps.map(s => [s.stepNumber, s]));

    // Find all step numbers
    const allStepNumbers = new Set([
      ...sourceMap.keys(),
      ...targetMap.keys()
    ]);

    for (const stepNumber of allStepNumbers) {
      const sourceStep = sourceMap.get(stepNumber);
      const targetStep = targetMap.get(stepNumber);

      if (!sourceStep && targetStep) {
        // Step added
        sections.push({
          sectionType: 'step',
          sectionId: stepNumber.toString(),
          sectionName: `Step ${stepNumber}: ${targetStep.title}`,
          changeType: 'added',
          changes: [{
            fieldPath: `steps[${stepNumber}]`,
            fieldName: `Step ${stepNumber}`,
            operation: DeltaOperation.ADD,
            newValue: targetStep
          }],
          impactLevel: ImpactLevel.MEDIUM
        });
      } else if (sourceStep && !targetStep) {
        // Step removed
        sections.push({
          sectionType: 'step',
          sectionId: stepNumber.toString(),
          sectionName: `Step ${stepNumber}: ${sourceStep.title}`,
          changeType: 'removed',
          changes: [{
            fieldPath: `steps[${stepNumber}]`,
            fieldName: `Step ${stepNumber}`,
            operation: DeltaOperation.REMOVE,
            oldValue: sourceStep
          }],
          impactLevel: ImpactLevel.HIGH
        });
      } else if (sourceStep && targetStep) {
        // Step modified
        const stepSection = this.compareSteps(sourceStep, targetStep, options);
        if (stepSection.changes.length > 0) {
          sections.push(stepSection);
        }
      }
    }

    return sections;
  }

  /**
   * Generates text diff with context
   */
  private generateTextDiff(
    sourceText: string,
    targetText: string,
    options: DiffOptions
  ): { context: string; changes: any[] } {
    const changes = diff.diffWords(sourceText, targetText);

    let context = '';
    const contextLines = options.contextLines || 3;

    for (const change of changes) {
      if (change.added) {
        context += `[+${change.value}]`;
      } else if (change.removed) {
        context += `[-${change.value}]`;
      } else {
        context += change.value;
      }
    }

    return { context, changes };
  }

  /**
   * Compares media references within a step
   */
  private compareMediaReferences(
    sourceMedia: MediaReference[],
    targetMedia: MediaReference[]
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const sourceIds = sourceMedia.map(m => m.mediaId);
    const targetIds = targetMedia.map(m => m.mediaId);

    // Find added media references
    const addedIds = targetIds.filter(id => !sourceIds.includes(id));
    for (const id of addedIds) {
      const mediaRef = targetMedia.find(m => m.mediaId === id);
      changes.push({
        fieldPath: `media.${id}`,
        fieldName: `Media Reference: ${id}`,
        operation: DeltaOperation.ADD,
        newValue: mediaRef
      });
    }

    // Find removed media references
    const removedIds = sourceIds.filter(id => !targetIds.includes(id));
    for (const id of removedIds) {
      const mediaRef = sourceMedia.find(m => m.mediaId === id);
      changes.push({
        fieldPath: `media.${id}`,
        fieldName: `Media Reference: ${id}`,
        operation: DeltaOperation.REMOVE,
        oldValue: mediaRef
      });
    }

    return changes;
  }

  /**
   * Compares individual media items
   */
  private compareMediaItem(
    sourceMedia: MediaContent,
    targetMedia: MediaContent
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    if (sourceMedia.filename !== targetMedia.filename) {
      changes.push({
        fieldPath: `media.${sourceMedia.id}.filename`,
        fieldName: 'Filename',
        operation: DeltaOperation.CHANGE,
        oldValue: sourceMedia.filename,
        newValue: targetMedia.filename
      });
    }

    if (sourceMedia.checksum !== targetMedia.checksum) {
      changes.push({
        fieldPath: `media.${sourceMedia.id}.content`,
        fieldName: 'Media Content',
        operation: DeltaOperation.CHANGE,
        oldValue: 'Previous version',
        newValue: 'Updated version'
      });
    }

    return changes;
  }

  /**
   * Converts jsondiffpatch delta to DiffChange array
   */
  private convertJsonDeltaToChanges(
    delta: any,
    pathPrefix: string
  ): DiffChange[] {
    const changes: DiffChange[] = [];

    const traverse = (obj: any, currentPath: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;

        if (Array.isArray(value)) {
          if (value.length === 1) {
            // Added
            changes.push({
              fieldPath: fullPath,
              fieldName: this.formatFieldName(key),
              operation: DeltaOperation.ADD,
              newValue: value[0]
            });
          } else if (value.length === 2) {
            // Changed
            changes.push({
              fieldPath: fullPath,
              fieldName: this.formatFieldName(key),
              operation: DeltaOperation.CHANGE,
              oldValue: value[0],
              newValue: value[1]
            });
          } else if (value.length === 3 && value[2] === 0) {
            // Removed
            changes.push({
              fieldPath: fullPath,
              fieldName: this.formatFieldName(key),
              operation: DeltaOperation.REMOVE,
              oldValue: value[0]
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, fullPath);
        }
      }
    };

    traverse(delta, pathPrefix);
    return changes;
  }

  /**
   * Analysis and calculation methods
   */
  private analyzeChanges(
    diffData: DiffData,
    sourceVersion: ContentStructure,
    targetVersion: ContentStructure
  ): {
    changesByType: Record<ChangeType, number>;
    impactLevel: ImpactLevel;
  } {
    const changesByType: Record<ChangeType, number> = {
      [ChangeType.CONTENT_EDIT]: 0,
      [ChangeType.STEP_ADD]: 0,
      [ChangeType.STEP_REMOVE]: 0,
      [ChangeType.STEP_REORDER]: 0,
      [ChangeType.MEDIA_ADD]: 0,
      [ChangeType.MEDIA_REMOVE]: 0,
      [ChangeType.MEDIA_UPDATE]: 0,
      [ChangeType.METADATA_CHANGE]: 0,
      [ChangeType.APPROVAL_CHANGE]: 0,
      [ChangeType.STRUCTURE_CHANGE]: 0
    };

    let maxImpact = ImpactLevel.LOW;

    for (const section of diffData.sections) {
      if (section.impactLevel > maxImpact) {
        maxImpact = section.impactLevel;
      }

      // Count changes by type
      for (const change of section.changes) {
        switch (change.operation) {
          case DeltaOperation.ADD:
            if (section.sectionType === 'step') {
              changesByType[ChangeType.STEP_ADD]++;
            } else if (section.sectionType === 'media') {
              changesByType[ChangeType.MEDIA_ADD]++;
            }
            break;
          case DeltaOperation.REMOVE:
            if (section.sectionType === 'step') {
              changesByType[ChangeType.STEP_REMOVE]++;
            } else if (section.sectionType === 'media') {
              changesByType[ChangeType.MEDIA_REMOVE]++;
            }
            break;
          case DeltaOperation.CHANGE:
            if (section.sectionType === 'step') {
              changesByType[ChangeType.CONTENT_EDIT]++;
            } else if (section.sectionType === 'media') {
              changesByType[ChangeType.MEDIA_UPDATE]++;
            } else if (section.sectionType === 'metadata') {
              changesByType[ChangeType.METADATA_CHANGE]++;
            }
            break;
        }
      }
    }

    return {
      changesByType,
      impactLevel: maxImpact
    };
  }

  private calculateComplexityScore(diffData: DiffData): number {
    let score = 0;
    const weights = {
      section: 0.1,
      change: 0.05,
      stepAdd: 0.3,
      stepRemove: 0.4,
      mediaChange: 0.2,
      structuralChange: 0.5
    };

    score += diffData.sections.length * weights.section;

    for (const section of diffData.sections) {
      score += section.changes.length * weights.change;

      if (section.sectionType === 'step') {
        for (const change of section.changes) {
          if (change.operation === DeltaOperation.ADD) {
            score += weights.stepAdd;
          } else if (change.operation === DeltaOperation.REMOVE) {
            score += weights.stepRemove;
          }
        }
      }
    }

    // Normalize to 0-1 scale
    return Math.min(score, 1);
  }

  private generateSummary(
    diffData: DiffData,
    analysis: { changesByType: Record<ChangeType, number>; impactLevel: ImpactLevel }
  ): ComparisonSummary {
    const totalChanges = Object.values(analysis.changesByType).reduce((a, b) => a + b, 0);

    const keyChanges: string[] = [];
    for (const [type, count] of Object.entries(analysis.changesByType)) {
      if (count > 0) {
        keyChanges.push(`${count} ${type.toLowerCase().replace('_', ' ')} change${count > 1 ? 's' : ''}`);
      }
    }

    return {
      overview: `${totalChanges} total changes across ${diffData.sections.length} sections`,
      keyChanges,
      impactAnalysis: {
        trainingRequired: analysis.impactLevel >= ImpactLevel.MEDIUM,
        approvalRequired: analysis.impactLevel >= ImpactLevel.HIGH,
        estimatedReviewTime: this.estimateReviewTime(totalChanges, analysis.impactLevel),
        affectedRoles: this.determineAffectedRoles(analysis.changesByType)
      },
      recommendations: this.generateRecommendations(analysis)
    };
  }

  // Helper methods for various calculations and determinations
  private calculateChangesByType(sections: DiffSection[]): Record<ChangeType, number> {
    // Implementation similar to analyzeChanges
    return {} as Record<ChangeType, number>;
  }

  private extractAffectedSteps(sections: DiffSection[]): number[] {
    return sections
      .filter(s => s.sectionType === 'step')
      .map(s => parseInt(s.sectionId))
      .filter(n => !isNaN(n));
  }

  private extractAffectedFields(sections: DiffSection[]): string[] {
    const fields = new Set<string>();
    for (const section of sections) {
      for (const change of section.changes) {
        fields.add(change.fieldPath);
      }
    }
    return Array.from(fields);
  }

  private extractChangePaths(diffData: DiffData): string[] {
    const paths: string[] = [];
    for (const section of diffData.sections) {
      for (const change of section.changes) {
        paths.push(change.fieldPath);
      }
    }
    return paths;
  }

  private getValueAtPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private determineConflictType(path: string): 'content' | 'structure' | 'metadata' {
    if (path.includes('steps') || path.includes('content')) return 'content';
    if (path.includes('metadata')) return 'metadata';
    return 'structure';
  }

  private suggestResolution(sourceValue: any, targetValue: any, path: string): any {
    // Simple resolution strategy - could be much more sophisticated
    if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
      return `${sourceValue} [MERGED] ${targetValue}`;
    }
    return targetValue; // Default to target value
  }

  private determineChangeType(changes: DiffChange[]): 'added' | 'removed' | 'modified' | 'moved' {
    const operations = changes.map(c => c.operation);
    if (operations.includes(DeltaOperation.ADD)) return 'added';
    if (operations.includes(DeltaOperation.REMOVE)) return 'removed';
    if (operations.includes(DeltaOperation.MOVE)) return 'moved';
    return 'modified';
  }

  private calculateStepImpactLevel(
    sourceStep: StepContent,
    targetStep: StepContent,
    changes: DiffChange[]
  ): ImpactLevel {
    if (sourceStep.isCritical || targetStep.isCritical) {
      return ImpactLevel.HIGH;
    }
    if (changes.length > 3) {
      return ImpactLevel.MEDIUM;
    }
    return ImpactLevel.LOW;
  }

  private calculateMediaImpactLevel(changes: DiffChange[]): ImpactLevel {
    const hasRemovals = changes.some(c => c.operation === DeltaOperation.REMOVE);
    if (hasRemovals) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }

  private calculateGenericImpactLevel(changes: DiffChange[]): ImpactLevel {
    if (changes.length > 5) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }

  private formatSectionName(sectionType: string): string {
    return sectionType.charAt(0).toUpperCase() + sectionType.slice(1).replace('_', ' ');
  }

  private formatFieldName(fieldName: string): string {
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  }

  private trimWhitespace(content: any): any {
    // Deep trim whitespace from strings
    return JSON.parse(JSON.stringify(content, (key, value) =>
      typeof value === 'string' ? value.trim() : value
    ));
  }

  private normalizeCase(content: any): any {
    // Convert strings to lowercase for comparison
    return JSON.parse(JSON.stringify(content, (key, value) =>
      typeof value === 'string' ? value.toLowerCase() : value
    ));
  }

  private removeFormatting(content: any): any {
    // Remove HTML/markdown formatting
    return JSON.parse(JSON.stringify(content, (key, value) =>
      typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/[*_`]/g, '') : value
    ));
  }

  private estimateReviewTime(totalChanges: number, impactLevel: ImpactLevel): number {
    const baseTime = 5; // 5 minutes base
    const changeMultiplier = Math.ceil(totalChanges / 5) * 2;
    const impactMultiplier = impactLevel === ImpactLevel.HIGH ? 3 :
                           impactLevel === ImpactLevel.MEDIUM ? 2 : 1;

    return baseTime + (changeMultiplier * impactMultiplier);
  }

  private determineAffectedRoles(changesByType: Record<ChangeType, number>): string[] {
    const roles: string[] = [];

    if (changesByType[ChangeType.STEP_ADD] > 0 || changesByType[ChangeType.STEP_REMOVE] > 0) {
      roles.push('Process Engineer', 'Training Coordinator');
    }

    if (changesByType[ChangeType.CONTENT_EDIT] > 0) {
      roles.push('Subject Matter Expert', 'Operator');
    }

    if (changesByType[ChangeType.MEDIA_ADD] > 0 || changesByType[ChangeType.MEDIA_REMOVE] > 0) {
      roles.push('Technical Writer', 'Media Specialist');
    }

    return [...new Set(roles)];
  }

  private generateRecommendations(
    analysis: { changesByType: Record<ChangeType, number>; impactLevel: ImpactLevel }
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.impactLevel >= ImpactLevel.HIGH) {
      recommendations.push('Schedule formal review meeting with all stakeholders');
      recommendations.push('Plan phased rollout with pilot testing');
    }

    if (analysis.changesByType[ChangeType.STEP_REMOVE] > 0) {
      recommendations.push('Verify removal does not impact downstream processes');
    }

    if (analysis.changesByType[ChangeType.MEDIA_REMOVE] > 0) {
      recommendations.push('Ensure replacement media is available before publishing');
    }

    return recommendations;
  }
}