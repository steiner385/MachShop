# Deployment Guide - Kitting & Material Staging System

## Overview

This guide provides comprehensive instructions for deploying the Kitting & Material Staging System in production environments. It covers infrastructure requirements, installation procedures, configuration management, and operational best practices.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [Installation Process](#installation-process)
4. [Configuration Management](#configuration-management)
5. [Database Setup](#database-setup)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Hardware Requirements

#### Production Environment
- **Application Server**:
  - CPU: 8 cores, 2.4 GHz
  - RAM: 32 GB
  - Storage: 500 GB SSD
  - Network: 1 Gbps

- **Database Server**:
  - CPU: 16 cores, 2.8 GHz
  - RAM: 64 GB
  - Storage: 2 TB NVMe SSD (with RAID 10)
  - Network: 10 Gbps

- **Load Balancer**:
  - CPU: 4 cores, 2.0 GHz
  - RAM: 8 GB
  - Storage: 100 GB SSD

#### High Availability Setup
For enterprise environments handling 25,000+ parts:
- **Minimum 3 application servers** (active-active-passive)
- **Database cluster** with primary/replica configuration
- **Redis cluster** for session management and caching
- **Dedicated monitoring server**

### Software Requirements

#### Operating System
- **Primary**: Ubuntu 22.04 LTS or RHEL 9
- **Alternative**: CentOS Stream 9, Debian 12

#### Runtime Environment
- **Node.js**: Version 18.x or 20.x LTS
- **PostgreSQL**: Version 14.x or 15.x
- **Redis**: Version 7.x
- **Nginx**: Version 1.20+ (reverse proxy/load balancer)

#### Development Tools
- **Git**: Version 2.x
- **Docker**: Version 24.x (optional, for containerized deployment)
- **PM2**: Version 5.x (process management)

## Infrastructure Architecture

### Recommended Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                        │
│                      (Nginx/HAProxy)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
            ┌─────────┼─────────┐
            │         │         │
    ┌───────▼───┐ ┌───▼───┐ ┌───▼───┐
    │   App     │ │  App  │ │  App  │
    │ Server 1  │ │Server2│ │Server3│
    │(Active)   │ │(Active│ │(Standby)
    └─────┬─────┘ └───┬───┘ └───┬───┘
          │           │         │
          └─────┬─────┼─────────┘
                │     │
    ┌───────────▼─────▼─────────────┐
    │         Database Cluster      │
    │  ┌─────────┐    ┌─────────┐   │
    │  │Primary  │◄──►│ Replica │   │
    │  │(Write)  │    │ (Read)  │   │
    │  └─────────┘    └─────────┘   │
    └───────────────────────────────┘
                │
    ┌───────────▼─────────────┐
    │      Redis Cluster      │
    │   (Session & Cache)     │
    └─────────────────────────┘
```

### Network Configuration

#### Firewall Rules
```bash
# HTTP/HTTPS traffic
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Application servers (internal only)
iptables -A INPUT -p tcp --dport 3000 -s 10.0.1.0/24 -j ACCEPT

# Database (application servers only)
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.0/24 -j ACCEPT

# Redis (application servers only)
iptables -A INPUT -p tcp --dport 6379 -s 10.0.1.0/24 -j ACCEPT

# SSH (management network only)
iptables -A INPUT -p tcp --dport 22 -s 10.0.100.0/24 -j ACCEPT
```

#### DNS Configuration
Set up proper DNS records:
```
kitting.yourdomain.com      A    <load_balancer_ip>
kitting-api.yourdomain.com  A    <load_balancer_ip>
kitting-db.yourdomain.com   A    <database_ip>
```

## Installation Process

### 1. Prepare the Environment

#### System Updates
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx postgresql-client redis-tools

# RHEL/CentOS
sudo dnf update -y
sudo dnf install -y curl wget git nginx postgresql redis
```

#### Create Application User
```bash
sudo useradd -m -s /bin/bash kitting
sudo usermod -aG sudo kitting
sudo mkdir -p /opt/kitting
sudo chown kitting:kitting /opt/kitting
```

### 2. Install Node.js

#### Using NodeSource Repository
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show compatible version
```

### 3. Clone and Setup Application

#### Download Application Code
```bash
sudo -u kitting -i
cd /opt/kitting
git clone https://github.com/yourorg/machshop.git .
git checkout main  # or specific release tag

# Install dependencies
npm ci --production
npm run build
```

#### Install PM2 Process Manager
```bash
sudo npm install -g pm2
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u kitting --hp /home/kitting
```

### 4. Database Installation

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install -y postgresql postgresql-contrib

# RHEL/CentOS
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
```

#### Configure PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE kitting_production;
CREATE USER kitting_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE kitting_production TO kitting_user;
ALTER USER kitting_user CREATEDB;
\q
EOF
```

#### Configure PostgreSQL Settings
Edit `/etc/postgresql/14/main/postgresql.conf`:
```ini
# Memory settings
shared_buffers = 16GB                # 25% of total RAM
effective_cache_size = 48GB          # 75% of total RAM
work_mem = 256MB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connection settings
max_connections = 200
listen_addresses = '*'

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_min_duration_statement = 1000
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:
```
# Application connections
host    kitting_production    kitting_user    10.0.1.0/24    md5
```

### 5. Redis Installation

#### Install and Configure Redis
```bash
# Ubuntu/Debian
sudo apt install -y redis-server

# RHEL/CentOS
sudo dnf install -y redis
```

Edit `/etc/redis/redis.conf`:
```ini
# Security
requirepass your_redis_password_here
bind 127.0.0.1 10.0.1.100

# Memory management
maxmemory 8gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

## Configuration Management

### Environment Variables

Create `/opt/kitting/.env.production`:
```bash
# Application Settings
NODE_ENV=production
PORT=3000
APP_NAME="Kitting & Material Staging System"
APP_VERSION="1.0.0"

# Database Configuration
DATABASE_URL="postgresql://kitting_user:secure_password@10.0.1.200:5432/kitting_production"
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL="redis://:your_redis_password@10.0.1.201:6379/0"
REDIS_SESSION_TTL=86400

# Security
JWT_SECRET="your_super_secure_jwt_secret_here"
API_KEY_SECRET="your_api_key_encryption_secret"
CSRF_SECRET="your_csrf_secret_here"

# External Integrations
ERP_API_URL="https://your-erp.company.com/api/v1"
ERP_API_KEY="your_erp_api_key"
BARCODE_SCANNER_CONFIG="zebra_tc20"

# Email Configuration
SMTP_HOST="smtp.company.com"
SMTP_PORT=587
SMTP_USER="kitting@company.com"
SMTP_PASS="email_password"

# Monitoring
LOG_LEVEL="info"
ENABLE_METRICS=true
METRICS_PORT=9090

# File Storage
UPLOAD_PATH="/opt/kitting/uploads"
MAX_FILE_SIZE=10485760  # 10MB
```

### PM2 Configuration

Create `/opt/kitting/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'kitting-system',
    script: 'dist/server.js',
    cwd: '/opt/kitting',
    instances: 4,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/kitting/err.log',
    out_file: '/var/log/kitting/out.log',
    log_file: '/var/log/kitting/combined.log',
    time: true
  }]
};
```

### Nginx Configuration

Create `/etc/nginx/sites-available/kitting`:
```nginx
upstream kitting_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name kitting.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kitting.yourdomain.com;

    ssl_certificate /etc/ssl/certs/kitting.crt;
    ssl_certificate_key /etc/ssl/private/kitting.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=3r/m;

    # Static files
    location /static/ {
        alias /opt/kitting/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://kitting_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Login endpoint
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://kitting_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main application
    location / {
        proxy_pass http://kitting_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Setup

### Initialize Database Schema

```bash
cd /opt/kitting
npx prisma migrate deploy
npx prisma generate
npx prisma db seed --preview-feature
```

### Database Optimization

#### Create Indexes for Performance
```sql
-- Kit search optimization
CREATE INDEX CONCURRENTLY idx_kits_status_priority ON kits(status, priority);
CREATE INDEX CONCURRENTLY idx_kits_work_order ON kits(work_order_id);
CREATE INDEX CONCURRENTLY idx_kits_due_date ON kits(due_date);
CREATE INDEX CONCURRENTLY idx_kits_created_at ON kits(created_at);

-- Kit items optimization
CREATE INDEX CONCURRENTLY idx_kit_items_kit_id ON kit_items(kit_id);
CREATE INDEX CONCURRENTLY idx_kit_items_part_id ON kit_items(part_id);

-- Staging locations optimization
CREATE INDEX CONCURRENTLY idx_staging_locations_area ON staging_locations(area_name);
CREATE INDEX CONCURRENTLY idx_staging_locations_type ON staging_locations(location_type);

-- Performance analytics
CREATE INDEX CONCURRENTLY idx_kit_status_history ON kit_status_history(kit_id, timestamp);
```

#### Configure Database Backups
```bash
# Create backup script
sudo tee /opt/kitting/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/kitting"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="kitting_backup_${DATE}.sql"

mkdir -p ${BACKUP_DIR}
pg_dump -h localhost -U kitting_user -d kitting_production > ${BACKUP_DIR}/${BACKUP_FILE}
gzip ${BACKUP_DIR}/${BACKUP_FILE}

# Keep only last 30 days
find ${BACKUP_DIR} -name "*.gz" -mtime +30 -delete
EOF

chmod +x /opt/kitting/scripts/backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/kitting/scripts/backup.sh") | crontab -
```

## Security Configuration

### SSL/TLS Setup

#### Generate SSL Certificate (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kitting.yourdomain.com
```

#### Configure Security Headers
Add to Nginx configuration:
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Application Security

#### Enable CSRF Protection
In application configuration:
```javascript
// Enable CSRF protection
app.use(csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
}));
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);
```

### Database Security

#### Configure Connection Security
```ini
# In postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
password_encryption = scram-sha-256
```

## Monitoring & Logging

### Application Monitoring

#### Install Prometheus & Grafana
```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
sudo mv prometheus-2.40.0.linux-amd64 /opt/prometheus
sudo chown -R kitting:kitting /opt/prometheus
```

#### Configure Application Metrics
Create `/opt/kitting/monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kitting-app'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

