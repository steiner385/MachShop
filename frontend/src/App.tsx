import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { useAuthStore } from '@/store/AuthStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import MainLayout from '@/components/Layout/MainLayout';
import LoginPage from '@/pages/Auth/LoginPage';
import Dashboard from '@/pages/Dashboard/Dashboard';
import WorkOrders from '@/pages/WorkOrders/WorkOrders';
import WorkOrderDetails from '@/pages/WorkOrders/WorkOrderDetails';
import WorkOrderEdit from '@/pages/WorkOrders/WorkOrderEdit';
import WorkOrderExecution from '@/pages/WorkOrders/WorkOrderExecution';
import Quality from '@/pages/Quality/Quality';
import Inspections from '@/pages/Quality/Inspections';
import InspectionDetail from '@/pages/Quality/InspectionDetail';
import NCRs from '@/pages/Quality/NCRs';
import NCRDetail from '@/pages/Quality/NCRDetail';
import Approvals from '@/pages/Quality/Approvals';
import CorrectiveActions from '@/pages/Quality/CorrectiveActions';
import Traceability from '@/pages/Traceability/Traceability';
// Phase 3: Equipment Maintenance API Integration
import { MaintenanceList } from '@/components/Equipment/MaintenanceList';
import Profile from '@/pages/Profile/Profile';
import NotFound from '@/pages/NotFound/NotFound';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

// Quality Analytics (Issue #58)
import { QualityAnalyticsDashboard } from '@/components/QualityAnalytics';

// Work Instructions (Sprint 2/3)
import WorkInstructionListPage from '@/pages/WorkInstructions/WorkInstructionListPage';
import WorkInstructionDetailPage from '@/pages/WorkInstructions/WorkInstructionDetailPage';
import WorkInstructionCreatePage from '@/pages/WorkInstructions/WorkInstructionCreatePage';
import WorkInstructionExecutePage from '@/pages/WorkInstructions/WorkInstructionExecutePage';
import { WorkInstructionViewerPage } from '@/pages/WorkInstructions/WorkInstructionViewerPage';

// Electronic Signatures (Sprint 3)
import SignatureAuditPage from '@/pages/Signatures/SignatureAuditPage';

// FAI - First Article Inspection (Sprint 3)
import FAIListPage from '@/pages/FAI/FAIListPage';
import FAIDetailPage from '@/pages/FAI/FAIDetailPage';
import FAICreatePage from '@/pages/FAI/FAICreatePage';

// Traceability Detail (Sprint 4)
import TraceabilityDetailPage from '@/pages/Traceability/TraceabilityDetailPage';

// Serialization (Sprint 4)
import SerializationListPage from '@/pages/Serialization/SerializationListPage';

// Integration Management (Sprint 5)
import IntegrationDashboard from '@/pages/Integration/IntegrationDashboard';
import IntegrationConfig from '@/pages/Integration/IntegrationConfig';
import IntegrationLogs from '@/pages/Integration/IntegrationLogs';

// Sprint 3 Demo Page
import Sprint3Demo from '@/pages/Sprint3Demo/Sprint3Demo';

// Navigation UI Improvement - Complete Page Implementations
import SchedulingPage from '@/pages/Production/SchedulingPage';
import ScheduleDetailPage from '@/pages/Production/ScheduleDetailPage';
import TeamWorkQueue from '@/pages/Production/TeamWorkQueue';
import MaterialsPage from '@/pages/Materials/MaterialsPage';
import PersonnelPage from '@/pages/Personnel/PersonnelPage';
import AdminPage from '@/pages/Admin/AdminPage';
import SettingsPage from '@/pages/Settings/SettingsPage';

// Operations (Manufacturing Operations) - Sprint 6
import OperationListPage from '@/pages/Operations/OperationListPage';
import OperationCreatePage from '@/pages/Operations/OperationCreatePage';

// Routing Management (Sprint 4 - Multi-Site Routing)
import RoutingListPage from '@/pages/Routing/RoutingListPage';
import RoutingCreatePage from '@/pages/Routing/RoutingCreatePage';
import RoutingEditPage from '@/pages/Routing/RoutingEditPage';
import RoutingDetailPage from '@/pages/Routing/RoutingDetailPage';
import RoutingTemplatesPage from '@/pages/Routing/RoutingTemplatesPage';

