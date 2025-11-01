/**
 * Report Template Registry Implementation
 * Issue #442: Report Template Extension System
 */

import type {
  ReportTemplate,
  ReportTemplateConfig,
  ReportValidationResult,
  IReportTemplateRegistry,
} from './types';

import {
  ReportError,
  ReportTemplateNotFoundError,
  ReportValidationError,
} from './types';
import { entityRegistry } from '../entities';

/**
 * Report Template Registry
 * Manages custom report template definitions
 */
export class ReportTemplateRegistry implements IReportTemplateRegistry {
  private templates: Map<string, ReportTemplate> = new Map();
  private permissions: Map<string, any> = new Map();
  private listeners: Set<(event: any) => void> = new Set();

  /**
   * Register a report template
   */
  register(config: ReportTemplateConfig): void {
    const { template, permissions } = config;

    if (this.templates.has(template.id)) {
      throw new ReportError(
        `Report template already exists: ${template.id}`,
        'DUPLICATE_TEMPLATE',
        { templateId: template.id }
      );
    }

    // Validate template
    const validation = this.validate(template);
    if (!validation.valid) {
      throw new ReportValidationError(template.id, validation.errors);
    }

    // Store template and permissions
    this.templates.set(template.id, template);
    if (permissions) {
      this.permissions.set(template.id, permissions);
    }

    this.emitEvent({
      type: 'TEMPLATE_REGISTERED',
      templateId: template.id,
      timestamp: new Date(),
    });
  }

  /**
   * Unregister a template
   */
  unregister(templateId: string): void {
    if (!this.templates.has(templateId)) {
      throw new ReportTemplateNotFoundError(templateId);
    }

    this.templates.delete(templateId);
    this.permissions.delete(templateId);

    this.emitEvent({
      type: 'TEMPLATE_UNREGISTERED',
      templateId,
      timestamp: new Date(),
    });
  }

