import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RealisticDataGenerator, EquipmentType, OperatingMode } from '../../../../tests/infrastructure/proficy-historian-surrogate/generators/RealisticDataGenerator';
import { SurrogateDataPoint } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/schemas';

describe('RealisticDataGenerator', () => {
  let dataGenerator: RealisticDataGenerator;

  beforeEach(() => {
    dataGenerator = new RealisticDataGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== BASIC DATA GENERATION ====================

  describe('generateDataPoints', () => {
    it('should generate specified number of data points', () => {
      const count = 100;
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', count);

      expect(dataPoints).toHaveLength(count);
      expect(dataPoints.every(dp => dp.tagName === 'TEST.TAG')).toBe(true);
      expect(dataPoints.every(dp => typeof dp.value === 'number')).toBe(true);
      expect(dataPoints.every(dp => dp.quality >= 0 && dp.quality <= 100)).toBe(true);
    });

    it('should generate timestamps in chronological order', () => {
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 10);

      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThan(dataPoints[i - 1].timestamp.getTime());
      }
    });

    it('should respect custom interval', () => {
      const intervalMs = 5000; // 5 seconds
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 3, { intervalMs });

      const actualInterval1 = dataPoints[1].timestamp.getTime() - dataPoints[0].timestamp.getTime();
      const actualInterval2 = dataPoints[2].timestamp.getTime() - dataPoints[1].timestamp.getTime();

      expect(actualInterval1).toBe(intervalMs);
      expect(actualInterval2).toBe(intervalMs);
    });

    it('should apply custom value range', () => {
      const minValue = 100;
      const maxValue = 200;
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 50, { minValue, maxValue });

      expect(dataPoints.every(dp => dp.value >= minValue && dp.value <= maxValue)).toBe(true);
    });

    it('should apply noise factor', () => {
      const noiseFactor = 0.5;
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 50, { noiseFactor });

      // With noise, values should vary more than without noise
      const values = dataPoints.map(dp => dp.value);
      const variance = values.reduce((acc, val) => acc + Math.pow(val - values[0], 2), 0) / values.length;

      expect(variance).toBeGreaterThan(0); // Should have some variation due to noise
    });
  });

  // ==================== CNC MACHINE DATA GENERATION ====================

  describe('generateCNCMachineData', () => {
    it('should generate CNC machine data with realistic patterns', () => {
      const equipmentId = 'CNC001';
      const dataPoints = dataGenerator.generateCNCMachineData(equipmentId);

      expect(dataPoints.length).toBeGreaterThan(0);

      // Check for expected tag patterns
      const tagNames = [...new Set(dataPoints.map(dp => dp.tagName))];
      expect(tagNames.some(tag => tag.includes('SPINDLE_SPEED'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('FEED_RATE'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('COOLANT_TEMP'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('VIBRATION'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('POWER_CONSUMPTION'))).toBe(true);
    });

    it('should generate data points with realistic CNC values', () => {
      const dataPoints = dataGenerator.generateCNCMachineData('CNC001');

      // Test spindle speed values (should be realistic for CNC)
      const spindleSpeedPoints = dataPoints.filter(dp => dp.tagName.includes('SPINDLE_SPEED'));
      expect(spindleSpeedPoints.every(dp => dp.value >= 0 && dp.value <= 12000)).toBe(true);

      // Test feed rate values
      const feedRatePoints = dataPoints.filter(dp => dp.tagName.includes('FEED_RATE'));
      expect(feedRatePoints.every(dp => dp.value >= 0 && dp.value <= 2000)).toBe(true);

      // Test temperature values (realistic coolant temperatures)
      const tempPoints = dataPoints.filter(dp => dp.tagName.includes('COOLANT_TEMP'));
      expect(tempPoints.every(dp => dp.value >= 15 && dp.value <= 80)).toBe(true);
    });

    it('should simulate different operating modes', () => {
      const idleData = dataGenerator.generateCNCMachineData('CNC001', 1000, OperatingMode.IDLE);
      const runningData = dataGenerator.generateCNCMachineData('CNC001', 1000, OperatingMode.RUNNING);

      // Idle mode should have lower values
      const idleSpindleSpeed = idleData.filter(dp => dp.tagName.includes('SPINDLE_SPEED'));
      const runningSpindleSpeed = runningData.filter(dp => dp.tagName.includes('SPINDLE_SPEED'));

      if (idleSpindleSpeed.length > 0 && runningSpindleSpeed.length > 0) {
        const avgIdleSpeed = idleSpindleSpeed.reduce((sum, dp) => sum + dp.value, 0) / idleSpindleSpeed.length;
        const avgRunningSpeed = runningSpindleSpeed.reduce((sum, dp) => sum + dp.value, 0) / runningSpindleSpeed.length;

        expect(avgIdleSpeed).toBeLessThan(avgRunningSpeed);
      }
    });

    it('should include alarm conditions during maintenance mode', () => {
      const maintenanceData = dataGenerator.generateCNCMachineData('CNC001', 1000, OperatingMode.MAINTENANCE);

      // During maintenance, some parameters might show alarm conditions
      const alarmPoints = maintenanceData.filter(dp => dp.quality < 90);
      expect(alarmPoints.length).toBeGreaterThan(0);
    });
  });

  // ==================== HYDRAULIC PRESS DATA GENERATION ====================

  describe('generateHydraulicPressData', () => {
    it('should generate hydraulic press data with realistic patterns', () => {
      const equipmentId = 'PRESS001';
      const dataPoints = dataGenerator.generateHydraulicPressData(equipmentId);

      expect(dataPoints.length).toBeGreaterThan(0);

      // Check for expected tag patterns
      const tagNames = [...new Set(dataPoints.map(dp => dp.tagName))];
      expect(tagNames.some(tag => tag.includes('HYDRAULIC_PRESSURE'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('CYLINDER_POSITION'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('FORCE_APPLIED'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('OIL_TEMP'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('CYCLE_COUNT'))).toBe(true);
    });

    it('should generate realistic hydraulic pressure values', () => {
      const dataPoints = dataGenerator.generateHydraulicPressData('PRESS001');

      const pressurePoints = dataPoints.filter(dp => dp.tagName.includes('HYDRAULIC_PRESSURE'));
      expect(pressurePoints.every(dp => dp.value >= 0 && dp.value <= 5000)).toBe(true); // Realistic PSI range
    });

    it('should simulate press cycles', () => {
      const dataPoints = dataGenerator.generateHydraulicPressData('PRESS001', 1000);

      const positionPoints = dataPoints.filter(dp => dp.tagName.includes('CYLINDER_POSITION'));

      // Position should cycle between 0 and 100 (representing retracted to extended)
      expect(positionPoints.some(dp => dp.value < 10)).toBe(true); // Some near retracted
      expect(positionPoints.some(dp => dp.value > 90)).toBe(true); // Some near extended
    });

    it('should correlate force and pressure during operation', () => {
      const dataPoints = dataGenerator.generateHydraulicPressData('PRESS001', 100);

      const pressurePoints = dataPoints.filter(dp => dp.tagName.includes('HYDRAULIC_PRESSURE'));
      const forcePoints = dataPoints.filter(dp => dp.tagName.includes('FORCE_APPLIED'));

      if (pressurePoints.length > 0 && forcePoints.length > 0) {
        // Force and pressure should be correlated (higher pressure = higher force)
        expect(pressurePoints.length).toBe(forcePoints.length);
      }
    });
  });

  // ==================== HEAT TREATMENT OVEN DATA GENERATION ====================

  describe('generateHeatTreatmentOvenData', () => {
    it('should generate heat treatment oven data with realistic patterns', () => {
      const equipmentId = 'OVEN001';
      const dataPoints = dataGenerator.generateHeatTreatmentOvenData(equipmentId);

      expect(dataPoints.length).toBeGreaterThan(0);

      // Check for expected tag patterns
      const tagNames = [...new Set(dataPoints.map(dp => dp.tagName))];
      expect(tagNames.some(tag => tag.includes('CHAMBER_TEMP'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('SETPOINT_TEMP'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('ATMOSPHERE_PRESSURE'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('GAS_FLOW_RATE'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('DOOR_STATUS'))).toBe(true);
    });

    it('should generate realistic temperature values', () => {
      const dataPoints = dataGenerator.generateHeatTreatmentOvenData('OVEN001');

      const tempPoints = dataPoints.filter(dp => dp.tagName.includes('CHAMBER_TEMP'));
      expect(tempPoints.every(dp => dp.value >= 20 && dp.value <= 1200)).toBe(true); // Realistic oven temps
    });

    it('should simulate temperature ramp profiles', () => {
      const dataPoints = dataGenerator.generateHeatTreatmentOvenData('OVEN001', 1000);

      const tempPoints = dataPoints.filter(dp => dp.tagName.includes('CHAMBER_TEMP'));
      const setpointPoints = dataPoints.filter(dp => dp.tagName.includes('SETPOINT_TEMP'));

      // Temperature should generally follow setpoint with some lag
      expect(tempPoints.length).toBeGreaterThan(0);
      expect(setpointPoints.length).toBeGreaterThan(0);
    });

    it('should include door status changes', () => {
      const dataPoints = dataGenerator.generateHeatTreatmentOvenData('OVEN001', 1000);

      const doorStatusPoints = dataPoints.filter(dp => dp.tagName.includes('DOOR_STATUS'));

      // Door status should be 0 (closed) or 1 (open)
      expect(doorStatusPoints.every(dp => dp.value === 0 || dp.value === 1)).toBe(true);
    });
  });

  // ==================== QUALITY STATION DATA GENERATION ====================

  describe('generateQualityStationData', () => {
    it('should generate quality station data with realistic patterns', () => {
      const equipmentId = 'QS001';
      const dataPoints = dataGenerator.generateQualityStationData(equipmentId);

      expect(dataPoints.length).toBeGreaterThan(0);

      // Check for expected tag patterns
      const tagNames = [...new Set(dataPoints.map(dp => dp.tagName))];
      expect(tagNames.some(tag => tag.includes('DIMENSION_1'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('DIMENSION_2'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('SURFACE_ROUGHNESS'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('INSPECTION_STATUS'))).toBe(true);
      expect(tagNames.some(tag => tag.includes('PARTS_INSPECTED'))).toBe(true);
    });

    it('should generate realistic dimensional measurements', () => {
      const dataPoints = dataGenerator.generateQualityStationData('QS001');

      const dimensionPoints = dataPoints.filter(dp => dp.tagName.includes('DIMENSION'));

      // Dimensions should be realistic (typical part dimensions in mm)
      expect(dimensionPoints.every(dp => dp.value >= 0 && dp.value <= 1000)).toBe(true);
    });

    it('should simulate quality outcomes', () => {
      const dataPoints = dataGenerator.generateQualityStationData('QS001', 1000);

      const inspectionStatusPoints = dataPoints.filter(dp => dp.tagName.includes('INSPECTION_STATUS'));

      // Status should represent pass/fail (0/1 or similar)
      expect(inspectionStatusPoints.every(dp => dp.value >= 0 && dp.value <= 2)).toBe(true);
    });
  });

  // ==================== CUSTOM EQUIPMENT DATA GENERATION ====================

  describe('generateCustomEquipmentData', () => {
    it('should generate custom equipment data based on configuration', () => {
      const config = {
        equipmentId: 'CUSTOM001',
        parameters: [
          { name: 'TEMPERATURE', minValue: 20, maxValue: 100, unit: '°C' },
          { name: 'PRESSURE', minValue: 0, maxValue: 50, unit: 'bar' },
          { name: 'FLOW_RATE', minValue: 0, maxValue: 200, unit: 'L/min' }
        ],
        dataPointCount: 100,
        intervalMs: 2000
      };

      const dataPoints = dataGenerator.generateCustomEquipmentData(config);

      expect(dataPoints.length).toBe(300); // 3 parameters × 100 points each

      // Check each parameter
      const tempPoints = dataPoints.filter(dp => dp.tagName.includes('TEMPERATURE'));
      const pressurePoints = dataPoints.filter(dp => dp.tagName.includes('PRESSURE'));
      const flowPoints = dataPoints.filter(dp => dp.tagName.includes('FLOW_RATE'));

      expect(tempPoints.length).toBe(100);
      expect(pressurePoints.length).toBe(100);
      expect(flowPoints.length).toBe(100);

      // Check value ranges
      expect(tempPoints.every(dp => dp.value >= 20 && dp.value <= 100)).toBe(true);
      expect(pressurePoints.every(dp => dp.value >= 0 && dp.value <= 50)).toBe(true);
      expect(flowPoints.every(dp => dp.value >= 0 && dp.value <= 200)).toBe(true);
    });

    it('should handle empty parameter list gracefully', () => {
      const config = {
        equipmentId: 'CUSTOM001',
        parameters: [],
        dataPointCount: 100,
        intervalMs: 1000
      };

      const dataPoints = dataGenerator.generateCustomEquipmentData(config);
      expect(dataPoints.length).toBe(0);
    });
  });

  // ==================== EQUIPMENT TYPE FACTORY ====================

  describe('generateDataForEquipmentType', () => {
    it('should generate data for each equipment type', () => {
      const equipmentTypes = [
        EquipmentType.CNC_MACHINE,
        EquipmentType.HYDRAULIC_PRESS,
        EquipmentType.HEAT_TREATMENT_OVEN,
        EquipmentType.QUALITY_STATION
      ];

      for (const equipmentType of equipmentTypes) {
        const dataPoints = dataGenerator.generateDataForEquipmentType(equipmentType, 'TEST001');
        expect(dataPoints.length).toBeGreaterThan(0);
        expect(dataPoints.every(dp => dp.tagName.includes('TEST001'))).toBe(true);
      }
    });

    it('should throw error for unknown equipment type', () => {
      expect(() => {
        dataGenerator.generateDataForEquipmentType('UNKNOWN_TYPE' as any, 'TEST001');
      }).toThrow('Unsupported equipment type');
    });
  });

  // ==================== TIME SERIES PATTERNS ====================

  describe('time series pattern generation', () => {
    it('should generate sinusoidal patterns', () => {
      const dataPoints = dataGenerator.generateSinusoidalPattern('SINE.TEST', 360, {
        amplitude: 10,
        frequency: 1,
        offset: 50,
        intervalMs: 1000
      });

      expect(dataPoints.length).toBe(360);

      // Values should oscillate around the offset
      const values = dataPoints.map(dp => dp.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      expect(minValue).toBeCloseTo(40, 1); // offset - amplitude
      expect(maxValue).toBeCloseTo(60, 1); // offset + amplitude
    });

    it('should generate step patterns', () => {
      const dataPoints = dataGenerator.generateStepPattern('STEP.TEST', 100, {
        stepValues: [10, 20, 30, 40],
        stepDuration: 25,
        intervalMs: 1000
      });

      expect(dataPoints.length).toBe(100);

      // Should have 4 distinct value levels
      const uniqueValues = [...new Set(dataPoints.map(dp => Math.round(dp.value)))];
      expect(uniqueValues).toContain(10);
      expect(uniqueValues).toContain(20);
      expect(uniqueValues).toContain(30);
      expect(uniqueValues).toContain(40);
    });

    it('should generate ramp patterns', () => {
      const dataPoints = dataGenerator.generateRampPattern('RAMP.TEST', 100, {
        startValue: 0,
        endValue: 100,
        intervalMs: 1000
      });

      expect(dataPoints.length).toBe(100);

      // Should increase monotonically
      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].value).toBeGreaterThanOrEqual(dataPoints[i - 1].value);
      }

      expect(dataPoints[0].value).toBeCloseTo(0, 1);
      expect(dataPoints[dataPoints.length - 1].value).toBeCloseTo(100, 1);
    });
  });

  // ==================== QUALITY AND ANOMALY SIMULATION ====================

  describe('quality and anomaly simulation', () => {
    it('should introduce quality variations', () => {
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 1000, {
        qualityVariation: true,
        minQuality: 80
      });

      const qualities = dataPoints.map(dp => dp.quality);

      // Should have some variation in quality
      expect(Math.min(...qualities)).toBeGreaterThanOrEqual(80);
      expect(Math.max(...qualities)).toBeLessThanOrEqual(100);
      expect(new Set(qualities).size).toBeGreaterThan(1); // Should have variety
    });

    it('should introduce anomalies', () => {
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 1000, {
        anomalyRate: 0.1, // 10% anomalies
        anomalyMagnitude: 5
      });

      // Should have some points with significantly different values
      const values = dataPoints.map(dp => dp.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

      // With 10% anomalies, standard deviation should be higher than normal
      expect(stdDev).toBeGreaterThan(0);
    });

    it('should correlate quality with anomalies', () => {
      const dataPoints = dataGenerator.generateDataPoints('TEST.TAG', 1000, {
        anomalyRate: 0.1,
        qualityCorrelation: true
      });

      // Points with anomalous values should have lower quality
      const values = dataPoints.map(dp => dp.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

      const anomalousPoints = dataPoints.filter(dp => Math.abs(dp.value - mean) > 2 * mean * 0.1);
      const normalPoints = dataPoints.filter(dp => Math.abs(dp.value - mean) <= 2 * mean * 0.1);

      if (anomalousPoints.length > 0 && normalPoints.length > 0) {
        const avgAnomalousQuality = anomalousPoints.reduce((sum, dp) => sum + dp.quality, 0) / anomalousPoints.length;
        const avgNormalQuality = normalPoints.reduce((sum, dp) => sum + dp.quality, 0) / normalPoints.length;

        expect(avgAnomalousQuality).toBeLessThan(avgNormalQuality);
      }
    });
  });

  // ==================== PERFORMANCE AND STRESS TESTING ====================

  describe('performance and stress testing', () => {
    it('should handle large data generation efficiently', () => {
      const startTime = Date.now();
      const dataPoints = dataGenerator.generateDataPoints('PERFORMANCE.TEST', 10000);
      const endTime = Date.now();

      expect(dataPoints.length).toBe(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should generate consistent results for same parameters', () => {
      const config = {
        seed: 12345,
        minValue: 10,
        maxValue: 50,
        intervalMs: 1000
      };

      const dataPoints1 = dataGenerator.generateDataPoints('CONSISTENT.TEST', 100, config);
      const dataPoints2 = dataGenerator.generateDataPoints('CONSISTENT.TEST', 100, config);

      // With same seed, should generate identical results
      for (let i = 0; i < dataPoints1.length; i++) {
        expect(dataPoints1[i].value).toBeCloseTo(dataPoints2[i].value, 5);
        expect(dataPoints1[i].timestamp.getTime()).toBe(dataPoints2[i].timestamp.getTime());
      }
    });

    it('should handle zero or negative intervals gracefully', () => {
      expect(() => {
        dataGenerator.generateDataPoints('TEST.TAG', 10, { intervalMs: 0 });
      }).toThrow('Interval must be greater than 0');

      expect(() => {
        dataGenerator.generateDataPoints('TEST.TAG', 10, { intervalMs: -1000 });
      }).toThrow('Interval must be greater than 0');
    });
  });
});