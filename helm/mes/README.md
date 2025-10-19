# MES Helm Chart

A comprehensive Helm chart for deploying the Manufacturing Execution System (MES) on Kubernetes.

## Overview

This Helm chart deploys a complete MES (Manufacturing Execution System) with:

- **8 Microservices**: Auth, Work Order, Quality, Material, Traceability, Resource, Reporting, Integration
- **Infrastructure**: PostgreSQL (8 databases), Kafka (3-node cluster), ZooKeeper (3-node cluster), Redis
- **Networking**: Ingress with TLS/SSL, Service mesh ready
- **Monitoring**: Prometheus metrics, Grafana dashboards (optional)
- **Scaling**: Horizontal Pod Autoscaling configured for all services

## Prerequisites

- Kubernetes 1.24+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure (for PostgreSQL, Kafka, Redis persistence)
- Ingress controller (NGINX recommended)
- cert-manager (optional, for TLS certificates)

## Installation

### Add Helm Repository

```bash
# If publishing to a Helm repository
helm repo add mes https://charts.example.com/mes
helm repo update
```

### Install from Local Chart

```bash
# From the root of the project
helm install mes ./helm/mes --namespace mes-production --create-namespace
```

### Install with Custom Values

```bash
helm install mes ./helm/mes \
  --namespace mes-production \
  --create-namespace \
  --values custom-values.yaml
```

## Configuration

The following table lists the configurable parameters of the MES chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.namespace` | Kubernetes namespace | `mes-production` |
| `global.registry` | Container image registry | `docker.io/example` |
| `global.imagePullPolicy` | Image pull policy | `Always` |
| `global.storageClass` | Storage class for PVCs | `standard` |

### Microservices Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `services.auth.enabled` | Enable auth service | `true` |
| `services.auth.replicas` | Number of replicas | `2` |
| `services.auth.image` | Image name | `mes-auth` |
| `services.auth.tag` | Image tag | `latest` |

(Similar parameters exist for all 8 services)

### Database Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `true` |
| `postgresql.version` | PostgreSQL version | `14-alpine` |
| `postgresql.persistence.enabled` | Enable persistence | `true` |
| `postgresql.persistence.size` | PVC size | `10Gi` |

### Kafka Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `kafka.enabled` | Enable Kafka | `true` |
| `kafka.replicas` | Number of Kafka brokers | `3` |
| `kafka.persistence.size` | PVC size per broker | `50Gi` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable Ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.tls.enabled` | Enable TLS | `true` |
| `ingress.host` | Ingress hostname | `api.mes-production.example.com` |

## Usage Examples

### Basic Installation

```bash
helm install mes ./helm/mes -n mes-production --create-namespace
```

### Production Installation with TLS

```bash
helm install mes ./helm/mes \
  -n mes-production \
  --create-namespace \
  --set ingress.tls.enabled=true \
  --set ingress.host=api.mes.yourcompany.com \
  --set global.registry=yourregistry.azurecr.io/mes
```

### Development Installation (Single Replicas)

```bash
helm install mes ./helm/mes \
  -n mes-dev \
  --create-namespace \
  --set global.environment=development \
  --set services.auth.replicas=1 \
  --set services.workOrder.replicas=1 \
  --set kafka.replicas=1 \
  --set postgresql.persistence.enabled=false
```

### Installation with External Databases

```bash
helm install mes ./helm/mes \
  -n mes-production \
  --create-namespace \
  --set postgresql.enabled=false \
  --set postgresql.external.enabled=true \
  --set postgresql.external.host=postgres.example.com
```

## Upgrading

```bash
helm upgrade mes ./helm/mes -n mes-production
```

### Upgrade with New Values

```bash
helm upgrade mes ./helm/mes \
  -n mes-production \
  --values new-values.yaml
```

## Uninstalling

```bash
helm uninstall mes -n mes-production
```

**Warning**: This will delete all resources including PersistentVolumeClaims. To preserve data, backup databases before uninstalling.

## Backup and Restore

### Backup PostgreSQL Databases

```bash
# Backup all databases
kubectl exec -it postgres-auth-0 -n mes-production -- \
  pg_dump -U mes_auth_user mes_auth > auth-backup.sql

# Repeat for all 8 services
```

### Restore PostgreSQL Databases

```bash
kubectl exec -i postgres-auth-0 -n mes-production -- \
  psql -U mes_auth_user mes_auth < auth-backup.sql
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n mes-production
```

### View Pod Logs

```bash
kubectl logs -n mes-production auth-service-xxxxx
```

### Check Ingress

```bash
kubectl describe ingress mes-api-ingress -n mes-production
```

### Database Connection Issues

```bash
# Test PostgreSQL connectivity
kubectl exec -it auth-service-xxxxx -n mes-production -- \
  nc -zv postgres-auth 5432
```

### Kafka Issues

```bash
# Check Kafka brokers
kubectl exec -it kafka-0 -n mes-production -- \
  kafka-broker-api-versions --bootstrap-server localhost:9092
```

## Advanced Configuration

### Custom Resource Limits

Create a `custom-values.yaml`:

```yaml
services:
  auth:
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
```

### Enable Monitoring

```yaml
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true

grafana:
  enabled: true
  adminPassword: "changeme"
```

### Custom Ingress Annotations

```yaml
ingress:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "2000"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Ingress (NGINX)                      │
│                 api.mes-production.com                   │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼───────┐   ┌──────▼─────┐
│Auth Service  │   │Work Order Svc  │   │ Quality... │
│ (Replicas:2) │   │  (Replicas:2)  │   │            │
└───────┬──────┘   └────────┬───────┘   └──────┬─────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼───────┐   ┌──────▼─────┐
│  PostgreSQL  │   │  Kafka Cluster │   │   Redis    │
│  (8 DBs)     │   │  (3 brokers)   │   │  (Cache)   │
└──────────────┘   └────────────────┘   └────────────┘
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/example/mes/issues
- Documentation: https://docs.example.com/mes
- Email: support@example.com

## License

MIT License - see LICENSE file for details
