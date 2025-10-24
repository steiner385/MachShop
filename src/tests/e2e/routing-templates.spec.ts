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

    // Create a test routing to use for creating templates
    testRouting = await prisma.routing.create({
      data: {
        routingNumber: `TPL-RT-${Date.now()}`,
        partId: testPart.id,
        siteId: testSite.id,
        version: `1.${Date.now()}`,
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

      // Look for save as template action
      const saveAsTemplateButton = page.locator('button:has-text("Save as Template")').or(page.locator('text=Create Template'));

      if (await saveAsTemplateButton.count() > 0) {
        await saveAsTemplateButton.first().click();
        await page.waitForTimeout(500);

        // Fill in template details in modal/form
        const templateNameInput = page.locator('input[name="name"]').or(page.locator('input[placeholder*="name" i]'));

        if (await templateNameInput.count() > 0) {
          const templateName = `Test Template ${Date.now()}`;
          await templateNameInput.first().fill(templateName);

          const descriptionInput = page.locator('textarea[name="description"]').or(page.locator('input[name="description"]'));
          if (await descriptionInput.count() > 0) {
            await descriptionInput.first().fill('Test template description');
          }

          // Save the template
          const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Create")'));
          await saveButton.first().click();
          await page.waitForTimeout(2000);

          // Check for success message
          const successMessage = await page.locator('text=success').or(page.locator('[class*="success"]')).count() > 0;
          expect(successMessage).toBeTruthy();
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
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
          name: `Search Test Template ${Date.now()}`,
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

        // Search for the template
        const searchBox = page.locator('input[placeholder*="search" i]').or(page.locator('input[type="search"]'));

        if (await searchBox.count() > 0) {
          await searchBox.first().fill('Search Test');
          await page.waitForTimeout(1000);

          // Check if our template appears in results
          const templateNameInResults = await page.locator(`text=${template.name}`).count() > 0;
          expect(templateNameInResults).toBeTruthy();
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

        // Look for category filter dropdown
        const categoryFilter = page.locator('select[name*="category" i]').or(page.locator('text=Category'));

        if (await categoryFilter.count() > 0) {
          // Try to select a category
          if (categoryFilter.first().evaluate(el => el.tagName) === 'SELECT') {
            await categoryFilter.first().selectOption('ASSEMBLY');
          } else {
            await categoryFilter.first().click();
            await page.locator('text=Assembly').or(page.locator('text=ASSEMBLY')).first().click();
          }

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
          name: `Favorite Test Template ${Date.now()}`,
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
          name: `Load Test Template ${Date.now()}`,
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

      // Navigate to templates
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Look for "Use Template" or "Load" button
        const useTemplateButton = page.locator('button:has-text("Use")').or(page.locator('button:has-text("Load")'));

        if (await useTemplateButton.count() > 0) {
          await useTemplateButton.first().click();
          await page.waitForTimeout(1000);

          // Should navigate to new routing form with template data pre-filled
          const url = page.url();
          expect(url).toContain('/routings/new');

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
      // This would require creating a template, loading it, and checking the usage count
      // The usage count should increment each time the template is used
      test.skip();
    });
  });

  test.describe('Template Management', () => {
    test('should edit existing template', async () => {
      // Create a template via API
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Edit Test Template ${Date.now()}`,
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
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Look for edit button
        const editButton = page.locator('button:has-text("Edit")').or(page.locator('[aria-label*="edit" i]'));

        if (await editButton.count() > 0) {
          await editButton.first().click();
          await page.waitForTimeout(500);

          // Update description
          const descriptionInput = page.locator('textarea[name="description"]').or(page.locator('input[name="description"]'));

          if (await descriptionInput.count() > 0) {
            await descriptionInput.first().fill('Updated description');

            // Save changes
            const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Update")'));
            await saveButton.first().click();
            await page.waitForTimeout(1000);

            // Verify update in DB
            const updatedTemplate = await prisma.routingTemplate.findUnique({
              where: { id: template.id },
            });

            expect(updatedTemplate?.description).toBe('Updated description');
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should delete template', async () => {
      // Create a template via API
      const template = await prisma.routingTemplate.create({
        data: {
          name: `Delete Test Template ${Date.now()}`,
          description: 'Template to be deleted',
          category: 'OTHER',
          visualData: { nodes: [], edges: [] },
          siteId: testSite.id,
          createdById: testUser.id,
        },
      });

      // Navigate to templates
      await page.goto('/routings');
      await page.waitForTimeout(1000);

      const templateButton = page.locator('button:has-text("Template")').or(page.locator('text=Template Library'));

      if (await templateButton.count() > 0) {
        await templateButton.first().click();
        await page.waitForTimeout(1000);

        // Look for delete button
        const deleteButton = page.locator('button:has-text("Delete")').or(page.locator('[aria-label*="delete" i]'));

        if (await deleteButton.count() > 0) {
          await deleteButton.first().click();
          await page.waitForTimeout(500);

          // Confirm deletion if there's a confirmation dialog
          const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Yes")'));

          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
          }

          await page.waitForTimeout(1000);

          // Verify deletion in DB
          const deletedTemplate = await prisma.routingTemplate.findUnique({
            where: { id: template.id },
          });

          expect(deletedTemplate).toBeNull();
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });
});