  /**
   * Get a template
   */
  get(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all templates
   */
  list(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * List templates by category
   */
  listByCategory(category: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  /**
   * List templates for entity
   */
  listByEntity(entityName: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.entityName === entityName);
  }

  /**
   * Validate a template
   */
  validate(template: ReportTemplate): ReportValidationResult {
    const errors: any[] = [];

    // Validate basic fields
    if (!template.id) {
      errors.push({
        message: 'Template ID is required',
        code: 'MISSING_ID',
      });
    }

    if (!template.name) {
      errors.push({
        message: 'Template name is required',
        code: 'MISSING_NAME',
      });
    }

    if (!template.entityName) {
      errors.push({
        message: 'Entity name is required',
        code: 'MISSING_ENTITY',
      });
    } else {
      // Validate entity exists
      const entity = entityRegistry.get(template.entityName);
      if (!entity) {
        errors.push({
          message: `Entity not found: ${template.entityName}`,
          code: 'INVALID_ENTITY',
        });
      }
    }

    // Validate fields
    if (!template.fields || template.fields.length === 0) {
      errors.push({
        message: 'Template must have at least one field',
        code: 'NO_FIELDS',
      });
    } else {
      const fieldIds = new Set<string>();
      for (const field of template.fields) {
        if (!field.id) {
          errors.push({
            message: 'Field ID is required',
            code: 'MISSING_FIELD_ID',
          });
        }

        if (fieldIds.has(field.id)) {
          errors.push({
            fieldId: field.id,
            message: `Duplicate field ID: ${field.id}`,
            code: 'DUPLICATE_FIELD',
          });
        }
        fieldIds.add(field.id);

        // Validate field data source
        if (field.dataSource) {
          const entity = entityRegistry.get(template.entityName);
          if (entity) {
            const entityField = entity.fields.find((f) => f.name === field.dataSource);
            if (!entityField) {
              errors.push({
                fieldId: field.id,
                message: `Entity field not found: ${field.dataSource}`,
                code: 'INVALID_DATA_SOURCE',
              });
            }
          }
        }
      }
    }

    // Validate sections
    if (!template.sections || template.sections.length === 0) {
      errors.push({
        message: 'Template must have at least one section',
        code: 'NO_SECTIONS',
      });
    } else {
      for (const section of template.sections) {
        if (!section.id) {
          errors.push({
            message: 'Section ID is required',
            code: 'MISSING_SECTION_ID',
          });
        }

        if (!section.elements || section.elements.length === 0) {
          errors.push({
            message: `Section ${section.id} must have at least one element`,
            code: 'EMPTY_SECTION',
          });
        }

        // Validate elements
        for (const element of section.elements || []) {
          if (!element.id) {
            errors.push({
              message: 'Element ID is required',
              code: 'MISSING_ELEMENT_ID',
            });
          }

          if (element.fieldId) {
            const field = template.fields.find((f) => f.id === element.fieldId);
            if (!field) {
              errors.push({
                message: `Field not found: ${element.fieldId}`,
                code: 'INVALID_ELEMENT_FIELD',
              });
            }
          }
        }
      }
    }

    // Validate groups if present
    if (template.groups) {
      for (const group of template.groups) {
        const field = template.fields.find((f) => f.id === group.fieldId);
        if (!field) {
          errors.push({
            message: `Field not found for group: ${group.fieldId}`,
            code: 'INVALID_GROUP_FIELD',
          });
        }

        if (group.subtotals) {
          for (const subtotalFieldId of group.subtotals) {
            const subtotalField = template.fields.find((f) => f.id === subtotalFieldId);
            if (!subtotalField) {
              errors.push({
                message: `Field not found for subtotal: ${subtotalFieldId}`,
                code: 'INVALID_SUBTOTAL_FIELD',
              });
            }
          }
        }
      }
    }

    // Validate filters if present
    if (template.filters) {
      for (const filter of template.filters) {
        const field = template.fields.find((f) => f.id === filter.fieldId);
        if (!field) {
          errors.push({
            message: `Field not found for filter: ${filter.fieldId}`,
            code: 'INVALID_FILTER_FIELD',
          });
        }
      }
    }

    // Validate parameters if present
    if (template.parameters) {
      for (const param of template.parameters) {
        if (!param.id || !param.name) {
          errors.push({
            message: 'Parameter must have ID and name',
            code: 'INVALID_PARAMETER',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clone a template with new ID and name
   */
  clone(templateId: string, newName: string): ReportTemplate {
    const original = this.get(templateId);
    if (!original) {
      throw new ReportTemplateNotFoundError(templateId);
    }

    const cloned: ReportTemplate = {
      ...original,
      id: `${newName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return cloned;
  }

  /**
   * Update a template
   */
  update(templateId: string, updates: Partial<ReportTemplate>): ReportTemplate {
    const template = this.get(templateId);
    if (!template) {
      throw new ReportTemplateNotFoundError(templateId);
    }

    const updated: ReportTemplate = {
      ...template,
      ...updates,
      id: template.id, // Don't allow ID changes
      updatedAt: new Date(),
    };

    const validation = this.validate(updated);
    if (!validation.valid) {
      throw new ReportValidationError(templateId, validation.errors);
    }

    this.templates.set(templateId, updated);

    this.emitEvent({
      type: 'TEMPLATE_UPDATED',
      templateId,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Get permissions for a template
   */
  getPermissions(templateId: string): any {
    return this.permissions.get(templateId) || {};
  }

  /**
   * Update permissions
   */
  updatePermissions(templateId: string, permissions: any): void {
    if (!this.templates.has(templateId)) {
      throw new ReportTemplateNotFoundError(templateId);
    }

    this.permissions.set(templateId, permissions);

    this.emitEvent({
      type: 'PERMISSIONS_UPDATED',
      templateId,
      timestamp: new Date(),
    });
  }

  /**
   * Check if user can access template
   */
  canAccess(templateId: string, userId: string, action: string): boolean {
    const permissions = this.getPermissions(templateId);
    if (!permissions) {
      return true; // No restrictions
    }

    const allowedList = permissions[`can${action.charAt(0).toUpperCase() + action.slice(1)}`];
    if (!allowedList) {
      return true; // No restrictions for this action
    }

    return allowedList.includes(userId) || allowedList.includes('*'); // * means all users
  }

  /**
   * Register event listener
   */
  onTemplateEvent(listener: (event: any) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit event
   */
  private emitEvent(event: any): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in template event listener:', error);
      }
    }
  }

  /**
   * Search templates
   */
  search(query: {
    name?: string;
    category?: string;
    entityName?: string;
    createdAfter?: Date;
    createdBefore?: Date;
  }): ReportTemplate[] {
    let results = Array.from(this.templates.values());

    if (query.name) {
      const pattern = new RegExp(query.name, 'i');
      results = results.filter((t) => pattern.test(t.name));
    }

    if (query.category) {
      results = results.filter((t) => t.category === query.category);
    }

    if (query.entityName) {
      results = results.filter((t) => t.entityName === query.entityName);
    }

    if (query.createdAfter) {
      results = results.filter((t) => t.createdAt >= query.createdAfter!);
    }

    if (query.createdBefore) {
      results = results.filter((t) => t.createdAt <= query.createdBefore!);
    }

    return results;
  }

  /**
   * Get template statistics
   */
  getStatistics(): {
    totalTemplates: number;
    byCategory: Record<string, number>;
    byEntity: Record<string, number>;
    recentlyCreated: ReportTemplate[];
  } {
    const templates = Array.from(this.templates.values());
    const byCategory: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    for (const template of templates) {
      byCategory[template.category || 'uncategorized'] = (byCategory[template.category || 'uncategorized'] || 0) + 1;
      byEntity[template.entityName] = (byEntity[template.entityName] || 0) + 1;
    }

    const recentlyCreated = templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

    return {
      totalTemplates: templates.length,
      byCategory,
      byEntity,
      recentlyCreated,
    };
  }

  /**
   * Export template as JSON
   */
  exportTemplate(templateId: string): string {
    const template = this.get(templateId);
    if (!template) {
      throw new ReportTemplateNotFoundError(templateId);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(json: string): ReportTemplate {
    try {
      const template = JSON.parse(json) as ReportTemplate;
      template.createdAt = new Date(template.createdAt);
      template.updatedAt = new Date(template.updatedAt);

      const validation = this.validate(template);
      if (!validation.valid) {
        throw new ReportValidationError(template.id, validation.errors);
      }

      return template;
    } catch (error) {
      throw new ReportError('Failed to import template', 'IMPORT_ERROR', { error: String(error) });
    }
  }
}

/**
 * Global report template registry
 */
export const reportTemplateRegistry = new ReportTemplateRegistry();
