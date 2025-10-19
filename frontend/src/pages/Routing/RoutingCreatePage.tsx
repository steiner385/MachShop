/**
 * Routing Create Page
 * Sprint 4: Routing Management UI
 *
 * Route: /routings/create
 *
 * Form for creating a new manufacturing routing
 */

import React from 'react';
import { RoutingForm } from '@/components/Routing/RoutingForm';

const RoutingCreatePage: React.FC = () => {
  return <RoutingForm mode="create" />;
};

export default RoutingCreatePage;
