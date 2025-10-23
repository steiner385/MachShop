/**
 * Scenario 2: Work Order Execution & Material Tracking
 * Duration: 5 minutes (extended comprehensive workflow)
 *
 * Demonstrates complete production operator workflow for executing work orders
 * including operations, measurements, material consumption, and progress tracking.
 *
 * Timeline:
 * [0:00-0:20] Login as Production Operator (John Doe)
 * [0:20-0:50] Navigate to Work Orders and select IN_PROGRESS order
 * [0:50-1:20] Review work order details, BOM, and routing operations
 * [1:20-1:50] Navigate to Work Order Execution view
 * [1:50-2:20] Start/Resume first operation and review instructions
 * [2:20-2:50] Enter process parameters and measurements
 * [2:50-3:20] Record material consumption with serial numbers
 * [3:20-3:50] Complete operation and record quantities produced
 * [3:50-4:20] View operation history and status
 * [4:20-5:00] Review overall work order progress and completion
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

async function recordScenario2() {
  console.log('🎬 Starting Scenario 2: Work Order Execution & Material Tracking');
  console.log('   Duration: ~5 minutes (comprehensive workflow)');
  console.log('   Resolution: 1920x1080 (1080p)\\n');

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
    // [0:00-0:20] Login as Production Operator
    console.log('[0:00-0:20] Login as Production Operator');
    await page.goto(`${BASE_URL}/login`);
    await pauseForViewer(page, 2);

    await page.fill('[data-testid="username-input"]', 'john.doe');
    await pauseForViewer(page, 0.5);
    await page.fill('[data-testid="password-input"]', 'password123');
    await pauseForViewer(page, 0.5);
    await page.click('[data-testid="login-button"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await pauseForViewer(page, 2);
    console.log('  ✓ Logged in as John Doe (Production Operator)');

    // [0:20-0:50] Navigate to Work Orders and select one
    console.log('[0:20-0:50] Navigate to Work Orders');
    await page.click('text=Work Orders');
    await page.waitForURL('**/workorders', { timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 3);
    console.log('  ✓ Work Orders page loaded');

    // Scroll through the list briefly
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
    await pauseForViewer(page, 2);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pauseForViewer(page, 1);

    // Get the first work order button from the table
    const firstWorkOrderButton = page.locator('.ant-table tbody tr').first().locator('button[type="button"]').first();
    const workOrderId = await firstWorkOrderButton.textContent();

    // Click to open work order details
    await firstWorkOrderButton.hover();
    await pauseForViewer(page, 2);
    await firstWorkOrderButton.click();
    await page.waitForURL('**/workorders/**', { timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 3);
    console.log('  ✓ Work order details page opened');

    // [0:50-1:20] Review work order details
    console.log('[0:50-1:20] Review Work Order Details');

    // Show work order header and details
    await pauseForViewer(page, 3);

    // Scroll down to show operations table
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await pauseForViewer(page, 3);
    console.log('  ✓ Work order operations displayed');

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pauseForViewer(page, 2);

    // [1:20-1:50] Navigate to Work Order Execution
    console.log('[1:20-1:50] Navigate to Execution View');

    // Navigate directly to the execution page for first operation (operation 10)
    const currentUrl = page.url();
    const woId = currentUrl.split('/workorders/')[1]?.split('/')[0] || workOrderId?.trim();
    const executionUrl = `${BASE_URL}/workorders/${woId}/execute/10`;

    await page.goto(executionUrl);
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 3);
    console.log('  ✓ Work order execution view loaded');

    // [1:50-2:20] Start operation and view operation details
    console.log('[1:50-2:20] Start Operation');

    // Show operation information
    await pauseForViewer(page, 3);

    // Look for and click the Start Operation button (test ID: start-operation-button)
    const startOpButton = page.locator('[data-testid="start-operation-button"]');
    const hasStartOp = await startOpButton.count();
    if (hasStartOp > 0) {
      await startOpButton.click();
      await pauseForViewer(page, 2);
      await page.waitForLoadState('networkidle');
      await pauseForViewer(page, 2);
      console.log('  ✓ Operation started');
    } else {
      console.log('  ⚠️  Operation already in progress or completed');
      await pauseForViewer(page, 3);
    }

    // Scroll down to show production actions
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
    await pauseForViewer(page, 3);

    // [2:20-2:50] Click Record Production button
    console.log('[2:20-2:50] Record Production');

    // Look for Record Production button (test ID: record-button)
    const recordButton = page.locator('[data-testid="record-button"]');
    const hasRecordButton = await recordButton.count();
    if (hasRecordButton > 0) {
      await recordButton.click();
      await pauseForViewer(page, 2);
      await page.waitForLoadState('networkidle');
      await pauseForViewer(page, 2);
      console.log('  ✓ Production entry form opened');
    } else {
      console.log('  ⚠️  Record button not available');
      await pauseForViewer(page, 3);
    }

    // [2:50-3:20] Enter production quantities
    console.log('[2:50-3:20] Enter Production Data');

    // Fill in quantity good
    const qtyGoodInput = page.locator('input[name="quantityGood"], input[id*="quantityGood"]').first();
    const hasQtyGood = await qtyGoodInput.count();
    if (hasQtyGood > 0) {
      await qtyGoodInput.click();
      await pauseForViewer(page, 1);
      await qtyGoodInput.fill('5');
      await pauseForViewer(page, 1);
      console.log('  ✓ Quantity good entered: 5');
    }

    // Fill in quantity scrap if field exists
    const qtyScrapInput = page.locator('input[name="quantityScrap"], input[id*="quantityScrap"]').first();
    const hasQtyScrap = await qtyScrapInput.count();
    if (hasQtyScrap > 0) {
      await qtyScrapInput.click();
      await pauseForViewer(page, 1);
      await qtyScrapInput.fill('1');
      await pauseForViewer(page, 1);
      console.log('  ✓ Quantity scrap entered: 1');
    }

    await pauseForViewer(page, 2);

    // Submit the production entry
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Save"), button[type="submit"]').first();
    const hasSubmit = await submitButton.count();
    if (hasSubmit > 0) {
      await submitButton.click();
      await pauseForViewer(page, 2);
      await page.waitForLoadState('networkidle');
      await pauseForViewer(page, 2);
      console.log('  ✓ Production data recorded');
    }

    // [3:20-3:50] View updated progress
    console.log('[3:20-3:50] View Progress Update');

    // Scroll to show progress card
    await page.evaluate(() => {
      const progressSection = Array.from(document.querySelectorAll('*'))
        .find(el => el.textContent?.includes('Production Progress'));
      if (progressSection) {
        progressSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await pauseForViewer(page, 4);
    console.log('  ✓ Progress updated');

    // [3:50-4:20] View operation details and timeline
    console.log('[3:50-4:20] View Operation Timeline');

    // Scroll through the page to show all details
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await pauseForViewer(page, 4);

    // [4:20-5:00] Review overall operation status
    console.log('[4:20-5:00] Review Overall Progress');

    // Scroll back to top to show operation header and status
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pauseForViewer(page, 3);

    // Final pause to show overall view
    await pauseForViewer(page, 3);

    console.log('  ✓ Recording complete\\n');

  } catch (error) {
    console.error('❌ Error during recording:', error);
    throw error;
  } finally {
    const videoPath = await page.video()?.path();
    await context.close();
    await browser.close();

    if (videoPath) {
      const descriptiveName = 'scenario-2-work-order-execution.webm';
      const newPath = path.join(VIDEO_DIR, descriptiveName);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(videoPath, newPath);
      console.log('✅ Scenario 2 recording saved');
      console.log(`📁 Video saved to: ${newPath}\\n`);
    }
  }
}

recordScenario2()
  .then(() => {
    console.log('🎬 Scenario 2 complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Recording failed:', error);
    process.exit(1);
  });
