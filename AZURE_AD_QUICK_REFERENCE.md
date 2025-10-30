# Quick Reference: Azure AD Admin Components Architecture

## Essential Imports
```typescript
// UI Components
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Tabs,
  Alert,
  Switch,
  Select,
  Table,
  Row,
  Col,
  Badge,
  Tag,
  message,
  Modal,
  Drawer,
  Spin,
  Typography,
} from 'antd';

// Icons
import {
  CloudOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SecurityScanOutlined,
  ApiOutlined,
} from '@ant-design/icons';

// State Management & API
import { useAuthStore } from '@/store/AuthStore';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
```

## Component Template
```typescript
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, message } from 'antd';

interface FormData {
  // Define form fields
}

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
      message.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: FormData) => {
    try {
      setLoading(true);
      // API call
      message.success('Success!');
    } catch (error) {
      message.error('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Form items */}
      </Form>
    </Card>
  );
};

export default ComponentName;
```

## Common Patterns

### Form Item
```typescript
<Form.Item
  name="fieldName"
  label="Field Label"
  rules={[{ required: true, message: 'Required' }]}
>
  <Input placeholder="Enter value" />
</Form.Item>
```

### Switch Toggle
```typescript
<Form.Item name="enabled" label="Enable" valuePropName="checked">
  <Switch />
</Form.Item>
```

### Select Dropdown
```typescript
<Form.Item name="provider" label="Provider">
  <Select placeholder="Select provider">
    {options.map(opt => (
      <Select.Option key={opt.id} value={opt.id}>
        {opt.name}
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

### Statistics Card
```typescript
<Col span={6}>
  <Card size="small">
    <div style={{ textAlign: 'center' }}>
      <IconComponent style={{ fontSize: 32, color: '#1890ff' }} />
      <Title level={4}>Value</Title>
      <Text type="secondary">Label</Text>
    </div>
  </Card>
</Col>
```

### Data Table
```typescript
<Table
  columns={[
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
  ]}
  dataSource={data}
  rowKey="id"
  loading={loading}
  pagination={{ pageSize: 20 }}
/>
```

### Two-Column Layout
```typescript
<Row gutter={24}>
  <Col span={12}>
    <Card title="Left">
      {/* Content */}
    </Card>
  </Col>
  <Col span={12}>
    <Card title="Right">
      {/* Content */}
    </Card>
  </Col>
</Row>
```

### Tabs
```typescript
<Tabs activeKey={activeTab} onChange={setActiveTab}>
  <Tabs.TabPane tab={<span><IconOutlined /> Tab 1</span>} key="tab1">
    {/* Content */}
  </Tabs.TabPane>
  <Tabs.TabPane tab={<span><IconOutlined /> Tab 2</span>} key="tab2">
    {/* Content */}
  </Tabs.TabPane>
</Tabs>
```

### Alert
```typescript
<Alert
  type="success"
  message="Success Title"
  description="Detailed description"
  showIcon
/>
```

### Drawer for Details
```typescript
<Drawer
  title="Details"
  placement="right"
  width={600}
  onClose={() => setOpen(false)}
  open={drawerVisible}
>
  {/* Content */}
</Drawer>
```

### Modal for Confirmation
```typescript
<Modal
  title="Confirm"
  okText="Save"
  cancelText="Cancel"
  onOk={() => handleSubmit()}
  onCancel={() => setVisible(false)}
  visible={visible}
>
  Are you sure?
</Modal>
```

## API Patterns

### Fetch with Token
```typescript
const response = await fetch('/api/v1/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
});

const data = await response.json();
if (response.ok) {
  message.success('Success');
} else {
  message.error(data.message);
}
```

### Form Submission
```typescript
const handleSubmit = async (values: FormData) => {
  try {
    const response = await fetch('/api/v1/resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) throw new Error('Failed');
    message.success('Saved successfully');
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Error');
  }
};
```

## State Patterns

### Local State
```typescript
const [loading, setLoading] = useState(false);
const [data, setData] = useState<DataType[]>([]);
const [error, setError] = useState<string | null>(null);
```

### Form State
```typescript
const [form] = Form.useForm();

// Set values
form.setFieldsValue({ field: value });

// Reset
form.resetFields();

// Validate
const values = await form.validateFields();
```

### Pagination
```typescript
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);

<Table
  pagination={{
    current: page,
    pageSize,
    onChange: (p, ps) => { setPage(p); setPageSize(ps); }
  }}
/>
```

### Filters
```typescript
const [filters, setFilters] = useState({
  status: 'all',
  search: '',
});

const filtered = data.filter(item =>
  (filters.status === 'all' || item.status === filters.status) &&
  (!filters.search || item.name.includes(filters.search))
);
```

## Color Reference
```typescript
// Primary colors
#1890ff - Blue (Primary)
#52c41a - Green (Success)
#faad14 - Orange (Warning)
#f5222d - Red (Error)
#8c8c8c - Gray (Secondary)

// Tag colors
<Tag color="green">Synced</Tag>
<Tag color="orange">Pending</Tag>
<Tag color="red">Failed</Tag>
<Tag color="blue">Active</Tag>
```

## Icon Reference
```typescript
CloudOutlined       - Azure/Cloud
CheckCircleOutlined - Success/Verified
ExclamationCircleOutlined - Warning/Error
ReloadOutlined      - Refresh/Sync
SettingOutlined     - Configuration
UserOutlined        - Single user
TeamOutlined        - Multiple users
SecurityScanOutlined- Security/Test
ApiOutlined         - API/Integration
UserAddOutlined     - Add user
SyncOutlined        - Synchronization
SearchOutlined      - Search
FilterOutlined      - Filter
InfoCircleOutlined  - Information
ClockCircleOutlined - Pending/Time
```

## Message Notifications
```typescript
message.success('Operation successful');
message.error('Operation failed');
message.warning('Warning message');
message.info('Information message');
message.loading('Loading...');
```

## Loading States
```typescript
// On button
<Button loading={loading}>Save</Button>

// With Spin
<Spin spinning={loading}>
  {content}
</Spin>

// In table
<Table loading={loading} />
```

## Responsive Design
```typescript
// Mobile-first
<Col xs={24} sm={12} lg={6}>
  Mobile: full width (24)
  Tablet: half width (12)
  Desktop: quarter width (6)
</Col>
```

## Type Definition Template
```typescript
interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  enabled: boolean;
}

interface Response<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

## Common Validation Rules
```typescript
rules={[
  { required: true, message: 'This field is required' },
  { min: 3, message: 'At least 3 characters' },
  { max: 50, message: 'Maximum 50 characters' },
  {
    pattern: /^[a-zA-Z0-9]+$/,
    message: 'Only alphanumeric characters allowed'
  },
  {
    validator: async (_, value) => {
      if (!value) return Promise.resolve();
      // Custom validation
      return Promise.reject(new Error('Invalid'));
    }
  }
]}
```

## Directory Structure
```
/frontend/src/
├── components/Admin/
│   └── AzureAD/
│       ├── AzureADConfig.tsx           (Configuration form)
│       ├── UserSyncManager.tsx         (Sync management)
│       ├── AzureADDashboard.tsx        (Dashboard)
│       ├── AzureADAttributeMapping.tsx (New)
│       ├── AzureADGroupMapping.tsx     (New)
│       └── index.ts                    (Exports)
├── pages/Admin/
│   └── AdminPage.tsx                   (Main admin page)
├── api/
│   ├── azureAD.ts                      (API client)
│   └── ...
├── types/
│   ├── azureAD.ts                      (Types)
│   └── ...
└── store/
    └── AuthStore.tsx
```

