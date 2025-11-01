# Quality Validator Plugin Example

An advanced example plugin that demonstrates configuration, API calls, webhooks, and error handling.

## Overview

This plugin validates work order quality metrics before creation and sends alerts if thresholds are exceeded.

## Features

- Configurable quality thresholds
- Pre-creation validation
- External system integration
- Webhook notifications
- Comprehensive logging
- Error handling

## manifest.json

```json
{
  "id": "quality-validator",
  "name": "Quality Validator Plugin",
  "version": "1.0.0",
  "description": "Validates work order quality metrics and sends alerts",
  "author": "Your Team",
  "license": "MIT",
  "apiVersion": "1.0.0",
  "permissions": [
    "workOrders:read",
    "workOrders:write",
    "quality:read",
    "notifications:send"
  ],
  "hooks": {
    "workflow": [
      "workOrder.beforeCreate",
      "workOrder.beforeUpdate"
    ]
  },
  "configuration": {
    "minQualityThreshold": {
      "type": "number",
      "required": true,
      "default": 85,
      "description": "Minimum acceptable quality percentage"
    },
    "maxQualityThreshold": {
      "type": "number",
      "required": true,
      "default": 100,
      "description": "Maximum acceptable quality percentage"
    },
    "externalValidationEnabled": {
      "type": "boolean",
      "required": false,
      "default": false,
      "description": "Enable external quality system validation"
    },
    "externalValidationUrl": {
      "type": "string",
      "required": false,
      "description": "External quality system API endpoint"
    },
    "alertRecipients": {
      "type": "string",
      "required": false,
      "description": "Comma-separated list of email addresses for alerts"
    },
    "logLevel": {
      "type": "string",
      "required": false,
      "default": "info",
      "description": "Logging level (info, warn, error)"
    }
  }
}
```

## src/index.ts

```typescript
import PluginSDK, { HookContext } from '@machshop/plugin-sdk';

const plugin = new PluginSDK('quality-validator', process.env.PLUGIN_API_KEY || '');

// Configuration cache
let config: {
  minQualityThreshold: number;
  maxQualityThreshold: number;
  externalValidationEnabled: boolean;
  externalValidationUrl?: string;
  alertRecipients?: string;
  logLevel: string;
} | null = null;

// Load configuration
async function loadConfig(): Promise<void> {
  try {
    await plugin.loadConfiguration();

    config = {
      minQualityThreshold: (await plugin.getConfig('minQualityThreshold')) || 85,
      maxQualityThreshold: (await plugin.getConfig('maxQualityThreshold')) || 100,
      externalValidationEnabled:
        (await plugin.getConfig('externalValidationEnabled')) || false,
      externalValidationUrl: await plugin.getConfig('externalValidationUrl'),
      alertRecipients: await plugin.getConfig('alertRecipients'),
      logLevel: (await plugin.getConfig('logLevel')) || 'info',
    };

    plugin.log('info', 'Quality Validator configuration loaded', config);
  } catch (error) {
    plugin.log('error', 'Failed to load configuration', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Validate quality metrics
async function validateQuality(
  qualityScore: number,
  context: HookContext
): Promise<{ isValid: boolean; reason?: string }> {
  if (!config) {
    throw new Error('Configuration not loaded');
  }

  // Check threshold
  if (
    qualityScore < config.minQualityThreshold ||
    qualityScore > config.maxQualityThreshold
  ) {
    return {
      isValid: false,
      reason: `Quality score ${qualityScore}% outside acceptable range [${config.minQualityThreshold}, ${config.maxQualityThreshold}]`,
    };
  }

  // External validation if enabled
  if (config.externalValidationEnabled && config.externalValidationUrl) {
    try {
      const result = await context.api('POST', config.externalValidationUrl, {
        workOrderId: context.data.id,
        qualityScore,
        partNumber: context.data.partNumber,
      });

      if (!result.isValid) {
        return {
          isValid: false,
          reason: result.reason || 'External validation failed',
        };
      }
    } catch (error) {
      plugin.log('warn', 'External validation failed, continuing with local validation', {
        workOrderId: context.data.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with local validation only
    }
  }

  return { isValid: true };
}

// Send alert notification
async function sendAlert(
  context: HookContext,
  reason: string
): Promise<void> {
  if (!config || !config.alertRecipients) {
    plugin.log('warn', 'Alert not sent - no recipients configured');
    return;
  }

  try {
    const recipients = config.alertRecipients
      .split(',')
      .map((r) => r.trim());

    await context.api('POST', '/notifications/send', {
      type: 'QUALITY_ALERT',
      recipients,
      subject: `Quality Alert: Work Order ${context.data.id}`,
      message: reason,
      priority: 'high',
      metadata: {
        workOrderId: context.data.id,
        partNumber: context.data.partNumber,
        userId: context.userId,
        timestamp: new Date().toISOString(),
      },
    });

    plugin.log('info', 'Quality alert sent', {
      workOrderId: context.data.id,
      recipients,
      reason,
    });
  } catch (error) {
    plugin.log('error', 'Failed to send alert', {
      workOrderId: context.data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Hook: Validate before work order creation
plugin.registerHook(
  'workOrder.beforeCreate',
  async (context: HookContext) => {
    if (!config) {
      await loadConfig();
    }

    try {
      plugin.log('info', 'Validating work order before creation', {
        workOrderId: context.data.id,
        partNumber: context.data.partNumber,
      });

      // Check if quality score exists
      if (context.data.qualityThreshold === undefined) {
        throw new Error('Quality threshold is required');
      }

      // Validate quality
      const validation = await validateQuality(
        context.data.qualityThreshold,
        context
      );

      if (!validation.isValid) {
        plugin.log('warn', 'Quality validation failed', {
          workOrderId: context.data.id,
          reason: validation.reason,
        });

        // Send alert
        await sendAlert(context, validation.reason || 'Quality validation failed');

        // Reject creation
        throw new Error(`Quality validation failed: ${validation.reason}`);
      }

      // Add validation metadata
      context.data.qualityValidated = true;
      context.data.qualityValidatedAt = new Date().toISOString();
      context.data.qualityValidator = 'quality-validator-1.0.0';

      plugin.log('info', 'Work order passed quality validation', {
        workOrderId: context.data.id,
        qualityScore: context.data.qualityThreshold,
      });

      return context;
    } catch (error) {
      plugin.log('error', 'Quality validation error', {
        workOrderId: context.data.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Always rethrow for beforeCreate hooks
      throw error;
    }
  },
  { priority: 20 } // Run early in validation chain
);

// Hook: Validate before work order update
plugin.registerHook(
  'workOrder.beforeUpdate',
  async (context: HookContext) => {
    if (!config) {
      await loadConfig();
    }

    // Only validate if quality threshold is being changed
    if (context.data.qualityThreshold === undefined) {
      return context;
    }

    try {
      plugin.log('info', 'Validating work order update', {
        workOrderId: context.data.id,
        newQualityScore: context.data.qualityThreshold,
      });

      const validation = await validateQuality(
        context.data.qualityThreshold,
        context
      );

      if (!validation.isValid) {
        plugin.log('warn', 'Quality validation failed on update', {
          workOrderId: context.data.id,
          reason: validation.reason,
        });

        throw new Error(`Quality validation failed: ${validation.reason}`);
      }

      context.data.qualityLastValidatedAt = new Date().toISOString();

      plugin.log('info', 'Work order update passed quality validation', {
        workOrderId: context.data.id,
      });

      return context;
    } catch (error) {
      plugin.log('error', 'Quality validation error on update', {
        workOrderId: context.data.id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
  { priority: 20 }
);

// Initialize plugin
async function initialize() {
  try {
    await loadConfig();
    plugin.log('info', 'Quality Validator Plugin initialized successfully');
  } catch (error) {
    plugin.log('error', 'Failed to initialize Quality Validator Plugin', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

// Auto-initialize
initialize().catch((error) => {
  console.error('Plugin initialization failed:', error);
  process.exit(1);
});

export default plugin;
```

