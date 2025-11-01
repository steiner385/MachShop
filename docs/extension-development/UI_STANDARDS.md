# MachShop Extension UI Standards

**Version**: 2.0.0

Comprehensive UI/UX standards for building MachShop extensions. All extensions MUST follow these standards to maintain consistency, accessibility, and performance across the platform.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Component Standards](#component-standards)
3. [Typography](#typography)
4. [Color & Theming](#color--theming)
5. [Spacing & Layout](#spacing--layout)
6. [Accessibility](#accessibility)
7. [Forms & Validation](#forms--validation)
8. [Tables & Data Display](#tables--data-display)
9. [Navigation](#navigation)
10. [Notifications & Feedback](#notifications--feedback)
11. [Performance Requirements](#performance-requirements)
12. [Anti-Patterns](#anti-patterns)

## Design Principles

### 1. Consistency

All extensions must follow MachShop design language. Use the same components, patterns, and visual language across all extensions.

```typescript
// ✅ CORRECT: Use Ant Design components consistently
import { Button, Form, Input } from 'antd';

export function MyForm() {
  return (
    <Form>
      <Form.Item label="Part Number">
        <Input placeholder="Enter part number" />
      </Form.Item>
      <Button type="primary">Submit</Button>
    </Form>
  );
}

// ❌ WRONG: Custom unstyled components break consistency
export function MyForm() {
  return (
    <form>
      <label>Part Number</label>
      <input className="custom-input" />
      <button className="custom-button">Submit</button>
    </form>
  );
}
```

### 2. Accessibility First

All extensions must be accessible to users with disabilities. WCAG 2.1 AA minimum.

```typescript
// ✅ CORRECT: Semantic HTML with ARIA labels
import { Button, Form, Input } from 'antd';

export function AccessibleForm() {
  return (
    <Form>
      <Form.Item label="Status" name="status">
        <Input
          aria-label="Work Order Status"
          aria-describedby="status-help"
        />
      </Form.Item>
      <span id="status-help">Select the current status</span>
      <Button type="primary" aria-label="Update work order">
        Update
      </Button>
    </Form>
  );
}

// ❌ WRONG: No semantic HTML or labels
export function InaccessibleForm() {
  return (
    <div>
      <div>Status</div>
      <input type="text" />
      <button>Update</button>
    </div>
  );
}
```

### 3. Performance

Extensions must not block the main thread or cause layout thrashing.

```typescript
// ✅ CORRECT: Memoized components and callbacks
import { useMemo, useCallback } from 'react';

export function ProductionDashboard({ items }) {
  const filteredItems = useMemo(() => {
    return items.filter(item => item.status === 'active');
  }, [items]);

  const handleUpdate = useCallback((id) => {
    // Update logic
  }, []);

  return (
    <div>
      {filteredItems.map(item => (
        <Item key={item.id} item={item} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}

// ❌ WRONG: Recalculates on every render
export function ProductionDashboard({ items }) {
  const filteredItems = items.filter(item => item.status === 'active');

  return (
    <div>
      {filteredItems.map(item => (
        <Item
          key={item.id}
          item={item}
          onUpdate={() => { /* inline function */ }}
        />
      ))}
    </div>
  );
}
```

### 4. User-Centered Design

Design for the user's context. Manufacturing floor users have different needs than office workers.

```typescript
// ✅ CORRECT: Large touch targets for manufacturing floor
export function ManufacturingControl() {
  return (
    <Button
      type="primary"
      size="large"
      style={{
        minHeight: '48px', // Touch-friendly size
        minWidth: '48px',
        fontSize: '16px', // Readable from distance
      }}
    >
      Start Machine
    </Button>
  );
}

// ❌ WRONG: Small click targets not suitable for manufacturing
export function ManufacturingControl() {
  return (
    <button style={{ padding: '4px 8px' }}>
      Start Machine
    </button>
  );
}
```

## Component Standards

### Allowed Components

ONLY use Ant Design v5.12.8+ components. No custom components.

**Allowed**:
- `Button`, `Button.Group`
- `Form`, `Form.Item`, `Form.List`
- `Input`, `Input.TextArea`, `Input.Password`, `Input.OTP`, `Input.Search`
- `Select`, `TreeSelect`, `Cascader`
- `DatePicker`, `TimePicker`, `DatePicker.RangePicker`
- `Checkbox`, `Radio`, `Radio.Group`
- `Switch`, `Slider`, `Rate`
- `Table`, `Dropdown`, `Menu`, `Pagination`
- `Card`, `Collapse`, `Tabs`, `Drawer`, `Modal`, `Popover`, `Tooltip`
- `Alert`, `Badge`, `Tag`, `Progress`, `Spin`, `Empty`, `Skeleton`
- `Space`, `Divider`, `Grid` (Row/Col)
- `Breadcrumb`, `Pagination`, `Steps`
- `Message`, `Notification` (programmatic)
- `Upload`, `Transfer`, `Tree`

**Not Allowed**:
- Custom styled components (CSS-in-JS like styled-components, emotion)
- HTML elements without Ant Design wrapping
- Third-party UI libraries (unless approved)
- Uncontrolled components

### Component Props

Always use Ant Design props, never override internal behavior.

```typescript
// ✅ CORRECT: Use standard Ant Design props
import { Button, Space } from 'antd';

export function Controls() {
  return (
    <Space>
      <Button type="primary">Primary</Button>
      <Button>Default</Button>
      <Button danger>Delete</Button>
      <Button type="dashed" disabled>Disabled</Button>
    </Space>
  );
}

// ❌ WRONG: Custom props and styling override
export function Controls() {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button style={{ backgroundColor: '#1890ff' }}>Custom</button>
      <button style={{ ...someCustomStyle }}>Overridden</button>
    </div>
  );
}
```

## Typography

### Font Sizes

Use design tokens, never hard-coded pixel values.

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

export function TextComponent() {
  const { tokens } = useTheme();

  return (
    <div>
      <h1 style={{ fontSize: tokens.fontSizeHeading1 }}>
        Main Title
      </h1>
      <h2 style={{ fontSize: tokens.fontSizeHeading2 }}>
        Section Title
      </h2>
      <h3 style={{ fontSize: tokens.fontSizeHeading3 }}>
        Subsection Title
      </h3>
      <p style={{ fontSize: tokens.fontSizeBase }}>
        Body text
      </p>
      <small style={{ fontSize: tokens.fontSizeSmall }}>
        Small text
      </small>
    </div>
  );
}
```

### Font Weights

Use semantic weight levels.

```typescript
const { tokens } = useTheme();

// Regular text
<p style={{ fontWeight: tokens.fontWeightRegular }}>Normal text</p>

// Emphasized text
<p style={{ fontWeight: tokens.fontWeightMedium }}>Emphasized</p>

// Strong emphasis
<strong style={{ fontWeight: tokens.fontWeightBold }}>Important</strong>

// Section headers
<h3 style={{ fontWeight: tokens.fontWeightSemibold }}>Section Title</h3>
```

### Text Hierarchy

Maintain clear visual hierarchy with consistent spacing.

```typescript
// ✅ CORRECT: Clear hierarchy with spacing
export function DataCard() {
  const { tokens } = useTheme();

  return (
    <div>
      <h2 style={{ fontSize: tokens.fontSizeHeading2, marginBottom: tokens.spacingMd }}>
        Production Report
      </h2>
      <p style={{ fontSize: tokens.fontSizeBase, marginBottom: tokens.spacingSm, color: tokens.colorTextSecondary }}>
        Week ending December 15, 2024
      </p>
      <table>
        {/* data */}
      </table>
    </div>
  );
}
```

## Color & Theming

### Never Hard-Code Colors

ALWAYS use design tokens.

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

// ✅ CORRECT: Use design tokens
export function StatusIndicator({ status }) {
  const { tokens } = useTheme();

  const colorMap = {
    running: tokens.colorRunning,
    idle: tokens.colorIdle,
    maintenance: tokens.colorMaintenance,
    stopped: tokens.colorStopped,
  };

  return (
    <div style={{
      backgroundColor: colorMap[status],
      color: tokens.colorTextInverse,
      padding: tokens.spacingMd,
    }}>
      Status: {status}
    </div>
  );
}

// ❌ WRONG: Hard-coded colors
export function StatusIndicator({ status }) {
  const colorMap = {
    running: '#52c41a',     // Hard-coded green
    idle: '#faad14',        // Hard-coded orange
    maintenance: '#ff4d4f', // Hard-coded red
    stopped: '#8c8c8c',     // Hard-coded gray
  };

  return (
    <div style={{ backgroundColor: colorMap[status] }}>
      Status: {status}
    </div>
  );
}
```

### Available Tokens

See design tokens in Frontend Extension SDK documentation.

**Primary Colors**:
- `colorPrimary` - Brand primary
- `colorSuccess` - Success state
- `colorError` - Error state
- `colorWarning` - Warning state
- `colorInfo` - Information state

**Manufacturing Domain**:
- `colorProduction` - Production processes
- `colorQuality` - Quality control
- `colorMaterials` - Materials management
- `colorEquipment` - Equipment tracking
- `colorScheduling` - Scheduling and planning

**Status Colors**:
- `colorRunning` - Equipment running
- `colorIdle` - Equipment idle
- `colorMaintenance` - Maintenance status
- `colorStopped` - Equipment stopped

**Work Order Status**:
- `colorWONew` - New work orders
- `colorWOInProgress` - In progress
- `colorWOCompleted` - Completed
- `colorWOOnHold` - On hold
- `colorWOCancelled` - Cancelled

**Text Colors**:
- `colorTextPrimary` - Primary text
- `colorTextSecondary` - Secondary text
- `colorTextTertiary` - Tertiary text
- `colorTextInverse` - Inverse text

**Background Colors**:
- `colorBgPrimary` - Primary background
- `colorBgSecondary` - Secondary background
- `colorBgTertiary` - Tertiary background

### Dark Mode Support

All extensions must support light and dark modes.

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

export function ThemedComponent() {
  const { tokens, isDark, mode } = useTheme();

  return (
    <div style={{
      backgroundColor: tokens.colorBgPrimary,
      color: tokens.colorTextPrimary,
      padding: tokens.spacingMd,
    }}>
      <p>Current mode: {mode}</p>
      {isDark && <p>Dark theme active</p>}
    </div>
  );
}
```

## Spacing & Layout

### Use Design Tokens

Never hard-code spacing values.

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

export function LayoutExample() {
  const { tokens } = useTheme();

  return (
    <div style={{ padding: tokens.spacingLg }}>
      <h1 style={{ marginBottom: tokens.spacingMd }}>Title</h1>

      <div style={{
        marginBottom: tokens.spacingMd,
        paddingBottom: tokens.spacingMd,
        borderBottom: `1px solid ${tokens.colorNeutral200}`,
      }}>
        Content section
      </div>

      <div style={{
        display: 'flex',
        gap: tokens.spacingMd,
      }}>
        <div style={{ flex: 1 }}>Column 1</div>
        <div style={{ flex: 1 }}>Column 2</div>
      </div>
    </div>
  );
}
```

### Spacing Values

- `spacingXs` - 4px (minimal)
- `spacingSm` - 8px (small gap)
- `spacingMd` - 16px (standard gap)
- `spacingLg` - 24px (large gap)
- `spacingXl` - 32px (extra large gap)

### Grid Layout

Use Ant Design Row/Col for responsive layouts.

```typescript
import { Row, Col } from 'antd';

export function ResponsiveLayout() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <div>Full width on mobile, 6 cols on desktop</div>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <div>Full width on mobile, 6 cols on desktop</div>
      </Col>
      <Col xs={24} sm={24} md={8} lg={12}>
        <div>Full width on mobile/tablet, 12 cols on desktop</div>
      </Col>
    </Row>
  );
}
```

## Accessibility

### WCAG 2.1 AA Requirements

All extensions MUST meet WCAG 2.1 AA standards.

**Keyboard Navigation**:
```typescript
// ✅ CORRECT: Full keyboard support
import { Button, Form, Input } from 'antd';

export function KeyboardAccessible() {
  return (
    <Form>
      <Form.Item label="Email" name="email">
        <Input tabIndex={0} aria-label="Email address" />
      </Form.Item>
      <Button type="primary" tabIndex={0}>
        Submit
      </Button>
    </Form>
  );
}
```

**Screen Reader Support**:
```typescript
// ✅ CORRECT: Semantic HTML and ARIA labels
export function AccessibleList({ items }) {
  return (
    <ul role="list" aria-label="Production items">
      {items.map((item) => (
        <li
          key={item.id}
          role="listitem"
          aria-label={`${item.name}: ${item.status}`}
        >
          {item.name} - {item.status}
        </li>
      ))}
    </ul>
  );
}
```

**Color Contrast**:
```typescript
// ✅ CORRECT: High contrast using design tokens
export function HighContrast() {
  const { tokens } = useTheme();

  return (
    <div style={{
      backgroundColor: tokens.colorBgPrimary,
      color: tokens.colorTextPrimary,
      // Automatically provides 7:1+ contrast ratio
    }}>
      Accessible text
    </div>
  );
}
```

**Focus Indicators**:
```typescript
// ✅ CORRECT: Visible focus states
import { Button } from 'antd';

export function FocusSupport() {
  return (
    <Button
      type="primary"
      style={{
        outline: '2px solid #1890ff',
        outlineOffset: '2px',
      }}
      onFocus={(e) => {
        e.target.style.outline = '2px solid #1890ff';
      }}
    >
      Focusable Button
    </Button>
  );
}
```

## Forms & Validation

### Form Structure

Use Ant Design Form components consistently.

```typescript
import { Form, Input, Button, Select } from 'antd';

export function WorkOrderForm() {
  const [form] = Form.useForm();

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        label="Work Order Number"
        name="workOrderId"
        rules={[
          { required: true, message: 'Work order number required' },
          { pattern: /^WO-\d+$/, message: 'Format: WO-12345' },
        ]}
      >
        <Input placeholder="WO-12345" />
      </Form.Item>

      <Form.Item
        label="Status"
        name="status"
        rules={[{ required: true }]}
      >
        <Select
          options={[
            { label: 'New', value: 'new' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
          ]}
        />
      </Form.Item>

      <Button type="primary" onClick={() => form.submit()}>
        Save
      </Button>
    </Form>
  );
}
```

### Validation

Always validate on the client AND server.

```typescript
// ✅ CORRECT: Client-side validation before submit
const handleSubmit = async (values) => {
  try {
    // Client-side validation passed (Ant Design handles this)
    const response = await api.submitWorkOrder(values);
    message.success('Work order saved');
  } catch (error) {
    message.error(error.message);
  }
};

// Form validation rules
const rules = [
  { required: true, message: 'Field is required' },
  { min: 3, message: 'Minimum 3 characters' },
  { max: 100, message: 'Maximum 100 characters' },
  { pattern: /^[A-Z0-9-]+$/, message: 'Only uppercase letters, numbers, hyphens' },
  { validator: customValidator },
];
```

### Error Display

Show errors clearly and accessibly.

```typescript
// ✅ CORRECT: Clear error messages
<Form.Item
  label="Part Number"
  name="partNumber"
  rules={[
    { required: true, message: 'Part number is required' },
    {
      validator: async (_, value) => {
        if (!/^P-\d+/.test(value)) {
          return Promise.reject('Format must be P-12345');
        }
      },
    },
  ]}
>
  <Input aria-label="Part number" />
</Form.Item>

// ❌ WRONG: Unclear error messages
<input
  onBlur={(e) => {
    if (!e.target.value) alert('Invalid');
  }}
/>
```

## Tables & Data Display

### Table Standards

Use Ant Design Table component.

```typescript
import { Table, Space, Button, Tag } from 'antd';

export function WorkOrdersTable({ data }) {
  const columns = [
    {
      title: 'Work Order',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <strong>{id}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColorMap[status]}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small">
            Edit
          </Button>
          <Button type="link" danger size="small">
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 20 }}
    />
  );
}
```

### Sorting & Filtering

Support sorting and filtering for better UX.

```typescript
const columns = [
  {
    title: 'Work Order',
    dataIndex: 'id',
    sorter: (a, b) => a.id.localeCompare(b.id),
    filters: [
      { text: 'WO-1001', value: 'WO-1001' },
      { text: 'WO-1002', value: 'WO-1002' },
    ],
    onFilter: (value, record) => record.id === value,
  },
  // More columns...
];
```

## Navigation

### Menu Standards

Use Ant Design Menu component.

```typescript
import { Menu, Layout } from 'antd';

export function SideMenu() {
  return (
    <Layout.Sider>
      <Menu mode="vertical">
        <Menu.Item key="dashboard" icon={<HomeOutlined />}>
          Dashboard
        </Menu.Item>
        <Menu.SubMenu
          key="production"
          title="Production"
          icon={<BuildOutlined />}
        >
          <Menu.Item key="work-orders">Work Orders</Menu.Item>
          <Menu.Item key="equipment">Equipment</Menu.Item>
        </Menu.SubMenu>
      </Menu>
    </Layout.Sider>
  );
}
```

### Breadcrumbs

Use breadcrumbs for navigation context.

```typescript
import { Breadcrumb } from 'antd';
import { useNavigationBreadcrumbs } from '@machshop/navigation-extension-framework';

export function PageHeader({ path }) {
  return (
    <Breadcrumb>
      <Breadcrumb.Item>
        <a href="/">Home</a>
      </Breadcrumb.Item>
      <Breadcrumb.Item>
        <a href="/production">Production</a>
      </Breadcrumb.Item>
      <Breadcrumb.Item>Work Orders</Breadcrumb.Item>
    </Breadcrumb>
  );
}
```

## Notifications & Feedback

### User Feedback

Always provide feedback for user actions.

```typescript
import { message, notification } from 'antd';

// ✅ CORRECT: Immediate feedback
const handleSave = async () => {
  // Show loading message
  message.loading('Saving...');

  try {
    await api.save(data);
    // Replace loading with success
    message.success('Saved successfully');
  } catch (error) {
    message.error(`Failed to save: ${error.message}`);
  }
};

// For important notifications
const handleCriticalAction = () => {
  notification.warning({
    message: 'Action Required',
    description: 'This action cannot be undone',
    duration: 0, // Don't auto-close
  });
};
```

### Loading States

Show loading indicators during async operations.

```typescript
import { Spin, Skeleton } from 'antd';

// ✅ CORRECT: Appropriate loading indicator
export function DataContent({ loading, data }) {
  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  return <Table dataSource={data} />;
}
```

### Empty States

Handle empty data gracefully.

```typescript
import { Empty, Button } from 'antd';

export function WorkOrdersList({ orders }) {
  if (orders.length === 0) {
    return (
      <Empty
        description="No work orders found"
        style={{ marginTop: '50px' }}
      >
        <Button type="primary">Create Work Order</Button>
      </Empty>
    );
  }

  return <Table dataSource={orders} />;
}
```

## Performance Requirements

### Bundle Size

Extension bundles MUST be small for fast loading.

- **Maximum unpacked size**: 500 KB
- **Maximum gzipped size**: 150 KB
- **Maximum JavaScript**: 200 KB gzipped

### Render Performance

Extensions must render quickly without blocking the UI.

```typescript
// ✅ CORRECT: Optimized rendering
import { useMemo, useCallback, memo } from 'react';

const WorkOrderRow = memo(({ order, onUpdate }) => {
  return (
    <tr>
      <td>{order.id}</td>
      <td>{order.status}</td>
    </tr>
  );
});

export function WorkOrdersList({ orders }) {
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'active');
  }, [orders]);

  const handleUpdate = useCallback((id) => {
    // Update logic
  }, []);

  return (
    <table>
      <tbody>
        {filteredOrders.map(order => (
          <WorkOrderRow
            key={order.id}
            order={order}
            onUpdate={handleUpdate}
          />
        ))}
      </tbody>
    </table>
  );
}

// ❌ WRONG: Performance issues
export function WorkOrdersList({ orders }) {
  // Re-filters on every render
  const filtered = orders.filter(o => o.status === 'active');

  return (
    <table>
      <tbody>
        {filtered.map(order => (
          <tr key={order.id} onClick={() => { /* inline */ }}>
            <td>{order.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Network Performance

Minimize network requests.

```typescript
// ✅ CORRECT: Efficient data loading
import { useQuery } from '@tanstack/react-query';

export function WorkOrdersPage() {
  // Single request, caching handled
  const { data: orders } = useQuery({
    queryKey: ['workorders'],
    queryFn: () => api.getWorkOrders(),
    staleTime: 5 * 60 * 1000, // 5 minute cache
  });

  return <Table dataSource={orders} />;
}

// ❌ WRONG: Multiple requests on render
export function WorkOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch('/api/workorders').then(r => r.json()).then(setOrders);
    fetch('/api/equipment').then(r => r.json());
    fetch('/api/materials').then(r => r.json());
    // Separate requests, no caching
  }, []); // Missing dependency array
}
```

## Anti-Patterns

### ❌ Direct DOM Manipulation

Never manipulate the DOM directly. Use React.

```typescript
// ❌ WRONG
useEffect(() => {
  document.getElementById('my-element').innerHTML = '<p>Test</p>';
}, []);

// ✅ CORRECT
return <p>Test</p>;
```

### ❌ Missing Dependency Arrays

Always include dependency arrays in hooks.

```typescript
// ❌ WRONG: Missing dependency array
useEffect(() => {
  console.log(userId);
});

// ✅ CORRECT: Explicit dependencies
useEffect(() => {
  console.log(userId);
}, [userId]);

// ✅ CORRECT: Empty array for mount only
useEffect(() => {
  loadData();
}, []);
```

### ❌ Unnecessary State

Don't store derived data in state.

```typescript
// ❌ WRONG: Derived data in state
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// ✅ CORRECT: Computed value
const [items, setItems] = useState([]);
const filteredItems = useMemo(() => {
  return items.filter(i => i.active);
}, [items]);
```

### ❌ Hardcoded Values

Never hardcode configuration values.

```typescript
// ❌ WRONG
const API_URL = 'http://192.168.1.1:3000';
const PAGE_SIZE = 20;

// ✅ CORRECT: Use environment or configuration
const API_URL = process.env.REACT_APP_API_URL;
const PAGE_SIZE = config.pageSize || 20;
```

### ❌ Missing Error Boundaries

Always handle errors gracefully.

```typescript
// ✅ CORRECT: Error boundary
import { ErrorBoundary } from '@machshop/frontend-extension-sdk';

export function MyExtension() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### ❌ Unoptimized Lists

Don't render large lists without virtualization.

```typescript
// ❌ WRONG: Renders all 10,000 items
<div>
  {items.map(item => <Item key={item.id} item={item} />)}
</div>

// ✅ CORRECT: Virtual scrolling for large lists
import { List } from 'react-virtualized';

<List
  width={300}
  height={300}
  rowCount={items.length}
  rowHeight={30}
  rowRenderer={({ index, key, style }) => (
    <div key={key} style={style}>
      <Item item={items[index]} />
    </div>
  )}
/>
```

### ❌ Console Logs in Production

Remove debug logs before shipping.

```typescript
// ❌ WRONG: Left in production
console.log('DEBUG:', data);
console.warn('Test warning');

// ✅ CORRECT: Only in development
if (process.env.NODE_ENV === 'development') {
  console.log('DEBUG:', data);
}
```

## Checklist

Before submitting an extension, verify:

- [ ] All components use Ant Design v5.12.8+
- [ ] No hard-coded colors (all design tokens)
- [ ] No hard-coded spacing (all design tokens)
- [ ] Dark mode supported
- [ ] WCAG 2.1 AA compliant
- [ ] Touch-friendly targets (48px minimum)
- [ ] Loading states provided
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Responsive layout (mobile to desktop)
- [ ] Performance optimized (memoization, callbacks)
- [ ] Bundle size < 500 KB unpacked
- [ ] Network requests cached when appropriate
- [ ] No direct DOM manipulation
- [ ] Error boundaries in place
- [ ] Keyboard accessible
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Console logs removed

## Resources

- [Ant Design Components](https://ant.design/components/overview/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Best Practices](https://react.dev/)
- [Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Support

For questions or clarifications on UI standards:
- Documentation: `/docs/extension-development/`
- Examples: `/examples/extensions/`
- GitHub Issues: Use the `ui-standards` label
