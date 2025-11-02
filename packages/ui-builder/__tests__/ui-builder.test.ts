/**
 * Comprehensive Test Suite for UI Builder
 * Covers all 5 issues: Canvas, Templates, Multi-Site, API, Documentation
 */

import {
  CanvasElement,
  CanvasElementType,
  FormTemplate,
  FormCategory,
  InheritanceLevel,
} from '../src/types';
import { CanvasEditor } from '../src/canvas/CanvasEditor';
import { TemplateManager } from '../src/templates/TemplateManager';
import { MultiSiteManager } from '../src/multisite/MultiSiteManager';
import { FormAPIService } from '../src/api/FormAPIService';
import { DocumentationGenerator } from '../src/docs/DocumentationGenerator';

// ============================================================================
// Canvas Editor Tests (#485)
// ============================================================================

describe('CanvasEditor', () => {
  let editor: CanvasEditor;

  beforeEach(() => {
    editor = new CanvasEditor();
  });

  describe('Element Management', () => {
    test('should add element to canvas', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      const retrieved = editor.getElement('elem1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Container');
    });

    test('should remove element from canvas', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.BUTTON,
        name: 'Button',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.removeElement('elem1');

      expect(editor.getElement('elem1')).toBeUndefined();
    });

    test('should update element properties', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.TEXT,
        name: 'Text',
        props: { text: 'Hello' },
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.updateElement('elem1', { name: 'Updated Text' });

      const updated = editor.getElement('elem1');
      expect(updated?.name).toBe('Updated Text');
    });

    test('should get all elements', () => {
      const elem1: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container 1',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      const elem2: CanvasElement = {
        id: 'elem2',
        type: CanvasElementType.BUTTON,
        name: 'Button 1',
        props: {},
        styles: {},
        position: { x: 100, y: 0 },
        size: { width: 100, height: 50 },
        zIndex: 2,
        visible: true,
        locked: false,
      };

      editor.addElement(elem1);
      editor.addElement(elem2);

      const elements = editor.getAllElements();
      expect(elements).toHaveLength(2);
    });
  });

  describe('Selection', () => {
    test('should select element', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.selectElement('elem1');

      const selected = editor.getSelectedElement();
      expect(selected?.id).toBe('elem1');
      expect(selected?.selected).toBe(true);
    });

    test('should deselect element', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.selectElement('elem1');
      editor.deselectElement();

      expect(editor.getSelectedElement()).toBeUndefined();
    });
  });

  describe('Movement & Resizing', () => {
    test('should move element', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.moveElement('elem1', 50, 50);

      const moved = editor.getElement('elem1');
      expect(moved?.position).toEqual({ x: 50, y: 50 });
    });

    test('should resize element', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.resizeElement('elem1', 200, 150);

      const resized = editor.getElement('elem1');
      expect(resized?.size).toEqual({ width: 200, height: 150 });
    });

    test('should snap to grid', () => {
      editor.setGridSize(10);
      editor.setSnapToGrid(true);

      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.moveElement('elem1', 25, 25);

      const moved = editor.getElement('elem1');
      expect(moved?.position).toEqual({ x: 30, y: 30 });
    });
  });

  describe('Undo/Redo', () => {
    test('should undo element addition', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      expect(editor.getElement('elem1')).toBeDefined();

      editor.undo();
      expect(editor.getElement('elem1')).toBeUndefined();
    });

    test('should redo element addition', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.undo();
      editor.redo();

      expect(editor.getElement('elem1')).toBeDefined();
    });
  });

  describe('Copy/Paste', () => {
    test('should copy and paste element', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      editor.copyElement('elem1');
      const pasted = editor.pasteElement();

      expect(pasted).toBeDefined();
      expect(pasted?.name).toBe('Container');
      expect(editor.getAllElements()).toHaveLength(2);
    });
  });

  describe('Export/Import', () => {
    test('should export and import canvas', () => {
      const elem: CanvasElement = {
        id: 'elem1',
        type: CanvasElementType.CONTAINER,
        name: 'Container',
        props: {},
        styles: {},
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        visible: true,
        locked: false,
      };

      editor.addElement(elem);
      const exported = editor.exportCanvas();

      const newEditor = new CanvasEditor();
      newEditor.importCanvas(exported);

      expect(newEditor.getElement('elem1')).toBeDefined();
    });
  });
});

