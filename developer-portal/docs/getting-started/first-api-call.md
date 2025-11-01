---
sidebar_position: 5
title: Your First API Call
description: Build a complete example from start to finish
---

# Your First API Call: Complete Example

Follow along as we build a complete example from authentication to processing the response.

## Scenario

We're building an integration that lists open work orders and creates a new one.

## Step 1: Get Your API Key

First, you need an API key. If you don't have one:

1. Log in to [developer dashboard](https://developers.mes.company.com/dashboard)
2. Go to **Settings > API Keys**
3. Click **Create New API Key**
4. Name it "My First Integration"
5. Copy the key

Save it to your environment:

```bash
export MES_API_KEY="sk-abc123def456..."
```

## Step 2: List Work Orders (GET Request)

Let's retrieve all open work orders:

### cURL

```bash
curl -X GET https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer $MES_API_KEY" \
  -H "Content-Type: application/json"
```

### JavaScript

```typescript
const apiKey = process.env.MES_API_KEY;

const response = await fetch(
  'https://api.mes.company.com/api/v2/work-orders',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data);
```

### Python

```python
import requests
import os

api_key = os.getenv('MES_API_KEY')

response = requests.get(
    'https://api.mes.company.com/api/v2/work-orders',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
)

data = response.json()
print(data)
```

### Response

```json
{
  "data": [
    {
      "id": "wo-123",
      "orderNumber": "WO-2024-001",
      "status": "OPEN",
      "product": "Widget A",
      "quantity": 100,
      "dueDate": "2024-01-25T00:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "wo-124",
      "orderNumber": "WO-2024-002",
      "status": "IN_PROGRESS",
      "product": "Widget B",
      "quantity": 50,
      "dueDate": "2024-01-22T00:00:00Z",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "hasMore": false
  }
}
```

## Step 3: Parse the Response

Let's access specific work order data:

### JavaScript

```typescript
const workOrders = data.data;

workOrders.forEach(order => {
  console.log(`${order.orderNumber}: ${order.product} (${order.quantity} units)`);
});

// Output:
// WO-2024-001: Widget A (100 units)
// WO-2024-002: Widget B (50 units)
```

### Python

```python
work_orders = data['data']

for order in work_orders:
    print(f"{order['orderNumber']}: {order['product']} ({order['quantity']} units)")

# Output:
# WO-2024-001: Widget A (100 units)
# WO-2024-002: Widget B (50 units)
```

## Step 4: Create a New Work Order (POST Request)

Now let's create a new work order:

### cURL

```bash
curl -X POST https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer $MES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "WO-2024-NEW",
    "product": "Widget C",
    "quantity": 75,
    "dueDate": "2024-01-30T00:00:00Z",
    "priority": "HIGH"
  }'
```

### JavaScript

```typescript
const newWorkOrder = {
  orderNumber: 'WO-2024-NEW',
  product: 'Widget C',
  quantity: 75,
  dueDate: '2024-01-30T00:00:00Z',
  priority: 'HIGH'
};

const createResponse = await fetch(
  'https://api.mes.company.com/api/v2/work-orders',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newWorkOrder)
  }
);

const created = await createResponse.json();
console.log(created);
```

### Python

```python
new_work_order = {
    'orderNumber': 'WO-2024-NEW',
    'product': 'Widget C',
    'quantity': 75,
    'dueDate': '2024-01-30T00:00:00Z',
    'priority': 'HIGH'
}

create_response = requests.post(
    'https://api.mes.company.com/api/v2/work-orders',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    },
    json=new_work_order
)

created = create_response.json()
print(created)
```

### Response (201 Created)

```json
{
  "data": {
    "id": "wo-999",
    "orderNumber": "WO-2024-NEW",
    "status": "OPEN",
    "product": "Widget C",
    "quantity": 75,
    "dueDate": "2024-01-30T00:00:00Z",
    "priority": "HIGH",
    "createdAt": "2024-01-15T15:30:00Z",
    "updatedAt": "2024-01-15T15:30:00Z"
  }
}
```

## Step 5: Handle Errors

What if something goes wrong? Let's handle errors properly:

### JavaScript

```typescript
const makeRequest = async (url, options) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
};

// Usage
try {
  const result = await makeRequest(
    'https://api.mes.company.com/api/v2/work-orders',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newWorkOrder)
    }
  );
  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error);
}
```

### Python

```python
try:
    response = requests.post(
        'https://api.mes.company.com/api/v2/work-orders',
        headers={'Authorization': f'Bearer {api_key}'},
        json=new_work_order
    )
    response.raise_for_status()
    created = response.json()
    print('Success:', created)
except requests.exceptions.HTTPError as error:
    print(f'API Error: {error.response.json()}')
except Exception as error:
    print(f'Error: {error}')
```

## Complete Working Example

Here's a complete, runnable example:

### JavaScript (Node.js)

```typescript
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.MES_API_KEY;
const baseUrl = 'https://api.mes.company.com/api/v2';

const api = async (method, endpoint, body = null) => {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
};

// Main execution
const main = async () => {
  try {
    console.log('📋 Fetching work orders...');
    const orders = await api('GET', '/work-orders');
    console.log(`Found ${orders.data.length} work orders`);

    console.log('\n📝 Creating new work order...');
    const newOrder = await api('POST', '/work-orders', {
      orderNumber: `WO-${Date.now()}`,
      product: 'Widget C',
      quantity: 75,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'HIGH'
    });
    console.log(`✅ Created: ${newOrder.data.orderNumber}`);

    console.log('\n🎉 Success! Your first API call works!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

main();
```

### Python

```python
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('MES_API_KEY')
base_url = 'https://api.mes.company.com/api/v2'

def api(method, endpoint, body=None):
    url = f'{base_url}{endpoint}'
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=body)

    response.raise_for_status()
    return response.json()

# Main execution
try:
    print('📋 Fetching work orders...')
    orders = api('GET', '/work-orders')
    print(f"Found {len(orders['data'])} work orders")

    print('\n📝 Creating new work order...')
    due_date = datetime.now() + timedelta(days=15)
    new_order = api('POST', '/work-orders', {
        'orderNumber': f"WO-{int(datetime.now().timestamp())}",
        'product': 'Widget C',
        'quantity': 75,
        'dueDate': due_date.isoformat() + 'Z',
        'priority': 'HIGH'
    })
    print(f"✅ Created: {new_order['data']['orderNumber']}")

    print('\n🎉 Success! Your first API call works!')
except Exception as error:
    print(f'❌ Error: {error}')
```

## Next Steps

Now that you've made your first API call:

1. **[Explore the API Reference](../api-reference/overview.md)** - See all available endpoints
2. **[Set Up Webhooks](../webhooks/overview.md)** - Receive real-time notifications
3. **[Error Handling Guide](../guides/error-handling.md)** - Handle edge cases
4. **[Sample Applications](../guides/authentication-flow.md)** - See complete examples

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check API key in Authorization header |
| 400 Bad Request | Validate request JSON and field names |
| 404 Not Found | Check endpoint URL and resource ID |
| 500 Internal Error | Try again, check [status page](https://status.mes.company.com) |

---

**Have questions?** [Email support](mailto:developers@mes.company.com) or [GitHub Discussions](https://github.com/steiner385/MachShop/discussions)
