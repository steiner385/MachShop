import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5178/login');
    await page.waitForTimeout(2000);

    console.log('Logging in...');
    await page.fill('[data-testid="username-input"]', 'sarah.manager');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    console.log('Waiting for dashboard...');
    await page.waitForTimeout(5000);

    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: '/tmp/dashboard-screenshot.png',
      fullPage: true 
    });

    console.log('✓ Screenshot saved to /tmp/dashboard-screenshot.png');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshot();
