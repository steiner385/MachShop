/**
 * Core MES UI Foundation Package
 *
 * Mandatory pre-activated extension providing all essential MES UI capabilities.
 * This package contains:
 * - Core UI components for all MES domains
 * - Component contracts for safe extensibility
 * - Theme and styling system
 * - RBAC integration and permission checking
 * - Work order, quality, materials, equipment, and scheduling pages
 * - Admin functions and configuration
 * - Real-time collaboration features
 * - Analytics and reporting dashboards
 *
 * @module core-mes-ui-foundation
 */

// Export component contracts for extension validation
export {
  mainLayoutContract,
  dashboardWidgetContract,
  dashboardChartContract,
  workOrderFormContract,
  dataTableContract,
  coreUIContracts,
  contractMap,
} from './contracts';

/**
 * Package Metadata
 */
export const CORE_MES_UI_FOUNDATION_VERSION = '2.0.0';
export const CORE_MES_UI_FOUNDATION_ID = 'core-mes-ui-foundation';

/**
 * Extension Information
 */
export const extensionInfo = {
  id: CORE_MES_UI_FOUNDATION_ID,
  name: 'Core MES UI Foundation',
  version: CORE_MES_UI_FOUNDATION_VERSION,
  tier: 'core-foundation' as const,
  canBeDisabled: false,
  preActivatedByDefault: true,
  requiredForOperation: true,
  description:
    'Mandatory pre-activated extension containing all essential MES UI capabilities',
};

/**
 * Initialization function for the extension
 * This should be called when the extension is loaded by the MachShop application
 */
export async function initializeCoreMessUIFoundation(): Promise<void> {
  // Register component contracts
  // Register widgets and navigation items
  // Initialize stores
  // Setup API clients
  // Initialize theme

  console.info(
    `Initializing ${extensionInfo.name} v${extensionInfo.version}`
  );
}

/**
 * Quick Start Guide:
 *
 * 1. Import the extension in your application:
 *    import { initializeCoreMessUIFoundation, coreUIContracts } from '@machshop/core-mes-ui-foundation';
 *
 * 2. Initialize during app startup:
 *    await initializeCoreMessUIFoundation();
 *
 * 3. Access component contracts:
 *    const workOrderContract = contractMap['work-order-form'];
 *
 * 4. Validate your extensions against contracts:
 *    const isValid = isUIComponentContract(yourComponent);
 *
 * 5. Implement pages from this extension in your router
 */
