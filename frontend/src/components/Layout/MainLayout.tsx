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
  BarcodeOutlined,
  ToolOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  ApartmentOutlined,
  ExperimentOutlined,
  BookOutlined,
  SafetyOutlined,
  FileSearchOutlined,
  CloudServerOutlined,
  CalendarOutlined,
  InboxOutlined,
  TeamOutlined,
  ControlOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/store/AuthStore';
import { ROLES, PERMISSIONS } from '@/types/auth';
import Breadcrumbs from '@/components/Navigation/Breadcrumbs';
import { SiteSelector } from '@/components/Site/SiteSelector';
import { GlobalSearch } from '@/components/Search/GlobalSearch';

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

  // Improved Navigation Structure - Sprint 1
  // Organized into logical groupings based on user workflows
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      type: 'group',
      label: 'PRODUCTION',
      children: [
        {
          key: '/workorders',
          icon: <FileTextOutlined />,
          label: 'Work Orders',
          permissions: [PERMISSIONS.WORKORDERS_READ],
        },
        {
          key: '/process-segments',
          icon: <ApartmentOutlined />,
          label: 'Process Segments',
          roles: [ROLES.PRODUCTION_PLANNER, ROLES.PLANT_MANAGER],
        },
        {
          key: '/routings',
          icon: <ControlOutlined />,
          label: 'Routings',
          roles: [ROLES.PRODUCTION_PLANNER, ROLES.PLANT_MANAGER],
        },
        {
          key: '/scheduling',
          icon: <CalendarOutlined />,
          label: 'Scheduling',
          roles: [ROLES.PRODUCTION_PLANNER, ROLES.PLANT_MANAGER],
        },
      ],
    },
    {
      type: 'group',
      label: 'QUALITY',
      children: [
        {
          key: '/quality/inspections',
          icon: <ExperimentOutlined />,
          label: 'Inspections',
          roles: [ROLES.QUALITY_ENGINEER, ROLES.QUALITY_INSPECTOR],
        },
        {
          key: '/quality/ncrs',
          icon: <FileSearchOutlined />,
          label: 'NCRs',
          roles: [ROLES.QUALITY_ENGINEER],
        },
        {
          key: '/fai',
          icon: <SafetyOutlined />,
          label: 'FAI Reports',
          roles: [ROLES.QUALITY_ENGINEER, ROLES.QUALITY_INSPECTOR],
        },
        {
          key: '/signatures',
          icon: <SafetyOutlined />,
          label: 'Signatures',
          roles: [ROLES.QUALITY_ENGINEER, ROLES.QUALITY_INSPECTOR],
        },
      ],
    },
    {
      type: 'group',
      label: 'MATERIALS',
      children: [
        {
          key: '/materials',
          icon: <InboxOutlined />,
          label: 'Materials',
          permissions: [PERMISSIONS.MATERIALS_READ],
        },
        {
          key: '/traceability',
          icon: <QrcodeOutlined />,
          label: 'Traceability',
          permissions: [PERMISSIONS.TRACEABILITY_READ],
        },
      ],
    },
    {
      type: 'group',
      label: 'PERSONNEL',
      children: [
        {
          key: '/personnel',
          icon: <TeamOutlined />,
          label: 'Personnel',
          roles: [ROLES.PLANT_MANAGER, ROLES.SYSTEM_ADMIN],
        },
      ],
    },
    {
      type: 'group',
      label: 'EQUIPMENT & TOOLS',
      children: [
        {
          key: '/equipment',
          icon: <ToolOutlined />,
          label: 'Equipment',
          roles: [ROLES.MAINTENANCE_TECHNICIAN, ROLES.PLANT_MANAGER],
        },
        {
          key: '/serialization',
          icon: <BarcodeOutlined />,
          label: 'Serialization',
          permissions: [PERMISSIONS.TRACEABILITY_READ],
        },
      ],
    },
    {
      key: '/work-instructions',
      icon: <BookOutlined />,
      label: 'Work Instructions',
      permissions: [PERMISSIONS.WORKINSTRUCTIONS_READ],
    },
    {
      type: 'group',
      label: 'ADMINISTRATION',
      children: [
        {
          key: '/integrations',
          icon: <CloudServerOutlined />,
          label: 'Integrations',
          roles: [ROLES.PLANT_MANAGER, ROLES.SYSTEM_ADMIN],
        },
        {
          key: '/admin',
          icon: <ControlOutlined />,
          label: 'Admin',
          roles: [ROLES.SYSTEM_ADMIN],
        },
      ],
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
    if (path.startsWith('/process-segments')) {
      return ['/process-segments'];
    }
    if (path.startsWith('/work-instructions')) {
      return ['/work-instructions'];
    }
    if (path.startsWith('/integrations')) {
      return ['/integrations'];
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate anyway to ensure user is logged out from UI perspective
      navigate('/login');
    }
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

    // System administrators have access to everything
    const isSystemAdmin = user.roles && user.roles.includes(ROLES.SYSTEM_ADMIN);
    if (isSystemAdmin) return true;

    // Check for wildcard permission (admins have '*' permission)
    const hasWildcardPermission = user.permissions && user.permissions.includes('*');
    if (hasWildcardPermission) return true;

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
            overflow: 'hidden', // Prevent content from bleeding outside
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40, flexShrink: 0 }}
            />

            {/* Global Search */}
            <div style={{ maxWidth: 400, flex: 1, minWidth: 0 }}>
              <GlobalSearch compact />
            </div>
          </div>

          <Space size="small" style={{ flexShrink: 0 }}>
            {/* Site Selector */}
            <SiteSelector size="small" showIcon={false} />

            {/* Notifications */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: 16, width: 36, height: 36 }}
              />
            </Badge>

            {/* User dropdown */}
            {user && (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <Space style={{ cursor: 'pointer', padding: '0 4px' }} data-testid="user-avatar">
                  <Avatar
                    size={28}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <Space direction="vertical" size={0} style={{ lineHeight: 1, maxWidth: 150 }}>
                    <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
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
          <Breadcrumbs />
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;