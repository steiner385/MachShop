# Andon System Architecture Overview

## Table of Contents
- [System Overview](#system-overview)
- [Design Principles](#design-principles)
- [Architecture Components](#architecture-components)
- [Data Flow](#data-flow)
- [Integration Points](#integration-points)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)

## System Overview

The Andon system is a comprehensive lean manufacturing issue escalation platform that enables shop floor workers to raise alerts for quality, safety, equipment, and other operational issues. Implemented as part of GitHub Issue #171, the system provides real-time issue tracking, automated escalation, and multi-channel notifications.

### Core Purpose

The Andon system serves as the central nervous system for production floor issue management:
- **Immediate Issue Visibility**: Workers can instantly raise alerts from any location
- **Automated Escalation**: Issues automatically escalate based on configurable rules
- **Real-time Monitoring**: Management gains instant visibility into production issues
- **Data-Driven Insights**: Comprehensive analytics identify patterns and improvement opportunities

### Key Capabilities

1. **Alert Management**: Create, track, and resolve production issues
2. **Flexible Configuration**: Hierarchical configuration with site-specific overrides
3. **Smart Escalation**: Rule-based automated escalation with multiple action types
4. **Multi-channel Notifications**: Email, SMS, Slack, and custom channels
5. **Comprehensive Audit Trail**: Complete tracking of all changes and actions
6. **Touch-Optimized Interface**: Designed for industrial environments

## Design Principles

### 1. Hierarchical Configuration
- Global defaults with site-specific overrides
- Configuration inheritance for simplified management
- Template-based approach for consistency

### 2. Event-Driven Architecture
- Real-time processing of alerts
- Asynchronous escalation evaluation
- Event-based notification delivery

### 3. Extensibility
- Pluggable notification channels
- Flexible metadata storage
- JSON-based rule definitions

### 4. Industrial-Grade Reliability
- Robust error handling
- Transaction consistency
- Audit trail for compliance

### 5. User-Centric Design
- Touch-optimized shop floor interface
- Progressive disclosure of complexity
- Role-based access control

## Architecture Components

### Database Layer (Prisma ORM)

The system uses 8 core database models:

```
┌─────────────────────────────────────────────────────────┐
│                    Database Models                        │
├─────────────────────────────────────────────────────────┤
│ AndonAlert          │ Core alert entity with lifecycle   │
│ AndonIssueType      │ Categorized issue definitions      │
│ AndonEscalationRule │ Conditional escalation logic       │
│ AndonEscalationRuleResult │ Escalation audit trail      │
│ AndonConfiguration  │ Global system configurations       │
│ AndonSiteConfiguration │ Site-specific overrides        │
│ AndonNotificationTemplate │ Message templates           │
│ AndonSystemSettings │ System-wide operational settings  │
└─────────────────────────────────────────────────────────┘
```

### Service Layer

```
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌─────────────────────┐    │
│  │  AndonService    │      │ AndonEscalationEngine│    │
│  │                  │      │                      │    │
│  │ • Alert CRUD     │◄────►│ • Rule Evaluation    │    │
│  │ • Issue Types    │      │ • Auto Escalation    │    │
│  │ • Configuration  │      │ • Action Execution   │    │
│  │ • Analytics      │      │ • Notification Send  │    │
│  └──────────────────┘      └─────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### API Layer

```
┌─────────────────────────────────────────────────────────┐
│                     API Routes                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /api/andon                  /api/andon/config          │
│  ├── /alerts                 ├── /configurations        │
│  ├── /issue-types           ├── /site-configurations    │
│  ├── /escalation-rules      ├── /templates              │
│  ├── /statistics            ├── /system-settings        │
│  └── /escalate              └── /export                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Frontend Components

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend Architecture                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │          Zustand State Management          │          │
│  │  ┌─────────────┐    ┌─────────────────┐ │          │
│  │  │ andonStore  │    │andonConfigStore │ │          │
│  │  └─────────────┘    └─────────────────┘ │          │
│  └──────────────────────────────────────────┘          │
│                         │                                │
│  ┌──────────────────────┼──────────────────────┐       │
│  │                Components                     │       │
│  │  ┌───────────────┐    ┌──────────────────┐ │       │
│  │  │AndonShopFloor │    │ AndonConfigMgr   │ │       │
│  │  │               │    │                   │ │       │
│  │  │ • Alert Form  │    │ • Issue Types    │ │       │
│  │  │ • Status View │    │ • Rules Editor   │ │       │
│  │  │ • Quick Actions│    │ • Templates      │ │       │
│  │  └───────────────┘    └──────────────────┘ │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Alert Creation Flow

```
Shop Floor Worker
       │
       ▼
[AndonShopFloor UI]
       │
       ▼
[Create Alert API]
       │
       ▼
[AndonService.createAlert()]
       │
       ├──► [Generate Alert Number]
       ├──► [Validate Issue Type]
       ├──► [Apply Default Configs]
       ├──► [Create Database Record]
       └──► [Trigger Initial Escalation Check]
              │
              ▼
       [AndonEscalationEngine]
              │
              ├──► [Evaluate Rules]
              ├──► [Send Notifications]
              └──► [Update Alert Status]
```

### Escalation Processing Flow

```
[Background Job / Timer]
       │
       ▼
[AndonEscalationEngine.processEscalations()]
       │
       ▼
[Query Pending Alerts]
       │
       ▼
[For Each Alert]
       │
       ├──► [Check Escalation Timer]
       ├──► [Load Applicable Rules]
       ├──► [Evaluate Conditions]
       └──► [Execute Actions]
              │
              ├──► [Notify Users/Roles]
              ├──► [Reassign Alert]
              ├──► [Update Status]
              └──► [Log Results]
```

### Configuration Hierarchy

```
[Global Configuration]
       │
       ├──► [Site Configuration Override]
       │            │
       │            ▼
       │     [Merged Configuration]
       │            │
       ▼            ▼
[Issue Type Defaults]
       │
       ▼
[Alert Instance]
```

## Integration Points

### MachShop Core Systems

1. **User Management**
   - Authentication and authorization
   - Role-based access control
   - User assignment and notifications

2. **Site Management**
   - Site-specific configurations
   - Area and work center contexts
   - Location-based filtering

3. **Work Order System**
   - Link alerts to active work orders
   - Operation-specific issues
   - Production impact tracking

4. **Equipment Management**
   - Equipment-related alerts
   - Maintenance trigger integration
   - Downtime correlation

### External Integrations

1. **Notification Channels**
   ```typescript
   interface NotificationChannel {
     email: EmailProvider;
     sms: SMSProvider;
     slack: SlackIntegration;
     custom: WebhookProvider;
   }
   ```

2. **Analytics Platforms**
   - Export alert data
   - Performance metrics
   - Trend analysis

3. **ERP Systems**
   - Cost impact calculations
   - Resource allocation
   - Production scheduling adjustments

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────┐
│              Security Layer Architecture                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Authentication:                                         │
│  ├── JWT Token Validation                               │
│  ├── Session Management                                 │
│  └── API Key Support (for integrations)                 │
│                                                          │
│  Authorization:                                          │
│  ├── Role-Based Access Control (RBAC)                   │
│  ├── Site-Level Permissions                             │
│  ├── Resource-Level Permissions                         │
│  └── Action-Based Permissions                           │
│                                                          │
│  Data Security:                                          │
│  ├── Field-Level Encryption (sensitive data)            │
│  ├── Audit Trail (immutable logs)                       │
│  └── Data Sanitization (input/output)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Role | Create Alert | View Alerts | Resolve | Configure | Admin |
|------|-------------|-------------|---------|-----------|-------|
| Worker | ✓ | Own | - | - | - |
| Supervisor | ✓ | Team | ✓ | - | - |
| Manager | ✓ | Site | ✓ | ✓ | - |
| Admin | ✓ | All | ✓ | ✓ | ✓ |

## Scalability Considerations

### Performance Optimizations

1. **Database Indexing**
   - Indexed on alert status, severity, priority
   - Site and date-based indexes for filtering
   - Composite indexes for complex queries

2. **Caching Strategy**
   - Configuration caching (Redis)
   - Template caching
   - Frequently accessed data

3. **Background Processing**
   - Asynchronous escalation evaluation
   - Batch notification processing
   - Queue-based architecture

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────┐
│                 Load Balancer                            │
└──────────┬──────────────┬──────────────┬───────────────┘
           │              │              │
    ┌──────▼────┐  ┌──────▼────┐  ┌─────▼─────┐
    │   API     │  │   API     │  │   API     │
    │  Server   │  │  Server   │  │  Server   │
    └──────┬────┘  └──────┬────┘  └─────┬─────┘
           │              │              │
    ┌──────▼──────────────▼──────────────▼─────┐
    │         Shared Database Cluster           │
    │         (Read Replicas + Write Primary)   │
    └───────────────────────────────────────────┘
           │
    ┌──────▼────────────────────────────────────┐
    │     Background Job Queue (Redis/RabbitMQ) │
    └────────────────────────────────────────────┘
```

### Monitoring & Observability

1. **Application Metrics**
   - Alert creation rate
   - Escalation processing time
   - Notification delivery success
   - API response times

2. **Business Metrics**
   - Mean time to acknowledge (MTTA)
   - Mean time to resolve (MTTR)
   - Escalation frequency
   - Issue type distribution

3. **System Health**
   - Database performance
   - Queue depth
   - Memory usage
   - Error rates

## Architecture Decision Records (ADRs)

### ADR-001: Event-Driven Escalation
**Decision**: Use event-driven architecture for escalation processing
**Rationale**: Provides real-time responsiveness while maintaining system decoupling
**Consequences**: Requires message queue infrastructure but enables horizontal scaling

### ADR-002: JSON-Based Rule Engine
**Decision**: Store escalation rules as JSON for flexibility
**Rationale**: Allows complex conditions without schema changes
**Consequences**: Requires careful validation but enables runtime rule modifications

### ADR-003: Hierarchical Configuration
**Decision**: Implement global defaults with site-specific overrides
**Rationale**: Balances standardization with site autonomy
**Consequences**: More complex configuration merge logic but improved flexibility

### ADR-004: Audit Trail Design
**Decision**: Store all changes in immutable audit records
**Rationale**: Required for compliance and troubleshooting
**Consequences**: Increased storage requirements but complete traceability

## Next Steps & Roadmap

1. **Phase 2 Enhancements**
   - Machine learning for predictive escalation
   - Mobile application development
   - Advanced analytics dashboard

2. **Integration Expansions**
   - IoT sensor integration
   - Voice-activated alerts
   - AR/VR visualization

3. **Performance Improvements**
   - GraphQL API implementation
   - Real-time WebSocket updates
   - Edge computing for shop floor devices