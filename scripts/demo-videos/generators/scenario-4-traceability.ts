/**
 * Scenario 4: Traceability & Genealogy Navigation
 * Duration: 3 minutes
 *
 * Demonstrates complete part genealogy and material traceability.
 *
 * Timeline:
 * [0:00-0:20] Login as admin user
 * [0:20-0:50] Navigate to Traceability page
 * [0:50-1:20] Search for serial number
 * [1:20-1:50] View genealogy tree visualization
 * [1:50-2:20] Explore parent and child relationships
 * [2:20-2:50] Review material consumption history
 * [2:50-3:00] Review complete traceability chain
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

async function recordScenario4() {
  console.log('🎬 Starting Scenario 4: Traceability & Genealogy Navigation');
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

    console.log('[0:20-0:50] Navigate to Traceability');
    await page.click('text=Traceability');
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 5);
    console.log('  ✓ Traceability page loaded');

    console.log('[0:50-1:20] Search for Serial Number');
    // Find the main traceability search box (not the global search)
    const searchBox = page.locator('input[placeholder*="Enter serial number"]').first();
    const hasSearch = await searchBox.count();
    if (hasSearch > 0) {
      await searchBox.click();
      await pauseForViewer(page, 1);
      await searchBox.fill('SN-20251015-000001-7');
      await pauseForViewer(page, 1);

      // Click the Search button next to the input
      const searchButton = page.locator('button:has-text("Search")').first();
      await searchButton.click();

      await page.waitForLoadState('networkidle');
      await pauseForViewer(page, 5);
      console.log('  ✓ Serial number search executed');
    } else {
      console.log('  ⚠️  Search box not found, continuing...');
    }

    console.log('[1:20-1:50] View Genealogy Tree');
    const genealogyTree = page.locator('svg, canvas, .tree, .genealogy').first();
    const hasTree = await genealogyTree.count();
    if (hasTree > 0) {
      await genealogyTree.scrollIntoViewIfNeeded();
      await pauseForViewer(page, 5);
      console.log('  ✓ Genealogy tree visualized');
    } else {
      // Look for any traceability visualization
      await page.evaluate(() => {
        const section = Array.from(document.querySelectorAll('*'))
          .find(el => el.textContent?.includes('Parent') || el.textContent?.includes('Child') || el.textContent?.includes('Component'));
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      await pauseForViewer(page, 5);
      console.log('  ✓ Traceability data displayed');
    }

    console.log('[1:50-2:20] Explore Relationships');
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
    await pauseForViewer(page, 5);
    console.log('  ✓ Relationships shown');

    console.log('[2:20-2:50] Review Material History');
    await page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Material') || el.textContent?.includes('History'));
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 5);
    console.log('  ✓ Material history displayed');

    console.log('[2:50-3:00] Review Complete Chain');
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
      const descriptiveName = 'scenario-4-traceability.webm';
      const newPath = path.join(VIDEO_DIR, descriptiveName);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(videoPath, newPath);
      console.log('✅ Scenario 4 recording saved');
      console.log(`📁 Video saved to: ${newPath}\n`);
    }
  }
}

recordScenario4()
  .then(() => {
    console.log('🎬 Scenario 4 complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recording failed:', error);
    process.exit(1);
  });
