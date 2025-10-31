# Frontend UUID Integration Guide

This guide explains how to integrate persistent UUID functionality into MachShop frontend components for NIST AMS 300-12 compliance.

## Overview

The MachShop frontend now includes comprehensive UUID support for Model-Based Enterprise (MBE) traceability. This implementation provides:

- Type-safe UUID handling with branded types
- Visual UUID display components with copy functionality
- Enhanced search capabilities for UUID queries
- Standards-compliant formatting for STEP, QIF, and ITAR

## Quick Start

### Basic UUID Display

```tsx
import UUIDDisplay from '../components/Common/UUIDDisplay';

// Simple UUID display
<UUIDDisplay uuid={entity.persistentUuid} />

// Full-featured display with all options
<UUIDDisplay
  uuid={entity.persistentUuid}
  entityType="WorkOrder"
  variant="inline"
  showStandardFormats={true}
  options={{
    showCopy: true,
    showTooltip: true,
    truncate: true
  }}
/>
```

### UUID Validation

```tsx
import { isValidUUID, validateIdFormat } from '../utils/uuidUtils';

// Quick validation
if (isValidUUID(inputValue)) {
  // Process valid UUID
}

// Detailed validation
const validation = validateIdFormat(inputValue);
if (validation.isValid && validation.format === 'uuid-v4') {
  // Handle UUID v4
}
```

## Components Reference

### UUIDDisplay Component

The primary component for displaying UUIDs with rich functionality.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `uuid` | `string` | required | The UUID to display |
| `entityType` | `string` | optional | Entity type for tooltip context |
| `displayName` | `string` | optional | Custom display name instead of UUID |
| `variant` | `'inline' \| 'block' \| 'badge'` | `'inline'` | Display style |
| `showStandardFormats` | `boolean` | `false` | Show STEP/QIF/ITAR format options |
| `options` | `UUIDDisplayOptions` | see below | Display customization |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Component size |
| `className` | `string` | optional | Additional CSS classes |

#### UUIDDisplayOptions

```tsx
interface UUIDDisplayOptions {
  showCopy?: boolean;        // Show copy button (default: true)
  showTooltip?: boolean;     // Show hover tooltip (default: true)
  truncate?: boolean;        // Truncate for display (default: true)
  truncateLength?: number;   // Characters to show on each side (default: 8)
  showPrefix?: boolean;      // Show prefix text (default: false)
  prefix?: string;           // Prefix text to display
}
```

#### Variants

**Inline Variant (default)**
```tsx
<UUIDDisplay uuid={uuid} variant="inline" />
```
Compact display suitable for headers and detail sections.

**Block Variant**
```tsx
<UUIDDisplay uuid={uuid} variant="block" />
```
Full-width display with label, ideal for forms and detail cards.

**Badge Variant**
```tsx
<UUIDDisplay uuid={uuid} variant="badge" />
```
Styled badge format with icon, perfect for status displays.

### Enhanced Search

The GlobalSearch component now supports UUID detection and direct lookup.

```tsx
import { GlobalSearch } from '../components/Search/GlobalSearch';

// Search automatically detects UUID patterns
<GlobalSearch placeholder="Search entities... or paste a UUID" />
```

**UUID Search Features:**
- Automatic UUID pattern detection
- UUID reconstruction from partial input
- Direct entity lookup for valid UUIDs
- Smart placeholder text indicating UUID support

## Type Definitions

### Branded UUID Types

```tsx
import type {
  UUID,
  PartUUID,
  WorkOrderUUID,
  MaterialLotUUID,
  RoutingUUID
} from '../types/uuid';

// Type-safe UUID handling
const partUuid: PartUUID = createEntityUUID<PartUUID>(uuidString);
```

### Entity Interface

```tsx
import type { HasPersistentUUID } from '../types/uuid';

interface YourEntity extends HasPersistentUUID {
  id: string;                    // Internal CUID
  persistentUuid?: string;       // MBE UUID for external integration
  // ... other fields
}
```

## Utility Functions

### UUID Validation

