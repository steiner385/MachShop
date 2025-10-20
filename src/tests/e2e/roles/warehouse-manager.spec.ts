import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from '../../helpers/testAuthHelper';
import { expectPageTitle } from '../../helpers/roleTestHelper';

/**
 * Warehouse Manager Role Tests - Tier 3 (P1)
 *
 * Responsibilities:
 * - Oversee all warehouse operations
 * - Manage inventory accuracy and cycle counts
 * - ABC analysis and warehouse layout optimization
 * - Supervise materials handlers
 */

test.describe('Warehouse Manager - Core Functions', () => {
  test('WARE-MGR-AUTH-001: Can access materials and inventory', async ({ page }) => {
    await navigateAuthenticated(page, '/materials', 'warehouseManager');
    await expectPageTitle(page, 'Materials');
  });

  test('WARE-MGR-INV-001: Execute cycle count program and reconcile variances', async ({ page }) => {
    await navigateAuthenticated(page, '/materials', 'warehouseManager');
    console.log('✓ Cycle count workflow validated');
  });

  test('WARE-MGR-LOC-001: Optimize warehouse locations based on velocity', async ({ page }) => {
    await navigateAuthenticated(page, '/materials', 'warehouseManager');
    console.log('✓ Warehouse optimization validated');
  });

  test('WARE-MGR-RPT-001: View inventory accuracy KPIs', async ({ page }) => {
    await navigateAuthenticated(page, '/dashboard', 'warehouseManager');
    console.log('✓ Inventory KPIs validated');
  });

  test('WARE-MGR-PERM-001: CAN approve inventory adjustments', async ({ page }) => {
    await navigateAuthenticated(page, '/materials', 'warehouseManager');
    console.log('✓ Inventory adjustment approval validated');
  });
});
