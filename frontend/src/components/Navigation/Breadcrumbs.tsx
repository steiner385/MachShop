import React from 'react';
import { Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

/**
 * Breadcrumbs Component
 * Navigation UI Improvement - Sprint 1
 * Provides hierarchical location tracking for better user orientation
 */

interface RouteNameMap {
  [key: string]: string;
}

// Map route paths to human-readable names
const routeNameMap: RouteNameMap = {
  dashboard: 'Dashboard',
  workorders: 'Work Orders',
  'work-instructions': 'Work Instructions',
  'process-segments': 'Process Segments',
  quality: 'Quality',
  inspections: 'Inspections',
  ncrs: 'NCRs',
  signatures: 'Signatures',
  fai: 'FAI Reports',
  traceability: 'Traceability',
  serialization: 'Serialization',
  equipment: 'Equipment',
  maintenance: 'Maintenance',
  calibration: 'Calibration',
  materials: 'Materials',
  inventory: 'Inventory',
  lots: 'Lot Tracking',
  personnel: 'Personnel',
  skills: 'Skills Matrix',
  certifications: 'Certifications',
  scheduling: 'Production Scheduling',
  execution: 'Execution Tracking',
  integrations: 'Integrations',
  config: 'Configuration',
  logs: 'Logs',
  admin: 'Administration',
  users: 'Users',
  roles: 'Roles',
  settings: 'Settings',
  profile: 'Profile',
  create: 'Create New',
  execute: 'Execute',
};

const Breadcrumbs: React.FC = () => {
  const location = useLocation();

  // Don't show breadcrumbs on login page or root
  if (location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  // Parse pathname into segments
  const pathSegments = location.pathname
    .split('/')
    .filter((segment) => segment !== '');

  // Build breadcrumb items
  const breadcrumbItems = [
    {
      title: (
        <Link to="/dashboard">
          <HomeOutlined />
        </Link>
      ),
    },
  ];

  // Build cumulative path and breadcrumb items
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Check if segment is a UUID or numeric ID (don't create breadcrumb for IDs)
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      ) || /^\d+$/.test(segment);

    if (isId) {
      // For IDs, just show "Details" as the label
      if (index === pathSegments.length - 1) {
        breadcrumbItems.push({
          title: 'Details',
        });
      } else {
        breadcrumbItems.push({
          title: <Link to={currentPath}>Details</Link>,
        });
      }
    } else {
      const name = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      // Last item should not be a link
      if (index === pathSegments.length - 1) {
        breadcrumbItems.push({
          title: name,
        });
      } else {
        breadcrumbItems.push({
          title: <Link to={currentPath}>{name}</Link>,
        });
      }
    }
  });

  return (
    <Breadcrumb
      style={{
        marginBottom: 16,
      }}
      items={breadcrumbItems}
    />
  );
};

export default Breadcrumbs;
