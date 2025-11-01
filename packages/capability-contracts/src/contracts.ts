/**
 * Core capability contract definitions
 * These define what capabilities are available in the MachShop extension framework
 */

import {
  CapabilityContract,
  StabilityLevel,
  MethodDefinition,
  ParameterDefinition,
  TypeDefinition,
} from './types';

// ============================================
// Helper functions for contract definitions
// ============================================

const typeString = (
  type: string,
  nullable = false
): TypeDefinition => ({
  type,
  nullable,
});

const param = (
  name: string,
  type: string,
  required = true,
  description = ''
): ParameterDefinition => ({
  name,
  type,
  required,
  description,
});

const method = (
  name: string,
  description: string,
  parameters: ParameterDefinition[] = [],
  returns: TypeDefinition = typeString('void'),
  required = true,
  throws: any[] = []
): MethodDefinition => ({
  name,
  description,
  parameters,
  returns,
  required,
  throws,
});

// ============================================
// ERP INTEGRATION CAPABILITY
// ============================================

export const ERP_INTEGRATION_CONTRACT: CapabilityContract = {
  id: 'erp-integration',
  name: 'ERP Integration',
  description:
    'Provides connectivity to external ERP systems (SAP, Oracle, Plex, etc.) for order, material, and inventory data synchronization',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['sap-ebs-adapter', 'oracle-ebs-adapter', 'plex-integration'],
  defaultProvider: 'sap-ebs-adapter',

  interface: {
    methods: [
      method(
        'getSKU',
        'Retrieve SKU information from ERP system',
        [param('skuId', 'string', true, 'SKU identifier')],
        typeString('SKUData', false),
        true
      ),
      method(
        'createPurchaseOrder',
        'Create a new purchase order in ERP',
        [param('poData', 'PurchaseOrderInput', true, 'Purchase order details')],
        typeString('PurchaseOrder', false),
        true
      ),
      method(
        'updateInventory',
        'Update inventory quantities in ERP',
        [
          param('inventory', 'InventoryUpdate[]', true, 'Inventory updates'),
          param('warehouse', 'string', false, 'Warehouse location'),
        ],
        typeString('InventoryUpdateResult', false),
        true
      ),
      method(
        'getOrderStatus',
        'Get status of order from ERP',
        [param('orderId', 'string', true, 'Order identifier')],
        typeString('OrderStatus', false),
        true
      ),
      method(
        'listMaterials',
        'List materials with availability',
        [param('filters', 'MaterialFilter', false, 'Filter criteria')],
        typeString('Material[]', false),
        false
      ),
    ],
    events: [
      {
        name: 'erpConnectionStatusChanged',
        description: 'ERP connection status changed (connected/disconnected)',
        payload: typeString('{ connected: boolean; error?: string }'),
      },
      {
        name: 'inventoryUpdated',
        description: 'Inventory was updated in ERP',
        payload: typeString('{ timestamp: Date; changes: InventoryChange[] }'),
      },
    ],
  },

  requiredMethods: ['getSKU', 'createPurchaseOrder', 'updateInventory', 'getOrderStatus'],
  optionalMethods: ['listMaterials'],

  policies: [
    {
      id: 'sap-specific',
      name: 'SAP-Specific Integration',
      description: 'Uses SAP-specific API features and data structures',
    },
    {
      id: 'generic-erp',
      name: 'Generic ERP',
      description: 'Uses standard ERP interfaces, compatible with multiple systems',
    },
  ],

  configurationSchema: {
    type: 'object',
    properties: {
      erpSystem: {
        type: 'string',
        enum: ['SAP', 'Oracle', 'Plex', 'Other'],
      },
      apiEndpoint: {
        type: 'string',
      },
      authMethod: {
        type: 'string',
        enum: ['oauth2', 'basic', 'certificate'],
      },
      syncInterval: {
        type: 'number',
        description: 'Sync interval in minutes',
      },
    },
    required: ['erpSystem', 'apiEndpoint', 'authMethod'],
  },

  compliance: {
    regulations: ['SOX', 'FDA 21 CFR Part 11'],
    signoffRequired: true,
    signoffRole: 'quality-manager',
  },

  foundationTier: 'core-foundation',

  examples: [
    {
      name: 'SAP EBS Adapter',
      description: 'Production integration with SAP EBS',
      extensionId: 'sap-ebs-adapter',
    },
  ],

  incompatibilities: [
    {
      capability: 'erp-integration',
      policy: 'sap-specific',
      reason: 'Cannot use multiple ERP system integrations simultaneously',
      scope: 'global',
    },
  ],
};

// ============================================
// WORK INSTRUCTION AUTHORING CAPABILITY
// ============================================

