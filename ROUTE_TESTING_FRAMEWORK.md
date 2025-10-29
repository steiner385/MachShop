# API Route Testing Framework for MachShop

## Overview

This document provides comprehensive guidance for testing API routes in the MachShop Manufacturing Execution System. The framework provides systematic utilities for testing authentication, authorization, request validation, error handling, and integration scenarios.

## Framework Components

### 1. Route Test Helpers (`src/tests/helpers/routeTestHelpers.ts`)

The central testing framework that provides:

- **Authentication Test Utilities**: Mock users with different permission levels
- **Request Testing Utilities**: Standardized request patterns
- **Service Mocking Utilities**: Consistent service mocking patterns
- **Validation Testing Utilities**: Automated validation testing
- **Response Testing Utilities**: Response assertion helpers
- **Database Testing Utilities**: Database setup and cleanup

### 2. Test Examples

The framework includes comprehensive examples for:

- **Unit Route Tests**: `src/tests/routes/workOrders.test.ts`
- **Authorization Tests**: `src/tests/routes/adminUsers.test.ts`
- **Integration Tests**: `src/tests/routes/products.integration.test.ts`

## Quick Start Guide

### Creating a New Route Test

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuthTestHelper,
  RequestTestHelper,
  ServiceMockHelper,
  ResponseTestHelper
} from '../helpers/routeTestHelpers';

describe('My Route Tests', () => {
  let app: express.Application;
  let mockService: any;
  let testUser: any;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(AuthTestHelper.createAuthMiddleware(testUser));
    app.use('/api/my-route', myRouteHandler);

    // Create test user
    testUser = AuthTestHelper.createSupervisorUser();

    // Mock services
    mockService = ServiceMockHelper.createMockService('MyService', ['create', 'get']);

    vi.clearAllMocks();
  });

  it('should create resource successfully', async () => {
    const mockResult = { id: 'test-1', name: 'Test Resource' };
    ServiceMockHelper.mockServiceSuccess(mockService, 'create', mockResult);

    const response = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'post', '/api/my-route', testUser, { name: 'Test Resource' }
    );

    ResponseTestHelper.expectCreatedResponse(response, mockResult);
  });
});
```

## Authentication & Authorization Testing

### User Types Available

```typescript
// Different user permission levels
const operatorUser = AuthTestHelper.createReadOnlyUser();
const supervisorUser = AuthTestHelper.createSupervisorUser();
const managerUser = AuthTestHelper.createManagerUser();
const adminUser = AuthTestHelper.createMockUser({
  roles: ['System Administrator'],
  permissions: ['admin.read', 'admin.write', 'admin.admin']
});
```

### Authorization Test Patterns

```typescript
describe('Authorization Tests', () => {
  it('should return 401 for unauthenticated requests', async () => {
    await RequestTestHelper.testUnauthorizedAccess(app, 'post', '/api/resource');
  });

  it('should return 403 for insufficient permissions', async () => {
    const readOnlyUser = AuthTestHelper.createReadOnlyUser();
    await RequestTestHelper.testForbiddenAccess(
      app, 'post', '/api/resource', readOnlyUser, { data: 'test' }
    );
  });
});
```

## Service Mocking Patterns

### Creating Mock Services

```typescript
// Create mock with specified methods
const mockService = ServiceMockHelper.createMockService('ProductService', [
  'createProduct', 'getProducts', 'updateProduct', 'deleteProduct'
]);

// Mock successful responses
ServiceMockHelper.mockServiceSuccess(mockService, 'createProduct', mockProduct);

// Mock different error types
ServiceMockHelper.mockServiceError(mockService, 'createProduct', new Error('Database error'));
ServiceMockHelper.mockServiceValidationError(mockService, 'createProduct');
ServiceMockHelper.mockServiceNotFoundError(mockService, 'getProducts');
```

## Validation Testing

### Automated Field Validation

```typescript
const validData = { name: 'Test', email: 'test@example.com', age: 25 };

// Test required fields
await ValidationTestHelper.testRequiredFields(
  app, 'post', '/api/users', testUser, validData,
  ['name', 'email']
);

// Test field type validation
await ValidationTestHelper.testInvalidFieldTypes(
  app, 'post', '/api/users', testUser, validData, {
    age: 'invalid-number',
    email: 'invalid-email'
  }
);

// Test field length limits
await ValidationTestHelper.testFieldLimits(
  app, 'post', '/api/users', testUser, validData, {
    name: { min: 2, max: 50 },
    email: { min: 5, max: 100 }
  }
);
```

## Response Testing

### Standard Response Assertions

```typescript
// Success responses
ResponseTestHelper.expectSuccessResponse(response, expectedData);
ResponseTestHelper.expectCreatedResponse(response, createdData);

// Error responses
ResponseTestHelper.expectErrorResponse(response, 400, 'Validation failed');
ResponseTestHelper.expectValidationError(response);

