/**
 * Scenario 1: Executive Dashboard Overview
 * Duration: 4 minutes
 *
 * This script automates the demo recording for Scenario 1,
 * showing a plant manager's morning dashboard review.
 *
 * Timeline:
 * [0:00-0:30] Login as Sarah Manager
 * [0:30-1:00] KPI Cards Overview (Active WO, Completed, Quality, Equipment Util)
 * [1:00-1:45] Quick Actions Tour (Serial Numbers, Traceability, FAI Reports)
 * [1:45-2:30] Recent Work Orders & Production Metrics
 * [2:30-3:15] KPI Filtering Interaction
 * [3:15-3:45] Date Range Picker & Export Functionality
 * [3:45-4:00] Closing Pan
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5178';
const VIDEO_DIR = path.join(__dirname, '../raw-videos');
const VIEWPORT = { width: 1920, height: 1080 }; // Standard 1080p viewport
const BROWSER_SIZE = { width: 1920, height: 1200 }; // Larger window to accommodate browser chrome

// Ensure video directory exists
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

/**
 * Helper: Add visual highlight to an element
 */
async function highlightElement(page: Page, selector: string, duration = 2000) {
  await page.evaluate(({ sel, dur }) => {
    const element = document.querySelector(sel);
    if (element) {
      const originalBoxShadow = (element as HTMLElement).style.boxShadow;
      (element as HTMLElement).style.boxShadow =
        '0 0 20px 5px rgba(59, 130, 246, 0.8)';
      (element as HTMLElement).style.transition = 'box-shadow 0.3s ease';

      setTimeout(() => {
        (element as HTMLElement).style.boxShadow = originalBoxShadow;
      }, dur);
    }
  }, { sel: selector, dur: duration });
  await page.waitForTimeout(duration);
}

/**
 * Helper: Wait and allow viewer to see content
 */
async function pauseForViewer(page: Page, seconds = 2) {
  await page.waitForTimeout(seconds * 1000);
}

/**
 * Main recording function
 */
