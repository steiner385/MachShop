import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Space, 
  Typography, 
  Badge,
  Button,
  Tooltip
} from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  QrcodeOutlined,
  ToolOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  ApartmentOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/AuthStore';
import { ConditionalRender } from '@/components/Auth/ProtectedRoute';
import { ROLES, PERMISSIONS } from '@/types/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/workorders',
      icon: <FileTextOutlined />,
      label: 'Work Orders',
      permissions: [PERMISSIONS.WORKORDERS_READ],
    },
    {
      key: '/quality',
      icon: <ExperimentOutlined />,
      label: 'Quality',
      roles: [ROLES.QUALITY_ENGINEER, ROLES.QUALITY_INSPECTOR],
      children: [
        {
          key: '/quality',
          label: 'Overview',
        },
        {
          key: '/quality/inspections',
          label: 'Inspections',
        },
        {
          key: '/quality/ncrs',
          label: 'NCRs',
          roles: [ROLES.QUALITY_ENGINEER],
        },
      ],
    },
    {
      key: '/traceability',
      icon: <QrcodeOutlined />,
      label: 'Traceability',
      permissions: [PERMISSIONS.TRACEABILITY_READ],
    },
    {
      key: '/equipment',
      icon: <ToolOutlined />,
      label: 'Equipment',
      roles: [ROLES.MAINTENANCE_TECHNICIAN, ROLES.PLANT_MANAGER],
    },
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    
    // Handle nested routes
    if (path.startsWith('/quality/')) {
      return [path];
    }
    if (path.startsWith('/workorders/')) {
      return ['/workorders'];
    }
    
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    
    if (path.startsWith('/quality')) {
      return ['/quality'];
    }
    
    return [];
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const buildMenuItems = (items: any[]): any[] => {
    return items.reduce((acc: any[], item) => {
      const { permissions, roles, children, ...menuItem } = item;
      
      // Check if user has required permissions/roles
      const hasAccess = checkAccess(permissions, roles);
      if (!hasAccess) {
        return acc; // Skip this item if user doesn't have access
      }
      
      if (children) {
        const filteredChildren = buildMenuItems(children);
        if (filteredChildren.length > 0) {
          acc.push({
            ...menuItem,
            children: filteredChildren,
            type: 'group',
          });
        }
      } else {
        acc.push(menuItem);
      }
      
      return acc;
    }, []);
  };

  const checkAccess = (permissions?: string[], roles?: string[]) => {
    if (!user) return false;
    
    // If no permissions or roles specified, allow access
    if (!permissions && !roles) return true;
    
    // Check permissions with null safety
    if (permissions && user.permissions && permissions.some(permission => user.permissions.includes(permission))) {
      return true;
    }
    
    // Check roles with null safety
    if (roles && user.roles && roles.some(role => user.roles.includes(role))) {
      return true;
    }
    
    return false;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={256}
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: '#002140',
            borderBottom: '1px solid #303030',
          }}
        >
          {collapsed ? (
            <ApartmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          ) : (
            <Space>
              <ApartmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Text strong style={{ color: 'white', fontSize: 16 }}>
                MES
              </Text>
            </Space>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 8 }}
          items={buildMenuItems(menuItems)}
        />

        {/* User info in sidebar when collapsed */}
        {collapsed && user && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <Tooltip title={user.username} placement="right">
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
            </Tooltip>
          </div>
        )}
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 256, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'fixed',
            top: 0,
            right: 0,
            left: collapsed ? 80 : 256,
            zIndex: 99,
            transition: 'left 0.2s',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
          </div>

          <Space size="middle">
            {/* Notifications */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: 16, width: 40, height: 40 }}
              />
            </Badge>

            {/* User dropdown */}
            {user && (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Space style={{ cursor: 'pointer', padding: '0 8px' }} data-testid="user-avatar">
                  <Avatar
                    size={32}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <Space direction="vertical" size={0} style={{ lineHeight: 1 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {user.roles && user.roles.length > 0 ? user.roles[0] : 'Loading...'}
                    </Text>
                  </Space>
                </Space>
              </Dropdown>
            )}
          </Space>
        </Header>

        <Content
          style={{
            marginTop: 64,
            padding: 24,
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;