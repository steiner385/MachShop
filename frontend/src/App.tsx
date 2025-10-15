import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { useAuthStore } from '@/store/AuthStore';
import MainLayout from '@/components/Layout/MainLayout';
import LoginPage from '@/pages/Auth/LoginPage';
import Dashboard from '@/pages/Dashboard/Dashboard';
import WorkOrders from '@/pages/WorkOrders/WorkOrders';
import WorkOrderDetails from '@/pages/WorkOrders/WorkOrderDetails';
import Quality from '@/pages/Quality/Quality';
import Inspections from '@/pages/Quality/Inspections';
import NCRs from '@/pages/Quality/NCRs';
import Traceability from '@/pages/Traceability/Traceability';
import Equipment from '@/pages/Equipment/Equipment';
import Profile from '@/pages/Profile/Profile';
import NotFound from '@/pages/NotFound/NotFound';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

const { Content } = Layout;

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>Loading...</div>
          </div>
        </Content>
      </Layout>
    );
  }

  // If user is not authenticated, show login page
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Main application routes for authenticated users
  return (
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
          path="/quality/ncrs"
          element={
            <ProtectedRoute roles={['Quality Engineer']}>
              <NCRs />
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

        {/* Equipment Management */}
        <Route
          path="/equipment"
          element={
            <ProtectedRoute roles={['Maintenance Technician', 'Plant Manager']}>
              <Equipment />
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

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
};

export default App;