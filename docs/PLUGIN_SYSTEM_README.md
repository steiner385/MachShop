# MachShop Plugin System Documentation

**Complete guide to developing, deploying, and managing plugins for the MachShop Manufacturing Execution System.**

## What are Plugins?

Plugins extend MachShop's functionality without modifying core code. They integrate via:
- **Hooks**: Intercept and modify operations at specific points
- **Event Bus**: Real-time event distribution
- **Webhooks**: Receive notifications from the system
- **Configuration**: Flexible runtime settings
- **Storage**: Key-value data persistence

## Quick Start

### 1. Create a Plugin

```bash
mkdir my-plugin
cd my-plugin
npm init -y
npm install @machshop/plugin-sdk
```

### 2. Define Manifest

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "apiVersion": "1.0.0",
  "hooks": {
    "workflow": ["workOrder.beforeCreate"]
  }
}
```

### 3. Implement Logic

```typescript
import PluginSDK from '@machshop/plugin-sdk';

const plugin = new PluginSDK('my-plugin', process.env.API_KEY);

plugin.registerHook('workOrder.beforeCreate', async (context) => {
  console.log('Creating work order:', context.data);
  // Add custom logic
});

export default plugin;
```

### 4. Deploy

1. Build: `npm run build`
2. Package: `tar -czf my-plugin-1.0.0.tar.gz dist/ manifest.json`
3. Install via Admin Dashboard
4. Activate plugin

## Documentation

### Getting Started
- **[Plugin Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)** - Complete guide to plugin development
  - Creating your first plugin
  - Manifest specification
  - Configuration management
  - Event bus integration
  - Testing and deployment

### Reference Documentation
- **[Plugin API Reference](./PLUGIN_API_REFERENCE.md)** - Detailed SDK API documentation
  - PluginSDK class
  - HookContext interface
  - Configuration methods
  - API client methods
  - Storage and logging

- **[Hook Points Reference](./HOOK_POINTS.md)** - All available hook points
  - Workflow hooks
  - Data transformation hooks
  - Integration hooks
  - Notification hooks
  - Execution order and patterns

### Example Plugins
- **[Hello World Plugin](./examples/HELLO_WORLD_PLUGIN.md)** - Simple example
  - Basic hook registration
  - Logging
  - Configuration loading

- **[Quality Validator Plugin](./examples/QUALITY_VALIDATOR_PLUGIN.md)** - Advanced example
  - Configuration management
  - API integration
  - Alert notifications
  - Error handling

## Core Concepts

### Hooks

Hooks allow plugins to intercept operations at specific points in the system.

```typescript
plugin.registerHook('workOrder.beforeCreate', async (context) => {
  // Validate, enrich, or reject
});
```

**Hook Types:**
- **Workflow**: Business logic hooks during entity lifecycle
- **Data**: Data transformation and validation
- **Integration**: External system synchronization
- **Notification**: Alerts and notifications
- **UI**: Frontend customization

### Event Bus

Real-time event distribution using Redis pub/sub.

```typescript
// Subscribe to events via webhook
// Register webhook through admin dashboard

// Or trigger custom events
await context.api('POST', '/admin/plugins/events', {
  eventType: 'custom.event',
  eventData: { ... }
});
```

### Configuration

Store and access runtime configuration.

```json
{
  "configuration": {
    "apiUrl": {
      "type": "string",
      "required": true,
      "description": "External API endpoint"
    }
  }
}
```

```typescript
const apiUrl = context.config.apiUrl;
```

### Storage

Plugin-specific key-value storage.

```typescript
// Get value
const value = await plugin.getStorage('key');

// Set value
await plugin.setStorage('key', 'value');
```

## Plugin Lifecycle

```
┌─────────────┐
│  CREATED    │ Plugin uploaded to system
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ PENDING_APPROVAL │ Awaiting admin approval
└────────┬─────────┘
         │
    [Approve]
         │
         ▼
┌────────────┐
│ INSTALLED  │ Ready to activate
└────────┬───┘
         │
    [Activate]
         │
         ▼
┌─────────┐
│ ACTIVE  │ Running and processing hooks
└────┬────┘
     │
 [Deactivate]
     │
     ▼
┌──────────┐
│ DISABLED │ Temporarily stopped
└────┬─────┘
     │
 [Uninstall]
     │
     ▼
┌────────────┐
│ UNINSTALLED│ Removed from system
└────────────┘
```

## Admin Dashboard

### Plugin Management

Navigate to **Admin > Plugin Management** to:
- View all installed plugins
- Filter by status or active state
- Install new plugins
- Manage plugin lifecycle (approve, activate, deactivate, uninstall)
- Configure plugin settings
- Monitor execution history

### Event Bus Dashboard

Navigate to **Admin > Event Bus & Webhooks** to:
- Monitor real-time metrics
- View webhook delivery status
- Track event channel subscriptions
- Check queue length and backlog
- View success rates and failure counts

## REST API

### Plugin Management

```bash
# List plugins
GET /api/v1/admin/plugins

# Get plugin details
GET /api/v1/admin/plugins/{id}

# Install plugin
POST /api/v1/admin/plugins/install

# Approve plugin
POST /api/v1/admin/plugins/{id}/approve

# Activate plugin
POST /api/v1/admin/plugins/{id}/activate

