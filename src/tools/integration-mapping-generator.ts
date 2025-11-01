#!/usr/bin/env node

/**
 * Integration Mapping Generator
 * Systematically populates integrationMapping for all database fields
 * Maps MachShop fields to equivalent fields in external systems (ERP, MES, quality systems, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the external systems and their field mapping patterns
const EXTERNAL_SYSTEMS = {
  // ERP Systems
  'ERP': {
    aliases: ['SalesOrder', 'PurchaseOrder', 'ProductionOrder', 'InventoryLot', 'Asset', 'Company', 'Site'],
    description: 'Generic ERP system (SAP, Oracle, ImpactERP)',
    fieldMappings: {} // Will be populated dynamically
  },
  'Oracle': {
    aliases: ['OracleFusion', 'OracleEBS'],
    description: 'Oracle ERP systems (Fusion Cloud or E-Business Suite)',
    fieldMappings: {}
  },
  'SAP': {
    aliases: [],
    description: 'SAP ERP system',
    fieldMappings: {}
  },
  'ImpactERP': {
    aliases: [],
    description: 'ImpactERP system for job shops',
    fieldMappings: {}
  },

  // Manufacturing Systems
  'MES': {
    aliases: ['ManufacturingExecutionSystem'],
    description: 'Manufacturing Execution System',
    fieldMappings: {}
  },
  'Scheduling': {
    aliases: ['SchedulingSystem', 'JobScheduler'],
    description: 'Production scheduling system',
    fieldMappings: {}
  },

  // PLM/PDM Systems
  'PLM': {
    aliases: ['Teamcenter', 'PredatorPDM', 'ProductLifecycleManagement'],
    description: 'Product Lifecycle Management system',
    fieldMappings: {}
  },

  // Quality Systems
  'QualitySystem': {
    aliases: ['CMM', 'QIF', 'TestResults', 'Inspection'],
    description: 'Quality management and inspection system',
    fieldMappings: {}
  },
  'Indysoft': {
    aliases: ['CalibrationSystem'],
    description: 'Indysoft calibration management system',
    fieldMappings: {}
  },

  // Maintenance Systems
  'CMMS': {
    aliases: ['Maximo', 'MaintenanceManagement'],
    description: 'Computerized Maintenance Management System',
    fieldMappings: {}
  },

  // Shop Floor Systems
  'ShopFloor': {
    aliases: ['ShopFloorConnect', 'SFC', 'DataCollection'],
    description: 'Shop floor data collection and control system',
    fieldMappings: {}
  },
  'DNC': {
    aliases: ['PredatorDNC', 'MachineControl'],
    description: 'Direct Numerical Control for CNC machines',
    fieldMappings: {}
  },
  'Historian': {
    aliases: ['ProficyHistorian', 'TimeSeriesDatabase'],
    description: 'Historian system for time-series machine data',
    fieldMappings: {}
  },

  // HR/Personnel Systems
  'HRSystem': {
    aliases: ['HRM', 'HRIS', 'PersonnelSystem'],
    description: 'Human Resources Management System',
    fieldMappings: {}
  },
  'BadgeSystem': {
    aliases: ['AccessControl', 'EmployeeID'],
    description: 'Badge/access control system',
    fieldMappings: {}
  },

  // Customer/Supplier Portals
  'CustomerPortal': {
    aliases: ['OrderTracking', 'CustomerFacing'],
    description: 'Customer-facing order tracking portal',
    fieldMappings: {}
  },
  'SupplierPortal': {
    aliases: ['VendorPortal', 'SupplierIntegration'],
    description: 'Supplier portal for orders and shipments',
    fieldMappings: {}
  },

  // Performance & Analytics
  'Analytics': {
    aliases: ['PerformanceSystem', 'BI', 'Reporting', 'Dashboard'],
    description: 'Analytics and reporting platform',
    fieldMappings: {}
  },
  'LaborTracking': {
    aliases: ['TimeTracking', 'Kronos', 'Workday'],
    description: 'Labor/time tracking system',
    fieldMappings: {}
  },

  // Directory Services
  'ActiveDirectory': {
    aliases: ['LDAP', 'DirectoryService', 'UserDirectory'],
    description: 'Active Directory or LDAP directory service',
    fieldMappings: {}
  }
};

// Field type patterns and their typical external system mappings
const FIELD_PATTERNS: Record<string, Record<string, string>> = {
  // Identifier patterns
  'id$': {
    'ERP': 'Master.ID',
    'MES': 'Entity.ID',
    'ActiveDirectory': 'objectGUID'
  },
  '^[a-zA-Z]*[Ii]d$': {
    'ERP': 'Master.ID',
    'PLM': 'Entity.ID'
  },
  '[Nn]umber$': {
    'ERP': 'Master.Number',
    'MES': 'Master.Number',
    'Scheduling': 'Job.Number',
    'CustomerPortal': 'OrderID'
  },
  '[Cc]ode$': {
    'ERP': 'Master.Code',
    'PLM': 'Product.Code'
  },

  // Status/state patterns
  '[Ss]tatus$': {
    'ERP': 'Master.Status',
    'MES': 'Entity.Status',
    'Scheduling': 'Job.Status'
  },
  '[Ss]tate$': {
    'ERP': 'Master.Status'
  },

  // Date/Time patterns
  '[Dd]ate$|[Tt]ime$': {
    'ERP': 'Master.Timestamp',
    'Analytics': 'Events.Timestamp',
    'Historian': 'TimeSeries.Timestamp'
  },
  '[Ss]tart': {
    'ERP': 'Job.StartDate',
    'Scheduling': 'Job.StartTime',
    'LaborTracking': 'Job.StartTime'
  },
  '[Ee]nd': {
    'ERP': 'Job.EndDate',
    'Scheduling': 'Job.EndTime'
  },

  // Financial patterns
  '[Cc]ost$|[Pp]rice$|[Rr]ate$': {
    'ERP': 'Finance.Amount',
    'Analytics': 'Metrics.Value'
  },
  '[Qq]uantity$|[Aa]mount$': {
    'ERP': 'Inventory.Quantity',
    'MES': 'Production.Quantity'
  },

  // Quality patterns
  '[Ii]nspect|[Qq]uality|[Tt]est|[Cc]mq': {
    'QualitySystem': 'TestResults.Value',
    'Analytics': 'Quality.Metric'
  },
  '[Ll]ot[Nn]umber': {
    'ERP': 'InventoryLot.LotNumber',
    'QualitySystem': 'TestResults.LotID',
    'SupplierPortal': 'DeliveryNote.LotNumber'
  },

  // Equipment/Asset patterns
  '[Ee]quipment|[Mm]achine|[Tt]ool|[Aa]sset': {
    'ERP': 'Asset.AssetNumber',
    'CMMS': 'Equipment.EquipmentID',
    'Historian': 'Device.DeviceID'
  },

  // Document patterns
  '[Dd]ocument|[Ff]ile|[Pp]art': {
    'PLM': 'CAD.Filename',
    'ERP': 'Document.DocumentNumber'
  },

  // Personnel patterns
  '[Ee]mployee|[Uu]ser|[Pp]erson': {
    'HRSystem': 'Employee.EmployeeID',
    'BadgeSystem': 'Employee.BadgeNumber',
    'ActiveDirectory': 'User.sAMAccountName'
  },

  // Notes/Description patterns
  '[Dd]escription|[Nn]otes|[Cc]omment': {
    'ERP': 'Master.Description',
    'Analytics': 'Record.Notes'
  }
};

interface FieldDocumentation {
  description?: string;
  businessRule?: string;
  dataSource?: string;
  format?: string;
  examples?: string[];
  validation?: string;
  calculations?: string;
  privacy?: string;
  retention?: string;
  auditTrail?: string;
  integrationMapping?: Record<string, string>;
  businessImpact?: string;
  validValues?: string[] | null;
  complianceNotes?: string;
  businessPurpose?: string;
  businessJustification?: string;
  consequences?: string;
}

interface TableDocumentation {
  [fieldName: string]: FieldDocumentation;
}

interface SchemaDocumentation {
  _metadata?: Record<string, unknown>;
  [tableName: string]: TableDocumentation | Record<string, unknown>;
}

/**
 * Generate integration mappings for a field based on field name and patterns
 */
