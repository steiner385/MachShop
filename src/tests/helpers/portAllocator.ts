/**
 * Dynamic Port Allocator for E2E Tests
 *
 * Manages port allocation for parallel test execution by finding available ports
 * and preventing conflicts between test projects.
 */

import { createServer } from 'http';
import fs from 'fs';
import path from 'path';

export interface AllocatedPorts {
  backendPort: number;
  frontendPort: number;
  project: string;
  timestamp: number;
}

export class PortAllocator {
  private static instance: PortAllocator;
  private allocatedPorts: Map<string, AllocatedPorts> = new Map();
  private readonly portRangeStart = 3100;
  private readonly portRangeEnd = 5500;
  private readonly portCacheFile = path.join(process.cwd(), 'test-results', 'allocated-ports.json');

  private constructor() {
    this.loadPortCache();
    // Clean up stale allocations on startup
    this.cleanupStaleAllocations();
  }

  public static getInstance(): PortAllocator {
    if (!PortAllocator.instance) {
      PortAllocator.instance = new PortAllocator();
    }
    return PortAllocator.instance;
  }

  /**
   * Allocate ports for a test project with file-based locking to prevent race conditions
   */
  public async allocatePortsForProject(projectName: string): Promise<AllocatedPorts> {
    const maxRetries = 30; // 30 seconds max wait
    const retryDelay = 1000; // 1 second between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Acquire file lock to prevent race conditions
        const lockAcquired = await this.acquireFileLock();
        if (!lockAcquired) {
          console.log(`[PortAllocator] Lock busy, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`);
          await this.delay(retryDelay);
          continue;
        }

        try {
          // Re-load cache in case another process updated it
          this.loadPortCache();

          // Check if ports are already allocated for this project
          const existing = this.allocatedPorts.get(projectName);
          if (existing && await this.arePortsAvailable(existing.backendPort, existing.frontendPort)) {
            console.log(`[PortAllocator] Reusing existing ports for ${projectName}: Backend ${existing.backendPort}, Frontend ${existing.frontendPort}`);
            return existing;
          }

          // Find new available ports with atomic allocation
          const backendPort = await this.findAndReserveAvailablePort();
          const frontendPort = await this.findAndReserveAvailablePort(backendPort + 1);

          const allocation: AllocatedPorts = {
            backendPort,
            frontendPort,
            project: projectName,
            timestamp: Date.now()
          };

          this.allocatedPorts.set(projectName, allocation);
          this.savePortCache();

          console.log(`[PortAllocator] ✅ Allocated ports for ${projectName}: Backend ${backendPort}, Frontend ${frontendPort}`);
          return allocation;

        } finally {
          // Always release the lock
          await this.releaseFileLock();
        }

      } catch (error) {
        console.log(`[PortAllocator] Allocation attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) {
          throw new Error(`Failed to allocate ports for ${projectName} after ${maxRetries} attempts: ${error.message}`);
        }
        await this.delay(retryDelay);
      }
    }

    throw new Error(`Failed to allocate ports for ${projectName}: exceeded maximum retries`);
  }

  /**
   * Release ports for a project
   */
  public releasePortsForProject(projectName: string): void {
    const allocation = this.allocatedPorts.get(projectName);
    if (allocation) {
      console.log(`[PortAllocator] Released ports for ${projectName}: Backend ${allocation.backendPort}, Frontend ${allocation.frontendPort}`);
      this.allocatedPorts.delete(projectName);
      this.savePortCache();
    }
  }

  /**
   * Get allocated ports for a project
   */
  public getPortsForProject(projectName: string): AllocatedPorts | undefined {
    return this.allocatedPorts.get(projectName);
  }

  /**
   * Find an available port starting from a given port
   */
  private async findAvailablePort(startPort?: number): Promise<number> {
    const start = startPort || this.portRangeStart;

    for (let port = start; port <= this.portRangeEnd; port++) {
      if (await this.isPortAvailable(port) && !this.isPortAllocated(port)) {
        return port;
      }
    }

    throw new Error(`No available ports found in range ${start}-${this.portRangeEnd}`);
  }

  /**
   * Find and atomically reserve an available port
   */
  private async findAndReserveAvailablePort(startPort?: number): Promise<number> {
    const start = startPort || this.portRangeStart;

    for (let port = start; port <= this.portRangeEnd; port++) {
      // Check if port is already allocated in our cache
      if (this.isPortAllocated(port)) {
        continue;
      }

      // Double-check port availability with a brief hold
      if (await this.isPortAvailableWithHold(port)) {
        return port;
      }
    }

    throw new Error(`No available ports found in range ${start}-${this.portRangeEnd}`);
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check if ports are available
   */
  private async arePortsAvailable(backendPort: number, frontendPort: number): Promise<boolean> {
    const backendAvailable = await this.isPortAvailable(backendPort);
    const frontendAvailable = await this.isPortAvailable(frontendPort);
    return backendAvailable && frontendAvailable;
  }

  /**
   * Check if a port is already allocated to another project
   */
  private isPortAllocated(port: number): boolean {
    for (const allocation of this.allocatedPorts.values()) {
      if (allocation.backendPort === port || allocation.frontendPort === port) {
        return true;
      }
    }
    return false;
  }

  /**
   * Load port cache from file
   */
  private loadPortCache(): void {
    try {
      if (fs.existsSync(this.portCacheFile)) {
        const data = fs.readFileSync(this.portCacheFile, 'utf-8');
        const cached = JSON.parse(data) as AllocatedPorts[];

        for (const allocation of cached) {
          this.allocatedPorts.set(allocation.project, allocation);
        }

        console.log(`[PortAllocator] Loaded ${cached.length} port allocations from cache`);
      }
    } catch (error) {
      console.warn('[PortAllocator] Failed to load port cache:', error);
    }
  }

  /**
   * Save port cache to file
   */
  private savePortCache(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.portCacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const allocations = Array.from(this.allocatedPorts.values());
      fs.writeFileSync(this.portCacheFile, JSON.stringify(allocations, null, 2));
    } catch (error) {
      console.warn('[PortAllocator] Failed to save port cache:', error);
    }
  }

  /**
   * Clean up stale port allocations (older than 2 hours)
   */
  private cleanupStaleAllocations(): void {
    const staleThreshold = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    let cleanedCount = 0;

    for (const [project, allocation] of this.allocatedPorts.entries()) {
      if (allocation.timestamp < staleThreshold) {
        this.allocatedPorts.delete(project);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[PortAllocator] Cleaned up ${cleanedCount} stale port allocations`);
      this.savePortCache();
    }
  }

  /**
   * Get all current port allocations (for debugging)
   */
  public getAllAllocations(): AllocatedPorts[] {
    return Array.from(this.allocatedPorts.values());
  }

  /**
   * Clear all port allocations
   */
  public clearAllAllocations(): void {
    this.allocatedPorts.clear();
    this.savePortCache();
    console.log('[PortAllocator] Cleared all port allocations');
  }

  /**
   * Enhanced port availability check with brief hold to prevent race conditions
   */
  private async isPortAvailableWithHold(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          server.close();
        }
      };

      // Set a timeout to ensure we don't hold too long
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 2000); // 2 second max hold

      server.listen(port, () => {
        // Hold the port briefly to prevent race conditions
        setTimeout(() => {
          cleanup();
          clearTimeout(timeout);
          resolve(true);
        }, 100); // 100ms hold
      });

      server.on('error', () => {
        cleanup();
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * File-based locking mechanism for atomic port allocation
   */
  private readonly lockFile = path.join(process.cwd(), 'test-results', 'port-allocation.lock');

  private async acquireFileLock(): Promise<boolean> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.lockFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Try to create lock file exclusively
      fs.writeFileSync(this.lockFile, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (error) {
      // Lock file already exists - check if it's stale
      if (error.code === 'EEXIST') {
        return await this.handleStaleLock();
      }
      return false;
    }
  }

  private async releaseFileLock(): Promise<void> {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      console.warn('[PortAllocator] Failed to release lock file:', error.message);
    }
  }

  private async handleStaleLock(): Promise<boolean> {
    try {
      const stats = fs.statSync(this.lockFile);
      const lockAge = Date.now() - stats.mtime.getTime();

      // If lock is older than 30 seconds, consider it stale
      if (lockAge > 30000) {
        console.log('[PortAllocator] Removing stale lock file');
        fs.unlinkSync(this.lockFile);
        return await this.acquireFileLock();
      }

      return false;
    } catch (error) {
      // Lock file doesn't exist anymore, try to acquire
      return await this.acquireFileLock();
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global port allocator instance
 */
export const portAllocator = PortAllocator.getInstance();