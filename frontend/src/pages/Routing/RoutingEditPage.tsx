/**
 * Routing Edit Page
 * Sprint 4: Routing Management UI
 *
 * Route: /routings/:id/edit
 *
 * Form for editing an existing manufacturing routing
 */

import React from 'react';
import { RoutingForm } from '@/components/Routing/RoutingForm';

const RoutingEditPage: React.FC = () => {
  return <RoutingForm mode="edit" />;
};

export default RoutingEditPage;