function generateIntegrationMappings(
  fieldName: string,
  tableName: string,
  existingMapping?: Record<string, string>
): Record<string, string> {
  // Start with existing mappings if available
  const mappings: Record<string, string> = { ...(existingMapping || {}) };

  // Try pattern matching
  for (const [pattern, systemMappings] of Object.entries(FIELD_PATTERNS)) {
    if (new RegExp(pattern, 'i').test(fieldName)) {
      for (const [system, fieldPath] of Object.entries(systemMappings)) {
        if (!mappings[system]) {
          // Replace placeholders with actual table and field names
          let mappedPath = fieldPath
            .replace(/Master/g, tableName)
            .replace(/Entity/g, tableName)
            .replace(/Job/g, tableName)
            .replace(/Field/g, fieldName);
          mappings[system] = mappedPath;
        }
      }
    }
  }

  // Add sensible defaults for common systems
  if (Object.keys(mappings).length === 0) {
    // Default mapping for unmapped fields
    mappings['ERP'] = `${tableName}.${fieldName}`;
    mappings['MES'] = `${tableName}.${fieldName}`;
  }

  return mappings;
}

/**
 * Load existing field documentation
 */
function loadFieldDocumentation(filePath: string): SchemaDocumentation {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading field documentation: ${error}`);
    return {};
  }
}

/**
 * Save updated field documentation
 */
function saveFieldDocumentation(filePath: string, documentation: SchemaDocumentation): void {
  fs.writeFileSync(filePath, JSON.stringify(documentation, null, 2));
  console.log(`✅ Saved updated documentation to ${filePath}`);
}

/**
 * Process all fields and generate integration mappings
 */
function generateAllMappings(documentation: SchemaDocumentation): SchemaDocumentation {
  let mappingsAdded = 0;
  let mappingsUpdated = 0;

  for (const [tableName, tableFields] of Object.entries(documentation)) {
    // Skip metadata
    if (tableName === '_metadata') continue;

    if (typeof tableFields !== 'object') continue;

    for (const [fieldName, fieldDoc] of Object.entries(tableFields)) {
      if (typeof fieldDoc !== 'object' || !fieldDoc) continue;

      const field = fieldDoc as FieldDocumentation;
      const existingMapping = field.integrationMapping;

      // Generate or enhance mappings
      const newMappings = generateIntegrationMappings(
        fieldName,
        tableName,
        existingMapping
      );

      // Only update if mappings changed
      if (!existingMapping) {
        field.integrationMapping = newMappings;
        mappingsAdded++;
      } else if (JSON.stringify(existingMapping) !== JSON.stringify(newMappings)) {
        field.integrationMapping = newMappings;
        mappingsUpdated++;
      }
    }
  }

  console.log(`\n📊 Integration Mapping Summary:`);
  console.log(`   ✨ New mappings added: ${mappingsAdded}`);
  console.log(`   🔄 Existing mappings enhanced: ${mappingsUpdated}`);

  return documentation;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Integration Mapping Generator\n');

  const docPath = path.join(process.cwd(), 'docs', 'schema-documentation', 'field-descriptions.json');

  console.log(`📖 Loading field documentation from: ${docPath}`);
  const documentation = loadFieldDocumentation(docPath);

  // Count total fields
  let totalFields = 0;
  for (const [tableName, tableFields] of Object.entries(documentation)) {
    if (tableName !== '_metadata' && typeof tableFields === 'object') {
      totalFields += Object.keys(tableFields).length;
    }
  }

  console.log(`📋 Found ${totalFields} fields across ${Object.keys(documentation).length - 1} tables\n`);

  // Generate all mappings
  const updatedDocs = generateAllMappings(documentation);

  // Save updated documentation
  saveFieldDocumentation(docPath, updatedDocs);

  console.log(`\n✅ Integration Mapping Generation Complete!`);
}

main().catch(console.error);
