/**
 * Quick test to screenshot the work order execution page
 */

import { chromium, Page } from '@playwright/test';
import * as path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5178';

async function pauseForViewer(page: Page, seconds = 2) {
  await page.waitForTimeout(seconds * 1000);
}

async function testExecutionAccess() {
  console.log('🧪 Testing work order execution access for john.doe...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Login as john.doe
    console.log('📝 Logging in as john.doe...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="username-input"]', 'john.doe');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await pauseForViewer(page, 2);
    console.log('  ✓ Logged in\n');

    // Navigate to work orders
    console.log('📋 Navigating to work orders...');
    await page.click('text=Work Orders');
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 2);
    console.log('  ✓ Work orders page loaded\n');

    // Click first work order
    console.log('🔍 Opening work order details...');
    const firstWorkOrderButton = page.locator('.ant-table tbody tr').first().locator('button[type="button"]').first();
    const workOrderId = await firstWorkOrderButton.textContent();
    console.log(`  Work Order ID: ${workOrderId}`);

    await firstWorkOrderButton.click();
    await page.waitForURL('**/workorders/**', { timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 2);

    // Take screenshot of details page
    await page.screenshot({ path: '/tmp/wo-details-page.png', fullPage: true });
    console.log('  ✓ Details page loaded (screenshot: /tmp/wo-details-page.png)\n');

    // Navigate to execution page
    console.log('⚙️  Navigating to execution page...');
    const currentUrl = page.url();
    const woId = currentUrl.split('/workorders/')[1]?.split('/')[0] || workOrderId?.trim();
    const executionUrl = `${BASE_URL}/workorders/${woId}/execute/10`;

    console.log(`  URL: ${executionUrl}`);
    await page.goto(executionUrl);
    await page.waitForLoadState('networkidle');
    await pauseForViewer(page, 3);

    // Take screenshot of execution page
    await page.screenshot({ path: '/tmp/wo-execution-page.png', fullPage: true });
    console.log('  ✓ Execution page loaded (screenshot: /tmp/wo-execution-page.png)\n');

    // Check for any error messages
    const accessDenied = await page.locator('text=/access denied|forbidden|not authorized|permission/i').count();
    const errorAlert = await page.locator('.ant-alert-error').count();

    if (accessDenied > 0) {
      console.log('  ❌ ACCESS DENIED message found!');
      const errorText = await page.locator('text=/access denied|forbidden|not authorized|permission/i').first().textContent();
      console.log(`  Error: ${errorText}`);
    } else if (errorAlert > 0) {
      console.log('  ⚠️  Error alert found!');
      const alertText = await page.locator('.ant-alert-error').first().textContent();
      console.log(`  Alert: ${alertText}`);
    } else {
      console.log('  ✅ No access denied errors detected');
    }

    // Check what's actually on the page
    const pageTitle = await page.locator('h2, h1').first().textContent().catch(() => 'No title found');
    console.log(`  Page title: ${pageTitle}\n`);

  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: '/tmp/wo-error-page.png', fullPage: true });
    console.log('  Error screenshot saved to: /tmp/wo-error-page.png');
  } finally {
    await context.close();
    await browser.close();
  }
}

testExecutionAccess()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
