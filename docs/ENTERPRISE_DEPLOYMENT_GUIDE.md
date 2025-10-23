# Enterprise-Scale Deployment Guide

## 🏭 Deployment Scale

**Target**: 30 manufacturing sites, 5000-6000 concurrent users

This guide covers enterprise-scale deployment architecture for multi-site MES operations.

## 🚨 Critical Scale Requirements

### Current vs Enterprise Scale

| Aspect | Small Deployment | Enterprise (30 Sites, 6K Users) |
|--------|------------------|----------------------------------|
| **Concurrent Users** | 10-50 | 5000-6000 |
| **Backend Instances** | 1-2 | 10-15 (with autoscaling) |
| **DB Connections** | 50-100 | 900-1500 (with PgBouncer) |
| **Database Architecture** | Single instance | Primary + Read Replicas |
| **Caching** | Optional | **Required** (Redis cluster) |
| **Load Balancing** | Optional | **Required** (HAProxy/Nginx) |
| **Multi-tenancy** | Single tenant | **Required** (30 factories) |

## 🏗️ Enterprise Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Global Load Balancer                      │
│                    (AWS ALB / Azure LB)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ Site A  │   │ Site B  │   │ Site C  │ ... (30 sites)
  │ Factory │   │ Factory │   │ Factory │
  └────┬────┘   └────┬────┘   └────┬────┘
       │             │             │
       ↓             ↓             ↓
┌──────────────────────────────────────────────────────────────┐
│           Regional Load Balancer (Nginx/HAProxy)              │
└─────────┬────────────────────────────────────────────────────┘
          │
    ┌─────┴──────┬──────┬──────┬──────┐
    ↓            ↓      ↓      ↓      ↓
┌────────┐  ┌────────┐  ...  ┌────────┐
│Backend │  │Backend │  ...  │Backend │  (10-15 pods)
│ Pod 1  │  │ Pod 2  │  ...  │ Pod N  │
│150 conn│  │150 conn│  ...  │150 conn│
└───┬────┘  └───┬────┘  ...  └───┬────┘
    │           │               │
    └───────────┼───────────────┘
                ↓
        ┌───────────────┐
        │   PgBouncer   │  (Connection Pool Manager)
        │  Transaction  │  10:1 multiplexing
        │     Mode      │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    ↓           ↓           ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│Primary  │ │ Read    │ │ Read    │
│Database │ │Replica 1│ │Replica 2│
│300 conn │ │200 conn │ │200 conn │
└─────────┘ └─────────┘ └─────────┘
```

## 📋 Infrastructure Requirements

### 1. Kubernetes Cluster

**Minimum Requirements**:
```yaml
Cluster Specifications:
  Nodes: 20+ nodes (production workload)
  Node Size: 8 vCPU, 32 GB RAM per node
  Storage: 500 GB SSD per node
  Network: 10 Gbps minimum

Backend Deployment:
  Replicas: 10-15 pods
  CPU per pod: 2-4 cores
  Memory per pod: 8-16 GB
  HPA: Auto-scale 10-25 pods based on CPU/memory
```

### 2. Database Infrastructure

**PostgreSQL Configuration**:
```ini
# PostgreSQL primary
max_connections = 300
shared_buffers = 8GB
effective_cache_size = 24GB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200
work_mem = 41943kB
min_wal_size = 2GB
max_wal_size = 8GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
```

**Read Replicas** (2-3 replicas):
```ini
max_connections = 200
hot_standby = on
hot_standby_feedback = on
```

### 3. PgBouncer Configuration

**Critical for 6000 users**:

```ini
[databases]
mes_production = host=primary-db port=5432 dbname=mes

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool Configuration
pool_mode = transaction    # Transaction pooling (10:1 ratio)
max_client_conn = 10000    # Maximum client connections
default_pool_size = 25     # Connections per user/database
reserve_pool_size = 5      # Emergency connections
reserve_pool_timeout = 5   # Seconds

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 120

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

**Connection Multiplexing**:
```
Frontend (app pods): 1500 connections (10 pods × 150)
PgBouncer pool: 150 actual DB connections (10:1 ratio)
Database: Handles 150 connections comfortably
```

### 4. Redis Cluster

