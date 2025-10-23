import { chromium } from 'playwright';

async function verifyCompactHeader() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5178/login');
    await page.waitForTimeout(2000);
    await page.fill('[data-testid="username-input"]', 'sarah.manager');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Wait for KPI cards to appear
    await page.waitForSelector('.ant-statistic', { timeout: 10000 });

    // Wait for network to be idle (all API calls done)
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Extra wait to ensure data has rendered
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/compact-header.png',
      fullPage: false
    });

    console.log('✓ Screenshot saved to /tmp/compact-header.png');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verifyCompactHeader();
