import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUser } from './testAuthHelper';

/**
 * Role Test Helper
 * Provides utilities for role-based E2E testing including permission validation
 */

/**
 * Verify element is visible for roles with permission
 */
export async function expectElementVisible(
  page: Page,
  selector: string,
  errorMessage?: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible({
    timeout: 5000,
  });
  if (errorMessage) {
    console.log(`✓ ${errorMessage}`);
  }
}

/**
 * Verify element is hidden for roles without permission
 */
export async function expectElementHidden(
  page: Page,
  selector: string,
  errorMessage?: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeHidden({
    timeout: 3000,
  });
  if (errorMessage) {
    console.log(`✓ ${errorMessage}`);
  }
}

/**
 * Verify element is disabled for roles without permission
 */
export async function expectElementDisabled(
  page: Page,
  selector: string,
  errorMessage?: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeDisabled({
    timeout: 3000,
  });
  if (errorMessage) {
    console.log(`✓ ${errorMessage}`);
  }
}

/**
 * Verify navigation to protected route results in access denied or redirect
 */
export async function expectAccessDenied(
  page: Page,
  route: string
): Promise<void> {
  await page.goto(route);

  // Wait a moment for any redirects
  await page.waitForTimeout(1000);

  const currentUrl = page.url();

  // Check if redirected to login or access denied page
  const isRedirected = currentUrl.includes('/login') || currentUrl.includes('/access-denied');

  // Or check for "Access Denied" message on page
  const hasAccessDeniedMessage = await page.locator('text=/access denied/i').count() > 0;

  expect(isRedirected || hasAccessDeniedMessage).toBeTruthy();
  console.log(`✓ Access denied for route: ${route}`);
}

/**
 * Verify menu item is visible based on role
 */
export async function expectMenuItemVisible(
  page: Page,
  menuText: string
): Promise<void> {
  // Try multiple menu selectors (sidebar, dropdown, etc.)
  const menuSelectors = [
    `nav a:has-text("${menuText}")`,
    `.ant-menu-item:has-text("${menuText}")`,
    `.ant-dropdown-menu-item:has-text("${menuText}")`,
    `[role="menuitem"]:has-text("${menuText}")`,
  ];

  let found = false;
  for (const selector of menuSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: 3000 });
      found = true;
      break;
    }
  }

  expect(found).toBeTruthy();
  console.log(`✓ Menu item visible: ${menuText}`);
}

/**
 * Verify menu item is hidden based on role
 */
export async function expectMenuItemHidden(
  page: Page,
  menuText: string
): Promise<void> {
  // Try multiple menu selectors
  const menuSelectors = [
    `nav a:has-text("${menuText}")`,
    `.ant-menu-item:has-text("${menuText}")`,
    `.ant-dropdown-menu-item:has-text("${menuText}")`,
    `[role="menuitem"]:has-text("${menuText}")`,
  ];

  for (const selector of menuSelectors) {
    const count = await page.locator(selector).count();
    expect(count).toBe(0);
  }

  console.log(`✓ Menu item hidden: ${menuText}`);
}

/**
 * Helper to check if user has specific permission
 */
export function userHasPermission(
  user: keyof typeof TEST_USERS,
  permission: string
): boolean {
  const testUser = TEST_USERS[user];
  const permissions = testUser.permissions as unknown as string[];
  return permissions.includes(permission) || permissions.includes('*');
}

/**
 * Helper to check if user has specific role
 */
export function userHasRole(
  user: keyof typeof TEST_USERS,
  role: string
): boolean {
  const testUser = TEST_USERS[user];
  const roles = testUser.roles as unknown as string[];
  return roles.includes(role);
}

/**
 * Verify button/action is visible and enabled for permitted roles
 */
export async function expectActionEnabled(
  page: Page,
  buttonText: string,
  errorMessage?: string
): Promise<void> {
  const button = page.locator(`button:has-text("${buttonText}")`);
  await expect(button).toBeVisible({ timeout: 3000 });
  await expect(button).toBeEnabled({ timeout: 1000 });
  if (errorMessage) {
    console.log(`✓ ${errorMessage}`);
  }
}

/**
 * Verify button/action is hidden or disabled for non-permitted roles
 */
export async function expectActionDisabled(
  page: Page,
  buttonText: string,
  errorMessage?: string
): Promise<void> {
  const button = page.locator(`button:has-text("${buttonText}")`);
  const count = await button.count();

  if (count > 0) {
    // Button exists but should be disabled
    await expect(button).toBeDisabled({ timeout: 1000 });
  } else {
    // Button is hidden completely - this is acceptable
    expect(count).toBe(0);
  }

  if (errorMessage) {
    console.log(`✓ ${errorMessage}`);
  }
}

/**
 * Verify user can create a record (has create permission)
 */
export async function expectCanCreate(
  page: Page,
  createButtonText: string = 'Create'
): Promise<void> {
  await expectActionEnabled(page, createButtonText, `User can create records`);
}

/**
 * Verify user cannot create a record (no create permission)
 */
export async function expectCannotCreate(
  page: Page,
  createButtonText: string = 'Create'
): Promise<void> {
  await expectActionDisabled(page, createButtonText, `User cannot create records (as expected)`);
}

/**
 * Verify user can edit a record (has write permission)
 */
export async function expectCanEdit(
  page: Page,
  editButtonText: string = 'Edit'
): Promise<void> {
  await expectActionEnabled(page, editButtonText, `User can edit records`);
}

/**
 * Verify user cannot edit a record (no write permission)
 */
export async function expectCannotEdit(
  page: Page,
  editButtonText: string = 'Edit'
): Promise<void> {
  await expectActionDisabled(page, editButtonText, `User cannot edit records (as expected)`);
}

