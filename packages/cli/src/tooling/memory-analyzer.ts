/**
 * Memory Analyzer with Leak Detection
 * Analyzes memory usage and detects potential memory leaks
 */

export interface MemorySnapshot {
  timestamp: Date;
  rss: number; // Resident Set Size
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryTrend {
  snapshots: MemorySnapshot[];
  peakHeapUsed: number;
  averageHeapUsed: number;
  memoryGrowthRate: number; // bytes per second
  isLeaking: boolean;
  confidenceScore: number; // 0-100
}

export interface LeakIndicator {
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

/**
 * MemoryAnalyzer class for memory profiling and leak detection
 */
export class MemoryAnalyzer {
  private snapshots: MemorySnapshot[] = [];
  private baseline: MemorySnapshot | null = null;
  private sampleInterval: number;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timer | null = null;

  constructor(sampleInterval: number = 1000) {
    this.sampleInterval = sampleInterval;
  }

  /**
   * Take memory snapshot
   */
  snapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0
    };

    this.snapshots.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.snapshots.length > 1000) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Set baseline snapshot
   */
  setBaseline(): void {
    this.baseline = this.snapshot();
  }

  /**
   * Get delta from baseline
   */
  getDeltaFromBaseline(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  } | null {
    if (!this.baseline) return null;

    const current = this.snapshots[this.snapshots.length - 1];
    if (!current) return null;

    return {
      rss: current.rss - this.baseline.rss,
      heapTotal: current.heapTotal - this.baseline.heapTotal,
      heapUsed: current.heapUsed - this.baseline.heapUsed,
      external: current.external - this.baseline.external,
      arrayBuffers: current.arrayBuffers - this.baseline.arrayBuffers
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(interval?: number): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setBaseline();

    this.monitoringInterval = setInterval(() => {
      this.snapshot();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }, interval || this.sampleInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): MemoryTrend {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    return this.analyzeTrend();
  }

  /**
   * Analyze memory trend for leak detection
   */
  analyzeTrend(): MemoryTrend {
    const trend: MemoryTrend = {
      snapshots: [...this.snapshots],
      peakHeapUsed: Math.max(...this.snapshots.map(s => s.heapUsed)),
      averageHeapUsed: 0,
      memoryGrowthRate: 0,
      isLeaking: false,
      confidenceScore: 0
    };

    if (this.snapshots.length < 2) {
      return trend;
    }

    // Calculate average heap usage
    trend.averageHeapUsed = this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.snapshots.length;

    // Calculate growth rate
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const timeDiff = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
    const memDiff = last.heapUsed - first.heapUsed;

    if (timeDiff > 0) {
      trend.memoryGrowthRate = memDiff / (timeDiff / 1000); // bytes per second
    }

    // Detect leaks using heuristics
    const analysis = this.detectLeaks();
    trend.isLeaking = analysis.isLeaking;
    trend.confidenceScore = analysis.confidenceScore;

    return trend;
  }

  /**
   * Get memory statistics
   */
  getStatistics(): {
    currentHeapUsed: number;
    peakHeapUsed: number;
    averageHeapUsed: number;
    growthRate: number;
    isLeaking: boolean;
    snapshots: number;
  } {
    const current = this.snapshots[this.snapshots.length - 1];
    if (!current) {
      return {
        currentHeapUsed: 0,
        peakHeapUsed: 0,
        averageHeapUsed: 0,
        growthRate: 0,
        isLeaking: false,
        snapshots: 0
      };
    }

    const trend = this.analyzeTrend();

    return {
      currentHeapUsed: current.heapUsed,
      peakHeapUsed: trend.peakHeapUsed,
      averageHeapUsed: trend.averageHeapUsed,
      growthRate: trend.memoryGrowthRate,
      isLeaking: trend.isLeaking,
      snapshots: this.snapshots.length
    };
  }

  /**
   * Generate memory report
   */
  generateReport(): {
    summary: string;
    indicators: LeakIndicator[];
    recommendations: string[];
  } {
    const stats = this.getStatistics();
    const analysis = this.detectLeaks();
    const indicators = this.getLeakIndicators();

    const summaryLines = [
      `Current Heap: ${this.formatBytes(stats.currentHeapUsed)}`,
      `Peak Heap: ${this.formatBytes(stats.peakHeapUsed)}`,
      `Average Heap: ${this.formatBytes(stats.averageHeapUsed)}`,
      `Growth Rate: ${stats.growthRate.toFixed(2)} bytes/second`,
      `Is Leaking: ${stats.isLeaking ? 'YES (confidence: ' + analysis.confidenceScore + '%)' : 'NO'}`,
      `Samples: ${stats.snapshots}`
    ];

    const recommendations = this.getRecommendations(analysis);

    return {
      summary: summaryLines.join('\n'),
      indicators,
      recommendations
    };
  }

  /**
   * Export memory profile as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      analysis: this.analyzeTrend(),
      report: this.generateReport()
    }, null, 2);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    this.baseline = null;
  }

  /**
   * Private: Detect memory leaks using heuristics
   */
  private detectLeaks(): {
    isLeaking: boolean;
    confidenceScore: number;
  } {
    if (this.snapshots.length < 10) {
      return { isLeaking: false, confidenceScore: 0 };
    }

    // Split snapshots into quarters
    const quarter = Math.floor(this.snapshots.length / 4);
    const q1 = this.snapshots.slice(0, quarter);
    const q2 = this.snapshots.slice(quarter, quarter * 2);
    const q3 = this.snapshots.slice(quarter * 2, quarter * 3);
    const q4 = this.snapshots.slice(quarter * 3);

    const avgQ1 = q1.reduce((sum, s) => sum + s.heapUsed, 0) / q1.length;
    const avgQ2 = q2.reduce((sum, s) => sum + s.heapUsed, 0) / q2.length;
    const avgQ3 = q3.reduce((sum, s) => sum + s.heapUsed, 0) / q3.length;
    const avgQ4 = q4.reduce((sum, s) => sum + s.heapUsed, 0) / q4.length;

    // Check for consistent growth
    const growth1 = avgQ2 > avgQ1 ? (avgQ2 - avgQ1) / avgQ1 * 100 : 0;
    const growth2 = avgQ3 > avgQ2 ? (avgQ3 - avgQ2) / avgQ2 * 100 : 0;
    const growth3 = avgQ4 > avgQ3 ? (avgQ4 - avgQ3) / avgQ3 * 100 : 0;

    // If all quarters show >10% growth, likely a leak
    const isLeaking = growth1 > 10 && growth2 > 10 && growth3 > 10;
    const confidenceScore = Math.min(100, Math.round((growth1 + growth2 + growth3) / 3));

    return { isLeaking, confidenceScore };
  }

  /**
   * Private: Get leak indicators
   */
  private getLeakIndicators(): LeakIndicator[] {
    const indicators: LeakIndicator[] = [];
    const stats = this.getStatistics();

    if (stats.growthRate > 1024 * 1024) { // > 1MB/second
      indicators.push({
        name: 'Rapid Memory Growth',
        severity: 'high',
        description: 'Memory growing at ' + stats.growthRate.toFixed(2) + ' bytes/second',
        recommendation: 'Check for event listener leaks or circular references'
      });
    }

    if (stats.currentHeapUsed > 500 * 1024 * 1024) { // > 500MB
      indicators.push({
        name: 'High Heap Usage',
        severity: 'medium',
        description: 'Current heap usage is ' + this.formatBytes(stats.currentHeapUsed),
        recommendation: 'Consider optimizing data structures or pagination'
      });
    }

    if (stats.isLeaking) {
      indicators.push({
        name: 'Potential Memory Leak Detected',
        severity: 'high',
        description: 'Memory trend suggests potential leak with ' + stats.snapshots + ' samples',
        recommendation: 'Run with --expose-gc and investigate object retention'
      });
    }

    return indicators;
  }

  /**
   * Private: Get recommendations
   */
  private getRecommendations(analysis: { isLeaking: boolean; confidenceScore: number }): string[] {
    const recommendations: string[] = [];

    if (analysis.isLeaking) {
      recommendations.push('Enable --expose-gc flag for explicit garbage collection');
      recommendations.push('Check for circular references in data structures');
      recommendations.push('Verify event listeners are properly removed');
      recommendations.push('Review async operations for proper cleanup');
    }

    recommendations.push('Use Chrome DevTools for detailed heap snapshot analysis');
    recommendations.push('Monitor memory trends over longer periods');

    return recommendations;
  }

  /**
   * Private: Format bytes as human-readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default MemoryAnalyzer;
