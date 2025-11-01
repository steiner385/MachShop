/**
 * Template Registry for Data Migration Import System (Issue #31)
 * Defines metadata for all entity templates including field definitions, validation rules, and example data
 */

export type EntityType = keyof typeof TEMPLATE_REGISTRY;

export interface FieldDefinition {
  name: string;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'uuid';
  required: boolean;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  enumValues?: string[];
  defaultValue?: any;
  example: any;
}

export interface RelationshipDefinition {
  field: string;
  relatedEntity: string;
  description: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one';
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'unique' | 'pattern' | 'range' | 'enum' | 'foreignKey';
  message: string;
  value?: any;
}

export interface TemplateMetadata {
  entityType: string;
  entityName: string;
  displayName: string;
  description: string;
  category: 'master_data' | 'transactional' | 'historical';
  fields: FieldDefinition[];
  relationships: RelationshipDefinition[];
  validationRules: ValidationRule[];
  exampleData: Record<string, any>[];
}

/**
 * TIER 1: Master Data (High Priority)
 * Core reference data needed for system operation
 */

const SITE_TEMPLATE: TemplateMetadata = {
  entityType: 'SITE',
  entityName: 'Site',
  displayName: 'Manufacturing Sites',
  description: 'Physical manufacturing locations with their configuration',
  category: 'master_data',
  fields: [
    {
      name: 'siteCode',
      displayName: 'Site Code',
      description: 'Unique identifier for the site (e.g., "SITE001")',
      dataType: 'string',
      required: true,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      example: 'SITE001',
    },
    {
      name: 'siteName',
      displayName: 'Site Name',
      description: 'Display name of the manufacturing site',
      dataType: 'string',
      required: true,
      maxLength: 200,
      example: 'Aerospace Manufacturing Plant #1',
    },
    {
      name: 'location',
      displayName: 'Location',
      description: 'Geographic location (city, state, country)',
      dataType: 'string',
      required: false,
      maxLength: 200,
      example: 'Phoenix, AZ, USA',
    },
    {
      name: 'enterpriseId',
      displayName: 'Enterprise ID',
      description: 'Parent enterprise identifier (if applicable)',
      dataType: 'uuid',
      required: false,
      example: 'ent-12345',
    },
    {
      name: 'isActive',
      displayName: 'Is Active',
      description: 'Whether the site is active (true/false)',
      dataType: 'boolean',
      required: false,
      defaultValue: true,
      example: true,
    },
  ],
  relationships: [
    {
      field: 'enterpriseId',
      relatedEntity: 'Enterprise',
      description: 'Parent enterprise (optional)',
      cardinality: 'many-to-one',
    },
  ],
  validationRules: [
    {
      field: 'siteCode',
      type: 'unique',
      message: 'Site code must be unique',
    },
    {
      field: 'siteName',
      type: 'required',
      message: 'Site name is required',
    },
  ],
  exampleData: [
    {
      siteCode: 'SITE001',
      siteName: 'Phoenix Aerospace',
      location: 'Phoenix, AZ',
      enterpriseId: 'ent-001',
      isActive: true,
    },
    {
      siteCode: 'SITE002',
      siteName: 'Denver Manufacturing',
      location: 'Denver, CO',
      enterpriseId: 'ent-001',
      isActive: true,
    },
    {
      siteCode: 'SITE003',
      siteName: 'Seattle Engineering',
      location: 'Seattle, WA',
      enterpriseId: 'ent-002',
      isActive: true,
    },
  ],
};

