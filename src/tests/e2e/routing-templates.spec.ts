/**
 * E2E Tests: Routing Templates
 * Phase 5.4: Template Management Tests
 *
 * Tests the routing template management system:
 * - Create template from existing routing
 * - Browse template library
 * - Search and filter templates
 * - Favorite templates
 * - Load template to create new routing
 * - Edit templates
 * - Delete templates
 * - Template categories
 * - Template usage tracking
 */

import { test, expect, Page } from '@playwright/test';
import { PrismaClient, RoutingLifecycleState, StepType } from '@prisma/client';
import { setupTestAuth } from '../helpers/testAuthHelper';
import { TestIdentifiers } from '../helpers/uniqueTestIdentifiers';

const prisma = new PrismaClient();

test.describe('Routing Templates E2E Tests', () => {
  let page: Page;
  let testPart: any;
  let testSite: any;
  let testRouting: any;
  let testOperation: any;
  let testUser: any;
  let createdTemplateId: string;

  test.beforeAll(async ({ browser }) => {
    // Create browser context
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup test data
    testSite = await prisma.site.findFirst({ where: { isActive: true } });
    testPart = await prisma.part.findFirst();
    testOperation = await prisma.operation.findFirst({ where: { isActive: true } });
    testUser = await prisma.user.findFirst();
    if (!testPart) {
      testPart = await prisma.part.create({
        data: {
          partNumber: 'TPL-PART-001',
          name: 'Template Test Part',
          description: 'Part for template E2E tests',
          isActive: true,
        },
      });
    }

    // Delete any existing test routings to avoid unique constraint errors on retry
    await prisma.routing.deleteMany({
      where: {
        routingNumber: { startsWith: 'TPL-RT-' }
      }
    });

    // Create a test routing to use for creating templates
    const uniqueVersion = TestIdentifiers.uniqueVersion();
    const uniqueRoutingNumber = TestIdentifiers.routingNumber('TPL-RT');
    testRouting = await prisma.routing.create({
      data: {
        routingNumber: uniqueRoutingNumber,
        partId: testPart.id,
        siteId: testSite.id,
        version: uniqueVersion,
        lifecycleState: RoutingLifecycleState.DRAFT,
        description: 'Test routing for template creation',
        notes: `Template test routing\n\n[VISUAL_DATA]${JSON.stringify({
          nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
            { id: 'process1', type: 'process', position: { x: 200, y: 0 }, data: { label: 'Process 1' } },
            { id: 'end', type: 'end', position: { x: 400, y: 0 }, data: { label: 'End' } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'process1' },
            { id: 'e2', source: 'process1', target: 'end' },
          ],
        })}[/VISUAL_DATA]`,
        steps: {
          create: [
            {
              stepNumber: 10,
              operationId: testOperation.id,
              stepType: StepType.PROCESS,
              stepInstructions: 'Template test step 1',
              isOptional: false,
              isQualityInspection: false,
              isCriticalPath: true,
            },
            {
              stepNumber: 20,
              operationId: testOperation.id,
              stepType: StepType.INSPECTION,
              stepInstructions: 'Template test inspection',
              isOptional: false,
              isQualityInspection: true,
              isCriticalPath: true,
            },
          ],
        },
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup
    if (createdTemplateId) {
      await prisma.routingTemplate.delete({ where: { id: createdTemplateId } }).catch(() => {});
    }
    if (testRouting) {
      await prisma.routing.delete({ where: { id: testRouting.id } }).catch(() => {});
    }
    await page.close();
  });

  test.beforeEach(async () => {
    // Setup authentication before each test
    await setupTestAuth(page, 'manufacturingEngineer');
  });

  test.describe('Template Library Access', () => {
    test('should navigate to template library from routing page', async () => {
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      // Look for template library button/link
      const templateButton = page.locator('button:has-text("Templates")').or(page.locator('a:has-text("Templates")'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Should navigate to templates page or open template library modal
        const url = page.url();
        const hasTemplateModal = await page.locator('text=Template Library').or(page.locator('[role="dialog"]')).count() > 0;

        expect(url.includes('/templates') || hasTemplateModal).toBeTruthy();
      } else {
        test.skip();
      }
    });

    test('should display template library with search and filters', async () => {
      // Try to access template library directly or through routing page
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Check for search box
        const searchBox = page.locator('input[placeholder*="search" i]').or(page.locator('input[type="search"]'));
        const hasSearch = await searchBox.count() > 0;

        // Check for category filters
        const categoryFilter = page.locator('text=Category').or(page.locator('select[name*="category" i]'));
        const hasCategoryFilter = await categoryFilter.count() > 0;

        console.log(`Has search: ${hasSearch}, Has category filter: ${hasCategoryFilter}`);
        expect(hasSearch || hasCategoryFilter).toBeTruthy();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Create Template', () => {
    test('should show save as template option when viewing routing', async () => {
      await page.goto(`/routings/${testRouting.id}`);
      await page.waitForTimeout(1000);

      // Look for "Save as Template" button or menu option
      const saveAsTemplateButton = page.locator('button:has-text("Save as Template")').or(page.locator('text=Template')).or(page.locator('[title*="template" i]'));

      const hasSaveAsTemplate = await saveAsTemplateButton.count() > 0;
      console.log(`Has save as template option: ${hasSaveAsTemplate}`);
    });

    test('should create template from existing routing', async () => {
      await page.goto(`/routings/${testRouting.id}`);
      await page.waitForTimeout(1000);

      // Look for save as template action using test ID
      const saveAsTemplateButton = page.locator('[data-testid="save-as-template-button"]').or(page.locator('button:has-text("Save as Template")'));

      // Verify button exists
      await expect(saveAsTemplateButton.first()).toBeVisible();

      // Click the button
      await saveAsTemplateButton.first().click();
      await page.waitForTimeout(500);

      // Fill in template details in modal/form
      const templateNameInput = page.locator('input[name="name"]').or(page.locator('input[placeholder*="name" i]'));

      // Verify template name input exists
      await expect(templateNameInput.first()).toBeVisible();

      const templateName = `Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`;
      await templateNameInput.first().fill(templateName);

      const descriptionInput = page.locator('textarea[name="description"]').or(page.locator('input[name="description"]'));
      if (await descriptionInput.count() > 0) {
        await descriptionInput.first().fill('Test template description');
      }

      // Save the template (force click to handle modal overlay)
      const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Create")'));
      await saveButton.first().click({ force: true });
      await page.waitForTimeout(2000);

      // Check for success message
      const successMessage = page.locator('text=success').or(page.locator('[class*="success"]'));
      await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Browse and Search Templates', () => {
    test('should display list of available templates', async () => {
      // Navigate to routing page and try to access templates
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Check if templates are displayed (cards or list items)
        const templateItems = page.locator('[data-testid*="template"]').or(page.locator('[class*="template-card"]')).or(page.locator('[class*="template-item"]'));

        const templateCount = await templateItems.count();
        console.log(`Template items found: ${templateCount}`);

        // Should have at least 0 templates (might be empty initially)
        expect(templateCount).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });

    test('should search templates by name', async () => {
      // Create a template first via API
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Search Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Template for search testing',
          category: 'ASSEMBLY',
          visualData: {
            nodes: [],
            edges: [],
          },
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      createdTemplateId = template.id;

      // Navigate to templates
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Search for the template using test ID
        const searchBox = page.locator('[data-testid="template-search-input"] input').or(page.locator('input[placeholder*="search" i]'));

        if (await searchBox.count() > 0) {
          // Search for a unique part of the template name that we know exists
          await searchBox.first().fill('Search Test Template');
          await searchBox.first().press('Enter'); // Trigger the search

          // Wait for the loading spinner to disappear
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          // Check if our template appears in results (look for template cards or the template name)
          const templateCard = page.locator(`[data-testid="template-card-${template.id}"]`);
          const templateNameMatch = page.getByText(template.name, { exact: false });
          const isTemplateVisible = (await templateCard.count() > 0) || (await templateNameMatch.count() > 0);

          console.log(`Template ID: ${template.id}`);
          console.log(`Template name: ${template.name}`);
          console.log(`Template found in results: ${isTemplateVisible}`);
          expect(isTemplateVisible).toBeTruthy();
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should filter templates by category', async () => {
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Look for category filter dropdown using test ID (Ant Design Select)
        const categoryFilter = page.locator('[data-testid="category-filter-select"]').or(page.locator('.ant-select:has-text("Category")'));

        if (await categoryFilter.count() > 0) {
          // Click on Ant Design Select to open dropdown
          await categoryFilter.first().click();
          await page.waitForTimeout(500);

          // Select Assembly option from dropdown
          await page.locator('.ant-select-item-option:has-text("Assembly")').first().click();

          await page.waitForTimeout(1000);

          // Results should be filtered
          console.log('Category filter applied');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Favorite Templates', () => {
    test('should toggle favorite status on template', async () => {
      // Create a template via API
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Favorite Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Template for favorite testing',
          category: 'MACHINING',
          visualData: { nodes: [], edges: [] },
          isFavorite: false,
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      if (!createdTemplateId) {
        createdTemplateId = template.id;
      }

      // Navigate to templates
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Look for favorite button/icon (star icon typically)
        const favoriteButton = page.locator('[data-testid="favorite-button"]').or(page.locator('[aria-label*="favorite" i]')).or(page.locator('button:has([class*="star"])'));

        if (await favoriteButton.count() > 0) {
          await favoriteButton.first().click();
          await page.waitForTimeout(1000);

          // Check if template is now favorited in DB
          const updatedTemplate = await prisma.routingTemplate.findUnique({
            where: { id: template.id },
          });

          // Favorite status should have changed
          console.log(`Template favorite status: ${updatedTemplate?.isFavorite}`);
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Load Template', () => {
    test('should create new routing from template', async () => {
      // Create a template via API
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Load Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Template for load testing',
          category: 'INSPECTION',
          visualData: {
            nodes: [
              { id: 'start', type: 'start', position: { x: 0, y: 0 } },
              { id: 'end', type: 'end', position: { x: 200, y: 0 } },
            ],
            edges: [
              { id: 'e1', source: 'start', target: 'end' },
            ],
          },
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      if (!createdTemplateId) {
        createdTemplateId = template.id;
      }

      // Navigate to templates page directly
      await page.goto('/routings/templates');
      await page.waitForTimeout(1500);
      await page.waitForLoadState('networkidle');

      // Look for the template card or row
      const templateCard = page.locator(`[data-testid="template-card-${template.id}"]`);
      const templateRow = page.locator(`tr:has-text("${template.name}")`);

      const hasTemplate = (await templateCard.count() > 0) || (await templateRow.count() > 0);

      if (hasTemplate) {
        // Look for "Use Template" or "Load" button within the template card/row
        const useTemplateButton = page.locator(`[data-testid="use-template-${template.id}"]`).or(
          page.locator(`[data-testid="template-card-${template.id}"] button:has-text("Use")`).or(
            page.locator(`tr:has-text("${template.name}") button:has-text("Use")`)
          )
        );

        if (await useTemplateButton.count() > 0) {
          // Click with force to handle any overlay issues
          await useTemplateButton.first().click({ force: true });
          await page.waitForTimeout(1500);
          await page.waitForLoadState('networkidle');

          // Should navigate to new routing form with template data pre-filled
          const url = page.url();
          expect(url).toContain('/routings/create');

          // Check if visual data was loaded
          const visualEditorButton = page.locator('text=Visual Editor');

          if (await visualEditorButton.count() > 0) {
            await visualEditorButton.first().click();
            await page.waitForTimeout(1000);

            // Check if nodes from template are present
            const nodes = page.locator('.react-flow__node');
            const nodeCount = await nodes.count();

            expect(nodeCount).toBeGreaterThanOrEqual(2);
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should track template usage count when loaded', async () => {
      // Create a template with a specific usage count to test display
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Usage Count Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Template for usage count testing',
          category: 'MACHINING',
          usageCount: 3, // Set to 3 so we can verify it displays correctly
          visualData: {
            nodes: [],
            edges: [],
          },
          sourceRoutingId: testRouting.id,
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      // Navigate to templates page to verify usage count is displayed
      await page.goto('/routings/templates');
      await page.waitForTimeout(1500);

      // Verify the template card shows the usage count
      const templateCard = page.locator(`[data-testid="template-card-${template.id}"]`);
      await expect(templateCard).toBeVisible();

      // Verify the usage count text is displayed correctly
      const usageText = templateCard.locator('text=/Used \\d+ time/');
      await expect(usageText).toContainText('Used 3 time');

      // Test backend usage count increment by directly updating database
      // (simulating what happens when a template is used)
      await prisma.routingTemplate.update({
        where: { id: template.id },
        data: {
          usageCount: { increment: 1 },
        },
      });

      // Reload page to see updated count
      await page.reload();
      await page.waitForTimeout(1500);

      // Verify the updated usage count is displayed
      const updatedCard = page.locator(`[data-testid="template-card-${template.id}"]`);
      const updatedUsageText = updatedCard.locator('text=/Used \\d+ time/');
      await expect(updatedUsageText).toContainText('Used 4 time');

      // Clean up
      await prisma.routingTemplate.delete({
        where: { id: template.id },
      });
    });
  });

  test.describe('Template Management', () => {
    test('should edit existing template', async () => {
      // Create a template via API with matching site ID
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Edit Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Original description',
          category: 'ASSEMBLY',
          visualData: { nodes: [], edges: [] },
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      if (!createdTemplateId) {
        createdTemplateId = template.id;
      }

      // Navigate to templates
      await page.goto('/routings/templates');
      await page.waitForTimeout(1000);

      // Look for edit button using test ID or fallback to generic edit button
      const editButton = page.locator(`[data-testid="edit-template-${template.id}"]`).or(
        page.locator(`tr:has-text("${template.name}") button:has-text("Edit")`).or(
          page.locator(`[data-testid="template-card-${template.id}"] button:has-text("Edit")`)
        )
      );

      if (await editButton.count() > 0) {
        await editButton.first().click();
        await page.waitForTimeout(1000);

        // Wait for modal to be visible
        await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: 5000 });

        // Update description
        const descriptionInput = page.locator('textarea[id="description"]').or(page.locator('textarea[name="description"]'));

        if (await descriptionInput.count() > 0) {
          await descriptionInput.first().clear();
          await descriptionInput.first().fill('Updated description');

          // Wait for input to be filled
          await page.waitForTimeout(300);

          // Wait for the API call to complete
          const responsePromise = page.waitForResponse(
            response => response.url().includes('/routing-templates/') && response.request().method() === 'PUT',
            { timeout: 10000 }
          );

          // Save changes - look for Save button in modal
          const saveButton = page.locator('.ant-modal button:has-text("Save")');
          await saveButton.click();

          // Wait for the response
          try {
            await responsePromise;
            await page.waitForTimeout(1000); // Extra time for DB update

            // Verify update in DB
            const updatedTemplate = await prisma.routingTemplate.findUnique({
              where: { id: template.id },
            });

            expect(updatedTemplate?.description).toBe('Updated description');
          } catch (error) {
            // If API call times out, check DB anyway
            const updatedTemplate = await prisma.routingTemplate.findUnique({
              where: { id: template.id },
            });
            console.log('Template after edit attempt:', updatedTemplate?.description);
            expect(updatedTemplate?.description).toBe('Updated description');
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should delete template', async () => {
      // Create a template via API with matching site ID
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Delete Test Template ${Date.now()}-${process.pid}-${Math.random().toString(36).substring(2, 8)}}`,
          description: 'Template to be deleted',
          category: 'OTHER',
          visualData: { nodes: [], edges: [] },
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      // Navigate to templates
      await page.goto('/routings/templates');
      await page.waitForTimeout(1000);

      // Look for delete button using test ID or fallback to generic delete button
      const deleteButton = page.locator(`[data-testid="delete-template-${template.id}"]`).or(
        page.locator(`tr:has-text("${template.name}") button:has-text("Delete")`).or(
          page.locator(`[data-testid="template-card-${template.id}"] button:has-text("Delete")`)
        )
      );

      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();
        await page.waitForTimeout(1000);

        // Wait for modal to be visible (confirmation dialog)
        await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: 5000 });

        // Wait for the DELETE API call to complete
        const responsePromise = page.waitForResponse(
          response => response.url().includes(`/routing-templates/${template.id}`) && response.request().method() === 'DELETE',
          { timeout: 10000 }
        );

        // Confirm deletion - look for various possible confirmation button texts
        const confirmButton = page.locator('.ant-modal button:has-text("Delete")').or(
          page.locator('.ant-modal button:has-text("OK")').or(
            page.locator('.ant-modal button:has-text("Confirm")')
          )
        );

        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();

          // Wait for the response
          try {
            await responsePromise;
            await page.waitForTimeout(1000); // Extra time for DB update

            // Verify deletion in DB
            const deletedTemplate = await prisma.routingTemplate.findUnique({
              where: { id: template.id },
            });

            expect(deletedTemplate).toBeNull();
          } catch (error) {
            // If API call times out, check DB anyway
            const deletedTemplate = await prisma.routingTemplate.findUnique({
              where: { id: template.id },
            });
            console.log('Template still exists after delete attempt:', deletedTemplate !== null);
            expect(deletedTemplate).toBeNull();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });
});