**Configuration**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 16gb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    save 60 10000
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
```

**Purpose**:
- Session caching (6000 active sessions)
- API response caching (work orders, material lookups)
- Rate limiting distributed state
- Real-time data aggregation

## 🔧 Backend Configuration

### Environment Variables for Production

```bash
# .env.production
NODE_ENV=production
PORT=3000

# =======================================
# Database Connection Pool (CRITICAL!)
# =======================================
# For enterprise scale with PgBouncer
DB_CONNECTION_LIMIT=150  # Per backend pod

# With 10 backend pods:
# Total frontend connections: 1500
# PgBouncer multiplexing (10:1): 150 actual DB connections

# =======================================
# Database URLs (through PgBouncer)
# =======================================
DATABASE_URL=postgresql://mes_user:password@pgbouncer:6432/mes?schema=public&connection_limit=150&pool_timeout=30

# =======================================
# Redis Configuration
# =======================================
REDIS_CLUSTER_NODES=redis-0:6379,redis-1:6379,redis-2:6379
REDIS_PASSWORD=your-secure-password
REDIS_TLS=true

# =======================================
# Multi-Site Configuration
# =======================================
SITE_ID=SITE_001  # Unique per factory
FACTORY_NAME=Factory_Alpha
REGION=NA_EAST

# =======================================
# Performance Tuning
# =======================================
# Worker threads for CPU-intensive operations
UV_THREADPOOL_SIZE=16

# Node.js memory limit (per pod)
NODE_OPTIONS=--max-old-space-size=8192

# =======================================
# Observability
# =======================================
PROMETHEUS_METRICS_PORT=9090
JAEGER_AGENT_HOST=jaeger-agent
JAEGER_SAMPLER_PARAM=0.1  # Sample 10% of traces at scale

# =======================================
# Rate Limiting
# =======================================
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=1000  # Per IP per minute
```

## 📦 Kubernetes Deployment

### Backend Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mes-backend
  namespace: mes-production
spec:
  replicas: 10  # Baseline
  selector:
    matchLabels:
      app: mes-backend
  template:
    metadata:
      labels:
        app: mes-backend
    spec:
      containers:
      - name: backend
        image: your-registry/mes-backend:v1.0.0
        ports:
        - containerPort: 3000
        - containerPort: 9090  # Metrics
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
          limits:
            memory: "16Gi"
            cpu: "4"
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_CONNECTION_LIMIT
          value: "150"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: connection-string
        - name: REDIS_CLUSTER_NODES
          value: "redis-0:6379,redis-1:6379,redis-2:6379"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mes-backend-hpa
  namespace: mes-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mes-backend
  minReplicas: 10
  maxReplicas: 25
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 50  # Scale down max 50% at a time
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100  # Double capacity if needed
        periodSeconds: 15
      - type: Pods
        value: 5  # Or add 5 pods
        periodSeconds: 15
      selectPolicy: Max  # Use more aggressive policy
```

### Load Balancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mes-backend-lb
  namespace: mes-production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: mes-backend
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 443
    targetPort: 3000
    protocol: TCP
    name: https
  sessionAffinity: ClientIP  # Sticky sessions
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1 hour
```

## 🌍 Multi-Site Deployment Strategy

### Option 1: Centralized (Single K8s Cluster)

**Architecture**:
- Single Kubernetes cluster serving all 30 sites
- Centralized database with read replicas
- Site identification via `SITE_ID` environment variable

**Pros**:
- Simpler operations
- Centralized monitoring
- Lower infrastructure costs

**Cons**:
- Network latency for remote sites
- Single point of failure
- Limited by data residency requirements

### Option 2: Regional Clusters (Recommended for 30 sites)

**Architecture**:
- 3-5 regional Kubernetes clusters
- Each region serves 6-10 factories
- Regional database clusters with cross-region replication

**Example**:
```
Region: North America East (10 factories)
  Cluster: mes-na-east
  Database: Primary in us-east-1
  Sites: SITE_001 to SITE_010

Region: North America West (8 factories)
  Cluster: mes-na-west
  Database: Primary in us-west-2
  Sites: SITE_011 to SITE_018

Region: Europe (7 factories)
  Cluster: mes-eu-central
  Database: Primary in eu-central-1
  Sites: SITE_019 to SITE_025

