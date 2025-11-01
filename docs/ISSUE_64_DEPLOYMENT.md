# Material Movement & Logistics Management System - Deployment Guide
**Issue #64**

## Deployment Overview

This guide covers deploying the Material Movement & Logistics Management System to production environments.

## Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- AWS/GCP/Azure account (for cloud deployment)
- SSL certificates for HTTPS

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mes_production_db;
CREATE DATABASE mes_staging_db;

# Create user with privileges
CREATE USER mes_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE mes_production_db TO mes_user;
GRANT ALL PRIVILEGES ON DATABASE mes_staging_db TO mes_user;

# Exit
\q
```

### 2. Run Migrations

```bash
# Set database URL
export DATABASE_URL="postgresql://mes_user:secure_password_here@localhost:5432/mes_production_db"

# Run Prisma migrations
npm run prisma:migrate

# Verify schema
npm run prisma:validate
```

### 3. Seed Initial Data (Optional)

```bash
npm run prisma:seed
```

## Environment Configuration

### 1. Create .env Files

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://mes_user:password@db-host:5432/mes_production_db
API_PORT=3000
FRONTEND_URL=https://app.yourcompany.com
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Webhook Configuration
WEBHOOK_VERIFY_SIGNATURES=true
WEBHOOK_SECRET_KEY=your-webhook-secret
WEBHOOK_ALLOWED_SOURCES=ERP,CARRIER_SYSTEM,FULFILLMENT_CENTER
WEBHOOK_MAX_AGE=300

# ERP Integration
ERP_API_URL=https://erp.yourcompany.com/api
ERP_API_KEY=your-erp-api-key
ERP_SYNC_INTERVAL=300000

# Email Notifications
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=email-password

# AWS/S3 (for file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=mes-files-bucket

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Session
SESSION_SECRET=session-secret-key
SESSION_TIMEOUT=3600000

# Rate Limiting
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX_REQUESTS=1000
```

### 2. Update Configuration

```bash
# Copy template
cp .env.example .env.production

# Edit with production values
nano .env.production
```

## Application Deployment

### Option 1: Traditional Server Deployment

```bash
# 1. Clone repository
git clone https://github.com/yourcompany/machshop.git
cd machshop

# 2. Install dependencies
npm ci --production

# 3. Build frontend
npm run build:frontend

# 4. Build backend
npm run build:backend

# 5. Run migrations
npm run prisma:migrate:prod

# 6. Start application
npm run start:prod

# 7. Verify deployment
curl http://localhost:3000/api/v1/health
```

### Option 2: Docker Deployment

```bash
# 1. Build Docker image
docker build -t mes-app:latest -f Dockerfile .

# 2. Create .env file
cp .env.example .env.production

# 3. Run container
docker run -d \
  --name mes-app \
  -p 3000:3000 \
  --env-file .env.production \
  -e DATABASE_URL="postgresql://mes_user:password@db-host:5432/mes_production_db" \
  mes-app:latest

# 4. Verify
curl http://localhost:3000/api/v1/health
```

### Option 3: Docker Compose Deployment

```bash
# 1. Update docker-compose.yml with production values
nano docker-compose.yml

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker-compose exec api npm run prisma:migrate

# 4. Check logs
docker-compose logs -f api
```

## Kubernetes Deployment

### 1. Create Kubernetes Manifests

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mes-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mes-app
  template:
    metadata:
      labels:
        app: mes-app
    spec:
      containers:
      - name: mes-app
        image: your-registry/mes-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mes-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Deploy to Kubernetes

```bash
# 1. Create namespace
kubectl create namespace mes-production

# 2. Create secrets
kubectl create secret generic mes-secrets \
  --from-literal=database-url="postgresql://..." \
  -n mes-production

# 3. Deploy application
kubectl apply -f k8s/ -n mes-production

# 4. Check deployment status
kubectl get deployments -n mes-production
kubectl get pods -n mes-production

# 5. View logs
kubectl logs -f deployment/mes-app -n mes-production
```

## Load Balancing & Reverse Proxy

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/mes-app

