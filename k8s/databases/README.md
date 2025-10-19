# Kubernetes Database Configurations
## Phase 2, Task 2.3: Database Per Service Pattern

Production-ready Kubernetes manifests for deploying all 8 MES microservice databases plus supporting infrastructure (Kafka, Redis).

---

## 📋 Overview

This directory contains production-grade Kubernetes manifests for:

- **8 PostgreSQL Databases** (StatefulSets)
  - Auth Service
  - Work Order Service
  - Quality Service
  - Material Service
  - Traceability Service
  - Resource Service
  - Reporting Service
  - Integration Service

- **Kafka Cluster** (3 brokers + Zookeeper)
- **Redis Cache** (with persistence)
- **Monitoring Tools** (Kafka UI, Redis Commander)

---

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes cluster** (v1.24+)
2. **kubectl** configured
3. **StorageClass** named `fast-ssd` (or modify manifests)
4. **Namespace**: `mes-production`

### Deploy All Infrastructure

```bash
# 1. Create namespace
kubectl create namespace mes-production

# 2. Deploy all PostgreSQL databases
kubectl apply -f k8s/databases/all-postgres-databases.yaml

# 3. Deploy Kafka cluster
kubectl apply -f k8s/databases/kafka-statefulset.yaml

# 4. Deploy Redis cache
kubectl apply -f k8s/databases/redis-deployment.yaml

# 5. Verify all pods are running
kubectl get pods -n mes-production

# 6. Check services
kubectl get svc -n mes-production
```

### Update Secrets

**IMPORTANT**: Before deploying to production, update all database passwords!

```bash
# Edit secrets in manifests
vim k8s/databases/all-postgres-databases.yaml

# Replace all instances of:
password: CHANGE_ME_IN_PRODUCTION

# With secure passwords:
password: $(openssl rand -base64 32)

# Reapply manifests
kubectl apply -f k8s/databases/all-postgres-databases.yaml
```

---

## 📦 Individual Components

### PostgreSQL Databases

All 8 databases are defined in `all-postgres-databases.yaml`:

```bash
# Deploy only PostgreSQL
kubectl apply -f k8s/databases/all-postgres-databases.yaml

# Check status
kubectl get statefulsets -n mes-production
kubectl get pvc -n mes-production

# View logs for specific database
kubectl logs -n mes-production postgres-auth-0
kubectl logs -n mes-production postgres-work-order-0
```

**Database Endpoints** (within cluster):

| Service | Internal DNS | Port |
|---------|--------------|------|
| Auth | `postgres-auth.mes-production.svc.cluster.local` | 5432 |
| Work Order | `postgres-work-order.mes-production.svc.cluster.local` | 5433 |
| Quality | `postgres-quality.mes-production.svc.cluster.local` | 5434 |
| Material | `postgres-material.mes-production.svc.cluster.local` | 5435 |
| Traceability | `postgres-traceability.mes-production.svc.cluster.local` | 5436 |
| Resource | `postgres-resource.mes-production.svc.cluster.local` | 5437 |
| Reporting | `postgres-reporting.mes-production.svc.cluster.local` | 5438 |
| Integration | `postgres-integration.mes-production.svc.cluster.local` | 5439 |

**Storage Allocation**:

- Auth: 10Gi
- Work Order: 50Gi (largest transaction volume)
- Quality: 30Gi
- Material: 40Gi
- Traceability: 100Gi (genealogy data)
- Resource: 20Gi
- Reporting: 50Gi (aggregated metrics)
- Integration: 20Gi

### Kafka Cluster

3-broker Kafka cluster with Zookeeper coordination:

```bash
# Deploy Kafka
kubectl apply -f k8s/databases/kafka-statefulset.yaml

# Check status
kubectl get statefulsets -n mes-production kafka
kubectl get pods -n mes-production -l app=kafka

# View broker logs
kubectl logs -n mes-production kafka-0
kubectl logs -n mes-production kafka-1
kubectl logs -n mes-production kafka-2

# Access Kafka UI (port-forward)
kubectl port-forward -n mes-production svc/kafka-ui 8080:8080
# Open browser: http://localhost:8080
```

**Kafka Configuration**:

- **Replication Factor**: 3
- **Min In-Sync Replicas**: 2
- **Retention**: 7 days
- **Log Segment Size**: 512MB
- **Storage per Broker**: 50Gi

**Topics** (auto-created on first use):

