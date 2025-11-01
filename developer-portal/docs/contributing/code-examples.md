---
sidebar_position: 3
title: Code Examples Standards
description: Standards for code examples in documentation
---

# Code Example Standards

All code examples in documentation must be complete, tested, and working.

## Requirements

### ✅ Every Code Example Must

- [ ] **Be complete** - Can be copied and run as-is
- [ ] **Be tested** - Verify it works before submission
- [ ] **Handle errors** - Include try/catch or error handling
- [ ] **Show output** - Display expected response/output
- [ ] **Include comments** - Explain non-obvious parts
- [ ] **Be realistic** - Use realistic data and scenarios

### ❌ Avoid

- Pseudo-code or incomplete examples
- Examples that only work with modifications
- Missing error handling
- Hard-coded secrets or API keys
- Overly simplified examples (unless explicitly a "simple" example)

## Complete Example Template

```typescript
// ✅ GOOD: Complete, tested, works as-is

import fetch from 'node-fetch';

// Get API key from environment
const apiKey = process.env.MES_API_KEY;
if (!apiKey) {
  throw new Error('Missing MES_API_KEY environment variable');
}

/**
 * Create a new work order
 * @param {Object} order - Work order data
 * @returns {Promise<Object>} Created work order
 */
const createWorkOrder = async (order) => {
  try {
    const response = await fetch(
      'https://api.mes.company.com/api/v2/work-orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      }
    );

    // Handle HTTP errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${error.error.code} - ${error.error.message}`);
    }

    // Return the created work order
    return await response.json();
  } catch (error) {
    console.error('Failed to create work order:', error);
    throw error;
  }
};

// USAGE EXAMPLE
const main = async () => {
  try {
    const newOrder = await createWorkOrder({
      orderNumber: 'WO-2024-NEW',
      product: 'Widget A',
      quantity: 100,
      dueDate: '2024-02-01T00:00:00Z'
    });

    console.log('✅ Order created:', newOrder.data);
    // Output:
    // ✅ Order created: {
    //   id: 'wo-999',
    //   orderNumber: 'WO-2024-NEW',
    //   status: 'OPEN',
    //   ...
    // }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

main();
```

## Code Organization

### Structure

```typescript
// 1. Imports
import fetch from 'node-fetch';

// 2. Configuration/Setup
const apiKey = process.env.MES_API_KEY;

// 3. Helper functions/types
interface WorkOrder {
  id: string;
  // ...
}

// 4. Main function
async function example() {
  // Implementation
}

// 5. Usage/execution
main();
```

### Naming

Use clear, descriptive names:

```typescript
// ✅ Good
const createWorkOrder = async (orderData) => {
  const response = await fetch(endpoint, options);
  return response.json();
};

// ❌ Avoid
const foo = async (x) => {
  const y = await fetch(z);
  return y.json();
};
```

## Error Handling

Always include error handling:

```typescript
// ✅ With error handling
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
} catch (error) {
  console.error('Request failed:', error);
  throw error;
}

// ❌ Without error handling
const response = await fetch(url, options);
return response.json();
```

## Comments

```typescript
// ✅ Good: Explains why and what
// Exponential backoff: 1s, 2s, 4s, 8s, 16s
const delayMs = Math.pow(2, attempt) * 1000;

// ✅ Good: Non-obvious logic
// Verify HMAC signature to ensure event came from MES
const isValid = crypto.timingSafeEqual(
  hash,
  signature
);

// ❌ Avoid: Obvious comments
const apiKey = process.env.MES_API_KEY;  // Get API key
const response = await fetch(url);       // Fetch from URL
```

## Language-Specific Examples

### JavaScript/TypeScript

```typescript
import fetch from 'node-fetch';

const example = async () => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  return response.json();
};
```

### Python

```python
import requests

def example():
    response = requests.get(
        url,
        headers={'Authorization': f'Bearer {api_key}'}
    )
    return response.json()
```

### C#/.NET

```csharp
using System.Net.Http;

var example = async () => {
    client.DefaultRequestHeaders.Add(
        "Authorization",
        $"Bearer {apiKey}"
    );
    var response = await client.GetAsync(url);
    return await response.Content.ReadAsStringAsync();
};
```

### Java

```java
public String example() throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Authorization", "Bearer " + apiKey)
        .GET()
        .build();

    HttpResponse<String> response = client.send(
        request,
        HttpResponse.BodyHandlers.ofString()
    );
    return response.body();
}
```

### cURL

```bash
curl -X POST https://api.mes.company.com/api/v2/work-orders \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "WO-2024-001",
    "product": "Widget",
    "quantity": 100
  }'
```

## Testing Code Examples

### Before Submitting

1. Copy the exact code from your example
2. Run it in a fresh environment
3. Verify it works without modifications
4. Check the output matches documentation

```bash
# Test JavaScript example
node my-example.js

# Test Python example
python my_example.py

# Test cURL example
curl -X POST https://...
```

### Sandbox Environment

Test against the MES sandbox/test environment:

```typescript
const apiUrl = process.env.MES_API_ENV === 'prod'
  ? 'https://api.mes.company.com'
  : 'https://api-test.mes.company.com';
```

## Documentation with Examples

Structure documentation to include code examples:

```markdown
## Creating a Work Order

Use the work orders API to create a new manufacturing order.

### Request

**Endpoint:** `POST /api/v2/work-orders`

**Parameters:**
- `orderNumber` (string, required) - Unique order number
- `product` (string, required) - Product name or SKU
- `quantity` (number, required) - Units to produce

### Example

[Include complete code example here]

### Response

[Show expected response]
```

## Common Code Example Mistakes

| Mistake | Fix |
|---------|-----|
| Missing error handling | Add try/catch or .catch() |
| Hard-coded API keys | Use environment variables |
| Incomplete (pseudo-code) | Provide complete, runnable code |
| No output shown | Show expected response/output |
| Wrong URL or endpoint | Verify current API endpoints |
| Outdated syntax | Use current language versions |
| Not tested | Test before submitting |

## Checklist

Before including a code example:

- [ ] Code is complete and runnable
- [ ] Tested and verified working
- [ ] Includes error handling
- [ ] Shows expected output
- [ ] Uses environment variables for secrets
- [ ] Has clear comments
- [ ] Realistic data/scenario
- [ ] Follows language conventions
- [ ] Multiple languages if applicable
- [ ] Links to related docs

---

**Questions?** See [Style Guide](./style-guide.md) or [Contributing Guidelines](./documentation.md)
