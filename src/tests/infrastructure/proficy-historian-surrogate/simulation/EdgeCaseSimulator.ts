import { Request, Response, NextFunction } from 'express';
import { SurrogateDataPoint, TagValue } from '../storage/schemas';

/**
 * Edge Case Simulator
 * Provides specialized edge case and boundary condition testing scenarios
 */
export class EdgeCaseSimulator {
  private edgeCaseScenarios: Map<string, EdgeCaseScenario> = new Map();
  private activeScenarios: Set<string> = new Set();

  constructor() {
    this.initializeDefaultScenarios();
  }

  /**
   * Activate an edge case scenario
   */
  activateScenario(scenarioName: string): void {
    if (this.edgeCaseScenarios.has(scenarioName)) {
      this.activeScenarios.add(scenarioName);
      console.log(`Edge case scenario activated: ${scenarioName}`);
    } else {
      throw new Error(`Unknown edge case scenario: ${scenarioName}`);
    }
  }

  /**
   * Deactivate an edge case scenario
   */
  deactivateScenario(scenarioName: string): void {
    this.activeScenarios.delete(scenarioName);
    console.log(`Edge case scenario deactivated: ${scenarioName}`);
  }

  /**
   * Deactivate all scenarios
   */
  deactivateAllScenarios(): void {
    this.activeScenarios.clear();
    console.log('All edge case scenarios deactivated');
  }

  /**
   * Get list of available scenarios
   */
  getAvailableScenarios(): EdgeCaseScenario[] {
    return Array.from(this.edgeCaseScenarios.values());
  }

  /**
   * Get list of active scenarios
   */
  getActiveScenarios(): string[] {
    return Array.from(this.activeScenarios);
  }

  /**
   * Apply edge case transformations to data points
   */
  applyDataEdgeCases(dataPoints: SurrogateDataPoint[]): SurrogateDataPoint[] {
    if (this.activeScenarios.size === 0) {
      return dataPoints;
    }

    let transformedPoints = [...dataPoints];

    for (const scenarioName of this.activeScenarios) {
      const scenario = this.edgeCaseScenarios.get(scenarioName);
      if (scenario && scenario.dataTransformer) {
        transformedPoints = scenario.dataTransformer(transformedPoints);
      }
    }

    return transformedPoints;
  }

