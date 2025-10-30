# MachShop Admin Interface Architecture & Patterns

## Overview
The MachShop admin interface uses a modern React stack with Ant Design components, Zustand for state management, Axios for API calls, and React Query for data fetching. Below is a comprehensive guide to the existing patterns.

---

## 1. Directory Structure

```
/frontend/src/
├── pages/Admin/
│   ├── AdminPage.tsx                 # Main admin portal with navigation
│   ├── RBACDashboardPage.tsx         # Role & Permission analytics
│   ├── RoleManagementPage.tsx        # CRUD for roles
│   ├── PermissionCatalogPage.tsx     # CRUD for permissions
│   └── UserRoleAssignmentPage.tsx    # User role assignment
├── components/Admin/
│   └── AzureAD/
│       ├── AzureADConfig.tsx         # Configuration form & tabs
│       ├── UserSyncManager.tsx       # Sync management interface
│       ├── AzureADDashboard.tsx      # Status & analytics dashboard
│       └── index.ts                  # Barrel export
├── pages/Integration/
│   ├── IntegrationConfig.tsx         # Multi-provider configuration
│   ├── IntegrationDashboard.tsx      # Status monitoring
│   └── IntegrationLogs.tsx           # Audit & error logs
├── api/
│   ├── rbac.ts                       # API client for RBAC operations
│   ├── auth.ts                       # Authentication utilities
│   └── client.ts                     # Base Axios configuration
├── store/
│   ├── AuthStore.tsx                 # Zustand auth state
│   └── [other domain stores]
├── types/
│   ├── rbac.ts                       # RBAC type definitions
│   ├── auth.ts                       # Auth types
│   └── [other domain types]
└── hooks/
    └── [custom hooks]
```

---

## 2. Core Patterns

### 2.1 State Management

**Pattern: Zustand + Persist**

```typescript
// Example from AuthStore.tsx
export const useAuthStoreBase = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        login: async (credentials) => { /* ... */ },
        logout: async () => { /* ... */ },
        setUser: (user) => { /* ... */ },
        setError: (error) => { /* ... */ },
      }),
      {
        name: 'mes-auth-storage',
      }
    )
  )
);
```

**Key Features:**
- Zustand for lightweight state management
- Persist middleware for localStorage persistence
- Devtools middleware for debugging
- Async actions for API operations

---

### 2.2 API Layer Pattern

**Pattern: Axios Client with Interceptors**

```typescript
// Example from rbac.ts
const rbacClient = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
rbacClient.interceptors.request.use((config) => {
  const token = tokenUtils.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
rbacClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication required'));
    }
    throw new Error(error.response?.data?.message || error.message);
  }
);

// Organized API methods with JSDoc comments
export const rbacAPI = {
  getRoles: async (filters = {}) => { /* ... */ },
  createRole: async (roleData) => { /* ... */ },
  updateRole: async (roleId, roleData) => { /* ... */ },
  deleteRole: async (roleId) => { /* ... */ },
  // ... more methods
};
```

**Key Features:**
- Centralized Axios client configuration
- Request/response interceptors for auth & error handling
- Organized export object with all API methods
- JSDoc comments for IDE autocomplete
- Error standardization

---

### 2.3 Data Fetching with React Query

**Pattern: useQuery & useMutation**

```typescript
// Example from RoleManagementPage.tsx
const { data: rolesData, isLoading, refetch } = useQuery({
  queryKey: ['roles', filters],
  queryFn: () => rbacAPI.getRoles(filters),
  refetchInterval: 30000, // Auto-refresh
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const createRoleMutation = useMutation({
  mutationFn: (data) => rbacAPI.createRole(data),
  onSuccess: (data) => {
    message.success('Role created successfully');
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  },
  onError: (error) => {
    message.error(error.message);
  },
});
```

**Key Features:**
- Automatic caching and background refetching
- Stale time configuration for performance
- Auto-refetch on interval
- Integration with Ant Design message notifications
- Query invalidation for real-time updates

---

