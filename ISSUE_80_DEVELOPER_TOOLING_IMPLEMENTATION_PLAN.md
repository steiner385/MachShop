# Issue #80: SDK Developer Tooling & Testing Framework
## Comprehensive Implementation Plan

**Issue:** SDK: Developer Tooling & Testing Framework for Plugin Development
**Priority:** L3 (Refinements & Advanced Tools)
**Depends On:** Issue #75 (Plugin & Hook System Architecture) - ✅ COMPLETED
**Estimated Effort:** 6/10
**Business Value:** 5/10

---

## Executive Summary

Issue #80 is a **comprehensive developer experience initiative** aimed at making plugin development for the MES platform accessible, efficient, and reliable. The issue requires building complete tooling infrastructure with:

- **CLI Tool** for plugin scaffolding, development, testing, and deployment
- **Testing Framework** with unit, integration, contract, and performance testing
- **Local Development Environment** with hot reload and mock API
- **Debugging Tools** for inspection and troubleshooting
- **CI/CD Integration** with GitHub Actions
- **Code Quality Tools** including ESLint and TypeScript definitions

This is a **multi-phase initiative** requiring ~60-80 development days for complete implementation.

---

## Implementation Strategy

### Phase Approach
Rather than implementing all features simultaneously, we break into **6 strategic phases**:

- **Phase 1 (NOW)**: Foundation & Core Infrastructure
- **Phase 2**: Enhanced Testing Framework
- **Phase 3**: Code Quality & Linting
- **Phase 4**: Advanced Tooling
- **Phase 5**: Documentation & Examples
- **Phase 6**: Performance & Optimization

---

## Phase 1: Foundation & Core Infrastructure (THIS PR)

### Goals
- Establish CLI package structure
- Implement plugin scaffolding
- Create mock MES API server
- Basic testing utilities
- CI/CD integration example
- Comprehensive documentation

### Components

#### 1.1 CLI Package Structure (`packages/cli/`)

```
packages/cli/
├── package.json                          # CLI package config
├── src/
│   ├── index.ts                         # Public API exports
│   ├── bin/
│   │   └── cli.ts                       # CLI entry point
│   ├── commands/
│   │   ├── create.ts                    # Plugin scaffolding
│   │   ├── dev.ts                       # Dev server
│   │   ├── build.ts                     # Build plugin
│   │   ├── test.ts                      # Run tests
│   │   ├── publish.ts                   # Publish plugin
│   │   ├── validate.ts                  # Validate manifest
│   │   ├── logs.ts                      # View logs
│   │   ├── setup.ts                     # Setup environment
│   │   └── webhook.ts                   # Webhook tunnel
│   ├── dev-server/
│   │   ├── server.ts                    # Dev server implementation
│   │   ├── hot-reload.ts                # Hot reload functionality
│   │   └── middleware.ts                # Express middleware
│   ├── templates/
│   │   ├── generator.ts                 # Template scaffolder
│   │   ├── minimal/                     # Minimal template
│   │   ├── workflow-hook/               # Workflow hook template
│   │   ├── ui-widget/                   # UI widget template
│   │   └── full-featured/               # Full-featured template
│   ├── testing/
│   │   ├── unit/
│   │   │   ├── mock-server.ts          # Mock MES API
│   │   │   ├── test-utils.ts           # Test utilities
│   │   │   └── test-context.ts         # Hook context mocking
│   │   └── integration/
│   │       ├── test-client.ts          # MES test client
│   │       ├── test-fixtures.ts        # Test data
│   │       └── scenarios.ts            # Common test scenarios
│   ├── utils/
│   │   ├── logger.ts                    # Logging utilities
│   │   ├── manifest-validator.ts        # Manifest validation
│   │   ├── env-setup.ts                 # Environment setup
│   │   └── performance.ts               # Performance utilities
│   └── types/
│       └── index.ts                     # TypeScript definitions
├── tests/
│   ├── unit/
│   │   ├── cli.test.ts
│   │   ├── scaffolder.test.ts
│   │   └── mock-server.test.ts
│   └── integration/
│       ├── workflow.test.ts
│       └── e2e.test.ts
└── README.md                            # Package documentation
```

