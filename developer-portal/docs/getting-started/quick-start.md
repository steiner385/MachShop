---
sidebar_position: 2
title: 5-Minute Quick Start
description: Get from zero to your first API call in 5 minutes
---

# 5-Minute Quick Start

Get up and running with the MES API in 5 minutes.

## Step 1: Create a Developer Account (1 minute)

1. Go to [developers.mes.company.com/signup](https://developers.mes.company.com/signup)
2. Sign up with email and password
3. Verify your email address
4. Accept the terms and conditions

## Step 2: Get Your API Key (1 minute)

1. Log in to your [developer dashboard](https://developers.mes.company.com/dashboard)
2. Navigate to **Settings > API Keys**
3. Click **Create New API Key**
4. Give it a name: "My First Integration"
5. Copy the key and save it somewhere safe (you won't see it again!)

```
sk-abc123def456ghi789jkl012mnopqrst
```

## Step 3: Make Your First API Call (2 minutes)

### Using cURL

```bash
curl -X GET https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer sk-abc123def456ghi789jkl012mnopqrst" \
  -H "Content-Type: application/json"
```

### Using JavaScript/Node.js

```typescript
const apiKey = 'sk-abc123def456ghi789jkl012mnopqrst';

const response = await fetch('https://api.mes.company.com/api/v2/work-orders', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

const workOrders = await response.json();
console.log(workOrders);
```

### Using Python

```python
import requests

api_key = 'sk-abc123def456ghi789jkl012mnopqrst'

response = requests.get(
    'https://api.mes.company.com/api/v2/work-orders',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
)

work_orders = response.json()
print(work_orders)
```

### Using C#

```csharp
var apiKey = "sk-abc123def456ghi789jkl012mnopqrst";
var client = new HttpClient();

client.DefaultRequestHeaders.Add(
    "Authorization",
    $"Bearer {apiKey}"
);

var response = await client.GetAsync(
    "https://api.mes.company.com/api/v2/work-orders"
);

var content = await response.Content.ReadAsStringAsync();
Console.WriteLine(content);
```

## Step 4: Check the Response (1 minute)

You should get a response like this:

```json
{
  "data": [
    {
      "id": "wo-001",
      "orderNumber": "WO-2024-001",
      "status": "IN_PROGRESS",
      "product": "Widget A",
      "quantity": 100,
      "dueDate": "2024-01-20T00:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasMore": false
  }
}
```

## Next Steps

🎉 **Congratulations!** You've made your first API call.

Now explore:

1. **[Learn Authentication](./authentication.md)** - Understand API key vs OAuth
2. **[API Reference](../api-reference/overview.md)** - Browse all endpoints
3. **[Making Requests Guide](./making-requests.md)** - Learn pagination, filtering, error handling
4. **[Sample Applications](../guides/authentication-flow.md)** - See complete working examples
5. **[Webhooks](../webhooks/overview.md)** - Receive real-time updates

## Common Next Steps

### Create a Work Order

```typescript
const response = await fetch('https://api.mes.company.com/api/v2/work-orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderNumber: 'WO-2024-NEW',
    product: 'Widget B',
    quantity: 50,
    dueDate: '2024-01-25T00:00:00Z'
  })
});

const newWorkOrder = await response.json();
console.log(newWorkOrder);
```

### Set Up Webhooks

Receive real-time notifications when work orders change:

1. Go to [Dashboard > Webhooks](https://developers.mes.company.com/dashboard/webhooks)
2. Click **Add Webhook Endpoint**
3. Enter your webhook URL: `https://yourapp.com/webhooks/mes`
4. Select events: `work_order.created`, `work_order.updated`
5. Save and test

**[→ Learn more about webhooks](../webhooks/overview.md)**

### Explore the API Playground

Test API calls interactively without writing code:

1. Go to [API Playground](https://developers.mes.company.com/playground)
2. Select an endpoint (e.g., "List Work Orders")
3. Modify parameters if needed
4. Click "Execute"
5. See the response in real-time

## Troubleshooting

### 401 Unauthorized
- Make sure your API key is correct
- Check it starts with `sk-`
- API keys are case-sensitive

### 404 Not Found
- Check the endpoint URL is correct
- Make sure you're using the right API version (`/api/v2/`)

### 429 Too Many Requests
- You've hit the rate limit (1,000 req/min)
- Implement exponential backoff retry logic
- [Read rate limiting guide](../guides/rate-limiting.md)

### Connection Error
- Check your internet connection
- Verify the API endpoint is reachable: `https://api.mes.company.com/health`
- [Check API status page](https://status.mes.company.com)

## Need Help?

- **[Full API Reference](../api-reference/overview.md)** - Browse all endpoints
- **[Error Handling Guide](../guides/error-handling.md)** - How to handle API errors
- **[Email Support](mailto:developers@mes.company.com)** - Response time: 24 hours
- **[GitHub Discussions](https://github.com/steiner385/MachShop/discussions)** - Ask community

---

**Have feedback on this guide?** [Edit on GitHub](https://github.com/steiner385/MachShop/edit/main/developer-portal/docs/getting-started/quick-start.md)