### 2.4 Form Pattern

**Pattern: Ant Design Form + Validation**

```typescript
const [form] = Form.useForm();

const handleSave = async (values: any) => {
  try {
    const validated = await form.validateFields();
    // Make API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      message.success('Configuration saved successfully');
      // Refresh data
    } else {
      const error = await response.json();
      message.error(error.message);
    }
  } catch (error) {
    message.error('Failed to save');
  }
};

// In JSX
<Form
  form={form}
  layout="vertical"
  onFinish={handleSave}
  initialValues={{
    enabled: true,
    syncEnabled: true,
  }}
>
  <Form.Item
    name="name"
    label="Provider Name"
    rules={[{ required: true, message: 'Please enter provider name' }]}
  >
    <Input placeholder="e.g., Corporate Azure AD" />
  </Form.Item>
  
  <Form.Item name="enabled" label="Enable Provider" valuePropName="checked">
    <Switch />
  </Form.Item>
  
  <Form.Item name="syncEnabled" label="Enable Sync" valuePropName="checked">
    <Switch />
  </Form.Item>
</Form>
```

**Key Features:**
- `Form.useForm()` for form instance management
- `onFinish` for validated form submission
- `rules` for field validation
- `layout="vertical"` for mobile-friendly design
- `initialValues` for pre-filling data
- Support for complex field types (Switch, Input, Select, TextArea)

---

### 2.5 Component Composition Pattern

**Pattern: Tab-based Organization (AzureADConfig)**

```typescript
const AzureADConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('configuration');
  
  const renderConfigurationTab = () => (/* Form */ );
  const renderStatusTab = () => (/* Statistics */ );
  const renderApiEndpointsTab = () => (/* Documentation */ );
  
  return (
    <div>
      <Card>
        <Title level={3}>
          <ApiOutlined /> Azure AD / Entra ID Configuration
        </Title>
        <Paragraph>Configuration description...</Paragraph>
        
        {renderProviderSelect()}
        
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><SettingOutlined /> Configuration</span>} key="configuration">
            <Spin spinning={loading}>
              {renderConfigurationTab()}
            </Spin>
          </TabPane>
          <TabPane tab={<span><CheckCircleOutlined /> Status</span>} key="status">
            {renderStatusTab()}
          </TabPane>
          <TabPane tab={<span><ApiOutlined /> API Reference</span>} key="api">
            {renderApiEndpointsTab()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
```

**Key Features:**
- Modular render functions for each tab
- Descriptive icons and labels
- `Spin` component for loading states
- Organized multi-step workflows

---

### 2.6 Dashboard Pattern

**Pattern: Statistics + Analytics**

```typescript
// From AzureADDashboard.tsx & RBACDashboardPage.tsx
<Row gutter={16} style={{ marginBottom: 24 }}>
  <Col span={6}>
    <Card size="small">
      <Statistic
        title="Total Providers"
        value={stats.totalProviders}
        prefix={<CloudOutlined />}
        valueStyle={{ color: '#1890ff' }}
      />
      <Text type="secondary">{stats.activeProviders} active</Text>
    </Card>
  </Col>
  
  <Col span={6}>
    <Card size="small">
      <div style={{ textAlign: 'center' }}>
        <UserOutlined style={{ fontSize: 32, color: '#52c41a' }} />
        <Title level={4}>Synced Users</Title>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
          {stats.userCount || 0}
        </Text>
      </div>
    </Card>
  </Col>
</Row>

// Real-time activity feed
<List
  size="small"
  dataSource={recentActivity.slice(0, 6)}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        avatar={getActivityIcon(item.type)}
        title={
          <Space>
            <Text style={{ fontSize: '13px' }}>{item.message}</Text>
            <Tag color={getSeverityColor(item.severity)}>
              {item.severity}
            </Tag>
          </Space>
        }
        description={
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        }
      />
    </List.Item>
  )}
/>
```