#### 1.2 CLI Commands Implemented

**Plugin Scaffolding:**
```bash
mes plugin create my-plugin --template=workflow-hook
mes plugin create my-widget --template=ui-dashboard
mes plugin create my-integration --template=data-integration
mes plugin create my-report --template=custom-report
```

**Development:**
```bash
mes dev                        # Start dev server with hot reload
mes dev --watch               # Enable file watching
mes dev --mes-url http://...  # Use custom MES URL
```

**Testing & Validation:**
```bash
mes test                       # Run unit tests
mes test --coverage            # Generate coverage report
mes test --integration         # Run integration tests
mes validate                   # Validate plugin manifest
```

**Deployment:**
```bash
mes build                      # Build plugin for production
mes publish                    # Publish to registry
mes logs <plugin-id>          # View plugin logs
```

#### 1.3 Mock MES API Server

Simulates MES REST API locally for testing without live API:

```typescript
import { MockMESServer } from '@mes/cli';

const server = new MockMESServer();
await server.start();

// Configure mock responses
server.get('/api/v2/work-orders/:id', {
  status: 200,
  body: { id: 'WO-001', status: 'IN_PROGRESS' }
});

// Test against mock
const response = await fetch(server.url + '/api/v2/work-orders/WO-001');
const workOrder = await response.json();

// Assert requests
expect(server.requests).toHaveLength(1);
expect(server.requests[0].path).toBe('/api/v2/work-orders/WO-001');

await server.stop();
```

#### 1.4 Testing Framework

**Unit Testing Utilities:**

```typescript
import { createHookContext, testHook } from '@mes/cli';

describe('Hook Tests', () => {
  test('validates work order before creation', async () => {
    const context = createHookContext('workOrder.beforeCreate', {
      data: { priority: 'CRITICAL' },
      user: { id: 'user-123', roles: ['engineer'] }
    });

    const result = await testHook(myPlugin.beforeCreate, context);

    expect(result.rejected).toBe(true);
    expect(result.reason).toContain('engineering approval');
  });
});
```

**Integration Testing:**

```typescript
import { MESTestClient } from '@mes/cli';

describe('Integration Tests', () => {
  const client = new MESTestClient({
    apiUrl: 'https://test.mes.com',
    apiKey: process.env.TEST_API_KEY
  });

  test('plugin creates work order successfully', async () => {
    // Install plugin
    await client.plugins.install('my-plugin', { version: '1.0.0' });

    // Create work order (triggers plugin hooks)
    const workOrder = await client.workOrders.create({
      partNumber: 'PART-001',
      quantity: 10
    });

    // Assert plugin executed
    expect(workOrder.customField).toBe('added-by-plugin');
  });
});
```

#### 1.5 Project Templates

Four starter templates included:

1. **Minimal** - Basic plugin scaffold
2. **Workflow Hook** - Hook into work order lifecycle
3. **UI Dashboard** - React dashboard widget
4. **Full-Featured** - All hook types + UI + tests

Each template includes:
- `manifest.json` - Plugin configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `.mesrc` - CLI config
- `src/` - Source code
- `tests/` - Test suite
- `docs/` - Documentation
- `.github/workflows/` - CI/CD

#### 1.6 CI/CD Integration

**GitHub Actions Workflow Example:**

```yaml
name: Plugin CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test

      - name: Integration tests
        run: npm run test:integration
        env:
          MES_API_URL: ${{ secrets.MES_TEST_URL }}
          MES_API_KEY: ${{ secrets.MES_TEST_KEY }}

      - name: Build plugin
        run: npm run build

      - name: Validate manifest
        run: mes validate

  publish:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and package
        run: |
          npm run build
          mes package

      - name: Publish to registry
        run: mes publish
        env:
          MES_API_KEY: ${{ secrets.MES_REGISTRY_KEY }}
```

#### 1.7 Debugging Tools

