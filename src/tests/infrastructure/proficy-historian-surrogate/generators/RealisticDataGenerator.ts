import { SurrogateDataPoint, TagValue } from '../storage/schemas';

/**
 * Realistic Data Generator
 * Generates believable time-series data patterns for manufacturing equipment
 */
export class RealisticDataGenerator {
  private startTime: number;
  private currentTime: number;
  private generatorStates: Map<string, GeneratorState> = new Map();

  constructor() {
    this.startTime = Date.now();
    this.currentTime = this.startTime;
  }

  /**
   * Generate data points for CNC machine operation
   */
  generateCNCMachineData(equipmentId: string, intervalMs = 1000): SurrogateDataPoint[] {
    const state = this.getOrCreateState(`CNC_${equipmentId}`, {
      operatingMode: 'IDLE',
      cyclePhase: 'IDLE',
      cycleStartTime: 0,
      partCount: 0,
      toolNumber: 1,
      spindleSpeed: 0,
      feedRate: 0,
      coolantFlow: false,
      alarmActive: false,
      lastMaintenanceHours: Math.random() * 100
    });

    const dataPoints: SurrogateDataPoint[] = [];
    const timestamp = new Date(this.currentTime);

    // Update operating state
    this.updateCNCOperatingState(state);

    // Generate spindle speed
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.SPINDLE_SPEED`,
      timestamp,
      value: this.generateSpindleSpeed(state),
      quality: this.generateQuality(state)
    });

    // Generate feed rate
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.FEED_RATE`,
      timestamp,
      value: this.generateFeedRate(state),
      quality: this.generateQuality(state)
    });

    // Generate cutting temperature
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.TEMPERATURE`,
      timestamp,
      value: this.generateCuttingTemperature(state),
      quality: this.generateQuality(state)
    });

    // Generate vibration
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.VIBRATION`,
      timestamp,
      value: this.generateVibration(state),
      quality: this.generateQuality(state)
    });

    // Generate power consumption
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.POWER`,
      timestamp,
      value: this.generatePowerConsumption(state),
      quality: this.generateQuality(state)
    });

    // Generate status
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.STATUS`,
      timestamp,
      value: state.operatingMode,
      quality: 100
    });

    // Generate cycle time (when cycle completes)
    if (state.cyclePhase === 'COMPLETED') {
      const cycleTime = (this.currentTime - state.cycleStartTime) / 1000;
      dataPoints.push({
        tagName: `EQUIPMENT.${equipmentId}.CYCLE_TIME`,
        timestamp,
        value: cycleTime,
        quality: 100
      });
    }

    // Generate alarms
    if (state.alarmActive) {
      dataPoints.push({
        tagName: `EQUIPMENT.${equipmentId}.ALARM`,
        timestamp,
        value: true,
        quality: 100
      });
    }

    // Update time
    this.currentTime += intervalMs;

    return dataPoints;
  }

  /**
   * Generate data points for press operation
   */
  generatePressData(equipmentId: string, intervalMs = 500): SurrogateDataPoint[] {
    const state = this.getOrCreateState(`PRESS_${equipmentId}`, {
      operatingMode: 'IDLE',
      cyclePhase: 'IDLE',
      cycleStartTime: 0,
      targetTonnage: 100,
      currentPosition: 0,
      cycleCount: 0,
      pressureBuildup: false
    });

    const dataPoints: SurrogateDataPoint[] = [];
    const timestamp = new Date(this.currentTime);

    // Update press operating state
    this.updatePressOperatingState(state);

    // Generate tonnage
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.TONNAGE`,
      timestamp,
      value: this.generatePressTonnage(state),
      quality: this.generateQuality(state)
    });

    // Generate position
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.POSITION`,
      timestamp,
      value: this.generatePressPosition(state),
      quality: this.generateQuality(state)
    });

    // Generate hydraulic pressure
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.PRESSURE`,
      timestamp,
      value: this.generateHydraulicPressure(state),
      quality: this.generateQuality(state)
    });

    // Generate die temperature
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.DIE_TEMPERATURE`,
      timestamp,
      value: this.generateDieTemperature(state),
      quality: this.generateQuality(state)
    });

    // Generate cycle count
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.CYCLE_COUNT`,
      timestamp,
      value: state.cycleCount,
      quality: 100
    });

    this.currentTime += intervalMs;
    return dataPoints;
  }

  /**
   * Generate data points for process monitoring (oven, furnace, etc.)
   */
  generateProcessData(equipmentId: string, processType: 'OVEN' | 'FURNACE' | 'TANK', intervalMs = 2000): SurrogateDataPoint[] {
    const state = this.getOrCreateState(`PROCESS_${equipmentId}`, {
      operatingMode: 'IDLE',
      setpoint: processType === 'FURNACE' ? 850 : processType === 'OVEN' ? 200 : 80,
      currentValue: 20,
      rampRate: processType === 'FURNACE' ? 5 : 2,
      processPhase: 'IDLE',
      recipeStep: 0,
      alarmActive: false
    });

    const dataPoints: SurrogateDataPoint[] = [];
    const timestamp = new Date(this.currentTime);

    // Update process state
    this.updateProcessState(state, processType);

    // Generate temperature/level based on process type
    const measurementTag = processType === 'TANK' ? 'LEVEL' : 'TEMPERATURE';
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.${measurementTag}`,
      timestamp,
      value: this.generateProcessMeasurement(state, processType),
      quality: this.generateQuality(state)
    });

    // Generate setpoint
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.SETPOINT`,
      timestamp,
      value: state.setpoint,
      quality: 100
    });

    // Generate flow rate (for tank processes)
    if (processType === 'TANK') {
      dataPoints.push({
        tagName: `EQUIPMENT.${equipmentId}.FLOW_RATE`,
        timestamp,
        value: this.generateFlowRate(state),
        quality: this.generateQuality(state)
      });
    }

    // Generate pressure
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.PRESSURE`,
      timestamp,
      value: this.generateProcessPressure(state, processType),
      quality: this.generateQuality(state)
    });

    // Generate process status
    dataPoints.push({
      tagName: `EQUIPMENT.${equipmentId}.STATUS`,
      timestamp,
      value: state.operatingMode,
      quality: 100
    });

    this.currentTime += intervalMs;
    return dataPoints;
  }

  /**
   * Generate quality measurement data
   */
  generateQualityData(stationId: string, measurementType: 'DIMENSION' | 'SURFACE' | 'HARDNESS'): SurrogateDataPoint[] {
    const state = this.getOrCreateState(`QUALITY_${stationId}`, {
      measurementCount: 0,
      controlLimits: this.getControlLimits(measurementType),
      processShift: 0,
      processVariation: 1
    });

    const dataPoints: SurrogateDataPoint[] = [];
    const timestamp = new Date(this.currentTime);

    // Generate measurement value with statistical control
    const measurement = this.generateQualityMeasurement(state, measurementType);
    const withinLimits = measurement >= state.controlLimits.lower && measurement <= state.controlLimits.upper;

    dataPoints.push({
      tagName: `QUALITY.${stationId}.${measurementType}`,
      timestamp,
      value: measurement,
      quality: withinLimits ? 100 : 50 // Lower quality for out-of-spec measurements
    });

    // Generate control chart statistics
    dataPoints.push({
      tagName: `QUALITY.${stationId}.${measurementType}_UCL`,
      timestamp,
      value: state.controlLimits.upper,
      quality: 100
    });

    dataPoints.push({
      tagName: `QUALITY.${stationId}.${measurementType}_LCL`,
      timestamp,
      value: state.controlLimits.lower,
      quality: 100
    });

    state.measurementCount++;
    this.currentTime += 30000; // Quality measurements typically less frequent

    return dataPoints;
  }

  /**
   * Generate equipment alarm data
   */
  generateAlarmData(equipmentId: string): SurrogateDataPoint[] {
    const state = this.getOrCreateState(`ALARM_${equipmentId}`, {
      alarmHistory: [],
      maintenanceHours: Math.random() * 1000,
      vibrationTrend: 'STABLE',
      temperatureTrend: 'STABLE'
    });

    const dataPoints: SurrogateDataPoint[] = [];
    const timestamp = new Date(this.currentTime);

    // Simulate various alarm conditions
    const alarms = this.generateAlarmConditions(state);

    for (const alarm of alarms) {
      dataPoints.push({
        tagName: `EQUIPMENT.${equipmentId}.ALARM_${alarm.type}`,
        timestamp,
        value: alarm.active,
        quality: 100
      });

      if (alarm.active && alarm.severity) {
        dataPoints.push({
          tagName: `EQUIPMENT.${equipmentId}.ALARM_${alarm.type}_SEVERITY`,
          timestamp,
          value: alarm.severity,
          quality: 100
        });
      }
    }

    return dataPoints;
  }

  // Private helper methods

  private getOrCreateState(key: string, defaultState: any): GeneratorState {
    if (!this.generatorStates.has(key)) {
      this.generatorStates.set(key, { ...defaultState });
    }
    return this.generatorStates.get(key)!;
  }

  private updateCNCOperatingState(state: GeneratorState): void {
    const elapsedTime = this.currentTime - this.startTime;
    const cycleTime = 45000; // 45 second cycles

    // State machine for CNC operation
    switch (state.operatingMode) {
      case 'IDLE':
        if (Math.random() < 0.02) { // 2% chance to start
          state.operatingMode = 'SETUP';
          state.cyclePhase = 'SETUP';
          state.cycleStartTime = this.currentTime;
        }
        break;

      case 'SETUP':
        if (this.currentTime - state.cycleStartTime > 10000) { // 10 sec setup
          state.operatingMode = 'RUNNING';
          state.cyclePhase = 'CUTTING';
        }
        break;

      case 'RUNNING':
        const cycleProgress = (this.currentTime - state.cycleStartTime) % cycleTime;
        if (cycleProgress < 15000) {
          state.cyclePhase = 'CUTTING';
        } else if (cycleProgress < 30000) {
          state.cyclePhase = 'RAPID';
        } else if (cycleProgress < 40000) {
          state.cyclePhase = 'TOOL_CHANGE';
        } else {
          state.cyclePhase = 'COMPLETED';
          state.partCount++;
        }

        // Occasional maintenance or errors
        if (Math.random() < 0.001) { // 0.1% chance
          state.operatingMode = 'MAINTENANCE';
          state.alarmActive = true;
        }
        break;

      case 'MAINTENANCE':
        if (Math.random() < 0.05) { // 5% chance to complete maintenance
          state.operatingMode = 'IDLE';
          state.alarmActive = false;
          state.lastMaintenanceHours = 0;
        }
        break;
    }
  }

  private generateSpindleSpeed(state: GeneratorState): number {
    const baseSpeed = 1200;

    switch (state.cyclePhase) {
      case 'CUTTING':
        return baseSpeed + this.generateNoise(50) + Math.sin(this.currentTime / 1000) * 20;
      case 'RAPID':
        return baseSpeed * 0.3 + this.generateNoise(20);
      case 'TOOL_CHANGE':
        return this.generateNoise(10);
      default:
        return this.generateNoise(5);
    }
  }

  private generateFeedRate(state: GeneratorState): number {
    const baseFeed = 300;

    switch (state.cyclePhase) {
      case 'CUTTING':
        return baseFeed + this.generateNoise(10) + Math.sin(this.currentTime / 2000) * 15;
      case 'RAPID':
        return baseFeed * 2 + this.generateNoise(20);
      default:
        return this.generateNoise(2);
    }
  }

  private generateCuttingTemperature(state: GeneratorState): number {
    const ambientTemp = 22;
    const maxTemp = 85;

    switch (state.cyclePhase) {
      case 'CUTTING':
        return maxTemp + this.generateNoise(5) + Math.sin(this.currentTime / 3000) * 8;
      case 'RAPID':
        return ambientTemp + 20 + this.generateNoise(3);
      default:
        return ambientTemp + this.generateNoise(2);
    }
  }

  private generateVibration(state: GeneratorState): number {
    const baseVibration = 0.5;

    switch (state.cyclePhase) {
      case 'CUTTING':
        return baseVibration + this.generateNoise(0.2) + Math.sin(this.currentTime / 500) * 0.3;
      case 'TOOL_CHANGE':
        return baseVibration * 2 + this.generateNoise(0.4);
      default:
        return baseVibration + this.generateNoise(0.1);
    }
  }

  private generatePowerConsumption(state: GeneratorState): number {
    const idlePower = 2.5; // kW
    const maxPower = 15.0;

    switch (state.cyclePhase) {
      case 'CUTTING':
        return maxPower + this.generateNoise(1.0) + Math.sin(this.currentTime / 1500) * 2;
      case 'RAPID':
        return maxPower * 0.6 + this.generateNoise(0.5);
      case 'TOOL_CHANGE':
        return idlePower * 1.5 + this.generateNoise(0.3);
      default:
        return idlePower + this.generateNoise(0.2);
    }
  }

  private updatePressOperatingState(state: GeneratorState): void {
    const cycleTime = 8000; // 8 second press cycles

    if (state.operatingMode === 'IDLE' && Math.random() < 0.05) {
      state.operatingMode = 'RUNNING';
      state.cycleStartTime = this.currentTime;
      state.cyclePhase = 'APPROACH';
    }

    if (state.operatingMode === 'RUNNING') {
      const cycleProgress = this.currentTime - state.cycleStartTime;

      if (cycleProgress < 2000) {
        state.cyclePhase = 'APPROACH';
      } else if (cycleProgress < 4000) {
        state.cyclePhase = 'PRESS';
        state.pressureBuildup = true;
      } else if (cycleProgress < 6000) {
        state.cyclePhase = 'DWELL';
      } else if (cycleProgress < 8000) {
        state.cyclePhase = 'RETURN';
        state.pressureBuildup = false;
      } else {
        state.cyclePhase = 'COMPLETED';
        state.cycleCount++;
        if (Math.random() < 0.8) { // 80% chance to continue
          state.cycleStartTime = this.currentTime;
          state.cyclePhase = 'APPROACH';
        } else {
          state.operatingMode = 'IDLE';
        }
      }
    }
  }

  private generatePressTonnage(state: GeneratorState): number {
    switch (state.cyclePhase) {
      case 'PRESS':
        return state.targetTonnage + this.generateNoise(5) + Math.sin(this.currentTime / 200) * 10;
      case 'DWELL':
        return state.targetTonnage + this.generateNoise(2);
      default:
        return this.generateNoise(1);
    }
  }

  private generatePressPosition(state: GeneratorState): number {
    const maxPosition = 100; // mm

    switch (state.cyclePhase) {
      case 'APPROACH':
        const approachProgress = (this.currentTime - state.cycleStartTime) / 2000;
        return maxPosition * (1 - approachProgress) + this.generateNoise(0.5);
      case 'PRESS':
      case 'DWELL':
        return this.generateNoise(0.2);
      case 'RETURN':
        const returnProgress = (this.currentTime - state.cycleStartTime - 4000) / 2000;
        return maxPosition * returnProgress + this.generateNoise(0.5);
      default:
        return maxPosition + this.generateNoise(0.1);
    }
  }

  private generateHydraulicPressure(state: GeneratorState): number {
    const maxPressure = 200; // bar

    if (state.pressureBuildup) {
      return maxPressure + this.generateNoise(5) + Math.sin(this.currentTime / 300) * 15;
    } else {
      return 20 + this.generateNoise(2); // Base pressure
    }
  }

  private generateDieTemperature(state: GeneratorState): number {
    const baseTemp = 45;
    const cycleHeat = state.cycleCount * 0.1; // Gradual heating with cycles

    return baseTemp + cycleHeat + this.generateNoise(2) + Math.sin(this.currentTime / 10000) * 5;
  }

  private updateProcessState(state: GeneratorState, processType: string): void {
    // Simple process state machine
    if (state.operatingMode === 'IDLE' && Math.random() < 0.01) {
      state.operatingMode = 'RUNNING';
      state.processPhase = 'RAMP_UP';
    }

    if (state.operatingMode === 'RUNNING') {
      const tempDiff = state.setpoint - state.currentValue;
      if (Math.abs(tempDiff) > 5) {
        state.processPhase = tempDiff > 0 ? 'RAMP_UP' : 'RAMP_DOWN';
      } else {
        state.processPhase = 'AT_SETPOINT';
      }
    }
  }

  private generateProcessMeasurement(state: GeneratorState, processType: string): number {
    const tempDiff = state.setpoint - state.currentValue;

    if (state.processPhase === 'RAMP_UP') {
      state.currentValue += state.rampRate * 0.1;
    } else if (state.processPhase === 'RAMP_DOWN') {
      state.currentValue -= state.rampRate * 0.1;
    }

    // Add some overshoot and oscillation
    const overshoot = state.processPhase === 'AT_SETPOINT' ? Math.sin(this.currentTime / 5000) * 2 : 0;

    return state.currentValue + overshoot + this.generateNoise(1);
  }

  private generateFlowRate(state: GeneratorState): number {
    const baseFlow = 50; // L/min

    switch (state.processPhase) {
      case 'RAMP_UP':
        return baseFlow * 1.5 + this.generateNoise(5);
      case 'RAMP_DOWN':
        return baseFlow * 0.3 + this.generateNoise(2);
      default:
        return baseFlow + this.generateNoise(3);
    }
  }

  private generateProcessPressure(state: GeneratorState, processType: string): number {
    const basePressure = processType === 'FURNACE' ? 1.2 : processType === 'OVEN' ? 1.05 : 2.5;

    return basePressure + this.generateNoise(0.1) + Math.sin(this.currentTime / 8000) * 0.2;
  }

  private getControlLimits(measurementType: string): { lower: number; upper: number; target: number } {
    switch (measurementType) {
      case 'DIMENSION':
        return { lower: 49.95, upper: 50.05, target: 50.0 }; // mm
      case 'SURFACE':
        return { lower: 0.8, upper: 3.2, target: 2.0 }; // Ra μm
      case 'HARDNESS':
        return { lower: 58, upper: 62, target: 60 }; // HRC
      default:
        return { lower: 0, upper: 100, target: 50 };
    }
  }

  private generateQualityMeasurement(state: GeneratorState, measurementType: string): number {
    const { target } = state.controlLimits;

    // Simulate process variation with occasional shifts
    if (Math.random() < 0.01) { // 1% chance of process shift
      state.processShift = (Math.random() - 0.5) * 0.02; // ±1% shift
    }

    // Generate measurement with normal distribution
    const measurement = target + (target * state.processShift) + this.generateNormalNoise() * state.processVariation;

    return Math.max(0, measurement); // Ensure non-negative values
  }

  private generateAlarmConditions(state: GeneratorState): Array<{ type: string; active: boolean; severity?: string }> {
    const alarms = [];

    // Maintenance-based alarms
    if (state.maintenanceHours > 800) {
      alarms.push({ type: 'MAINTENANCE_DUE', active: true, severity: 'WARNING' });
    }

    // Random fault conditions
    if (Math.random() < 0.001) { // 0.1% chance
      alarms.push({ type: 'FAULT', active: true, severity: 'CRITICAL' });
    }

    // Temperature alarms
    if (Math.random() < 0.005) {
      alarms.push({ type: 'HIGH_TEMPERATURE', active: true, severity: 'WARNING' });
    }

    return alarms;
  }

  private generateQuality(state: GeneratorState): number {
    // Generate quality based on operating conditions
    if (state.alarmActive) return 50;
    if (state.operatingMode === 'MAINTENANCE') return 0;
    return 95 + this.generateNoise(5);
  }

  private generateNoise(amplitude: number): number {
    return (Math.random() - 0.5) * 2 * amplitude;
  }

  private generateNormalNoise(): number {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Reset generator time (for testing)
   */
  resetTime(): void {
    this.startTime = Date.now();
    this.currentTime = this.startTime;
  }

  /**
   * Set current time (for testing)
   */
  setTime(timestamp: number): void {
    this.currentTime = timestamp;
  }
}

/**
 * Generator state interface
 */
interface GeneratorState {
  [key: string]: any;
}

export default RealisticDataGenerator;