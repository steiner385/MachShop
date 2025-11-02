# Frequently Asked Questions (FAQ)

## Table of Contents

- [General Questions](#general-questions)
- [Getting Started](#getting-started)
- [Architecture Questions](#architecture-questions)
- [Performance Questions](#performance-questions)
- [Security and Permissions](#security-and-permissions)
- [Development Questions](#development-questions)
- [Deployment Questions](#deployment-questions)
- [Best Practices](#best-practices)
- [Support and Resources](#support-and-resources)

## General Questions

### What is an extension?

An extension is a modular plugin that adds functionality to the MachShop platform. Extensions can:
- Add new UI components to various parts of the application
- Integrate with external services
- Provide custom workflows and automation
- Extend existing features with additional capabilities

Extensions are built using React and TypeScript, and they integrate seamlessly with the platform through a well-defined SDK.

### Do I need to know React to build extensions?

Yes, basic knowledge of React is required. You should be familiar with:
- Functional components
- Hooks (useState, useEffect, useContext)
- Component composition
- Props and state management

If you're new to React, we recommend:
- [React Official Tutorial](https://react.dev/learn)
- [React Hooks Guide](https://react.dev/reference/react)

### What's the difference between V1 and V2?

Version 2.0 introduced significant improvements:

**V1 (Legacy)**:
- Webpack-based build
- Class components supported
- Basic permission system
- Limited TypeScript support

**V2 (Current)**:
- Vite-based build (faster)
- Functional components with hooks
- Enhanced RBAC permission system
- Full TypeScript support
- Dark mode support
- Better performance optimization
- Extension dependency system

See the [Migration Guide](./MIGRATION_GUIDE.md) for detailed differences.

### Can I use JavaScript instead of TypeScript?

Yes, but TypeScript is strongly recommended for:
- Better IDE support and autocomplete
- Type safety and fewer runtime errors
- Better documentation through types
- Easier refactoring

You can start with JavaScript and gradually migrate to TypeScript:

```javascript
// JavaScript (works)
export function MyComponent({ user }) {
  return <div>{user.name}</div>;
}

// TypeScript (recommended)
interface MyComponentProps {
  user: User;
}

export function MyComponent({ user }: MyComponentProps) {
  return <div>{user.name}</div>;
}
```

### How much does it cost to build extensions?

Building extensions is free! The SDK and development tools are provided at no cost. You only need:
- A MachShop account (free tier available)
- Development tools (Node.js, code editor)
- Time to build your extension

Deploying extensions may require a paid MachShop plan depending on your needs.

## Getting Started

### How do I create my first extension?

```bash
# Install the CLI
npm install -g @machshop/extension-cli

# Create a new extension
machshop-ext create my-first-extension

# Navigate to the directory
cd my-first-extension

# Start development server
npm run dev
```

See the [Quick Start Guide](./QUICK_START.md) for detailed instructions.

### What tools do I need?

**Required**:
- Node.js 18+ and npm 8+
- Code editor (VS Code recommended)
- Git for version control

**Recommended**:
- React DevTools browser extension
- TypeScript knowledge
- Basic understanding of REST APIs

**Optional**:
- Docker for containerized development
- Postman for API testing

### How long does it take to build an extension?

It depends on complexity:

**Simple Extension** (1-3 days):
- Basic UI component
- Read-only data display
- Simple configuration

**Medium Extension** (1-2 weeks):
- Custom workflows
- Data manipulation
- External API integration
- User settings

**Complex Extension** (1-2 months):
- Advanced features
- Multiple extension points
- Complex state management
- Extensive testing

### Can I see example extensions?

Yes! Check out our examples:

```bash
# Clone examples repository
git clone https://github.com/machshop/extension-examples

# Browse examples
cd extension-examples
ls -la examples/
```

Available examples:
- `hello-world` - Minimal extension
- `dashboard-widget` - Custom dashboard component
- `data-sync` - External API integration
- `workflow-automation` - Custom workflows
- `advanced-analytics` - Complex data visualization

## Architecture Questions

### How do extensions integrate with the platform?

Extensions integrate through **extension points** defined in your manifest:

```json
{
  "extensionPoints": {
    "dashboard": {
      "component": "DashboardWidget",
      "position": "top-right"
    },
    "settings": {
      "component": "SettingsPanel"
    },
    "toolbar": {
      "component": "ToolbarButton",
      "icon": "gear"
    }
  }
}
```

The platform loads your extension and renders components at the specified points.

### Can extensions communicate with each other?

Yes, through the extension dependency system:

```json
{
  "dependencies": [
    {
      "extensionId": "analytics-core",
      "version": "^1.0.0"
    }
  ]
}
```

```typescript
// In your extension
import { useExtension } from '@machshop/extension-sdk';

function MyComponent() {
  const { getExtension } = useExtension();
  const analytics = getExtension('analytics-core');

  analytics.trackEvent('button_clicked');
}
```

### How does data persistence work?

Extensions can store data using the Storage API:

```typescript
import { useStorage } from '@machshop/extension-sdk';

function MyComponent() {
  const [settings, setSettings] = useStorage('settings', {
    theme: 'light',
    notifications: true,
  });

  return (
    <button onClick={() => setSettings({ ...settings, theme: 'dark' })}>
      Toggle Theme
    </button>
  );
}
```

Data is:
- Automatically persisted
- Scoped to your extension
- Synced across browser tabs
- Available offline (with limitations)

### What's the extension lifecycle?

```
Install → Initialize → Active → Update → Uninstall
```

**Lifecycle Hooks**:

```typescript
export default createExtension({
  lifecycle: {
    onInstall: async (context) => {
      // First-time setup
      await context.storage.set('initialized', true);
    },

    onUpdate: async (context, previousVersion) => {
      // Migrate data if needed
      if (previousVersion < '2.0.0') {
        await migrateData();
      }
    },

    onUninstall: async (context) => {
      // Cleanup
      await context.storage.clear();
    },
  },
});
```

### Can extensions access the database directly?

No, extensions cannot access the database directly. Instead, use:

**Option 1: SDK APIs**
```typescript
import { useAPI } from '@machshop/extension-sdk';

function MyComponent() {
  const { data, loading } = useAPI('/api/users');
}
```

**Option 2: Custom Backend**
```typescript
// Extension can make requests to your own backend
async function fetchData() {
  const response = await fetch('https://your-api.com/data');
  return response.json();
}
```

This ensures security and data isolation.

## Performance Questions

### How can I optimize my extension?

**1. Code Splitting**
```typescript
// Lazy load heavy components
const Chart = lazy(() => import('./components/Chart'));

function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <Chart data={data} />
    </Suspense>
  );
}
```

**2. Memoization**
```typescript
// Memoize expensive calculations
const processedData = useMemo(() => {
  return data.map(item => expensiveOperation(item));
}, [data]);
```

**3. Virtualization**
```typescript
// Use react-window for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

See the [Performance Guide](./PERFORMANCE_GUIDE.md) for more details.

### What's the recommended bundle size?

**Target**: < 200KB gzipped

**Check your bundle size**:
```bash
npm run build
ls -lh dist/

# Use bundle analyzer
npm install --save-dev @rollup/plugin-visualizer
npm run build -- --analyze
```

**Tips to reduce size**:
- Use dynamic imports for large components
- Tree shake unused code
- Use lighter alternatives (date-fns instead of moment)
- Optimize images

### How many API calls is too many?

**Guidelines**:
- **Initial load**: < 5 requests
- **User action**: 1-2 requests
- **Background sync**: Every 30+ seconds
- **Real-time updates**: Use WebSockets

**Optimization**:
```typescript
// Bad: Multiple separate requests
const users = await fetchUsers();
const posts = await fetchPosts();
const comments = await fetchComments();

// Good: Batch request
const { users, posts, comments } = await fetchDashboardData();

// Better: Cache with React Query
const { data } = useQuery('dashboard', fetchDashboardData, {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Does my extension slow down the platform?

Only if poorly optimized. The platform:
- Lazy loads extensions
- Isolates extension code
- Monitors performance
- Can disable problematic extensions

**Best practices**:
- Avoid long-running synchronous operations
- Use Web Workers for heavy computation
- Implement proper loading states
- Follow the [Performance Guide](./PERFORMANCE_GUIDE.md)

## Security and Permissions

### What permissions does my extension need?

Declare all required permissions in your manifest:

```json
{
  "permissions": [
    "storage.read",      // Read extension storage
    "storage.write",     // Write extension storage
    "api.user.read",     // Read user data
    "api.user.write",    // Modify user data
    "api.content.read",  // Read content
    "api.content.write", // Modify content
    "network.external"   // Make external requests
  ]
}
```

**Principle**: Request only what you need.

### How are user permissions validated?

**Client-side** (UX only):
```typescript
import { usePermission } from '@machshop/extension-sdk';

function EditButton() {
  const { hasPermission } = usePermission('content.edit');

  if (!hasPermission) {
    return null; // Hide button
  }

  return <button>Edit</button>;
}
```

**Server-side** (Security):
```typescript
// Server validates EVERY request
app.post('/api/content', authenticate, requirePermission('content.edit'), handler);
```

Never trust client-side checks alone!

### Can extensions access user data?

Only with proper permissions and user consent:

```json
{
  "permissions": ["api.user.read"]
}
```

**What you can access**:
- Current user's own data
- Data they have permission to view
- Public data

**What you cannot access**:
- Other users' private data (without permission)
- System-level data
- Other extensions' data

### How do I handle sensitive data?

**1. Don't store secrets in code**
```typescript
// ❌ Bad
const API_KEY = 'sk_live_xxxxx';

// ✅ Good - Use environment variables
const API_KEY = import.meta.env.VITE_API_KEY;
```

**2. Use configuration for API keys**
```json
{
  "configuration": {
    "schema": {
      "properties": {
        "apiKey": {
          "type": "string",
          "format": "password",
          "description": "Your API key"
        }
      }
    }
  }
}
```

**3. Encrypt sensitive data**
```typescript
import { useStorage } from '@machshop/extension-sdk';

function MyComponent() {
  const { encrypt, decrypt } = useStorage();

  const saveToken = async (token: string) => {
    const encrypted = await encrypt(token);
    await storage.set('token', encrypted);
  };
}
```

### Are extensions sandboxed?

Yes, extensions run in a sandboxed environment:

**Isolated**:
- Own storage namespace
- Own state management
- CSS scoping (recommended)

**Shared** (controlled):
- Platform UI components
- Theme system
- Permission system
- API access (with permissions)

## Development Questions

### Can I use my favorite UI library?

Yes, but consider:

**Recommended**: Use platform components
```typescript
import { Button, Input } from '@machshop/extension-sdk/components';

function MyForm() {
  return (
    <form>
      <Input label="Name" />
      <Button>Submit</Button>
    </form>
  );
}
```

**Benefits**:
- Automatic theming
- Consistent UX
- Smaller bundle size
- Accessibility built-in

**Custom UI libraries** (Material-UI, Ant Design, etc.):
- Increases bundle size
- May conflict with platform theme
- More maintenance
- Still possible if needed

### How do I debug my extension?

**1. Browser DevTools**
```typescript
// Add debug logs
console.log('Extension state:', state);
console.table(users);

// Use debugger
debugger;
```

**2. React DevTools**
- Install browser extension
- Inspect component tree
- View props and state
- Profile performance

**3. Debug Component**
```typescript
function DebugPanel({ data }) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <details>
      <summary>Debug Info</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
```

See [Troubleshooting Guide](./TROUBLESHOOTING.md) for more techniques.

### Can I write tests for my extension?

Absolutely! Testing is recommended:

```typescript
// Component test
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

// Hook test
import { renderHook } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return data', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.data).toBeDefined();
  });
});
```

See [Testing Guide](./TESTING_GUIDE.md) for comprehensive examples.

### How do I handle errors?

**1. Error Boundaries**
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo);
    // Log to error service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**2. Try-Catch for Async**
```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('Failed to fetch');
    }
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    // Show user-friendly error
    toast.error('Failed to load data');
    return null;
  }
}
```

**3. Error States**
```typescript
function MyComponent() {
  const [error, setError] = useState(null);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return <div>Content</div>;
}
```

### Can I use third-party libraries?

Yes, but follow these guidelines:

**Check license**: Ensure it's compatible (MIT, Apache, etc.)

**Check bundle size**:
```bash
npm install --save-dev webpack-bundle-analyzer
```

**Security**: Audit dependencies
```bash
npm audit
```

**Consider alternatives**: Lighter libraries may exist

**Popular compatible libraries**:
- `date-fns` - Date utilities
- `lodash-es` - Utilities (tree-shakeable)
- `react-query` - Data fetching
- `zod` - Schema validation
- `react-hook-form` - Forms

## Deployment Questions

### How do I deploy my extension?

**1. Build**
```bash
npm run build
```

**2. Validate**
```bash
npm run validate
```

**3. Package**
```bash
npm run package
# Creates: my-extension-1.0.0.zip
```

**4. Deploy**
```bash
# Via CLI
machshop-ext deploy my-extension-1.0.0.zip

# Or via web interface
# Upload zip file at https://machshop.dev/extensions/deploy
```

### Can I have different versions?

Yes! Support multiple versions:

**Development**:
```bash
npm run dev
# Test at https://dev.machshop.dev
```

**Staging**:
```bash
npm run build:staging
machshop-ext deploy --env staging
# Test at https://staging.machshop.dev
```

**Production**:
```bash
npm run build
machshop-ext deploy --env production
# Live at https://machshop.dev
```

### How do I update my extension?

**1. Update version**
```json
{
  "version": "1.1.0"  // Follow semver
}
```

**2. Implement update handler**
```typescript
lifecycle: {
  onUpdate: async (context, previousVersion) => {
    if (previousVersion < '1.1.0') {
      // Migrate data
      await migrateStorageSchema();
    }
  }
}
```

**3. Deploy**
```bash
npm run build
machshop-ext deploy
```

Users will be prompted to update automatically.

### Can I roll back a deployment?

Yes, through the dashboard:

1. Go to Extensions → Your Extension
2. Click "Versions"
3. Select previous version
4. Click "Rollback"

Or via CLI:
```bash
machshop-ext rollback my-extension --version 1.0.0
```

### How do I monitor my extension?

**1. Built-in Analytics**
```typescript
import { useAnalytics } from '@machshop/extension-sdk';

function MyComponent() {
  const analytics = useAnalytics();

  const handleClick = () => {
    analytics.track('button_clicked', {
      buttonId: 'submit',
    });
  };
}
```

**2. Error Tracking**
```typescript
import { useErrorTracking } from '@machshop/extension-sdk';

function MyComponent() {
  const { trackError } = useErrorTracking();

  try {
    // Code
  } catch (error) {
    trackError(error);
  }
}
```

**3. Dashboard Metrics**
- Active users
- Error rate
- Performance metrics
- Usage statistics

## Best Practices

### What are the most important best practices?

**1. Security**
- Never trust client-side data
- Validate permissions on server
- Don't store secrets in code
- Sanitize user input

**2. Performance**
- Keep bundle size < 200KB
- Lazy load components
- Memoize expensive operations
- Optimize images

**3. Accessibility**
- Use semantic HTML
- Provide ARIA labels
- Ensure keyboard navigation
- Test with screen readers

**4. User Experience**
- Show loading states
- Handle errors gracefully
- Provide clear feedback
- Follow platform design

**5. Code Quality**
- Use TypeScript
- Write tests (80%+ coverage)
- Follow linting rules
- Document your code

### Should I use TypeScript?

**Yes!** TypeScript provides:

**Type Safety**:
```typescript
// Catches errors at compile time
function greet(name: string) {
  return `Hello ${name}`;
}

greet(123); // Error: number is not string
```

**Better IDE Support**:
- Autocomplete
- IntelliSense
- Refactoring tools

**Self-Documenting**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Types serve as documentation
function updateUser(user: User) { }
```

### How do I structure my extension?

```
my-extension/
├── src/
│   ├── components/     # React components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.styles.ts
│   │   └── ...
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utilities
│   ├── types/          # TypeScript types
│   ├── api/            # API clients
│   ├── contexts/       # React contexts
│   └── index.tsx       # Entry point
├── public/             # Static assets
├── tests/              # Test files
├── extension.manifest.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### What should I avoid?

**❌ Don't**:
- Mutate state directly
- Use inline styles everywhere
- Ignore accessibility
- Skip error handling
- Write overly complex components
- Forget to clean up effects
- Store sensitive data in localStorage
- Make excessive API calls
- Bundle unnecessary dependencies
- Ignore TypeScript errors

**✅ Do**:
- Use immutable updates
- Use CSS modules or styled-components
- Follow WCAG 2.1 AA guidelines
- Handle errors gracefully
- Keep components small and focused
- Clean up subscriptions and listeners
- Use secure storage with encryption
- Optimize and batch API requests
- Keep bundle size minimal
- Fix all type errors

## Support and Resources

### Where can I find documentation?

**Official Docs**:
- [Quick Start Guide](./QUICK_START.md)
- [API Reference](./API_REFERENCE.md)
- [Component Library](./COMPONENTS.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

**Guides**:
- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)
- [Permission Guide](./PERMISSION_GUIDE.md)
- [Theme Guide](./THEME_GUIDE.md)

### Where can I get help?

**1. Documentation**: Check official docs first

**2. Community**:
- Discord: https://discord.gg/machshop
- GitHub Discussions: https://github.com/machshop/extensions/discussions
- Stack Overflow: Tag `machshop-extensions`

**3. Support**:
- Email: support@machshop.dev
- Support Portal: https://support.machshop.dev
- Live Chat: Available on dashboard

**4. Professional Services**:
- Custom development
- Code reviews
- Training workshops
- Contact: enterprise@machshop.dev

### How do I report a bug?

**GitHub Issues**: https://github.com/machshop/extensions/issues

**Include**:
```markdown
**Environment**
- Extension SDK: 2.0.0
- React: 18.2.0
- Browser: Chrome 120
- OS: macOS 14

**Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
If applicable

**Code Sample**
Minimal reproduction code
```

### How can I contribute?

**1. Code Contributions**:
- Fork the repository
- Create a feature branch
- Make your changes
- Submit a pull request

**2. Documentation**:
- Fix typos
- Add examples
- Improve clarity
- Translate docs

**3. Community**:
- Answer questions
- Share examples
- Write tutorials
- Review PRs

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Are there extension examples?

Yes! Check out:

**Official Examples**:
```bash
git clone https://github.com/machshop/extension-examples
```

**Community Extensions**:
- Browse marketplace: https://machshop.dev/extensions
- Featured extensions
- Open source extensions
- Code samples

**Starter Templates**:
```bash
# Minimal template
machshop-ext create --template minimal

# Full-featured template
machshop-ext create --template full

# TypeScript template
machshop-ext create --template typescript
```

### What's the roadmap?

**Current (V2.0)**:
- Full TypeScript support
- Dark mode
- Enhanced permissions
- Performance optimizations

**Near Term (Q1 2025)**:
- GraphQL support
- Real-time data sync
- Advanced analytics
- Extension marketplace improvements

**Future**:
- Mobile extension support
- AI-powered extensions
- Enhanced customization
- More extension points

Follow updates: https://machshop.dev/roadmap

---

## Still Have Questions?

**Quick Links**:
- Documentation: https://docs.machshop.dev
- Discord: https://discord.gg/machshop
- Support: support@machshop.dev
- GitHub: https://github.com/machshop/extensions

**Pro Tip**: Before asking a question, search existing documentation and issues. Many common questions have already been answered!

Happy building! 🚀
