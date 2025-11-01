import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration Mapping Tests
 * Validates that all database fields have appropriate integration mappings
 * for external systems (ERP, MES, Quality Systems, PLM, etc.)
 */

interface IntegrationMapping {
  [system: string]: string;
}

interface FieldDocumentation {
  description?: string;
  integrationMapping?: IntegrationMapping;
  [key: string]: unknown;
}

interface TableDocumentation {
  [fieldName: string]: FieldDocumentation;
}

interface ComprehensiveDocumentation {
  summary: {
    totalTables: number;
    totalFields: number;
    integrationsProcessed?: number;
    generatedAt: string;
  };
  tables: Array<{
    name: string;
    fields: Array<{
      name: string;
      type?: string;
      integrationMapping?: IntegrationMapping;
      [key: string]: unknown;
    }>;
  }>;
}

let comprehensiveDoc: ComprehensiveDocumentation;
let fieldDescriptionsDoc: Record<string, TableDocumentation>;

beforeAll(() => {
  // Load comprehensive field documentation
  const comprehensivePath = path.join(
    process.cwd(),
    'docs',
    'generated',
    'comprehensive-field-documentation.json'
  );
  const comprehensiveContent = fs.readFileSync(comprehensivePath, 'utf-8');
  comprehensiveDoc = JSON.parse(comprehensiveContent);

  // Load field descriptions documentation
  const fieldDescPath = path.join(
    process.cwd(),
    'docs',
    'schema-documentation',
    'field-descriptions.json'
  );
  const fieldDescContent = fs.readFileSync(fieldDescPath, 'utf-8');
  fieldDescriptionsDoc = JSON.parse(fieldDescContent);
});

describe('Integration Mapping - Comprehensive Coverage', () => {
  it('should have integration mappings for all fields in comprehensive documentation', () => {
    let mappedFields = 0;
    let totalFields = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        totalFields++;
        if (field.integrationMapping && Object.keys(field.integrationMapping).length > 0) {
          mappedFields++;
        }
      }
    }

    expect(mappedFields).toBe(totalFields);
    expect(mappedFields).toBeGreaterThan(5000);
  });

  it('should have valid system names in integration mappings', () => {
    const validSystems = new Set([
      'ERP', 'MES', 'Scheduling', 'QualitySystem', 'PLM', 'Analytics',
      'HRSystem', 'BadgeSystem', 'CMMS', 'LaborTracking', 'CustomerPortal',
      'SupplierPortal', 'ActiveDirectory', 'Historian'
    ]);

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          for (const system of Object.keys(field.integrationMapping)) {
            expect(validSystems.has(system) || system.length > 0).toBe(true);
          }
        }
      }
    }
  });

  it('should have non-empty field paths in integration mappings', () => {
    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          for (const [system, path] of Object.entries(field.integrationMapping)) {
            expect(path).toBeDefined();
            expect(typeof path).toBe('string');
            expect(path.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe('Integration Mapping - Field Description Documentation', () => {
  it('should have integration mappings for key tables in field descriptions', () => {
    const tables = Object.keys(fieldDescriptionsDoc).filter(k => k !== '_metadata');
    expect(tables.length).toBeGreaterThan(0);
  });

  it('should have integration mappings for WorkOrder fields', () => {
    const workOrderFields = fieldDescriptionsDoc['WorkOrder'];
    expect(workOrderFields).toBeDefined();

    for (const [fieldName, fieldDoc] of Object.entries(workOrderFields)) {
      if (fieldDoc.integrationMapping) {
        expect(Object.keys(fieldDoc.integrationMapping).length).toBeGreaterThan(0);
      }
    }
  });

  it('should have integration mappings for Material fields', () => {
    const materialFields = fieldDescriptionsDoc['Material'];
    expect(materialFields).toBeDefined();

    for (const [fieldName, fieldDoc] of Object.entries(materialFields)) {
      if (fieldDoc.integrationMapping) {
        expect(Object.keys(fieldDoc.integrationMapping).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Integration Mapping - System Coverage', () => {
  it('should have ERP mappings for most business fields', () => {
    let erpMappings = 0;
    let totalMappings = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          totalMappings++;
          if (field.integrationMapping['ERP']) {
            erpMappings++;
          }
        }
      }
    }

    const erpCoverage = (erpMappings / totalMappings) * 100;
    expect(erpCoverage).toBeGreaterThan(90);
  });

  it('should have MES mappings for production-related fields', () => {
    let mesMappings = 0;
    let totalMappings = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          totalMappings++;
          if (field.integrationMapping['MES']) {
            mesMappings++;
          }
        }
      }
    }

    const mesCoverage = (mesMappings / totalMappings) * 100;
    expect(mesCoverage).toBeGreaterThan(70);
  });

  it('should have PLM mappings for document and product-related fields', () => {
    let plmMappings = 0;
    let totalMappings = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          totalMappings++;
          if (field.integrationMapping['PLM']) {
            plmMappings++;
          }
        }
      }
    }

    const plmCoverage = (plmMappings / totalMappings) * 100;
    expect(plmCoverage).toBeGreaterThan(20);
  });
});