```tsx
import {
  isValidUUID,
  isValidCUID,
  validateIdFormat,
  normalizeUUID
} from '../utils/uuidUtils';

// Basic validation
const isValid = isValidUUID(input);

// Format detection
const validation = validateIdFormat(input);
console.log(validation.format); // 'uuid-v4' | 'cuid' | 'numeric' | 'unknown'

// Normalization
const normalized = normalizeUUID(uuid); // lowercase, trimmed
```

### UUID Formatting

```tsx
import {
  formatForSTEP,
  formatForQIF,
  formatForITAR,
  getAllStandardFormats
} from '../utils/uuidUtils';

// Individual formats
const stepUrn = formatForSTEP(uuid);     // urn:uuid:...
const qifUrn = formatForQIF(uuid);       // urn:uuid:...
const itarId = formatForITAR(uuid);      // ITAR-UUID:...

// All formats
const formats = getAllStandardFormats(uuid);
```

### UUID Display Helpers

```tsx
import {
  truncateUUID,
  getEntityDisplayText,
  copyUUIDToClipboard
} from '../utils/uuidUtils';

// Display truncation
const short = truncateUUID(uuid, 8); // "123e4567...174000"

// Entity display text
const displayText = getEntityDisplayText('WorkOrder', uuid, 'WO-001');

// Copy to clipboard
await copyUUIDToClipboard(uuid, 'step'); // Copy in STEP format
```

### Search Utilities

```tsx
import {
  isLikelyUUIDQuery,
  reconstructUUID,
  createUUIDSearchQuery
} from '../utils/uuidUtils';

// Detect UUID-like queries
if (isLikelyUUIDQuery(searchInput)) {
  // Handle as potential UUID
}

// Reconstruct from partial input
const fullUuid = reconstructUUID('123e4567e89b12d3a456426614174000');

// Create search-friendly query
const searchQuery = createUUIDSearchQuery(uuid); // Removes dashes
```

## Implementation Examples

### Entity Detail Page

```tsx
import React from 'react';
import { Card, Descriptions } from 'antd';
import UUIDDisplay from '../components/Common/UUIDDisplay';
import { isValidUUID } from '../utils/uuidUtils';

const WorkOrderDetail: React.FC<{ workOrder: WorkOrder }> = ({ workOrder }) => {
  return (
    <div>
      {/* Header with UUID */}
      <div style={{ marginBottom: 24 }}>
        <h2>Work Order {workOrder.workOrderNumber}</h2>
        {workOrder.persistentUuid && isValidUUID(workOrder.persistentUuid) && (
          <UUIDDisplay
            uuid={workOrder.persistentUuid}
            entityType="WorkOrder"
            variant="inline"
            showStandardFormats={true}
          />
        )}
      </div>

      {/* Details card with UUID field */}
      <Card title="Work Order Information">
        <Descriptions column={2}>
          <Descriptions.Item label="Work Order #">
            {workOrder.workOrderNumber}
          </Descriptions.Item>
          {workOrder.persistentUuid && isValidUUID(workOrder.persistentUuid) && (
            <Descriptions.Item label="Persistent UUID" span={2}>
              <UUIDDisplay
                uuid={workOrder.persistentUuid}
                entityType="WorkOrder"
                variant="block"
                showStandardFormats={true}
                options={{ truncate: false }}
              />
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
};
```

### Table with UUID Column

```tsx
import React from 'react';
import { Table, Button } from 'antd';
import UUIDDisplay from '../components/Common/UUIDDisplay';
import { isValidUUID } from '../utils/uuidUtils';

const WorkOrderTable: React.FC<{ data: WorkOrder[] }> = ({ data }) => {
  const columns = [
    {
      title: 'Work Order #',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'UUID',
      key: 'persistentUuid',
      width: 200,
      render: (_, record: WorkOrder) => {
        if (record.persistentUuid && isValidUUID(record.persistentUuid)) {
          return (
            <UUIDDisplay
              uuid={record.persistentUuid}
              entityType="WorkOrder"
              variant="badge"
              options={{ truncate: true, truncateLength: 6 }}
            />
          );
        }
        return '-';
      },
    },
    // ... other columns
  ];

  return <Table dataSource={data} columns={columns} />;
};
```

