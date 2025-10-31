---
sidebar_position: 5
title: Best Practices
---

# Webhook Best Practices

## Security

- Always verify signatures before processing
- Use HTTPS for webhook URLs
- Don't log sensitive data
- Validate request format

## Reliability

- Implement idempotency (handle duplicate events)
- Use exponential backoff for retries
- Queue events for async processing
- Monitor webhook health

## Performance

- Respond within 5 seconds
- Process events asynchronously
- Use appropriate event types (don't listen to too many)
- Cache lookups when possible

See [Webhooks Overview](./overview.md) for code examples.
