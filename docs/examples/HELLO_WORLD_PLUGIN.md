# Hello World Plugin Example

A simple example plugin that demonstrates basic plugin development.

## Overview

This plugin logs a message every time a work order is created or updated.

## Files

```
hello-world-plugin/
├── package.json
├── tsconfig.json
├── manifest.json
├── src/
│   └── index.ts
└── README.md
```

## manifest.json

```json
{
  "id": "hello-world",
  "name": "Hello World Plugin",
  "version": "1.0.0",
  "description": "A simple plugin that logs work order lifecycle events",
  "author": "Your Team",
  "license": "MIT",
  "apiVersion": "1.0.0",
  "hooks": {
    "workflow": [
      "workOrder.afterCreate",
      "workOrder.afterUpdate"
    ]
  }
}
```

## src/index.ts

```typescript
import PluginSDK, { HookContext } from '@machshop/plugin-sdk';

const plugin = new PluginSDK('hello-world', process.env.PLUGIN_API_KEY || '');

// Log when work order is created
plugin.registerHook('workOrder.afterCreate', async (context: HookContext) => {
  plugin.log('info', 'Hello! A work order was created', {
    workOrderId: context.data.id,
    partNumber: context.data.partNumber,
    quantity: context.data.quantity,
    createdBy: context.userId,
  });
});

// Log when work order is updated
plugin.registerHook('workOrder.afterUpdate', async (context: HookContext) => {
  plugin.log('info', 'Hello! A work order was updated', {
    workOrderId: context.data.id,
    status: context.data.status,
    changedBy: context.userId,
  });
});

// Load configuration on startup
async function initialize() {
  try {
    await plugin.loadConfiguration();
    plugin.log('info', 'Hello World Plugin initialized successfully');
  } catch (error) {
    plugin.log('error', 'Failed to initialize plugin', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

initialize();

export default plugin;
```

## package.json

```json
{
  "name": "@machshop/hello-world-plugin",
  "version": "1.0.0",
  "description": "Hello World Plugin for MachShop",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "dependencies": {
    "@machshop/plugin-sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Building and Deploying

### Build

```bash
npm install
npm run build
```

### Create Package

```bash
tar -czf hello-world-1.0.0.tar.gz \
  dist/ \
  manifest.json \
  package.json \
  README.md
```

### Upload

1. Navigate to Admin > Plugin Management
2. Click "Install Plugin"
3. Enter manifest JSON
4. Enter package URL (or upload file)
5. Click "Install"
6. Click "Approve" to approve the plugin
7. Click "Activate" to start using it

### View Logs

Check system logs to see plugin messages:

```
[2024-01-01T12:00:00.000Z] [hello-world] [INFO] Hello World Plugin initialized successfully
[2024-01-01T12:05:00.000Z] [hello-world] [INFO] Hello! A work order was created {
  "workOrderId": "WO-123",
  "partNumber": "PN-456",
  "quantity": 100,
  "createdBy": "user@company.com"
}
```

## Next Steps

- Add configuration to customize logging
- Add webhooks to send notifications
- Register for more hook points
- Add database migrations
