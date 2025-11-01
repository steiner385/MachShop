---
sidebar_position: 1
title: Webhooks Overview
description: Receive real-time notifications about MES events
---

# Webhooks Overview

Webhooks allow your application to receive real-time notifications when events occur in MES. Instead of polling the API repeatedly, MES can push events to your server immediately.

## What Are Webhooks?

A webhook is an HTTP callback that MES calls when something happens. For example:

1. A work order is created
2. MES sends an HTTP POST to your webhook URL
3. Your server receives the event and takes action
4. MES verifies receipt (expects 200 OK response)

## When to Use Webhooks

### ✅ Use Webhooks For

- Real-time notifications
- Triggering downstream processes
- Keeping external systems in sync
- Building reactive applications
- Monitoring manufacturing progress

### ❌ Don't Use Webhooks For

- One-time queries (use REST API instead)
- Retrieving large amounts of historical data
- Batch processing (use bulk API endpoints)

## Event Types

MES sends webhooks for key manufacturing events:

| Event | When | Payload |
|-------|------|---------|
| `work_order.created` | New work order | Work order details |
| `work_order.started` | Production begins | Work order ID, start time |
| `work_order.completed` | Production done | Work order, completed quantity |
| `work_order.updated` | Any field changed | Work order details, what changed |
| `operation.started` | Operation begins | Operation ID, work order ID |
| `operation.completed` | Operation finished | Operation details, duration |
| `quality.inspection_complete` | QA check done | Inspection result, passed/failed |
| `quality.ncr_created` | Issue reported | NCR details, severity |
| `inventory.material_allocated` | Material reserved | Material ID, quantity, location |
| `inventory.material_consumed` | Material used | Material ID, quantity |

[See full event catalog →](./events.md)

## Quick Start

### 1. Create Webhook Endpoint

Create an HTTP endpoint that accepts POST requests:

```typescript
// Using Express.js
app.post('/webhooks/mes', (req, res) => {
  const event = req.body;
  console.log(`Received event: ${event.type}`);

  // Process the event
  handleEvent(event);

  // Acknowledge receipt
  res.status(200).json({ ok: true });
});
```

### 2. Register Webhook URL

Register your endpoint in the MES dashboard:

```bash
curl -X POST "https://api.mes.company.com/api/v2/webhooks/endpoints" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourapp.com/webhooks/mes",
    "events": ["work_order.created", "work_order.completed"],
    "active": true
  }'
```

### 3. Receive Events

MES will POST events to your webhook:

```json
{
  "id": "evt-123",
  "type": "work_order.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "workOrder": {
      "id": "wo-123",
      "orderNumber": "WO-2024-001",
      "product": "Widget A",
      "quantity": 100
    }
  }
}
```

### 4. Verify Signature

Verify the webhook came from MES:

```typescript
import crypto from 'crypto';

const verifySignature = (payload, signature, secret) => {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
};

app.post('/webhooks/mes', (req, res) => {
  const signature = req.headers['x-mes-signature'];

  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Safe to process
  res.status(200).json({ ok: true });
});
```

## Webhook Payload

Every webhook includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event ID |
| `type` | string | Event type (e.g., `work_order.created`) |
| `timestamp` | string | ISO 8601 timestamp (UTC) |
| `data` | object | Event-specific data |
| `signature` | string | HMAC signature for verification |

Example:

```json
{
  "id": "evt-123abc456",
  "type": "work_order.completed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "workOrder": {
      "id": "wo-123",
      "orderNumber": "WO-2024-001",
      "status": "COMPLETED",
      "completedQuantity": 100,
      "completionDate": "2024-01-15T14:30:00Z"
    }
  }
}
```

## Retry Logic

If MES doesn't receive a 200 response, it retries the webhook:

- **Attempt 1**: Immediately
- **Attempt 2**: 5 seconds later
- **Attempt 3**: 30 seconds later
- **Attempt 4**: 5 minutes later
- **Attempt 5**: 30 minutes later

After 5 failures, the webhook is marked as failed but retries continue daily for 7 days.

## Best Practices

### ✅ Do

- Respond with 200 within 5 seconds
- Verify webhook signature before processing
- Implement idempotency (handle duplicate events)
- Process asynchronously (queue events)
- Log all webhook events
- Monitor webhook health
- Use appropriate HTTP status codes

### ❌ Don't

- Process synchronously (too slow)
- Ignore signature verification
- Assume events arrive in order
- Store secrets in plain text
- Retry indefinitely
- Block the HTTP response

## Testing Webhooks

### Test Webhook Sender

In the MES dashboard, click "Send Test Event" to manually trigger a webhook:

1. Go to **Webhooks > Endpoints**
2. Click your endpoint
3. Click **Send Test Event**
4. Select an event type
5. Review the payload sent to your endpoint

### Webhook Logs

View recent webhook deliveries:

1. Go to **Webhooks > Logs**
2. Filter by endpoint or event type
3. Click a log entry to see payload and response
4. View retry history

### Local Testing Tools

Test webhooks locally using tools like:

- [Webhook.cool](https://webhook.cool) - Free webhook testing
- [RequestBin](https://requestbin.com) - Temporary URL for testing
- [ngrok](https://ngrok.com) - Expose local server to internet
- [localtunnel](https://localtunnel.me) - Simple local tunneling

Example with ngrok:

```bash
# Start local server
npm run dev

# Expose to internet (in another terminal)
ngrok http 3000

# Use the ngrok URL as webhook endpoint
# https://your-ngrok-url.ngrok.io/webhooks/mes
```

## Common Patterns

### Asynchronous Processing

Queue events for processing:

```typescript
import Bull from 'bull';

const webhookQueue = new Bull('webhooks');

app.post('/webhooks/mes', (req, res) => {
  // Verify signature
  const signature = req.headers['x-mes-signature'];
  if (!verify(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid' });
  }

  // Queue event for processing
  webhookQueue.add(req.body);

  // Respond immediately
  res.status(200).json({ ok: true });
});

// Process events asynchronously
webhookQueue.process(async (job) => {
  const event = job.data;

  switch (event.type) {
    case 'work_order.created':
      await handleNewWorkOrder(event.data.workOrder);
      break;
    case 'work_order.completed':
      await handleCompletedWorkOrder(event.data.workOrder);
      break;
  }
});
```

### Idempotency

Handle duplicate events:

```typescript
app.post('/webhooks/mes', async (req, res) => {
  const eventId = req.body.id;

  // Check if we've already processed this event
  const exists = await db.events.findOne({ eventId });
  if (exists) {
    return res.status(200).json({ ok: true });
  }

  // Process new event
  try {
    await processEvent(req.body);
    await db.events.create({ eventId, processed: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### Webhook Not Firing

1. Check endpoint is active in dashboard
2. Verify URL is correct and accessible
3. Check firewall/security rules
4. Review webhook logs for errors

### Signature Verification Failing

1. Use raw request body (don't parse JSON first)
2. Verify secret matches dashboard
3. Use SHA256 algorithm
4. Check header name is `x-mes-signature`

### Webhook URL Returns Error

1. Check application logs
2. Verify endpoint exists and is accessible
3. Check request/response headers
4. Return 200 within 5 seconds

## Documentation

- [Webhook Events Catalog](./events.md) - All event types and payloads
- [Testing & Best Practices](./best-practices.md) - Implementation patterns
- [Webhook Management](./testing.md) - Dashboard and tools

---

**Need help?** [Email support](mailto:developers@mes.company.com) | [GitHub Discussions](https://github.com/steiner385/MachShop/discussions)