### Form with UUID Field

```tsx
import React from 'react';
import { Form, Input, Space } from 'antd';
import UUIDDisplay from '../components/Common/UUIDDisplay';
import { isValidUUID, validateIdFormat } from '../utils/uuidUtils';

const EntityForm: React.FC = () => {
  const [form] = Form.useForm();

  const validateUUID = (rule: any, value: string) => {
    if (!value) return Promise.resolve();

    const validation = validateIdFormat(value);
    if (!validation.isValid || validation.format !== 'uuid-v4') {
      return Promise.reject('Must be a valid UUID v4 format');
    }
    return Promise.resolve();
  };

  return (
    <Form form={form}>
      <Form.Item
        label="Persistent UUID"
        name="persistentUuid"
        rules={[{ validator: validateUUID }]}
      >
        <Input placeholder="Enter UUID v4..." />
      </Form.Item>

      <Form.Item label="Preview">
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const uuid = getFieldValue('persistentUuid');
            return uuid && isValidUUID(uuid) ? (
              <UUIDDisplay
                uuid={uuid}
                variant="block"
                showStandardFormats={true}
              />
            ) : (
              <span style={{ color: '#999' }}>Enter a valid UUID to see preview</span>
            );
          }}
        </Form.Item>
      </Form.Item>
    </Form>
  );
};
```

## Error Handling

### UUID Validation Errors

```tsx
import { UUIDValidationError, UUIDNotFoundError } from '../utils/uuidUtils';

try {
  const normalized = normalizeUUID(inputUuid);
} catch (error) {
  if (error instanceof UUIDValidationError) {
    console.error('Invalid UUID:', error.uuid);
    message.error('Please enter a valid UUID format');
  }
}

try {
  const entity = await fetchEntityByUuid(uuid);
} catch (error) {
  if (error instanceof UUIDNotFoundError) {
    console.error('Entity not found:', error.uuid, error.entityType);
    message.error(`${error.entityType} with UUID ${error.uuid} not found`);
  }
}
```

### Component Error Boundaries

```tsx
import React from 'react';
import { Alert } from 'antd';
import UUIDDisplay from '../components/Common/UUIDDisplay';

const SafeUUIDDisplay: React.FC<{ uuid?: string }> = ({ uuid }) => {
  if (!uuid) {
    return <span style={{ color: '#999' }}>No UUID available</span>;
  }

  try {
    return <UUIDDisplay uuid={uuid} />;
  } catch (error) {
    return (
      <Alert
        message="UUID Display Error"
        description="Invalid UUID format"
        type="error"
        size="small"
      />
    );
  }
};
```

## Best Practices

### 1. Always Validate UUIDs

```tsx
// ✅ Good
if (entity.persistentUuid && isValidUUID(entity.persistentUuid)) {
  return <UUIDDisplay uuid={entity.persistentUuid} />;
}

// ❌ Bad
return <UUIDDisplay uuid={entity.persistentUuid} />;
```

### 2. Use Appropriate Variants

```tsx
// ✅ Header display
<UUIDDisplay uuid={uuid} variant="inline" options={{ truncate: true }} />

// ✅ Form field display
<UUIDDisplay uuid={uuid} variant="block" options={{ truncate: false }} />

// ✅ Table cell display
<UUIDDisplay uuid={uuid} variant="badge" options={{ truncate: true, truncateLength: 6 }} />
```

### 3. Provide Entity Context

```tsx
// ✅ Good - provides context in tooltip
<UUIDDisplay uuid={uuid} entityType="WorkOrder" />

// ✅ Better - provides display name
<UUIDDisplay uuid={uuid} entityType="WorkOrder" displayName="WO-001002" />
```

### 4. Handle Optional UUIDs

```tsx
// ✅ Good - graceful handling of missing UUIDs
{entity.persistentUuid && isValidUUID(entity.persistentUuid) ? (
  <UUIDDisplay uuid={entity.persistentUuid} />
) : (
  <span style={{ color: '#999' }}>Legacy entity (no UUID)</span>
)}
```

### 5. Use Standard Formats Appropriately

