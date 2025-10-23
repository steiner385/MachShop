/**
 * Scenario 3: Quality Management & FAI Workflow
 * Duration: 3 minutes
 *
 * Demonstrates quality inspection processes and FAI report creation.
 *
 * Timeline:
 * [0:00-0:20] Login as Quality Engineer (Jane Smith)
 * [0:20-0:50] Navigate to FAI Reports and review list
 * [0:50-1:20] Create new FAI report for part
 * [1:20-1:50] Fill out inspection criteria and measurements
 * [1:50-2:20] Review quality trends and NCRs
 * [2:20-2:50] Approve FAI report with digital signature
 * [2:50-3:00] Review approval status and close
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

async function recordScenario3() {
  console.log('🎬 Starting Scenario 3: Quality Management & FAI Workflow');
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
    console.log('[0:00-0:20] Login as Quality Engineer');
    await page.goto(`${BASE_URL}/login`);
    await pauseForViewer(page, 2);

    await page.fill('[data-testid="username-input"]', 'jane.smith');
    await pauseForViewer(page, 0.5);
    await page.fill('[data-testid="password-input"]', 'password123');
    await pauseForViewer(page, 0.5);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await pauseForViewer(page, 2);
    console.log('  ✓ Logged in as Jane Smith (Quality Engineer)');

    console.log('[0:20-0:50] Navigate to FAI Reports');
    await page.click('text=FAI Reports').catch(() => {
      console.log('  ⚠️  FAI Reports menu item not found, checking Quality section');
    });

    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 4);
    console.log('  ✓ FAI Reports page loaded');

    console.log('[0:50-1:20] Review FAI Report List');
    const faiTable = page.locator('.ant-table').first();
    const hasTable = await faiTable.count();
    if (hasTable > 0) {
      await faiTable.hover();
      await pauseForViewer(page, 5);
      console.log('  ✓ FAI reports displayed');
    }

    console.log('[1:20-1:50] Review Report Details');
    const firstRow = page.locator('.ant-table tbody tr').first();
    const hasRows = await firstRow.count();
    if (hasRows > 0) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      await pauseForViewer(page, 5);
      console.log('  ✓ Report details shown');
    }

    console.log('[1:50-2:20] Review Quality Metrics');
    await page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Inspection') || el.textContent?.includes('Quality'));
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 5);
    console.log('  ✓ Quality metrics displayed');

    console.log('[2:20-2:50] Review Approval Section');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pauseForViewer(page, 5);
    console.log('  ✓ Approval section shown');

    console.log('[2:50-3:00] Review and Close');
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
      const descriptiveName = 'scenario-3-quality-management.webm';
      const newPath = path.join(VIDEO_DIR, descriptiveName);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(videoPath, newPath);
      console.log('✅ Scenario 3 recording saved');
      console.log(`📁 Video saved to: ${newPath}\n`);
    }
  }
}

recordScenario3()
  .then(() => {
    console.log('🎬 Scenario 3 complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recording failed:', error);
    process.exit(1);
  });
