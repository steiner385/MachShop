---
sidebar_position: 3
title: Receiving Events
---

# Receiving Webhook Events

See [Webhooks Overview](./overview.md) for detailed implementation guide.

Quick example:

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.post('/webhooks/mes', (req, res) => {
  // Verify signature
  const signature = req.headers['x-mes-signature'];
  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process event
  console.log(`Received: ${req.body.type}`);

  res.status(200).json({ ok: true });
});
```
