/**
 * ✅ GITHUB ISSUE #22: ECO E2E Tests
 *
 * End-to-end tests for Engineering Change Order system
 * covering complete workflow from creation to completion.
 */

import { test, expect } from '@playwright/test';

test.describe('ECO (Engineering Change Order) Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ECO dashboard
    await page.goto('/eco');
  });

  test('Complete ECO lifecycle - Create, Review, CRB, Implementation, Complete', async ({ page }) => {
    // Step 1: Create new ECO
    await page.click('button:has-text("Create ECO")');

    // Fill out ECO form
    await page.fill('input[name="title"]', 'E2E Test ECO - Process Improvement');
    await page.fill('textarea[name="description"]', 'Test ECO for end-to-end workflow validation');
    await page.selectOption('select[name="ecoType"]', 'IMPROVEMENT');
    await page.selectOption('select[name="priority"]', 'MEDIUM');

    // Next step - Change Details
    await page.click('button:has-text("Next")');

    await page.fill('textarea[name="currentState"]', 'Current manual process is slow and error-prone');
    await page.fill('textarea[name="proposedChange"]', 'Implement automated solution with validation');
    await page.fill('textarea[name="reasonForChange"]', 'Improve efficiency and reduce errors');

    // Next step - Impact & Cost
    await page.click('button:has-text("Next")');

    await page.fill('input[name="affectedParts"]', 'PART-001,PART-002');
    await page.fill('input[name="affectedOperations"]', 'OP-100');
    await page.fill('input[name="estimatedCost"]', '5000');
    await page.fill('input[name="estimatedSavings"]', '15000');

    // Next step - Effectivity
    await page.click('button:has-text("Next")');

    await page.selectOption('select[name="effectivityType"]', 'BY_DATE');
    await page.fill('input[name="effectivityValue"]', '2024-12-31');

    // Submit ECO
    await page.click('button:has-text("Submit ECO")');

    // Verify ECO was created
    await expect(page).toHaveURL(/\/eco\/\w+/);
    await expect(page.locator('h1')).toContainText('ECO-');
    await expect(page.locator('text=REQUESTED')).toBeVisible();

    // Get ECO ID from URL
    const url = page.url();
    const ecoId = url.split('/').pop();

    // Step 2: Start approval workflow
    await page.click('button:has-text("Start Approval")');
    await expect(page.locator('text=UNDER_REVIEW')).toBeVisible();

    // Step 3: Simulate approval workflow completion
    // In a real test, this would involve multiple users and approvals
    await page.evaluate(async (ecoId) => {
      await fetch(`/api/v1/eco/${ecoId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING_CRB',
          reason: 'Approved for CRB review'
        })
      });
    }, ecoId);

    await page.reload();
    await expect(page.locator('text=PENDING_CRB')).toBeVisible();

    // Step 4: Simulate CRB approval
    await page.evaluate(async (ecoId) => {
      await fetch(`/api/v1/eco/${ecoId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CRB_APPROVED',
          reason: 'CRB approved for implementation'
        })
      });
    }, ecoId);

    await page.reload();
    await expect(page.locator('text=CRB_APPROVED')).toBeVisible();

    // Step 5: Move to implementation
    await page.evaluate(async (ecoId) => {
      await fetch(`/api/v1/eco/${ecoId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IMPLEMENTATION',
          reason: 'Starting implementation phase'
        })
      });
    }, ecoId);

    await page.reload();
    await expect(page.locator('text=IMPLEMENTATION')).toBeVisible();

    // Step 6: Check that implementation tasks were created
    await page.click('button:has-text("Tasks")');
    await expect(page.locator('text=Update Affected Documents')).toBeVisible();
    await expect(page.locator('text=PENDING')).toBeVisible();

    // Step 7: Complete tasks and ECO
    // Simulate task completion
    const taskElements = await page.locator('[data-testid="task-item"]').all();
    for (const task of taskElements) {
      await task.locator('button:has-text("Complete")').click();
      await page.fill('textarea[placeholder*="completion notes"]', 'Task completed successfully');
      await page.click('button:has-text("Mark Complete")');
    }

    // Complete the ECO
    await page.click('button:has-text("Complete ECO")');
    await expect(page.locator('text=COMPLETED')).toBeVisible();

    // Verify completion
    await expect(page.locator('text=ECO completed successfully')).toBeVisible();
  });

  test('Create ECO and analyze impact', async ({ page }) => {
    // Create basic ECO
    await page.click('button:has-text("Create ECO")');

    await page.fill('input[name="title"]', 'Impact Analysis Test ECO');
    await page.fill('textarea[name="description"]', 'Test ECO for impact analysis');
    await page.selectOption('select[name="ecoType"]', 'IMPROVEMENT');
    await page.selectOption('select[name="priority"]', 'HIGH');

    // Navigate to impact section
    await page.click('button:has-text("Next")');
    await page.fill('textarea[name="currentState"]', 'Test current state');
    await page.fill('textarea[name="proposedChange"]', 'Test proposed change');
    await page.fill('textarea[name="reasonForChange"]', 'Test reason');

    await page.click('button:has-text("Next")');

    // Add affected items
    await page.fill('input[name="affectedParts"]', 'PART-001,PART-002,PART-003');
    await page.fill('input[name="affectedOperations"]', 'OP-100,OP-200');
    await page.fill('input[name="estimatedCost"]', '25000');

    // Trigger impact analysis
    await page.click('button:has-text("Analyze Impact")');

    // Wait for impact analysis results
    await page.waitForSelector('[data-testid="impact-analysis-results"]');

    // Verify impact analysis shows results
    await expect(page.locator('text=Documents Affected')).toBeVisible();
    await expect(page.locator('text=Implementation Time')).toBeVisible();
    await expect(page.locator('text=Estimated Impact')).toBeVisible();

    // Check that complexity is calculated
    await expect(page.locator('text=HIGH')).toBeVisible(); // Should show HIGH complexity due to many affected items
  });

  test('ECO filtering and search functionality', async ({ page }) => {
    // Test that ECO dashboard loads
    await expect(page.locator('h2:has-text("Engineering Change Orders")')).toBeVisible();

    // Test status filter
    await page.click('input[placeholder="Status"]');
    await page.click('text=REQUESTED');
    await page.click('text=UNDER_REVIEW');
    await page.keyboard.press('Escape');

    // Apply filters and verify URL params
    await expect(page).toHaveURL(/status=/);

    // Test priority filter
    await page.click('input[placeholder="Priority"]');
    await page.click('text=HIGH');
    await page.keyboard.press('Escape');

    // Test search functionality
    await page.fill('input[placeholder="Search ECOs..."]', 'improvement');
    await page.keyboard.press('Enter');

    // Verify search results are filtered
    await expect(page.locator('table tbody tr')).toHaveCount(0); // No existing data in test

    // Test clear filters
    await page.click('button:has-text("Clear")');
    await expect(page).toHaveURL(/\/eco$/); // Should clear all query params
  });

  test('ECO attachment upload functionality', async ({ page }) => {
    // Create ECO first
    await page.click('button:has-text("Create ECO")');

    // Fill minimal required fields
    await page.fill('input[name="title"]', 'Attachment Test ECO');
    await page.fill('textarea[name="description"]', 'Test ECO for attachment upload');
    await page.selectOption('select[name="ecoType"]', 'IMPROVEMENT');
    await page.selectOption('select[name="priority"]', 'MEDIUM');

    // Navigate to impact section where attachments are
    await page.click('button:has-text("Next")');
    await page.fill('textarea[name="currentState"]', 'Test state');
    await page.fill('textarea[name="proposedChange"]', 'Test change');
    await page.fill('textarea[name="reasonForChange"]', 'Test reason');

    await page.click('button:has-text("Next")');

    // Test attachment upload
    const fileInput = page.locator('input[type="file"]');

    // Create a test file to upload
    const testFile = {
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test file content')
    };

    await fileInput.setInputFiles(testFile);

    // Verify file appears in upload list
    await expect(page.locator('text=test-document.pdf')).toBeVisible();

    // Save as draft to test attachment persistence
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=saved successfully')).toBeVisible();
  });

  test('ECO status transitions and validation', async ({ page }) => {
    // This test would verify that status transitions follow business rules
    // For now, we'll test the UI validation

    // Try to create ECO with missing required fields
    await page.click('button:has-text("Create ECO")');

    // Try to proceed without filling required fields
    await page.click('button:has-text("Next")');

    // Should show validation errors
    await expect(page.locator('text=Please enter ECO title')).toBeVisible();

    // Fill title but leave description empty
    await page.fill('input[name="title"]', 'Test Title');
    await page.click('button:has-text("Next")');

    await expect(page.locator('text=Please enter description')).toBeVisible();

    // Complete required fields
    await page.fill('textarea[name="description"]', 'Test Description');
    await page.selectOption('select[name="ecoType"]', 'IMPROVEMENT');
    await page.selectOption('select[name="priority"]', 'MEDIUM');

    // Should now be able to proceed
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Change Details')).toBeVisible();
  });

  test('ECO dashboard metrics and statistics', async ({ page }) => {
    // Verify dashboard stats cards are present
    await expect(page.locator('text=Total ECOs')).toBeVisible();
    await expect(page.locator('text=Avg Cycle Time')).toBeVisible();
    await expect(page.locator('text=Cost Savings')).toBeVisible();
    await expect(page.locator('text=Completion Rate')).toBeVisible();

    // Verify table is present
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("ECO Number")')).toBeVisible();
    await expect(page.locator('th:has-text("Title & Description")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    // Test refresh functionality
    await page.click('button:has-text("Refresh")');
    await expect(page.locator('table')).toBeVisible(); // Should still be visible after refresh
  });
});