- `mes.material.events`
- `mes.workorder.events`
- `mes.quality.events`
- `mes.resource.events`
- `mes.auth.events`

### Redis Cache

Redis deployment with persistence:

```bash
# Deploy Redis
kubectl apply -f k8s/databases/redis-deployment.yaml

# Check status
kubectl get deployment -n mes-production redis
kubectl get pvc -n mes-production redis-pvc

# View logs
kubectl logs -n mes-production -l app=redis

# Access Redis Commander (port-forward)
kubectl port-forward -n mes-production svc/redis-commander 8081:8081
# Open browser: http://localhost:8081
```

**Redis Configuration**:

- **Max Memory**: 2GB
- **Eviction Policy**: allkeys-lru
- **Persistence**: AOF + RDB snapshots
- **Storage**: 20Gi

---

## 🔧 Configuration

### Resource Limits

Default resource allocations per service:

**PostgreSQL (Standard)**:
```yaml
requests:
  memory: "256Mi"
  cpu: "250m"
limits:
  memory: "512Mi"
  cpu: "500m"
```

**PostgreSQL (Large - Work Order, Quality, Material)**:
```yaml
requests:
  memory: "512Mi"
  cpu: "500m"
limits:
  memory: "1Gi"
  cpu: "1000m"
```

**Kafka Broker**:
```yaml
requests:
  memory: "1Gi"
  cpu: "500m"
limits:
  memory: "2Gi"
  cpu: "1000m"
```

**Redis**:
```yaml
requests:
  memory: "512Mi"
  cpu: "250m"
limits:
  memory: "2Gi"
  cpu: "500m"
```

### StorageClass

Manifests assume a `fast-ssd` StorageClass exists:

```yaml
# Example StorageClass for AWS EBS gp3
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
```

**For other cloud providers**:

- **GCP**: Change provisioner to `pd.csi.storage.gke.io` (type: `pd-ssd`)
- **Azure**: Change provisioner to `disk.csi.azure.com` (skuName: `Premium_LRS`)
- **On-premise**: Use local-path provisioner or NFS

To use different StorageClass:

```bash
# Find existing storage classes
kubectl get storageclass

# Replace in manifests
sed -i 's/storageClassName: fast-ssd/storageClassName: your-class/g' k8s/databases/*.yaml
```

---

## 🔐 Secrets Management

### Using Kubernetes Secrets (Basic)

Current approach uses in-manifest secrets (NOT recommended for production):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-auth-secret
type: Opaque
stringData:
  username: mes_auth_user
  password: CHANGE_ME_IN_PRODUCTION
```

### Production: External Secrets Operator

**Recommended**: Use [External Secrets Operator](https://external-secrets.io/) with AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: mes-production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: postgres-auth-secret
  namespace: mes-production
spec:
  secretStoreRef:
    name: aws-secrets
  target:
    name: postgres-auth-secret
  data:
    - secretKey: username
      remoteRef:
        key: mes/postgres/auth
        property: username
    - secretKey: password
      remoteRef:
        key: mes/postgres/auth
        property: password
```

### Production: Sealed Secrets

