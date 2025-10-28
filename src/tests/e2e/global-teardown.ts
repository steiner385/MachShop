import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { healthMonitor, frontendStabilityManager } from './global-setup';
import { portAllocator } from '../helpers/portAllocator';
import { databaseAllocator } from '../helpers/databaseAllocator';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');

  try {
    // Stop health monitoring and log final statistics
    await stopHealthMonitoring();

    // Stop E2E servers
    await stopE2EServers();

    // Clean up allocated ports for this project
    await cleanupAllocatedPorts();

    // Clean up allocated database for this project
    await cleanupAllocatedDatabase();

    // Clean up shared test database (legacy)
    await cleanupTestDatabase();
    
    // Remove authentication files
    await cleanupAuthFiles();
    
    // Clean up any temporary test files
    await cleanupTempFiles();
    
    console.log('Global teardown completed.');
  } catch (error) {
    console.error('Error during teardown:', error);
  }
}

async function stopHealthMonitoring() {
  console.log('Stopping monitoring systems...');

  // Stop Frontend Stability Manager
  if (frontendStabilityManager) {
    try {
      console.log('Stopping Frontend Stability Manager...');

      // Get final status report
      const statusReport = frontendStabilityManager.getStatusReport();
      console.log('\n========== Frontend Stability Summary ==========');
      console.log(statusReport);
      console.log('==============================================\n');

      // Clean up the stability manager
      await frontendStabilityManager.cleanup();
      console.log('Frontend Stability Manager stopped');
    } catch (error) {
      console.error('Error stopping Frontend Stability Manager:', error);
    }
  }

  // Stop legacy health monitor (if still running)
  if (healthMonitor) {
    try {
      console.log('Stopping legacy health monitor...');

      // Get final health summary before stopping
      const summary = healthMonitor.getHealthSummary();
      const latestMetrics = healthMonitor.getLatestMetrics();

      // Stop monitoring
      healthMonitor.stopMonitoring();

      // Log comprehensive health statistics
      console.log('\n========== Legacy Health Monitor Summary ==========');
      console.log(`Total health checks performed: ${summary.totalChecks}`);
      console.log(`Healthy checks: ${summary.healthyChecks} (${summary.uptimePercentage.toFixed(2)}%)`);
      console.log(`Unhealthy checks: ${summary.unhealthyChecks}`);
      console.log(`Crashed checks: ${summary.crashedChecks}`);

      if (latestMetrics) {
        console.log('\nFinal Server Status:');
        console.log(`  Overall Status: ${latestMetrics.status.toUpperCase()}`);
        console.log(`  Backend: ${latestMetrics.backendHealth.available ? '✓ Available' : '✗ Unavailable'} (${latestMetrics.backendHealth.responseTime}ms)`);
        console.log(`  Frontend: ${latestMetrics.frontendHealth.available ? '✓ Available' : '✗ Unavailable'} (${latestMetrics.frontendHealth.responseTime}ms)`);

        if (latestMetrics.systemMetrics.memory) {
          const memoryMB = (latestMetrics.systemMetrics.memory.heapUsed / 1024 / 1024).toFixed(2);
          console.log(`  Memory Usage: ${memoryMB} MB`);
        }
        console.log(`  Test Suite Uptime: ${Math.floor(latestMetrics.systemMetrics.uptime)}s`);
      }
      console.log('================================================\n');

      console.log('Legacy health monitor stopped');
    } catch (error) {
      console.error('Error stopping legacy health monitor:', error);
    }
  }

  if (!frontendStabilityManager && !healthMonitor) {
    console.log('No monitoring systems to stop');
  }
}

/**
 * Get the current test project name from various sources (same logic as global-setup)
 */
function getTestProjectName(): string {
  const projectName =
    process.env.PLAYWRIGHT_PROJECT ||
    process.env.PROJECT_NAME ||
    process.argv.find(arg => arg.startsWith('--project='))?.split('=')[1] ||
    process.argv.find((arg, index, arr) => arr[index - 1] === '--project') ||
    'default';

  return projectName;
}

