import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');
  
  try {
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

async function stopE2EServers() {
  console.log('Stopping E2E servers...');
  
  try {
    // Read PID files and kill processes
    const backendPidFile = path.join(__dirname, '.e2e-backend-pid');
    const frontendPidFile = path.join(__dirname, '.e2e-frontend-pid');
    
    if (fs.existsSync(backendPidFile)) {
      const backendPid = fs.readFileSync(backendPidFile, 'utf8').trim();
      try {
        process.kill(parseInt(backendPid), 'SIGTERM');
        console.log(`Stopped E2E backend server (PID: ${backendPid})`);
      } catch (error) {
        console.log(`E2E backend server (PID: ${backendPid}) was already stopped`);
      }
      fs.unlinkSync(backendPidFile);
    }
    
    if (fs.existsSync(frontendPidFile)) {
      const frontendPid = fs.readFileSync(frontendPidFile, 'utf8').trim();
      try {
        process.kill(parseInt(frontendPid), 'SIGTERM');
        console.log(`Stopped E2E frontend server (PID: ${frontendPid})`);
      } catch (error) {
        console.log(`E2E frontend server (PID: ${frontendPid}) was already stopped`);
      }
      fs.unlinkSync(frontendPidFile);
    }
    
    // Also kill any remaining processes on E2E ports
    try {
      execSync('pkill -f "3101"', { stdio: 'pipe' });
      execSync('pkill -f "5278"', { stdio: 'pipe' });
    } catch (error) {
      // Ignore errors - processes might not exist
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
  
  const authDir = path.join(__dirname, '.auth');
  
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