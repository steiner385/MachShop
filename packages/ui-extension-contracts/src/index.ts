/**
 * UI Extension Contracts Package
 *
 * Provides type-safe contracts and registries for managing UI extensions
 * in the MachShop composable extension architecture.
 *
 * @module ui-extension-contracts
 */

// Export all types
export * from './types';

// Export registry classes
export {
  RegistryError,
  ContractRegistry,
  WidgetRegistry,
  NavigationRegistry,
  UIExtensionRegistry,
  getUIExtensionRegistry,
  resetUIExtensionRegistry,
} from './registry';

/**
 * Quick start guide:
 *
 * 1. Import the global registry:
 *    import { getUIExtensionRegistry } from '@machshop/ui-extension-contracts';
 *
 * 2. Register a widget:
 *    const registry = getUIExtensionRegistry();
 *    registry.getWidgetRegistry().registerWidget({
 *      id: 'my-extension:widget',
 *      extensionId: 'my-extension',
 *      slot: UISlot.DASHBOARD_WIDGETS,
 *      component: MyWidget,
 *      order: 1,
 *      registeredAt: new Date()
 *    });
 *
 * 3. Get widgets for a slot:
 *    const widgets = registry
 *      .getWidgetRegistry()
 *      .getWidgetsForSlot(UISlot.DASHBOARD_WIDGETS);
 *
 * 4. Register a menu item:
 *    registry.getNavigationRegistry().registerMenuItem({
 *      id: 'my-extension:menu-item',
 *      label: 'My Extension',
 *      path: '/my-extension',
 *      parentGroup: 'ADMIN'
 *    });
 *
 * 5. Register a component contract:
 *    registry.getContractRegistry().registerContract({
 *      id: 'my-component-contract',
 *      name: 'My Component',
 *      description: 'A custom component',
 *      type: ComponentType.WIDGET,
 *      version: '1.0.0',
 *      supportedSlots: [UISlot.DASHBOARD_WIDGETS],
 *      minimumAccessibilityLevel: AccessibilityLevel.WCAG_AA,
 *      requiredComponents: ['Button', 'Card'],
 *      forbiddenComponents: [],
 *      slotDataSchema: { ... }
 *    });
 */