// Paginated responses
ResponseTestHelper.expectPaginatedResponse(response);
```

## Integration Testing

### Full Workflow Testing

Integration tests use real database connections and services (no mocking):

```typescript
describe('Product Lifecycle Integration', () => {
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    // Create real test data
    await testDb.site.create({ data: testSite });
    await testDb.user.create({ data: testUser });
  });

  it('should create, update, and delete product through complete workflow', async () => {
    // Step 1: Create product
    const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'post', '/api/products', testUser, productData
    );
    expect(createResponse.status).toBe(201);

    // Step 2: Retrieve and verify
    const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'get', `/api/products/${createResponse.body.data.id}`, testUser
    );
    expect(getResponse.status).toBe(200);

    // Step 3: Update
    const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'put', `/api/products/${productId}`, testUser, updateData
    );
    expect(updateResponse.status).toBe(200);

    // Step 4: Delete
    const deleteResponse = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'delete', `/api/products/${productId}`, testUser
    );
    expect(deleteResponse.status).toBe(200);
  });
});
```

## Database Testing

### Test Data Management

```typescript
beforeEach(async () => {
  testDb = await setupTestDatabase();

  // Create test site
  testSite = DatabaseTestHelper.createTestSite();
  await testDb.site.create({ data: testSite });
});

afterEach(async () => {
  // Clean up test data
  await DatabaseTestHelper.cleanupTestData(testDb);
});
```

## Error Handling Testing

### Comprehensive Error Scenarios

```typescript
describe('Error Handling', () => {
  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/resource')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');

    expect(response.status).toBe(400);
  });

  it('should handle database constraints', async () => {
    // Create resource
    await RequestTestHelper.makeAuthenticatedRequest(
      app, 'post', '/api/resource', testUser, { uniqueField: 'test' }
    );

    // Try to create duplicate
    const duplicateResponse = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'post', '/api/resource', testUser, { uniqueField: 'test' }
    );

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error).toContain('already exists');
  });

  it('should handle service timeouts', async () => {
    const timeoutError = new Error('Service timeout');
    timeoutError.code = 'TIMEOUT';
    ServiceMockHelper.mockServiceError(mockService, 'getResource', timeoutError);

    const response = await RequestTestHelper.makeAuthenticatedRequest(
      app, 'get', '/api/resource', testUser
    );

    expect(response.status).toBe(504);
  });
});
```

## Best Practices

### 1. Test Organization

- Group tests by HTTP method and functionality
- Use descriptive test names that explain the scenario
- Follow the pattern: "should [action] when [condition]"

### 2. Data Management

- Use `beforeEach` to set up fresh test data
- Use `afterEach` to clean up test data
- Create minimal test data needed for each test

### 3. Mocking Strategy

- Mock external services and dependencies
- Use real database for integration tests
- Mock authentication for unit tests, use real auth for integration tests

### 4. Assertion Patterns

- Test both success and error scenarios
- Verify response status, structure, and content
- Test authentication and authorization for all endpoints

### 5. Coverage Goals

- **Unit Tests**: Focus on individual route behavior with mocked dependencies
- **Integration Tests**: Test complete request flows with real database
- **Authorization Tests**: Verify role-based access control
- **Validation Tests**: Ensure proper input validation

## Running Tests

```bash
# Run all route tests
npm test src/tests/routes/

# Run specific route test
npm test src/tests/routes/workOrders.test.ts

# Run with coverage
npm test src/tests/routes/ --coverage

# Run integration tests only
npm test src/tests/routes/*.integration.test.ts
```

## Test Structure Template

```
src/tests/routes/
├── helpers/
│   └── routeTestHelpers.ts          # Testing framework utilities
├── [resource].test.ts               # Unit tests with mocking
├── [resource].integration.test.ts   # Integration tests with real DB
└── admin/
    └── [adminResource].test.ts      # Admin route tests with RBAC
```

## Environment Setup

Ensure these environment variables are set for testing:

```bash
JWT_SECRET=test-secret-that-is-at-least-32-characters-long
SESSION_SECRET=test-session-secret-that-is-at-least-32-characters-long
DATABASE_URL=postgresql://mes_user:mes_password@localhost:5432/mes_test
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed and paths are correct
2. **Database Connection**: Verify test database is running and accessible
3. **Authentication Failures**: Check JWT_SECRET is set and tokens are valid
4. **Mock Issues**: Ensure mocks are created before tests and cleared after

### Debug Tips

- Use `console.log(response.body)` to inspect actual response structure
- Check test database state with direct queries if needed
- Verify mock calls with `expect(mockService.method).toHaveBeenCalledWith(...)`
- Use `.only()` to run single tests during debugging

## Extension Points

The framework is designed to be extensible:

- Add new user types in `AuthTestHelper`
- Create new validation patterns in `ValidationTestHelper`
- Add new response types in `ResponseTestHelper`
- Extend database utilities in `DatabaseTestHelper`

## Future Enhancements

Planned improvements:

1. **Performance Testing**: Add utilities for load and performance testing
2. **API Documentation Generation**: Auto-generate API docs from tests
3. **Contract Testing**: Add schema validation and contract testing
4. **Test Data Factory**: Advanced test data generation utilities
5. **Real-time Testing**: WebSocket and real-time endpoint testing

## Contributing

When adding new route tests:

1. Follow the established patterns and naming conventions
2. Include both unit and integration test scenarios
3. Test authentication, authorization, validation, and error handling
4. Update this documentation for any new patterns or utilities
5. Ensure tests are deterministic and can run in parallel

This framework provides a solid foundation for comprehensive API testing in the MachShop application, ensuring reliability, security, and maintainability of the manufacturing execution system.