export const WORK_INSTRUCTION_AUTHORING_CONTRACT: CapabilityContract = {
  id: 'work-instruction-authoring',
  name: 'Work Instruction Authoring',
  description:
    'Provides work instruction creation, modification, and management capabilities. Multiple policies may implement this (MES-based, PLM-based, or external authoring).',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['work-instruction-from-mes', 'work-instruction-from-plm', 'plex-doc-sync'],
  defaultProvider: 'work-instruction-from-mes',

  interface: {
    methods: [
      method(
        'createWorkInstruction',
        'Create a new work instruction',
        [param('instruction', 'WorkInstructionInput', true)],
        typeString('WorkInstruction', false),
        true
      ),
      method(
        'updateWorkInstruction',
        'Update existing work instruction',
        [
          param('id', 'string', true),
          param('updates', 'WorkInstructionUpdate', true),
        ],
        typeString('WorkInstruction', false),
        true
      ),
      method(
        'approveWorkInstruction',
        'Approve work instruction for use',
        [
          param('id', 'string', true),
          param('approvalData', 'ApprovalInput', true),
        ],
        typeString('WorkInstruction', false),
        true
      ),
      method(
        'getWorkInstruction',
        'Retrieve work instruction details',
        [param('id', 'string', true)],
        typeString('WorkInstruction', false),
        true
      ),
      method(
        'listWorkInstructions',
        'List work instructions with filtering',
        [param('filters', 'WorkInstructionFilter', false)],
        typeString('WorkInstruction[]', false),
        false
      ),
    ],
  },

  requiredMethods: [
    'createWorkInstruction',
    'updateWorkInstruction',
    'approveWorkInstruction',
    'getWorkInstruction',
  ],
  optionalMethods: ['listWorkInstructions'],

  policies: [
    {
      id: 'mes-authoring',
      name: 'MES-Based Authoring',
      description: 'Work instructions authored and managed in MES system',
      providers: ['work-instruction-from-mes'],
    },
    {
      id: 'plm-authoring',
      name: 'PLM-Based Authoring',
      description: 'Work instructions sourced from PLM system',
      providers: ['work-instruction-from-plm'],
    },
    {
      id: 'external-authoring',
      name: 'External System Authoring',
      description: 'Work instructions sourced from external system',
    },
  ],

  compliance: {
    regulations: ['FDA 21 CFR Part 11', 'ISO 9001', 'AS9100'],
    signoffRequired: true,
    signoffRole: 'quality-focal',
  },

  foundationTier: 'core-foundation',

  incompatibilities: [
    {
      capability: 'work-instruction-authoring',
      policy: 'mes-authoring',
      reason:
        'Cannot use both MES and PLM work instruction authoring for same resource',
      scope: 'capability',
    },
    {
      capability: 'work-instruction-authoring',
      policy: 'plm-authoring',
      reason:
        'Cannot use both MES and PLM work instruction authoring for same resource',
      scope: 'capability',
    },
  ],
};

// ============================================
// QUALITY COMPLIANCE CAPABILITY
// ============================================

export const QUALITY_COMPLIANCE_CONTRACT: CapabilityContract = {
  id: 'quality-compliance',
  name: 'Quality Compliance',
  description:
    'Provides quality control features, compliance reporting, and regulatory documentation (FDA, ISO, AS9100, IATF)',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: [
    'aerospace-compliance',
    'automotive-compliance',
    'medical-device-compliance',
    'iso-9001-module',
  ],

  interface: {
    methods: [
      method(
        'createComplianceRecord',
        'Create quality/compliance record',
        [param('record', 'ComplianceRecordInput', true)],
        typeString('ComplianceRecord', false),
        true
      ),
      method(
        'validateAgainstRegulation',
        'Validate data against regulatory requirement',
        [
          param('data', 'any', true),
          param('regulation', 'string', true),
        ],
        typeString('ValidationResult', false),
        true
      ),
      method(
        'generateComplianceReport',
        'Generate regulatory compliance report',
        [param('params', 'ReportParams', true)],
        typeString('Report', false),
        false
      ),
    ],
  },

  requiredMethods: ['createComplianceRecord', 'validateAgainstRegulation'],
  optionalMethods: ['generateComplianceReport'],

  policies: [
    {
      id: 'aerospace',
      name: 'AS9100 Aerospace',
      description: 'Aerospace industry compliance (AS9100D)',
    },
    {
      id: 'automotive',
      name: 'IATF Automotive',
      description: 'Automotive industry compliance (IATF 16949)',
    },
    {
      id: 'medical-device',
      name: 'Medical Device',
      description: 'Medical device compliance (FDA 21 CFR Part 11, ISO 13485)',
    },
  ],

  compliance: {
    regulations: ['FDA 21 CFR Part 11', 'ISO 9001', 'ISO 13485', 'AS9100D', 'IATF 16949'],
    signoffRequired: true,
    signoffRole: 'compliance-officer',
  },

  foundationTier: 'core-foundation',
};

