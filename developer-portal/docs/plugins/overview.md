---
sidebar_position: 1
title: Plugins Overview
description: Extend MES with custom plugins
---

# Plugins Overview

MES supports plugins to extend functionality with custom UI components, workflows, and integrations.

## Plugin Types

### UI Plugins

Add custom dashboards, reports, and workflows to the MES interface.

```json
{
  "type": "ui",
  "manifest": "manifest.json",
  "entry": "dist/index.js"
}
```

### Workflow Hooks

Intercept and customize work order workflows.

```json
{
  "type": "workflow",
  "hooks": [
    "work_order.before_create",
    "work_order.after_start"
  ]
}
```

## Getting Started

1. [Create a plugin manifest](./plugin-manifest.md)
2. [Implement hooks or UI](./ui-plugins.md)
3. [Test your plugin](./testing.md)
4. [Publish and deploy](./overview.md)

## Example: Simple UI Plugin

```typescript
// src/index.tsx
import React from 'react';

export default function MyDashboard() {
  return (
    <div>
      <h1>My Custom Dashboard</h1>
      <p>Add your content here</p>
    </div>
  );
}
```

## Example: Workflow Hook

```typescript
// src/hooks.ts
export const workOrderBeforeCreate = async (context) => {
  // Validate or modify work order before creation
  if (context.data.quantity > 1000) {
    context.errors.push('Quantity exceeds maximum');
  }
  return context;
};
```

## Plugin Capabilities

- Read/write MES data via API
- Access user context
- Integrate with external systems
- Customize workflows
- Add UI components
- Store plugin-specific data

## Next Steps

- [Plugin Manifest Reference](./plugin-manifest.md)
- [Hooks Reference](./hooks-reference.md)
- [UI Plugin Guide](./ui-plugins.md)
- [Testing Guide](./testing.md)