const PART_TEMPLATE: TemplateMetadata = {
  entityType: 'PART',
  entityName: 'Part',
  displayName: 'Material Master (Parts)',
  description: 'Parts, materials, and components used in manufacturing',
  category: 'master_data',
  fields: [
    {
      name: 'partNumber',
      displayName: 'Part Number',
      description: 'Unique identifier for the part',
      dataType: 'string',
      required: true,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      example: 'PART-001',
    },
    {
      name: 'partName',
      displayName: 'Part Name',
      description: 'Display name of the part',
      dataType: 'string',
      required: true,
      maxLength: 200,
      example: 'Aerospace Fastener Assembly',
    },
    {
      name: 'description',
      displayName: 'Description',
      description: 'Detailed description of the part',
      dataType: 'string',
      required: false,
      maxLength: 1000,
      example: 'High-strength titanium fastener assembly for engine mounting',
    },
    {
      name: 'partType',
      displayName: 'Part Type',
      description: 'Classification of the part',
      dataType: 'enum',
      required: true,
      enumValues: [
        'RAW_MATERIAL',
        'PURCHASED_PART',
        'FABRICATED',
        'ASSEMBLY',
        'FINISHED_GOOD',
      ],
      example: 'PURCHASED_PART',
    },
    {
      name: 'unitOfMeasure',
      displayName: 'Unit of Measure',
      description: 'Standard unit for measuring this part',
      dataType: 'enum',
      required: true,
      enumValues: ['EACH', 'LB', 'KG', 'FT', 'M', 'GALLON', 'LITER'],
      example: 'EACH',
    },
    {
      name: 'makeOrBuy',
      displayName: 'Make or Buy',
      description: 'Whether part is made in-house or purchased',
      dataType: 'enum',
      required: false,
      enumValues: ['MAKE', 'BUY'],
      example: 'BUY',
    },
    {
      name: 'isActive',
      displayName: 'Is Active',
      description: 'Whether the part is active in the system',
      dataType: 'boolean',
      required: false,
      defaultValue: true,
      example: true,
    },
  ],
  relationships: [],
  validationRules: [
    {
      field: 'partNumber',
      type: 'unique',
      message: 'Part number must be unique',
    },
    {
      field: 'partName',
      type: 'required',
      message: 'Part name is required',
    },
  ],
  exampleData: [
    {
      partNumber: 'PART-001',
      partName: 'Fastener Assembly A1',
      description: 'High-strength fastener for engine assembly',
      partType: 'PURCHASED_PART',
      unitOfMeasure: 'EACH',
      makeOrBuy: 'BUY',
      isActive: true,
    },
    {
      partNumber: 'PART-002',
      partName: 'Titanium Bar Stock',
      description: 'Titanium grade 5 bar stock for fabrication',
      partType: 'RAW_MATERIAL',
      unitOfMeasure: 'LB',
      makeOrBuy: 'BUY',
      isActive: true,
    },
    {
      partNumber: 'PART-003',
      partName: 'Assembled Valve Module',
      description: 'Complete valve assembly with seals',
      partType: 'ASSEMBLY',
      unitOfMeasure: 'EACH',
      makeOrBuy: 'MAKE',
      isActive: true,
    },
  ],
};

const PERSONNEL_TEMPLATE: TemplateMetadata = {
  entityType: 'PERSONNEL',
  entityName: 'Personnel',
  displayName: 'Personnel/Employees',
  description: 'Employee and personnel information',
  category: 'master_data',
  fields: [
    {
      name: 'badgeNumber',
      displayName: 'Badge Number',
      description: 'Employee badge or ID number',
      dataType: 'string',
      required: true,
      maxLength: 20,
      example: 'EMP001',
    },
    {
      name: 'firstName',
      displayName: 'First Name',
      description: 'Employee first name',
      dataType: 'string',
      required: true,
      maxLength: 100,
      example: 'John',
    },
    {
      name: 'lastName',
      displayName: 'Last Name',
      description: 'Employee last name',
      dataType: 'string',
      required: true,
      maxLength: 100,
      example: 'Smith',
    },
    {
      name: 'email',
      displayName: 'Email Address',
      description: 'Corporate email address',
      dataType: 'string',
      required: false,
      maxLength: 200,
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      example: 'john.smith@company.com',
    },
    {
      name: 'employeeStatus',
      displayName: 'Employee Status',
      description: 'Employment status',
      dataType: 'enum',
      required: false,
      enumValues: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED'],
      example: 'ACTIVE',
    },
    {
      name: 'department',
      displayName: 'Department',
      description: 'Department name or code',
      dataType: 'string',
      required: false,
      maxLength: 100,
      example: 'Manufacturing Engineering',
    },
    {
      name: 'isActive',
      displayName: 'Is Active',
      description: 'Whether the personnel record is active',
      dataType: 'boolean',
      required: false,
      defaultValue: true,
      example: true,
    },
  ],
  relationships: [],
  validationRules: [
    {
      field: 'badgeNumber',
      type: 'unique',
      message: 'Badge number must be unique',
    },
    {
      field: 'firstName',
      type: 'required',
      message: 'First name is required',
    },
  ],
  exampleData: [
    {
      badgeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@company.com',
      employeeStatus: 'ACTIVE',
      department: 'Manufacturing Engineering',
      isActive: true,
    },
    {
      badgeNumber: 'EMP002',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@company.com',
      employeeStatus: 'ACTIVE',
      department: 'Quality Assurance',
      isActive: true,
    },
    {
      badgeNumber: 'EMP003',
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@company.com',
      employeeStatus: 'ACTIVE',
      department: 'Production',
      isActive: true,
    },
  ],
};

