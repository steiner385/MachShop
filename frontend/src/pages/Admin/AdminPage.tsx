import React, { useState, useEffect, Suspense } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Menu,
  Button,
  Drawer,
  Spin,
  Result,
  Input,
  Modal,
  List,
  Tag,
  Empty
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  ApiOutlined,
  KeyOutlined,
  TeamOutlined,
  BarChartOutlined,
  DashboardOutlined,
  CloudOutlined,
  MenuOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons';

// Import RBAC Admin Components
import RBACDashboardPage from './RBACDashboardPage';
import RoleManagementPage from './RoleManagementPage';
import PermissionCatalogPage from './PermissionCatalogPage';
import UserRoleAssignmentPage from './UserRoleAssignmentPage';

// Import Azure AD Admin Components
import AzureADPage from './AzureADPage';

const { Title, Text } = Typography;

/**
 * Administration Page with RBAC Management
 * Updated for GitHub Issue #124 - Admin UI for Role and Permission Management
 * Enhanced for GitHub Issue #276 - Administration Dashboard with improved accessibility and UX
 */

// Error Boundary Component
class ModuleErrorBoundary extends React.Component<
  { children: React.ReactNode; moduleName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; moduleName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.moduleName} module:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title={`${this.props.moduleName} Module Error`}
          subTitle="Something went wrong while loading this module."
          icon={<ExclamationCircleOutlined />}
          extra={[
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try Again
            </Button>,
            <Button key="back" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          ]}
        />
      );
    }

    return this.props.children;
  }
}

// Search interface types
interface SearchResult {
  id: string;
  title: string;
  description: string;
  moduleKey: string;
  category: 'module' | 'feature' | 'action';
  icon: React.ReactNode;
  keywords: string[];
}