async function cleanupAllocatedPorts() {
  console.log('Cleaning up allocated ports...');

  try {
    const projectName = getTestProjectName();
    const allocation = portAllocator.getPortsForProject(projectName);

    if (allocation) {
      console.log(`[Port Cleanup] Releasing ports for project "${projectName}": Backend ${allocation.backendPort}, Frontend ${allocation.frontendPort}`);

      // Kill any remaining processes on the allocated ports
      const ports = [allocation.backendPort, allocation.frontendPort];

      for (const port of ports) {
        try {
          const pidsOutput = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' });
          const pids = pidsOutput.trim().split('\n').filter(pid => pid);

          for (const pid of pids) {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              console.log(`[Port Cleanup] Sent SIGTERM to process ${pid} on port ${port}`);

              // Wait 1 second then force kill
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                process.kill(parseInt(pid), 'SIGKILL');
                console.log(`[Port Cleanup] Force killed process ${pid} on port ${port}`);
              } catch {
                // Already dead
              }
            } catch (error) {
              console.log(`[Port Cleanup] Process ${pid} on port ${port} already stopped`);
            }
          }
        } catch (error) {
          // No processes on this port - that's fine
        }
      }

      // Release the port allocation
      portAllocator.releasePortsForProject(projectName);
    } else {
      console.log(`[Port Cleanup] No port allocation found for project "${projectName}"`);
    }
  } catch (error) {
    console.error('[Port Cleanup] Failed to cleanup allocated ports:', error);
  }
}

async function stopE2EServers() {
  console.log('Stopping E2E servers...');

  try {
    // Read PID files and kill processes
    const backendPidFile = path.join(__dirname, '.e2e-backend-pid');
    const frontendPidFile = path.join(__dirname, '.e2e-frontend-pid');

    // Kill backend server from PID file
    if (fs.existsSync(backendPidFile)) {
      const backendPid = fs.readFileSync(backendPidFile, 'utf8').trim();
      try {
        process.kill(parseInt(backendPid), 'SIGTERM');
        console.log(`Sent SIGTERM to E2E backend server (PID: ${backendPid})`);

        // Wait 2 seconds, then force kill if still alive
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          process.kill(parseInt(backendPid), 'SIGKILL');
          console.log(`Force killed E2E backend server (PID: ${backendPid})`);
        } catch {
          // Already dead
        }
      } catch (error) {
        console.log(`E2E backend server (PID: ${backendPid}) was already stopped`);
      }
      fs.unlinkSync(backendPidFile);
    }

    // Kill frontend server from PID file
    if (fs.existsSync(frontendPidFile)) {
      const frontendPid = fs.readFileSync(frontendPidFile, 'utf8').trim();
      try {
        process.kill(parseInt(frontendPid), 'SIGTERM');
        console.log(`Sent SIGTERM to E2E frontend server (PID: ${frontendPid})`);

        // Wait 2 seconds, then force kill if still alive
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          process.kill(parseInt(frontendPid), 'SIGKILL');
          console.log(`Force killed E2E frontend server (PID: ${frontendPid})`);
        } catch {
          // Already dead
        }
      } catch (error) {
        console.log(`E2E frontend server (PID: ${frontendPid}) was already stopped`);
      }
      fs.unlinkSync(frontendPidFile);
    }

    // Get allocated ports for this project and clean them up
    const projectName = getTestProjectName();
    const allocation = portAllocator.getPortsForProject(projectName);

    if (allocation) {
      // Use allocated ports for this project
      const ports = [allocation.backendPort, allocation.frontendPort];
      console.log(`Using allocated ports for cleanup: Backend ${allocation.backendPort}, Frontend ${allocation.frontendPort}`);

      for (const port of ports) {
        try {
          const pidsOutput = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' });
          const pids = pidsOutput.trim().split('\n').filter(pid => pid);

          for (const pid of pids) {
            try {
              // Try SIGTERM first
              process.kill(parseInt(pid), 'SIGTERM');
              console.log(`Sent SIGTERM to process ${pid} on port ${port}`);

              // Wait 1 second
              await new Promise(resolve => setTimeout(resolve, 1000));

              // Force kill if still alive
              try {
                process.kill(parseInt(pid), 'SIGKILL');
                console.log(`Force killed process ${pid} on port ${port}`);
              } catch {
                // Already dead
              }
            } catch (error) {
              console.log(`Process ${pid} on port ${port} already stopped`);
            }
          }
        } catch (error) {
          // No processes on this port - that's fine
        }
      }
    } else {
      // Fallback to default ports if no allocation found
      console.log('No port allocation found, using default ports for cleanup');
      const ports = [3101, 5278];
      for (const port of ports) {
        try {
          const pidsOutput = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' });
          const pids = pidsOutput.trim().split('\n').filter(pid => pid);

          for (const pid of pids) {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              console.log(`Sent SIGTERM to process ${pid} on port ${port}`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                process.kill(parseInt(pid), 'SIGKILL');
                console.log(`Force killed process ${pid} on port ${port}`);
              } catch {
                // Already dead
              }
            } catch (error) {
              console.log(`Process ${pid} on port ${port} already stopped`);
            }
          }
        } catch (error) {
          // No processes on this port - that's fine
        }
      }
    }

    console.log('E2E servers stopped');
  } catch (error) {
    console.error('Failed to stop E2E servers:', error);
  }
}

