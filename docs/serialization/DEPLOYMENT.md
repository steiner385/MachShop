# Deployment Guide: Serialization System

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Service Initialization](#service-initialization)
6. [Health Checks & Verification](#health-checks--verification)
7. [Monitoring & Logging](#monitoring--logging)
8. [Scaling Considerations](#scaling-considerations)
9. [Backup & Recovery](#backup--recovery)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

| Component | Requirement | Version |
|-----------|-------------|---------|
| Node.js | Runtime | ≥18.0.0 |
| PostgreSQL | Database | ≥13.0 |
| Redis | Cache/Queue | ≥6.0 |
| npm | Package Manager | ≥8.0.0 |

### Required Disk Space

- Application files: ~500 MB
- Database (estimated): 10 GB minimum (scales with volume)
- Logs (daily rotation): ~2 GB per week
- Backups: Minimum 2x database size

### Network Requirements

- Outbound HTTPS for external integrations
- Internal communication between services (4000-4010 port range)
- Database connectivity (port 5432)
- Redis connectivity (port 6379)

### User Permissions

```bash
# Database user must have permissions for:
GRANT CREATE, CONNECT, TEMPORARY ON DATABASE mes_prod_db TO serialization_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO serialization_user;

# Application must run with appropriate Linux user
sudo useradd -m -s /bin/bash machshop
```

---

## Pre-Deployment Checklist

- [ ] All services have been unit tested locally
- [ ] Integration tests pass with production database schema
- [ ] Environment variables documented and validated
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Stakeholders notified of deployment window
- [ ] DNS/Load balancer configured if needed

---

## Environment Setup

### 1. Install Dependencies

```bash
# Backend dependencies
cd /home/machshop/MachShop
npm install

# Frontend dependencies (if deploying UI)
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env.production` file:

```env
# Application
NODE_ENV=production
APP_PORT=4000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://serialization_user:password@db-host:5432/mes_prod_db
DB_POOL_SIZE=20
DB_IDLE_TIMEOUT=30000

# Redis
REDIS_URL=redis://redis-host:6379/0
REDIS_DB=0
REDIS_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your-very-secure-jwt-secret-key
JWT_EXPIRATION=24h

# API Configuration
API_BASE_URL=https://api.machshop.example.com
CORS_ORIGINS=https://app.machshop.example.com,https://admin.machshop.example.com

# Serialization Service
SERIAL_BATCH_SIZE=100
SERIAL_UNIQUENESS_CACHE_TTL=3600
SERIAL_PROPAGATION_DEPTH_LIMIT=50

# Audit Trail
AUDIT_RETENTION_DAYS=2555  # ~7 years for compliance
AUDIT_BATCH_WRITE_SIZE=500

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-api-key
PROMETHEUS_ENABLED=true

# Email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@machshop.example.com
SMTP_PASSWORD=your_email_password
```

### 3. Build Application

```bash
# Compile TypeScript
npm run build

# Verify build output
ls -la dist/

# Minify for production (optional)
npm run build:prod
```

### 4. Set Up Application User

```bash
# Create application user if not exists
sudo useradd -m -s /bin/bash -d /home/machshop machshop

# Set ownership
sudo chown -R machshop:machshop /home/machshop/MachShop
sudo chmod -R 755 /home/machshop/MachShop
```

---

## Database Configuration

### 1. Create Production Database

```bash
# Connect to PostgreSQL
psql -h db-host -U postgres

# Create database
CREATE DATABASE mes_prod_db OWNER postgres;

# Create user
CREATE USER serialization_user WITH ENCRYPTED PASSWORD 'secure_password';

# Grant permissions
GRANT CONNECT ON DATABASE mes_prod_db TO serialization_user;
GRANT USAGE ON SCHEMA public TO serialization_user;
GRANT CREATE ON SCHEMA public TO serialization_user;
```

### 2. Run Database Migrations

```bash
# Using Prisma (if using Prisma ORM)
npx prisma migrate deploy --skip-generate

# Verify migrations completed
npx prisma migrate status
```

### 3. Seed Initial Data

```bash
# Create default configuration
npm run db:seed:production

# Expected seed data:
# - Default trigger types
# - Default pattern templates
# - Admin user account
# - Initial audit log entries
```

### 4. Verify Database Schema

```bash
# Connect to production database
psql -h db-host -U serialization_user mes_prod_db

# Verify tables created
\dt

# Check relationships
\d vendor_serials
\d system_generated_serials
\d late_assignment_placeholders
\d serial_propagations
\d serial_uniqueness_checks
\d serial_assignment_triggers
\d audit_events
```

### 5. Create Indexes for Performance

```sql
-- Performance indexes for frequent queries
CREATE INDEX idx_vendor_serials_part_id ON vendor_serials(part_id);
CREATE INDEX idx_vendor_serials_serial_number ON vendor_serials(serial_number);
CREATE INDEX idx_vendor_serials_status ON vendor_serials(status);
CREATE INDEX idx_vendor_serials_created_at ON vendor_serials(created_at DESC);

CREATE INDEX idx_system_generated_serials_part_id ON system_generated_serials(part_id);
CREATE INDEX idx_system_generated_serials_serial_number ON system_generated_serials(serial_number);
CREATE INDEX idx_system_generated_serials_created_at ON system_generated_serials(created_at DESC);

CREATE INDEX idx_late_assignment_placeholders_part_id ON late_assignment_placeholders(part_id);
CREATE INDEX idx_late_assignment_placeholders_status ON late_assignment_placeholders(status);
CREATE INDEX idx_late_assignment_placeholders_created_at ON late_assignment_placeholders(created_at DESC);

CREATE INDEX idx_serial_propagations_serial_id ON serial_propagations(serial_id);
CREATE INDEX idx_serial_propagations_parent_serial_id ON serial_propagations(parent_serial_id);
CREATE INDEX idx_serial_propagations_child_serial_id ON serial_propagations(child_serial_id);

CREATE INDEX idx_serial_uniqueness_checks_serial_number ON serial_uniqueness_checks(serial_number);
CREATE INDEX idx_serial_uniqueness_checks_part_id ON serial_uniqueness_checks(part_id);
CREATE INDEX idx_serial_uniqueness_checks_scope ON serial_uniqueness_checks(scope);
CREATE INDEX idx_serial_uniqueness_checks_status ON serial_uniqueness_checks(status);

CREATE INDEX idx_audit_events_serial_number ON audit_events(serial_number);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_performed_at ON audit_events(performed_at DESC);
CREATE INDEX idx_audit_events_performed_by ON audit_events(performed_by);

-- Composite indexes for common queries
CREATE INDEX idx_vendor_serials_part_status ON vendor_serials(part_id, status);
CREATE INDEX idx_audit_events_type_time ON audit_events(event_type, performed_at DESC);
```

### 6. Configure Backup Strategy

```bash
# Set up automated daily backups
sudo crontab -e

# Add backup job (runs daily at 2 AM)
0 2 * * * /usr/local/bin/backup-machshop-db.sh

# Backup script: /usr/local/bin/backup-machshop-db.sh
#!/bin/bash
BACKUP_DIR="/backups/machshop"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h db-host -U serialization_user mes_prod_db | gzip > $BACKUP_DIR/mes_prod_db_$DATE.sql.gz
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete  # Keep 30 days
```

---

## Service Initialization

### 1. Start Redis Service

```bash
# Using systemd (recommended)
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Expected response: PONG

# Check Redis status
redis-cli info stats | grep total_connections_received
```

### 2. Start Application Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/machshop-serialization.service
```

**Service file content:**

```ini
[Unit]
Description=MachShop Serialization Service
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=machshop
WorkingDirectory=/home/machshop/MachShop
Environment="NODE_ENV=production"
EnvironmentFile=/home/machshop/MachShop/.env.production
ExecStart=/usr/bin/node --max-old-space-size=4096 dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Process management
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/home/machshop/MachShop/logs

[Install]
WantedBy=multi-user.target
```

**Start the service:**

```bash
sudo systemctl daemon-reload
sudo systemctl start machshop-serialization
sudo systemctl enable machshop-serialization

# Check service status
sudo systemctl status machshop-serialization
```

### 3. Start Frontend Service (if applicable)

```bash
# Build production frontend
cd frontend
npm run build

# Serve with nginx or production server
npm run serve:prod
```

---

## Health Checks & Verification

### 1. API Health Endpoint

```bash
# Check basic health
curl -s http://localhost:4000/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-11-01T10:00:00Z",
#   "uptime": 123.45,
#   "database": "connected",
#   "redis": "connected"
# }
```

### 2. Database Connectivity

```bash
# Verify database connection
curl -s http://localhost:4000/api/v1/health/db | jq .

# Expected response:
# {
#   "status": "connected",
#   "responseTime": 45,
#   "poolConnections": {
#     "total": 20,
#     "idle": 18,
#     "active": 2
#   }
# }
```

### 3. API Endpoints Verification

```bash
# Test vendor serial endpoint
curl -X POST http://localhost:4000/api/v1/serialization/vendor/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vendorSerialNumber": "TEST-2024-001",
    "vendorName": "Test Vendor",
    "partId": "PART-001",
    "receivedDate": "2024-11-01"
  }'

# Test trigger configuration
curl http://localhost:4000/api/v1/serialization/triggers/statistics/PART-001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify audit trail endpoint
curl http://localhost:4000/api/v1/serialization/audit/events?partId=PART-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Database Integrity Check

```bash
# Run database validation
npm run db:validate

# Check for missing indexes
psql -h db-host -U serialization_user mes_prod_db << EOF
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
EOF
```

---

## Monitoring & Logging

### 1. Configure Centralized Logging

**Using ELK Stack (Elasticsearch, Logstash, Kibana):**

```bash
# Install logstash-forwarder or Filebeat
sudo apt-get install filebeat

# Configure Filebeat
sudo nano /etc/filebeat/filebeat.yml
```

**Filebeat configuration:**

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /home/machshop/MachShop/logs/app.log
      - /home/machshop/MachShop/logs/error.log

output.elasticsearch:
  hosts: ["elasticsearch-host:9200"]
  index: "machshop-serialization-%{+yyyy.MM.dd}"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
```

### 2. Configure Prometheus Metrics

```bash
# Metrics exposed on /metrics endpoint
curl -s http://localhost:4000/metrics | head -20
```

**Prometheus scrape config:**

```yaml
scrape_configs:
  - job_name: 'machshop-serialization'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Set Up Alert Rules

**Critical alerts to configure:**

```yaml
groups:
  - name: machshop-serialization
    rules:
      - alert: SerializationServiceDown
        expr: up{job="machshop-serialization"} == 0
        for: 2m
        annotations:
          summary: "Serialization service is down"

      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_active{job="machshop-serialization"} >= db_pool_max
        for: 5m
        annotations:
          summary: "Database connection pool exhausted"

      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate > 5%"

      - alert: SlowQueries
        expr: db_query_duration_seconds_bucket{le="1"} > 0.1
        for: 5m
        annotations:
          summary: "Slow database queries detected"

      - alert: DiskSpaceRunningLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} < 1000000000
        annotations:
          summary: "Disk space < 1GB"
```

### 4. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/machshop

# Content:
/home/machshop/MachShop/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 machshop machshop
    sharedscripts
    postrotate
        systemctl reload machshop-serialization > /dev/null 2>&1 || true
    endscript
}
```

---

## Scaling Considerations

### 1. Database Connection Pooling

```env
# Adjust pool size based on expected concurrent users
DB_POOL_SIZE=20  # Start with 20, increase for higher load
DB_IDLE_TIMEOUT=30000  # Close idle connections after 30s
DB_STATEMENT_CACHE_SIZE=100
```

### 2. Redis Configuration for Caching

```bash
# Adjust Redis maxmemory policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable persistence
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### 3. Load Balancer Setup

```nginx
# Nginx configuration for load balancing
upstream machshop_backend {
    server localhost:4000 max_fails=3 fail_timeout=30s;
    server localhost:4001 max_fails=3 fail_timeout=30s;
    server localhost:4002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.machshop.example.com;

    location / {
        proxy_pass http://machshop_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4. Horizontal Scaling

```bash
# Start multiple application instances
for i in {0..2}; do
    PORT=$((4000 + i)) \
    REDIS_DB=$i \
    npm start &
done

# Use environment variable to route to correct Redis DB
```

---

## Backup & Recovery

### 1. Full Backup Procedure

```bash
#!/bin/bash
# backup-full.sh

BACKUP_DIR="/backups/machshop"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mes_prod_db_$TIMESTAMP.sql.gz"

echo "Starting full backup..."

# Backup database
pg_dump -h db-host \
    -U serialization_user \
    -d mes_prod_db \
    --verbose \
    --format=custom \
    --file="$BACKUP_DIR/mes_prod_db_$TIMESTAMP.dump"

# Compress
gzip "$BACKUP_DIR/mes_prod_db_$TIMESTAMP.dump"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed: $BACKUP_FILE ($SIZE)"
else
    echo "Backup failed!"
    exit 1
fi

# Upload to S3 (optional)
aws s3 cp "$BACKUP_FILE" s3://backups.example.com/machshop/

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
```

### 2. Point-in-Time Recovery

```bash
# Stop application
sudo systemctl stop machshop-serialization

# Restore from backup
gunzip -c /backups/machshop/mes_prod_db_20241101_100000.sql.gz | \
    psql -h db-host -U serialization_user -d mes_prod_db

# Restart application
sudo systemctl start machshop-serialization

# Verify restoration
curl http://localhost:4000/health
```

### 3. Incremental Backups with WAL

```bash
# Enable WAL archiving
echo "archive_mode = on" >> /var/lib/postgresql/14/main/postgresql.conf
echo "archive_command = 'cp %p /backups/wal_archive/%f'" >> postgresql.conf

# Perform base backup
pg_basebackup -h db-host \
    -U replication_user \
    -D /backups/base_backup \
    -X fetch \
    -P \
    -v
```

---

## Rollback Procedures

### 1. Application Rollback

```bash
# Identify previous working version
git tag -l | grep "serialization"

# If deployed from git
git checkout v1.0.0-serialization
npm ci
npm run build

# Restart service
sudo systemctl restart machshop-serialization

# Verify rollback
curl http://localhost:4000/health
```

### 2. Database Rollback

```bash
# List available backups
ls -lh /backups/machshop/

# Stop application before rollback
sudo systemctl stop machshop-serialization

# Restore from backup
psql -h db-host -U postgres << EOF
DROP DATABASE IF EXISTS mes_prod_db;
CREATE DATABASE mes_prod_db OWNER serialization_user;
EOF

gunzip -c /backups/machshop/mes_prod_db_20241031_100000.sql.gz | \
    psql -h db-host -U serialization_user -d mes_prod_db

# Restart application
sudo systemctl start machshop-serialization

# Monitor logs
sudo journalctl -u machshop-serialization -f
```

### 3. Feature Rollback (Feature Flags)

```javascript
// Use feature flags for graceful rollback
if (featureFlags.serialization.enabled) {
    // Use new serialization service
    return await serialization.process(data);
} else {
    // Fall back to legacy system
    return await legacySerial.process(data);
}
```

### 4. Database Migration Rollback

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Revert schema changes
git checkout HEAD~1 -- prisma/schema.prisma
npx prisma migrate deploy

# Verify schema
npx prisma migrate status
```

---

## Post-Deployment Validation

### 1. Functional Testing

```bash
# Run smoke tests
npm run test:smoke

# Load testing with k6
npm run test:load
```

### 2. Performance Baseline

```bash
# Measure response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/health

# Check database query performance
npm run db:analyze-queries
```

### 3. User Acceptance Testing

- [ ] Vendor serial management workflow
- [ ] System-generated serial generation
- [ ] Late assignment processing
- [ ] Serial propagation tracking
- [ ] Uniqueness conflict resolution
- [ ] Trigger execution
- [ ] Audit trail reporting
- [ ] Print template functionality

---

## Common Deployment Issues

| Issue | Solution |
|-------|----------|
| Database connection refused | Check connection string, firewall rules, database service running |
| Out of memory errors | Increase Node.js heap size: `--max-old-space-size=4096` |
| Slow migrations | Check database indexes, migrate outside peak hours |
| Redis connection fails | Verify Redis service, check authentication |
| Port already in use | Change port in .env or kill process: `lsof -i :4000` |

---

## Summary

This deployment guide covers:

- Prerequisites and requirements validation
- Environment and database setup
- Service initialization and startup
- Health checks and verification procedures
- Monitoring, logging, and alerting configuration
- Scaling strategies for production load
- Backup and disaster recovery procedures
- Comprehensive rollback procedures for issues

For support, refer to the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide or contact the platform team.