## Configuration Example

When installing the plugin, configure with these values:

```json
{
  "minQualityThreshold": 85,
  "maxQualityThreshold": 100,
  "externalValidationEnabled": true,
  "externalValidationUrl": "https://quality-system.company.com/api/validate",
  "alertRecipients": "supervisor@company.com,manager@company.com",
  "logLevel": "info"
}
```

## Usage

### Successful Work Order Creation

```
Work Order Created:
{
  "id": "WO-123",
  "partNumber": "PN-456",
  "qualityThreshold": 92,  // Between 85 and 100
  "quantity": 100
}

Logs:
[2024-01-01T12:00:00.000Z] [quality-validator] [INFO] Validating work order before creation
[2024-01-01T12:00:00.100Z] [quality-validator] [INFO] Work order passed quality validation
```

### Failed Work Order Creation

```
Work Order Attempted:
{
  "id": "WO-124",
  "partNumber": "PN-456",
  "qualityThreshold": 75,  // Below 85 minimum
  "quantity": 50
}

Result: Creation rejected with error

Logs:
[2024-01-01T12:01:00.000Z] [quality-validator] [INFO] Validating work order before creation
[2024-01-01T12:01:00.100Z] [quality-validator] [WARN] Quality validation failed
[2024-01-01T12:01:00.200Z] [quality-validator] [INFO] Quality alert sent
```

## Testing

### Unit Test

```typescript
describe('Quality Validator Plugin', () => {
  it('should reject work orders below threshold', async () => {
    const context = {
      data: {
        id: 'WO-123',
        partNumber: 'PN-456',
        qualityThreshold: 75, // Below minimum of 85
      },
    };

    try {
      await handler(context);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('Quality validation failed');
    }
  });
});
```

### Manual Testing

1. Install and activate plugin
2. Configure thresholds in admin dashboard
3. Create work order with quality threshold = 92
4. Verify success in logs
5. Create work order with quality threshold = 75
6. Verify rejection and alert notification

## Next Steps

- Add database migrations to track quality history
- Integrate with SPC (Statistical Process Control) system
- Add webhook for quality alerts
- Add trend analysis and predictive alerts
