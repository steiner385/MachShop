/**
 * Noise Generator
 * Generates realistic sensor noise patterns for manufacturing data
 */
export class NoiseGenerator {
  private noiseStates: Map<string, NoiseState> = new Map();

  /**
   * Generate white noise (random)
   */
  generateWhiteNoise(amplitude: number): number {
    return (Math.random() - 0.5) * 2 * amplitude;
  }

  /**
   * Generate pink noise (1/f noise - common in industrial sensors)
   */
  generatePinkNoise(tagName: string, amplitude: number): number {
    const state = this.getOrCreateNoiseState(tagName, 'PINK');

    // Simple pink noise approximation using multiple octaves
    let noise = 0;
    let octaveAmplitude = amplitude;

    for (let i = 0; i < 6; i++) {
      const octaveNoise = (Math.random() - 0.5) * 2 * octaveAmplitude;
      noise += octaveNoise;
      octaveAmplitude *= 0.5; // Each octave has half the amplitude
    }

    return noise / 6; // Normalize
  }

  /**
   * Generate colored noise with specific frequency characteristics
   */
  generateColoredNoise(tagName: string, amplitude: number, color: NoiseColor): number {
    switch (color) {
      case 'WHITE':
        return this.generateWhiteNoise(amplitude);
      case 'PINK':
        return this.generatePinkNoise(tagName, amplitude);
      case 'BROWN':
        return this.generateBrownNoise(tagName, amplitude);
      case 'BLUE':
        return this.generateBlueNoise(tagName, amplitude);
      default:
        return this.generateWhiteNoise(amplitude);
    }
  }

  /**
   * Generate brown noise (Brownian motion)
   */
  generateBrownNoise(tagName: string, amplitude: number): number {
    const state = this.getOrCreateNoiseState(tagName, 'BROWN');

    // Brown noise is integrated white noise
    const whiteNoise = this.generateWhiteNoise(amplitude * 0.1);
    state.accumulator = (state.accumulator || 0) + whiteNoise;

    // Apply decay to prevent unlimited growth
    state.accumulator *= 0.999;

    return state.accumulator;
  }

  /**
   * Generate blue noise (high-frequency emphasis)
   */
  generateBlueNoise(tagName: string, amplitude: number): number {
    const state = this.getOrCreateNoiseState(tagName, 'BLUE');

    // Blue noise emphasizes high frequencies
    const currentNoise = this.generateWhiteNoise(amplitude);
    const previousNoise = state.previousValue || 0;

    state.previousValue = currentNoise;

    // High-pass filter characteristic
    return currentNoise - 0.7 * previousNoise;
  }

  /**
   * Generate measurement quantization noise
   */
  generateQuantizationNoise(value: number, resolution: number): number {
    const quantizedValue = Math.round(value / resolution) * resolution;
    return quantizedValue;
  }

  /**
   * Generate electromagnetic interference (EMI) noise
   */
  generateEMINoise(amplitude: number, frequency: number, timestamp: number): number {
    // Simulate 50/60 Hz power line interference and harmonics
    const powerLineNoise = amplitude * 0.6 * Math.sin(2 * Math.PI * frequency * timestamp / 1000);
    const harmonicNoise = amplitude * 0.2 * Math.sin(2 * Math.PI * frequency * 3 * timestamp / 1000);
    const randomNoise = amplitude * 0.2 * this.generateWhiteNoise(1);

    return powerLineNoise + harmonicNoise + randomNoise;
  }

  /**
   * Generate temperature-dependent noise
   */
  generateTemperatureDependentNoise(baseAmplitude: number, temperature: number, referenceTemp = 25): number {
    // Noise typically increases with temperature
    const tempFactor = 1 + 0.02 * (temperature - referenceTemp); // 2% per degree C
    return this.generateWhiteNoise(baseAmplitude * tempFactor);
  }

