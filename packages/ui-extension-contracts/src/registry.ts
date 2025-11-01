/**
 * Widget Registry and Slot-Based Architecture
 *
 * Manages dynamic component loading, widget registration, and slot-based
 * extension point resolution for the composable UI extension system.
 *
 * @module ui-extension-contracts/registry
 */

import type {
  UIComponentContract,
  UISlot,
  RegisteredWidget,
  NavigationMenuItemContract,
  ComponentValidationReport,
  WidgetDataContract,
} from './types';

import {
  isRegisteredWidget,
  isUIComponentContract,
  isComponentValidationReport,
} from './types';

/**
 * Registry error types
 */
export class RegistryError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

/**
 * Manages component contracts and their enforcement.
 */
export class ContractRegistry {
  private contracts: Map<string, UIComponentContract> = new Map();
  private contractsBySlot: Map<UISlot, Set<string>> = new Map();

  /**
   * Register a new component contract.
   */
  registerContract(contract: UIComponentContract): void {
    if (!contract.id || typeof contract.id !== 'string') {
      throw new RegistryError(
        'INVALID_CONTRACT',
        'Contract must have a valid id'
      );
    }

    // Validate contract structure
    if (!contract.type || !Array.isArray(contract.supportedSlots)) {
      throw new RegistryError(
        'INVALID_CONTRACT',
        'Contract must have type and supportedSlots'
      );
    }

    this.contracts.set(contract.id, contract);

    // Index by slot
    for (const slot of contract.supportedSlots) {
      if (!this.contractsBySlot.has(slot)) {
        this.contractsBySlot.set(slot, new Set());
      }
      this.contractsBySlot.get(slot)!.add(contract.id);
    }
  }

  /**
   * Get a contract by ID.
   */
  getContract(id: string): UIComponentContract | undefined {
    return this.contracts.get(id);
  }

  /**
   * Get all contracts supporting a specific slot.
   */
  getContractsForSlot(slot: UISlot): UIComponentContract[] {
    const contractIds = this.contractsBySlot.get(slot) || new Set();
    return Array.from(contractIds)
      .map(id => this.contracts.get(id))
      .filter(Boolean) as UIComponentContract[];
  }

  /**
   * Get all registered contracts.
   */
  getAllContracts(): UIComponentContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Check if contract exists.
   */
  hasContract(id: string): boolean {
    return this.contracts.has(id);
  }

  /**
   * Remove a contract (useful for testing).
   */
  removeContract(id: string): boolean {
    if (!this.contracts.has(id)) return false;

    const contract = this.contracts.get(id)!;
    this.contracts.delete(id);

    // Clean up slot index
    for (const slot of contract.supportedSlots) {
      const set = this.contractsBySlot.get(slot);
      if (set) {
        set.delete(id);
        if (set.size === 0) {
          this.contractsBySlot.delete(slot);
        }
      }
    }

    return true;
  }
}

/**
 * Manages widget registration and resolution.
 * Handles dynamic loading of components into UI slots.
 */
export class WidgetRegistry {
  private widgets: Map<string, RegisteredWidget> = new Map();
  private widgetsBySlot: Map<UISlot, RegisteredWidget[]> = new Map();
  private widgetsByExtension: Map<string, RegisteredWidget[]> = new Map();
  private validationReports: Map<string, ComponentValidationReport> = new Map();

  /**
   * Register a widget.
   */
  registerWidget(widget: RegisteredWidget): void {
    // Validate widget
    if (
      !widget.id ||
      !widget.extensionId ||
      !widget.slot ||
      !widget.component
    ) {
      throw new RegistryError(
        'INVALID_WIDGET',
        'Widget must have id, extensionId, slot, and component'
      );
    }

    // Check for duplicate
    if (this.widgets.has(widget.id)) {
      throw new RegistryError(
        'WIDGET_EXISTS',
        `Widget with id ${widget.id} already registered`
      );
    }

    this.widgets.set(widget.id, widget);

    // Index by slot
    if (!this.widgetsBySlot.has(widget.slot)) {
      this.widgetsBySlot.set(widget.slot, []);
    }
    this.widgetsBySlot.get(widget.slot)!.push(widget);

    // Index by extension
    if (!this.widgetsByExtension.has(widget.extensionId)) {
      this.widgetsByExtension.set(widget.extensionId, []);
    }
    this.widgetsByExtension.get(widget.extensionId)!.push(widget);
  }

