/**
 * Routing List Page
 * Sprint 4: Routing Management UI
 *
 * Route: /routings
 *
 * Displays paginated list of all routings with search/filter capabilities
 */

import React from 'react';
import { RoutingList } from '@/components/Routing/RoutingList';

const RoutingListPage: React.FC = () => {
  return <RoutingList />;
};

export default RoutingListPage;