**Key Features:**
- Grid layout with `Row` and `Col` for responsive design
- `Statistic` component for KPIs
- Color-coded icons for visual hierarchy
- Activity feed with timestamps
- Real-time updates via polling

---

### 2.7 Modal & Drawer Pattern

**Pattern: Modal for Forms, Drawer for Details**

```typescript
// User Detail Drawer
const renderUserDetails = () => (
  <Drawer
    title="User Sync Details"
    placement="right"
    width={600}
    onClose={() => setDrawerVisible(false)}
    open={drawerVisible}
  >
    {selectedUser && (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title="User Information">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Display Name">
              {selectedUser.displayName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedUser.email}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    )}
  </Drawer>
);

// Modal for form submission
<Modal
  title="Resolve User Conflict"
  content={`How would you like to resolve the conflict for ${record.displayName}?`}
  footer={[
    <Button key="skip" onClick={() => resolveUserConflict(record.id, 'skip')}>
      Skip
    </Button>,
    <Button key="merge" type="default" onClick={() => resolveUserConflict(record.id, 'merge')}>
      Merge
    </Button>,
    <Button key="replace" type="primary" onClick={() => resolveUserConflict(record.id, 'replace')}>
      Replace
    </Button>,
  ]}
/>
```

**Key Features:**
- `Drawer` for side panels with details
- `Modal` for confirmations and important actions
- Descriptions component for key-value display
- Custom footer buttons for various actions

---

## 3. Existing Azure AD Components

### 3.1 AzureADConfig.tsx
**Purpose:** Configuration interface for Azure AD providers

**Key Features:**
- Provider selection dropdown with status badges
- Multi-tab interface (Configuration, Status, API Reference)
- Connection testing with detailed results
- Sync control UI
- Form for tenant/client credentials
- Sync settings (user sync, group sync, auto-create)

**State Management:**
```typescript
const [form] = Form.useForm();
const [loading, setLoading] = useState(false);
const [testingConnection, setTestingConnection] = useState(false);
const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
const [providers, setProviders] = useState<AzureADProvider[]>([]);
const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
const [activeTab, setActiveTab] = useState('configuration');
```

**API Endpoints Used:**
- GET `/api/v1/admin/sso/providers?type=AZURE_AD` - Fetch providers
- POST/PUT `/api/v1/admin/sso/providers` - Create/update provider
- POST `/api/v1/admin/azure-ad/test-connection` - Test connection
- POST `/api/v1/admin/azure-ad/sync/{providerId}` - Trigger sync

---

### 3.2 UserSyncManager.tsx
**Purpose:** Manage user and group synchronization from Azure AD

**Key Features:**
- Statistics cards showing sync status
- User/group tables with filtering and pagination
- Sync progress tracking
- User detail drawer with history
- Conflict resolution UI
- Full sync trigger button

**State Management:**
```typescript
const [users, setUsers] = useState<SyncUser[]>([]);
const [groups, setGroups] = useState<SyncGroup[]>([]);
const [stats, setStats] = useState<SyncStats | null>(null);
const [syncProgress, setSyncProgress] = useState(0);
const [selectedUser, setSelectedUser] = useState<SyncUser | null>(null);
const [drawerVisible, setDrawerVisible] = useState(false);
const [filters, setFilters] = useState({
  status: 'all',
  department: 'all',
  search: '',
});
```

**API Endpoints Used:**
- GET `/api/v1/admin/azure-ad/sync/stats` - Sync statistics
- GET `/api/v1/admin/azure-ad/sync/users` - User list
- GET `/api/v1/admin/azure-ad/sync/groups` - Group list
- POST `/api/v1/admin/azure-ad/sync/full` - Start full sync
- GET `/api/v1/admin/azure-ad/sync/progress` - Poll sync progress
- POST `/api/v1/admin/azure-ad/sync/users/{userId}/resolve` - Resolve conflicts

---

### 3.3 AzureADDashboard.tsx
**Purpose:** Overview and monitoring of Azure AD integration

**Key Features:**
- Real-time health status with color coding
- KPI cards for providers, users, groups
- Provider status table
- Recent activity feed
- Sync issues list with severity levels
- Quick action buttons