// ============================================
// EQUIPMENT INTEGRATION CAPABILITY
// ============================================

export const EQUIPMENT_INTEGRATION_CONTRACT: CapabilityContract = {
  id: 'equipment-integration',
  name: 'Equipment Integration',
  description:
    'Provides integration with manufacturing equipment for real-time data collection, monitoring, and control',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['mqtt-equipment-adapter', 'opc-ua-adapter', 'rest-equipment-adapter'],

  interface: {
    methods: [
      method(
        'getEquipmentStatus',
        'Get current equipment status',
        [param('equipmentId', 'string', true)],
        typeString('EquipmentStatus', false),
        true
      ),
      method(
        'collectMetrics',
        'Collect equipment metrics/telemetry',
        [
          param('equipmentId', 'string', true),
          param('metricNames', 'string[]', false),
        ],
        typeString('EquipmentMetrics', false),
        true
      ),
      method(
        'sendCommand',
        'Send control command to equipment',
        [
          param('equipmentId', 'string', true),
          param('command', 'EquipmentCommand', true),
        ],
        typeString('CommandResult', false),
        false
      ),
    ],
  },

  requiredMethods: ['getEquipmentStatus', 'collectMetrics'],
  optionalMethods: ['sendCommand'],

  policies: [
    {
      id: 'mqtt',
      name: 'MQTT Protocol',
      description: 'Equipment communication via MQTT',
    },
    {
      id: 'opc-ua',
      name: 'OPC-UA Protocol',
      description: 'Equipment communication via OPC-UA',
    },
  ],

  foundationTier: 'foundation',
};

// ============================================
// ELECTRONIC SIGNATURE CAPABILITY
// ============================================

export const ELECTRONIC_SIGNATURE_CONTRACT: CapabilityContract = {
  id: 'electronic-signature',
  name: 'Electronic Signature',
  description:
    'Provides electronic signature functionality for compliance with FDA 21 CFR Part 11 and equivalent regulations',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['digital-signature-provider', 'biometric-signature-provider'],

  interface: {
    methods: [
      method(
        'signDocument',
        'Sign document with electronic signature',
        [
          param('documentId', 'string', true),
          param('userId', 'string', true),
          param('intent', 'string', false),
        ],
        typeString('SignatureResult', false),
        true
      ),
      method(
        'verifySignature',
        'Verify electronic signature on document',
        [param('documentId', 'string', true)],
        typeString('SignatureVerification', false),
        true
      ),
      method(
        'getSignatureAuditTrail',
        'Get audit trail of all signatures on document',
        [param('documentId', 'string', true)],
        typeString('SignatureAuditEntry[]', false),
        true
      ),
    ],
  },

  requiredMethods: ['signDocument', 'verifySignature', 'getSignatureAuditTrail'],

  compliance: {
    regulations: ['FDA 21 CFR Part 11', 'eIDAS Regulation', 'UETA'],
    signoffRequired: true,
    signoffRole: 'compliance-officer',
  },

  foundationTier: 'core-foundation',
};

// ============================================
// AUDIT TRAIL CAPABILITY
// ============================================

export const AUDIT_TRAIL_CONTRACT: CapabilityContract = {
  id: 'audit-trail',
  name: 'Audit Trail & Logging',
  description:
    'Provides comprehensive audit logging and compliance-grade audit trail generation',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['elasticsearch-audit', 'database-audit-logger'],

  interface: {
    methods: [
      method(
        'recordAction',
        'Record an action to audit trail',
        [param('action', 'AuditAction', true)],
        typeString('AuditEntry', false),
        true
      ),
      method(
        'queryAuditTrail',
        'Query audit trail with filters',
        [param('query', 'AuditQuery', true)],
        typeString('AuditEntry[]', false),
        true
      ),
      method(
        'generateAuditReport',
        'Generate compliance audit report',
        [param('params', 'ReportParams', true)],
        typeString('Report', false),
        false
      ),
    ],
  },

  requiredMethods: ['recordAction', 'queryAuditTrail'],
  optionalMethods: ['generateAuditReport'],

  compliance: {
    regulations: ['FDA 21 CFR Part 11', 'GDPR', 'HIPAA'],
    signoffRequired: true,
    signoffRole: 'quality-manager',
  },

  foundationTier: 'core-foundation',
};

