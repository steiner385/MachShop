#!/usr/bin/env node

/**
 * Integration Mapping Generator
 * Systematically populates integrationMapping for all database fields
 * Maps MachShop fields to equivalent fields in external systems (ERP, MES, quality systems, etc.)
 */

const fs = require('fs');
const path = require('path');

// Field type patterns and their typical external system mappings
const FIELD_PATTERNS = {
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

/**
 * Generate integration mappings for a field based on field name and patterns
 */
function generateIntegrationMappings(fieldName, tableName, existingMapping) {
  // Start with existing mappings if available
  const mappings = { ...(existingMapping || {}) };

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

  // Add sensible defaults for unmapped fields
  if (Object.keys(mappings).length === 0) {
    mappings['ERP'] = `${tableName}.${fieldName}`;
    mappings['MES'] = `${tableName}.${fieldName}`;
  }

  return mappings;
}

/**
 * Load existing field documentation
 */
function loadFieldDocumentation(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading field documentation: ${error.message}`);
    return {};
  }
}

/**
 * Save updated field documentation
 */
function saveFieldDocumentation(filePath, documentation) {
  fs.writeFileSync(filePath, JSON.stringify(documentation, null, 2));
  console.log(`✅ Saved updated documentation to ${filePath}`);
}

/**
 * Process all fields and generate integration mappings
 */
function generateAllMappings(documentation) {
  let mappingsAdded = 0;
  let mappingsUpdated = 0;
  let fieldsProcessed = 0;

  for (const [tableName, tableFields] of Object.entries(documentation)) {
    // Skip metadata
    if (tableName === '_metadata') continue;

    if (typeof tableFields !== 'object' || tableFields === null) continue;

    for (const [fieldName, fieldDoc] of Object.entries(tableFields)) {
      if (typeof fieldDoc !== 'object' || fieldDoc === null) continue;

      const existingMapping = fieldDoc.integrationMapping;

      // Generate or enhance mappings
      const newMappings = generateIntegrationMappings(
        fieldName,
        tableName,
        existingMapping
      );

      // Update field with new mappings
      fieldDoc.integrationMapping = newMappings;
      fieldsProcessed++;

      // Track what changed
      if (!existingMapping) {
        mappingsAdded++;
      } else if (JSON.stringify(existingMapping) !== JSON.stringify(newMappings)) {
        mappingsUpdated++;
      }
    }
  }

  console.log(`\n📊 Integration Mapping Summary:`);
  console.log(`   📝 Fields processed: ${fieldsProcessed}`);
  console.log(`   ✨ New mappings added: ${mappingsAdded}`);
  console.log(`   🔄 Existing mappings enhanced: ${mappingsUpdated}`);

  return documentation;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Integration Mapping Generator\n');

  const docPath = path.join(process.cwd(), 'docs', 'schema-documentation', 'field-descriptions.json');

  console.log(`📖 Loading field documentation from: ${docPath}`);
  const documentation = loadFieldDocumentation(docPath);

  // Count total fields
  let totalFields = 0;
  for (const [tableName, tableFields] of Object.entries(documentation)) {
    if (tableName !== '_metadata' && typeof tableFields === 'object' && tableFields !== null) {
      totalFields += Object.keys(tableFields).length;
    }
  }

  console.log(`📋 Found ${totalFields} fields across ${Object.keys(documentation).length - 1} tables\n`);

  // Generate all mappings
  const updatedDocs = generateAllMappings(documentation);

  // Save updated documentation
  saveFieldDocumentation(docPath, updatedDocs);

  console.log(`\n✅ Integration Mapping Generation Complete!`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the generated mappings for accuracy`);
  console.log(`   2. Run the validation script to check coverage`);
  console.log(`   3. Create a test suite for the mappings`);
  console.log(`   4. Commit and create a pull request`);
}

main();
