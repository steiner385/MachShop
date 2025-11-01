/**
 * OSP Components Index
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Centralized exports for all OSP-related components
 */

export { default as OSPOperationsDashboard } from './OSPOperationsDashboard';
export { default as SupplierMasterData } from './SupplierMasterData';
export { default as ShipmentWizard } from './ShipmentWizard';
export { default as SupplierPerformanceDashboard } from './SupplierPerformanceDashboard';

export type {
  OSPOperation,
  OSPOperationsDashboardProps
} from './OSPOperationsDashboard';

export type {
  SupplierCapability,
  Supplier
} from './SupplierMasterData';
