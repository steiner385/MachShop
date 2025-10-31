---
sidebar_position: 1
title: Contributing to Documentation
description: How to contribute to the MES developer documentation
---

# Contributing to Documentation

We welcome documentation contributions from the community!

## How to Contribute

### 1. Fork & Clone

```bash
git clone https://github.com/steiner385/MachShop.git
cd developer-portal
```

### 2. Create a Branch

```bash
git checkout -b docs/your-topic
```

Use descriptive branch names:
- `docs/fix-typo-in-api-ref`
- `docs/add-webhook-examples`
- `docs/improve-auth-guide`

### 3. Edit Documentation

Documentation files are in `docs/` directory using Markdown format.

```markdown
---
sidebar_position: 1
title: Page Title
description: Brief description for search engines
---

# Page Title

Your content here...
```

### 4. Test Locally

```bash
npm install
npm run start
```

Opens documentation at `http://localhost:3000`

### 5. Submit Pull Request

1. Push your branch: `git push origin docs/your-topic`
2. Create PR on GitHub
3. Describe your changes clearly
4. Link to any related issues

## Documentation Guidelines

### Content Quality

- **Clear Language**: Avoid jargon; explain if necessary
- **Organized**: Use headings, lists, and sections
- **Examples**: Include code examples where helpful
- **Links**: Link to related documentation
- **Accurate**: Verify all information and test code

### Structure

Every documentation page should:

```markdown
---
sidebar_position: 1
title: Page Title
description: One-sentence description
---

# Page Title

## Overview
Brief intro

## Section 1
Content and examples

## Section 2
More content

## Related Documentation
- [Link Title](./path)

---

**Need help?** [Email support](mailto:developers@mes.company.com)
```

### Code Examples

- Include complete, runnable examples
- Show output/response
- Support multiple languages (JS, Python, C#)
- Highlight important parts

```typescript
// Good: Complete example with error handling
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

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
};
```

### Images & Diagrams

- Use SVG or PNG format
- Keep file sizes small (compress)
- Add alt text for accessibility
- Place in `static/img/` directory

```markdown
![API Architecture Diagram](./img/architecture.svg)
```

## Editing Checklist

Before submitting, check:

- [ ] Content is accurate and tested
- [ ] Code examples work correctly
- [ ] Links point to correct pages
- [ ] No typos or grammar errors
- [ ] Headings use proper hierarchy
- [ ] Code properly highlighted
- [ ] Formatting is consistent
- [ ] Documentation site builds: `npm run build`

## Topics That Need Help

These areas are looking for contributions:

- [ ] More code examples in multiple languages
- [ ] Webhook implementation guides
- [ ] Plugin development tutorials
- [ ] Integration walkthroughs (SAP, NetSuite, etc.)
- [ ] Video tutorial scripts
- [ ] Architecture diagrams
- [ ] Troubleshooting guides
- [ ] Translations (Spanish, Chinese, German)

## Review Process

1. Our team reviews your PR
2. We may suggest improvements
3. Once approved, we merge
4. Changes published to production

## Questions?

- **Documentation Issues**: [GitHub Issues](https://github.com/steiner385/MachShop/issues)
- **Questions**: [GitHub Discussions](https://github.com/steiner385/MachShop/discussions)
- **Email**: [developers@mes.company.com](mailto:developers@mes.company.com)

## License

By contributing, you agree that your contributions are licensed under the project's MIT License.

---

Thank you for improving our documentation! 🙏
