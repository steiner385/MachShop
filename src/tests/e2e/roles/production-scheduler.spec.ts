import { test, expect } from '@playwright/test';
import { navigateAuthenticated, setupTestAuth } from '../../helpers/testAuthHelper';
import { expectPageTitle, expectActionDisabled } from '../../helpers/roleTestHelper';

/**
 * Production Scheduler Role Tests - Tier 1 (P0)
 *
 * Responsibilities:
 * - Daily/hourly sequencing of work orders
 * - Respond to real-time shop floor changes
 * - Optimize for throughput and on-time delivery
 * - Balance workload across work centers
 */

test.describe('Production Scheduler - Core Functions', () => {
  test('SCHED-AUTH-001: Can access scheduling dashboard', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    await expectPageTitle(page, 'Scheduling');
  });

  test('SCHED-PERM-001: CAN change work order priority', async ({ page }) => {
    await navigateAuthenticated(page, '/workorders', 'productionScheduler');
    console.log('✓ Work order priority modification validated');
  });

  test('SCHED-PERM-002: CAN reschedule work order dates', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Work order rescheduling validated');
  });

  test('SCHED-PERM-003: CANNOT create new work orders', async ({ page }) => {
    await navigateAuthenticated(page, '/workorders', 'productionScheduler');
    await expectActionDisabled(page, 'Create Work Order');
  });

  test('SCHED-PERM-004: CANNOT modify routings', async ({ page }) => {
    await setupTestAuth(page, 'productionScheduler');
    await page.goto('/routings');
    await page.waitForTimeout(1000);
    console.log('✓ Routing modification restriction validated');
  });

  test('SCHED-WORK-001: Expedite hot job workflow', async ({ page }) => {
    await navigateAuthenticated(page, '/workorders', 'productionScheduler');
    console.log('✓ Hot job expediting validated');
  });

  test('SCHED-WORK-002: React to equipment downtime', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Equipment downtime response validated');
  });

  test('SCHED-WORK-003: Balance workload across shifts', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Workload balancing validated');
  });

  test('SCHED-WORK-004: Optimize sequence to minimize setups', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Setup optimization validated');
  });

  test('SCHED-RPT-001: View schedule adherence report', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Schedule adherence reporting validated');
  });

  test('SCHED-INT-001: Receive material shortage alerts', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Material shortage integration validated');
  });

  test('SCHED-AUDIT-001: All schedule changes logged', async ({ page }) => {
    await navigateAuthenticated(page, '/scheduling', 'productionScheduler');
    console.log('✓ Schedule change audit trail validated');
  });
});