async function recordScenario1() {
  console.log('🎬 Starting Scenario 1: Executive Dashboard Overview');
  console.log('   Duration: ~4 minutes');
  console.log('   Resolution: 1920x1080 (1080p)\n');

  const browser = await chromium.launch({
    headless: true, // Headless for exact viewport without browser chrome
    slowMo: 500 // Slow down actions for better viewing
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
    // ============================================
    // [0:00-0:30] Opening Shot
    // ============================================
    console.log('[0:00-0:30] Opening Shot - Login');

    await page.goto(`${BASE_URL}/login`);
    await pauseForViewer(page, 2);

    // Login as Sarah (Plant Manager) - using data-testid selectors
    await page.fill('[data-testid="username-input"]', 'sarah.manager');
    await pauseForViewer(page, 0.5);

    await page.fill('[data-testid="password-input"]', 'demo123');
    await pauseForViewer(page, 0.5);

    await page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('  ⚠️  Dashboard URL not detected, checking for navigation...');
    });
    await pauseForViewer(page, 2);

    console.log('  ✓ Logged in as Sarah Manager');

    // ============================================
    // [0:30-1:00] KPI Overview
    // ============================================
    console.log('[0:30-1:00] KPI Overview');

    // Wait for KPI cards to load
    await page.waitForSelector('.ant-statistic', { timeout: 10000 });
    await pauseForViewer(page, 1);

    // Highlight each KPI card with description
    const kpiCards = [
      { text: 'Active Work Orders', duration: 2000 },
      { text: 'Completed Today', duration: 2000 },
      { text: 'Quality Yield', duration: 2000 },
      { text: 'Equipment Utilization', duration: 2000 }
    ];

    for (const kpi of kpiCards) {
      const cardLocator = page.locator(`.ant-card:has-text("${kpi.text}")`);
      const count = await cardLocator.count();
      if (count > 0) {
        await cardLocator.first().hover();
        await pauseForViewer(page, 1);
        console.log(`  ✓ Highlighted ${kpi.text}`);
      }
    }

    await pauseForViewer(page, 2);

    // ============================================
    // [1:00-1:45] Quick Actions Tour
    // ============================================
    console.log('[1:00-1:45] Quick Actions Tour');

    // Scroll to quick actions if needed
    await page.evaluate(() => {
      const quickActions = Array.from(document.querySelectorAll('.ant-card'))
        .find(card => card.textContent?.includes('Serial Numbers'));
      if (quickActions) {
        quickActions.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await pauseForViewer(page, 1);

    // Highlight each Quick Action card
    const quickActions = [
      'Serial Numbers',
      'Traceability',
      'FAI Reports'
    ];

    for (const action of quickActions) {
      const actionCard = page.locator(`.ant-card:has-text("${action}")`);
      const count = await actionCard.count();
      if (count > 0) {
        await actionCard.first().hover();
        await pauseForViewer(page, 1.5);
        console.log(`  ✓ Highlighted ${action}`);
      }
    }

    await pauseForViewer(page, 1);

    // ============================================
    // [1:45-2:30] Recent Work Orders & Trends
    // ============================================
    console.log('[1:45-2:30] Recent Work Orders & Trends');

    // Scroll to Recent Work Orders section
    await page.evaluate(() => {
      const workOrdersHeading = Array.from(document.querySelectorAll('h3, h4, .ant-typography'))
        .find(el => el.textContent?.includes('Recent Work Orders'));
      if (workOrdersHeading) {
        workOrdersHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    await pauseForViewer(page, 2);

    // Highlight the Recent Work Orders table
    const workOrdersTable = page.locator('.ant-table').first();
    const tableExists = await workOrdersTable.count();
    if (tableExists > 0) {
      await workOrdersTable.hover();
      await pauseForViewer(page, 3);
      console.log('  ✓ Recent Work Orders table shown');
    }

    // Scroll to Production Efficiency and Quality Trends
    await page.evaluate(() => {
      const efficiencySection = Array.from(document.querySelectorAll('h3, h4, .ant-typography'))
        .find(el => el.textContent?.includes('Production Efficiency'));
      if (efficiencySection) {
        efficiencySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    await pauseForViewer(page, 3);
    console.log('  ✓ Production metrics displayed');

    // ============================================
    // [2:30-3:15] KPI Interaction - Click Filter
    // ============================================
    console.log('[2:30-3:15] KPI Interaction - Filtering');

    // Scroll back to top to show KPI interaction
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await pauseForViewer(page, 1);

    // Click on Active Work Orders KPI to filter
    const activeWOCard = page.locator('.ant-card:has-text("Active Work Orders")');
    const hasActiveWO = await activeWOCard.count();
    if (hasActiveWO > 0) {
      await activeWOCard.first().click();
      await pauseForViewer(page, 2);
      console.log('  ✓ Filtered by Active Work Orders');

      // Show the filtered results briefly
      await pauseForViewer(page, 2);

      // Clear filter
      const closeTag = page.locator('.ant-tag-close-icon').first();
      const hasCloseTag = await closeTag.count();
      if (hasCloseTag > 0) {
        await closeTag.click();
        await pauseForViewer(page, 1);
        console.log('  ✓ Filter cleared');
      }
    }

    await pauseForViewer(page, 1);

    // ============================================
    // [3:15-3:45] Date Range & Export
    // ============================================
    console.log('[3:15-3:45] Date Range & Export');

    // Highlight the date picker
    const datePicker = page.locator('.ant-picker-range');
    const hasDatePicker = await datePicker.count();
    if (hasDatePicker > 0) {
      await datePicker.hover();
      await pauseForViewer(page, 2);
      console.log('  ✓ Date range picker shown');
    }

    // Highlight Export button
    const exportButton = page.locator('button:has-text("Export")');
    const hasExport = await exportButton.count();
    if (hasExport > 0) {
      await exportButton.hover();
      await pauseForViewer(page, 2);
      console.log('  ✓ Export functionality shown');
    }

    await pauseForViewer(page, 1);

    // ============================================
    // [3:45-4:00] Closing
    // ============================================
    console.log('[3:45-4:00] Closing');

    // Pan across the dashboard one final time
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    await pauseForViewer(page, 3);
    console.log('  ✓ Recording complete\n');

  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    // Get video path before closing context
    const videoPath = await page.video()?.path();

    // Close and save video
    await context.close();
    await browser.close();

    // Rename video to descriptive name
    if (videoPath) {
      const descriptiveName = 'scenario-1-executive-dashboard.webm';
      const newPath = path.join(VIDEO_DIR, descriptiveName);

      // Remove old file if it exists
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }

      // Rename the video
      fs.renameSync(videoPath, newPath);
      console.log('✅ Scenario 1 recording saved');
      console.log(`📁 Video saved to: ${newPath}\n`);
    } else {
      console.log('✅ Scenario 1 recording saved');
      console.log(`📁 Check ${VIDEO_DIR} for video file\n`);
    }
  }
}

// Run the recording
recordScenario1()
  .then(() => {
    console.log('🎬 Scenario 1 complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recording failed:', error);
    process.exit(1);
  });
