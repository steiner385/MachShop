import { SurrogateDataPoint, SurrogateTag, TagDataType, CompressionType, StorageType } from '../storage/schemas';
import { RealisticDataGenerator } from '../generators/RealisticDataGenerator';
import { TrendGenerator, TrendDefinition } from '../generators/TrendGenerator';
import { NoiseGenerator, SensorNoiseProfile, EnvironmentConditions } from '../generators/NoiseGenerator';

/**
 * Test Data Scenarios
 * Provides predefined datasets and scenarios for testing the historian surrogate
 */
export class TestDataScenarios {
  private dataGenerator: RealisticDataGenerator;
  private trendGenerator: TrendGenerator;
  private noiseGenerator: NoiseGenerator;

  constructor() {
    this.dataGenerator = new RealisticDataGenerator();
    this.trendGenerator = new TrendGenerator();
    this.noiseGenerator = new NoiseGenerator();
  }

  /**
   * Generate complete manufacturing cell scenario
   */
  async generateManufacturingCellScenario(duration: number = 24 * 60 * 60 * 1000): Promise<TestScenario> {
    const equipmentList = [
      { id: 'CNC001', type: 'CNC_MACHINE', name: 'CNC Machining Center 1' },
      { id: 'CNC002', type: 'CNC_MACHINE', name: 'CNC Machining Center 2' },
      { id: 'PRESS001', type: 'HYDRAULIC_PRESS', name: 'Hydraulic Press 1' },
      { id: 'OVEN001', type: 'HEAT_TREATMENT', name: 'Heat Treatment Oven' },
      { id: 'QS001', type: 'QUALITY_STATION', name: 'Quality Inspection Station' },
      { id: 'ROBOT001', type: 'ROBOT', name: 'Material Handling Robot' }
    ];

    const tags: SurrogateTag[] = [];
    const dataPoints: SurrogateDataPoint[] = [];

    const startTime = new Date();

    for (const equipment of equipmentList) {
      // Generate tags for this equipment
      const equipmentTags = this.generateEquipmentTags(equipment);
      tags.push(...equipmentTags);

      // Generate data points for this equipment
      const equipmentData = await this.generateEquipmentDataSeries(
        equipment,
        startTime,
        duration,
        1000 // 1 second intervals
      );
      dataPoints.push(...equipmentData);
    }

    return {
      name: 'Manufacturing Cell - 24 Hour Operation',
      description: 'Complete manufacturing cell with multiple equipment types operating for 24 hours',
      tags,
      dataPoints,
      metadata: {
        equipmentCount: equipmentList.length,
        duration,
        dataPointInterval: 1000,
        totalDataPoints: dataPoints.length,
        startTime,
        endTime: new Date(startTime.getTime() + duration)
      }
    };
  }

