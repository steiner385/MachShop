/**
 * Field Registry
 * Central registry for field type definitions and their configurations
 */

import {
  FieldType,
  FieldConfig,
  FieldOption,
  FileUploadConfig,
} from '../types';

/**
 * Field type metadata and configuration
 */
export interface FieldTypeConfig {
  type: FieldType;
  label: string;
  description: string;
  category: 'input' | 'selection' | 'datetime' | 'media' | 'layout';
  defaultConfig: Partial<FieldConfig>;
  supportsOptions?: boolean;
  supportsFallback?: boolean;
  supportsMultiple?: boolean;
  supportsValidation?: boolean;
  accessibilityFeatures?: string[];
  icon?: string;
}

/**
 * Field registry with metadata for all field types
 */
export class FieldRegistry {
  private static readonly FIELD_CONFIGS: FieldTypeConfig[] = [
    // Text input fields
    {
      type: FieldType.TEXT,
      label: 'Text Input',
      description: 'Single line text input',
      category: 'input',
      defaultConfig: {
        type: FieldType.TEXT,
        placeholder: 'Enter text...',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.EMAIL,
      label: 'Email',
      description: 'Email address input with validation',
      category: 'input',
      defaultConfig: {
        type: FieldType.EMAIL,
        placeholder: 'name@example.com',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.PHONE,
      label: 'Phone',
      description: 'Phone number input',
      category: 'input',
      defaultConfig: {
        type: FieldType.PHONE,
        placeholder: '(123) 456-7890',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.URL,
      label: 'URL',
      description: 'URL input with validation',
      category: 'input',
      defaultConfig: {
        type: FieldType.URL,
        placeholder: 'https://example.com',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.TEXTAREA,
      label: 'Text Area',
      description: 'Multi-line text input',
      category: 'input',
      defaultConfig: {
        type: FieldType.TEXTAREA,
        placeholder: 'Enter longer text...',
        rows: 4,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.RICH_TEXT,
      label: 'Rich Text',
      description: 'Rich text editor with formatting',
      category: 'input',
      defaultConfig: {
        type: FieldType.RICH_TEXT,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },

    // Number fields
    {
      type: FieldType.NUMBER,
      label: 'Number',
      description: 'Numeric input field',
      category: 'input',
      defaultConfig: {
        type: FieldType.NUMBER,
        placeholder: '0',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.SLIDER,
      label: 'Slider',
      description: 'Range slider input',
      category: 'input',
      defaultConfig: {
        type: FieldType.SLIDER,
        minValue: 0,
        maxValue: 100,
        step: 1,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    },
    {
      type: FieldType.RATING,
      label: 'Rating',
      description: 'Star rating input',
      category: 'input',
      defaultConfig: {
        type: FieldType.RATING,
        maxValue: 5,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-valuenow'],
    },

    // Date/Time fields
    {
      type: FieldType.DATE,
      label: 'Date',
      description: 'Date picker input',
      category: 'datetime',
      defaultConfig: {
        type: FieldType.DATE,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.TIME,
      label: 'Time',
      description: 'Time picker input',
      category: 'datetime',
      defaultConfig: {
        type: FieldType.TIME,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.DATETIME,
      label: 'Date & Time',
      description: 'Date and time picker',
      category: 'datetime',
      defaultConfig: {
        type: FieldType.DATETIME,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },

    // Selection fields
    {
      type: FieldType.SELECT,
      label: 'Select',
      description: 'Dropdown select field',
      category: 'selection',
      defaultConfig: {
        type: FieldType.SELECT,
        placeholder: 'Select an option...',
        options: [],
      },
      supportsOptions: true,
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.MULTI_SELECT,
      label: 'Multi-Select',
      description: 'Multi-select dropdown',
      category: 'selection',
      defaultConfig: {
        type: FieldType.MULTI_SELECT,
        placeholder: 'Select options...',
        options: [],
      },
      supportsOptions: true,
      supportsMultiple: true,
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.RADIO,
      label: 'Radio',
      description: 'Radio button group',
      category: 'selection',
      defaultConfig: {
        type: FieldType.RADIO,
        options: [],
      },
      supportsOptions: true,
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby', 'role=radiogroup'],
    },
    {
      type: FieldType.CHECKBOX,
      label: 'Checkbox',
      description: 'Checkbox field(s)',
      category: 'selection',
      defaultConfig: {
        type: FieldType.CHECKBOX,
        options: [],
      },
      supportsOptions: true,
      supportsMultiple: true,
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.TOGGLE,
      label: 'Toggle',
      description: 'Toggle switch field',
      category: 'selection',
      defaultConfig: {
        type: FieldType.TOGGLE,
        defaultValue: false,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-checked'],
    },

    // Autocomplete
    {
      type: FieldType.AUTOCOMPLETE,
      label: 'Autocomplete',
      description: 'Autocomplete input field',
      category: 'selection',
      defaultConfig: {
        type: FieldType.AUTOCOMPLETE,
        placeholder: 'Type to search...',
        autoCompleteSource: 'dynamic',
      },
      supportsOptions: true,
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby', 'aria-autocomplete=list'],
    },

    // Media fields
    {
      type: FieldType.FILE_UPLOAD,
      label: 'File Upload',
      description: 'File upload field',
      category: 'media',
      defaultConfig: {
        type: FieldType.FILE_UPLOAD,
        fileUploadConfig: {
          maxSize: 10485760, // 10MB
          acceptedTypes: [],
        },
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.IMAGE,
      label: 'Image Upload',
      description: 'Image upload field',
      category: 'media',
      defaultConfig: {
        type: FieldType.IMAGE,
        fileUploadConfig: {
          acceptedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          maxSize: 5242880, // 5MB
        },
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },
    {
      type: FieldType.SIGNATURE,
      label: 'Signature',
      description: 'Digital signature field',
      category: 'media',
      defaultConfig: {
        type: FieldType.SIGNATURE,
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },

    // Color picker
    {
      type: FieldType.COLOR_PICKER,
      label: 'Color Picker',
      description: 'Color selection field',
      category: 'input',
      defaultConfig: {
        type: FieldType.COLOR_PICKER,
        defaultValue: '#000000',
      },
      supportsValidation: true,
      accessibilityFeatures: ['aria-label', 'aria-describedby'],
    },

    // Layout fields
    {
      type: FieldType.SECTION,
      label: 'Section',
      description: 'Section heading/divider',
      category: 'layout',
      defaultConfig: {
        type: FieldType.SECTION,
      },
    },
    {
      type: FieldType.HEADING,
      label: 'Heading',
      description: 'Text heading',
      category: 'layout',
      defaultConfig: {
        type: FieldType.HEADING,
      },
    },
    {
      type: FieldType.DIVIDER,
      label: 'Divider',
      description: 'Visual divider',
      category: 'layout',
      defaultConfig: {
        type: FieldType.DIVIDER,
      },
    },
  ];

  /**
   * Get all field type configurations
   */
  static getAll(): FieldTypeConfig[] {
    return [...FieldRegistry.FIELD_CONFIGS];
  }

  /**
   * Get field configuration by type
   */
  static getByType(type: FieldType): FieldTypeConfig | undefined {
    return FieldRegistry.FIELD_CONFIGS.find((config) => config.type === type);
  }

  /**
   * Get fields by category
   */
  static getByCategory(category: string): FieldTypeConfig[] {
    return FieldRegistry.FIELD_CONFIGS.filter((config) => config.category === category);
  }

  /**
   * Get all field categories
   */
  static getCategories(): string[] {
    const categories = new Set(FieldRegistry.FIELD_CONFIGS.map((config) => config.category));
    return Array.from(categories);
  }

  /**
   * Check if field type supports options
   */
  static supportsOptions(type: FieldType): boolean {
    const config = FieldRegistry.getByType(type);
    return config?.supportsOptions ?? false;
  }

  /**
   * Check if field type supports multiple values
   */
  static supportsMultiple(type: FieldType): boolean {
    const config = FieldRegistry.getByType(type);
    return config?.supportsMultiple ?? false;
  }

  /**
   * Check if field type supports validation
   */
  static supportsValidation(type: FieldType): boolean {
    const config = FieldRegistry.getByType(type);
    return config?.supportsValidation ?? false;
  }

  /**
   * Get default configuration for field type
   */
  static getDefaultConfig(type: FieldType, overrides?: Partial<FieldConfig>): FieldConfig {
    const config = FieldRegistry.getByType(type);
    if (!config) {
      throw new Error(`Unknown field type: ${type}`);
    }

    return {
      id: '',
      type,
      name: '',
      ...config.defaultConfig,
      ...overrides,
    } as FieldConfig;
  }
}