// Kit Management (GitHub Issue #229)
import KitsPage from '@/pages/Kits/KitsPage';
import KitAnalyticsPage from '@/pages/Kits/KitAnalyticsPage';

// Staging Management (GitHub Issue #229)
import StagingPage from '@/pages/Staging/StagingPage';

const { Content } = Layout;

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <ErrorBoundary>
        <Layout style={{ minHeight: '100vh' }}>
          <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#666' }}>Loading...</div>
            </div>
          </Content>
        </Layout>
      </ErrorBoundary>
    );
  }

  // If user is not authenticated, show login page
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="*"
            element={
              <Navigate
                to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                replace
              />
            }
          />
        </Routes>
      </ErrorBoundary>
    );
  }

  // Main application routes for authenticated users
  return (
    <ErrorBoundary>
      <MainLayout>
        <Routes>
        {/* Root and Login redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Work Orders */}
        <Route
          path="/workorders"
          element={
            <ProtectedRoute permissions={['workorders.read']}>
              <WorkOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workorders/:id"
          element={
            <ProtectedRoute permissions={['workorders.read']}>
              <WorkOrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workorders/:id/edit"
          element={
            <ProtectedRoute permissions={['workorders.write']}>
              <WorkOrderEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workorders/:id/execute/:operationNumber"
          element={
            <ProtectedRoute permissions={['workorders.execute']}>
              <WorkOrderExecution />
            </ProtectedRoute>
          }
        />

        {/* Quality Management */}
        <Route
          path="/quality"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <Quality />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/inspections"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <Inspections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/inspections/:id"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <InspectionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/ncrs"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <NCRs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/ncrs/:id"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <NCRDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/approvals"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <Approvals />
            </ProtectedRoute>
          }
        />

        {/* ✅ ISSUE #56: CAPA (Corrective & Preventive Action) Tracking - Phase 1 */}
        <Route
          path="/quality/corrective-actions"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <CorrectiveActions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/analytics"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Manager', 'Plant Manager']}>
              <QualityAnalyticsDashboard siteId="default" />
            </ProtectedRoute>
          }
        />

        {/* Electronic Signatures (Sprint 3) */}
        <Route
          path="/signatures"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <SignatureAuditPage />
            </ProtectedRoute>
          }
        />

        {/* FAI - First Article Inspection (Sprint 3) */}
        <Route
          path="/fai"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <FAIListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fai/create"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <FAICreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fai/:id"
          element={
            <ProtectedRoute roles={['Quality Engineer', 'Quality Inspector']}>
              <FAIDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Material Traceability */}
        <Route
          path="/traceability"
          element={
            <ProtectedRoute permissions={['traceability.read']}>
              <Traceability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/traceability/:serialNumber"
          element={
            <ProtectedRoute permissions={['traceability.read']}>
              <TraceabilityDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/traceability/batch/:id"
          element={
            <ProtectedRoute permissions={['traceability.read']}>
              <TraceabilityDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Serialization (Sprint 4) */}
        <Route
          path="/serialization"
          element={
            <ProtectedRoute permissions={['traceability.read']}>
              <SerializationListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/serialization/overview"
          element={<Navigate to="/serialization" replace />}
        />
        <Route
          path="/serialization/parts"
          element={
            <ProtectedRoute permissions={['traceability.read']}>
              <SerializationListPage />
            </ProtectedRoute>
          }
        />

        {/* Integration Management (Sprint 5) */}
        <Route
          path="/integrations"
          element={
            <ProtectedRoute roles={['Plant Manager', 'System Administrator']}>
              <IntegrationDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations/dashboard"
          element={<Navigate to="/integrations" replace />}
        />
        <Route
          path="/integrations/config"
          element={
            <ProtectedRoute roles={['Plant Manager', 'System Administrator']}>
              <IntegrationConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations/config/:id"
          element={
            <ProtectedRoute roles={['Plant Manager', 'System Administrator']}>
              <IntegrationConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations/logs"
          element={
            <ProtectedRoute roles={['Plant Manager', 'System Administrator']}>
              <IntegrationLogs />
            </ProtectedRoute>
          }
        />

        {/* Equipment Management - Phase 3: Equipment Maintenance Scheduling with API Integration */}
        <Route
          path="/equipment"
          element={
            <ProtectedRoute roles={['Maintenance Technician', 'Plant Manager']}>
              <MaintenanceList />
            </ProtectedRoute>
          }
        />

        {/* Production Scheduling (Phase 2 - Production Scheduling Dashboard) */}
        <Route
          path="/production/scheduling"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager']}>
              <SchedulingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/production/scheduling/:id"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager']}>
              <ScheduleDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Redirect /scheduling to /production/scheduling for backwards compatibility */}
        <Route
          path="/scheduling"
          element={<Navigate to="/production/scheduling" replace />}
        />

        {/* Team Work Queue (Phase 2 - Production Supervisor) */}
        <Route
          path="/production/team-queue"
          element={
            <ProtectedRoute roles={['Production Supervisor', 'Plant Manager']}>
              <TeamWorkQueue />
            </ProtectedRoute>
          }
        />

        {/* Operations - Manufacturing Operations (Sprint 6) */}
        <Route
          path="/operations"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager']}>
              <OperationListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/create"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager']}>
              <OperationCreatePage />
            </ProtectedRoute>
          }
        />

        {/* Routing Management (Sprint 4 - Multi-Site Routing) */}
        <Route
          path="/routings"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager', 'Manufacturing Engineer']}>
              <RoutingListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routings/create"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager', 'Manufacturing Engineer']}>
              <RoutingCreatePage />
            </ProtectedRoute>
          }
        />
        {/* ✅ PHASE 10B FIX: Redirect /routings/new to /routings/create to eliminate duplicate component rendering */}
        <Route
          path="/routings/new"
          element={<Navigate to="/routings/create" replace />}
        />
        <Route
          path="/routings/templates"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager', 'Manufacturing Engineer']}>
              <RoutingTemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routings/:id/edit"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager', 'Manufacturing Engineer']}>
              <RoutingEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routings/:id"
          element={
            <ProtectedRoute roles={['Production Planner', 'Plant Manager', 'Manufacturing Engineer']}>
              <RoutingDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Materials Management - Complete inventory management interface */}
        <Route
          path="/materials"
          element={
            <ProtectedRoute permissions={['materials.read']}>
              <MaterialsPage />
            </ProtectedRoute>
          }
        />

        {/* Kit Management (GitHub Issue #229: Kitting & Material Staging System) */}
        <Route
          path="/kits"
          element={
            <ProtectedRoute roles={['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']}>
              <KitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kits/analytics"
          element={
            <ProtectedRoute roles={['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']}>
              <KitAnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Staging Management (GitHub Issue #229: Kitting & Material Staging System) */}
        <Route
          path="/staging"
          element={
            <ProtectedRoute roles={['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']}>
              <StagingPage />
            </ProtectedRoute>
          }
        />

        {/* Personnel Management - Complete personnel management interface */}
        <Route
          path="/personnel"
          element={
            <ProtectedRoute roles={['Plant Manager', 'System Administrator']}>
              <PersonnelPage />
            </ProtectedRoute>
          }
        />

        {/* Administration (Navigation UI Sprint 1 - Placeholder) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['System Administrator']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Work Instructions (Sprint 2/3) */}
        <Route
          path="/work-instructions"
          element={
            <ProtectedRoute permissions={['workinstructions.read']}>
              <WorkInstructionListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-instructions/list"
          element={<Navigate to="/work-instructions" replace />}
        />
        <Route
          path="/work-instructions/create"
          element={
            <ProtectedRoute permissions={['workinstructions.create']}>
              <WorkInstructionCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-instructions/:id"
          element={
            <ProtectedRoute permissions={['workinstructions.read']}>
              <WorkInstructionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-instructions/:id/execute"
          element={
            <ProtectedRoute permissions={['workinstructions.execute']}>
              <WorkInstructionExecutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-instructions/:id/view"
          element={
            <ProtectedRoute permissions={['workinstructions.read']}>
              <WorkInstructionViewerPage />
            </ProtectedRoute>
          }
        />

        {/* User Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Sprint 3 Demo (Testing/Showcase) */}
        <Route
          path="/sprint3-demo"
          element={
            <ProtectedRoute>
              <Sprint3Demo />
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
    </ErrorBoundary>
  );
};

export default App;