  /**
   * Generate sensor drift noise
   */
  generateSensorDriftNoise(tagName: string, driftRate: number, maxDrift: number): number {
    const state = this.getOrCreateNoiseState(tagName, 'DRIFT');

    if (!state.driftValue) {
      state.driftValue = 0;
    }

    // Random walk with bounds
    const step = this.generateWhiteNoise(driftRate);
    state.driftValue += step;

    // Apply bounds
    state.driftValue = Math.max(-maxDrift, Math.min(maxDrift, state.driftValue));

    // Occasional drift reset (sensor recalibration)
    if (Math.random() < 0.0001) { // 0.01% chance per reading
      state.driftValue *= 0.1; // Reduce drift by 90%
    }

    return state.driftValue;
  }

  /**
   * Generate burst noise (impulse noise)
   */
  generateBurstNoise(burstProbability: number, burstAmplitude: number): number {
    if (Math.random() < burstProbability) {
      return this.generateWhiteNoise(burstAmplitude);
    }
    return 0;
  }

  /**
   * Generate vibration-induced noise
   */
  generateVibrationNoise(vibrationLevel: number, frequency: number, timestamp: number): number {
    // Multiple vibration sources with different frequencies
    const fundamentalVib = vibrationLevel * Math.sin(2 * Math.PI * frequency * timestamp / 1000);
    const harmonicVib = vibrationLevel * 0.3 * Math.sin(2 * Math.PI * frequency * 2 * timestamp / 1000);
    const randomVib = vibrationLevel * 0.2 * this.generateWhiteNoise(1);

    return fundamentalVib + harmonicVib + randomVib;
  }

  /**
   * Generate aging-related noise
   */
  generateAgingNoise(tagName: string, equipmentAge: number, baseAmplitude: number): number {
    const state = this.getOrCreateNoiseState(tagName, 'AGING');

    // Noise increases with age (non-linearly)
    const agingFactor = 1 + Math.pow(equipmentAge / 1000, 1.5); // Age in hours
    const adjustedAmplitude = baseAmplitude * agingFactor;

    return this.generatePinkNoise(tagName + '_aging', adjustedAmplitude);
  }

  /**
   * Generate supply voltage variation noise
   */
  generateSupplyVariationNoise(nominalVoltage: number, tolerance: number, timestamp: number): number {
    // Slow voltage variations
    const slowVariation = tolerance * 0.5 * Math.sin(2 * Math.PI * 0.01 * timestamp / 1000); // 0.01 Hz
    // Fast fluctuations
    const fastVariation = tolerance * 0.2 * this.generateWhiteNoise(1);

    return nominalVoltage + slowVariation + fastVariation;
  }

  /**
   * Apply comprehensive sensor noise model
   */
  applySensorNoiseModel(
    tagName: string,
    cleanValue: number,
    noiseProfile: SensorNoiseProfile,
    environment: EnvironmentConditions,
    timestamp: number
  ): number {
    let noisyValue = cleanValue;

    // Base noise
    if (noiseProfile.baseNoise) {
      noisyValue += this.generateColoredNoise(
        tagName,
        noiseProfile.baseNoise.amplitude,
        noiseProfile.baseNoise.color
      );
    }

    // Temperature-dependent noise
    if (noiseProfile.temperatureDependentNoise) {
      noisyValue += this.generateTemperatureDependentNoise(
        noiseProfile.temperatureDependentNoise.baseAmplitude,
        environment.temperature
      );
    }

    // EMI noise
    if (noiseProfile.emiNoise) {
      noisyValue += this.generateEMINoise(
        noiseProfile.emiNoise.amplitude,
        noiseProfile.emiNoise.frequency,
        timestamp
      );
    }

    // Vibration noise
    if (noiseProfile.vibrationNoise && environment.vibrationLevel > 0) {
      noisyValue += this.generateVibrationNoise(
        environment.vibrationLevel * noiseProfile.vibrationNoise.sensitivity,
        noiseProfile.vibrationNoise.resonantFrequency,
        timestamp
      );
    }

    // Sensor drift
    if (noiseProfile.drift) {
      noisyValue += this.generateSensorDriftNoise(
        tagName,
        noiseProfile.drift.rate,
        noiseProfile.drift.maxDrift
      );
    }

    // Burst noise
    if (noiseProfile.burstNoise) {
      noisyValue += this.generateBurstNoise(
        noiseProfile.burstNoise.probability,
        noiseProfile.burstNoise.amplitude
      );
    }

    // Aging effects
    if (noiseProfile.aging && environment.equipmentAge > 0) {
      noisyValue += this.generateAgingNoise(
        tagName,
        environment.equipmentAge,
        noiseProfile.aging.baseAmplitude
      );
    }

    // Quantization
    if (noiseProfile.quantization) {
      noisyValue = this.generateQuantizationNoise(noisyValue, noiseProfile.quantization.resolution);
    }

    return noisyValue;
  }

