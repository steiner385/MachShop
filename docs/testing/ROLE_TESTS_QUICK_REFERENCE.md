# Role-Based Tests - Quick Reference

**Quick command reference for running role-based E2E tests**

---

## 🚀 Quick Start

```bash
# Run ALL role tests with HTML report
npm run test:roles:report
```

---

## 📋 By Tier

```bash
# Tier 1 - Production (P0 - CRITICAL)
npm run test:roles:tier1

# Tier 2 - Quality & Compliance (P1 - HIGH)
npm run test:roles:tier2

# Tier 3 - Materials & Logistics (P1 - HIGH)
npm run test:roles:tier3

# Tier 4 - Maintenance (P2 - MEDIUM)
npm run test:roles:tier4

# Tier 5 - Administration (P2 - MEDIUM)
npm run test:roles:tier5
```

---

## 👤 By Role Category

```bash
# All Production roles
npm run test:roles:production

# All Quality roles
npm run test:roles:quality

# DCMA Inspector only
npm run test:roles:dcma

# Compliance-focused tests
npm run test:roles:compliance
```

---

## 🎯 Individual Role Tests

```bash
# Production
npx playwright test src/tests/e2e/roles/production-operator.spec.ts
npx playwright test src/tests/e2e/roles/production-supervisor.spec.ts
npx playwright test src/tests/e2e/roles/production-planner.spec.ts
npx playwright test src/tests/e2e/roles/production-scheduler.spec.ts
npx playwright test src/tests/e2e/roles/manufacturing-engineer.spec.ts

# Quality & Compliance
npx playwright test src/tests/e2e/roles/quality-engineer.spec.ts
npx playwright test src/tests/e2e/roles/quality-inspector.spec.ts
npx playwright test src/tests/e2e/roles/dcma-inspector.spec.ts
npx playwright test src/tests/e2e/roles/process-engineer.spec.ts

# Materials & Logistics
npx playwright test src/tests/e2e/roles/warehouse-manager.spec.ts
npx playwright test src/tests/e2e/roles/materials-handler.spec.ts
npx playwright test src/tests/e2e/roles/shipping-receiving.spec.ts
npx playwright test src/tests/e2e/roles/logistics-coordinator.spec.ts

# Maintenance
npx playwright test src/tests/e2e/roles/maintenance-technician.spec.ts
npx playwright test src/tests/e2e/roles/maintenance-supervisor.spec.ts

# Administration
npx playwright test src/tests/e2e/roles/plant-manager.spec.ts
npx playwright test src/tests/e2e/roles/system-administrator.spec.ts
npx playwright test src/tests/e2e/roles/superuser.spec.ts
npx playwright test src/tests/e2e/roles/inventory-control-specialist.spec.ts
```

---

## 🔍 By Test Type

```bash
# Authentication tests only
npx playwright test src/tests/e2e/roles/ --grep="AUTH-"

# Permission boundary tests
npx playwright test src/tests/e2e/roles/ --grep="PERM-"

# CRUD operation tests
npx playwright test src/tests/e2e/roles/ --grep="CRUD-"

# Workflow tests
npx playwright test src/tests/e2e/roles/ --grep="WORK-"

# Compliance & audit tests
npx playwright test src/tests/e2e/roles/ --grep="AUDIT-"
```

---

## 🐛 Debugging

```bash
# Run in headed mode (see browser)
npx playwright test src/tests/e2e/roles/production-operator.spec.ts --headed

# Run in debug mode (step through)
npx playwright test src/tests/e2e/roles/production-operator.spec.ts --debug

# Run with trace
npx playwright test src/tests/e2e/roles/ --trace=on

# View trace file
npx playwright show-trace trace.zip
```

---

## 📊 Reports

```bash
# HTML report (recommended)
npx playwright test src/tests/e2e/roles/ --reporter=html
npx playwright show-report

# JUnit XML (for CI)
npx playwright test src/tests/e2e/roles/ --reporter=junit

# JSON report
npx playwright test src/tests/e2e/roles/ --reporter=json

# List reporter (detailed console output)
npx playwright test src/tests/e2e/roles/ --reporter=list
```

---

## ⚡ Performance

```bash
# Run in parallel (max workers)
npx playwright test src/tests/e2e/roles/ --workers=100%

# Run sequentially (debugging)
npx playwright test src/tests/e2e/roles/ --workers=1

# Increase timeout
npx playwright test src/tests/e2e/roles/ --timeout=60000
```

---

## 🔧 Troubleshooting

```bash
# Kill process on port 3101 (backend)
sudo lsof -ti:3101 | xargs kill -9

# Kill process on port 5278 (frontend)
sudo lsof -ti:5278 | xargs kill -9

# Reset E2E database
npm run test:e2e:db:reset

# Check TypeScript compilation
npx tsc --noEmit src/tests/e2e/roles/*.spec.ts
```

---

## 📚 Documentation

- **Test Scenarios**: `docs/testing/ROLE_BASED_TEST_SCENARIOS.md`
- **Execution Guide**: `docs/testing/ROLE_BASED_TESTING_EXECUTION_GUIDE.md`
- **Implementation Summary**: `docs/testing/ROLE_BASED_TESTING_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference**: This file

---

## 📦 Test Files

```
src/tests/e2e/roles/
├── production-operator.spec.ts
├── production-supervisor.spec.ts
├── production-planner.spec.ts
├── production-scheduler.spec.ts
├── manufacturing-engineer.spec.ts
├── quality-engineer.spec.ts
├── quality-inspector.spec.ts
├── dcma-inspector.spec.ts
├── process-engineer.spec.ts
├── warehouse-manager.spec.ts
├── materials-handler.spec.ts
├── shipping-receiving.spec.ts
├── logistics-coordinator.spec.ts
├── maintenance-technician.spec.ts
├── maintenance-supervisor.spec.ts
├── plant-manager.spec.ts
├── system-administrator.spec.ts
├── superuser.spec.ts
└── inventory-control-specialist.spec.ts
```

---

## ✅ Pre-Deployment Checklist

```bash
# 1. Run critical tests (Tier 1)
npm run test:roles:tier1

# 2. Run compliance tests
npm run test:roles:compliance

# 3. Run all role tests
npm run test:roles:report

# 4. Verify report shows all passing
npx playwright show-report
```

---

## 🎯 Common Use Cases

### DCMA Audit Preparation
```bash
npm run test:roles:dcma
npm run test:roles:compliance
npx playwright test src/tests/e2e/roles/quality-*.spec.ts --grep="AUDIT"
```

### Security Audit
```bash
npx playwright test src/tests/e2e/roles/ --grep="PERM-"
npx playwright test src/tests/e2e/roles/dcma-inspector.spec.ts
npx playwright test src/tests/e2e/roles/plant-manager.spec.ts
```

### New Feature Validation (Routing)
```bash
npx playwright test src/tests/e2e/roles/manufacturing-engineer.spec.ts
npx playwright test src/tests/e2e/roles/production-planner.spec.ts
```

---

**Last Updated**: October 19, 2025
