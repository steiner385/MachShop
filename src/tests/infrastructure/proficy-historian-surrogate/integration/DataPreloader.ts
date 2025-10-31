import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';
import { TestDataScenarios, TestScenario } from './TestDataScenarios';
import { SurrogateDataPoint, SurrogateTag } from '../storage/schemas';

/**
 * Data Preloader
 * Efficiently loads test scenarios and data into the historian surrogate
 */
export class DataPreloader {
  private testScenarios: TestDataScenarios;

  constructor(
    private timeSeriesStore: TimeSeriesStore,
    private tagRegistry: TagRegistry
  ) {
    this.testScenarios = new TestDataScenarios();
  }

  /**
   * Load a predefined test scenario
   */
  async loadScenario(scenarioName: string, options: LoadOptions = {}): Promise<LoadResult> {
    const startTime = Date.now();

    try {
      console.log(`Loading scenario: ${scenarioName}`);

      // Get the scenario
      const scenario = await this.getScenario(scenarioName);
      if (!scenario) {
        throw new Error(`Unknown scenario: ${scenarioName}`);
      }

      // Clear existing data if requested
      if (options.clearExisting) {
        await this.clearAllData();
      }

      // Load tags first
      const tagResult = await this.loadTags(scenario.tags, options);

      // Load data points
      const dataResult = await this.loadDataPoints(scenario.dataPoints, options);

      const totalTime = Date.now() - startTime;

      console.log(`Scenario loaded successfully in ${totalTime}ms`);

      return {
        success: true,
        scenarioName,
        tagsLoaded: tagResult.loaded,
        tagsFailed: tagResult.failed,
        dataPointsLoaded: dataResult.loaded,
        dataPointsFailed: dataResult.failed,
        totalTime,
        metadata: scenario.metadata
      };

    } catch (error: any) {
      console.error(`Failed to load scenario ${scenarioName}:`, error);

      return {
        success: false,
        scenarioName,
        tagsLoaded: 0,
        tagsFailed: 0,
        dataPointsLoaded: 0,
        dataPointsFailed: 0,
        totalTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Load multiple scenarios
   */
  async loadMultipleScenarios(scenarioNames: string[], options: LoadOptions = {}): Promise<LoadResult[]> {
    const results: LoadResult[] = [];

    for (const scenarioName of scenarioNames) {
      const result = await this.loadScenario(scenarioName, {
        ...options,
        clearExisting: options.clearExisting && scenarioNames.indexOf(scenarioName) === 0 // Only clear on first scenario
      });
      results.push(result);

      // Stop on first failure if specified
      if (!result.success && options.stopOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Load custom data set
   */
  async loadCustomData(tags: SurrogateTag[], dataPoints: SurrogateDataPoint[], options: LoadOptions = {}): Promise<LoadResult> {
    const startTime = Date.now();

    try {
      console.log(`Loading custom data: ${tags.length} tags, ${dataPoints.length} data points`);

      if (options.clearExisting) {
        await this.clearAllData();
      }

      const tagResult = await this.loadTags(tags, options);
      const dataResult = await this.loadDataPoints(dataPoints, options);

      return {
        success: true,
        scenarioName: 'custom',
        tagsLoaded: tagResult.loaded,
        tagsFailed: tagResult.failed,
        dataPointsLoaded: dataResult.loaded,
        dataPointsFailed: dataResult.failed,
        totalTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        scenarioName: 'custom',
        tagsLoaded: 0,
        tagsFailed: 0,
        dataPointsLoaded: 0,
        dataPointsFailed: 0,
        totalTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Preload minimal dataset for quick testing
   */
  async preloadMinimalDataset(): Promise<LoadResult> {
    const tags: SurrogateTag[] = [
      {
        id: 'test_tag_1',
        tagName: 'TEST.EQUIPMENT.SENSOR1',
        description: 'Test sensor 1',
        dataType: 'Float',
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'Swinging Door',
        compressionDeviation: 0.1,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'preloader',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      }
    ];

    const dataPoints: SurrogateDataPoint[] = [];
    const startTime = new Date();

    // Generate 100 data points over 10 minutes
    for (let i = 0; i < 100; i++) {
      dataPoints.push({
        tagName: 'TEST.EQUIPMENT.SENSOR1',
        timestamp: new Date(startTime.getTime() + i * 6000), // 6 second intervals
        value: 50 + Math.sin(i * 0.1) * 10 + Math.random() * 2,
        quality: 95 + Math.random() * 5
      });
    }

    return this.loadCustomData(tags, dataPoints, { clearExisting: true });
  }

  /**
   * Get available scenarios
   */
  async getAvailableScenarios(): Promise<string[]> {
    const scenarios = await this.testScenarios.getAllScenarios();
    return Object.keys(scenarios);
  }

  /**
   * Get scenario information without loading
   */
  async getScenarioInfo(scenarioName: string): Promise<any> {
    const scenario = await this.getScenario(scenarioName);
    if (!scenario) {
      return null;
    }

    return {
      name: scenario.name,
      description: scenario.description,
      metadata: scenario.metadata,
      tagCount: scenario.tags.length,
      dataPointCount: scenario.dataPoints.length
    };
  }

  /**
   * Validate scenario data
   */
  async validateScenario(scenarioName: string): Promise<ValidationResult> {
    try {
      const scenario = await this.getScenario(scenarioName);
      if (!scenario) {
        return {
          valid: false,
          errors: [`Unknown scenario: ${scenarioName}`],
          warnings: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate tags
      for (const tag of scenario.tags) {
        if (!tag.tagName || tag.tagName.trim() === '') {
          errors.push(`Tag has empty name: ${tag.id}`);
        }

        if (!tag.dataType) {
          errors.push(`Tag ${tag.tagName} has no data type`);
        }
      }

      // Validate data points
      const tagNames = new Set(scenario.tags.map(t => t.tagName));
      let orphanedPoints = 0;

      for (const point of scenario.dataPoints) {
        if (!tagNames.has(point.tagName)) {
          orphanedPoints++;
        }

        if (!point.timestamp || isNaN(point.timestamp.getTime())) {
          errors.push(`Invalid timestamp in data point for ${point.tagName}`);
        }
      }

      if (orphanedPoints > 0) {
        warnings.push(`${orphanedPoints} data points reference non-existent tags`);
      }

      // Check for reasonable data size
      if (scenario.dataPoints.length > 1000000) {
        warnings.push(`Large dataset: ${scenario.dataPoints.length} data points may take time to load`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Get loading progress (for large datasets)
   */
  getLoadingProgress(): LoadingProgress {
    // This would be implemented with actual progress tracking
    return {
      phase: 'idle',
      totalItems: 0,
      processedItems: 0,
      percentage: 0,
      estimatedTimeRemaining: 0
    };
  }

  // Private helper methods

  private async getScenario(scenarioName: string): Promise<TestScenario | null> {
    const scenarios = await this.testScenarios.getAllScenarios();
    const scenarioGenerator = scenarios[scenarioName];

    if (!scenarioGenerator) {
      return null;
    }

    return await scenarioGenerator();
  }

  private async loadTags(tags: SurrogateTag[], options: LoadOptions): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    const batchSize = options.batchSize || 100;

    // Process tags in batches
    for (let i = 0; i < tags.length; i += batchSize) {
      const batch = tags.slice(i, i + batchSize);
      const batchResults = await this.processBatchTags(batch, options);

      loaded += batchResults.loaded;
      failed += batchResults.failed;

      // Progress callback
      if (options.progressCallback) {
        options.progressCallback({
          phase: 'tags',
          totalItems: tags.length,
          processedItems: i + batch.length,
          percentage: ((i + batch.length) / tags.length) * 100,
          estimatedTimeRemaining: 0
        });
      }
    }

    return { loaded, failed };
  }

  private async processBatchTags(tags: SurrogateTag[], options: LoadOptions): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    for (const tag of tags) {
      try {
        // Check if tag already exists
        const existingTag = await this.tagRegistry.getTag(tag.tagName);
        if (existingTag && !options.overwriteExisting) {
          if (options.skipExisting) {
            continue; // Skip without counting as failure
          } else {
            failed++;
            continue;
          }
        }

        if (existingTag && options.overwriteExisting) {
          await this.tagRegistry.updateTag(tag.tagName, tag);
        } else {
          await this.tagRegistry.createTag(tag);
        }

        loaded++;

      } catch (error: any) {
        failed++;
        if (options.verbose) {
          console.warn(`Failed to load tag ${tag.tagName}: ${error.message}`);
        }
      }
    }

    return { loaded, failed };
  }

  private async loadDataPoints(dataPoints: SurrogateDataPoint[], options: LoadOptions): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    const batchSize = options.batchSize || 1000;

    // Sort data points by timestamp for better storage efficiency
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Process data points in batches
    for (let i = 0; i < sortedPoints.length; i += batchSize) {
      const batch = sortedPoints.slice(i, i + batchSize);

      try {
        const writeResult = await this.timeSeriesStore.writeDataPoints(batch);
        loaded += writeResult.pointsWritten;
        failed += writeResult.pointsFailed;

        // Progress callback
        if (options.progressCallback) {
          options.progressCallback({
            phase: 'data',
            totalItems: sortedPoints.length,
            processedItems: i + batch.length,
            percentage: ((i + batch.length) / sortedPoints.length) * 100,
            estimatedTimeRemaining: 0
          });
        }

      } catch (error: any) {
        failed += batch.length;
        if (options.verbose) {
          console.warn(`Failed to load data batch: ${error.message}`);
        }
      }
    }

    return { loaded, failed };
  }

  private async clearAllData(): Promise<void> {
    console.log('Clearing existing data...');
    await this.timeSeriesStore.clear();
    await this.tagRegistry.clear();
  }
}

/**
 * Load options interface
 */
export interface LoadOptions {
  clearExisting?: boolean;          // Clear all existing data before loading
  overwriteExisting?: boolean;      // Overwrite existing tags/data
  skipExisting?: boolean;           // Skip existing items without error
  batchSize?: number;               // Batch size for processing
  verbose?: boolean;                // Enable verbose logging
  stopOnError?: boolean;            // Stop loading on first error
  progressCallback?: (progress: LoadingProgress) => void;
}

/**
 * Load result interface
 */
export interface LoadResult {
  success: boolean;
  scenarioName: string;
  tagsLoaded: number;
  tagsFailed: number;
  dataPointsLoaded: number;
  dataPointsFailed: number;
  totalTime: number;
  error?: string;
  metadata?: any;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Loading progress interface
 */
export interface LoadingProgress {
  phase: 'idle' | 'tags' | 'data' | 'complete';
  totalItems: number;
  processedItems: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export default DataPreloader;