/**
 * Scenario 5: Production Scheduling & Planning
 * Duration: 3 minutes
 *
 * Demonstrates production schedule creation and resource planning.
 *
 * Timeline:
 * [0:00-0:20] Login as admin/planner
 * [0:20-0:50] Navigate to Scheduling page
 * [0:50-1:20] Review current production schedule
 * [1:20-1:50] View schedule calendar/Gantt view
 * [1:50-2:20] Review resource allocation
 * [2:20-2:50] View schedule conflicts and capacity
 * [2:50-3:00] Review schedule optimization
 */

import { chromium, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5178';
const VIDEO_DIR = path.join(__dirname, '../raw-videos');
const VIEWPORT = { width: 1920, height: 1080 };

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

async function pauseForViewer(page: Page, seconds = 2) {
  await page.waitForTimeout(seconds * 1000);
}

async function recordScenario5() {
  console.log('🎬 Starting Scenario 5: Production Scheduling & Planning');
  console.log('   Duration: ~3 minutes');
  console.log('   Resolution: 1920x1080 (1080p)\n');

  const browser = await chromium.launch({
    headless: true,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: VIDEO_DIR,
      size: VIEWPORT
    }
  });

  const page = await context.newPage();

  try {
    console.log('[0:00-0:20] Login');
    await page.goto(`${BASE_URL}/login`);
    await pauseForViewer(page, 2);

    await page.fill('[data-testid="username-input"]', 'admin');
    await pauseForViewer(page, 0.5);
    await page.fill('[data-testid="password-input"]', 'password123');
    await pauseForViewer(page, 0.5);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await pauseForViewer(page, 2);
    console.log('  ✓ Logged in');

    console.log('[0:20-0:50] Navigate to Scheduling');
    await page.click('text=Scheduling');
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 5);
    console.log('  ✓ Scheduling page loaded');

    console.log('[0:50-1:20] Review Production Schedule');
    const scheduleTable = page.locator('.ant-table, .schedule-table').first();
    const hasTable = await scheduleTable.count();
    if (hasTable > 0) {
      await scheduleTable.hover();
      await pauseForViewer(page, 5);
      console.log('  ✓ Production schedule displayed');
    }

    console.log('[1:20-1:50] View Schedule Visualization');
    // Look for Gantt chart or calendar view
    await page.evaluate(() => {
      const gantt = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Gantt') || el.className?.includes('gantt'));
      if (gantt) {
        gantt.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 5);
    console.log('  ✓ Schedule visualization shown');

    console.log('[1:50-2:20] Review Resource Allocation');
    await page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Resource') || el.textContent?.includes('Equipment'));
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 5);
    console.log('  ✓ Resource allocation displayed');

    console.log('[2:20-2:50] View Capacity Planning');
    await page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Capacity') || el.textContent?.includes('Utilization'));
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 5);
    console.log('  ✓ Capacity planning shown');

    console.log('[2:50-3:00] Review Complete Schedule');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pauseForViewer(page, 2);
    console.log('  ✓ Recording complete\n');

  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    const videoPath = await page.video()?.path();
    await context.close();
    await browser.close();

    if (videoPath) {
      const descriptiveName = 'scenario-5-production-scheduling.webm';
      const newPath = path.join(VIDEO_DIR, descriptiveName);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(videoPath, newPath);
      console.log('✅ Scenario 5 recording saved');
      console.log(`📁 Video saved to: ${newPath}\n`);
    }
  }
}

recordScenario5()
  .then(() => {
    console.log('🎬 Scenario 5 complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recording failed:', error);
    process.exit(1);
  });
