---
title: "Replace Hardcoded localhost URLs with Environment Variables"
labels: ["api-integration", "high-priority", "phase-5-api", "configuration", "technical-debt", "high-priority", "ui-assessment"]
---

## API Integration Issue

**Issue Type:**
- [x] Hardcoded URLs/endpoints
- [ ] Missing error handling
- [ ] Mock data in production code
- [x] Environment configuration issues

**Affected Files:**
- `api/signatures.ts (2 instances)`
- `api/fai.ts (2 instances)`

## Assessment Reference
**Assessment Report:** Phase 5 - API Integration Analysis
**Details:**
- Issue Count: 2
- Severity: HIGH
- Category: Configuration Issues

## Current Implementation
4 hardcoded localhost URLs found during Phase 5 API integration analysis. These URLs make deployment difficult and should use environment variables.

## Problems Identified
- [x] Hardcoded localhost URLs make deployment difficult
- [ ] Missing error handling reduces user experience
- [ ] Mock data in production affects functionality
- [ ] No retry logic for failed requests
- [x] Inconsistent API call patterns

## Recommended Solution

### Configuration Improvements
- [x] Replace hardcoded URLs with environment variables
- [x] Use centralized API configuration
- [x] Implement proper environment handling

## Environment Variables Needed
```
REACT_APP_API_BASE_URL
REACT_APP_API_TIMEOUT
REACT_APP_API_RETRY_ATTEMPTS
```

## Specific URLs to Replace
- `http://localhost:3001/api/v1 in api/signatures.ts`
- `http://localhost:3001/api/v1 in api/fai.ts`