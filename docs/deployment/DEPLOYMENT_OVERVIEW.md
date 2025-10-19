# MES System - Deployment Overview

## Available Deployment Guides

This directory contains comprehensive deployment guides for all supported environments:

### 1. Windows Development (`WINDOWS_DEVELOPMENT.md`) ✅ COMPLETE
- **Platform**: Windows 10/11 with Docker Desktop + WSL2
- **Use Case**: Local development
- **Complexity**: Beginner-friendly
- **Setup Time**: 30-45 minutes
- **Status**: Complete (650+ lines)

### 2. Linux Development (`LINUX_DEVELOPMENT.md`)
- **Platform**: Ubuntu 20.04/22.04, Debian, Fedora
- **Use Case**: Local development (native Docker)
- **Complexity**: Beginner-friendly
- **Setup Time**: 20-30 minutes
- **Key Topics**:
  - Native Docker Engine installation
  - Docker Compose setup
  - Development workflow
  - Performance optimization (better than Windows/WSL2)

### 3. RHEL Air-Gapped Production (`RHEL_AIRGAP_PRODUCTION.md`)
- **Platform**: RHEL 8/9 (air-gapped/offline)
- **Use Case**: Secure production deployment without internet
- **Complexity**: Advanced
- **Setup Time**: 2-4 hours
- **Key Topics**:
  - Offline package preparation
  - Air-gap transfer procedures
  - High availability configuration
  - Security hardening
  - Backup/restore procedures

### 4. AWS GovCloud ITAR (`AWS_GOVCLOUD_ITAR.md`)
- **Platform**: AWS GovCloud with EKS
- **Use Case**: ITAR-compliant cloud production
- **Complexity**: Advanced
- **Setup Time**: 4-6 hours
- **Key Topics**:
  - ITAR compliance requirements
  - FedRAMP controls
  - EKS cluster setup
  - RDS PostgreSQL (Database Per Service)
  - Amazon MSK (Kafka)
  - ElastiCache (Redis)
  - Terraform infrastructure as code
  - Estimated costs

## Infrastructure Files Created

### Docker Compose
- `docker-compose.yml` (650+ lines) - Development environment
- `docker-compose.prod.yml` (350+ lines) - Production overrides
- `.env.example` - Environment variables template

### NGINX
- `nginx/nginx.conf` (220+ lines) - API Gateway configuration

### Monitoring
- `monitoring/prometheus.yml` - Prometheus configuration
- `monitoring/alert-rules.yml` - Alert rules
- `monitoring/grafana/provisioning/` - Grafana datasources and dashboards

### Kubernetes (for reference)
- `k8s/` - Complete Kubernetes manifests
- `helm/mes/` - Helm chart for deployment

## Automation Scripts

### Setup Wizards
- `scripts/setup-windows.ps1` - Windows automated setup
- `scripts/setup-linux.sh` - Linux automated setup
- `scripts/setup-airgap.sh` - Air-gap deployment wizard

### Database Management
- `scripts/backup-databases.sh` - Backup all databases
- `scripts/restore-databases.sh` - Restore databases
- `scripts/run-migrations.sh` - Run Prisma migrations

### Monitoring Setup
- `scripts/setup-monitoring.sh` - Configure Prometheus & Grafana
- `scripts/configure-alerts.sh` - Set up alerting rules

### Air-Gap Packaging
- `scripts/package-airgap.sh` - Create offline deployment package
- `scripts/install-airgap.sh` - Install from offline package

### Terraform (AWS GovCloud)
- `terraform/aws-govcloud/` - Complete IaC for AWS deployment
  - VPC configuration
  - EKS cluster
  - RDS instances (8 databases)
  - Amazon MSK (Kafka)
  - ElastiCache (Redis)
  - Security groups
  - IAM roles and policies

## Quick Start by Environment

### Development (Windows)
```bash
# See WINDOWS_DEVELOPMENT.md
docker compose up -d
```

### Development (Linux)
```bash
# See LINUX_DEVELOPMENT.md
./scripts/setup-linux.sh
docker compose up -d
```

### Production (RHEL Air-Gapped)
```bash
# See RHEL_AIRGAP_PRODUCTION.md
# 1. Create package on internet-connected machine
./scripts/package-airgap.sh

# 2. Transfer to air-gapped server
# 3. Install
./scripts/install-airgap.sh
```

### Production (AWS GovCloud)
```bash
# See AWS_GOVCLOUD_ITAR.md
cd terraform/aws-govcloud
terraform init
terraform plan
terraform apply
```

## Architecture

### Microservices (8 Services)
1. Auth Service (port 3001)
2. Work Order Service (port 3002)
3. Quality Service (port 3003)
4. Material Service (port 3004)
5. Traceability Service (port 3005)
6. Resource Service (port 3006)
7. Reporting Service (port 3007)
8. Integration Service (port 3008)

### Infrastructure
- **Databases**: 8 PostgreSQL instances (Database Per Service pattern)
- **Message Queue**: Apache Kafka (3-node cluster)
- **Cache**: Redis
- **API Gateway**: NGINX
- **Monitoring**: Prometheus + Grafana

## Deployment Comparison

| Feature | Windows Dev | Linux Dev | RHEL Air-Gap | AWS GovCloud |
|---------|-------------|-----------|--------------|--------------|
| **Platform** | Windows 10/11 | Ubuntu/Debian | RHEL 8/9 | AWS EKS |
| **Internet Required** | Yes | Yes | No | Yes |
| **Complexity** | Low | Low | High | High |
| **Setup Time** | 30-45 min | 20-30 min | 2-4 hours | 4-6 hours |
| **High Availability** | No | No | Yes | Yes |
| **Auto-Scaling** | No | No | No | Yes |
| **Managed Services** | No | No | No | Yes (RDS, MSK, ElastiCache) |
| **Cost** | Free | Free | Hardware only | ~$1,500-3,000/month |
| **ITAR Compliant** | No | No | Yes | Yes |
| **Best For** | Local dev | Local dev | Secure production | Cloud production |

## Resource Requirements

### Development
- **CPU**: 4-8 cores
- **RAM**: 16-32 GB
- **Disk**: 50-100 GB

### Production
- **CPU**: 16-32 cores
- **RAM**: 64-128 GB
- **Disk**: 500 GB - 1 TB SSD
- **Network**: High-speed, low-latency

## Support

- **Documentation**: See individual deployment guides
- **Scripts**: All automation scripts in `scripts/` directory
- **Issues**: GitHub Issues
- **Internal Wiki**: [Your wiki link]

## Next Steps

1. Choose your deployment environment
2. Read the corresponding deployment guide
3. Run prerequisite checks
4. Execute deployment scripts
5. Verify installation
6. Configure monitoring
7. Set up backups

---

**Last Updated**: 2025-10-19
**Version**: 1.0.0