const EQUIPMENT_TEMPLATE: TemplateMetadata = {
  entityType: 'EQUIPMENT',
  entityName: 'Equipment',
  displayName: 'Manufacturing Equipment',
  description: 'Machines, tools, and equipment used in manufacturing',
  category: 'master_data',
  fields: [
    {
      name: 'equipmentCode',
      displayName: 'Equipment Code',
      description: 'Unique identifier for the equipment',
      dataType: 'string',
      required: true,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      example: 'EQUIP-001',
    },
    {
      name: 'equipmentName',
      displayName: 'Equipment Name',
      description: 'Display name of the equipment',
      dataType: 'string',
      required: true,
      maxLength: 200,
      example: 'CNC Milling Machine A1',
    },
    {
      name: 'equipmentType',
      displayName: 'Equipment Type',
      description: 'Type/classification of equipment',
      dataType: 'enum',
      required: true,
      enumValues: [
        'CNC_MACHINE',
        'MANUAL_MACHINE',
        'ASSEMBLY_STATION',
        'INSPECTION_STATION',
        'TOOL',
        'MEASUREMENT_DEVICE',
      ],
      example: 'CNC_MACHINE',
    },
    {
      name: 'manufacturer',
      displayName: 'Manufacturer',
      description: 'Equipment manufacturer name',
      dataType: 'string',
      required: false,
      maxLength: 200,
      example: 'Haas Automation',
    },
    {
      name: 'serialNumber',
      displayName: 'Serial Number',
      description: 'Equipment serial number',
      dataType: 'string',
      required: false,
      maxLength: 100,
      example: 'SN-123456789',
    },
    {
      name: 'yearManufactured',
      displayName: 'Year Manufactured',
      description: 'Year equipment was manufactured',
      dataType: 'number',
      required: false,
      minValue: 1950,
      maxValue: 2100,
      example: 2020,
    },
    {
      name: 'isActive',
      displayName: 'Is Active',
      description: 'Whether the equipment is active',
      dataType: 'boolean',
      required: false,
      defaultValue: true,
      example: true,
    },
  ],
  relationships: [],
  validationRules: [
    {
      field: 'equipmentCode',
      type: 'unique',
      message: 'Equipment code must be unique',
    },
  ],
  exampleData: [
    {
      equipmentCode: 'EQUIP-001',
      equipmentName: 'CNC Milling Machine A1',
      equipmentType: 'CNC_MACHINE',
      manufacturer: 'Haas Automation',
      serialNumber: 'SN-001234567',
      yearManufactured: 2020,
      isActive: true,
    },
    {
      equipmentCode: 'EQUIP-002',
      equipmentName: 'Manual Lathe B2',
      equipmentType: 'MANUAL_MACHINE',
      manufacturer: 'Colchester',
      serialNumber: 'SN-987654321',
      yearManufactured: 2015,
      isActive: true,
    },
    {
      equipmentCode: 'INSP-001',
      equipmentName: 'CMM Inspection Station',
      equipmentType: 'MEASUREMENT_DEVICE',
      manufacturer: 'Zeiss',
      serialNumber: 'SN-CMM-12345',
      yearManufactured: 2021,
      isActive: true,
    },
  ],
};

