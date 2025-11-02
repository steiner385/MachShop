/**
 * Layout Engine for Form Builder
 * Handles form layout rendering and responsive design
 */

import { FieldConfig, LayoutConfig, LayoutType, TabConfig, AccordionItemConfig, WizardStepConfig } from '../types';

/**
 * Layout engine for processing and organizing form fields
 */
export class LayoutEngine {
  /**
   * Get fields grouped by layout structure
   */
  public getFieldsByLayout(
    fields: Map<string, FieldConfig>,
    layout: LayoutConfig
  ): Record<string, FieldConfig[]> {
    const groupedFields: Record<string, FieldConfig[]> = {};

    switch (layout.type) {
      case LayoutType.SINGLE_COLUMN:
        groupedFields['column-1'] = Array.from(fields.values()).sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );
        break;

      case LayoutType.TWO_COLUMN:
        return this.distributeFieldsToColumns(fields, 2, layout.columns || 2);

      case LayoutType.THREE_COLUMN:
        return this.distributeFieldsToColumns(fields, 3, layout.columns || 3);

      case LayoutType.TABS:
        return this.getFieldsByTabs(fields, layout.tabs || []);

      case LayoutType.ACCORDION:
        return this.getFieldsByAccordion(fields, layout.accordions || []);

      case LayoutType.WIZARD:
        return this.getFieldsByWizard(fields, layout.wizardSteps || []);

      case LayoutType.GRID:
        return this.getFieldsByGrid(fields, layout);

      default:
        groupedFields['default'] = Array.from(fields.values()).sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );
    }

    return groupedFields;
  }

  /**
   * Distribute fields to columns
   */
  private distributeFieldsToColumns(
    fields: Map<string, FieldConfig>,
    columnCount: number,
    configuredColumns: number
  ): Record<string, FieldConfig[]> {
    const columns = Math.max(1, Math.min(columnCount, configuredColumns));
    const groupedFields: Record<string, FieldConfig[]> = {};

    // Initialize columns
    for (let i = 0; i < columns; i++) {
      groupedFields[`column-${i + 1}`] = [];
    }

    // Distribute fields round-robin
    const sortedFields = Array.from(fields.values()).sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    sortedFields.forEach((field, index) => {
      const columnIndex = index % columns;
      groupedFields[`column-${columnIndex + 1}`].push(field);
    });

    return groupedFields;
  }

  /**
   * Get fields organized by tabs
   */
  private getFieldsByTabs(
    fields: Map<string, FieldConfig>,
    tabs: TabConfig[]
  ): Record<string, FieldConfig[]> {
    const groupedFields: Record<string, FieldConfig[]> = {};

    for (const tab of tabs) {
      groupedFields[`tab-${tab.id}`] = [];

      for (const fieldId of tab.fieldIds) {
        const field = fields.get(fieldId);
        if (field) {
          groupedFields[`tab-${tab.id}`].push(field);
        }
      }
    }

    // Collect unassigned fields
    const assignedFieldIds = new Set(tabs.flatMap((t) => t.fieldIds));
    const unassignedFields = Array.from(fields.values())
      .filter((f) => !assignedFieldIds.has(f.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (unassignedFields.length > 0) {
      groupedFields['unassigned'] = unassignedFields;
    }

    return groupedFields;
  }

  /**
   * Get fields organized by accordion
   */
  private getFieldsByAccordion(
    fields: Map<string, FieldConfig>,
    accordions: AccordionItemConfig[]
  ): Record<string, FieldConfig[]> {
    const groupedFields: Record<string, FieldConfig[]> = {};

    for (const accordion of accordions) {
      groupedFields[`accordion-${accordion.id}`] = [];

      for (const fieldId of accordion.fieldIds) {
        const field = fields.get(fieldId);
        if (field) {
          groupedFields[`accordion-${accordion.id}`].push(field);
        }
      }
    }

    // Collect unassigned fields
    const assignedFieldIds = new Set(accordions.flatMap((a) => a.fieldIds));
    const unassignedFields = Array.from(fields.values())
      .filter((f) => !assignedFieldIds.has(f.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (unassignedFields.length > 0) {
      groupedFields['unassigned'] = unassignedFields;
    }

    return groupedFields;
  }

  /**
   * Get fields organized by wizard steps
   */
  private getFieldsByWizard(
    fields: Map<string, FieldConfig>,
    steps: WizardStepConfig[]
  ): Record<string, FieldConfig[]> {
    const groupedFields: Record<string, FieldConfig[]> = {};

    for (const step of steps) {
      groupedFields[`step-${step.id}`] = [];

      for (const fieldId of step.fieldIds) {
        const field = fields.get(fieldId);
        if (field) {
          groupedFields[`step-${step.id}`].push(field);
        }
      }
    }

    // Collect unassigned fields
    const assignedFieldIds = new Set(steps.flatMap((s) => s.fieldIds));
    const unassignedFields = Array.from(fields.values())
      .filter((f) => !assignedFieldIds.has(f.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (unassignedFields.length > 0) {
      groupedFields['unassigned'] = unassignedFields;
    }

    return groupedFields;
  }

  /**
   * Get fields organized by grid layout
   */
  private getFieldsByGrid(
    fields: Map<string, FieldConfig>,
    layout: LayoutConfig
  ): Record<string, FieldConfig[]> {
    const columns = layout.gridConfig?.columns || 1;
    const groupedFields: Record<string, FieldConfig[]> = {};

    // Initialize grid columns
    for (let i = 0; i < columns; i++) {
      groupedFields[`grid-${i + 1}`] = [];
    }

    // Distribute fields
    const sortedFields = Array.from(fields.values()).sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    sortedFields.forEach((field, index) => {
      const columnIndex = index % columns;
      groupedFields[`grid-${columnIndex + 1}`].push(field);
    });

    return groupedFields;
  }

  /**
   * Get responsive layout for screen size
   */
  public getResponsiveLayout(layout: LayoutConfig, screenSize: 'mobile' | 'tablet' | 'desktop'): LayoutConfig {
    if (!layout.responsive) {
      return layout;
    }

    const responsiveConfig = layout.responsive[screenSize];
    if (!responsiveConfig) {
      return layout;
    }

    return {
      ...layout,
      type: responsiveConfig.type,
      columns: responsiveConfig.columns,
    };
  }

  /**
   * Calculate CSS grid properties
   */
  public getGridCSS(layout: LayoutConfig): Record<string, string> {
    const columns = layout.columns || layout.gridConfig?.columns || 1;
    const gap = layout.gap || layout.gridConfig?.gap || '1rem';

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      padding: layout.padding || '0',
      alignItems: layout.gridConfig?.alignItems || 'start',
      justifyItems: layout.gridConfig?.justifyItems || 'stretch',
    };
  }

  /**
   * Get field CSS classes for layout
   */
  public getFieldClasses(
    field: FieldConfig,
    layout: LayoutConfig,
    columnIndex?: number
  ): string[] {
    const classes: string[] = ['form-field'];

    // Add field type class
    classes.push(`field-${field.type}`);

    // Add custom classes
    if (field.className) {
      classes.push(field.className);
    }

    // Add required class
    if (field.required) {
      classes.push('required');
    }

    // Add disabled class
    if (field.disabled) {
      classes.push('disabled');
    }

    // Add hidden class
    if (field.hidden) {
      classes.push('hidden');
    }

    return classes;
  }

  /**
   * Validate layout configuration
   */
  public validateLayout(layout: LayoutConfig, fields: Map<string, FieldConfig>): string[] {
    const errors: string[] = [];

    // Validate tab configuration
    if (layout.type === LayoutType.TABS && layout.tabs) {
      for (const tab of layout.tabs) {
        if (!tab.label) {
          errors.push(`Tab ${tab.id} missing label`);
        }
        if (tab.fieldIds.length === 0) {
          errors.push(`Tab ${tab.id} has no fields`);
        }
        for (const fieldId of tab.fieldIds) {
          if (!fields.has(fieldId)) {
            errors.push(`Tab ${tab.id} references unknown field ${fieldId}`);
          }
        }
      }
    }

    // Validate accordion configuration
    if (layout.type === LayoutType.ACCORDION && layout.accordions) {
      for (const accordion of layout.accordions) {
        if (!accordion.title) {
          errors.push(`Accordion ${accordion.id} missing title`);
        }
        if (accordion.fieldIds.length === 0) {
          errors.push(`Accordion ${accordion.id} has no fields`);
        }
        for (const fieldId of accordion.fieldIds) {
          if (!fields.has(fieldId)) {
            errors.push(`Accordion ${accordion.id} references unknown field ${fieldId}`);
          }
        }
      }
    }

    // Validate wizard configuration
    if (layout.type === LayoutType.WIZARD && layout.wizardSteps) {
      for (const step of layout.wizardSteps) {
        if (!step.label) {
          errors.push(`Wizard step ${step.id} missing label`);
        }
        if (step.fieldIds.length === 0) {
          errors.push(`Wizard step ${step.id} has no fields`);
        }
        for (const fieldId of step.fieldIds) {
          if (!fields.has(fieldId)) {
            errors.push(`Wizard step ${step.id} references unknown field ${fieldId}`);
          }
        }
      }
    }

    // Validate grid configuration
    if (layout.type === LayoutType.GRID && layout.gridConfig) {
      if (!layout.gridConfig.columns || layout.gridConfig.columns < 1) {
        errors.push('Grid layout must have at least 1 column');
      }
    }

    return errors;
  }

  /**
   * Get readable layout name
   */
  public getLayoutName(type: LayoutType): string {
    const names: Record<LayoutType, string> = {
      [LayoutType.SINGLE_COLUMN]: 'Single Column',
      [LayoutType.TWO_COLUMN]: 'Two Column',
      [LayoutType.THREE_COLUMN]: 'Three Column',
      [LayoutType.TABS]: 'Tabs',
      [LayoutType.ACCORDION]: 'Accordion',
      [LayoutType.WIZARD]: 'Wizard',
      [LayoutType.GRID]: 'Grid',
    };

    return names[type] || type;
  }
}