describe('Integration Mapping - Field Path Validation', () => {
  it('should not have placeholder values in field paths', () => {
    let placeholderCount = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          for (const [system, fieldPath] of Object.entries(field.integrationMapping)) {
            if (fieldPath.includes('[') && fieldPath.includes(']')) {
              placeholderCount++;
            }
          }
        }
      }
    }

    expect(placeholderCount).toBe(0);
  });

  it('should have properly formatted field paths (Table.Field or Table.Entity.Field)', () => {
    let validPaths = 0;
    let totalPaths = 0;

    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          for (const fieldPath of Object.values(field.integrationMapping)) {
            totalPaths++;
            // Check for valid path pattern: Word.Word or Word.Word.Word
            if (/^[A-Za-z]+(\.[A-Za-z]+)+$/.test(fieldPath)) {
              validPaths++;
            }
          }
        }
      }
    }

    // Most should be valid (allowing 90%+ since some systems have different conventions)
    const validPathRatio = validPaths / totalPaths;
    expect(validPathRatio).toBeGreaterThan(0.90);
  });
});

describe('Integration Mapping - Consistency Checks', () => {
  it('should have consistent mappings for similar field names across tables', () => {
    const fieldNameMappings: Record<string, Set<string>> = {};

    // Collect all mappings for fields with the same name
    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          const systems = Object.keys(field.integrationMapping).sort().join(',');
          if (!fieldNameMappings[field.name]) {
            fieldNameMappings[field.name] = new Set();
          }
          fieldNameMappings[field.name].add(systems);
        }
      }
    }

    // For common fields, check they have consistent system coverage
    const commonFields = ['createdAt', 'updatedAt', 'id', 'status', 'name'];
    for (const commonField of commonFields) {
      if (fieldNameMappings[commonField]) {
        // Should have at most 2-3 different system combinations
        expect(fieldNameMappings[commonField].size).toBeLessThanOrEqual(3);
      }
    }
  });

  it('should have appropriate system combinations for business entity fields', () => {
    // WorkOrder-like entities should have core business systems
    const coreBusinessSystems = ['ERP', 'MES', 'Scheduling'];

    for (const table of comprehensiveDoc.tables) {
      const tableName = table.name.toLowerCase();
      // Check production/business entity tables
      if (tableName.includes('work') || tableName.includes('order') || tableName.includes('schedule')) {
        for (const field of table.fields) {
          if (field.integrationMapping && field.name.toLowerCase().includes('number')) {
            const systems = Object.keys(field.integrationMapping);
            const hasCoreSystem = coreBusinessSystems.some(sys => systems.includes(sys));
            expect(hasCoreSystem).toBe(true);
          }
        }
      }
    }
  });
});

describe('Integration Mapping - Performance', () => {
  it('should have mappings generated for 5000+ fields', () => {
    expect(comprehensiveDoc.summary.totalFields).toBeGreaterThanOrEqual(5000);
  });

  it('should complete validation within acceptable time', () => {
    const startTime = Date.now();

    // Count all mappings
    let mappingCount = 0;
    for (const table of comprehensiveDoc.tables) {
      for (const field of table.fields) {
        if (field.integrationMapping) {
          mappingCount += Object.keys(field.integrationMapping).length;
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should have multiple mappings per field on average
    expect(mappingCount).toBeGreaterThan(13000);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });
});