  /**
   * Get widgets for a specific slot.
   * Returns widgets sorted by order.
   */
  getWidgetsForSlot(slot: UISlot, siteId?: string): RegisteredWidget[] {
    const widgets = this.widgetsBySlot.get(slot) || [];

    return widgets
      .filter(w => {
        // Filter by site if specified
        if (siteId && w.enabledAtSites && !w.enabledAtSites.includes(siteId)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Get a specific widget by ID.
   */
  getWidget(id: string): RegisteredWidget | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all widgets from an extension.
   */
  getExtensionWidgets(extensionId: string): RegisteredWidget[] {
    return this.widgetsByExtension.get(extensionId) || [];
  }

  /**
   * Unregister a widget.
   */
  unregisterWidget(id: string): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    this.widgets.delete(id);

    // Remove from slot index
    const slotWidgets = this.widgetsBySlot.get(widget.slot);
    if (slotWidgets) {
      const idx = slotWidgets.findIndex(w => w.id === id);
      if (idx !== -1) {
        slotWidgets.splice(idx, 1);
      }
    }

    // Remove from extension index
    const extWidgets = this.widgetsByExtension.get(widget.extensionId);
    if (extWidgets) {
      const idx = extWidgets.findIndex(w => w.id === id);
      if (idx !== -1) {
        extWidgets.splice(idx, 1);
      }
    }

    return true;
  }

  /**
   * Unregister all widgets from an extension.
   */
  unregisterExtension(extensionId: string): number {
    const widgets = this.widgetsByExtension.get(extensionId) || [];
    let count = 0;

    for (const widget of widgets) {
      if (this.unregisterWidget(widget.id)) {
        count++;
      }
    }

    this.widgetsByExtension.delete(extensionId);
    return count;
  }

  /**
   * Store validation report for a widget.
   */
  storeValidationReport(report: ComponentValidationReport): void {
    this.validationReports.set(report.componentId, report);
  }

  /**
   * Get validation report for a widget.
   */
  getValidationReport(componentId: string): ComponentValidationReport | undefined {
    return this.validationReports.get(componentId);
  }

  /**
   * Get all validation reports.
   */
  getAllValidationReports(): ComponentValidationReport[] {
    return Array.from(this.validationReports.values());
  }

  /**
   * Get a count of widgets.
   */
  getWidgetCount(): number {
    return this.widgets.size;
  }

  /**
   * Get a count of slots with widgets.
   */
  getSlotCount(): number {
    return this.widgetsBySlot.size;
  }
}

/**
 * Manages navigation menu items.
 */
export class NavigationRegistry {
  private menuItems: Map<string, NavigationMenuItemContract> = new Map();
  private menuItemsByGroup: Map<string, NavigationMenuItemContract[]> = new Map();
  private navigationGroups: Set<string> = new Set();

  constructor() {
    // Initialize standard menu groups
    this.navigationGroups.add('PRODUCTION');
    this.navigationGroups.add('QUALITY');
    this.navigationGroups.add('MATERIALS');
    this.navigationGroups.add('EQUIPMENT');
    this.navigationGroups.add('SCHEDULING');
    this.navigationGroups.add('ADMIN');
    this.navigationGroups.add('REPORTS');
  }

  /**
   * Register a menu item.
   */
  registerMenuItem(item: NavigationMenuItemContract): void {
    if (!item.id || !item.label || !item.path) {
      throw new RegistryError(
        'INVALID_MENU_ITEM',
        'Menu item must have id, label, and path'
      );
    }

    // If adding to new group, validate it's allowed
    if (item.isNewMenuGroup) {
      if (!item.menuGroupDescription) {
        throw new RegistryError(
          'INVALID_NEW_GROUP',
          'New menu group must have description'
        );
      }
      this.navigationGroups.add(item.id);
    }

    // Ensure parent group exists
    const parentGroup = item.parentGroup || 'ADMIN';
    if (!this.navigationGroups.has(parentGroup)) {
      throw new RegistryError(
        'UNKNOWN_GROUP',
        `Parent group ${parentGroup} does not exist`
      );
    }

    this.menuItems.set(item.id, item);

    // Index by group
    if (!this.menuItemsByGroup.has(parentGroup)) {
      this.menuItemsByGroup.set(parentGroup, []);
    }
    this.menuItemsByGroup.get(parentGroup)!.push(item);
  }

  /**
   * Get menu items for a group.
   */
  getMenuItemsForGroup(group: string): NavigationMenuItemContract[] {
    const items = this.menuItemsByGroup.get(group) || [];
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Get a specific menu item.
   */
  getMenuItem(id: string): NavigationMenuItemContract | undefined {
    return this.menuItems.get(id);
  }

  /**
   * Get all navigation groups.
   */
  getNavigationGroups(): string[] {
    return Array.from(this.navigationGroups);
  }

  /**
   * Check if a group exists.
   */
  hasGroup(group: string): boolean {
    return this.navigationGroups.has(group);
  }

  /**
   * Unregister a menu item.
   */
  unregisterMenuItem(id: string): boolean {
    const item = this.menuItems.get(id);
    if (!item) return false;

    this.menuItems.delete(id);

    const parentGroup = item.parentGroup || 'ADMIN';
    const groupItems = this.menuItemsByGroup.get(parentGroup);
    if (groupItems) {
      const idx = groupItems.findIndex(i => i.id === id);
      if (idx !== -1) {
        groupItems.splice(idx, 1);
      }
    }

    return true;
  }

  /**
   * Get all menu items.
   */
  getAllMenuItems(): NavigationMenuItemContract[] {
    return Array.from(this.menuItems.values());
  }
}

/**
 * Master UI extension registry combining all registries.
 * This is the main access point for managing UI extensions.
 */
export class UIExtensionRegistry {
  private contractRegistry: ContractRegistry;
  private widgetRegistry: WidgetRegistry;
  private navigationRegistry: NavigationRegistry;

  constructor() {
    this.contractRegistry = new ContractRegistry();
    this.widgetRegistry = new WidgetRegistry();
    this.navigationRegistry = new NavigationRegistry();
  }

  /**
   * Get the contract registry.
   */
  getContractRegistry(): ContractRegistry {
    return this.contractRegistry;
  }

  /**
   * Get the widget registry.
   */
  getWidgetRegistry(): WidgetRegistry {
    return this.widgetRegistry;
  }

  /**
   * Get the navigation registry.
   */
  getNavigationRegistry(): NavigationRegistry {
    return this.navigationRegistry;
  }

  /**
   * Clear all registries (useful for testing).
   */
  clear(): void {
    this.contractRegistry = new ContractRegistry();
    this.widgetRegistry = new WidgetRegistry();
    this.navigationRegistry = new NavigationRegistry();
  }

  /**
   * Get registry statistics.
   */
  getStatistics(): {
    totalContracts: number;
    totalWidgets: number;
    slotsWithWidgets: number;
    totalMenuItems: number;
    navigationGroups: number;
  } {
    return {
      totalContracts: this.contractRegistry.getAllContracts().length,
      totalWidgets: this.widgetRegistry.getWidgetCount(),
      slotsWithWidgets: this.widgetRegistry.getSlotCount(),
      totalMenuItems: this.navigationRegistry.getAllMenuItems().length,
      navigationGroups: this.navigationRegistry.getNavigationGroups().length,
    };
  }
}

/**
 * Global registry instance (singleton).
 * Applications should use this instance to register and access extensions.
 */
let globalRegistry: UIExtensionRegistry | null = null;

/**
 * Get the global UI extension registry.
 * Creates one if it doesn't exist.
 */
export function getUIExtensionRegistry(): UIExtensionRegistry {
  if (!globalRegistry) {
    globalRegistry = new UIExtensionRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (useful for testing).
 */
export function resetUIExtensionRegistry(): void {
  globalRegistry = null;
}
