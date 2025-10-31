/**
 * Test suite for IndySoftSurrogate service
 * Comprehensive testing of gauge management and calibration functionality
 * GitHub Issue #243: Testing Infrastructure: Asset/Calibration Management Surrogates
 */

import { IndySoftSurrogate, IndySoftSurrogateConfig } from '../../services/IndySoftSurrogate';
import {
  Gauge,
  CalibrationRecord,
  GaugeType,
  GaugeStatus,
  CalibrationStatus,
  EnvironmentalConditions,
  MeasurementUncertainty,
  CalibrationReading,
  MeasurementUncertaintyType
} from '../../services/IndySoftSurrogate';

describe('IndySoftSurrogate', () => {
  let indySoftSurrogate: IndySoftSurrogate;
  let config: Partial<IndySoftSurrogateConfig>;

  beforeEach(() => {
    config = {
      mockMode: true,
      enableDataExport: true,
      enableAuditLogging: true,
      maxGaugeRecords: 100,
      maxCalibrationHistory: 200,
      autoGenerateCalibrationDueNotifications: false, // Disable for testing
      defaultTechnician: 'TEST_TECH'
    };
    indySoftSurrogate = new IndySoftSurrogate(config);
  });

  afterEach(async () => {
    await indySoftSurrogate.resetMockData();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with provided config', () => {
      expect(indySoftSurrogate).toBeInstanceOf(IndySoftSurrogate);
    });

    it('should initialize with default config when not provided', () => {
      const defaultSurrogate = new IndySoftSurrogate();
      expect(defaultSurrogate).toBeInstanceOf(IndySoftSurrogate);
    });

    it('should initialize with sample data automatically', async () => {
      const gauges = await indySoftSurrogate.queryGauges({ limit: 10 });
      expect(gauges.success).toBe(true);
      expect(gauges.data.length).toBeGreaterThan(0);
    });
  });

  describe('Gauge Management', () => {
    it('should create gauge successfully', async () => {
      const gaugeData = {
        description: 'Test Digital Caliper',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG',
        model: 'TC-001',
        serialNumber: 'SN123456',
        location: 'TEST_LAB',
        department: 'QC',
        calibrationFrequency: 30, // 30 days
        measurementRange: {
          minimum: 0,
          maximum: 150,
          units: 'mm'
        },
        accuracy: 0.02
      };

      const result = await indySoftSurrogate.createGauge(gaugeData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.gaugeId).toMatch(/^GAGE-\d{6}$/);
      expect(result.data?.description).toBe(gaugeData.description);
      expect(result.data?.status).toBe(GaugeStatus.ACTIVE);
      expect(result.data?.nextCalibrationDate).toBeDefined();
    });

    it('should reject gauge creation with duplicate asset tag', async () => {
      const gaugeData = {
        assetTag: 'DUPLICATE-TAG',
        description: 'First Gauge',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG'
      };

      const result1 = await indySoftSurrogate.createGauge(gaugeData);
      expect(result1.success).toBe(true);

      const result2 = await indySoftSurrogate.createGauge(gaugeData);
      expect(result2.success).toBe(false);
      expect(result2.errors).toBeDefined();
      expect(result2.errors![0]).toContain('already exists');
    });

    it('should retrieve gauge by ID', async () => {
      const gaugeData = {
        description: 'Test Gauge for Retrieval',
        gaugeType: GaugeType.MICROMETER,
        manufacturer: 'TEST_MFG',
        model: 'TG-002',
        serialNumber: 'SN789012',
        location: 'TEST_LAB'
      };

      const createResult = await indySoftSurrogate.createGauge(gaugeData);
      expect(createResult.success).toBe(true);

      const gaugeId = createResult.data!.gaugeId;
      const retrieveResult = await indySoftSurrogate.getGauge(gaugeId);

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data?.gaugeId).toBe(gaugeId);
      expect(retrieveResult.data?.description).toBe(gaugeData.description);
    });

    it('should handle gauge not found error', async () => {
      const result = await indySoftSurrogate.getGauge('NONEXISTENT-ID');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('not found');
    });

    it('should query gauges with filters', async () => {
      const location = 'TEST_LOCATION_FILTER';

      // Create multiple gauges in the same location
      await indySoftSurrogate.createGauge({
        description: 'Gauge 1',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG',
        location
      });

      await indySoftSurrogate.createGauge({
        description: 'Gauge 2',
        gaugeType: GaugeType.MICROMETER,
        manufacturer: 'TEST_MFG',
        location
      });

      const result = await indySoftSurrogate.queryGauges({ location });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data.every(gauge => gauge.location === location)).toBe(true);
    });

    it('should query gauges with pagination', async () => {
      const result = await indySoftSurrogate.queryGauges({ limit: 5, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.metadata?.totalCount).toBeGreaterThan(0);
      expect(result.metadata?.pageSize).toBe(5);
      expect(result.metadata?.currentPage).toBe(1);
    });
  });

  describe('Calibration Records Management', () => {
    let testGaugeId: string;

    beforeEach(async () => {
      const gaugeData = {
        description: 'Test Gauge for Calibration',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG',
        model: 'TC-CAL',
        serialNumber: 'SNCAL123',
        location: 'CAL_LAB',
        measurementRange: { minimum: 0, maximum: 100, units: 'mm' }
      };

      const result = await indySoftSurrogate.createGauge(gaugeData);
      testGaugeId = result.data!.gaugeId;
    });

    it('should create calibration record successfully', async () => {
      const environmentalConditions: EnvironmentalConditions = {
        temperature: 20.5,
        humidity: 45.2,
        pressure: 1013.25
      };

      const asFoundReadings: CalibrationReading[] = [
        {
          nominalValue: 10.00,
          actualValue: 10.02,
          error: 0.02,
          tolerance: 0.05,
          withinTolerance: true,
          units: 'mm'
        },
        {
          nominalValue: 50.00,
          actualValue: 49.98,
          error: -0.02,
          tolerance: 0.05,
          withinTolerance: true,
          units: 'mm'
        }
      ];

      const measurementUncertainty: MeasurementUncertainty = {
        value: 0.015,
        type: MeasurementUncertaintyType.ABSOLUTE,
        coverageFactor: 2.0,
        confidenceLevel: 95,
        contributingFactors: []
      };

      const calibrationData = {
        gaugeId: testGaugeId,
        technician: 'John Smith',
        procedure: 'CAL-PROC-001',
        environmentalConditions,
        asFoundReadings,
        measurementUncertainty,
        overallResult: 'PASS' as const,
        comments: 'Calibration completed successfully'
      };

      const result = await indySoftSurrogate.createCalibrationRecord(calibrationData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.calibrationId).toMatch(/^CAL-\d{6}$/);
      expect(result.data?.gaugeId).toBe(testGaugeId);
      expect(result.data?.overallResult).toBe('PASS');
      expect(result.data?.calibrationDate).toBeDefined();
    });

    it('should handle out-of-tolerance calibration', async () => {
      const asFoundReadings: CalibrationReading[] = [
        {
          nominalValue: 10.00,
          actualValue: 10.08,
          error: 0.08,
          tolerance: 0.05,
          withinTolerance: false,
          units: 'mm'
        }
      ];

      const calibrationData = {
        gaugeId: testGaugeId,
        technician: 'Jane Doe',
        procedure: 'CAL-PROC-001',
        environmentalConditions: {
          temperature: 20.0,
          humidity: 50.0,
          pressure: 1013.0
        },
        asFoundReadings,
        overallResult: 'FAIL' as const,
        adjustmentsMade: ['Adjusted mechanism', 'Re-calibrated'],
        comments: 'Gauge was out of tolerance, corrective action taken'
      };

      const result = await indySoftSurrogate.createCalibrationRecord(calibrationData);

      expect(result.success).toBe(true);
      expect(result.data?.overallResult).toBe('FAIL');
      expect(result.data?.adjustmentsMade).toContain('Adjusted mechanism');
    });

    it('should fail to create calibration record for non-existent gauge', async () => {
      const calibrationData = {
        gaugeId: 'NONEXISTENT-GAUGE',
        technician: 'Test Technician',
        environmentalConditions: {
          temperature: 20.0,
          humidity: 50.0,
          pressure: 1013.0
        },
        asFoundReadings: [],
        overallResult: 'PASS' as const
      };

      const result = await indySoftSurrogate.createCalibrationRecord(calibrationData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('not found');
    });
  });

  describe('Event Emission', () => {
    it('should emit gauge created event', (done) => {
      indySoftSurrogate.on('gaugeCreated', (gauge) => {
        expect(gauge.gaugeId).toBeDefined();
        expect(gauge.description).toBe('Event Test Gauge');
        done();
      });

      indySoftSurrogate.createGauge({
        description: 'Event Test Gauge',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG',
        location: 'TEST_LAB'
      });
    });

    it('should emit calibration completed event', async (done) => {
      const gaugeResult = await indySoftSurrogate.createGauge({
        description: 'Calibration Event Gauge',
        gaugeType: GaugeType.MICROMETER,
        manufacturer: 'TEST_MFG',
        location: 'TEST_LAB'
      });

      indySoftSurrogate.on('calibrationCompleted', (calibrationRecord, gauge) => {
        expect(calibrationRecord.calibrationId).toBeDefined();
        expect(calibrationRecord.gaugeId).toBe(gaugeResult.data!.gaugeId);
        expect(calibrationRecord.overallResult).toBe('PASS');
        done();
      });

      await indySoftSurrogate.createCalibrationRecord({
        gaugeId: gaugeResult.data!.gaugeId,
        technician: 'Event Technician',
        procedure: 'EVENT-PROC-001',
        environmentalConditions: {
          temperature: 20.0,
          humidity: 50.0,
          pressure: 1013.0
        },
        asFoundReadings: [],
        overallResult: 'PASS' as const
      });
    });

    it('should emit out-of-tolerance detected event', async (done) => {
      const gaugeResult = await indySoftSurrogate.createGauge({
        description: 'OOT Event Gauge',
        gaugeType: GaugeType.MICROMETER,
        manufacturer: 'TEST_MFG',
        location: 'TEST_LAB'
      });

      indySoftSurrogate.on('outOfToleranceDetected', (ootEvent) => {
        expect(ootEvent.ootId).toBeDefined();
        expect(ootEvent.gaugeId).toBe(gaugeResult.data!.gaugeId);
        expect(ootEvent.status).toBe('OPEN');
        done();
      });

      await indySoftSurrogate.createCalibrationRecord({
        gaugeId: gaugeResult.data!.gaugeId,
        technician: 'Event Technician',
        procedure: 'EVENT-PROC-001',
        environmentalConditions: {
          temperature: 20.0,
          humidity: 50.0,
          pressure: 1013.0
        },
        asFoundReadings: [],
        overallResult: 'FAIL' as const
      });
    });
  });

  describe('Health Status', () => {
    it('should return healthy status', async () => {
      const result = await indySoftSurrogate.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
      expect(result.data?.service).toBe('IndySoft Calibration Management Surrogate');
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.gaugeCount).toBeDefined();
      expect(result.data?.calibrationRecordCount).toBeDefined();
      expect(result.data?.gagesDue).toBeDefined();
      expect(result.data?.gaugesOverdue).toBeDefined();
    });
  });

  describe('Mock Data Reset', () => {
    it('should reset mock data successfully', async () => {
      // Add some data
      await indySoftSurrogate.createGauge({
        description: 'Reset Test Gauge',
        gaugeType: GaugeType.CALIPER,
        manufacturer: 'TEST_MFG',
        location: 'TEST_LAB'
      });

      // Verify data exists
      const beforeReset = await indySoftSurrogate.queryGauges({ limit: 1000 });
      expect(beforeReset.data.length).toBeGreaterThan(220); // Should have sample data + test gauge

      // Reset data
      const resetResult = await indySoftSurrogate.resetMockData();
      expect(resetResult.success).toBe(true);

      // Verify sample data is regenerated but test gauge is removed
      const afterReset = await indySoftSurrogate.queryGauges({ limit: 1000 });
      expect(afterReset.data.length).toBe(220); // Just the sample data
      expect(afterReset.data.every(gauge => gauge.description !== 'Reset Test Gauge')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid gauge ID format', async () => {
      const result = await indySoftSurrogate.getGauge('INVALID-FORMAT');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('not found');
    });

    it('should handle empty gauge ID in calibration record', async () => {
      const invalidCalibrationData = {
        gaugeId: '', // Empty gauge ID
        technician: 'Test Tech',
        environmentalConditions: {
          temperature: 20.0,
          humidity: 50.0,
          pressure: 1013.0
        },
        asFoundReadings: [],
        overallResult: 'PASS' as const
      };

      const result = await indySoftSurrogate.createCalibrationRecord(invalidCalibrationData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('not found');
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate realistic gauge data', async () => {
      // Reset and check what sample data is generated
      await indySoftSurrogate.resetMockData();

      const gauges = await indySoftSurrogate.queryGauges({ limit: 1000 });
      expect(gauges.success).toBe(true);
      expect(gauges.data.length).toBe(220); // Should match the sample data count

      // Verify data quality
      const sampleGauge = gauges.data[0];
      expect(sampleGauge.gaugeId).toMatch(/^GAGE-\d{6}$/);
      expect(sampleGauge.description).toBeTruthy();
      expect(Object.values(GaugeType)).toContain(sampleGauge.gaugeType);
      expect(sampleGauge.manufacturer).toBeTruthy();
      expect(sampleGauge.location).toBeTruthy();
      expect(sampleGauge.measurementRange).toBeDefined();
      expect(sampleGauge.accuracy).toBeDefined();
      expect(sampleGauge.nextCalibrationDate).toBeDefined();
      expect(sampleGauge.createdDate).toBeDefined();
    });

    it('should generate gauges with diverse types and manufacturers', async () => {
      const gauges = await indySoftSurrogate.queryGauges({ limit: 1000 });

      // Check for type diversity
      const gaugeTypes = new Set(gauges.data.map(gauge => gauge.gaugeType));
      expect(gaugeTypes.size).toBeGreaterThan(5); // Should have multiple gauge types

      // Check for manufacturer diversity
      const manufacturers = new Set(gauges.data.map(gauge => gauge.manufacturer));
      expect(manufacturers.size).toBeGreaterThan(5); // Should have multiple manufacturers

      // Check for location diversity
      const locations = new Set(gauges.data.map(gauge => gauge.location));
      expect(locations.size).toBeGreaterThan(5); // Should have multiple locations
    });
  });
});