  /**
   * Apply edge case middleware to HTTP requests
   */
  createEdgeCaseMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      for (const scenarioName of this.activeScenarios) {
        const scenario = this.edgeCaseScenarios.get(scenarioName);
        if (scenario && scenario.requestHandler) {
          const handled = scenario.requestHandler(req, res);
          if (handled) {
            return; // Request was handled by edge case
          }
        }
      }
      next();
    };
  }

  /**
   * Generate edge case test data
   */
  generateEdgeCaseData(scenario: string, count: number = 100): SurrogateDataPoint[] {
    const edgeCase = this.edgeCaseScenarios.get(scenario);
    if (!edgeCase || !edgeCase.dataGenerator) {
      throw new Error(`No data generator for scenario: ${scenario}`);
    }

    return edgeCase.dataGenerator(count);
  }

  // Private initialization methods

  private initializeDefaultScenarios(): void {
    // Null and undefined value scenarios
    this.edgeCaseScenarios.set('null_values', {
      name: 'Null Values',
      description: 'Inject null and undefined values into data streams',
      dataTransformer: this.createNullValueTransformer(),
      dataGenerator: this.createNullValueGenerator()
    });

    // Extreme numeric values
    this.edgeCaseScenarios.set('extreme_values', {
      name: 'Extreme Values',
      description: 'Test with extreme numeric values (infinity, max/min)',
      dataTransformer: this.createExtremeValueTransformer(),
      dataGenerator: this.createExtremeValueGenerator()
    });

    // Rapid value changes
    this.edgeCaseScenarios.set('rapid_changes', {
      name: 'Rapid Changes',
      description: 'Generate rapid oscillating values to test system limits',
      dataGenerator: this.createRapidChangeGenerator()
    });

    // Unicode and special characters
    this.edgeCaseScenarios.set('unicode_strings', {
      name: 'Unicode Strings',
      description: 'Test with Unicode characters and special strings',
      dataGenerator: this.createUnicodeStringGenerator()
    });

    // Timestamp edge cases
    this.edgeCaseScenarios.set('timestamp_edges', {
      name: 'Timestamp Edges',
      description: 'Test with edge case timestamps (epoch, future, precision)',
      dataTransformer: this.createTimestampEdgeTransformer(),
      dataGenerator: this.createTimestampEdgeGenerator()
    });

    // Memory pressure simulation
    this.edgeCaseScenarios.set('memory_pressure', {
      name: 'Memory Pressure',
      description: 'Simulate memory pressure with large requests',
      requestHandler: this.createMemoryPressureHandler()
    });

    // Malformed request simulation
    this.edgeCaseScenarios.set('malformed_requests', {
      name: 'Malformed Requests',
      description: 'Generate malformed and invalid requests',
      requestHandler: this.createMalformedRequestHandler()
    });

    // Slow consumer simulation
    this.edgeCaseScenarios.set('slow_consumer', {
      name: 'Slow Consumer',
      description: 'Simulate slow response processing',
      requestHandler: this.createSlowConsumerHandler()
    });

    // Data corruption simulation
    this.edgeCaseScenarios.set('data_corruption', {
      name: 'Data Corruption',
      description: 'Simulate data corruption scenarios',
      dataTransformer: this.createDataCorruptionTransformer()
    });

    // Boundary condition testing
    this.edgeCaseScenarios.set('boundary_conditions', {
      name: 'Boundary Conditions',
      description: 'Test exact boundary values and limits',
      dataGenerator: this.createBoundaryConditionGenerator()
    });
  }

  // Data transformer factories

  private createNullValueTransformer(): (points: SurrogateDataPoint[]) => SurrogateDataPoint[] {
    return (points: SurrogateDataPoint[]) => {
      return points.map(point => {
        if (Math.random() < 0.1) { // 10% chance of null/undefined
          const corruptedPoint = { ...point };
          const corruption = Math.random();

          if (corruption < 0.4) {
            corruptedPoint.value = null as any;
          } else if (corruption < 0.8) {
            corruptedPoint.value = undefined as any;
          } else {
            corruptedPoint.value = NaN;
          }

          corruptedPoint.quality = 0; // Mark as bad quality
          return corruptedPoint;
        }
        return point;
      });
    };
  }

  private createExtremeValueTransformer(): (points: SurrogateDataPoint[]) => SurrogateDataPoint[] {
    return (points: SurrogateDataPoint[]) => {
      return points.map(point => {
        if (Math.random() < 0.05) { // 5% chance of extreme value
          const corruptedPoint = { ...point };
          const extremeValues = [
            Number.MAX_VALUE,
            Number.MIN_VALUE,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.MAX_SAFE_INTEGER,
            Number.MIN_SAFE_INTEGER,
            1e308,
            -1e308
          ];

          corruptedPoint.value = extremeValues[Math.floor(Math.random() * extremeValues.length)];
          corruptedPoint.quality = 25; // Low quality for extreme values
          return corruptedPoint;
        }
        return point;
      });
    };
  }

  private createTimestampEdgeTransformer(): (points: SurrogateDataPoint[]) => SurrogateDataPoint[] {
    return (points: SurrogateDataPoint[]) => {
      return points.map(point => {
        if (Math.random() < 0.05) { // 5% chance of timestamp edge case
          const corruptedPoint = { ...point };
          const edgeCases = [
            new Date(0), // Unix epoch
            new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years in future
            new Date('1900-01-01'), // Very old date
            new Date('2038-01-19T03:14:07Z'), // 32-bit timestamp limit
            new Date(Date.now() + 0.001) // Microsecond precision
          ];

          corruptedPoint.timestamp = edgeCases[Math.floor(Math.random() * edgeCases.length)];
          return corruptedPoint;
        }
        return point;
      });
    };
  }

  private createDataCorruptionTransformer(): (points: SurrogateDataPoint[]) => SurrogateDataPoint[] {
    return (points: SurrogateDataPoint[]) => {
      return points.map(point => {
        if (Math.random() < 0.02) { // 2% chance of corruption
          const corruptedPoint = { ...point };

          // Various corruption types
          const corruption = Math.random();

          if (corruption < 0.3) {
            // Bit flip simulation (for numeric values)
            if (typeof point.value === 'number') {
              const bits = new Float64Array([point.value]);
              const bytes = new Uint8Array(bits.buffer);
              const byteIndex = Math.floor(Math.random() * bytes.length);
              const bitIndex = Math.floor(Math.random() * 8);
              bytes[byteIndex] ^= (1 << bitIndex);
              corruptedPoint.value = bits[0];
            }
          } else if (corruption < 0.6) {
            // Type confusion
            if (typeof point.value === 'number') {
              corruptedPoint.value = String(point.value);
            } else if (typeof point.value === 'string') {
              corruptedPoint.value = parseFloat(point.value) || 0;
            }
          } else {
            // Structure corruption
            (corruptedPoint as any).extraField = 'corrupted';
            delete (corruptedPoint as any).quality;
          }

          corruptedPoint.quality = 10; // Very low quality
          return corruptedPoint;
        }
        return point;
      });
    };
  }

  // Data generator factories

  private createNullValueGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];
      const startTime = Date.now();

      for (let i = 0; i < count; i++) {
        const nullTypes = [null, undefined, NaN, '', 0, false];

        points.push({
          tagName: 'EDGE_CASE.NULL_VALUES',
          timestamp: new Date(startTime + i * 1000),
          value: nullTypes[i % nullTypes.length] as any,
          quality: 0
        });
      }

      return points;
    };
  }

  private createExtremeValueGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];
      const startTime = Date.now();

      const extremeValues = [
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        1.7976931348623157e+308,
        -1.7976931348623157e+308,
        2.2250738585072014e-308,
        5e-324 // Smallest positive number
      ];

      for (let i = 0; i < count; i++) {
        points.push({
          tagName: 'EDGE_CASE.EXTREME_VALUES',
          timestamp: new Date(startTime + i * 1000),
          value: extremeValues[i % extremeValues.length],
          quality: 25
        });
      }

      return points;
    };
  }

  private createRapidChangeGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];
      const startTime = Date.now();

      for (let i = 0; i < count; i++) {
        // Alternating between extreme values at high frequency
        const value = i % 2 === 0 ? 1000000 : -1000000;

        points.push({
          tagName: 'EDGE_CASE.RAPID_CHANGES',
          timestamp: new Date(startTime + i * 10), // 100 Hz
          value,
          quality: 100
        });
      }

      return points;
    };
  }

  private createUnicodeStringGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];
      const startTime = Date.now();

      const unicodeStrings = [
        '测试数据', // Chinese
        'Tëst Dàtá', // Accented characters
        '🔧⚙️🛠️', // Emojis
        'Ω≈∆∑∏∫', // Mathematical symbols
        '\x00\x01\x02', // Control characters
        'a'.repeat(10000), // Very long string
        '', // Empty string
        '\uD800\uDC00', // Surrogate pair
        '\uFFFD', // Replacement character
        'SELECT * FROM users; DROP TABLE users;' // SQL injection attempt
      ];

      for (let i = 0; i < count; i++) {
        points.push({
          tagName: 'EDGE_CASE.UNICODE_STRINGS',
          timestamp: new Date(startTime + i * 1000),
          value: unicodeStrings[i % unicodeStrings.length],
          quality: 100
        });
      }

      return points;
    };
  }

  private createTimestampEdgeGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];

      const edgeTimestamps = [
        new Date(0), // Unix epoch
        new Date(1), // One millisecond after epoch
        new Date(-1), // Before epoch
        new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // Far future
        new Date('1900-01-01'), // Early date
        new Date('2038-01-19T03:14:07Z'), // 32-bit limit
        new Date('2100-12-31T23:59:59Z'), // Y2.1K
        new Date(8640000000000000), // Max valid date
        new Date(-8640000000000000) // Min valid date
      ];

      for (let i = 0; i < count; i++) {
        points.push({
          tagName: 'EDGE_CASE.TIMESTAMP_EDGES',
          timestamp: edgeTimestamps[i % edgeTimestamps.length],
          value: i,
          quality: 100
        });
      }

      return points;
    };
  }

  private createBoundaryConditionGenerator(): (count: number) => SurrogateDataPoint[] {
    return (count: number) => {
      const points: SurrogateDataPoint[] = [];
      const startTime = Date.now();

      // Test exact boundary values
      const boundaries = [
        -1, 0, 1, // Zero boundary
        -128, 127, // 8-bit signed integer boundaries
        -32768, 32767, // 16-bit signed integer boundaries
        -2147483648, 2147483647, // 32-bit signed integer boundaries
        0.1, 0.9, 1.0, 1.1, // Float precision boundaries
        Math.PI, Math.E, // Mathematical constants
        0.0000001, 0.9999999 // Near-boundary values
      ];

      for (let i = 0; i < count; i++) {
        points.push({
          tagName: 'EDGE_CASE.BOUNDARY_CONDITIONS',
          timestamp: new Date(startTime + i * 1000),
          value: boundaries[i % boundaries.length],
          quality: 100
        });
      }

      return points;
    };
  }

  // Request handler factories

  private createMemoryPressureHandler(): (req: Request, res: Response) => boolean {
    return (req: Request, res: Response) => {
      if (req.path.includes('/data/write') && Math.random() < 0.1) {
        // Simulate memory pressure by sending a large response
        const largeData = 'x'.repeat(50 * 1024 * 1024); // 50MB string

        setTimeout(() => {
          res.status(507).json({
            error: 'Insufficient storage space',
            details: 'Memory pressure detected - cannot process large request',
            memoryUsage: largeData.length,
            timestamp: new Date().toISOString()
          });
        }, 5000); // Slow response

        return true; // Request handled
      }
      return false;
    };
  }

  private createMalformedRequestHandler(): (req: Request, res: Response) => boolean {
    return (req: Request, res: Response) => {
      if (Math.random() < 0.05) { // 5% chance
        // Simulate various malformed response scenarios
        const scenarios = [
          () => res.status(200).send('Not JSON'), // Invalid JSON response
          () => res.status(200).send(''), // Empty response
          () => res.status(500).send(Buffer.from([0x00, 0x01, 0x02])), // Binary data
          () => { res.destroy(); }, // Connection drop
          () => { /* Never respond - timeout */ },
          () => res.status(200).json({ invalidField: true }) // Wrong response structure
        ];

        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        scenario();

        return true; // Request handled
      }
      return false;
    };
  }

  private createSlowConsumerHandler(): (req: Request, res: Response) => boolean {
    return (req: Request, res: Response) => {
      if (Math.random() < 0.05) { // 5% chance
        // Simulate extremely slow response
        const delay = 30000 + Math.random() * 60000; // 30-90 seconds

        setTimeout(() => {
          res.status(200).json({
            message: 'Slow response simulation',
            delay,
            timestamp: new Date().toISOString()
          });
        }, delay);

        return true; // Request handled
      }
      return false;
    };
  }
}

/**
 * Edge case scenario definition
 */
export interface EdgeCaseScenario {
  name: string;
  description: string;
  dataTransformer?: (points: SurrogateDataPoint[]) => SurrogateDataPoint[];
  dataGenerator?: (count: number) => SurrogateDataPoint[];
  requestHandler?: (req: Request, res: Response) => boolean;
}

export default EdgeCaseSimulator;