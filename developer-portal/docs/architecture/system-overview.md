---
sidebar_position: 1
title: System Overview
---

# System Architecture Overview

MES is a comprehensive manufacturing execution platform with multiple layers.

## High-Level Architecture

```
┌─────────────────────────────────────┐
│        Client Applications           │
│  (Web, Mobile, ERP, Third-party)    │
└──────────────┬──────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼──────┐  ┌────────▼────────┐
│ REST API  │  │  GraphQL API    │
│ (v1, v2)  │  │  (Real-time)    │
└────┬──────┘  └────────┬────────┘
     │                   │
     └─────────┬─────────┘
               │
    ┌──────────▼──────────┐
    │  Core Services      │
    │  - Work Orders      │
    │  - Operations       │
    │  - Quality          │
    │  - Inventory        │
    │  - Webhooks         │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   Data Layer        │
    │   PostgreSQL DB     │
    │   Redis Cache       │
    │   Elasticsearch     │
    └─────────────────────┘
```

## Technology Stack

**Frontend:**
- React, TypeScript, Tailwind CSS

**Backend:**
- Node.js, NestJS, Express

**Database:**
- PostgreSQL (primary)
- Redis (caching, sessions, queues)
- Elasticsearch (search, analytics)

**Infrastructure:**
- AWS/Azure/GCP (cloud deployment)
- Docker containers
- Kubernetes orchestration

## Key Services

1. **Work Order Service** - Create, track, complete work orders
2. **Operation Service** - Manage operations, routing, scheduling
3. **Quality Service** - QA inspections, NCRs, compliance
4. **Inventory Service** - Material tracking, stock levels
5. **Webhook Service** - Real-time event delivery
6. **Authentication Service** - OAuth, API key management
7. **Plugin Service** - Plugin execution environment

---

[API Reference](../api-reference/overview.md)