**State Management:**
```typescript
const [stats, setStats] = useState<DashboardStats | null>(null);
const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
const [providers, setProviders] = useState<Provider[]>([]);
const [syncIssues, setSyncIssues] = useState<SyncIssue[]>([]);
const [loading, setLoading] = useState(true);
```

**Auto-Refresh:** 30-second polling interval for real-time updates

---

## 4. Component Design Patterns

### 4.1 Icon Usage Pattern
All admin components consistently use Ant Design Icons:

```typescript
import {
  CloudOutlined,      // Azure/Cloud resources
  CheckCircleOutlined, // Status: Success
  ExclamationCircleOutlined, // Status: Warning/Error
  ReloadOutlined,     // Actions: Refresh/Sync
  SettingOutlined,    // Configuration
  UserOutlined,       // Users
  TeamOutlined,       // Groups
  SecurityScanOutlined, // Security/Testing
  ApiOutlined,        // API/Integration
  UserAddOutlined,    // User creation
  SyncOutlined,       // Synchronization
  SearchOutlined,     // Search
  FilterOutlined,     // Filtering
  InfoCircleOutlined, // Information
  ClockCircleOutlined, // Pending/Time-based
  TrendingUpOutlined, // Analytics
} from '@ant-design/icons';
```

### 4.2 Color Scheme Pattern
```typescript
// Status colors
const statusColors = {
  success: '#52c41a',    // Green
  warning: '#faad14',    // Orange
  error: '#f5222d',      // Red
  info: '#1890ff',       // Blue
  default: '#8c8c8c',    // Gray
};

// Severity colors
const severityColors = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

// Ant Design tag colors
<Tag color="green">Synced</Tag>
<Tag color="orange">Pending</Tag>
<Tag color="red">Failed</Tag>
<Tag color="blue">Enabled</Tag>
```

### 4.3 Message & Notification Pattern
```typescript
import { message } from 'antd';

// Success
message.success('Azure AD configuration saved successfully');

// Error with details
message.error(error.message || 'Failed to save configuration');

// Loading state (via Button loading prop)
<Button loading={loading}>Save Configuration</Button>
```

### 4.4 Responsive Grid Pattern
```typescript
// 2-column layout on desktop, stacked on mobile
<Row gutter={24}>
  <Col span={12}>
    <Card title="Basic Configuration">
      {/* Form fields */}
    </Card>
  </Col>
  <Col span={12}>
    <Card title="Synchronization Settings">
      {/* Form fields */}
    </Card>
  </Col>
</Row>

// Alternative responsive pattern
<Row gutter={16}>
  {stats && (
    <>
      <Col xs={24} sm={12} lg={6}>
        <Card>{/* Content */}</Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>{/* Content */}</Card>
      </Col>
    </>
  )}
</Row>
```

---

## 5. Type Definitions Pattern

### 5.1 Provider/Configuration Types
```typescript
interface AzureADProvider {
  id: string;
  name: string;
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  syncEnabled: boolean;
  lastSync?: string;
  status: 'active' | 'inactive' | 'error';
  userCount?: number;
  groupCount?: number;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    authentication: 'success' | 'failed';
    apiAccess: 'success' | 'failed';
    permissions: 'verified' | 'insufficient';
  };
  error?: string;
}
```

### 5.2 Sync-related Types
```typescript
interface SyncUser {
  id: string;
  azureId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'conflict';
  lastSyncAt?: string;
  localUserId?: string;
  groups: string[];
  conflictReason?: string;
  enabled: boolean;
}

interface SyncStats {
  totalUsers: number;
  syncedUsers: number;
  pendingUsers: number;
  failedUsers: number;
  conflictUsers: number;
  totalGroups: number;
  syncedGroups: number;
  lastSyncAt?: string;
  syncInProgress: boolean;
}
```

---

## 6. Integration Configuration Pattern Reference

The `IntegrationConfig.tsx` provides additional patterns for multi-provider configuration:

