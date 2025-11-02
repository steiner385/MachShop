/**
 * UI Builder - Main Export File
 * Covers Canvas Editor (#485), Templates (#486), Multi-Site (#487), API (#488), Documentation (#489)
 */

// Types
export * from './types';

// Canvas Editor (#485)
export { CanvasEditor } from './canvas/CanvasEditor';

// Templates (#486)
export { TemplateManager } from './templates/TemplateManager';

// Multi-Site (#487)
export { MultiSiteManager } from './multisite/MultiSiteManager';

// REST API (#488)
export { FormAPIService } from './api/FormAPIService';

// Documentation (#489)
export { DocumentationGenerator } from './docs/DocumentationGenerator';

// Imports for UIBuilder class
import { CanvasEditor } from './canvas/CanvasEditor';
import { TemplateManager } from './templates/TemplateManager';
import { MultiSiteManager } from './multisite/MultiSiteManager';
import { FormAPIService } from './api/FormAPIService';
import { DocumentationGenerator } from './docs/DocumentationGenerator';

// Version
export const VERSION = '1.0.0';

// Aggregated API for easy access
export class UIBuilder {
  public canvas: CanvasEditor;
  public templates: TemplateManager;
  public multiSite: MultiSiteManager;
  public api: FormAPIService;
  public docs: DocumentationGenerator;

  constructor(apiBaseUrl: string = '/api') {
    this.canvas = new CanvasEditor();
    this.templates = new TemplateManager();
    this.multiSite = new MultiSiteManager();
    this.api = new FormAPIService(apiBaseUrl);
    this.docs = new DocumentationGenerator();
  }
}
