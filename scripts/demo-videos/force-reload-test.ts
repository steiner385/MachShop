import { chromium } from 'playwright';

async function forceReloadTest() {
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
    await page.waitForTimeout(5000);

    // Force hard reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ 
      path: '/tmp/after-force-reload.png',
      fullPage: false
    });

    console.log('✓ Screenshot saved');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

forceReloadTest();
