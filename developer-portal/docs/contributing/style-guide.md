---
sidebar_position: 2
title: Style Guide
description: Writing style and formatting standards
---

# Documentation Style Guide

Maintain consistency across all documentation using these guidelines.

## Tone & Voice

### ✅ Do

- Write in **active voice**: "Create a work order" vs. "A work order should be created"
- Be **friendly and professional**: Helpful, not robotic
- Use **clear, simple language**: Avoid unnecessary jargon
- Be **specific**: "Update the status to IN_PROGRESS" not "Update the status"
- Use **second person**: "You need to..." instead of "One needs to..."

### ❌ Don't

- Use technical jargon without explanation
- Write in passive voice
- Be overly formal or stuffy
- Be vague or ambiguous
- Use ALL CAPS for emphasis (use **bold** instead)

## Formatting

### Headings

Use heading hierarchy consistently:

```markdown
# Main Title (H1 - one per page)

## Major Section (H2)

### Subsection (H3)

#### Details (H4 - rarely needed)
```

### Emphasis

```markdown
**Bold** for important terms and UI elements
*Italics* for variable names and file paths
`Code` for code, commands, parameters, and file names
```

### Lists

Use unordered lists for groups without order:

```markdown
- Item one
- Item two
  - Nested item
  - Another nested
- Item three
```

Use ordered lists for steps:

```markdown
1. First step
2. Second step
   1. Substep
   2. Another substep
3. Third step
```

### Code Blocks

Always specify the language:

````markdown
```typescript
const example = () => {
  console.log('hello');
};
```

```bash
curl -X GET https://api.mes.company.com
```

```json
{
  "status": "success"
}
```
````

### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Blockquotes

Use for tips, warnings, and notes:

```markdown
> **Note:** This is important information
```

## Code Examples

### Comprehensive Examples

Include complete, runnable code:

```typescript
// ✅ Good: Complete, works as-is
import fetch from 'node-fetch';

const apiKey = process.env.MES_API_KEY;

const listWorkOrders = async () => {
  const response = await fetch(
    'https://api.mes.company.com/api/v2/work-orders',
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
};

// Usage
const orders = await listWorkOrders();
console.log(orders);
```

```typescript
// ❌ Avoid: Incomplete pseudo-code
const result = api.get('/work-orders');
// ...
```

### Multiple Languages

When showing the same example in multiple languages:

1. JavaScript/TypeScript first (most developers use this)
2. Python
3. C# / .NET
4. Java (if applicable)
5. cURL (for simple examples)

```typescript
// JavaScript
const response = await fetch(url);
```

```python
# Python
response = requests.get(url)
```

```csharp
// C#
var response = await client.GetAsync(url);
```

```bash
# cURL
curl -X GET $url
```

### Comments in Code

```typescript
// ✅ Good: Explains why, not what
const delay = Math.pow(2, attempt) * 1000;  // Exponential backoff

// ❌ Avoid: States the obvious
const delay = Math.pow(2, attempt) * 1000;  // Calculate delay
```

## Links

### Internal Links

```markdown
[Text to display](../path/to/file.md)
[Getting Started](../getting-started/introduction.md)
```

### External Links

```markdown
[GitHub](https://github.com/steiner385/MachShop)
[Discord](https://discord.gg/mes-developers)
```

### Related Documentation

At the end of each page:

```markdown
## Related Documentation

- [API Reference](../api-reference/overview.md)
- [Authentication](../getting-started/authentication.md)

---

**Need help?** [Email support](mailto:developers@mes.company.com)
```

## Special Formatting

### API Endpoint

```
**Endpoint:** `POST /api/v2/work-orders`
```

### HTTP Status Code

```
**Response:** 201 Created
```

### Parameter

```
- `userId` (string, required) - The user's unique identifier
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed"
  }
}
```

## Typography

### Numbers

- Use numerals: "5 items" not "five items"
- Use comma separators: "1,000 requests" not "1000 requests"
- Spell out: "First step", "second step" in prose

### Dates & Times

- Use ISO format: `2024-01-15T10:30:00Z`
- Spell out months: "January 15, 2024"

### Terms to Capitalize

- API (not "api" or "Api")
- OAuth 2.0
- REST
- GraphQL
- JSON
- TypeScript
- Python
- C#
- MES (Manufacturing Execution System)

### Terms to Keep Lowercase

- webhook
- endpoint
- work order
- non-conformance report

## Accessibility

### Headings

Never skip heading levels:

```markdown
# Title
## Section      ✅ Correct

# Title
### Subsection  ❌ Skips H2
```

### Images

Always include alt text:

```markdown
![Architecture diagram showing API, services, and database layers](../img/architecture.svg)
```

Not:

```markdown
![diagram](../img/architecture.svg)  ❌ Too vague
```

### Color

Don't rely on color alone:

```markdown
✅ **Error** (shown in red): Invalid API key
❌ Error shown in red: Invalid API key
```

## Common Mistakes

| Mistake | Correct |
|---------|---------|
| "Please try to create a work order" | "Create a work order" |
| "In order to authenticate" | "To authenticate" |
| "The API allows you to retrieve data" | "Retrieve data using the API" |
| "Utilize the webhook functionality" | "Use webhooks to receive events" |
| "It is recommended to verify signatures" | "Verify webhook signatures" |

## Page Template

```markdown
---
sidebar_position: 1
title: Page Title
description: One-sentence description for search
---

# Page Title

Brief intro paragraph (2-3 sentences).

## Overview

What this does and why it matters.

## Getting Started

Quick overview or prerequisites.

## Detailed Content

Main content split into logical sections.

## Code Examples

Complete working examples in multiple languages.

## Common Issues

Troubleshooting and FAQs.

## Related Documentation

- [Link 1](./path)
- [Link 2](./path)

---

**Need help?** [Email support](mailto:developers@mes.company.com)
```

---

For questions about the style guide, see [Contributing to Documentation](./documentation.md).
