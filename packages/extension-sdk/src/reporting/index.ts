/**
 * Report Template Extension System
 * Issue #442: Report Template Extension System
 */

// Registry
export { ReportTemplateRegistry, reportTemplateRegistry } from './registry';

// Rendering
export { ReportRenderer, ReportCacheService, reportRenderer, reportCache } from './renderer';

// Builder
export { ReportTemplateBuilder, ReportTemplatePresets } from './builder';

// Types
export {
  ReportDataType,
  ReportField,
  ReportFieldStyle,
  ReportGroup,
  ReportSection,
  ReportElement,
  ReportFilter,
  ReportParameter,
  ReportTemplate,
  ReportTemplateConfig,
  ReportPermissions,
  ReportScheduling,
  ReportDataContext,
  ReportRenderResult,
  ReportExportOptions,
  ReportValidationResult,
  ReportCacheEntry,
  ReportGenerationRequest,
  ReportGenerationResult,
  IReportTemplateRegistry,
  IReportRenderer,
  ReportError,
  ReportTemplateNotFoundError,
  ReportValidationError,
  ReportRenderingError,
  ReportPermissionError,
} from './types';

/**
 * Quick start:
 *
 * @example
 * ```typescript
 * import {
 *   ReportTemplateBuilder,
 *   reportTemplateRegistry,
 *   reportRenderer,
 * } from '@machshop/extension-sdk/reporting';
 *
 * // Create template
 * const template = new ReportTemplateBuilder(
 *   'orders-report',
 *   'Orders Report',
 *   'Order',
 *   'my-extension'
 * )
 *   .description('List of all orders')
 *   .category('Finance')
 *   .addField('id', 'Order ID', 'string', 'id')
 *   .addField('amount', 'Amount', 'currency', 'amount')
 *   .addField('status', 'Status', 'string', 'status')
 *   .addSection('header', 'Header', 'header')
 *   .addText('title', 'Orders Report')
 *   .addSection('body', 'Body', 'body')
 *   .addTable('orders', ['id', 'amount', 'status'])
 *   .addSection('footer', 'Footer', 'footer')
 *   .addPageNumber('page')
 *   .build();
 *
 * // Register template
 * reportTemplateRegistry.register({ template });
 *
 * // Render report
 * const result = await reportRenderer.render(
 *   template,
 *   {
 *     entityData: [
 *       { id: '1', amount: 100, status: 'pending' },
 *       { id: '2', amount: 200, status: 'shipped' },
 *     ],
 *   },
 *   { format: 'pdf', filename: 'orders.pdf' }
 * );
 * ```
 */