upstream mes_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourcompany.com;

    ssl_certificate /etc/ssl/certs/yourcompany.com.crt;
    ssl_certificate_key /etc/ssl/private/yourcompany.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://mes_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /api/v1/health {
        proxy_pass http://mes_backend;
        access_log off;
    }

    # Static files
    location /static {
        alias /var/www/mes/static;
        expires 1y;
    }
}
```

### Enable Nginx

```bash
sudo ln -s /etc/nginx/sites-available/mes-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Process Management

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'mes-api',
      script: './dist/index.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      ignore_watch: ['node_modules', 'dist/.tmp']
    }
  ]
};
```

### Start with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Setup auto-start on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

## Monitoring & Logging

### Application Health Checks

```bash
# Health check endpoint
curl https://api.yourcompany.com/api/v1/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-11-01T10:30:00Z",
#   "message": "API is operational"
# }
```

### Log Aggregation

```bash
# View logs with PM2
pm2 logs mes-api

# Using Winston (configured in application)
# Logs automatically sent to CloudWatch, Datadog, etc.
```

### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Log aggregation and analysis
- **Datadog**: Full observability platform
- **New Relic**: APM and monitoring

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only HTTPS
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp (redirect to 443)
sudo ufw deny from any to any port 3000

# Allow SSH from specific IPs
sudo ufw allow from 203.0.113.0/24 to any port 22
```

### 2. SSL/TLS Configuration

```bash
# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d api.yourcompany.com

# Auto-renew certificates
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 3. API Security

- Enable CORS for approved domains only
- Implement rate limiting
- Use strong JWT secrets
- Enable CSRF protection
- Validate all inputs
- Use HTTPS only

### 4. Database Security

```bash
# Enable SSL for PostgreSQL
# In postgresql.conf
ssl = on
ssl_cert_file = '/path/to/cert'
ssl_key_file = '/path/to/key'

# Restrict database connections
# In pg_hba.conf
host    mes_production_db    mes_user    203.0.113.0/24    scram-sha-256
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/mes"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="mes_production_db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -Fc $DB_NAME > $BACKUP_DIR/db_$TIMESTAMP.dump

# Backup application code
tar -czf $BACKUP_DIR/app_$TIMESTAMP.tar.gz /var/www/mes

# Upload to S3
aws s3 cp $BACKUP_DIR s3://mes-backups/daily/ --recursive

# Cleanup old backups (older than 30 days)
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

### Restore from Backup

```bash
# Restore database
pg_restore -d mes_production_db /backups/mes/db_20241101_100000.dump

# Restore application
tar -xzf /backups/mes/app_20241101_100000.tar.gz -C /
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_movements_status ON movements(status);
CREATE INDEX idx_containers_location ON containers(currentLocation);
CREATE INDEX idx_movements_created_at ON movements(createdAt DESC);

-- Analyze tables
ANALYZE movements;
ANALYZE containers;
```

### 2. Caching Strategy

- Redis for session storage
- CDN for static assets
- Browser caching for GET requests
- API response caching

### 3. Load Testing

```bash
# Using Apache Bench
ab -n 10000 -c 100 https://api.yourcompany.com/api/v1/movements

# Using k6
k6 run loadtest.js
```

## Health Checks

### Monitoring Dashboard

Create a monitoring dashboard tracking:
- API response time
- Error rate
- Database query performance
- Webhook delivery success rate
- Container utilization metrics
- System resource usage

### Alerts

Configure alerts for:
- Response time > 5 seconds
- Error rate > 1%
- Database connection failures
- Webhook delivery failures
- Disk space < 10%
- Memory usage > 80%

## Rollback Procedure

```bash
# 1. Identify previous stable version
git log --oneline | head -10

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild application
npm run build

# 4. Run migrations (if needed)
npm run prisma:migrate

# 5. Restart service
pm2 restart mes-api
# or
systemctl restart mes-app
```

## Post-Deployment Verification

```bash
# 1. Health check
curl https://api.yourcompany.com/api/v1/health

# 2. Create test movement
curl -X POST https://api.yourcompany.com/api/v1/movements/create \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fromLocation": "Test A", "toLocation": "Test B", ...}'

# 3. Verify database connectivity
npm run prisma:validate

# 4. Check webhook endpoints
curl -X GET https://api.yourcompany.com/api/v1/webhooks/health

# 5. Review logs
tail -f /var/log/mes-app.log
```

## Support & Troubleshooting

See `TROUBLESHOOTING.md` for common issues and solutions.

## Contact

For deployment support, contact: devops@yourcompany.com