/**
 * Verify user can delete a record (has delete permission)
 */
export async function expectCanDelete(
  page: Page,
  deleteButtonText: string = 'Delete'
): Promise<void> {
  await expectActionEnabled(page, deleteButtonText, `User can delete records`);
}

/**
 * Verify user cannot delete a record (no delete permission)
 */
export async function expectCannotDelete(
  page: Page,
  deleteButtonText: string = 'Delete'
): Promise<void> {
  await expectActionDisabled(page, deleteButtonText, `User cannot delete records (as expected)`);
}

/**
 * Verify page title matches expected value
 */
export async function expectPageTitle(
  page: Page,
  expectedTitle: string
): Promise<void> {
  // Try multiple title selectors
  const titleSelectors = [
    `h1:has-text("${expectedTitle}")`,
    `h2:has-text("${expectedTitle}")`,
    `.ant-page-header-heading-title:has-text("${expectedTitle}")`,
  ];

  let found = false;
  for (const selector of titleSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: 3000 });
      found = true;
      break;
    }
  }

  expect(found).toBeTruthy();
  console.log(`✓ Page title: ${expectedTitle}`);
}

/**
 * Verify table/data is visible for read permission
 */
export async function expectDataVisible(
  page: Page,
  dataIdentifier: string
): Promise<void> {
  // Look for table, card, or list containing data
  const dataSelectors = [
    `.ant-table:has-text("${dataIdentifier}")`,
    `.ant-card:has-text("${dataIdentifier}")`,
    `.ant-list:has-text("${dataIdentifier}")`,
    `table:has-text("${dataIdentifier}")`,
  ];

  let found = false;
  for (const selector of dataSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 });
      found = true;
      break;
    }
  }

  expect(found).toBeTruthy();
  console.log(`✓ Data visible: ${dataIdentifier}`);
}

/**
 * Get all user role types for iteration in tests
 */
export function getAllRoleKeys(): Array<keyof typeof TEST_USERS> {
  return Object.keys(TEST_USERS) as Array<keyof typeof TEST_USERS>;
}

/**
 * Get user info for logging/debugging
 */
export function getUserInfo(user: keyof typeof TEST_USERS): TestUser {
  return TEST_USERS[user];
}

/**
 * Filter role keys by tier (for focused testing)
 */
export function getRolesByTier(tier: 1 | 2 | 3 | 4 | 5): Array<keyof typeof TEST_USERS> {
  const tierMapping: Record<number, Array<keyof typeof TEST_USERS>> = {
    1: ['productionOperator', 'productionSupervisor', 'productionPlanner', 'productionScheduler', 'manufacturingEngineer'],
    2: ['qualityEngineerFull', 'qualityInspector', 'dcmaInspector', 'processEngineer'],
    3: ['warehouseManager', 'materialsHandler', 'shippingReceivingSpecialist', 'logisticsCoordinator'],
    4: ['maintenanceTechnician', 'maintenanceSupervisor'],
    5: ['plantManager', 'systemAdministrator', 'superuser', 'inventoryControlSpecialist'],
  };

  return tierMapping[tier] || [];
}

/**
 * Wait for API call to complete and verify response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus: number = 200
): Promise<void> {
  const response = await page.waitForResponse(
    (resp) => {
      const url = resp.url();
      const matchesUrl = typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matchesUrl && resp.status() === expectedStatus;
    },
    { timeout: 10000 }
  );

  expect(response.status()).toBe(expectedStatus);
  console.log(`✓ API response: ${response.url()} - Status: ${expectedStatus}`);
}

/**
 * Verify form field is editable
 */
export async function expectFieldEditable(
  page: Page,
  fieldLabel: string
): Promise<void> {
  // Find input/select/textarea associated with label
  const field = page.locator(`label:has-text("${fieldLabel}") + input, label:has-text("${fieldLabel}") + select, label:has-text("${fieldLabel}") + textarea`);
  const count = await field.count();

  if (count > 0) {
    await expect(field.first()).toBeEnabled({ timeout: 3000 });
    console.log(`✓ Field editable: ${fieldLabel}`);
  } else {
    // Try alternate selector (Ant Design)
    const antField = page.locator(`.ant-form-item-label:has-text("${fieldLabel}") ~ .ant-form-item-control input, .ant-form-item-label:has-text("${fieldLabel}") ~ .ant-form-item-control select`);
    await expect(antField.first()).toBeEnabled({ timeout: 3000 });
    console.log(`✓ Field editable: ${fieldLabel}`);
  }
}

/**
 * Verify form field is read-only or disabled
 */
export async function expectFieldReadOnly(
  page: Page,
  fieldLabel: string
): Promise<void> {
  // Find input/select/textarea associated with label
  const field = page.locator(`label:has-text("${fieldLabel}") + input, label:has-text("${fieldLabel}") + select, label:has-text("${fieldLabel}") + textarea`);
  const count = await field.count();

  if (count > 0) {
    const isDisabled = await field.first().isDisabled();
    const isReadOnly = await field.first().getAttribute('readonly') !== null;
    expect(isDisabled || isReadOnly).toBeTruthy();
    console.log(`✓ Field read-only: ${fieldLabel}`);
  } else {
    // Try alternate selector (Ant Design)
    const antField = page.locator(`.ant-form-item-label:has-text("${fieldLabel}") ~ .ant-form-item-control input, .ant-form-item-label:has-text("${fieldLabel}") ~ .ant-form-item-control select`);
    const isDisabled = await antField.first().isDisabled();
    const isReadOnly = await antField.first().getAttribute('readonly') !== null;
    expect(isDisabled || isReadOnly).toBeTruthy();
    console.log(`✓ Field read-only: ${fieldLabel}`);
  }
}