```tsx
// ✅ Good - enable for external integration contexts
<UUIDDisplay
  uuid={uuid}
  showStandardFormats={true}  // Enable for export/integration features
/>

// ✅ Good - disable for internal displays
<UUIDDisplay
  uuid={uuid}
  showStandardFormats={false} // Keep simple for internal tables
/>
```

## Testing

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import UUIDDisplay from '../UUIDDisplay';

test('displays UUID with copy functionality', async () => {
  const testUuid = '123e4567-e89b-12d3-a456-426614174000';

  render(<UUIDDisplay uuid={testUuid} />);

  // Check display
  expect(screen.getByText(/123e4567...174000/)).toBeInTheDocument();

  // Test copy functionality
  const copyButton = screen.getByRole('button', { name: /copy/ });
  fireEvent.click(copyButton);

  // Verify clipboard interaction (with mocked clipboard)
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testUuid.toLowerCase());
});
```

### Utility Testing

```tsx
import { isValidUUID, validateIdFormat, truncateUUID } from '../uuidUtils';

test('UUID validation works correctly', () => {
  expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  expect(isValidUUID('invalid-uuid')).toBe(false);

  const validation = validateIdFormat('123e4567-e89b-12d3-a456-426614174000');
  expect(validation.isValid).toBe(true);
  expect(validation.format).toBe('uuid-v4');
});

test('UUID truncation works correctly', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  expect(truncateUUID(uuid, 4)).toBe('123e...4000');
});
```

## Migration Guide

### Updating Existing Components

1. **Add UUID imports**
```tsx
import UUIDDisplay from '../components/Common/UUIDDisplay';
import { isValidUUID } from '../utils/uuidUtils';
```

2. **Update entity interfaces**
```tsx
interface YourEntity {
  id: string;
  persistentUuid?: string; // Add this field
  // ... existing fields
}
```

3. **Add UUID display to headers**
```tsx
// Before
<h2>{entity.name}</h2>

// After
<div>
  <h2>{entity.name}</h2>
  {entity.persistentUuid && isValidUUID(entity.persistentUuid) && (
    <UUIDDisplay uuid={entity.persistentUuid} entityType="YourEntity" />
  )}
</div>
```

4. **Add UUID to detail sections**
```tsx
// Add to Descriptions
{entity.persistentUuid && isValidUUID(entity.persistentUuid) && (
  <Descriptions.Item label="Persistent UUID" span={2}>
    <UUIDDisplay
      uuid={entity.persistentUuid}
      variant="block"
      showStandardFormats={true}
    />
  </Descriptions.Item>
)}
```

### API Integration

Ensure your API responses include the `persistentUuid` field:

```tsx
interface APIResponse {
  id: string;
  persistentUuid?: string; // Backend provides this
  // ... other fields
}
```

## Troubleshooting

### Common Issues

**1. UUID not displaying**
- Verify `persistentUuid` field exists in entity data
- Check UUID validation with `isValidUUID()`
- Ensure component has valid UUID prop

**2. Copy functionality not working**
- Check browser clipboard permissions
- Verify HTTPS context (clipboard API requires secure context)
- Test with mocked clipboard in development

**3. Tooltip not showing**
- Verify `showTooltip` option is enabled
- Check for CSS conflicts with tooltip positioning
- Ensure sufficient hover area for trigger

**4. Search not detecting UUIDs**
- Verify UUID format is valid v4
- Check for extra whitespace or characters
- Use `isLikelyUUIDQuery()` to debug detection

### Performance Considerations

- UUID validation is fast but cache results for repeated checks
- Use `truncate: true` for large tables to improve rendering
- Debounce search queries when typing UUIDs
- Consider virtualization for tables with many UUID columns

## Resources

- [NIST AMS 300-12 Standard](https://www.nist.gov/publications/ams-300-12)
- [RFC 4122 UUID Specification](https://tools.ietf.org/html/rfc4122)
- [Backend UUID Implementation Guide](../../docs/uuid-strategy-guide.md)
- [API Documentation](../api/uuid-endpoints.md)

---

For questions or issues with UUID integration, contact the development team or create an issue in the project repository.