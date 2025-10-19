/**
 * Routing Detail Page
 * Sprint 4: Routing Management UI
 *
 * Route: /routings/:id
 *
 * Displays full details of a routing including:
 * - Basic metadata and lifecycle state
 * - Routing steps with timing
 * - Step dependencies
 * - History and audit trail
 */

import React from 'react';
import { RoutingDetail } from '@/components/Routing/RoutingDetail';

const RoutingDetailPage: React.FC = () => {
  return <RoutingDetail />;
};

export default RoutingDetailPage;
