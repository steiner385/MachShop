# MES System - Windows Development Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the MES (Manufacturing Execution System) on Windows for local development using Docker Desktop with WSL2.

**Deployment Method**: Docker Compose
**Target Environment**: Windows 10/11 with WSL2
**Complexity**: Beginner-friendly
**Estimated Setup Time**: 30-45 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Starting the System](#starting-the-system)
6. [Accessing Services](#accessing-services)
7. [Development Workflow](#development-workflow)
8. [Backup and Restore](#backup-and-restore)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Troubleshooting](#troubleshooting)
11. [Performance Tuning](#performance-tuning)

---

## Prerequisites

### Required Software

1. **Windows 10/11** (64-bit)
   - Windows 10 version 2004 or higher (Build 19041 or higher)
   - Windows 11 (all versions)

2. **WSL2 (Windows Subsystem for Linux)**
   - Required for Docker Desktop
   - Ubuntu 20.04 or 22.04 LTS recommended

3. **Docker Desktop for Windows**
   - Version 4.0.0 or higher
   - Includes Docker Engine and Docker Compose

4. **Git for Windows**
   - For cloning the repository

5. **Visual Studio Code** (recommended)
   - WSL extension
   - Docker extension
   - Remote Development extension pack

---

## System Requirements

### Minimum Requirements

- **CPU**: 4 cores (Intel i5 or AMD Ryzen 5)
- **RAM**: 16 GB
- **Disk Space**: 50 GB free
- **Network**: Stable internet connection (for initial setup)

### Recommended Requirements

- **CPU**: 8 cores (Intel i7/i9 or AMD Ryzen 7/9)
- **RAM**: 32 GB
- **Disk Space**: 100 GB free SSD
- **Network**: High-speed internet connection

### Docker Desktop Resource Allocation

Configure Docker Desktop resources:
- **CPUs**: 6-8 cores
- **Memory**: 12-16 GB
- **Swap**: 4 GB
- **Disk Image Size**: 60 GB

---

## Installation Steps

### Step 1: Enable WSL2

Open PowerShell as Administrator and run:

```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart your computer
Restart-Computer
```

After restart, set WSL2 as default:

```powershell
wsl --set-default-version 2
```

### Step 2: Install Ubuntu on WSL2

1. Open Microsoft Store
2. Search for "Ubuntu 22.04 LTS"
3. Click "Get" to install
4. Launch Ubuntu and create a user account

### Step 3: Install Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run the installer
3. During installation, ensure "Use WSL 2 instead of Hyper-V" is checked
4. Restart your computer when prompted

### Step 4: Configure Docker Desktop

1. Open Docker Desktop
2. Go to Settings → General
   - ✓ Use the WSL 2 based engine
   - ✓ Start Docker Desktop when you log in

3. Go to Settings → Resources → WSL Integration
   - ✓ Enable integration with my default WSL distro
   - ✓ Enable Ubuntu-22.04

4. Go to Settings → Resources → Advanced
   - CPUs: 6-8
   - Memory: 12 GB
   - Swap: 4 GB
   - Disk image size: 60 GB

5. Click "Apply & Restart"

### Step 5: Verify Installation

Open WSL Ubuntu terminal:

```bash
# Verify Docker is running
docker --version
docker compose version

# Test Docker
docker run hello-world
```

### Step 6: Clone the MES Repository

```bash
# Navigate to your preferred directory
cd ~

# Clone the repository
git clone https://github.com/your-org/mes.git
cd mes
```

---

## Configuration

### Step 1: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Edit the file (use nano, vim, or VS Code)
code .env
```

### Step 2: Configure Environment Variables

Update the `.env` file with your settings:

```bash
# Node Environment
NODE_ENV=development
LOG_LEVEL=debug

# Database Passwords (change these!)
POSTGRES_AUTH_PASSWORD=your_secure_password_1
POSTGRES_WORK_ORDER_PASSWORD=your_secure_password_2
POSTGRES_QUALITY_PASSWORD=your_secure_password_3
POSTGRES_MATERIAL_PASSWORD=your_secure_password_4
POSTGRES_TRACEABILITY_PASSWORD=your_secure_password_5
POSTGRES_RESOURCE_PASSWORD=your_secure_password_6
POSTGRES_REPORTING_PASSWORD=your_secure_password_7
POSTGRES_INTEGRATION_PASSWORD=your_secure_password_8

# JWT Secret (generate a strong secret)
JWT_SECRET=your_jwt_secret_min_32_characters_long

# Grafana Credentials
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

### Step 3: Generate Secure Passwords (Optional)

Use PowerShell to generate secure passwords:

```powershell
# Generate a random password
Add-Type -AssemblyName 'System.Web'
[System.Web.Security.Membership]::GeneratePassword(32, 8)
```

Or in WSL:

```bash
# Generate random password
openssl rand -base64 32
```

### Step 4: Configure Docker Compose (Optional)

For development, you may want to adjust resource limits in `docker-compose.prod.yml` or use only the base `docker-compose.yml`.

---

## Starting the System

### Full Stack Startup

```bash
# Start all services
docker compose up -d

# View startup logs
docker compose logs -f
```

### Start Specific Services

```bash
# Start only databases
docker compose up -d postgres-auth postgres-work-order postgres-quality postgres-material postgres-traceability postgres-resource postgres-reporting postgres-integration

# Start only infrastructure
docker compose up -d kafka zookeeper redis

# Start only application services
docker compose up -d auth-service work-order-service quality-service material-service traceability-service resource-service reporting-service integration-service

# Start monitoring
docker compose up -d prometheus grafana
```

### Wait for Services to be Ready

```bash
# Check service health
docker compose ps

# Wait for all services to be healthy
docker compose exec auth-service npm run health-check
```

### Run Database Migrations

```bash
# Run migrations for all services
docker compose exec auth-service npx prisma migrate deploy
docker compose exec work-order-service npx prisma migrate deploy
docker compose exec quality-service npx prisma migrate deploy
docker compose exec material-service npx prisma migrate deploy
docker compose exec traceability-service npx prisma migrate deploy
docker compose exec resource-service npx prisma migrate deploy
docker compose exec reporting-service npx prisma migrate deploy
docker compose exec integration-service npx prisma migrate deploy
```

Or use the automation script:

```bash
# From Windows PowerShell or WSL
./scripts/run-migrations.sh
```

### Seed Database (Optional)

```bash
# Seed the database with sample data
docker compose exec auth-service npm run seed
docker compose exec work-order-service npm run seed
docker compose exec quality-service npm run seed
```

---

## Accessing Services

### Frontend Application

- **URL**: http://localhost:8080
- **Default Login**: Use demo credentials from `src/config/demoCredentials.ts`

### API Endpoints

- **API Gateway**: http://localhost:8080/api
- **Auth Service**: http://localhost:3001
- **Work Order Service**: http://localhost:3002
- **Quality Service**: http://localhost:3003
- **Material Service**: http://localhost:3004
- **Traceability Service**: http://localhost:3005
- **Resource Service**: http://localhost:3006
- **Reporting Service**: http://localhost:3007
- **Integration Service**: http://localhost:3008

### Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
  - Username: `admin`
  - Password: `admin` (or value from .env)

### Database Access

Connect to databases using any PostgreSQL client:

```
Host: localhost
Ports: 5432-5439
Usernames: mes_<service>_user
Passwords: From .env file
```

Example connection string:
```
postgresql://mes_auth_user:your_password@localhost:5432/mes_auth
```

### Message Queue

- **Kafka**: localhost:29092 (from host)
- **Kafka**: kafka:9092 (from containers)

### Cache

- **Redis**: localhost:6379

---

## Development Workflow

### Code Changes with Hot Reload

The Docker Compose development setup includes volume mounts for hot reload:

```bash
# Edit code in VS Code
code .

# Changes to ./src and ./frontend/src are automatically reflected
# Services will restart automatically when file changes are detected
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f auth-service

# Last 100 lines
docker compose logs --tail=100 auth-service
```

### Running Tests

```bash
# Unit tests
docker compose exec auth-service npm test

# E2E tests
docker compose exec auth-service npm run test:e2e

# Run tests on host (recommended for better performance)
npm test
npm run test:e2e
```

### Database Operations

```bash
# Access database CLI
docker compose exec postgres-auth psql -U mes_auth_user -d mes_auth

# Create a migration
docker compose exec auth-service npx prisma migrate dev --name your_migration_name

# Reset database (⚠️ destroys all data)
docker compose exec auth-service npx prisma migrate reset
```

### Rebuilding Services

```bash
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build auth-service

# Rebuild and restart
docker compose up -d --build auth-service
```

---

## Backup and Restore

### Database Backup

#### Backup All Databases

```bash
# Run the backup script
./scripts/backup-databases.sh

# Backups are stored in ./backups/<timestamp>
```

#### Manual Backup

```bash
# Backup a specific database
docker compose exec postgres-auth pg_dump -U mes_auth_user mes_auth > backup-auth-$(date +%Y%m%d).sql

# Backup all databases
for service in auth work-order quality material traceability resource reporting integration; do
  docker compose exec postgres-$service pg_dump -U mes_${service//-/_}_user mes_$service > backup-$service-$(date +%Y%m%d).sql
done
```

### Database Restore

```bash
# Restore a specific database
cat backup-auth-20251019.sql | docker compose exec -T postgres-auth psql -U mes_auth_user mes_auth

# Or use the restore script
./scripts/restore-databases.sh backup-auth-20251019.sql auth
```

### Volume Backup

```bash
# Backup Docker volumes
docker run --rm -v mes_postgres-auth-data:/data -v ${PWD}/backups:/backup ubuntu tar czf /backup/postgres-auth-volume.tar.gz /data

# Restore Docker volume
docker run --rm -v mes_postgres-auth-data:/data -v ${PWD}/backups:/backup ubuntu tar xzf /backup/postgres-auth-volume.tar.gz -C /
```

### Configuration Backup

```bash
# Backup configuration files
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup
```

---

## Monitoring and Logs

### Prometheus Metrics

1. Open http://localhost:9090
2. Try these queries:
   - `up{job=~"mes-.*"}` - Service availability
   - `rate(http_requests_total[5m])` - Request rate
   - `http_request_duration_seconds` - Response times

### Grafana Dashboards

1. Open http://localhost:3000
2. Login with admin/admin
3. Navigate to Dashboards → MES System Overview
4. Available metrics:
   - Service health status
   - Request rates and error rates
   - Response times (p50, p95, p99)
   - Database connections
   - Kafka consumer lag
   - Memory and CPU usage

### Log Aggregation

```bash
# View logs from all services
docker compose logs -f

# Filter logs by service
docker compose logs -f auth-service work-order-service

# Search logs
docker compose logs | grep ERROR
docker compose logs | grep -i "authentication failed"

# Save logs to file
docker compose logs > logs-$(date +%Y%m%d-%H%M%S).txt
```

### Health Checks

```bash
# Check all service health
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/work-orders/health
curl http://localhost:8080/api/quality/health
curl http://localhost:8080/api/materials/health
curl http://localhost:8080/api/traceability/health
curl http://localhost:8080/api/resources/health
curl http://localhost:8080/api/reports/health
curl http://localhost:8080/api/integrations/health
```

---

## Troubleshooting

### Docker Desktop Not Starting

**Issue**: Docker Desktop fails to start

**Solutions**:
1. Ensure WSL2 is enabled: `wsl --status`
2. Update WSL2 kernel: `wsl --update`
3. Restart Docker Desktop as Administrator
4. Check Docker Desktop logs: `%APPDATA%\Docker\log.txt`

### Services Won't Start

**Issue**: `docker compose up` fails

**Solutions**:

```bash
# Check Docker is running
docker ps

# Check for port conflicts
netstat -ano | findstr "3001"
netstat -ano | findstr "5432"

# Clean up and retry
docker compose down
docker compose up -d --force-recreate
```

### Database Connection Errors

**Issue**: Services can't connect to databases

**Solutions**:

```bash
# Check database is running
docker compose ps postgres-auth

# Check database logs
docker compose logs postgres-auth

# Verify credentials in .env
cat .env | grep POSTGRES_AUTH

# Test connection manually
docker compose exec postgres-auth psql -U mes_auth_user -d mes_auth -c "SELECT 1;"
```

### Out of Memory Errors

**Issue**: Services crash with OOM errors

**Solutions**:
1. Increase Docker Desktop memory allocation (Settings → Resources)
2. Reduce number of running services
3. Use production compose file: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

### Slow Performance

**Issue**: System is slow or unresponsive

**Solutions**:

```bash
# Check resource usage
docker stats

# Reduce log verbosity in .env
LOG_LEVEL=warn

# Enable Docker BuildKit for faster builds
# Add to ~/.bashrc or ~/.zshrc
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### WSL2 Disk Space Issues

**Issue**: WSL2 disk image fills up

**Solutions**:

```powershell
# In PowerShell (as Administrator)

# Compact WSL disk
wsl --shutdown
Optimize-VHD -Path $env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx -Mode Full

# Clean Docker
docker system prune -a --volumes
```

### Hot Reload Not Working

**Issue**: Code changes don't trigger reload

**Solutions**:

```bash
# Ensure volumes are mounted correctly
docker compose config | grep volumes

# Restart the specific service
docker compose restart auth-service

# Check file permissions in WSL
ls -la ./src
```

---

## Performance Tuning

### Docker Desktop Optimization

1. **Enable WSL2 Backend**
   - Significantly faster than Hyper-V

2. **Allocate Sufficient Resources**
   - CPUs: 50-75% of available cores
   - Memory: 50-75% of available RAM

3. **Use Docker BuildKit**
   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

4. **Enable File Sharing Cache**
   - Settings → General → Use gRPC FUSE for file sharing

### WSL2 Configuration

Create or edit `C:\Users\<YourUsername>\.wslconfig`:

```ini
[wsl2]
memory=16GB
processors=8
swap=8GB
localhostForwarding=true
```

### Development vs Production Mode

```bash
# Development (with hot reload, verbose logs)
docker compose up -d

# Production-like (optimized, resource limits)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Database Performance

```bash
# Increase shared_buffers for PostgreSQL
# Edit docker-compose.prod.yml and add to command:
command: postgres -c shared_buffers=256MB -c effective_cache_size=1GB
```

---

## Stopping the System

### Graceful Shutdown

```bash
# Stop all services
docker compose stop

# Stop specific services
docker compose stop auth-service work-order-service
```

### Remove Containers (Keep Data)

```bash
# Stop and remove containers
docker compose down

# Data in volumes is preserved
```

### Complete Cleanup (⚠️ Destroys All Data)

```bash
# Stop and remove everything including volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Clean Docker system
docker system prune -a --volumes
```

---

## Additional Resources

### Documentation

- [Docker Desktop Documentation](https://docs.docker.com/desktop/windows/)
- [WSL2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Scripts

- `./scripts/setup-windows.ps1` - Automated setup script
- `./scripts/backup-databases.sh` - Database backup utility
- `./scripts/restore-databases.sh` - Database restore utility
- `./scripts/run-migrations.sh` - Run all migrations

### Support

- GitHub Issues: https://github.com/your-org/mes/issues
- Internal Wiki: [Link to your wiki]
- Slack Channel: #mes-support

---

## Quick Reference Commands

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Rebuild and restart
docker compose up -d --build

# Database backup
./scripts/backup-databases.sh

# Run migrations
./scripts/run-migrations.sh

# Check status
docker compose ps

# Clean up
docker compose down -v
docker system prune -a
```

---

**Last Updated**: 2025-10-19
**Version**: 1.0.0
**Maintained By**: MES DevOps Team