**Features to adopt:**
1. **Provider Selection:** Multiple providers can be configured
2. **Config Builder:** Different config structures per provider type
3. **Connection Testing:** Test before saving
4. **CRUD Operations:** Create, read, update, delete with confirmation
5. **Status Tracking:** Enable/disable toggle for each provider
6. **Error Handling:** Detailed error messages from API

```typescript
const handleTestConnection = async () => {
  try {
    setTestingConnection(true);
    const values = await form.validateFields();
    
    // Build provider-specific config
    const config = buildConfigFromForm(values);
    
    // Create temporary config for testing
    const response = await axios.post('/api/v1/integrations', {
      name: `test_${Date.now()}`,
      displayName: 'Test Connection',
      type: values.type,
      config,
      enabled: false,
    });
    
    // Test the connection
    const testResponse = await axios.post(
      `/api/v1/integrations/${response.data.id}/test`
    );
    
    // Clean up test config
    await axios.delete(`/api/v1/integrations/${response.data.id}`);
    
    if (testResponse.data.success) {
      message.success(`Connection successful! Response: ${testResponse.data.responseTime}ms`);
    } else {
      message.error(`Connection failed: ${testResponse.data.error}`);
    }
  } catch (error: any) {
    message.error('Connection test failed: ' + (error.response?.data?.error || error.message));
  } finally {
    setTestingConnection(false);
  }
};
```

---

## 7. Best Practices Observed

### 7.1 Data Loading
- Use `useState` with loading flags for manual fetch operations
- Use React Query `useQuery` for automatic caching
- Show `Spin` component during loading
- Provide error boundaries with retry buttons

### 7.2 Error Handling
- Display errors via Ant Design `message` notifications
- Include detailed error messages from API responses
- Provide recovery options (reload, retry, cancel)
- Log errors to console for debugging

### 7.3 User Feedback
- Use `message.success()` for successful operations
- Use `message.error()` for failures
- Use `message.loading()` for long operations
- Show `Badge` and `Tag` for status indicators
- Use `Tooltip` for additional context

### 7.4 Performance
- Pagination for large lists (default: 20 items/page)
- Virtual scrolling for tables with 1000+ rows
- Debounced search inputs
- Request timeout configuration (30 seconds)

### 7.5 Security
- Tokens stored in localStorage with Zustand persist
- Automatic token refresh via interceptors
- Redirect to login on 401 responses
- Bearer token in all API calls
- CORS-enabled API client

---

## 8. Recommended Patterns for Azure AD Config Components

### 8.1 Component Structure
```
AzureADConnectionTest.tsx       # Connection testing UI
AzureADAttributeMapping.tsx     # User attribute mapping
AzureADGroupMapping.tsx         # Group to role mapping
AzureADSyncScheduler.tsx        # Sync schedule configuration
AzureADLogsViewer.tsx           # Sync logs and audit trail
```

### 8.2 Form Types
```typescript
interface AzureADConfigFormData {
  name: string;
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  syncEnabled: boolean;
  syncSchedule: string; // cron expression
  syncUsers: boolean;
  syncGroups: boolean;
  autoCreateUsers: boolean;
  userMapping: Record<string, string>;
  groupMapping: Record<string, string>;
}

interface ConnectionTestData {
  providerId?: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}
```

