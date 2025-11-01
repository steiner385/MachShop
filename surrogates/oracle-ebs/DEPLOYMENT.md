# Oracle EBS Surrogate - Deployment Guide

Complete guide for deploying the Oracle EBS Surrogate system in local development, Docker, and Kubernetes environments.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Deployment](#docker-deployment)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS)
- npm 9+
- SQLite3 (or compatible)
- Git

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/MachShop2.git
cd MachShop2/surrogates/oracle-ebs

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Create data directory
mkdir -p data

# Start development server
npm run dev
```

### Development Configuration

Create `.env.local` file:

```env
NODE_ENV=development
PORT=3002
DB_PATH=./data/oracle-ebs.db
LOG_LEVEL=debug
WEBHOOK_POLL_INTERVAL=10000
MAX_WEBHOOK_RETRIES=3
WEBHOOK_BACKOFF_SECONDS=60
```

### Running Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Docker Deployment

### Building Docker Image

```bash
# Build the Docker image
docker build -t machshop/oracle-ebs-surrogate:latest .

# Build specific version
docker build -t machshop/oracle-ebs-surrogate:1.0.0 .

# Build with multi-stage optimization
docker build --target runtime -t machshop/oracle-ebs-surrogate:lean .
```

### Running Docker Container

```bash
# Basic run
docker run -p 3002:3002 machshop/oracle-ebs-surrogate:latest

# With volume for data persistence
docker run -p 3002:3002 \
  -v oracle-ebs-data:/app/data \
  machshop/oracle-ebs-surrogate:latest

# With environment variables
docker run -p 3002:3002 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e DB_PATH=/app/data/oracle-ebs.db \
  -v oracle-ebs-data:/app/data \
  machshop/oracle-ebs-surrogate:latest

# Interactive mode
docker run -it -p 3002:3002 \
  -v oracle-ebs-data:/app/data \
  machshop/oracle-ebs-surrogate:latest

# Detached mode with logging
docker run -d \
  --name oracle-ebs-surrogate \
  -p 3002:3002 \
  -v oracle-ebs-data:/app/data \
  --restart unless-stopped \
  machshop/oracle-ebs-surrogate:latest

# View container logs
docker logs -f oracle-ebs-surrogate
```

### Docker Container Management

```bash
# List running containers
docker ps

# Stop container
docker stop oracle-ebs-surrogate

# Start container
docker start oracle-ebs-surrogate

# Remove container
docker rm oracle-ebs-surrogate

# Inspect container
docker inspect oracle-ebs-surrogate

# Execute command in container
docker exec -it oracle-ebs-surrogate node -e "console.log('test')"
```

## Docker Compose Deployment

### Development Deployment

```bash
# Start development environment
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (clean database)
docker-compose down -v
```

### Production Deployment

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale services (if using load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale oracle-ebs-surrogate=3

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production environment
docker-compose -f docker-compose.prod.yml down
```

## Kubernetes Deployment

### Prerequisites

- kubectl configured
- Kubernetes cluster (1.24+)
- Docker registry access

### Create Kubernetes Manifests

```bash
mkdir -p k8s
cd k8s
```

#### ConfigMap (environment configuration)

```yaml
# configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oracle-ebs-config
  namespace: default
data:
  NODE_ENV: "production"
  PORT: "3002"
  LOG_LEVEL: "info"
  DB_PATH: "/app/data/oracle-ebs.db"
```

#### PersistentVolume and PersistentVolumeClaim

```yaml
# persistent-volume.yml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: oracle-ebs-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  hostPath:
    path: /data/oracle-ebs

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: oracle-ebs-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 10Gi
```

#### Deployment

```yaml
# deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oracle-ebs-surrogate
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: oracle-ebs-surrogate
  template:
    metadata:
      labels:
        app: oracle-ebs-surrogate
    spec:
      containers:
      - name: oracle-ebs-surrogate
        image: machshop/oracle-ebs-surrogate:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3002
          name: http
        envFrom:
        - configMapRef:
            name: oracle-ebs-config
        volumeMounts:
        - name: data
          mountPath: /app/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1001
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: oracle-ebs-pvc
```

#### Service

```yaml
# service.yml
apiVersion: v1
kind: Service
metadata:
  name: oracle-ebs-surrogate
  namespace: default
spec:
  selector:
    app: oracle-ebs-surrogate
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3002
  type: LoadBalancer
```

#### Ingress

```yaml
# ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oracle-ebs-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - oracle-ebs.example.com
    secretName: oracle-ebs-tls
  rules:
  - host: oracle-ebs.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: oracle-ebs-surrogate
            port:
              number: 80
```

### Deploying to Kubernetes

```bash
# Create namespace
kubectl create namespace oracle-ebs

# Apply manifests
kubectl apply -f configmap.yml
kubectl apply -f persistent-volume.yml
kubectl apply -f deployment.yml
kubectl apply -f service.yml
kubectl apply -f ingress.yml

# Verify deployment
kubectl get deployments -n oracle-ebs
kubectl get pods -n oracle-ebs
kubectl get services -n oracle-ebs

# View logs
kubectl logs -f deployment/oracle-ebs-surrogate -n oracle-ebs

# Port forward (for testing)
kubectl port-forward svc/oracle-ebs-surrogate 3002:80 -n oracle-ebs

# Scaling
kubectl scale deployment oracle-ebs-surrogate --replicas=5 -n oracle-ebs

# Rolling update
kubectl set image deployment/oracle-ebs-surrogate \
  oracle-ebs-surrogate=machshop/oracle-ebs-surrogate:1.0.1 \
  -n oracle-ebs

# Rollback
kubectl rollout undo deployment/oracle-ebs-surrogate -n oracle-ebs
```

## Environment Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment (development, production) |
| PORT | 3002 | Server port |
| DB_PATH | :memory: | SQLite database path |
| LOG_LEVEL | info | Logging level (debug, info, warn, error) |
| WEBHOOK_POLL_INTERVAL | 10000 | Webhook polling interval (ms) |
| MAX_WEBHOOK_RETRIES | 3 | Maximum webhook retry attempts |
| WEBHOOK_BACKOFF_SECONDS | 60 | Initial webhook retry backoff (seconds) |

### Health Check

The service exposes a health check endpoint:

```bash
# Check health
curl http://localhost:3002/health

# Response
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

## Monitoring and Logging

### Prometheus Metrics

Configure Prometheus scraping:

```yaml
scrape_configs:
  - job_name: 'oracle-ebs'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'
```

### Logging

Configure log aggregation (ELK Stack, Loki, etc.):

```bash
# View logs (Docker)
docker logs oracle-ebs-surrogate

# View logs (Kubernetes)
kubectl logs deployment/oracle-ebs-surrogate

# Stream logs
kubectl logs -f deployment/oracle-ebs-surrogate
```

### Performance Monitoring

Monitor key metrics:

- Request response time (p50, p95, p99)
- Database query performance
- Webhook delivery success rate
- Error rates by endpoint

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or use different port
PORT=3003 npm run dev
```

#### Database Lock

```bash
# Remove database lock
rm -f data/oracle-ebs.db-wal
rm -f data/oracle-ebs.db-shm

# Restart service
docker restart oracle-ebs-surrogate
```

#### Connection Refused

```bash
# Check if service is running
curl http://localhost:3002/health

# Check container logs
docker logs oracle-ebs-surrogate

# Check Kubernetes pod
kubectl describe pod oracle-ebs-surrogate
```

#### High Memory Usage

```bash
# Reduce replicas
kubectl scale deployment oracle-ebs-surrogate --replicas=1

# Increase memory limits
kubectl set resources deployment oracle-ebs-surrogate \
  --limits=memory=1Gi,cpu=2 \
  --requests=memory=512Mi,cpu=1
```

### Debug Commands

```bash
# Access container shell
docker exec -it oracle-ebs-surrogate /bin/sh

# Check environment variables
docker exec oracle-ebs-surrogate env

# Test database connection
docker exec oracle-ebs-surrogate sqlite3 /app/data/oracle-ebs.db ".tables"

# View recent logs
docker logs --tail 100 oracle-ebs-surrogate
```

## Performance Tuning

### Database Optimization

```bash
# Enable WAL mode for better concurrency
sqlite3 data/oracle-ebs.db "PRAGMA journal_mode=WAL;"

# Set cache size
sqlite3 data/oracle-ebs.db "PRAGMA cache_size=10000;"
```

### Application Tuning

- Increase webhook poll interval in production
- Enable query result caching
- Use read replicas for reporting queries
- Implement request rate limiting

## Backup and Recovery

### Database Backup

```bash
# Backup SQLite database
cp data/oracle-ebs.db data/oracle-ebs.db.backup

# Backup Docker volume
docker run --rm -v oracle-ebs-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/oracle-ebs-backup.tar.gz -C /data .

# Backup Kubernetes PVC
kubectl cp default/oracle-ebs-surrogate-<pod>:/app/data/oracle-ebs.db ./oracle-ebs.db.backup
```

### Recovery

```bash
# Restore from backup
cp data/oracle-ebs.db.backup data/oracle-ebs.db

# Verify backup integrity
sqlite3 data/oracle-ebs.db "PRAGMA integrity_check;"
```

