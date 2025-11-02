# Component Development Guide

Detailed patterns and best practices for developing MachShop extension components.

## Table of Contents

1. [Component Structure](#component-structure)
2. [Component Types](#component-types)
3. [Component Patterns](#component-patterns)
4. [Form Components](#form-components)
5. [Data Display Components](#data-display-components)
6. [Error Handling](#error-handling)
7. [Loading States](#loading-states)
8. [Empty States](#empty-states)

## Component Structure

### Recommended File Organization

```
src/
├── components/
│   ├── ProductForm/
│   │   ├── ProductForm.tsx           # Main component
│   │   ├── ProductForm.types.ts      # TypeScript interfaces
│   │   ├── ProductForm.test.tsx      # Tests
│   │   ├── ProductForm.module.css    # Styles
│   │   ├── hooks/
│   │   │   ├── useProductData.ts
│   │   │   └── useFormValidation.ts
│   │   └── utils/
│   │       └── transformData.ts
│   └── shared/
│       └── FormField.tsx
```

### Type Definitions Example

```typescript
// ProductForm.types.ts
export interface ProductFormProps {
  /** Product ID for editing, undefined for creating */
  productId?: string;

  /** Callback when form is submitted */
  onSubmit: (data: Product) => Promise<void>;

  /** Whether the form is in read-only mode */
  readOnly?: boolean;

  /** Initial data for the form */
  initialData?: Partial<Product>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface FormErrors {
  [fieldName: string]: string;
}
```

## Component Types

### Widget Components

Dashboard widgets that display information.

```typescript
export const ProductStatsWidget: React.FC<WidgetProps> = ({ data }) => {
  return (
    <Card title="Product Statistics">
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Statistic title="Total Products" value={data.totalProducts} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic title="In Stock" value={data.inStock} />
        </Col>
      </Row>
    </Card>
  );
};
```

### Form Components

Components that handle user input and data submission.

```typescript
export const ProductForm: React.FC<ProductFormProps> = ({
  productId,
  onSubmit,
  readOnly = false,
}) => {
  const [form] = Form.useForm<Product>();
  const { data, loading } = useProductData(productId);

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
    }
  }, [data, form]);

  return (
    <Form form={form} onFinish={onSubmit} disabled={readOnly}>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Save
      </Button>
    </Form>
  );
};
```

### List/Table Components

Components that display collections of data.

```typescript
export const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  const columns: ColumnsType<Product> = [
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (price) => `$${price.toFixed(2)}`,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => editProduct(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete"
            description="Are you sure?"
            onConfirm={() => deleteProduct(record.id)}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return <Table columns={columns} dataSource={products} rowKey="id" />;
};
```

### Dialog/Modal Components

Components that display modal content.

```typescript
export const ProductModal: React.FC<ProductModalProps> = ({
  visible,
  productId,
  onClose,
  onSubmit,
}) => {
  const handleSubmit = async (values: Product) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal title="Edit Product" open={visible} onCancel={onClose} footer={null}>
      <ProductForm productId={productId} onSubmit={handleSubmit} />
    </Modal>
  );
};
```

## Component Patterns

### Compound Components Pattern

Create flexible, composable component hierarchies.

```typescript
export const Form = ({ children }) => (
  <form className={styles.form}>{children}</form>
);

export const FormGroup = ({ label, children }) => (
  <div className={styles.group}>
    <label>{label}</label>
    {children}
  </div>
);

export const FormField = ({ name, children }) => (
  <div className={styles.field}>
    {children}
  </div>
);

// Usage
<Form onSubmit={handleSubmit}>
  <FormGroup label="Basic Info">
    <FormField name="name">
      <Input />
    </FormField>
    <FormField name="email">
      <Input type="email" />
    </FormField>
  </FormGroup>
</Form>
```

### Render Props Pattern

Allow customization of rendered content.

```typescript
interface DataListProps<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  renderItem: (item: T) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
}

export function DataList<T>({
  data,
  loading,
  error,
  renderItem,
  renderEmpty,
  renderError,
}: DataListProps<T>) {
  if (loading) return <Spin />;
  if (error) return renderError?.(error) || <Alert type="error" />;
  if (!data.length) return renderEmpty?.() || <Empty />;

  return <div>{data.map(renderItem)}</div>;
}

// Usage
<DataList
  data={products}
  loading={loading}
  error={error}
  renderItem={(product) => <ProductCard product={product} />}
  renderEmpty={() => <Empty description="No products found" />}
/>
```

### Custom Hooks Pattern

Extract logic into reusable hooks.

```typescript
export function useProductForm(productId?: string) {
  const [form] = Form.useForm();
  const { data, loading, error } = useProductData(productId);
  const mutation = useUpdateProduct();

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data);
    }
  }, [data, form]);

  const handleSubmit = useCallback(
    async (values: Product) => {
      await mutation.mutateAsync(values);
    },
    [mutation]
  );

  return {
    form,
    data,
    loading: loading || mutation.isPending,
    error: error || mutation.error,
    handleSubmit,
  };
}

// Usage
export function ProductForm(props: ProductFormProps) {
  const { form, loading, error, handleSubmit } = useProductForm(props.productId);

  if (error) return <Alert type="error" />;

  return (
    <Form form={form} onFinish={handleSubmit}>
      {/* Form fields */}
    </Form>
  );
}
```

## Form Components

### Basic Form with Validation

```typescript
export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit }) => {
  const [form] = Form.useForm<FormData>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: FormData) => {
      try {
        setSubmitting(true);
        await onSubmit(values);
        message.success('Product saved successfully');
      } catch (err) {
        message.error('Failed to save product');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit]
  );

  return (
    <Card>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Product Name"
          name="name"
          rules={[
            { required: true, message: 'Product name is required' },
            { min: 3, message: 'Product name must be at least 3 characters' },
          ]}
        >
          <Input placeholder="Enter product name" />
        </Form.Item>

        <Form.Item
          label="Category"
          name="category"
          rules={[{ required: true, message: 'Category is required' }]}
        >
          <Select
            placeholder="Select a category"
            options={[
              { label: 'Electronics', value: 'electronics' },
              { label: 'Software', value: 'software' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Price"
          name="price"
          rules={[
            { required: true, message: 'Price is required' },
            {
              pattern: /^\d+(\.\d{1,2})?$/,
              message: 'Please enter a valid price',
            },
          ]}
        >
          <InputNumber min={0} step={0.01} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Save
            </Button>
            <Button>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
```

### Async Field Validation

```typescript
export const UserForm: React.FC = () => {
  const [form] = Form.useForm();

  return (
    <Form form={form}>
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, type: 'email', message: 'Invalid email' },
          {
            validator: async (_, value) => {
              if (!value) return;
              const exists = await checkEmailExists(value);
              if (exists) {
                throw new Error('Email already registered');
              }
            },
          },
        ]}
      >
        <Input type="email" />
      </Form.Item>
    </Form>
  );
};
```

### Dependent Fields

```typescript
export const ShippingForm: React.FC = () => {
  const [form] = Form.useForm();

  return (
    <Form form={form}>
      <Form.Item
        label="Shipping Method"
        name="method"
        rules={[{ required: true }]}
      >
        <Select
          options={[
            { label: 'Standard', value: 'standard' },
            { label: 'Express', value: 'express' },
          ]}
        />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.method !== currentValues.method
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('method') === 'express' ? (
            <Form.Item
              label="Express Details"
              name="expressDetails"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          ) : null
        }
      </Form.Item>
    </Form>
  );
};
```

## Data Display Components

### Data Table with Sorting and Filtering

```typescript
export const AdvancedTable: React.FC<AdvancedTableProps> = ({ data }) => {
  const [filters, setFilters] = useState<Filters>({});
  const [sorter, setSorter] = useState<SorterResult>({});

  const filteredData = useMemo(() => {
    let result = data;

    if (filters.name) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.status) {
      result = result.filter((item) => item.status === filters.status);
    }

    return result;
  }, [data, filters]);

  const columns: ColumnsType<Item> = [
    {
      title: 'Name',
      dataIndex: 'name',
      filterDropdown: () => (
        <Input
          placeholder="Search name"
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value) => {
        setFilters({ ...filters, status: value as string });
      },
    },
  ];

  return <Table columns={columns} dataSource={filteredData} />;
};
```

## Error Handling

### Error Boundary

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Alert type="error" message="Something went wrong" />;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <ProductForm />
</ErrorBoundary>
```

### Try-Catch Error Handling

```typescript
export function useProductUpdate() {
  const updateMutation = useMutation({
    mutationFn: async (product: Product) => {
      try {
        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify(product),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onError: (error) => {
      notification.error({
        message: 'Update Failed',
        description: error.message,
      });
    },
  });

  return updateMutation;
}
```

## Loading States

### Skeleton Loading

```typescript
export function ProductListSkeleton() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </div>
  );
}

export function ProductList() {
  const { data, loading } = useProducts();

  if (loading) return <ProductListSkeleton />;

  return <div>{/* Actual content */}</div>;
}
```

### Spinner Loading

```typescript
export function DataTable() {
  const { data, loading, error } = useTableData();

  if (loading) return <Spin tip="Loading data..." />;
  if (error) return <Alert type="error" />;

  return <Table dataSource={data} />;
}
```

## Empty States

### Empty Data Display

```typescript
export function ProductList() {
  const { data, loading } = useProducts();

  if (loading) return <Spin />;

  if (!data || data.length === 0) {
    return (
      <Empty
        description="No Products"
        style={{ marginTop: 48, marginBottom: 48 }}
      >
        <Button type="primary">Create Product</Button>
      </Empty>
    );
  }

  return <div>{/* Table/List content */}</div>;
}
```

---

**Last Updated**: November 2025
**Version**: 1.0