// ============================================
// CUSTOM FIELD STORAGE CAPABILITY
// ============================================

export const CUSTOM_FIELD_STORAGE_CONTRACT: CapabilityContract = {
  id: 'custom-field-storage',
  name: 'Custom Field Storage',
  description:
    'Provides mechanism for extensions to store custom fields on standard entities',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['json-custom-fields', 'relational-custom-fields'],

  interface: {
    methods: [
      method(
        'defineCustomField',
        'Define a custom field on an entity',
        [param('definition', 'CustomFieldDefinition', true)],
        typeString('CustomFieldDefinition', false),
        true
      ),
      method(
        'setCustomFieldValue',
        'Set value of custom field on entity instance',
        [
          param('entityId', 'string', true),
          param('fieldName', 'string', true),
          param('value', 'any', true),
        ],
        typeString('void'),
        true
      ),
      method(
        'getCustomFieldValue',
        'Get value of custom field',
        [
          param('entityId', 'string', true),
          param('fieldName', 'string', true),
        ],
        typeString('any', true),
        true
      ),
    ],
  },

  requiredMethods: ['defineCustomField', 'setCustomFieldValue', 'getCustomFieldValue'],

  foundationTier: 'foundation',
};

// ============================================
// AUTHENTICATION PROVIDER CAPABILITY
// ============================================

export const AUTHENTICATION_PROVIDER_CONTRACT: CapabilityContract = {
  id: 'authentication-provider',
  name: 'Authentication Provider',
  description:
    'Provides custom authentication mechanisms (SAML, OIDC, directory integration, etc.)',
  version: 'v1.0',
  minMesVersion: '1.0.0',
  apiVersion: 'v2.0',
  stability: StabilityLevel.STABLE,
  introducedIn: 'v1.0',
  knownProviders: ['azure-ad-provider', 'okta-provider', 'saml-provider', 'ldap-provider'],

  interface: {
    methods: [
      method(
        'authenticate',
        'Authenticate user credentials',
        [param('credentials', 'AuthCredentials', true)],
        typeString('AuthToken', false),
        true
      ),
      method(
        'validateToken',
        'Validate authentication token',
        [param('token', 'string', true)],
        typeString('TokenValidation', false),
        true
      ),
      method(
        'getUserInfo',
        'Get user information',
        [param('userId', 'string', true)],
        typeString('UserInfo', false),
        true
      ),
    ],
  },

  requiredMethods: ['authenticate', 'validateToken', 'getUserInfo'],

  policies: [
    {
      id: 'saml',
      name: 'SAML Authentication',
      description: 'SAML-based SSO',
    },
    {
      id: 'oidc',
      name: 'OpenID Connect',
      description: 'OIDC-based authentication',
    },
    {
      id: 'directory',
      name: 'Directory Integration',
      description: 'LDAP/Active Directory integration',
    },
  ],

  foundationTier: 'core-foundation',

  compliance: {
    regulations: ['SOX', 'HIPAA', 'GDPR'],
    signoffRequired: true,
    signoffRole: 'quality-manager',
  },
};

// ============================================
// Export all contracts
// ============================================

/**
 * All capability contracts defined in the system
 */
export const ALL_CAPABILITY_CONTRACTS: Record<string, CapabilityContract> = {
  'erp-integration': ERP_INTEGRATION_CONTRACT,
  'work-instruction-authoring': WORK_INSTRUCTION_AUTHORING_CONTRACT,
  'quality-compliance': QUALITY_COMPLIANCE_CONTRACT,
  'equipment-integration': EQUIPMENT_INTEGRATION_CONTRACT,
  'electronic-signature': ELECTRONIC_SIGNATURE_CONTRACT,
  'audit-trail': AUDIT_TRAIL_CONTRACT,
  'custom-field-storage': CUSTOM_FIELD_STORAGE_CONTRACT,
  'authentication-provider': AUTHENTICATION_PROVIDER_CONTRACT,
};

/**
 * Get all capability contracts
 */
export function getAllCapabilityContracts(): CapabilityContract[] {
  return Object.values(ALL_CAPABILITY_CONTRACTS);
}

/**
 * Get capability contract by ID
 */
export function getCapabilityContractById(id: string): CapabilityContract | undefined {
  return ALL_CAPABILITY_CONTRACTS[id];
}

/**
 * Find contracts by type/category
 */
export function getCapabilityContractsByFoundationTier(
  tier: 'core-foundation' | 'foundation' | 'application'
): CapabilityContract[] {
  return getAllCapabilityContracts().filter(contract => contract.foundationTier === tier);
}