### 8.3 API Integration Pattern
```typescript
export const azureADAPI = {
  // Configuration
  getProviders: async () => { /* GET /api/v1/admin/sso/providers */ },
  getProvider: async (id: string) => { /* GET /api/v1/admin/sso/providers/{id} */ },
  createProvider: async (data) => { /* POST /api/v1/admin/sso/providers */ },
  updateProvider: async (id, data) => { /* PUT /api/v1/admin/sso/providers/{id} */ },
  deleteProvider: async (id) => { /* DELETE /api/v1/admin/sso/providers/{id} */ },
  
  // Connection testing
  testConnection: async (data) => { /* POST /api/v1/admin/azure-ad/test-connection */ },
  testMSGraphAccess: async (providerId) => { /* POST /api/v1/admin/azure-ad/test-graph */ },
  
  // Attribute mapping
  getAttributeMapping: async (providerId) => { /* GET /api/v1/admin/azure-ad/attributes */ },
  updateAttributeMapping: async (providerId, mapping) => { /* PUT /api/v1/admin/azure-ad/attributes */ },
  
  // Group mapping
  getGroupMapping: async (providerId) => { /* GET /api/v1/admin/azure-ad/groups */ },
  updateGroupMapping: async (providerId, mapping) => { /* PUT /api/v1/admin/azure-ad/groups */ },
  
  // Sync operations
  getSyncStatus: async (providerId) => { /* GET /api/v1/admin/azure-ad/sync/status */ },
  triggerSync: async (providerId) => { /* POST /api/v1/admin/azure-ad/sync/trigger */ },
  getSyncLogs: async (providerId, filters) => { /* GET /api/v1/admin/azure-ad/sync/logs */ },
};
```

---

## 9. File Structure for New Azure AD Components

Create components following this structure:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Space,
  Alert,
  message,
  // ... other imports
} from 'antd';
import {
  // ... icon imports
} from '@ant-design/icons';

// Type definitions
interface FormDataType {
  // ... fields
}

// Component
const ComponentName: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      // API call
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (values: FormDataType) => {
    try {
      setLoading(true);
      // API call
      message.success('Success');
    } catch (error) {
      message.error('Error message');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* Form items */}
        </Form>
      </Card>
    </div>
  );
};

export default ComponentName;
```

---

## 10. Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `/frontend/src/pages/Admin/AdminPage.tsx` | Admin portal entry point | 279 |
| `/frontend/src/components/Admin/AzureAD/AzureADConfig.tsx` | Azure AD configuration form | 563 |
| `/frontend/src/components/Admin/AzureAD/UserSyncManager.tsx` | Sync management interface | 568 |
| `/frontend/src/components/Admin/AzureAD/AzureADDashboard.tsx` | Monitoring dashboard | 450 |
| `/frontend/src/api/rbac.ts` | RBAC API client | 335 |
| `/frontend/src/store/AuthStore.tsx` | Authentication state | ~250+ lines |
| `/frontend/src/pages/Integration/IntegrationConfig.tsx` | Integration config reference | 500+ lines |

---

## 11. Styling Notes

- **No custom CSS modules** for admin components yet
- Use inline styles with Ant Design theme colors
- Color palette:
  - Primary: `#1890ff` (Blue)
  - Success: `#52c41a` (Green)
  - Warning: `#faad14` (Orange)
  - Error: `#f5222d` (Red)
  - Secondary text: `#8c8c8c` (Gray)
- Spacing: Use Ant Design `gutter` prop for grid consistency
- Responsive: Use `xs`, `sm`, `lg` breakpoints in Col spans

---

## 12. Authentication & Authorization

All admin components check:
1. User authentication via `useAuthStore()`
2. User permissions (implicit via route guards)
3. Bearer token in all API requests
4. Token refresh on 401 response

**Example:**
```typescript
const { user } = useAuthStore();

// Authorization check would be handled at:
// 1. Route level (ProtectedRoute component)
// 2. Component level (conditional rendering)
// 3. API level (403 response handling)
```

---

## Summary

The MachShop admin interface architecture follows these core principles:

1. **Modular Components** - Reusable, single-responsibility components
2. **Centralized API** - Single API client per domain with interceptors
3. **State Management** - Zustand for global state, React Query for server state
4. **Type Safety** - Strong TypeScript interfaces for all data structures
5. **Ant Design** - Consistent UI using Ant Design components
6. **Error Handling** - User-friendly error messages with recovery options
7. **Performance** - Pagination, lazy loading, and efficient updates
8. **Accessibility** - Icons, colors, and labels for clarity

When creating Azure AD configuration components, follow these existing patterns to maintain consistency across the admin interface.