**Debug Mode:**
```bash
mes dev --debug
# Enables:
# - Verbose logging
# - Step-through hook execution
# - Request/response inspection
# - Performance timing
```

**Logging Utilities:**
```typescript
import { logger } from '@mes/cli';

logger.debug('Hook context', { workOrderId: 'WO-001' });
logger.info('Hook executed successfully', { duration: 45 });
logger.warn('Slow hook execution', { duration: 500 });
logger.error('Hook failed', { reason: 'Missing field' });
```

**Webhook Testing Tunnel:**
```bash
mes webhook tunnel --port 4001
# Outputs:
# Webhook URL: https://mes-webhooks-abc123.tunnel.com
# Forwarding to: http://localhost:4001/webhook
```

### Deliverables

- **CLI Package** (`packages/cli/`) with ~2,500 lines of TypeScript
- **Core Commands** - Plugin create, dev, build, test, publish, validate, logs
- **Mock Server** - Simulates MES API with configurable responses
- **Testing Framework** - Unit, integration, and E2E testing utilities
- **Project Templates** - 4 starter templates for common plugin types
- **CI/CD Examples** - GitHub Actions workflow with test, build, publish stages
- **Documentation** - Complete CLI reference, testing guide, setup instructions
- **Tests** - >80% coverage for CLI core functionality

### Acceptance Criteria for Phase 1

- ✅ CLI installable via npm as `@mes/cli`
- ✅ `mes plugin create` generates working starter project
- ✅ Mock API server accurately simulates MES endpoints
- ✅ Unit testing utilities work with Jest/Vitest
- ✅ Integration testing against real MES API works
- ✅ GitHub Actions CI/CD workflow example functional
- ✅ Debug mode provides verbose logging and inspection
- ✅ TypeScript type definitions complete
- ✅ Tests passing with >80% coverage
- ✅ Comprehensive documentation

---

## Phase 2: Enhanced Testing Framework

### Features
- Contract testing (API specification validation)
- Performance testing with benchmarks
- Test data generators
- Mock response recorder
- Snapshot testing
- Visual regression testing

**Estimated:** 2-3 weeks

---

## Phase 3: Code Quality & Linting

### Features
- ESLint plugin with MES-specific rules
- Automated code quality checks
- TypeScript strict mode enforcement
- Performance linting
- Security linting

**Estimated:** 2 weeks

---

## Phase 4: Advanced Tooling

### Features
- Webhook tunnel with ngrok integration
- Performance profiler
- Memory usage analyzer
- API call recorder/replay
- Plugin dependency analyzer
- Bundle size analyzer

**Estimated:** 3 weeks

---

## Phase 5: Documentation & Examples

### Deliverables
- Complete CLI command reference
- Testing best practices guide
- Debugging guide with common issues
- Performance optimization guide
- Video tutorials
- Code examples for all features

**Estimated:** 2-3 weeks

---

## Phase 6: Performance & Optimization

### Focus Areas
- CLI startup time optimization
- Build performance improvements
- Test execution speed optimization
- Memory footprint reduction
- Caching strategies

**Estimated:** 1-2 weeks

---

## Technical Stack

### Core Technologies
- **Language:** TypeScript 5.x (strict mode)
- **CLI Framework:** oclif or Commander.js
- **Build Tool:** esbuild (fast, minimal dependencies)
- **Test Framework:** Vitest (faster than Jest)
- **Mock Server:** Mock Service Worker (msw) or express
- **Logging:** pino or winston
- **CLI Utilities:** chalk, enquirer, ora, yargs

### Dependencies
```json
{
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "enquirer": "^2.4.1",
    "fs-extra": "^11.2.0",
    "oclif": "^4.1.2",
    "ora": "^8.0.1",
    "msw": "^1.3.0",
    "pino": "^8.17.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "esbuild": "^0.20.2",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  }
}
```

---

## Integration Points

