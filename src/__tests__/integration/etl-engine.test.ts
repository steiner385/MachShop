/**
 * ETL Engine Integration Tests
 * Issue #34: Database Direct Import/ETL Engine
 *
 * Tests database connectivity, schema discovery, transformations, and job execution
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import DatabaseConnectionService from '../../services/migration/database/DatabaseConnectionService';
import TransformationEngine, { FieldMapping, Transformation } from '../../services/migration/TransformationEngine';
import ETLJobService from '../../services/migration/ETLJobService';

describe('ETL Engine Integration Tests', () => {
  let dbService: DatabaseConnectionService;
  let etlService: ETLJobService;

  beforeAll(() => {
    dbService = new DatabaseConnectionService();
    etlService = new ETLJobService();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Database Connection Service', () => {
    it('should validate unsupported database type', async () => {
      const invalidConfig = {
        name: 'Invalid DB',
        type: 'mongodb' as any,
        host: 'localhost',
        port: 27017,
        database: 'test',
        username: 'user',
        password: 'pass'
      };

      const result = await dbService.testConnection(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle connection test with invalid credentials', async () => {
      const config = {
        name: 'Test DB',
        type: 'postgresql' as const,
        host: 'localhost',
        port: 5432,
        database: 'nonexistent_db',
        username: 'invalid_user',
        password: 'invalid_pass'
      };

      const result = await dbService.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Transformation Engine', () => {
    it('should perform field mapping', () => {
      const record = {
        legacy_name: 'John Doe',
        legacy_email: 'john@example.com',
        legacy_status: '1'
      };

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'legacy_name',
          targetField: 'fullName',
          dataType: 'string',
          required: true
        },
        {
          sourceField: 'legacy_email',
          targetField: 'email',
          dataType: 'string',
          required: true
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, []);

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
    });

    it('should apply data type conversions', () => {
      const record = {
        amount: '1234.56',
        quantity: '100',
        active: 'true'
      };

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'amount',
          targetField: 'amount',
          dataType: 'decimal',
          required: true
        },
        {
          sourceField: 'quantity',
          targetField: 'quantity',
          dataType: 'int',
          required: true
        },
        {
          sourceField: 'active',
          targetField: 'active',
          dataType: 'boolean',
          required: true
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, []);

      expect(result.success).toBe(true);
      expect(typeof result.data.amount).toBe('number');
      expect(result.data.amount).toBe(1234.56);
      expect(typeof result.data.quantity).toBe('number');
      expect(result.data.quantity).toBe(100);
      expect(typeof result.data.active).toBe('boolean');
      expect(result.data.active).toBe(true);
    });

    it('should apply concatenation transformation', () => {
      const record = {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Michael'
      };

      const fieldMappings: FieldMapping[] = [];
      const transformations: Transformation[] = [
        {
          type: 'concat',
          sourceFields: ['firstName', 'middleName', 'lastName'],
          targetField: 'fullName',
          config: { separator: ' ' }
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe('John Michael Doe');
    });

    it('should apply lookup transformation', () => {
      const record = {
        status_code: '1'
      };

      const fieldMappings: FieldMapping[] = [];
      const transformations: Transformation[] = [
        {
          type: 'lookup',
          sourceFields: ['status_code'],
          targetField: 'status',
          config: {
            lookupTable: {
              '1': 'DRAFT',
              '2': 'RELEASED',
              '3': 'ACTIVE',
              '4': 'COMPLETED'
            },
            defaultValue: 'UNKNOWN'
          }
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('DRAFT');
    });

    it('should apply calculation transformation', () => {
      const record = {
        baseCost: 100,
        markupPercent: 20
      };

      const fieldMappings: FieldMapping[] = [];
      const transformations: Transformation[] = [
        {
          type: 'calculate',
          sourceFields: ['baseCost', 'markupPercent'],
          targetField: 'standardCost',
          config: {
            expression: 'baseCost * (1 + markupPercent / 100)'
          }
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.standardCost).toBe(120);
    });

    it('should apply conditional transformation', () => {
      const record = {
        partType: 'P'
      };

      const fieldMappings: FieldMapping[] = [];
      const transformations: Transformation[] = [
        {
          type: 'conditional',
          sourceFields: ['partType'],
          targetField: 'classification',
          config: {
            condition: "partType === 'P'",
            trueValue: 'PURCHASED_PART',
            falseValue: 'FABRICATED_PART'
          }
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.classification).toBe('PURCHASED_PART');
    });

    it('should apply split transformation', () => {
      const record = {
        address: '123 Main St,Springfield,IL,62701'
      };

      const fieldMappings: FieldMapping[] = [];
      const transformations: Transformation[] = [
        {
          type: 'split',
          sourceFields: ['address'],
          targetField: 'street',
          config: { delimiter: ',', index: 0 }
        },
        {
          type: 'split',
          sourceFields: ['address'],
          targetField: 'city',
          config: { delimiter: ',', index: 1 }
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.street).toBe('123 Main St');
      expect(result.data.city).toBe('Springfield');
    });

    it('should validate transformations', () => {
      const validTransformations: Transformation[] = [
        {
          type: 'convert',
          sourceFields: ['amount'],
          targetField: 'amount',
          config: { toType: 'decimal' }
        }
      ];

      const validation = TransformationEngine.validateTransformations(validTransformations);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid transformations', () => {
      const invalidTransformations: Transformation[] = [
        {
          type: 'convert',
          sourceFields: [],
          targetField: 'amount',
          config: {}
        }
      ];

      const validation = TransformationEngine.validateTransformations(invalidTransformations);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle required field validation', () => {
      const record = {
        email: null
      };

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'email',
          targetField: 'email',
          dataType: 'string',
          required: true,
          defaultValue: 'unknown@example.com'
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, []);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('unknown@example.com');
    });

    it('should collect transformation errors', () => {
      const record = {
        amount: 'not_a_number'
      };

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'amount',
          targetField: 'amount',
          dataType: 'int',
          required: true
        }
      ];

      const result = TransformationEngine.transformRecord(record, fieldMappings, []);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ETL Job Service', () => {
    it('should create ETL job', async () => {
      const jobDef = {
        name: 'Test ETL Job',
        description: 'Test job for ETL integration',
        sourceConnectionId: 'test-conn-1',
        targetEntityType: 'Part',
        extraction: {
          table: 'legacy_parts',
          where: 'status = 1'
        },
        transformation: {
          fieldMappings: [],
          transformations: []
        },
        load: {
          mode: 'insert' as const,
          batchSize: 1000,
          parallelism: 4,
          errorHandling: 'continue' as const
        }
      };

      const job = await etlService.createJob(jobDef);

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test ETL Job');
      expect(job.sourceConnectionId).toBe('test-conn-1');
    });

    it('should retrieve created job', async () => {
      const jobDef = {
        name: 'Retrieve Test Job',
        sourceConnectionId: 'test-conn-1',
        targetEntityType: 'Material',
        extraction: {
          table: 'legacy_materials'
        },
        transformation: {
          fieldMappings: [],
          transformations: []
        },
        load: {
          mode: 'insert' as const,
          batchSize: 1000,
          parallelism: 4,
          errorHandling: 'continue' as const
        }
      };

      const created = await etlService.createJob(jobDef);
      const retrieved = etlService.getJob(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Retrieve Test Job');
    });

    it('should list all jobs', async () => {
      const job1 = await etlService.createJob({
        name: 'Job 1',
        sourceConnectionId: 'conn-1',
        targetEntityType: 'Part',
        extraction: { table: 'table1' },
        transformation: { fieldMappings: [], transformations: [] },
        load: {
          mode: 'insert',
          batchSize: 1000,
          parallelism: 4,
          errorHandling: 'continue'
        }
      });

      const job2 = await etlService.createJob({
        name: 'Job 2',
        sourceConnectionId: 'conn-2',
        targetEntityType: 'Material',
        extraction: { table: 'table2' },
        transformation: { fieldMappings: [], transformations: [] },
        load: {
          mode: 'upsert',
          batchSize: 1000,
          parallelism: 4,
          errorHandling: 'continue'
        }
      });

      const jobs = etlService.listJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.some((j) => j.name === 'Job 1')).toBe(true);
      expect(jobs.some((j) => j.name === 'Job 2')).toBe(true);
    });
  });

  describe('Complete ETL Workflows', () => {
    it('should handle multi-step transformation workflow', () => {
      const legacyRecord = {
        emp_id: '1001',
        first_name: 'John',
        last_name: 'Doe',
        salary_base: '50000',
        bonus_percent: '10',
        status_code: '1'
      };

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'emp_id',
          targetField: 'employeeId',
          dataType: 'string',
          required: true
        },
        {
          sourceField: 'salary_base',
          targetField: 'baseSalary',
          dataType: 'decimal',
          required: true
        }
      ];

      const transformations: Transformation[] = [
        {
          type: 'concat',
          sourceFields: ['first_name', 'last_name'],
          targetField: 'fullName',
          config: { separator: ' ' }
        },
        {
          type: 'calculate',
          sourceFields: ['salary_base', 'bonus_percent'],
          targetField: 'totalCompensation',
          config: {
            expression: 'baseSalary * (1 + bonus_percent / 100)'
          }
        },
        {
          type: 'lookup',
          sourceFields: ['status_code'],
          targetField: 'employmentStatus',
          config: {
            lookupTable: {
              '1': 'ACTIVE',
              '2': 'INACTIVE',
              '3': 'TERMINATED'
            }
          }
        }
      ];

      const result = TransformationEngine.transformRecord(legacyRecord, fieldMappings, transformations);

      expect(result.success).toBe(true);
      expect(result.data.employeeId).toBe('1001');
      expect(result.data.fullName).toBe('John Doe');
      expect(result.data.baseSalary).toBe(50000);
      expect(result.data.totalCompensation).toBe(55000);
      expect(result.data.employmentStatus).toBe('ACTIVE');
    });

    it('should handle error recovery in batch processing', async () => {
      const batch = [
        { id: '1', amount: '100.50', status: '1' },
        { id: '2', amount: 'invalid', status: '2' },
        { id: '3', amount: '200.75', status: '1' }
      ];

      const fieldMappings: FieldMapping[] = [
        {
          sourceField: 'amount',
          targetField: 'amount',
          dataType: 'decimal',
          required: true
        }
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const record of batch) {
        const result = TransformationEngine.transformRecord(record, fieldMappings, []);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      expect(successCount).toBe(2);
      expect(errorCount).toBe(1);
    });
  });
});
