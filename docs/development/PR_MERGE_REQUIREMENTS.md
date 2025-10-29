# Pull Request Merge Requirements

## Overview

This document outlines the automated testing requirements and protection rules that must be satisfied before any pull request can be merged into the main branch. These requirements ensure code quality, prevent regressions, and maintain system stability.

**Implementation Date**: Issue #138 - Testing Infrastructure: Enforce Passing Unit Tests as PR Merge Requirement
**Status**: ✅ ACTIVE - All protection rules are now enforced

## Branch Protection Rules

The main branch is protected with the following requirements:

### Required Status Checks

All pull requests must pass these CI/CD checks before merge:

1. **Lint and Type Check** (`lint`)
   - ESLint validation
   - TypeScript type checking
   - Code formatting verification

2. **Unit & Integration Tests** (`test-unit`)
   - All unit tests must pass
   - All integration tests must pass
   - JWT secret validation
   - Database connectivity tests

3. **End-to-End Tests** (`test-e2e`)
   - Full application workflow testing
   - Browser automation tests
   - API integration validation

### Additional Protection Rules

- **Required Reviews**: At least 1 approving review required
- **Dismiss Stale Reviews**: Reviews are dismissed when new commits are pushed
- **Conversation Resolution**: All PR conversations must be resolved
- **Admin Enforcement**: Rules apply to administrators as well
- **Force Push Protection**: Force pushes to main branch are blocked
- **Branch Deletion Protection**: Main branch cannot be deleted

## CI/CD Pipeline Details

### Workflow File
The automated testing is configured in `.github/workflows/ci-build-test.yml`

### Test Coverage Reporting
- **Tool**: Codecov integration
- **Trigger**: Runs automatically with unit tests
- **Reports**: Coverage reports are posted as PR comments
- **Visibility**: Coverage trends are tracked over time

### Environment Setup
Tests run in isolated environments with:
- Ubuntu latest runners
- Node.js environment
- PostgreSQL test database
- Redis cache (if needed)
- Proper environment variables

## Required Test Categories

### 1. Unit Tests
**Location**: `src/tests/services/`, `src/tests/unit/`
**Command**: `npm test`

Must include tests for:
- Service layer functionality
- Business logic validation
- Data transformation
- Error handling
- Authentication/authorization

### 2. Integration Tests
**Location**: `src/tests/integration/`
**Command**: `npm test`

Must include tests for:
- Database operations
- API endpoint functionality
- Service-to-service communication
- External system integrations

### 3. End-to-End Tests
**Location**: `src/tests/e2e/`
**Command**: `npm run test:e2e`

Must include tests for:
- Complete user workflows
- Browser interactions
- API integration flows
- Critical business processes

## Developer Workflow

### Creating a Pull Request

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Changes**
   - Write code following project standards
   - Add/update tests for new functionality
   - Ensure all existing tests still pass

3. **Local Testing**
   ```bash
   # Run linting
   npm run lint

   # Run unit tests
   npm test

   # Run e2e tests (optional locally)
   npm run test:e2e
   ```

4. **Create Pull Request**
   - Push branch to repository
   - Create PR with descriptive title and description
   - Link any related issues

### Pull Request Checks

When you create a PR, the following automated checks will run:

1. **Lint Check** - Ensures code style compliance
2. **Unit Tests** - Validates functionality and business logic
3. **E2E Tests** - Confirms end-to-end workflows
4. **Code Coverage** - Reports test coverage metrics
5. **Security Scanning** - Checks for vulnerabilities

### Merge Requirements

Before your PR can be merged:

- ✅ All required status checks must pass
- ✅ At least 1 approving review required
- ✅ All conversations must be resolved
- ✅ Branch must be up-to-date with main

### Handling Test Failures

If any tests fail:

1. **Review the failure logs** in the GitHub Actions tab
2. **Fix the issue** in your feature branch
3. **Push the fix** - this will automatically retrigger all checks
4. **Monitor the re-run** to ensure all tests pass

## Test Environment Configuration

### Environment Variables
Tests require these environment variables:
```bash
# Required for all tests
JWT_SECRET=test-secret-that-is-at-least-32-characters-long
NODE_ENV=test

# Database tests
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Optional for specific test suites
REDIS_URL=redis://localhost:6379
```

### Database Setup
- Test database is automatically provisioned in CI
- Local development requires PostgreSQL installation
- Migrations run automatically before tests

## Security and Quality Gates

### Code Coverage Requirements
- **Minimum Coverage**: Tracked and reported via Codecov
- **Coverage Reports**: Available on each PR
- **Trend Analysis**: Coverage changes highlighted in PR comments

### Security Scanning
- **Dependency Scanning**: Automated vulnerability detection
- **Code Analysis**: Static analysis for security issues
- **Container Scanning**: Docker image security validation

### Performance Monitoring
- **Test Execution Time**: Monitored and reported
- **Build Performance**: Tracked for optimization opportunities
- **Resource Usage**: Memory and CPU utilization monitoring

## Troubleshooting

### Common Test Failures

#### 1. Unit Test Failures
```bash
# Check specific test file
npm test src/tests/services/YourService.test.ts

# Run with verbose output
npm test -- --verbose
```

#### 2. Integration Test Failures
- Verify database connectivity
- Check environment variable configuration
- Ensure test data setup is correct

#### 3. E2E Test Failures
- Check for timing issues
- Verify test environment setup
- Review browser console logs

#### 4. Linting Failures
```bash
# Auto-fix linting issues
npm run lint:fix

# Check specific files
npm run lint src/your-file.ts
```

### Getting Help

1. **Check the CI logs** for detailed error messages
2. **Review this documentation** for configuration requirements
3. **Ask team members** for assistance with complex issues
4. **Update tests** if requirements have changed

## Maintenance

### Updating Test Requirements

When modifying test requirements:

1. Update this documentation
2. Modify `.github/workflows/ci-build-test.yml` if needed
3. Update branch protection rules via GitHub API if necessary
4. Communicate changes to the development team

### Monitoring and Metrics

- **Test Success Rate**: Tracked via GitHub Actions
- **Mean Time to Merge**: Monitored for process efficiency
- **Test Coverage Trends**: Analyzed for quality improvements
- **Failure Analysis**: Regular review of common failure patterns

---

## Implementation Details

This protection was implemented as part of Issue #138 with the following changes:

1. **Branch Protection API Configuration**:
   ```json
   {
     "required_status_checks": {
       "strict": true,
       "contexts": ["lint", "test-unit", "test-e2e"]
     },
     "enforce_admins": true,
     "required_pull_request_reviews": {
       "required_approving_review_count": 1,
       "dismiss_stale_reviews": true
     },
     "required_conversation_resolution": true
   }
   ```

2. **Existing CI Integration**: Leveraged existing comprehensive CI workflow
3. **Coverage Reporting**: Utilized existing Codecov integration
4. **Security Scanning**: Maintained existing Trivy and dependency scanning

**Last Updated**: October 29, 2025
**Version**: 1.0
**Implemented by**: Issue #138 - Testing Infrastructure Enhancement