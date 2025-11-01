/**
 * Performance Profiler with Flame Graph Support
 * Profiles hook execution and generates flame graphs for visualization
 */

import { performance, PerformanceObserver } from 'perf_hooks';

export interface ProfileFrame {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  children: ProfileFrame[];
  samples: number;
}

export interface FlameGraphData {
  name: string;
  value: number;
  children: FlameGraphData[];
}

export interface ProfileResult {
  hookName: string;
  totalDuration: number;
  frameCount: number;
  rootFrames: ProfileFrame[];
  flameGraphData: FlameGraphData;
  criticalPath: ProfileFrame[];
  hotspots: Array<{ frame: string; duration: number; percentage: number }>;
}

/**
 * PerformanceProfiler class for detailed hook profiling
 */
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();
  private frameStack: ProfileFrame[] = [];
  private rootFrames: ProfileFrame[] = [];
  private observer: PerformanceObserver | null = null;

  /**
   * Start profiling session
   */
  startProfiling(hookName: string): void {
    this.marks.clear();
    this.measures.clear();
    this.frameStack = [];
    this.rootFrames = [];

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          const measures = this.measures.get(entry.name) || [];
          measures.push(entry.duration);
          this.measures.set(entry.name, measures);
        }
      }
    });

    this.observer.observe({ entryTypes: ['measure'] });
  }

  /**
   * Stop profiling and generate results
   */
  stopProfiling(hookName: string): ProfileResult {
    if (this.observer) {
      this.observer.disconnect();
    }

    const rootFrames = this.rootFrames;
    const flameGraphData = this.buildFlameGraph(rootFrames);
    const hotspots = this.findHotspots(rootFrames);
    const criticalPath = this.findCriticalPath(rootFrames);

    const totalDuration = rootFrames.reduce((sum, frame) => sum + frame.duration, 0);

    return {
      hookName,
      totalDuration,
      frameCount: this.countFrames(rootFrames),
      rootFrames,
      flameGraphData,
      criticalPath,
      hotspots
    };
  }

  /**
   * Mark performance point
   */
  mark(name: string): void {
    performance.mark(name);
    this.marks.set(name, performance.now());
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);

    if (startTime === undefined || endTime === undefined) {
      return 0;
    }

    const duration = endTime - startTime;

    // Record in frame stack
    const frame: ProfileFrame = {
      name,
      duration,
      startTime,
      endTime,
      children: [],
      samples: 1
    };

    if (this.frameStack.length === 0) {
      this.rootFrames.push(frame);
    } else {
      const parent = this.frameStack[this.frameStack.length - 1];
      parent.children.push(frame);
    }

    return duration;
  }

  /**
   * Start frame (enter profiling region)
   */
  enterFrame(name: string): void {
    const frame: ProfileFrame = {
      name,
      duration: 0,
      startTime: performance.now(),
      endTime: 0,
      children: [],
      samples: 0
    };

    if (this.frameStack.length === 0) {
      this.rootFrames.push(frame);
    } else {
      const parent = this.frameStack[this.frameStack.length - 1];
      parent.children.push(frame);
    }

    this.frameStack.push(frame);
  }

  /**
   * End frame (exit profiling region)
   */
  exitFrame(): void {
    if (this.frameStack.length === 0) return;

    const frame = this.frameStack.pop()!;
    frame.endTime = performance.now();
    frame.duration = frame.endTime - frame.startTime;
  }

  /**
   * Generate flame graph SVG string
   */
  generateFlameGraphSVG(result: ProfileResult): string {
    const width = 1200;
    const height = 400;
    const rowHeight = 20;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    svg += `<style>`;
    svg += `.flame-frame { fill: #74b9ff; stroke: #000; stroke-width: 0.5px; }`;
    svg += `.flame-text { font-size: 12px; font-family: monospace; }`;
    svg += `</style>`;

    let yOffset = 0;
    const frames = this.flattenFrames(result.rootFrames);

    for (const frame of frames) {
      const depth = this.getFrameDepth(result.rootFrames, frame);
      const x = (frame.startTime % width);
      const y = depth * rowHeight + yOffset;
      const frameWidth = (frame.duration / result.totalDuration) * width;

      if (frameWidth > 2) {
        svg += `<rect class="flame-frame" x="${x}" y="${y}" width="${frameWidth}" height="${rowHeight - 1}" />`;
        svg += `<text class="flame-text" x="${x + 2}" y="${y + 15}">${frame.name}</text>`;
      }
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Export profile as JSON
   */
  exportAsJSON(result: ProfileResult): string {
    return JSON.stringify({
      hookName: result.hookName,
      totalDuration: result.totalDuration,
      frameCount: result.frameCount,
      hotspots: result.hotspots,
      flameGraphData: result.flameGraphData
    }, null, 2);
  }

  /**
   * Private: Build flame graph data structure
   */
  private buildFlameGraph(frames: ProfileFrame[]): FlameGraphData {
    const root: FlameGraphData = {
      name: 'root',
      value: 0,
      children: []
    };

    for (const frame of frames) {
      root.value += frame.duration;
      root.children.push(this.frameToFlameData(frame));
    }

    return root;
  }

  /**
   * Private: Convert frame to flame graph data
   */
  private frameToFlameData(frame: ProfileFrame): FlameGraphData {
    return {
      name: frame.name,
      value: frame.duration,
      children: frame.children.map(child => this.frameToFlameData(child))
    };
  }

  /**
   * Private: Find hotspots (slowest frames)
   */
  private findHotspots(frames: ProfileFrame[]): Array<{ frame: string; duration: number; percentage: number }> {
    const allFrames = this.flattenFrames(frames);
    const totalDuration = frames.reduce((sum, f) => sum + f.duration, 0);

    return allFrames
      .map(frame => ({
        frame: frame.name,
        duration: frame.duration,
        percentage: (frame.duration / totalDuration) * 100
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }

  /**
   * Private: Find critical path (longest execution path)
   */
  private findCriticalPath(frames: ProfileFrame[]): ProfileFrame[] {
    const path: ProfileFrame[] = [];
    let current = frames[0];

    while (current) {
      path.push(current);
      if (current.children.length === 0) break;
      current = current.children.reduce((slowest, child) =>
        child.duration > slowest.duration ? child : slowest
      );
    }

    return path;
  }

  /**
   * Private: Flatten frame tree
   */
  private flattenFrames(frames: ProfileFrame[]): ProfileFrame[] {
    const flattened: ProfileFrame[] = [];

    const traverse = (frames: ProfileFrame[]) => {
      for (const frame of frames) {
        flattened.push(frame);
        if (frame.children.length > 0) {
          traverse(frame.children);
        }
      }
    };

    traverse(frames);
    return flattened;
  }

  /**
   * Private: Count total frames
   */
  private countFrames(frames: ProfileFrame[]): number {
    let count = 0;
    const traverse = (frames: ProfileFrame[]) => {
      for (const frame of frames) {
        count++;
        if (frame.children.length > 0) {
          traverse(frame.children);
        }
      }
    };
    traverse(frames);
    return count;
  }

  /**
   * Private: Get frame depth in tree
   */
  private getFrameDepth(frames: ProfileFrame[], target: ProfileFrame, depth = 0): number {
    for (const frame of frames) {
      if (frame === target) return depth;
      if (frame.children.length > 0) {
        const childDepth = this.getFrameDepth(frame.children, target, depth + 1);
        if (childDepth !== -1) return childDepth;
      }
    }
    return -1;
  }
}

export default PerformanceProfiler;
