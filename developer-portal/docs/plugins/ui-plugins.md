---
sidebar_position: 4
title: UI Plugins
---

# Building UI Plugins

Create custom React components for MES UI.

## Example Plugin

```typescript
// src/index.tsx
import React, { useState, useEffect } from 'react';
import { useMES } from '@mes/hooks';

export default function MyDashboard() {
  const { api } = useMES();
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    api.get('/work-orders').then(res => {
      setWorkOrders(res.data.data);
    });
  }, [api]);

  return (
    <div>
      <h1>Work Orders ({workOrders.length})</h1>
      {workOrders.map(wo => (
        <div key={wo.id}>{wo.orderNumber}</div>
      ))}
    </div>
  );
}
```

## Styling

Use Tailwind CSS (pre-installed):

```typescript
export default function Button() {
  return (
    <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded">
      Click Me
    </button>
  );
}
```

## Available Hooks

- `useMES()` - API access and context
- `useAuth()` - Current user info
- `useRouter()` - Navigate between routes

---

[Back to Plugins](./overview.md)