Region: Asia Pacific (5 factories)
  Cluster: mes-apac
  Database: Primary in ap-southeast-1
  Sites: SITE_026 to SITE_030
```

**Benefits**:
- Lower latency for local sites
- Geographic redundancy
- Compliance with data residency laws
- Independent scaling per region

### Option 3: Hybrid (Edge + Central)

**Architecture**:
- Lightweight edge deployments at each factory
- Central cloud cluster for reporting and analytics
- Bi-directional sync for critical data

**Use Case**: Manufacturing sites with unreliable internet connectivity

## 🔐 Multi-Tenancy Implementation

### Database Schema Design

```sql
-- Add site/factory context to all tables
ALTER TABLE work_orders ADD COLUMN site_id VARCHAR(20) NOT NULL;
ALTER TABLE materials ADD COLUMN site_id VARCHAR(20) NOT NULL;
ALTER TABLE equipment ADD COLUMN site_id VARCHAR(20) NOT NULL;

-- Create indexes for multi-site queries
CREATE INDEX idx_work_orders_site ON work_orders(site_id, created_at DESC);
CREATE INDEX idx_materials_site ON materials(site_id, material_code);

-- Row-level security (RLS) for tenant isolation
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_site_isolation ON work_orders
  USING (site_id = current_setting('app.current_site_id'));
```

### Application-Level Tenancy

```typescript
// Middleware to set site context
export const siteContextMiddleware = (req, res, next) => {
  const siteId = req.user?.siteId || req.headers['x-site-id'];

  if (!siteId) {
    return res.status(403).json({ error: 'Site ID required' });
  }

  // Set site context for this request
  req.siteId = siteId;
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Automatically inject site_id filter
          args.where = { ...args.where, site_id: siteId };
          return query(args);
        },
      },
    },
  });

  next();
};
```

## 📊 Monitoring & Observability at Scale

### Metrics to Monitor

```yaml
# Prometheus metrics
- mes_http_requests_total
- mes_http_request_duration_seconds
- mes_db_connections_active
- mes_db_connections_waiting
- mes_db_query_duration_seconds
- mes_cache_hit_rate
- mes_cache_miss_rate
- mes_active_users_by_site
- mes_work_orders_active
- mes_quality_alerts_active

# Alert Rules
groups:
- name: mes_production
  rules:
  - alert: HighDatabaseConnectionUsage
    expr: mes_db_connections_active / mes_db_connections_limit > 0.8
    for: 5m
    annotations:
      summary: "Database connection pool at {{ $value }}% capacity"

  - alert: BackendPodCrashing
    expr: rate(kube_pod_container_status_restarts_total{namespace="mes-production"}[15m]) > 0
    annotations:
      summary: "Backend pods restarting frequently"

  - alert: HighLatency
    expr: histogram_quantile(0.95, mes_http_request_duration_seconds) > 2
    for: 10m
    annotations:
      summary: "95th percentile latency above 2 seconds"
```

### Distributed Tracing

**Jaeger Configuration**:
```yaml
# Sample 10% of requests at scale (6000 users generates massive trace data)
JAEGER_SAMPLER_TYPE=probabilistic
JAEGER_SAMPLER_PARAM=0.1

# Use Kafka for high-throughput trace ingestion
JAEGER_REPORTER_TYPE=kafka
JAEGER_KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
```

## 💾 Database Optimization for Scale

### Partitioning Strategy

```sql
-- Partition large tables by site and date
CREATE TABLE work_orders (
  id SERIAL,
  site_id VARCHAR(20),
  created_at TIMESTAMP,
  -- other columns
) PARTITION BY LIST (site_id);

-- Create partition per site
CREATE TABLE work_orders_site_001 PARTITION OF work_orders
  FOR VALUES IN ('SITE_001')
  PARTITION BY RANGE (created_at);

-- Further partition by month
CREATE TABLE work_orders_site_001_2025_01 PARTITION OF work_orders_site_001
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Read/Write Splitting

```typescript
// Use read replicas for queries
const workOrders = await prisma.$queryRawUnsafe(`
  /* route:read-replica */
  SELECT * FROM work_orders WHERE site_id = $1
`, siteId);

// Use primary for writes
await prisma.workOrder.create({
  data: { /* ... */ }
});
```