### Centralized Logging

#### Configure Logrotate
Create `/etc/logrotate.d/kitting`:
```
/var/log/kitting/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload pm2-kitting
    endscript
}
```

#### ELK Stack Integration
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.5.0-amd64.deb
sudo dpkg -i filebeat-8.5.0-amd64.deb

# Configure Filebeat
sudo tee /etc/filebeat/filebeat.yml << 'EOF'
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/kitting/*.log
  fields:
    service: kitting-system
  fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch.company.com:9200"]
  index: "kitting-logs-%{+yyyy.MM.dd}"

setup.template.name: "kitting"
setup.template.pattern: "kitting-*"
EOF
```

## Backup & Recovery

### Automated Backup Strategy

#### Database Backup Script
```bash
#!/bin/bash
# /opt/kitting/scripts/backup-database.sh

set -e

BACKUP_DIR="/backup/kitting/database"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Full database backup
pg_dump \
    --host=localhost \
    --username=kitting_user \
    --dbname=kitting_production \
    --format=custom \
    --compress=9 \
    --file=${BACKUP_DIR}/kitting_full_${DATE}.dump

# Compress and encrypt
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric \
    --output ${BACKUP_DIR}/kitting_full_${DATE}.dump.gpg \
    ${BACKUP_DIR}/kitting_full_${DATE}.dump

rm ${BACKUP_DIR}/kitting_full_${DATE}.dump

# Upload to cloud storage (AWS S3 example)
aws s3 cp ${BACKUP_DIR}/kitting_full_${DATE}.dump.gpg \
    s3://your-backup-bucket/kitting/database/

# Clean old backups
find ${BACKUP_DIR} -name "*.dump.gpg" -mtime +${RETENTION_DAYS} -delete
```

#### Application Code Backup
```bash
#!/bin/bash
# /opt/kitting/scripts/backup-application.sh

set -e

BACKUP_DIR="/backup/kitting/application"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p ${BACKUP_DIR}

# Backup application code and configuration
tar -czf ${BACKUP_DIR}/kitting_app_${DATE}.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=uploads \
    /opt/kitting/

# Upload to cloud storage
aws s3 cp ${BACKUP_DIR}/kitting_app_${DATE}.tar.gz \
    s3://your-backup-bucket/kitting/application/

# Clean old backups
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete
```

### Disaster Recovery Procedures

#### Database Recovery
```bash
# Stop application
sudo systemctl stop pm2-kitting

# Restore database from backup
pg_restore \
    --host=localhost \
    --username=kitting_user \
    --dbname=kitting_production \
    --clean \
    --if-exists \
    /backup/kitting/database/kitting_full_YYYYMMDD_HHMMSS.dump

# Restart application
sudo systemctl start pm2-kitting
```

## Performance Optimization

### Application Performance

#### PM2 Cluster Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kitting-system',
    script: 'dist/server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '2G',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production',
      UV_THREADPOOL_SIZE: 16
    }
  }]
};
```

#### Redis Caching Strategy
```javascript
// Cache frequently accessed data
const Redis = require('redis');
const client = Redis.createClient({
  url: process.env.REDIS_URL,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Cache kit data for 5 minutes
const cacheKey = `kit:${kitId}`;
const cached = await client.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const kitData = await fetchKitFromDatabase(kitId);
await client.setex(cacheKey, 300, JSON.stringify(kitData));
```

### Database Performance Tuning

#### Connection Pooling
```javascript
// Configure database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,        // maximum number of clients
  min: 5,         // minimum number of clients
  idle: 10000,    // close & remove clients after 10 seconds
  acquire: 60000, // return error after 60 seconds
  evict: 1000     // check for idle clients every second
});
```

#### Query Optimization
```sql
-- Use EXPLAIN ANALYZE to optimize slow queries
EXPLAIN ANALYZE SELECT k.*, ki.*
FROM kits k
JOIN kit_items ki ON k.id = ki.kit_id
WHERE k.status = 'STAGING'
AND k.priority = 'HIGH'
ORDER BY k.due_date;

-- Create covering indexes
CREATE INDEX CONCURRENTLY idx_kits_staging_high_priority
ON kits(status, priority, due_date)
WHERE status = 'STAGING' AND priority = 'HIGH';
```

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Monitor memory usage
free -h
ps aux --sort=-%mem | head -20

# PM2 memory monitoring
pm2 monit

# Database memory tuning
SELECT name, setting, unit FROM pg_settings
WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem');
```

#### Slow Database Queries
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### Application Errors
```bash
# Check application logs
pm2 logs kitting-system --lines 100

# Check system resources
top -p $(pgrep -d',' node)
iostat -x 1 5
```

### Health Check Scripts

#### Application Health Check
```bash
#!/bin/bash
# /opt/kitting/scripts/health-check.sh

HEALTH_URL="http://localhost:3000/health"
TIMEOUT=10

if curl -f -s --max-time ${TIMEOUT} ${HEALTH_URL} > /dev/null; then
    echo "Application is healthy"
    exit 0
else
    echo "Application health check failed"
    # Send alert notification
    curl -X POST "https://hooks.slack.com/your-webhook" \
        -d '{"text":"Kitting system health check failed"}'
    exit 1
fi
```

#### Database Health Check
```bash
#!/bin/bash
# Check database connectivity

psql -h localhost -U kitting_user -d kitting_production -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Database is accessible"
else
    echo "Database connection failed"
    exit 1
fi
```

---

**Support**: For deployment assistance, contact the system administration team or reference the [troubleshooting guide](../troubleshooting/README.md).