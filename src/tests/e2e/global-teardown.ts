import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { healthMonitor } from './global-setup';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');

  try {
    // Stop health monitoring and log final statistics
    await stopHealthMonitoring();

    // Stop E2E servers
    await stopE2EServers();
    
    // Clean up test database
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
  if (!healthMonitor) {
    console.log('No health monitor to stop');
    return;
  }

  console.log('Stopping health monitoring...');

  try {
    // Get final health summary before stopping
    const summary = healthMonitor.getHealthSummary();
    const latestMetrics = healthMonitor.getLatestMetrics();

    // Stop monitoring
    healthMonitor.stopMonitoring();

    // Log comprehensive health statistics
    console.log('\n========== Server Health Summary ==========');
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
    console.log('==========================================\n');

    console.log('Health monitoring stopped');
  } catch (error) {
    console.error('Error stopping health monitoring:', error);
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

    // Use lsof to find and kill any remaining processes on E2E ports
    const ports = [3101, 5278];
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

    console.log('E2E servers stopped');
  } catch (error) {
    console.error('Failed to stop E2E servers:', error);
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