const ROUTING_TEMPLATE: TemplateMetadata = {
  entityType: 'ROUTING',
  entityName: 'Routing',
  displayName: 'Routings',
  description: 'Manufacturing routings that define the sequence of operations',
  category: 'master_data',
  fields: [
    {
      name: 'routingNumber',
      displayName: 'Routing Number',
      description: 'Unique identifier for the routing',
      dataType: 'string',
      required: true,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      example: 'ROUT-001',
    },
    {
      name: 'routingName',
      displayName: 'Routing Name',
      description: 'Display name of the routing',
      dataType: 'string',
      required: true,
      maxLength: 200,
      example: 'CNC Machining Process',
    },
    {
      name: 'description',
      displayName: 'Description',
      description: 'Description of the routing and its purpose',
      dataType: 'string',
      required: false,
      maxLength: 1000,
      example: 'Standard 3-axis CNC machining sequence for aluminum parts',
    },
    {
      name: 'routingStatus',
      displayName: 'Routing Status',
      description: 'Status of the routing',
      dataType: 'enum',
      required: false,
      enumValues: ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'],
      example: 'ACTIVE',
    },
    {
      name: 'version',
      displayName: 'Version',
      description: 'Version number of the routing',
      dataType: 'number',
      required: false,
      minValue: 1,
      defaultValue: 1,
      example: 1,
    },
    {
      name: 'isActive',
      displayName: 'Is Active',
      description: 'Whether the routing is active',
      dataType: 'boolean',
      required: false,
      defaultValue: true,
      example: true,
    },
  ],
  relationships: [],
  validationRules: [
    {
      field: 'routingNumber',
      type: 'unique',
      message: 'Routing number must be unique',
    },
  ],
  exampleData: [
    {
      routingNumber: 'ROUT-001',
      routingName: '3-Axis CNC Machining',
      description: 'Standard 3-axis CNC process for aluminum parts',
      routingStatus: 'ACTIVE',
      version: 1,
      isActive: true,
    },
    {
      routingNumber: 'ROUT-002',
      routingName: '5-Axis CNC Precision',
      description: 'High-precision 5-axis milling for aerospace components',
      routingStatus: 'ACTIVE',
      version: 2,
      isActive: true,
    },
    {
      routingNumber: 'ROUT-003',
      routingName: 'Assembly Process',
      description: 'Manual assembly with torque verification',
      routingStatus: 'ACTIVE',
      version: 1,
      isActive: true,
    },
  ],
};

// Additional Tier 1 templates will be added here...
// AREA, WORKCENTER, WORKUNIT, PRODUCT, BOMITEM, TOOL, QUALITYPLAN, etc.

/**
 * Central registry of all entity templates
 * Maps entity type codes to their metadata
 */
export const TEMPLATE_REGISTRY = {
  SITE: SITE_TEMPLATE,
  PART: PART_TEMPLATE,
  PERSONNEL: PERSONNEL_TEMPLATE,
  EQUIPMENT: EQUIPMENT_TEMPLATE,
  ROUTING: ROUTING_TEMPLATE,
  // Additional entities will be added in expansion phases
} as const;

/**
 * Get all available templates grouped by category
 */
export function getTemplatesByCategory(category: 'master_data' | 'transactional' | 'historical') {
  return Object.entries(TEMPLATE_REGISTRY)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([entityType, metadata]) => ({
      entityType: entityType as EntityType,
      ...metadata,
    }));
}

/**
 * Get all Tier 1 master data templates
 */
export function getTier1Templates() {
  return getTemplatesByCategory('master_data');
}

/**
 * List all available entity types
 */
export function getAvailableEntityTypes(): EntityType[] {
  return Object.keys(TEMPLATE_REGISTRY) as EntityType[];
}

/**
 * Get template metadata for a specific entity type
 */
export function getTemplateMetadata(entityType: EntityType): TemplateMetadata | null {
  return TEMPLATE_REGISTRY[entityType] || null;
}
