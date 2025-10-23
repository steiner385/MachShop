/**
 * Debug script to check john.doe's permissions after login
 */

import { chromium, Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5178';

async function debugPermissions() {
  console.log('🔍 Debugging john.doe permissions...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Login as john.doe
    console.log('📝 Logging in as john.doe...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="username-input"]', 'john.doe');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log('  ✓ Logged in\n');

    // Extract permissions from localStorage
    const authData = await page.evaluate(() => {
      const storage = localStorage.getItem('mes-auth-storage');
      if (!storage) return null;

      try {
        const parsed = JSON.parse(storage);
        return {
          user: parsed.state?.user || parsed.user,
          permissions: parsed.state?.user?.permissions || parsed.user?.permissions || [],
          roles: parsed.state?.user?.roles || parsed.user?.roles || []
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('📋 Auth Data from localStorage:');
    console.log(JSON.stringify(authData, null, 2));
    console.log('');

    if (authData && authData.permissions) {
      console.log('✅ Permissions found:');
      authData.permissions.forEach((perm: string) => console.log(`   - ${perm}`));
      console.log('');

      const hasExecute = authData.permissions.includes('workorders.execute');
      console.log(`❓ Has 'workorders.execute': ${hasExecute ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }

    if (authData && authData.roles) {
      console.log('👤 Roles:');
      authData.roles.forEach((role: string) => console.log(`   - ${role}`));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

debugPermissions()
  .then(() => {
    console.log('✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
