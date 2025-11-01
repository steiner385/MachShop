# Developer Personas - Quick Reference Guide

**Framework**: Extension Framework v2.0
**Date**: November 1, 2025
**Status**: Production Ready

---

## Quick Navigation

- 👨‍💼 **[Platform Developer](#platform-developer)** - Framework maintainers (Internal)
- 👨‍💻 **[Extension Developer](#extension-developer)** - Feature builders (Internal/Partner)
- 🔗 **[Third-Party Developer](#third-party-developer)** - API consumers (External)

---

## Platform Developer

### 👨‍💼 Role & Profile

| Aspect | Details |
|--------|---------|
| **Title** | Framework Architect / Platform Lead |
| **Organization** | Internal MachShop Engineering Team |
| **Expertise Level** | Expert / Advanced |
| **Team Size** | 2-3 FTE |
| **Onboarding** | 2-3 weeks |

### 🎯 Primary Goals

1. **Framework Stability**: 99.9% uptime, zero critical vulnerabilities
2. **Performance**: Sub-second component init, 40-50% better than targets
3. **Scalability**: Support 50+ concurrent extensions per site
4. **Security**: OWASP 10/10, WCAG 13/13 compliance
5. **Ecosystem**: Enable 500+ extensions in Year 3

### 📚 Key Responsibilities

- Maintain framework core (7 packages)
- Manage foundational extensions
- Infrastructure and DevOps
- Security audits and patches
- Performance monitoring
- API stability and versioning
- Developer mentorship

### 🔐 Access & Permissions

| Resource | Access Level |
|----------|--------------|
| Framework Source | ✅ Full read/write |
| Framework APIs | ✅ All (public + internal) |
| Foundational Extensions | ✅ Full control |
| Registry Admin | ✅ Full control |
| Production Deployment | ✅ Full access |
| Security Scanning | ✅ Full access |

### 📖 Core Documentation

- **DEVELOPER_PERSONAS.md** → Platform Developer section
- **SDK_ISSUES_ALIGNMENT_ASSESSMENT.md** → L0 Foundation issues
- **PHASE_4H_PRODUCTION_READINESS.md** → Quality standards

### 💡 Current Coverage: 90%

**Complete**:
- ✅ Framework infrastructure (L0)
- ✅ Governance & compliance
- ✅ Multi-site deployment
- ✅ Core UI foundation

**Needs Work** (8-12 weeks):
- ⚠️ Security model formalization (#438)
- ⚠️ Extension lifecycle management (#435)

### 📊 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Framework Uptime | 99.9% | 100% ✅ |
| Critical Vulns | 0 | 0 ✅ |
| Code Coverage | 85%+ | 85%+ ✅ |
| Test Count | 400+ | 487+ ✅ |
| WCAG Compliance | 100% | 100% ✅ |

### 🛠️ Tools & Environment

**Development Stack**:
- TypeScript (strict mode)
- React 18.2+
- Zustand (state management)
- Jest (testing)
- ESLint + Prettier
- GitHub (version control)

**Key Tools**:
- Performance profiler (Chrome DevTools)
- Security scanner (npm audit, OWASP)
- Monitoring (APM, error tracking)
- CI/CD (GitHub Actions)
- Bundle analyzer (Webpack)

### 📞 Support Resources

- **Slack**: #framework-dev (internal)
- **Meetings**: Weekly architecture sync
- **Escalation**: RFC process for major changes
- **Documentation**: Architecture Decision Records (ADRs)

---

## Extension Developer

### 👨‍💻 Role & Profile

| Aspect | Details |
|--------|---------|
| **Title** | Feature Developer / Extension Creator |
| **Organization** | Internal or Partner Team |
| **Expertise Level** | Intermediate / Advanced |
| **Team Size** | 1-5 FTE per extension |
| **Onboarding** | 6-12 hours |

### 🎯 Primary Goals

1. **Ship Extensions**: Deploy to production in < 2 weeks
2. **Quality**: 90%+ test coverage, zero critical issues
3. **Accessibility**: WCAG compliance verified
4. **Performance**: Meet all performance budgets
5. **Maintainability**: Build stable, long-lived extensions

### 📚 Key Responsibilities

- Implement features as extensions
- Design extension architecture
- Build UI components
- Write tests and validation
- Deploy and monitor extensions
- Integrate with other extensions
- Follow framework standards

### 🔐 Access & Permissions

| Resource | Access Level |
|----------|--------------|
| Framework Source | ✅ Read (reference) |
| Framework APIs | ✅ Public + internal |
| Extension Code | ✅ Full control |
| Registry Publishing | ✅ For own extensions |
| Marketplace Analytics | ✅ For own extensions |
| Production Deploy | ✅ For own extensions |

### 📖 Core Documentation

- **DEVELOPER_INTEGRATION_GUIDE.md** (2,500+ lines) → Main reference
- **DEVELOPER_TROUBLESHOOTING.md** (2,000+ lines) → Problem solving
- **DEVELOPER_PERSONAS.md** → Extension Developer section
- **SDK_ISSUES_ALIGNMENT_ASSESSMENT.md** → L1-L2 issues

### 💡 Current Coverage: 80%

**Complete**:
- ✅ UI framework (Phase 3) - comprehensive
- ✅ Component patterns
- ✅ Navigation framework
- ✅ Component overrides
- ✅ Testing (UI)
- ✅ Documentation

**Needs Work** (8-12 weeks):
- ⚠️ Backend testing framework (#434)
- ⚠️ Developer CLI & tooling (#436) - **PRIORITY**
- ⚠️ Comprehensive documentation (#437)
- ⚠️ Lifecycle management (#435)

### 📊 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Onboarding Time | < 6 hours | 6-12 hours |
| Time to First Extension | 1 day | 1-2 days |
| Test Coverage | 90%+ | Achievable |
| Deployment Time | < 10 min | Achievable |
| WCAG Compliance | 100% | 100% ✅ |

### 🛠️ Tools & Environment

**Development Stack**:
- TypeScript/JavaScript
- React 18.2+
- Zustand (state)
- Jest + React Testing Library
- Ant Design (UI components)

**Key Tools**:
- VS Code / WebStorm
- ESLint + Prettier
- Chrome DevTools
- Extension manifest validator
- Local dev server
- Git (version control)

**npm Scripts**:
```bash
npm run dev              # Local development
npm run validate        # Validate manifest
npm run test           # Run tests
npm run build          # Build extension
npm run deploy         # Deploy extension
```

### 📞 Support Resources

- **Documentation**: See links in "Core Documentation"
- **Slack**: #extension-dev (community)
- **Office Hours**: Tuesday 2-3 PM EST
- **Forum**: GitHub Discussions
- **Mentoring**: Available from platform team

### 📚 Recommended Learning Path

**Day 1**: Quick Start (30 min)
- [ ] Framework installation
- [ ] Hello World component
- [ ] Manifest file basics
- [ ] Local dev setup

**Day 2**: Core Concepts (1-2 hours)
- [ ] Component types & slots
- [ ] Navigation management
- [ ] State management basics
- [ ] Error handling

**Day 3-4**: Advanced Features (3-4 hours)
- [ ] Component overrides
- [ ] Advanced state patterns
- [ ] Performance optimization
- [ ] Accessibility compliance

**Day 5+**: Deployment (1-2 hours)
- [ ] Build & testing
- [ ] Deployment process
- [ ] Monitoring & debugging
- [ ] Production troubleshooting

---

## Third-Party Developer

### 🔗 Role & Profile

| Aspect | Details |
|--------|---------|
| **Title** | Integration Developer / API Consumer |
| **Organization** | External Partner / Customer / ISV |
| **Expertise Level** | Beginner / Intermediate |
| **Team Size** | 1-3 FTE per integration |
| **Onboarding** | 2-4 weeks |

### 🎯 Primary Goals

1. **Integrate Successfully**: Connect external systems in < 4 weeks
2. **Reliability**: 95%+ API success rate, < 0.1% errors
3. **Performance**: API response time < 500ms
4. **Maintainability**: Minimize support requests
5. **Compliance**: Follow data regulations, secure credentials

### 📚 Key Responsibilities

- Understand platform capabilities via APIs
- Build integrations with external systems
- Handle authentication and data exchange
- Monitor integration health
- Comply with security regulations
- Troubleshoot integration issues
- Provide customer support

### 🔐 Access & Permissions

| Resource | Access Level |
|----------|--------------|
| Framework Source | ❌ No access |
| Public REST APIs | ✅ Full access |
| OAuth/API Keys | ✅ Scoped access |
| Extension APIs | ✅ Public only |
| Documentation | ✅ Full access |
| Sandbox | ✅ Testing environment |

### 📖 Core Documentation

- **API Reference** (OpenAPI/Swagger)
- **Quick-Start Guide**
- **Code Examples** (multiple languages)
- **Troubleshooting Guide**
- **FAQ & Best Practices**

### 💡 Current Coverage: 70%

**Complete**:
- ✅ REST API patterns
- ✅ Data integration
- ✅ OAuth/authentication

**Needs Work** (8-12 weeks):
- ⚠️ API documentation (#437)
- ⚠️ Code examples (#437)
- ⚠️ SDK packages (#437)

### 📊 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Integration Time | 2-4 weeks | On track |
| API Success Rate | 95%+ | Achievable |
| Error Rate | < 0.1% | Achievable |
| Response Time | < 500ms | Achievable |
| Support Requests | Minimal | TBD |

### 🛠️ Tools & Environment

**Development Stack**:
- Any programming language
- HTTP client (curl, Postman, etc.)
- Language-specific HTTP library
- Environment variables for credentials

**Key Tools**:
- Postman / Thunder Client
- API documentation browser
- Git (version control)
- Logging/monitoring (Datadog, etc.)
- CI/CD platform (GitHub Actions, etc.)

**API Endpoints**:
```bash
# Data Operations
GET    /api/data/{resource}
POST   /api/data/{resource}
PUT    /api/data/{resource}/{id}
DELETE /api/data/{resource}/{id}

# Queries & Search
GET    /api/query
GET    /api/search

# Extensions & Actions
GET    /api/extensions
POST   /api/extensions/{id}/actions/{action}

# Workflows & Events
GET    /api/workflows
POST   /api/webhooks
GET    /api/events
```

### 📞 Support Resources

- **API Docs**: OpenAPI/Swagger specification
- **Community**: Stack Overflow (#machshop-api)
- **Email**: api-support@example.com
- **Forum**: GitHub Discussions
- **Sandbox**: Testing environment access

### 📚 Recommended Learning Path

**Week 1**: API Fundamentals
- [ ] Read API documentation
- [ ] Review code examples
- [ ] Test API in Postman
- [ ] Understand authentication
- [ ] Review rate limits

**Week 2**: Integration Development
- [ ] Implement API client
- [ ] Add error handling
- [ ] Implement retries
- [ ] Add logging
- [ ] Write integration tests

**Week 3**: Testing & Refinement
- [ ] Test in sandbox
- [ ] Verify data consistency
- [ ] Performance testing
- [ ] Load testing
- [ ] Security review

**Week 4**: Production Deployment
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Documentation

---

## Side-by-Side Comparison

### Expertise & Onboarding

| Aspect | Platform Dev | Extension Dev | Third-Party Dev |
|--------|-------------|---------------|-----------------|
| **Typical Experience** | 10+ years | 5+ years | 2+ years |
| **Primary Language** | TypeScript | TypeScript/JS | Any |
| **Time to Productivity** | 2-3 weeks | 6-12 hours | 2-4 weeks |
| **Time to First Deliverable** | 2 weeks | 1-2 days | 2-4 weeks |

### Access Levels

| Resource | Platform Dev | Extension Dev | Third-Party Dev |
|----------|-------------|---------------|-----------------|
| Framework Source | ✅ Full | ✅ Read | ❌ None |
| Internal APIs | ✅ All | ✅ Public + internal | ❌ None |
| Public REST APIs | ✅ Yes | ✅ Yes | ✅ Yes |
| Own Content | ✅ Full | ✅ Full | ✅ Scoped |
| Admin Functions | ✅ Yes | ❌ No | ❌ No |

### Primary Focus Areas

| Area | Platform Dev | Extension Dev | Third-Party Dev |
|------|-------------|---------------|-----------------|
| **Framework** | Stability | Usage | N/A |
| **Code** | Framework | Extensions | Integrations |
| **Testing** | Framework-level | Feature-level | Integration-level |
| **Deployment** | Framework releases | Extension versions | API calls |
| **Performance** | Framework | Widget-level | API response time |
| **Security** | Framework security | Extension security | Credential mgmt |

---

## Support Matrix

### Getting Help

| Issue Type | Platform Dev | Extension Dev | Third-Party Dev |
|-----------|-------------|---------------|-----------------|
| **Framework Bug** | Report → Fix | Report → Support | Report via email |
| **Extension Help** | Mentor others | Ask #extension-dev | N/A |
| **API Issue** | Own responsibility | Ask in Slack | Email support |
| **Deployment** | Own responsibility | Follow docs | Use REST API |
| **Performance** | Debug tools | DevTools + docs | Monitor API |

### Documentation

| Doc | Platform Dev | Extension Dev | Third-Party Dev |
|-----|-------------|---------------|-----------------|
| **Integration Guide** | ✅ Yes | ✅ Yes | ❌ No |
| **Troubleshooting** | ✅ Yes | ✅ Yes | ✅ Quick FAQ |
| **API Reference** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Best Practices** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Architecture** | ✅ Yes | ✅ Overview | ❌ No |

### Response Time Expectations

| SLA | Platform Dev | Extension Dev | Third-Party Dev |
|----|-------------|---------------|-----------------|
| **Critical Issues** | 4 hours | 24 hours | 24 hours |
| **High Priority** | 24 hours | 48 hours | 48 hours |
| **Normal** | 1 week | 1-2 weeks | 1-2 weeks |

---

## Key Documents by Persona

### For All Personas
- [DEVELOPER_PERSONAS.md](./DEVELOPER_PERSONAS.md) - Detailed persona definitions
- [SDK_ISSUES_ALIGNMENT_ASSESSMENT.md](./SDK_ISSUES_ALIGNMENT_ASSESSMENT.md) - GitHub issues analysis

### For Platform Developers
- [PHASE_4H_PRODUCTION_READINESS.md](./PHASE_4H_PRODUCTION_READINESS.md)
- [PHASE_4_FINAL_SUMMARY.md](./PHASE_4_FINAL_SUMMARY.md)
- Architecture Decision Records (ADRs) - In code comments

### For Extension Developers
- [DEVELOPER_INTEGRATION_GUIDE.md](./DEVELOPER_INTEGRATION_GUIDE.md) - **START HERE**
- [DEVELOPER_TROUBLESHOOTING.md](./DEVELOPER_TROUBLESHOOTING.md)
- [PHASE_4G_DOCUMENTATION.md](./PHASE_4G_DOCUMENTATION.md)
- Phase 3 UI Framework Issues (#426-#432)

### For Third-Party Developers
- API Reference (OpenAPI/Swagger)
- Quick-Start Guide
- Code Examples (multiple languages)
- Troubleshooting & FAQ

---

## Current Framework Status

### ✅ Production Ready For

- ✅ Platform Developers: Framework development (90% complete)
- ✅ Extension Developers: UI extensions (80% complete)
- ✅ Third-Party Developers: API consumption (70% complete)

### ⚠️ In Development

- Backend extension testing framework (#434)
- Developer CLI & tooling (#436) - **PRIORITY**
- Comprehensive SDK documentation (#437)
- Extension lifecycle management (#435)
- Security model & sandboxing (#438)

### 📈 Next 8-12 Weeks

The recommended 5 new issues will increase coverage to:
- Platform Developer: 90% → 100%
- Extension Developer: 80% → 95%
- Third-Party Developer: 70% → 85%

**Overall Framework Rating**: 8/10 → 9.5/10

---

## Questions?

Refer to the full documentation:
- **DEVELOPER_PERSONAS.md** for detailed profiles
- **SDK_ISSUES_ALIGNMENT_ASSESSMENT.md** for framework analysis
- **DEVELOPER_PERSONAS_ASSESSMENT_SUMMARY.md** for executive overview

Or contact the appropriate support channel for your persona.

---

**Document**: PERSONAS_QUICK_REFERENCE.md
**Version**: 1.0.0
**Created**: November 1, 2025
**Last Updated**: November 1, 2025