### With Existing Systems
- **Plugin System (#75):** CLI tools developers to create and test plugins
- **API Versioning (#76):** Testing framework validates version compatibility
- **Developer Portal (#77):** CLI guides developers to docs
- **Plugin Registry (#79):** CLI publishes plugins to registry

### With External Systems
- **GitHub:** Pre-commit hooks, CI/CD workflows
- **npm Registry:** CLI distribution and dependencies
- **Docker:** Development environment containerization
- **ngrok:** Webhook tunneling for local testing

---

## Success Metrics

### Developer Experience
- Measure time from "zero" to running first plugin
- Track CLI command adoption rates
- Monitor developer satisfaction scores
- Reduce plugin development time by 40-60%

### Quality
- >90% test coverage for CLI
- All template projects pass CI/CD
- <5% of plugins fail registry validation
- Zero critical bugs in CLI tooling

### Adoption
- 50+ downloads of CLI in first month
- 80%+ of plugins use recommended patterns
- Average plugin quality score improvement

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|-----------|
| Mock server doesn't match real API | Synchronize mock responses with API specs; add validation tests |
| CLI usability challenges | Conduct UX testing with sample developers; iterate UI |
| Windows compatibility issues | Test on Windows CI; handle path differences |
| Performance issues | Profile startup time; optimize with esbuild |
| Dependency security vulnerabilities | Use npm audit; pin versions; regular updates |

### Business Risks
| Risk | Mitigation |
|------|-----------|
| Low adoption if hard to use | Extensive documentation; video tutorials; support channels |
| Competing community tools emerge | Differentiate with MES-specific features; maintain high quality |
| Support burden for new tool | Automated troubleshooting; self-service docs; active community |

---

## Timeline

### Phase 1 (Current)
- **Duration:** 3-4 weeks
- **Effort:** ~6 developer-weeks
- **Target:** Deliver core CLI, testing framework, basic templates

### Phases 2-6
- **Duration:** 10-12 weeks additional
- **Effort:** ~24 developer-weeks
- **Target:** Complete tooling suite with advanced features

**Total Timeline:** ~4 months
**Total Effort:** ~30 developer-weeks

---

## Budget & Resources

### Phase 1 (This PR)
- **Dev Time:** 1 developer, 3-4 weeks
- **QA/Testing:** 1 QA, 1-2 weeks
- **Documentation:** 0.5 technical writer, 1 week
- **Total:** ~6 developer-weeks

### Full Implementation (All Phases)
- **Dev Time:** 2 developers, 10-12 weeks
- **QA/Testing:** 1 QA, 4-6 weeks
- **Documentation:** 1 technical writer, 4-6 weeks
- **Total:** ~30 developer-weeks

---

## Success Criteria

This issue is **COMPLETE when:**

1. ✅ CLI package published to npm
2. ✅ `mes plugin create` generates functional starter projects
3. ✅ Mock API server enables local development without real API
4. ✅ Unit/integration testing framework functional
5. ✅ GitHub Actions CI/CD example working
6. ✅ Documentation covers all features
7. ✅ >80% test coverage for tooling
8. ✅ 4 project templates provided
9. ✅ Debugging and logging tools functional
10. ✅ PR merged and issue closed

---

## Future Enhancements (Post-Phase 1)

- Webhook tunnel integration
- ESLint plugin with MES-specific rules
- Auto-documentation generation
- Performance benchmarking suite
- Advanced plugin registry integration
- IDE plugin (VS Code extension)
- UI builder for dashboard widgets
- Storybook integration for component development
- E2E testing framework for UI plugins
- Plugin marketplace with ratings/reviews

---

## Related Documentation

- Plugin System Architecture: `docs/PLUGIN_SYSTEM_README.md`
- Hook Points Reference: `docs/HOOK_POINTS.md`
- Plugin API Reference: `docs/PLUGIN_API_REFERENCE.md`
- Plugin Development Guide: `docs/PLUGIN_DEVELOPMENT_GUIDE.md`
- Example Plugins: `docs/examples/`

---

**Generated:** October 31, 2025
**Author:** Claude Code
**Status:** Implementation Plan - Phase 1 Ready