// ============================================================================
// Template Manager Tests (#486)
// ============================================================================

describe('TemplateManager', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  describe('Template Management', () => {
    test('should list all templates', () => {
      const templates = manager.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    test('should get template by category', () => {
      const workOrderTemplates = manager.listTemplates(FormCategory.WORK_ORDER);
      expect(workOrderTemplates.length).toBeGreaterThan(0);
      workOrderTemplates.forEach((t) => {
        expect(t.category).toBe(FormCategory.WORK_ORDER);
      });
    });

    test('should search templates', () => {
      const results = manager.searchTemplates('Work Order');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should create custom template', () => {
      const template: FormTemplate = {
        id: 'custom_1',
        name: 'Custom Template',
        title: 'Custom Form',
        description: 'A custom template',
        category: FormCategory.WORK_ORDER,
        version: '1.0.0',
        tags: ['custom'],
        canvasElements: [],
        dataBindings: [],
        manufacturingDomain: 'MES',
        useCases: [],
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
      };

      manager.createCustomTemplate(template);
      const retrieved = manager.getTemplate('custom_1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Template');
    });

    test('should clone template', () => {
      const cloned = manager.cloneTemplate(
        manager.listTemplates()[0].id,
        'cloned_1',
        'Cloned Template'
      );

      expect(cloned).toBeDefined();
      expect(cloned?.name).toBe('Cloned Template');
    });
  });

  describe('Template Statistics', () => {
    test('should get template statistics', () => {
      const stats = manager.getStatistics();

      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.published).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Multi-Site Manager Tests (#487)
// ============================================================================

describe('MultiSiteManager', () => {
  let manager: MultiSiteManager;
  let form: FormTemplate;

  beforeEach(() => {
    manager = new MultiSiteManager();
    form = {
      id: 'form_1',
      name: 'Test Form',
      title: 'Test',
      description: 'Test form',
      category: FormCategory.WORK_ORDER,
      version: '1.0.0',
      tags: [],
      canvasElements: [],
      dataBindings: [],
      manufacturingDomain: 'MES',
      useCases: [],
      createdBy: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true,
    };

    manager.registerForm('form_1', form);
  });

  describe('Site Configuration', () => {
    test('should create site configuration', () => {
      const config = manager.createSiteConfig(
        'form_1',
        'site_1',
        'Site 1',
        'North America'
      );

      expect(config).toBeDefined();
      expect(config?.siteId).toBe('site_1');
    });

    test('should get site configuration', () => {
      manager.createSiteConfig('form_1', 'site_1', 'Site 1', 'North America');
      const config = manager.getSiteConfig('form_1', 'site_1');

      expect(config).toBeDefined();
      expect(config?.siteName).toBe('Site 1');
    });

    test('should update site configuration', () => {
      manager.createSiteConfig('form_1', 'site_1', 'Site 1', 'North America');
      manager.updateSiteConfig('form_1', 'site_1', { customField: 'value' });

      const config = manager.getSiteConfig('form_1', 'site_1');
      expect(config?.overrides.get('customField')).toBe('value');
    });
  });

  describe('Versioning', () => {
    test('should create version', () => {
      const version = manager.createVersion('form_1', '2.0.0', form);

      expect(version).toBeDefined();
      expect(version?.version).toBe('2.0.0');
    });

    test('should get version', () => {
      manager.createVersion('form_1', '2.0.0', form);
      const version = manager.getVersion('form_1', '2.0.0');

      expect(version).toBeDefined();
    });

    test('should list versions', () => {
      const versions = manager.listVersions('form_1');

      expect(versions.length).toBeGreaterThan(0);
    });

    test('should activate version', () => {
      manager.createVersion('form_1', '2.0.0', form);
      manager.activateVersion('form_1', '2.0.0');

      const version = manager.getVersion('form_1', '2.0.0');
      expect(version?.isActive).toBe(true);
    });
  });

  describe('Synchronization', () => {
    test('should sync form', async () => {
      manager.createSiteConfig('form_1', 'site_1', 'Site 1', 'North America');

      const result = await manager.syncForm('form_1');
      expect(result).toBe(true);

      const status = manager.getSyncStatus('form_1');
      expect(status?.status).toBe('synced');
    });
  });
});

// ============================================================================
// API Service Tests (#488)
// ============================================================================

describe('FormAPIService', () => {
  let api: FormAPIService;

  beforeEach(() => {
    api = new FormAPIService();
  });

  describe('API Operations', () => {
    test('should submit form data', async () => {
      const response = await api.submitFormData('form_1', { field1: 'value1' });

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
    });

    test('should get form', async () => {
      const response = await api.getForm('form_1');

      expect(response.success).toBe(true);
    });

    test('should list forms', async () => {
      const response = await api.listForms();

      expect(response.success).toBe(true);
    });

    test('should create form', async () => {
      const form: FormTemplate = {
        id: 'form_1',
        name: 'Test Form',
        title: 'Test',
        description: 'Test form',
        category: FormCategory.WORK_ORDER,
        version: '1.0.0',
        tags: [],
        canvasElements: [],
        dataBindings: [],
        manufacturingDomain: 'MES',
        useCases: [],
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: true,
      };

      const response = await api.createForm(form);
      expect(response.success).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    test('should subscribe to API events', async () => {
      let eventFired = false;

      api.subscribe('/api/forms', () => {
        eventFired = true;
      });

      await api.listForms();
      expect(eventFired).toBe(true);
    });
  });
});

// ============================================================================
// Documentation Generator Tests (#489)
// ============================================================================

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let form: FormTemplate;

  beforeEach(() => {
    generator = new DocumentationGenerator();
    form = {
      id: 'form_1',
      name: 'Work Order',
      title: 'Work Order Form',
      description: 'Manufacturing work order',
      category: FormCategory.WORK_ORDER,
      version: '1.0.0',
      tags: ['manufacturing', 'wo'],
      canvasElements: [
        {
          id: 'field1',
          type: CanvasElementType.INPUT,
          name: 'Order Number',
          props: { required: true },
          styles: {},
          position: { x: 0, y: 0 },
          size: { width: 200, height: 40 },
          zIndex: 1,
          visible: true,
          locked: false,
        },
      ],
      dataBindings: [],
      manufacturingDomain: 'MES',
      useCases: ['Create work orders', 'Track production'],
      createdBy: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true,
    };
  });

  describe('Documentation Generation', () => {
    test('should generate form documentation', () => {
      const docs = generator.generateFormDocumentation(form);

      expect(docs).toBeDefined();
      expect(docs.formId).toBe(form.id);
      expect(docs.title).toBe(form.name);
      expect(docs.userGuide).toBeDefined();
      expect(docs.developerGuide).toBeDefined();
      expect(docs.adminGuide).toBeDefined();
    });

    test('should generate test scenarios', () => {
      const scenarios = generator.generateTestScenarios(form);

      expect(scenarios.length).toBeGreaterThan(0);
      scenarios.forEach((scenario) => {
        expect(scenario.id).toBeDefined();
        expect(scenario.name).toBeDefined();
        expect(scenario.steps.length).toBeGreaterThan(0);
      });
    });

    test('should generate test data', () => {
      const testData = generator.generateTestData(form);

      expect(testData.basic).toBeDefined();
      expect(testData.comprehensive).toBeDefined();
      expect(testData.edge_cases).toBeDefined();
    });

    test('should generate compliance checklist', () => {
      const compliance = generator.generateComplianceChecklist(form);

      expect(compliance.wcag2_1_aa).toBe(true);
      expect(compliance.dataPrivacy).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('UI Builder Integration', () => {
  test('should create form from template and export to canvas', () => {
    const templates = new TemplateManager();
    const canvas = new CanvasEditor();

    const template = templates.listTemplates()[0];
    template.canvasElements.forEach((elem) => canvas.addElement(elem));

    expect(canvas.getAllElements().length).toBeGreaterThan(0);
  });

  test('should manage multi-site form with API', async () => {
    const multiSite = new MultiSiteManager();
    const api = new FormAPIService();

    const form: FormTemplate = {
      id: 'form_1',
      name: 'Test Form',
      title: 'Test',
      description: 'Test form',
      category: FormCategory.WORK_ORDER,
      version: '1.0.0',
      tags: [],
      canvasElements: [],
      dataBindings: [],
      manufacturingDomain: 'MES',
      useCases: [],
      createdBy: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true,
    };

    multiSite.registerForm('form_1', form);
    multiSite.createSiteConfig('form_1', 'site_1', 'Site 1', 'North America');

    const apiResponse = await api.createForm(form);
    expect(apiResponse.success).toBe(true);
  });
});