const AdminPage: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('overview');
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);

  // Search state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Search database - all searchable content
  const searchDatabase: SearchResult[] = [
    {
      id: 'rbac-dashboard',
      title: 'RBAC Dashboard',
      description: 'System overview and analytics for role-based access control',
      moduleKey: 'rbac-dashboard',
      category: 'module',
      icon: <BarChartOutlined />,
      keywords: ['rbac', 'dashboard', 'analytics', 'overview', 'roles', 'permissions', 'access control']
    },
    {
      id: 'role-management',
      title: 'Role Management',
      description: 'Create and manage user roles',
      moduleKey: 'roles',
      category: 'module',
      icon: <SafetyOutlined />,
      keywords: ['roles', 'create', 'manage', 'user roles', 'access', 'permissions']
    },
    {
      id: 'permission-catalog',
      title: 'Permission Catalog',
      description: 'Manage system permissions and access rights',
      moduleKey: 'permissions',
      category: 'module',
      icon: <KeyOutlined />,
      keywords: ['permissions', 'catalog', 'access rights', 'system permissions', 'security']
    },
    {
      id: 'user-assignments',
      title: 'User Assignments',
      description: 'Assign roles to users and manage user access',
      moduleKey: 'user-assignments',
      category: 'module',
      icon: <TeamOutlined />,
      keywords: ['users', 'assignments', 'assign roles', 'user access', 'team management']
    },
    {
      id: 'azure-ad',
      title: 'Azure AD Integration',
      description: 'Configure Azure Active Directory for single sign-on and enterprise authentication',
      moduleKey: 'azure-ad',
      category: 'module',
      icon: <CloudOutlined />,
      keywords: ['azure', 'active directory', 'sso', 'single sign-on', 'authentication', 'enterprise', 'entra id']
    },
    {
      id: 'user-management-future',
      title: 'User Management',
      description: 'Create, modify, and delete user accounts (Coming Soon)',
      moduleKey: 'overview',
      category: 'feature',
      icon: <UserOutlined />,
      keywords: ['users', 'create', 'modify', 'delete', 'accounts', 'user profiles', 'coming soon']
    },
    {
      id: 'system-config-future',
      title: 'System Configuration',
      description: 'Configure system-wide settings and integrations (Coming Soon)',
      moduleKey: 'overview',
      category: 'feature',
      icon: <ApiOutlined />,
      keywords: ['system', 'configuration', 'settings', 'integrations', 'advanced options', 'coming soon']
    }
  ];

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSearchModalVisible(true);
      }
      // Escape to close search
      if (event.key === 'Escape' && searchModalVisible) {
        setSearchModalVisible(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchModalVisible]);

  // Search functionality
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const results = searchDatabase.filter(item => {
      // Search in title, description, and keywords
      const searchableText = [
        item.title,
        item.description,
        ...item.keywords
      ].join(' ').toLowerCase();

      return searchableText.includes(lowercaseQuery);
    });

    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      // Exact title matches first
      if (aTitle === lowercaseQuery) return -1;
      if (bTitle === lowercaseQuery) return 1;

      // Title starts with query
      if (aTitle.startsWith(lowercaseQuery)) return -1;
      if (bTitle.startsWith(lowercaseQuery)) return 1;

      // Title contains query
      if (aTitle.includes(lowercaseQuery) && !bTitle.includes(lowercaseQuery)) return -1;
      if (bTitle.includes(lowercaseQuery) && !aTitle.includes(lowercaseQuery)) return 1;

      return 0;
    });

    setSearchResults(results);
  };

  // Handle search query change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Handle search result selection
  const handleSearchResultSelect = (result: SearchResult) => {
    // Add to recent searches
    const newRecentSearches = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecentSearches);

    // Navigate to the module
    handleModuleSelection(result.moduleKey);

    // Close search modal
    setSearchModalVisible(false);
    setSearchQuery('');
  };

  // Handle module selection with loading state
  const handleModuleSelection = (moduleKey: string) => {
    if (moduleKey === selectedModule) return; // No change needed

    setModuleLoading(true);

    // Simulate brief loading state for better UX
    setTimeout(() => {
      setSelectedModule(moduleKey);
      setModuleLoading(false);
      setMobileDrawerVisible(false); // Close mobile drawer
    }, 200);
  };

  const menuItems = [
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: 'Overview',
    },
    {
      key: 'rbac',
      icon: <SafetyOutlined />,
      label: 'Role & Permission Management',
      children: [
        {
          key: 'rbac-dashboard',
          icon: <BarChartOutlined />,
          label: 'RBAC Dashboard',
        },
        {
          key: 'roles',
          icon: <SafetyOutlined />,
          label: 'Role Management',
        },
        {
          key: 'permissions',
          icon: <KeyOutlined />,
          label: 'Permission Catalog',
        },
        {
          key: 'user-assignments',
          icon: <TeamOutlined />,
          label: 'User Assignments',
        },
      ],
    },
    {
      key: 'azure-ad',
      icon: <CloudOutlined />,
      label: 'Azure AD Integration',
    },
  ];

  const renderContent = () => {
    // Show loading state
    if (moduleLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}>
          <Spin size="large" tip="Loading module..." />
        </div>
      );
    }

    const moduleContent = () => {
      switch (selectedModule) {
        case 'rbac-dashboard':
          return (
            <ModuleErrorBoundary moduleName="RBAC Dashboard">
              <Suspense fallback={<Spin size="large" tip="Loading RBAC Dashboard..." />}>
                <RBACDashboardPage />
              </Suspense>
            </ModuleErrorBoundary>
          );
        case 'roles':
          return (
            <ModuleErrorBoundary moduleName="Role Management">
              <Suspense fallback={<Spin size="large" tip="Loading Role Management..." />}>
                <RoleManagementPage />
              </Suspense>
            </ModuleErrorBoundary>
          );
        case 'permissions':
          return (
            <ModuleErrorBoundary moduleName="Permission Catalog">
              <Suspense fallback={<Spin size="large" tip="Loading Permission Catalog..." />}>
                <PermissionCatalogPage />
              </Suspense>
            </ModuleErrorBoundary>
          );
        case 'user-assignments':
          return (
            <ModuleErrorBoundary moduleName="User Assignments">
              <Suspense fallback={<Spin size="large" tip="Loading User Assignments..." />}>
                <UserRoleAssignmentPage />
              </Suspense>
            </ModuleErrorBoundary>
          );
        case 'azure-ad':
          return (
            <ModuleErrorBoundary moduleName="Azure AD Integration">
              <Suspense fallback={<Spin size="large" tip="Loading Azure AD Integration..." />}>
                <AzureADPage />
              </Suspense>
            </ModuleErrorBoundary>
          );
      case 'overview':
      default:
        return (
          <main
            style={{
              padding: isMobile ? '16px 12px' : '24px',
              minHeight: '100vh'
            }}
            role="main"
            aria-labelledby="admin-title"
          >
            <Space direction="vertical" size={isMobile ? "middle" : "large"} style={{ width: '100%' }}>
              <header>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Title level={2} id="admin-title" style={{ margin: 0 }}>
                    <SettingOutlined style={{ marginRight: 8 }} aria-hidden="true" />
                    Administration
                  </Title>
                  <Button
                    type="text"
                    icon={<SearchOutlined />}
                    onClick={() => setSearchModalVisible(true)}
                    aria-label="Search administration features (Ctrl+K)"
                    style={{ flexShrink: 0 }}
                  >
                    {!isMobile && "Search"}
                  </Button>
                </div>
                <Text type="secondary">
                  System configuration, user management, and security settings
                </Text>
              </header>

              {/* RBAC Management Section */}
              <section aria-labelledby="rbac-section-title">
                <Card title={<span id="rbac-section-title">Role-Based Access Control (RBAC)</span>}>
                  <Row gutter={[16, 16]} role="grid" aria-label="RBAC management options">
                  <Col xs={24} sm={12} md={8} lg={6} role="gridcell">
                    <Card
                      hoverable
                      size="small"
                      onClick={() => handleModuleSelection('rbac-dashboard')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleModuleSelection('rbac-dashboard');
                        }
                      }}
                      style={{ textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label="Navigate to RBAC Dashboard - System overview and analytics"
                    >
                      <BarChartOutlined
                        style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }}
                        aria-hidden="true"
                      />
                      <div>
                        <Text strong>RBAC Dashboard</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          System overview and analytics
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6} role="gridcell">
                    <Card
                      hoverable
                      size="small"
                      onClick={() => handleModuleSelection('roles')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleModuleSelection('roles');
                        }
                      }}
                      style={{ textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label="Navigate to Role Management - Create and manage roles"
                    >
                      <SafetyOutlined
                        style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }}
                        aria-hidden="true"
                      />
                      <div>
                        <Text strong>Role Management</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Create and manage roles
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6} role="gridcell">
                    <Card
                      hoverable
                      size="small"
                      onClick={() => handleModuleSelection('permissions')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleModuleSelection('permissions');
                        }
                      }}
                      style={{ textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label="Navigate to Permission Catalog - Manage system permissions"
                    >
                      <KeyOutlined
                        style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }}
                        aria-hidden="true"
                      />
                      <div>
                        <Text strong>Permission Catalog</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Manage system permissions
                        </Text>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6} role="gridcell">
                    <Card
                      hoverable
                      size="small"
                      onClick={() => handleModuleSelection('user-assignments')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleModuleSelection('user-assignments');
                        }
                      }}
                      style={{ textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      aria-label="Navigate to User Assignments - Assign roles to users"
                    >
                      <TeamOutlined
                        style={{ fontSize: 32, color: '#fa8c16', marginBottom: 8 }}
                        aria-hidden="true"
                      />
                      <div>
                        <Text strong>User Assignments</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Assign roles to users
                        </Text>
                      </div>
                    </Card>
                  </Col>
                </Row>
                </Card>
              </section>

              {/* Azure AD Integration Section */}
              <section aria-labelledby="azure-section-title">
                <Card title={<span id="azure-section-title">Azure AD / Entra ID Integration</span>}>
                  <Row gutter={16} role="grid" aria-label="Azure AD integration options">
                    <Col span={24} role="gridcell">
                      <Card
                        hoverable
                        onClick={() => handleModuleSelection('azure-ad')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleModuleSelection('azure-ad');
                          }
                        }}
                        style={{ textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                        role="button"
                        tabIndex={0}
                        aria-label="Navigate to Azure AD Integration - Configure Azure Active Directory for single sign-on, user synchronization, and enterprise authentication"
                        cover={
                          <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                            <CloudOutlined style={{ fontSize: 48, color: '#1890ff' }} aria-hidden="true" />
                          </div>
                        }
                      >
                        <Card.Meta
                          title="Azure AD Integration"
                          description="Configure Azure Active Directory for single sign-on, user synchronization, and enterprise authentication."
                        />
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </section>

              {/* Coming Soon Section */}
              <section aria-labelledby="coming-soon-title">
                <Card title={<span id="coming-soon-title">Additional Features (Coming Soon)</span>}>
                  <Row gutter={[16, 16]} role="grid" aria-label="Upcoming features">
                    <Col xs={24} sm={12} role="gridcell">
                      <Card
                        style={{ height: '100%', opacity: 0.7 }}
                        role="img"
                        aria-label="User Management feature - Coming soon"
                        cover={
                          <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                            <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} aria-hidden="true" />
                          </div>
                        }
                      >
                        <Card.Meta
                          title="User Management"
                          description="Create, modify, and delete user accounts. Manage user profiles and contact information."
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} role="gridcell">
                      <Card
                        style={{ height: '100%', opacity: 0.7 }}
                        role="img"
                        aria-label="System Configuration feature - Coming soon"
                        cover={
                          <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                            <ApiOutlined style={{ fontSize: 48, color: '#52c41a' }} aria-hidden="true" />
                          </div>
                        }
                      >
                        <Card.Meta
                          title="System Configuration"
                          description="Configure system-wide settings, integrations, and advanced options."
                        />
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </section>

              {/* Quick Access Section */}
              <section aria-labelledby="quick-access-title">
                <Card title={<span id="quick-access-title">Quick Access</span>}>
                  <div role="toolbar" aria-label="Administration quick access buttons">
                    <Space wrap style={{ width: '100%' }}>
                      <Button
                        type="primary"
                        icon={<BarChartOutlined aria-hidden="true" />}
                        onClick={() => handleModuleSelection('rbac-dashboard')}
                        aria-label="Navigate to RBAC Dashboard"
                      >
                        RBAC Dashboard
                      </Button>
                      <Button
                        icon={<SafetyOutlined aria-hidden="true" />}
                        onClick={() => handleModuleSelection('roles')}
                        aria-label="Navigate to Role Management"
                      >
                        Manage Roles
                      </Button>
                      <Button
                        icon={<KeyOutlined aria-hidden="true" />}
                        onClick={() => handleModuleSelection('permissions')}
                        aria-label="Navigate to Permission Catalog"
                      >
                        Manage Permissions
                      </Button>
                      <Button
                        icon={<TeamOutlined aria-hidden="true" />}
                        onClick={() => handleModuleSelection('user-assignments')}
                        aria-label="Navigate to User Assignments"
                      >
                        Assign Roles
                      </Button>
                      <Button
                        icon={<CloudOutlined aria-hidden="true" />}
                        onClick={() => handleModuleSelection('azure-ad')}
                        aria-label="Navigate to Azure AD Integration"
                      >
                        Azure AD
                      </Button>
                    </Space>
                  </div>
                </Card>
              </section>
            </Space>
          </main>
        );
    }
    };

    return moduleContent();
  };

  // Render navigation menu component
  const renderNavigationMenu = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="link"
          onClick={() => {
            setSelectedModule('overview');
            setMobileDrawerVisible(false);
          }}
          style={{ padding: 0, fontWeight: 'bold' }}
          aria-label="Return to administration overview page"
        >
          ← Back to Admin Overview
        </Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedModule]}
        onClick={({ key }) => {
          setSelectedModule(key);
          setMobileDrawerVisible(false); // Close drawer on mobile after selection
        }}
        items={menuItems}
        style={{ border: 'none', background: 'transparent' }}
        role="menu"
        aria-label="Administration modules"
      />
    </>
  );

  // Show side navigation for sub-modules
  if (selectedModule !== 'overview') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Mobile Menu Button - only show on mobile */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1000,
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '8px'
          }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerVisible(true)}
              aria-label="Open navigation menu"
            />
          </div>
        )}

        {/* Desktop Sidebar Navigation */}
        {!isMobile && (
          <nav
            style={{
              width: 280,
              background: '#f0f2f5',
              padding: '16px',
              borderRight: '1px solid #d9d9d9'
            }}
            role="navigation"
            aria-label="Administration navigation"
          >
            {renderNavigationMenu()}
          </nav>
        )}

        {/* Mobile Drawer Navigation */}
        <Drawer
          title="Administration"
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          width={280}
          styles={{
            body: { padding: '16px' }
          }}
        >
          {renderNavigationMenu()}
        </Drawer>

        <main
          style={{
            flex: 1,
            background: '#fff',
            paddingLeft: isMobile ? 0 : 0, // No extra padding needed
            paddingTop: isMobile ? 60 : 0 // Space for mobile menu button
          }}
          role="main"
        >
          {renderContent()}
        </main>
      </div>
    );
  }

  // Render search modal
  const renderSearchModal = () => (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SearchOutlined />
          <span>Search Administration</span>
          <Tag style={{ marginLeft: 'auto', fontSize: '12px' }}>
            Ctrl+K
          </Tag>
        </div>
      }
      open={searchModalVisible}
      onCancel={() => {
        setSearchModalVisible(false);
        setSearchQuery('');
      }}
      footer={null}
      width={600}
      style={{ top: 100 }}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input
          placeholder="Search for modules, features, or actions..."
          value={searchQuery}
          onChange={handleSearchChange}
          prefix={<SearchOutlined />}
          suffix={
            searchQuery && (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                aria-label="Clear search"
              />
            )
          }
          autoFocus
          size="large"
        />

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div>
            <Text strong style={{ fontSize: '14px', color: '#666' }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </Text>
            <List
              size="small"
              dataSource={searchResults}
              renderItem={(item) => (
                <List.Item
                  onClick={() => handleSearchResultSelect(item)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    margin: '4px 0'
                  }}
                  className="search-result-item"
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ fontSize: '18px', color: '#1890ff' }}>
                        {item.icon}
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{item.title}</span>
                        <Tag
                          color={
                            item.category === 'module' ? 'blue' :
                            item.category === 'feature' ? 'green' : 'orange'
                          }
                          style={{ fontSize: '11px' }}
                        >
                          {item.category}
                        </Tag>
                      </div>
                    }
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* No Results */}
        {searchQuery && searchResults.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No results found"
            style={{ margin: '24px 0' }}
          />
        )}

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <div>
            <Text strong style={{ fontSize: '14px', color: '#666', marginBottom: 8, display: 'block' }}>
              Recent Searches
            </Text>
            <Space wrap>
              {recentSearches.map((search, index) => (
                <Tag
                  key={index}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSearchQuery(search);
                    performSearch(search);
                  }}
                >
                  {search}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Quick Tips */}
        {!searchQuery && (
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Tips:</strong> Use Ctrl+K to open search, Escape to close.
              Search for modules like "roles", "permissions", "azure", or features like "dashboard", "management".
            </Text>
          </div>
        )}
      </Space>
    </Modal>
  );

  return (
    <>
      {renderContent()}
      {renderSearchModal()}
    </>
  );
};

export default AdminPage;
