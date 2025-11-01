/**
 * OSP Routes Configuration
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Route definitions for OSP (Outside Processing/Farmout) operations UI
 */

import {
  OSPOperationsDashboard,
  SupplierMasterData,
  ShipmentWizard,
  SupplierPerformanceDashboard
} from '../components/OSP';

export const ospRoutes = [
  {
    path: '/osp',
    name: 'OSP Operations',
    icon: 'ship',
    component: OSPOperationsDashboard,
    requiredPermissions: ['osp.operations.read'],
    exact: true
  },
  {
    path: '/osp/operations',
    name: 'Operations Dashboard',
    component: OSPOperationsDashboard,
    requiredPermissions: ['osp.operations.read'],
    breadcrumb: 'Operations'
  },
  {
    path: '/osp/suppliers',
    name: 'Supplier Master Data',
    component: SupplierMasterData,
    requiredPermissions: ['osp.suppliers.read', 'osp.suppliers.manage'],
    breadcrumb: 'Suppliers'
  },
  {
    path: '/osp/shipments/create',
    name: 'Create Shipment',
    component: ShipmentWizard,
    requiredPermissions: ['osp.shipments.create'],
    breadcrumb: 'New Shipment'
  },
  {
    path: '/osp/performance',
    name: 'Performance Dashboard',
    component: SupplierPerformanceDashboard,
    requiredPermissions: ['osp.performance.read'],
    breadcrumb: 'Performance'
  }
];

export const ospMenu = [
  {
    label: 'OSP Operations',
    path: '/osp',
    icon: 'ship',
    children: [
      {
        label: 'Operations Dashboard',
        path: '/osp/operations',
        icon: 'dashboard'
      },
      {
        label: 'Create Shipment',
        path: '/osp/shipments/create',
        icon: 'plus'
      },
      {
        label: 'Supplier Masters',
        path: '/osp/suppliers',
        icon: 'building'
      },
      {
        label: 'Performance Dashboard',
        path: '/osp/performance',
        icon: 'chart-line'
      }
    ]
  }
];

export default ospRoutes;
