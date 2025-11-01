---
sidebar_position: 2
title: Plugin Manifest
description: Plugin manifest schema and configuration
---

# Plugin Manifest

Every plugin needs a `plugin.json` manifest file.

## Schema

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "title": "My Awesome Plugin",
  "description": "Does something awesome",
  "author": "Your Company",
  "license": "MIT",
  "icon": "icon.png",
  "type": "ui",
  "entry": "dist/index.js",
  "permissions": [
    "work_orders:read",
    "operations:read"
  ],
  "hooks": [
    "work_order.before_create",
    "operation.after_start"
  ],
  "ui": {
    "route": "/my-dashboard",
    "title": "My Dashboard",
    "icon": "dashboard"
  },
  "settings": [
    {
      "name": "api_url",
      "title": "External API URL",
      "type": "string"
    }
  ]
}
```

## Fields

- `name` - Unique plugin identifier (lowercase, no spaces)
- `version` - Semantic version
- `type` - `ui`, `workflow`, or `integration`
- `entry` - Path to compiled JavaScript
- `permissions` - Required API scopes
- `hooks` - Lifecycle hooks to implement
- `ui` - UI configuration
- `settings` - Plugin configuration options

---

[Back to Plugins](./overview.md)