Alternative: [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
echo -n 'my-super-secret-password' | kubectl create secret generic postgres-auth-secret \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit sealed-secret.yaml to git (safe)
kubectl apply -f sealed-secret.yaml
```

---

## 📊 Monitoring & Observability

### Health Checks

All databases include liveness and readiness probes:

```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Check Pod Status

```bash
# Get all pods
kubectl get pods -n mes-production

# Check specific StatefulSet
kubectl get statefulset -n mes-production postgres-auth

# Describe pod for events
kubectl describe pod -n mes-production postgres-auth-0

# View logs
kubectl logs -n mes-production postgres-auth-0 --tail=100 -f
```

### Prometheus Monitoring (Optional)

Add ServiceMonitor for Prometheus scraping:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-exporter
  namespace: mes-production
spec:
  selector:
    matchLabels:
      app: postgres-exporter
  endpoints:
    - port: metrics
      interval: 30s
```

---

## 🔄 Operations

### Scaling

**PostgreSQL** (vertical scaling only):

```bash
# Update resources in manifest
vim k8s/databases/all-postgres-databases.yaml

# Apply changes
kubectl apply -f k8s/databases/all-postgres-databases.yaml

# Restart pod to apply
kubectl rollout restart statefulset -n mes-production postgres-work-order
```

**Kafka** (horizontal scaling):

```bash
# Update replicas
kubectl scale statefulset -n mes-production kafka --replicas=5

# Verify
kubectl get pods -n mes-production -l app=kafka
```

### Backups

**PostgreSQL Backup** (using pg_dump):

```bash
# Backup single database
kubectl exec -n mes-production postgres-auth-0 -- \
  pg_dump -U mes_auth_user -d mes_auth | gzip > backup-auth-$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup-auth-20251018.sql.gz | \
  kubectl exec -i -n mes-production postgres-auth-0 -- \
  psql -U mes_auth_user -d mes_auth
```

**Production**: Use [Velero](https://velero.io/) for full backup/restore:

```bash
# Install Velero
velero install --provider aws --bucket mes-backups --backup-location-config region=us-west-2

# Create backup schedule
velero schedule create mes-daily --schedule="0 2 * * *" --include-namespaces mes-production

# Restore from backup
velero restore create --from-backup mes-daily-20251018020000
```

### Database Migrations

Run migrations after deployment:

```bash
# Copy Prisma schemas to init container
# Or run migrations from CI/CD pipeline

# Example: Run migration job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-auth-db
  namespace: mes-production
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: your-mes-image:latest
          command: ["npx", "prisma", "migrate", "deploy"]
          workingDir: /app/services/auth
          env:
            - name: AUTH_DATABASE_URL
              value: "postgresql://mes_auth_user:password@postgres-auth:5432/mes_auth"
      restartPolicy: OnFailure
EOF
```

### Disaster Recovery

**Steps to recover from catastrophic failure**:

1. **Restore from Velero backup**:
   ```bash
   velero restore create --from-backup mes-daily-20251018020000
   ```

2. **Or manually restore databases**:
   ```bash
   # For each database
   kubectl exec -i -n mes-production postgres-{service}-0 -- \
     psql -U {user} -d {database} < backup.sql
   ```

3. **Verify data integrity**:
   ```bash
   kubectl exec -n mes-production postgres-auth-0 -- \
     psql -U mes_auth_user -d mes_auth -c "SELECT COUNT(*) FROM \"User\";"
   ```

---

## 🐛 Troubleshooting

### Pod Not Starting

```bash
# Check events
kubectl describe pod -n mes-production postgres-auth-0

# Common issues:
# - PVC not bound: Check StorageClass exists
# - Image pull error: Verify image availability
# - Resource limits: Check node capacity
```

### PVC Stuck in Pending

```bash
# Check PVC
kubectl get pvc -n mes-production

# Describe PVC for events
kubectl describe pvc -n mes-production postgres-auth-storage-postgres-auth-0

# Common fix: Create StorageClass
kubectl get storageclass
```

### Database Connection Refused

```bash
# Check if pod is ready
kubectl get pod -n mes-production postgres-auth-0

# Check logs
kubectl logs -n mes-production postgres-auth-0

# Test connection from another pod
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -n mes-production -- \
  psql -h postgres-auth -U mes_auth_user -d mes_auth
```

### Kafka Broker Not Joining

```bash
# Check Zookeeper first
kubectl logs -n mes-production zookeeper-0

# Check broker logs
kubectl logs -n mes-production kafka-0

# Verify connectivity
kubectl exec -n mes-production kafka-0 -- \
  kafka-broker-api-versions --bootstrap-server localhost:9092
```

---

## 📚 References

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/current/install-kubernetes.html)
- [Kafka on Kubernetes](https://kafka.apache.org/documentation/#kubernetes)
- [Redis on Kubernetes](https://redis.io/docs/management/kubernetes/)
- [Database Per Service Pattern](../../docs/PHASE_2_TASK_2.3_DATABASE_PER_SERVICE_COMPLETE.md)

---

## ⚠️ Production Checklist

Before deploying to production:

- [ ] Update all database passwords in secrets
- [ ] Configure proper StorageClass for your cloud provider
- [ ] Set up backup strategy (Velero or equivalent)
- [ ] Configure monitoring (Prometheus + Grafana)
- [ ] Set up log aggregation (ELK or CloudWatch)
- [ ] Configure resource limits based on load testing
- [ ] Set up network policies for database access
- [ ] Configure TLS for database connections
- [ ] Set up automated database migrations
- [ ] Test disaster recovery procedures
- [ ] Configure alerts for disk space, CPU, memory
- [ ] Set up read replicas for reporting database (if needed)

---

**Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Production Ready
