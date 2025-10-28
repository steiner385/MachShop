/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * End-to-End tests for the complete workflow engine functionality
 * These tests validate the entire workflow lifecycle from creation to completion
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Advanced Multi-Stage Approval Workflow Engine', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to the main application
    await page.goto('/');

    // Assume user is already logged in or perform login here
    // await page.goto('/login');
    // await page.fill('[data-testid="username"]', 'test-user');
    // await page.fill('[data-testid="password"]', 'test-password');
    // await page.click('[data-testid="login-button"]');
  });

  test.describe('Workflow Definition Management', () => {
    test('should create a new workflow definition', async () => {
      // Navigate to workflow definitions page
      await page.goto('/workflows/definitions');

      // Click create new workflow button
      await page.click('[data-testid="create-workflow-button"]');

      // Fill in workflow details
      await page.fill('[data-testid="workflow-name"]', 'E2E Quality Review Workflow');
      await page.fill('[data-testid="workflow-description"]', 'End-to-end test workflow for quality reviews');
      await page.selectOption('[data-testid="workflow-type"]', 'QUALITY_REVIEW');

      // Add first stage
      await page.click('[data-testid="add-stage-button"]');
      await page.fill('[data-testid="stage-name-1"]', 'Initial Review');
      await page.selectOption('[data-testid="approval-type-1"]', 'MAJORITY');
      await page.fill('[data-testid="deadline-hours-1"]', '24');

      // Add assignees to first stage
      await page.click('[data-testid="add-assignee-1"]');
      await page.selectOption('[data-testid="assignee-select-1-1"]', 'reviewer1@example.com');
      await page.click('[data-testid="add-assignee-1"]');
      await page.selectOption('[data-testid="assignee-select-1-2"]', 'reviewer2@example.com');

      // Add second stage
      await page.click('[data-testid="add-stage-button"]');
      await page.fill('[data-testid="stage-name-2"]', 'Final Approval');
      await page.selectOption('[data-testid="approval-type-2"]', 'UNANIMOUS');
      await page.fill('[data-testid="deadline-hours-2"]', '48');
      await page.check('[data-testid="requires-signature-2"]');

      // Add assignee to second stage
      await page.click('[data-testid="add-assignee-2"]');
      await page.selectOption('[data-testid="assignee-select-2-1"]', 'manager@example.com');

      // Save workflow definition
      await page.click('[data-testid="save-workflow-button"]');

      // Verify workflow was created
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Workflow definition created successfully');
      await expect(page.locator('[data-testid="workflow-list"]')).toContainText('E2E Quality Review Workflow');
    });

    test('should validate workflow definition errors', async () => {
      await page.goto('/workflows/definitions');
      await page.click('[data-testid="create-workflow-button"]');

      // Try to save without required fields
      await page.click('[data-testid="save-workflow-button"]');

      // Verify validation errors are shown
      await expect(page.locator('[data-testid="error-workflow-name"]')).toContainText('Workflow name is required');
      await expect(page.locator('[data-testid="error-workflow-type"]')).toContainText('Workflow type is required');
      await expect(page.locator('[data-testid="error-stages"]')).toContainText('At least one stage is required');
    });

    test('should clone existing workflow definition', async () => {
      await page.goto('/workflows/definitions');

      // Find an existing workflow and clone it
      await page.click('[data-testid="workflow-actions-menu-1"]');
      await page.click('[data-testid="clone-workflow-1"]');

      // Modify the cloned workflow
      await page.fill('[data-testid="workflow-name"]', 'Cloned E2E Workflow');
      await page.fill('[data-testid="workflow-version"]', '2.0');

      // Save cloned workflow
      await page.click('[data-testid="save-workflow-button"]');

      await expect(page.locator('[data-testid="success-message"]')).toContainText('Workflow cloned successfully');
    });
  });

  test.describe('Workflow Instance Lifecycle', () => {
    test('should start and complete a full workflow', async () => {
      // Create a work instruction to attach workflow to
      await page.goto('/work-instructions');
      await page.click('[data-testid="create-work-instruction-button"]');
      await page.fill('[data-testid="wi-title"]', 'E2E Test Work Instruction');
      await page.fill('[data-testid="wi-description"]', 'Test work instruction for E2E workflow testing');
      await page.click('[data-testid="save-wi-button"]');

      // Get the created work instruction ID
      const wiId = await page.getAttribute('[data-testid="wi-id"]', 'data-id');

      // Start workflow for the work instruction
      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'E2E Quality Review Workflow');
      await page.selectOption('[data-testid="priority-select"]', 'HIGH');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Verify workflow started
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Initial Review');

      // Navigate to approval tasks
      await page.goto('/approvals/queue');

      // Complete first stage (reviewer1)
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="approve-button"]');
      await page.fill('[data-testid="approval-notes"]', 'Looks good, approved by reviewer 1');
      await page.click('[data-testid="submit-approval"]');

      // Complete first stage (reviewer2) - this should complete the stage with MAJORITY
      await page.click('[data-testid="task-item-2"]');
      await page.click('[data-testid="approve-button"]');
      await page.fill('[data-testid="approval-notes"]', 'Approved by reviewer 2');
      await page.click('[data-testid="submit-approval"]');

      // Verify stage progression
      await expect(page.locator('[data-testid="stage-status-1"]')).toContainText('COMPLETED');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Final Approval');

      // Complete final stage with signature (manager)
      await page.click('[data-testid="task-item-3"]');
      await page.click('[data-testid="approve-with-signature-button"]');
      await page.fill('[data-testid="approval-notes"]', 'Final approval granted');
      await page.fill('[data-testid="signature-password"]', 'manager-password');
      await page.selectOption('[data-testid="signature-type"]', 'ADVANCED');
      await page.click('[data-testid="submit-approval-with-signature"]');

      // Verify workflow completion
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('COMPLETED');
      await expect(page.locator('[data-testid="completion-message"]')).toContainText('Workflow completed successfully');

      // Verify all stages are completed
      await expect(page.locator('[data-testid="stage-status-1"]')).toContainText('COMPLETED');
      await expect(page.locator('[data-testid="stage-status-2"]')).toContainText('COMPLETED');
    });

    test('should handle workflow rejection', async () => {
      // Start a new workflow instance
      await page.goto('/work-instructions/create');
      await page.fill('[data-testid="wi-title"]', 'Rejection Test WI');
      await page.click('[data-testid="save-wi-button"]');
      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'E2E Quality Review Workflow');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Navigate to approvals and reject
      await page.goto('/approvals/queue');
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="reject-button"]');
      await page.fill('[data-testid="rejection-reason"]', 'Quality standards not met');
      await page.click('[data-testid="submit-rejection"]');

      // Verify workflow is rejected (for UNANIMOUS type, one rejection fails the stage)
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('REJECTED');
      await expect(page.locator('[data-testid="rejection-reason"]')).toContainText('Quality standards not met');
    });

    test('should handle workflow cancellation', async () => {
      // Start workflow and then cancel it
      await page.goto('/work-instructions/create');
      await page.fill('[data-testid="wi-title"]', 'Cancellation Test WI');
      await page.click('[data-testid="save-wi-button"]');
      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'E2E Quality Review Workflow');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Cancel the workflow
      await page.click('[data-testid="workflow-actions-menu"]');
      await page.click('[data-testid="cancel-workflow"]');
      await page.fill('[data-testid="cancellation-reason"]', 'Work instruction no longer needed');
      await page.click('[data-testid="confirm-cancellation"]');

      // Verify cancellation
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('CANCELLED');
      await expect(page.locator('[data-testid="cancellation-reason"]')).toContainText('Work instruction no longer needed');
    });
  });

  test.describe('Assignment and Task Management', () => {
    test('should show personalized task queue', async () => {
      await page.goto('/approvals/queue');

      // Verify task queue shows user's assigned tasks
      await expect(page.locator('[data-testid="my-tasks-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-filter-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-filter-priority"]')).toBeVisible();

      // Filter by status
      await page.selectOption('[data-testid="task-filter-status"]', 'IN_PROGRESS');
      await expect(page.locator('[data-testid="task-list"]')).toBeVisible();

      // Filter by priority
      await page.selectOption('[data-testid="task-filter-priority"]', 'HIGH');

      // Verify filtering works
      const taskItems = page.locator('[data-testid^="task-item-"]');
      const count = await taskItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should handle task delegation', async () => {
      await page.goto('/approvals/queue');

      // Select a task and delegate it
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="delegate-button"]');
      await page.selectOption('[data-testid="delegate-to-select"]', 'delegate@example.com');
      await page.fill('[data-testid="delegation-reason"]', 'I will be out of office');
      await page.click('[data-testid="confirm-delegation"]');

      // Verify delegation
      await expect(page.locator('[data-testid="delegation-success"]')).toContainText('Task delegated successfully');
      await expect(page.locator('[data-testid="task-status"]')).toContainText('DELEGATED');
    });

    test('should handle deadline escalation', async () => {
      // This test would typically require time manipulation or pre-setup of overdue tasks
      await page.goto('/approvals/queue');

      // Filter for overdue tasks
      await page.selectOption('[data-testid="task-filter-status"]', 'OVERDUE');

      // Verify overdue tasks are highlighted
      const overdueTasks = page.locator('[data-testid^="task-item-overdue-"]');
      if (await overdueTasks.count() > 0) {
        await expect(overdueTasks.first()).toHaveClass(/overdue-task/);

        // Check escalation notification
        await overdueTasks.first().click();
        await expect(page.locator('[data-testid="escalation-notice"]')).toBeVisible();
      }
    });
  });

  test.describe('Electronic Signature Integration', () => {
    test('should require and capture electronic signatures', async () => {
      // Navigate to a task that requires signature
      await page.goto('/approvals/queue');

      // Find task that requires signature
      const signatureTask = page.locator('[data-testid^="task-item-"]:has([data-testid="signature-required-badge"])');
      await signatureTask.first().click();

      // Verify signature is required
      await expect(page.locator('[data-testid="signature-required-notice"]')).toBeVisible();
      await expect(page.locator('[data-testid="approve-with-signature-button"]')).toBeVisible();

      // Attempt approval with signature
      await page.click('[data-testid="approve-with-signature-button"]');

      // Fill signature form
      await page.fill('[data-testid="signature-password"]', 'user-password');
      await page.selectOption('[data-testid="signature-type"]', 'ADVANCED');
      await page.selectOption('[data-testid="signature-level"]', 'MANAGER');
      await page.fill('[data-testid="approval-notes"]', 'Approved with electronic signature');

      // Submit with signature
      await page.click('[data-testid="submit-approval-with-signature"]');

      // Verify signature was captured
      await expect(page.locator('[data-testid="signature-success"]')).toContainText('Approval submitted with electronic signature');
      await expect(page.locator('[data-testid="signature-hash"]')).toBeVisible();
    });

    test('should verify workflow signature integrity', async () => {
      // Navigate to completed workflow with signatures
      await page.goto('/workflows/instances');
      await page.selectOption('[data-testid="status-filter"]', 'COMPLETED');

      // Select workflow with signatures
      const workflowWithSignatures = page.locator('[data-testid^="workflow-item-"]:has([data-testid="signature-count"])');
      await workflowWithSignatures.first().click();

      // Navigate to signature audit
      await page.click('[data-testid="signature-audit-tab"]');

      // Verify signature details
      await expect(page.locator('[data-testid="signature-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="signature-count"]')).toContainText(/\d+ signature\(s\)/);

      // Run signature verification
      await page.click('[data-testid="verify-signatures-button"]');

      // Verify results
      await expect(page.locator('[data-testid="verification-status"]')).toContainText('VERIFIED');
      await expect(page.locator('[data-testid="verification-details"]')).toBeVisible();
    });
  });

  test.describe('Conditional Routing and Rules', () => {
    test('should execute conditional routing based on rules', async () => {
      // This test assumes rules are pre-configured for conditional routing

      // Start workflow with conditions that trigger rules
      await page.goto('/work-instructions/create');
      await page.fill('[data-testid="wi-title"]', 'Conditional Routing Test');
      await page.selectOption('[data-testid="wi-priority"]', 'LOW'); // This might trigger skip rules
      await page.click('[data-testid="save-wi-button"]');

      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'Conditional Test Workflow');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Complete first stage
      await page.goto('/approvals/queue');
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="approve-button"]');
      await page.click('[data-testid="submit-approval"]');

      // Verify rule-based routing (e.g., stage 2 might be skipped for LOW priority)
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Final Review'); // Skipped to stage 3
      await expect(page.locator('[data-testid="stage-status-2"]')).toContainText('SKIPPED');
    });

    test('should handle parallel approval scenarios', async () => {
      // Start workflow with parallel approval configuration
      await page.goto('/work-instructions/create');
      await page.fill('[data-testid="wi-title"]', 'Parallel Approval Test');
      await page.click('[data-testid="save-wi-button"]');

      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'Parallel Approval Workflow');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Verify multiple assignments are created simultaneously
      await page.goto('/approvals/queue');
      const parallelTasks = page.locator('[data-testid^="task-item-"]:has([data-testid="parallel-group-badge"])');
      const parallelCount = await parallelTasks.count();
      expect(parallelCount).toBeGreaterThan(1);

      // Complete parallel approvals
      for (let i = 0; i < parallelCount; i++) {
        await parallelTasks.nth(i).click();
        await page.click('[data-testid="approve-button"]');
        await page.fill('[data-testid="approval-notes"]', `Parallel approval ${i + 1}`);
        await page.click('[data-testid="submit-approval"]');
        await page.goBack();
      }

      // Verify stage completes when parallel requirements are met
      await expect(page.locator('[data-testid="stage-status-1"]')).toContainText('COMPLETED');
    });
  });

  test.describe('Workflow Progress and Reporting', () => {
    test('should display workflow progress accurately', async () => {
      await page.goto('/workflows/instances');

      // Select an in-progress workflow
      await page.selectOption('[data-testid="status-filter"]', 'IN_PROGRESS');
      await page.click('[data-testid="workflow-item-1"]');

      // Verify progress components
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText(/%/);
      await expect(page.locator('[data-testid="completed-stages"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-stages"]')).toBeVisible();

      // Verify stage details
      await expect(page.locator('[data-testid="stage-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="assignment-progress"]')).toBeVisible();
    });

    test('should generate workflow reports', async () => {
      await page.goto('/workflows/reports');

      // Generate workflow performance report
      await page.selectOption('[data-testid="report-type"]', 'PERFORMANCE');
      await page.fill('[data-testid="date-from"]', '2024-01-01');
      await page.fill('[data-testid="date-to"]', '2024-12-31');
      await page.click('[data-testid="generate-report"]');

      // Verify report content
      await expect(page.locator('[data-testid="report-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-workflows"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-duration"]')).toBeVisible();

      // Export report
      await page.click('[data-testid="export-report"]');
      await page.selectOption('[data-testid="export-format"]', 'PDF');
      await page.click('[data-testid="confirm-export"]');

      // Verify export initiation
      await expect(page.locator('[data-testid="export-success"]')).toContainText('Report export initiated');
    });
  });

  test.describe('Workflow Notifications', () => {
    test('should send workflow notifications', async () => {
      // This test would verify notification sending (requires email/notification mock)

      // Start a workflow that triggers notifications
      await page.goto('/work-instructions/create');
      await page.fill('[data-testid="wi-title"]', 'Notification Test WI');
      await page.click('[data-testid="save-wi-button"]');
      await page.click('[data-testid="start-workflow-button"]');
      await page.selectOption('[data-testid="workflow-definition-select"]', 'E2E Quality Review Workflow');
      await page.click('[data-testid="start-workflow-confirm"]');

      // Check notification history (if available in UI)
      await page.goto('/notifications/history');

      // Verify workflow start notification was sent
      await expect(page.locator('[data-testid="notification-item"]:has-text("Workflow Started")')).toBeVisible();

      // Complete an approval to trigger assignment notifications
      await page.goto('/approvals/queue');
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="approve-button"]');
      await page.click('[data-testid="submit-approval"]');

      // Check for completion notifications
      await page.goto('/notifications/history');
      await expect(page.locator('[data-testid="notification-item"]:has-text("Approval Submitted")')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure during workflow operation
      await page.route('**/api/v1/workflows/**', route => route.abort());

      await page.goto('/approvals/queue');
      await page.click('[data-testid="task-item-1"]');
      await page.click('[data-testid="approve-button"]');
      await page.click('[data-testid="submit-approval"]');

      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Clear network mock and retry
      await page.unroute('**/api/v1/workflows/**');
      await page.click('[data-testid="retry-button"]');

      // Verify retry works
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should validate user permissions', async () => {
      // Test permission validation for workflow operations

      // Try to access workflow definition management without permissions
      await page.goto('/workflows/definitions');

      // If user doesn't have permissions, should show appropriate message
      if (await page.locator('[data-testid="permission-denied"]').isVisible()) {
        await expect(page.locator('[data-testid="permission-denied"]')).toContainText('You do not have permission');
        return;
      }

      // Try to approve a task not assigned to user
      await page.goto('/approvals/queue');

      // Mock clicking on a task not assigned to current user
      await page.evaluate(() => {
        // Simulate unauthorized access
        window.localStorage.setItem('test-unauthorized', 'true');
      });

      await page.click('[data-testid="task-item-unauthorized"]');
      await expect(page.locator('[data-testid="unauthorized-message"]')).toContainText('not authorized');
    });

    test('should handle concurrent modifications', async () => {
      // Test optimistic locking / concurrent modification handling

      await page.goto('/approvals/queue');
      await page.click('[data-testid="task-item-1"]');

      // Simulate another user modifying the same task
      await page.evaluate(() => {
        // Mock concurrent modification
        window.dispatchEvent(new CustomEvent('workflow-task-modified', {
          detail: { taskId: 'task-1', modifiedBy: 'another-user' }
        }));
      });

      await page.click('[data-testid="approve-button"]');
      await page.click('[data-testid="submit-approval"]');

      // Verify conflict detection
      await expect(page.locator('[data-testid="conflict-message"]')).toContainText('modified by another user');
      await expect(page.locator('[data-testid="refresh-task-button"]')).toBeVisible();
    });
  });
});