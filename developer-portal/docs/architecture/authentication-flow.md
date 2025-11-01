---
sidebar_position: 3
title: Authentication Flow
---

# Authentication & Authorization

## OAuth 2.0 Flow

1. User clicks "Connect with MES"
2. Redirected to MES login
3. User authenticates
4. User grants permissions
5. Redirected back with code
6. Backend exchanges code for token

## API Key Flow

Simple for server-to-server:

```
Client → Authorization Header → API
Authorization: Bearer sk-...
```

See [Authentication Guide](../getting-started/authentication.md).