# Deactivate plugin
POST /api/v1/admin/plugins/{id}/deactivate

# Uninstall plugin
DELETE /api/v1/admin/plugins/{id}
```

### Configuration

```bash
# Get configuration
GET /api/v1/admin/plugins/{id}/config

# Update configuration
PUT /api/v1/admin/plugins/{id}/config
```

### Webhooks

```bash
# List webhooks
GET /api/v1/admin/plugins/{id}/webhooks

# Register webhook
POST /api/v1/admin/plugins/{id}/webhooks

# Delete webhook
DELETE /api/v1/admin/plugins/{id}/webhooks/{webhookId}

# Test webhook
POST /api/v1/admin/plugins/{id}/webhooks/{webhookId}/test

# Retry failed delivery
POST /api/v1/admin/plugins/{id}/webhooks/{webhookId}/retry
```

### Monitoring

```bash
# Get execution history
GET /api/v1/admin/plugins/{id}/executions

# Get plugin statistics
GET /api/v1/admin/plugins/{id}/stats

# Get event bus statistics
GET /api/v1/admin/plugins/events/stats
```

## Best Practices

### Development

1. **Error Handling**: Always handle errors gracefully
2. **Logging**: Use appropriate log levels
3. **Configuration**: Make plugins configurable
4. **Testing**: Write unit and integration tests
5. **Performance**: Optimize hook execution
6. **Security**: Never log sensitive data

### Deployment

1. **Versioning**: Follow semantic versioning
2. **Documentation**: Document your plugin
3. **Testing**: Test before deployment
4. **Monitoring**: Monitor plugin health
5. **Updates**: Version updates for backward compatibility

### Maintenance

1. **Logs**: Monitor plugin logs regularly
2. **Metrics**: Check webhook delivery success rates
3. **Performance**: Monitor hook execution times
4. **Errors**: Address errors promptly
5. **Updates**: Keep plugin dependencies updated

## Common Patterns

### Validation Pattern

```typescript
plugin.registerHook('entity.beforeCreate', async (context) => {
  // Validate input
  if (!context.data.requiredField) {
    throw new Error('Required field missing');
  }
});
```

### Enrichment Pattern

```typescript
plugin.registerHook('entity.validate', async (context) => {
  // Add computed fields
  context.data.computed = await calculateValue(context.data);
  return context;
});
```

### External Integration Pattern

```typescript
plugin.registerHook('external.sync', async (context) => {
  // Call external API
  const result = await context.api('POST', '/external/api', context.data);
  context.data.externalId = result.id;
});
```

### Notification Pattern

```typescript
plugin.registerHook('entity.afterCreate', async (context) => {
  // Send notification
  await context.api('POST', '/notifications/send', {
    message: `Entity created: ${context.data.id}`,
    recipients: ['admin@company.com'],
  });
});
```

## Troubleshooting

### Plugin Not Executing

1. Check plugin is in **ACTIVE** status
2. Verify hook point is correct
3. Check logs for errors
4. Verify configuration is complete

### Hook Not Triggering

1. Verify hook point name matches exactly
2. Check plugin is active
3. Review hook registration code
4. Check for errors in logs

### Configuration Not Loading

1. Verify configuration fields in manifest
2. Check admin dashboard configuration
3. Restart plugin
4. Check logs for load errors

### API Calls Failing

1. Verify API endpoint path is correct
2. Check authentication token is valid
3. Review API response in logs
4. Check network connectivity

## Advanced Topics

### Custom Event Publishing

Plugins can publish custom events for inter-plugin communication:

```typescript
await context.api('POST', '/admin/plugins/events', {
  eventType: 'customEvent',
  eventData: { ... }
});
```

### Webhook Integration

Receive real-time notifications via webhooks:

```bash
curl -X POST /api/v1/admin/plugins/{id}/webhooks \
  -d '{
    "eventType": "workOrder.completed",
    "webhookUrl": "https://your-endpoint.com/webhook",
    "secret": "webhook-secret"
  }'
```

### Database Operations

Plugins can perform database operations through the API:

```typescript
const records = await context.api('GET', '/workOrders?limit=100');
```

### Storage for State

Maintain plugin state across invocations:

```typescript
const lastProcessedId = await plugin.getStorage('lastId');
await plugin.setStorage('lastId', currentId);
```

## Support & Resources

- **GitHub Issues**: [Report bugs](https://github.com/steiner385/MachShop/issues)
- **Documentation**: [Full documentation](https://docs.machshop.io)
- **Community**: Slack #plugin-developers channel
- **Examples**: See `examples/` directory

## Version Compatibility

- **Plugin SDK**: ^1.0.0
- **MachShop**: ^1.0.0
- **Node.js**: 16+
- **TypeScript**: 4.5+

## License

All plugins must include a license. Recommended licenses:
- MIT
- Apache 2.0
- GPL 3.0

## Next Steps

1. **[Read the Development Guide](./PLUGIN_DEVELOPMENT_GUIDE.md)** to get started
2. **[Review API Reference](./PLUGIN_API_REFERENCE.md)** for detailed documentation
3. **[Explore Examples](./examples/)** to learn by example
4. **[Check Hook Points](./HOOK_POINTS.md)** for all available integration points

---

**Last Updated**: January 2024
**Plugin SDK Version**: 1.0.0
**MachShop Version**: Compatible with 1.0+