async function cleanupAllocatedDatabase() {
  console.log('Cleaning up allocated database...');

  try {
    const projectName = getTestProjectName();
    const allocation = databaseAllocator.getDatabaseForProject(projectName);

    if (allocation) {
      console.log(`[Database Cleanup] Found database for project "${projectName}": ${allocation.databaseName}`);

      // ✅ PHASE 6F FIX: Use reference-counted cleanup to prevent premature database dropping
      // Multiple parallel test processes share the same database allocation
      // Only drop the database when ALL processes have completed
      await safeReleaseDatabaseForProject(projectName, allocation.databaseName);
    } else {
      console.log(`[Database Cleanup] No database allocation found for project "${projectName}"`);
    }
  } catch (error) {
    console.error('[Database Cleanup] Failed to cleanup allocated database:', error);
  }
}

/**
 * ✅ PHASE 6F FIX: Safe database release with reference counting
 * Prevents authentication failures by ensuring databases aren't dropped while tests are running
 */
async function safeReleaseDatabaseForProject(projectName: string, databaseName: string): Promise<void> {
  const lockFile = path.join(process.cwd(), 'test-results', `${projectName}-db-lock.json`);

  try {
    // Read or initialize reference count
    let refCount = 1;
    if (fs.existsSync(lockFile)) {
      try {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
        refCount = Math.max(0, (lockData.refCount || 1) - 1);
      } catch (error) {
        console.warn(`[Database Cleanup] Failed to read lock file for ${projectName}, assuming refCount=1`);
        refCount = 0; // Assume this is the last process
      }
    } else {
      // No lock file exists, assume this is the last/only process
      refCount = 0;
    }

    console.log(`[Database Cleanup] ${projectName} database reference count: ${refCount}`);

    if (refCount > 0) {
      // Update reference count and keep database alive
      fs.writeFileSync(lockFile, JSON.stringify({
        refCount,
        databaseName,
        lastUpdate: new Date().toISOString()
      }));
      console.log(`[Database Cleanup] Keeping database ${databaseName} alive (${refCount} references remaining)`);
    } else {
      // Last reference - safe to drop database
      console.log(`[Database Cleanup] Last reference - releasing database for project "${projectName}": ${databaseName}`);

      // Remove lock file first
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }

      // Now safe to drop the database
      await databaseAllocator.releaseDatabaseForProject(projectName);
    }
  } catch (error) {
    console.error(`[Database Cleanup] Error in safe release for ${projectName}:`, error);

    // Fallback: Always try to cleanup lock file, but don't drop database to be safe
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (cleanupError) {
      console.warn(`[Database Cleanup] Failed to cleanup lock file for ${projectName}:`, cleanupError);
    }
  }
}

async function cleanupTestDatabase() {
  console.log('Cleaning up E2E test database...');
  
  try {
    // Drop E2E test database
    execSync('PGPASSWORD=mes_password dropdb -U mes_user -h localhost mes_e2e_db --if-exists', { 
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: 'mes_password' }
    });
    console.log('E2E test database cleaned up');
  } catch (error) {
    console.log('E2E test database cleanup skipped (might not exist)');
  }
}

async function cleanupAuthFiles() {
  console.log('Cleaning up authentication files...');

  // Auth files are in project root, not test directory
  const authDir = path.join(process.cwd(), '.auth');

  if (fs.existsSync(authDir)) {
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Authentication files cleaned up');
    } catch (error) {
      console.error('Failed to cleanup auth files:', error);
    }
  }
}

async function cleanupTempFiles() {
  console.log('Cleaning up temporary files...');
  
  // Clean up any test screenshots, downloads, etc.
  const testResultsDir = path.join(process.cwd(), 'test-results');
  
  if (fs.existsSync(testResultsDir)) {
    try {
      // Keep the directory but clean old files
      const files = fs.readdirSync(testResultsDir);
      files.forEach(file => {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        
        // Remove files older than 1 day
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      });
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}

export default globalTeardown;