## 🎯 Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Response Time (p95)** | < 500ms | < 2000ms |
| **Response Time (p99)** | < 1000ms | < 5000ms |
| **Database Queries** | < 100ms | < 500ms |
| **API Availability** | > 99.9% | > 99.5% |
| **Concurrent Users** | 6000 | 8000 (peak) |
| **Requests/Second** | 10,000 | 15,000 |
| **Cache Hit Rate** | > 80% | > 60% |
| **DB Connection Pool** | < 80% utilized | < 95% |

## 🚀 Deployment Checklist

### Pre-Production
- [ ] PgBouncer configured and tested
- [ ] Redis cluster deployed (3+ nodes)
- [ ] Database read replicas set up
- [ ] Kubernetes cluster sized appropriately (20+ nodes)
- [ ] Load testing completed (simulate 8000 users)
- [ ] Multi-site tenancy tested
- [ ] Backup and disaster recovery tested
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured
- [ ] On-call rotation established

### Production Launch
- [ ] Database connection pool: 150/pod (1500 total with 10 pods)
- [ ] HPA configured (10-25 pods)
- [ ] Site-specific environment variables set
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] Session management tested under load
- [ ] Gradual rollout per site (pilot → full deployment)

### Post-Launch Monitoring
- [ ] Monitor connection pool utilization
- [ ] Track response times across all sites
- [ ] Verify cache hit rates > 80%
- [ ] Check database replication lag < 1s
- [ ] Review error rates < 0.1%
- [ ] Validate HPA scaling behavior
- [ ] Test failover procedures

## 📈 Scaling Timeline

**Phase 1: Pilot (1-3 sites, 200-500 users)**
- Single K8s cluster
- 3-5 backend pods
- Single database instance
- Basic monitoring

**Phase 2: Regional Rollout (10 sites, 1500-2000 users)**
- Add PgBouncer
- 8-10 backend pods with HPA
- Add 1 read replica
- Redis caching layer
- Enhanced monitoring

**Phase 3: Enterprise Scale (30 sites, 6000 users)**
- Multi-region deployment
- 10-15 backend pods per region
- 2-3 read replicas per region
- Redis cluster (HA)
- Full observability stack
- Disaster recovery procedures

## 📝 Cost Optimization

### Infrastructure Costs (Estimated)

**Monthly for 6000 users**:
```
Kubernetes Cluster (20 nodes, 8vCPU/32GB each):     $6,000
Database Primary (db.r5.8xlarge):                    $3,500
Database Read Replicas (2× db.r5.4xlarge):          $3,000
PgBouncer instances (3× t3.large):                    $200
Redis Cluster (3× cache.r5.xlarge):                 $1,500
Load Balancers:                                       $300
Monitoring (Prometheus, Jaeger):                      $500
Network Transfer (10TB/month):                        $900
──────────────────────────────────────────────────────
TOTAL:                                             ~$15,900/month
                                                   ($190,800/year)

Per Site: $530/month
Per User: $2.65/month
```

### Cost Optimization Strategies
1. Use spot/preemptible instances for non-critical workloads
2. Implement aggressive caching to reduce database load
3. Archive old data to cheaper storage (S3 Glacier)
4. Use reserved instances for baseline capacity
5. Implement auto-scaling to match actual demand

## 🆘 Troubleshooting

### High Connection Pool Utilization
```bash
# Check active connections
kubectl exec -it mes-backend-0 -- curl localhost:3000/metrics | grep db_connections

# Solution: Increase DB_CONNECTION_LIMIT or add more backend pods
kubectl set env deployment/mes-backend DB_CONNECTION_LIMIT=200
```

### PgBouncer Issues
```bash
# Check PgBouncer stats
psql -h pgbouncer -p 6432 -U pgbouncer pgbouncer
SHOW POOLS;
SHOW CLIENTS;
SHOW SERVERS;

# If pool exhausted, increase pool size
```

### Cache Performance
```bash
# Check Redis hit rate
redis-cli INFO stats | grep hits

# If hit rate < 60%, review caching strategy
```

## 📚 Additional Resources

- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [PostgreSQL HA Best Practices](https://www.postgresql.org/docs/current/high-availability.html)
- [Kubernetes HPA Guide](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Redis Cluster Tutorial](https://redis.io/docs/management/scaling/)