  /**
   * Get predefined noise profiles for common sensor types
   */
  static getCommonNoiseProfiles(): { [sensorType: string]: SensorNoiseProfile } {
    return {
      thermocouple: {
        baseNoise: { amplitude: 0.1, color: 'PINK' },
        temperatureDependentNoise: { baseAmplitude: 0.05 },
        emiNoise: { amplitude: 0.2, frequency: 50 },
        drift: { rate: 0.01, maxDrift: 2.0 },
        aging: { baseAmplitude: 0.02 },
        quantization: { resolution: 0.1 }
      },

      pressureTransducer: {
        baseNoise: { amplitude: 0.05, color: 'WHITE' },
        temperatureDependentNoise: { baseAmplitude: 0.02 },
        vibrationNoise: { sensitivity: 0.1, resonantFrequency: 1000 },
        drift: { rate: 0.005, maxDrift: 1.0 },
        quantization: { resolution: 0.01 }
      },

      vibrationSensor: {
        baseNoise: { amplitude: 0.02, color: 'BLUE' },
        emiNoise: { amplitude: 0.05, frequency: 60 },
        burstNoise: { probability: 0.001, amplitude: 0.5 },
        aging: { baseAmplitude: 0.01 },
        quantization: { resolution: 0.001 }
      },

      positionEncoder: {
        baseNoise: { amplitude: 0.001, color: 'WHITE' },
        emiNoise: { amplitude: 0.002, frequency: 50 },
        vibrationNoise: { sensitivity: 0.05, resonantFrequency: 500 },
        quantization: { resolution: 0.001 }
      },

      flowMeter: {
        baseNoise: { amplitude: 0.1, color: 'PINK' },
        temperatureDependentNoise: { baseAmplitude: 0.05 },
        vibrationNoise: { sensitivity: 0.2, resonantFrequency: 100 },
        drift: { rate: 0.02, maxDrift: 5.0 },
        burstNoise: { probability: 0.0005, amplitude: 1.0 }
      }
    };
  }

  // Private helper methods

  private getOrCreateNoiseState(tagName: string, noiseType: string): NoiseState {
    const key = `${tagName}_${noiseType}`;
    if (!this.noiseStates.has(key)) {
      this.noiseStates.set(key, {});
    }
    return this.noiseStates.get(key)!;
  }
}

/**
 * Noise color types
 */
export type NoiseColor = 'WHITE' | 'PINK' | 'BROWN' | 'BLUE';

/**
 * Noise state for stateful noise generators
 */
interface NoiseState {
  accumulator?: number;
  previousValue?: number;
  driftValue?: number;
  [key: string]: any;
}

/**
 * Comprehensive sensor noise profile
 */
export interface SensorNoiseProfile {
  baseNoise?: {
    amplitude: number;
    color: NoiseColor;
  };
  temperatureDependentNoise?: {
    baseAmplitude: number;
  };
  emiNoise?: {
    amplitude: number;
    frequency: number; // Hz
  };
  vibrationNoise?: {
    sensitivity: number;
    resonantFrequency: number; // Hz
  };
  drift?: {
    rate: number;
    maxDrift: number;
  };
  burstNoise?: {
    probability: number;
    amplitude: number;
  };
  aging?: {
    baseAmplitude: number;
  };
  quantization?: {
    resolution: number;
  };
}

/**
 * Environment conditions affecting noise
 */
export interface EnvironmentConditions {
  temperature: number; // °C
  vibrationLevel: number; // Normalized 0-1
  equipmentAge: number; // Hours of operation
  electricalNoise: number; // Normalized 0-1
}

export default NoiseGenerator;