  /**
   * Generate high-volume stress test scenario
   */
  async generateHighVolumeScenario(tagCount: number = 1000, duration: number = 60 * 60 * 1000): Promise<TestScenario> {
    const tags: SurrogateTag[] = [];
    const dataPoints: SurrogateDataPoint[] = [];

    const startTime = new Date();

    // Generate many tags
    for (let i = 1; i <= tagCount; i++) {
      const tagName = `STRESS_TEST.EQUIP${String(i).padStart(3, '0')}.SENSOR`;

      tags.push({
        id: `tag_${i}`,
        tagName,
        description: `Stress test sensor ${i}`,
        dataType: TagDataType.FLOAT,
        engineeringUnits: 'units',
        collector: 'STRESS_TEST',
        compressionType: CompressionType.SWINGING_DOOR,
        compressionDeviation: 0.1,
        storageType: StorageType.NORMAL,
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_scenario',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      });

      // Generate high-frequency data for each tag
      const pointCount = Math.floor(duration / 100); // 10 Hz data
      for (let j = 0; j < pointCount; j++) {
        const timestamp = new Date(startTime.getTime() + j * 100);
        const baseValue = 50 + Math.sin(j * 0.01) * 20; // Sinusoidal pattern
        const noise = this.noiseGenerator.generateWhiteNoise(1);

        dataPoints.push({
          tagName,
          timestamp,
          value: baseValue + noise,
          quality: 95 + Math.random() * 5
        });
      }
    }

    return {
      name: 'High Volume Stress Test',
      description: `${tagCount} tags with high-frequency data (10 Hz) for performance testing`,
      tags,
      dataPoints,
      metadata: {
        equipmentCount: tagCount,
        duration,
        dataPointInterval: 100,
        totalDataPoints: dataPoints.length,
        startTime,
        endTime: new Date(startTime.getTime() + duration)
      }
    };
  }

  /**
   * Generate quality control scenario with SPC data
   */
  async generateQualityControlScenario(duration: number = 8 * 60 * 60 * 1000): Promise<TestScenario> {
    const tags: SurrogateTag[] = [];
    const dataPoints: SurrogateDataPoint[] = [];

    const startTime = new Date();
    const measurementTypes = ['DIMENSION', 'SURFACE_ROUGHNESS', 'HARDNESS', 'ROUNDNESS'];
    const stations = ['QS001', 'QS002', 'QS003'];

    for (const station of stations) {
      for (const measurementType of measurementTypes) {
        const tagName = `QUALITY.${station}.${measurementType}`;

        // Create tag
        tags.push({
          id: `quality_${station}_${measurementType}`,
          tagName,
          description: `${measurementType} measurement at ${station}`,
          dataType: TagDataType.FLOAT,
          engineeringUnits: this.getQualityUnits(measurementType),
          collector: 'QUALITY_SYSTEM',
          compressionType: CompressionType.NONE, // Keep all quality data
          compressionDeviation: 0,
          storageType: StorageType.LAB,
          retentionHours: 168, // 1 week
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'quality_scenario',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 95
        });

        // Generate SPC data with control limits
        const controlLimits = this.getControlLimits(measurementType);
        const measurementInterval = 5 * 60 * 1000; // 5 minutes between measurements
        const pointCount = Math.floor(duration / measurementInterval);

        for (let i = 0; i < pointCount; i++) {
          const timestamp = new Date(startTime.getTime() + i * measurementInterval);

          // Generate measurement with process variation
          let value = controlLimits.target;

          // Add normal process variation
          value += this.noiseGenerator.generateWhiteNoise(controlLimits.processStd);

          // Occasionally introduce process shifts or trends
          if (Math.random() < 0.05) { // 5% chance of special cause
            if (Math.random() < 0.5) {
              // Process shift
              value += (Math.random() - 0.5) * controlLimits.processStd * 3;
            } else {
              // Trend (for next few points)
              const trendMagnitude = controlLimits.processStd * 0.5;
              value += trendMagnitude * Math.sin(i * 0.1);
            }
          }

          // Determine quality based on control limits
          let quality = 100;
          if (value < controlLimits.lowerControlLimit || value > controlLimits.upperControlLimit) {
            quality = 50; // Out of control
          } else if (value < controlLimits.lowerWarningLimit || value > controlLimits.upperWarningLimit) {
            quality = 75; // Warning zone
          }

          dataPoints.push({
            tagName,
            timestamp,
            value,
            quality
          });

          // Add control limit tags
          if (i === 0) {
            // Add control limit data points (static values)
            dataPoints.push(
              {
                tagName: `${tagName}_UCL`,
                timestamp,
                value: controlLimits.upperControlLimit,
                quality: 100
              },
              {
                tagName: `${tagName}_LCL`,
                timestamp,
                value: controlLimits.lowerControlLimit,
                quality: 100
              },
              {
                tagName: `${tagName}_TARGET`,
                timestamp,
                value: controlLimits.target,
                quality: 100
              }
            );
          }
        }
      }
    }

    return {
      name: 'Quality Control SPC Scenario',
      description: 'Quality measurement data with statistical process control patterns',
      tags,
      dataPoints,
      metadata: {
        equipmentCount: stations.length,
        duration,
        dataPointInterval: 5 * 60 * 1000,
        totalDataPoints: dataPoints.length,
        startTime,
        endTime: new Date(startTime.getTime() + duration)
      }
    };
  }

  /**
   * Generate alarm and event scenario
   */
  async generateAlarmScenario(duration: number = 4 * 60 * 60 * 1000): Promise<TestScenario> {
    const tags: SurrogateTag[] = [];
    const dataPoints: SurrogateDataPoint[] = [];

    const startTime = new Date();
    const equipmentList = ['CNC001', 'PRESS001', 'OVEN001'];
    const alarmTypes = [
      'HIGH_TEMPERATURE',
      'LOW_PRESSURE',
      'VIBRATION_ALARM',
      'MAINTENANCE_DUE',
      'TOOL_WEAR',
      'EMERGENCY_STOP'
    ];

    for (const equipment of equipmentList) {
      for (const alarmType of alarmTypes) {
        const tagName = `ALARM.${equipment}.${alarmType}`;

        // Create alarm tag
        tags.push({
          id: `alarm_${equipment}_${alarmType}`,
          tagName,
          description: `${alarmType} alarm for ${equipment}`,
          dataType: TagDataType.BOOLEAN,
          engineeringUnits: '',
          collector: 'ALARM_SYSTEM',
          compressionType: CompressionType.NONE,
          compressionDeviation: 0,
          storageType: StorageType.NORMAL,
          retentionHours: 168,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'alarm_scenario',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 100
        });

        // Generate alarm events
        const alarmEvents = this.generateAlarmEvents(alarmType, duration);

        for (const event of alarmEvents) {
          const eventTime = new Date(startTime.getTime() + event.timestamp);

          dataPoints.push({
            tagName,
            timestamp: eventTime,
            value: event.active,
            quality: 100
          });

          // If alarm becomes active, add severity and message tags
          if (event.active) {
            dataPoints.push(
              {
                tagName: `${tagName}_SEVERITY`,
                timestamp: eventTime,
                value: event.severity,
                quality: 100
              },
              {
                tagName: `${tagName}_MESSAGE`,
                timestamp: eventTime,
                value: event.message,
                quality: 100
              }
            );
          }
        }
      }
    }

    return {
      name: 'Alarm and Event Scenario',
      description: 'Equipment alarms and events with various severities and patterns',
      tags,
      dataPoints,
      metadata: {
        equipmentCount: equipmentList.length,
        duration,
        dataPointInterval: 0, // Event-driven
        totalDataPoints: dataPoints.length,
        startTime,
        endTime: new Date(startTime.getTime() + duration)
      }
    };
  }

  /**
   * Generate edge case and error scenario
   */
  async generateEdgeCaseScenario(): Promise<TestScenario> {
    const tags: SurrogateTag[] = [];
    const dataPoints: SurrogateDataPoint[] = [];

    const startTime = new Date();

    // Edge case tags with various data types and edge values
    const edgeCases = [
      { tagName: 'EDGE.NULL_VALUES', dataType: TagDataType.FLOAT, values: [null, undefined, NaN] },
      { tagName: 'EDGE.EXTREME_VALUES', dataType: TagDataType.FLOAT, values: [Number.MAX_VALUE, Number.MIN_VALUE, 0] },
      { tagName: 'EDGE.RAPID_CHANGES', dataType: TagDataType.FLOAT, values: [] }, // Will generate rapid oscillations
      { tagName: 'EDGE.UNICODE_STRINGS', dataType: TagDataType.STRING, values: ['测试', '🔧', 'Ω≈∆'] },
      { tagName: 'EDGE.BOOLEAN_EDGE', dataType: TagDataType.BOOLEAN, values: [true, false, 1, 0, 'true', 'false'] },
      { tagName: 'EDGE.TIMESTAMP_PRECISION', dataType: TagDataType.DATETIME, values: [] }
    ];

    for (const edgeCase of edgeCases) {
      // Create tag
      tags.push({
        id: `edge_${edgeCase.tagName.replace('.', '_')}`,
        tagName: edgeCase.tagName,
        description: `Edge case testing for ${edgeCase.tagName}`,
        dataType: edgeCase.dataType,
        engineeringUnits: '',
        collector: 'EDGE_TEST',
        compressionType: CompressionType.NONE,
        compressionDeviation: 0,
        storageType: StorageType.NORMAL,
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'edge_scenario',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 0 // Allow all qualities
      });

      // Generate edge case data
      if (edgeCase.tagName === 'EDGE.RAPID_CHANGES') {
        // Generate rapid oscillations
        for (let i = 0; i < 1000; i++) {
          const timestamp = new Date(startTime.getTime() + i * 10); // 100 Hz
          const value = i % 2 === 0 ? 100 : -100; // Rapid switching

          dataPoints.push({
            tagName: edgeCase.tagName,
            timestamp,
            value,
            quality: 100
          });
        }
      } else if (edgeCase.tagName === 'EDGE.TIMESTAMP_PRECISION') {
        // Generate microsecond precision timestamps
        for (let i = 0; i < 100; i++) {
          const timestamp = new Date(startTime.getTime() + i * 0.001); // Microsecond precision

          dataPoints.push({
            tagName: edgeCase.tagName,
            timestamp,
            value: timestamp.toISOString(),
            quality: 100
          });
        }
      } else {
        // Use predefined values
        edgeCase.values.forEach((value, index) => {
          const timestamp = new Date(startTime.getTime() + index * 1000);

          dataPoints.push({
            tagName: edgeCase.tagName,
            timestamp,
            value,
            quality: value === null || value === undefined ? 0 : 100
          });
        });
      }
    }

    return {
      name: 'Edge Cases and Error Conditions',
      description: 'Test data with edge cases, null values, extreme values, and error conditions',
      tags,
      dataPoints,
      metadata: {
        equipmentCount: 1,
        duration: 60000, // 1 minute
        dataPointInterval: 0, // Variable
        totalDataPoints: dataPoints.length,
        startTime,
        endTime: new Date(startTime.getTime() + 60000)
      }
    };
  }

  /**
   * Get all available test scenarios
   */
  async getAllScenarios(): Promise<{ [key: string]: () => Promise<TestScenario> }> {
    return {
      manufacturingCell: () => this.generateManufacturingCellScenario(),
      highVolume: () => this.generateHighVolumeScenario(),
      qualityControl: () => this.generateQualityControlScenario(),
      alarmEvents: () => this.generateAlarmScenario(),
      edgeCases: () => this.generateEdgeCaseScenario()
    };
  }

  // Private helper methods

  private generateEquipmentTags(equipment: { id: string; type: string; name: string }): SurrogateTag[] {
    const tags: SurrogateTag[] = [];
    const commonTags = this.getCommonTagsForEquipmentType(equipment.type);

    for (const tagInfo of commonTags) {
      tags.push({
        id: `${equipment.id}_${tagInfo.suffix}`,
        tagName: `EQUIPMENT.${equipment.id}.${tagInfo.suffix}`,
        description: `${tagInfo.description} for ${equipment.name}`,
        dataType: tagInfo.dataType,
        engineeringUnits: tagInfo.units,
        collector: 'MES',
        compressionType: CompressionType.SWINGING_DOOR,
        compressionDeviation: 0.1,
        storageType: StorageType.NORMAL,
        retentionHours: 168,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_scenario',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      });
    }

    return tags;
  }

  private getCommonTagsForEquipmentType(type: string): Array<{
    suffix: string;
    description: string;
    dataType: TagDataType;
    units: string;
  }> {
    const commonTags = [
      { suffix: 'STATUS', description: 'Equipment status', dataType: TagDataType.STRING, units: '' },
      { suffix: 'POWER', description: 'Power consumption', dataType: TagDataType.FLOAT, units: 'kW' },
      { suffix: 'TEMPERATURE', description: 'Operating temperature', dataType: TagDataType.FLOAT, units: '°C' }
    ];

    switch (type) {
      case 'CNC_MACHINE':
        return [
          ...commonTags,
          { suffix: 'SPINDLE_SPEED', description: 'Spindle speed', dataType: TagDataType.FLOAT, units: 'RPM' },
          { suffix: 'FEED_RATE', description: 'Feed rate', dataType: TagDataType.FLOAT, units: 'mm/min' },
          { suffix: 'VIBRATION', description: 'Machine vibration', dataType: TagDataType.FLOAT, units: 'mm/s' },
          { suffix: 'CYCLE_TIME', description: 'Cycle time', dataType: TagDataType.FLOAT, units: 'seconds' }
        ];

      case 'HYDRAULIC_PRESS':
        return [
          ...commonTags,
          { suffix: 'TONNAGE', description: 'Press tonnage', dataType: TagDataType.FLOAT, units: 'tons' },
          { suffix: 'POSITION', description: 'Ram position', dataType: TagDataType.FLOAT, units: 'mm' },
          { suffix: 'PRESSURE', description: 'Hydraulic pressure', dataType: TagDataType.FLOAT, units: 'bar' }
        ];

      case 'HEAT_TREATMENT':
        return [
          ...commonTags,
          { suffix: 'SETPOINT', description: 'Temperature setpoint', dataType: TagDataType.FLOAT, units: '°C' },
          { suffix: 'RAMP_RATE', description: 'Temperature ramp rate', dataType: TagDataType.FLOAT, units: '°C/min' }
        ];

      default:
        return commonTags;
    }
  }

  private async generateEquipmentDataSeries(
    equipment: { id: string; type: string; name: string },
    startTime: Date,
    duration: number,
    interval: number
  ): Promise<SurrogateDataPoint[]> {
    const dataPoints: SurrogateDataPoint[] = [];
    const pointCount = Math.floor(duration / interval);

    for (let i = 0; i < pointCount; i++) {
      const timestamp = new Date(startTime.getTime() + i * interval);

      let equipmentData: SurrogateDataPoint[] = [];

      switch (equipment.type) {
        case 'CNC_MACHINE':
          equipmentData = this.dataGenerator.generateCNCMachineData(equipment.id, interval);
          break;
        case 'HYDRAULIC_PRESS':
          equipmentData = this.dataGenerator.generatePressData(equipment.id, interval);
          break;
        case 'HEAT_TREATMENT':
          equipmentData = this.dataGenerator.generateProcessData(equipment.id, 'OVEN', interval);
          break;
        default:
          // Generate basic sensor data
          equipmentData = [{
            tagName: `EQUIPMENT.${equipment.id}.SENSOR`,
            timestamp,
            value: 50 + Math.sin(i * 0.01) * 10 + this.noiseGenerator.generateWhiteNoise(2),
            quality: 95 + Math.random() * 5
          }];
      }

      // Update timestamps to match our sequence
      equipmentData.forEach(point => {
        point.timestamp = timestamp;
      });

      dataPoints.push(...equipmentData);
    }

    return dataPoints;
  }

  private getQualityUnits(measurementType: string): string {
    switch (measurementType) {
      case 'DIMENSION': return 'mm';
      case 'SURFACE_ROUGHNESS': return 'μm Ra';
      case 'HARDNESS': return 'HRC';
      case 'ROUNDNESS': return 'μm';
      default: return 'units';
    }
  }

  private getControlLimits(measurementType: string): {
    target: number;
    upperControlLimit: number;
    lowerControlLimit: number;
    upperWarningLimit: number;
    lowerWarningLimit: number;
    processStd: number;
  } {
    switch (measurementType) {
      case 'DIMENSION':
        return {
          target: 50.0,
          upperControlLimit: 50.15,
          lowerControlLimit: 49.85,
          upperWarningLimit: 50.10,
          lowerWarningLimit: 49.90,
          processStd: 0.05
        };
      case 'SURFACE_ROUGHNESS':
        return {
          target: 1.6,
          upperControlLimit: 3.2,
          lowerControlLimit: 0.8,
          upperWarningLimit: 2.4,
          lowerWarningLimit: 1.2,
          processStd: 0.2
        };
      case 'HARDNESS':
        return {
          target: 60,
          upperControlLimit: 62,
          lowerControlLimit: 58,
          upperWarningLimit: 61,
          lowerWarningLimit: 59,
          processStd: 0.5
        };
      default:
        return {
          target: 50,
          upperControlLimit: 60,
          lowerControlLimit: 40,
          upperWarningLimit: 55,
          lowerWarningLimit: 45,
          processStd: 2
        };
    }
  }

  private generateAlarmEvents(alarmType: string, duration: number): Array<{
    timestamp: number;
    active: boolean;
    severity: string;
    message: string;
  }> {
    const events: Array<{
      timestamp: number;
      active: boolean;
      severity: string;
      message: string;
    }> = [];

    // Different alarm patterns based on type
    switch (alarmType) {
      case 'HIGH_TEMPERATURE':
        // Temperature alarms - gradual onset
        events.push(
          { timestamp: duration * 0.1, active: true, severity: 'WARNING', message: 'Temperature approaching limit' },
          { timestamp: duration * 0.12, active: false, severity: 'INFO', message: 'Temperature normal' },
          { timestamp: duration * 0.6, active: true, severity: 'CRITICAL', message: 'High temperature alarm' },
          { timestamp: duration * 0.65, active: false, severity: 'INFO', message: 'Temperature normal' }
        );
        break;

      case 'EMERGENCY_STOP':
        // E-stop - immediate and serious
        events.push(
          { timestamp: duration * 0.3, active: true, severity: 'CRITICAL', message: 'Emergency stop activated' },
          { timestamp: duration * 0.32, active: false, severity: 'INFO', message: 'Emergency stop reset' }
        );
        break;

      case 'MAINTENANCE_DUE':
        // Maintenance - predictable
        events.push(
          { timestamp: duration * 0.8, active: true, severity: 'WARNING', message: 'Scheduled maintenance due' }
        );
        break;

      default:
        // Generic alarm pattern
        for (let i = 0; i < 3; i++) {
          const alarmStart = (duration * 0.2) + (i * duration * 0.3);
          const alarmEnd = alarmStart + (duration * 0.05);

          events.push(
            { timestamp: alarmStart, active: true, severity: 'WARNING', message: `${alarmType} alarm active` },
            { timestamp: alarmEnd, active: false, severity: 'INFO', message: `${alarmType} alarm cleared` }
          );
        }
    }

    return events;
  }
}

/**
 * Test scenario interface
 */
export interface TestScenario {
  name: string;
  description: string;
  tags: SurrogateTag[];
  dataPoints: SurrogateDataPoint[];
  metadata: {
    equipmentCount: number;
    duration: number;
    dataPointInterval: number;
    totalDataPoints: number;
    startTime: Date;
    endTime: Date;
  };
}

export default TestDataScenarios;