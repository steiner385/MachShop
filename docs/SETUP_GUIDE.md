# Build Record System Setup Guide

## Quick Start

This guide will help you set up the Electronic Build Book & Assembly Build Record System in your manufacturing environment.

## System Requirements

### Hardware Requirements
- **Server**: 8GB RAM, 4 CPU cores, 100GB storage minimum
- **Workstations**: Modern computers with cameras for photo capture
- **Network**: Reliable internet connection for real-time updates

### Software Requirements
- **Operating System**: Linux (Ubuntu 20.04+), Windows Server 2019+, or macOS 10.15+
- **Database**: PostgreSQL 14+
- **Runtime**: Node.js 18.x LTS
- **Web Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Installation Steps

### 1. Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE mes_build_records;
CREATE USER mes_admin WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mes_build_records TO mes_admin;
\q
```

### 2. Application Installation

```bash
# Clone the repository
git clone <repository-url>
cd MachShop

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Set up environment variables
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` file with your settings:

```bash
# Database Configuration
DATABASE_URL="postgresql://mes_admin:secure_password@localhost:5432/mes_build_records"

# Security Settings
JWT_SECRET="your-unique-jwt-secret-key-here"
JWT_EXPIRES_IN="24h"
BCRYPT_ROUNDS=12

# File Storage
UPLOAD_PATH="/var/uploads/mes"
MAX_FILE_SIZE="10485760"  # 10MB
ALLOWED_FILE_TYPES="jpg,jpeg,png,pdf,doc,docx"

# PDF Generation
PDF_TEMPLATE_PATH="/opt/mes/templates"
COMPANY_NAME="Your Company Name"
COMPANY_LOGO_PATH="/opt/mes/assets/logo.png"

# Email Configuration (for notifications)
SMTP_HOST="smtp.your-company.com"
SMTP_PORT="587"
SMTP_USER="mes-notifications@your-company.com"
SMTP_PASS="email_password"

# Compliance Settings
RETAIN_RECORDS_YEARS="25"
AUDIT_LOG_LEVEL="INFO"
SIGNATURE_VALIDATION_STRICT="true"
```

### 4. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### 5. File System Setup

```bash
# Create upload directories
sudo mkdir -p /var/uploads/mes/{photos,documents,signatures,temp}
sudo mkdir -p /opt/mes/{templates,assets}

# Set permissions
sudo chown -R www-data:www-data /var/uploads/mes
sudo chmod -R 755 /var/uploads/mes

# Copy company logo
sudo cp your-logo.png /opt/mes/assets/logo.png
```

### 6. SSL Certificate Setup

```bash
# Using Let's Encrypt (for production)
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure nginx (example)
sudo cp docs/nginx.conf.example /etc/nginx/sites-available/mes-build-records
sudo ln -s /etc/nginx/sites-available/mes-build-records /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### 7. Start Services

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start

# Using PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Initial Configuration

### 1. Create Admin User

```bash
# Run the admin setup script
npm run setup:admin

# Or manually via database
npx prisma studio
# Navigate to User table and create admin user
```

### 2. Configure System Settings

Access the admin panel at `https://your-domain.com/admin`:

1. **Company Information**
   - Company name and address
   - Logo upload
   - Contact information

2. **Compliance Settings**
   - Enable AS9100D compliance
   - Configure FAA Part 43 requirements
   - Set retention policies

3. **User Roles & Permissions**
   - Define custom roles if needed
   - Set operation permissions
   - Configure signature authorities

4. **Default Templates**
   - Upload build book templates
   - Configure default PDF settings
   - Set compliance requirements

### 3. Import Existing Data

```bash
# Import work orders (if migrating from existing system)
npm run import:work-orders -- --file=/path/to/work-orders.csv

# Import users
npm run import:users -- --file=/path/to/users.csv

# Import parts and operations
npm run import:parts -- --file=/path/to/parts.csv
npm run import:operations -- --file=/path/to/operations.csv
```

## Security Configuration

### 1. Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Block direct database access from outside
sudo ufw deny 5432/tcp
```

### 2. Database Security

```sql
-- Connect to PostgreSQL as admin
sudo -u postgres psql

-- Create read-only user for reporting
CREATE USER mes_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE mes_build_records TO mes_readonly;
GRANT USAGE ON SCHEMA public TO mes_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mes_readonly;

-- Create backup user
CREATE USER mes_backup WITH ENCRYPTED PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE mes_build_records TO mes_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mes_backup;
```

### 3. Application Security

```bash
# Set secure file permissions
chmod 600 .env
chmod -R 700 logs/
chmod -R 755 public/

# Configure log rotation
sudo cp docs/logrotate.conf /etc/logrotate.d/mes-build-records
```

## Backup Configuration

### 1. Database Backup

```bash
# Create backup script
sudo tee /usr/local/bin/backup-mes-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/mes"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U mes_backup mes_build_records | gzip > $BACKUP_DIR/mes_db_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "mes_db_*.sql.gz" -mtime +30 -delete
EOF

sudo chmod +x /usr/local/bin/backup-mes-db.sh

# Add to crontab for daily backups at 2 AM
echo "0 2 * * * /usr/local/bin/backup-mes-db.sh" | sudo crontab -
```

### 2. File System Backup

```bash
# Create file backup script
sudo tee /usr/local/bin/backup-mes-files.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/mes"
DATE=$(date +%Y%m%d_%H%M%S)

tar -czf $BACKUP_DIR/mes_files_$DATE.tar.gz /var/uploads/mes /opt/mes

# Keep only last 7 days of file backups
find $BACKUP_DIR -name "mes_files_*.tar.gz" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-mes-files.sh

# Add to crontab for weekly backups on Sunday at 3 AM
echo "0 3 * * 0 /usr/local/bin/backup-mes-files.sh" | sudo crontab -
```

## Monitoring & Maintenance

### 1. Health Checks

```bash
# Create health check script
tee /usr/local/bin/mes-health-check.sh << 'EOF'
#!/bin/bash

# Check database connectivity
if ! pg_isready -h localhost -U mes_admin -d mes_build_records >/dev/null 2>&1; then
    echo "Database connection failed" | mail -s "MES DB Alert" admin@company.com
fi

# Check disk space
USAGE=$(df /var/uploads/mes | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "Disk usage is at ${USAGE}%" | mail -s "MES Disk Alert" admin@company.com
fi

# Check application status
if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "Application health check failed" | mail -s "MES App Alert" admin@company.com
fi
EOF

chmod +x /usr/local/bin/mes-health-check.sh

# Run every 5 minutes
echo "*/5 * * * * /usr/local/bin/mes-health-check.sh" | crontab -
```

### 2. Log Management

```bash
# Configure log rotation
sudo tee /etc/logrotate.d/mes-build-records << 'EOF'
/var/log/mes/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U mes_admin -d mes_build_records -c "SELECT 1;"

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### File Upload Issues
```bash
# Check directory permissions
ls -la /var/uploads/mes/

# Check disk space
df -h /var/uploads/mes/

# Check nginx configuration
sudo nginx -t
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

### Performance Optimization

#### Database Tuning
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_build_records_status ON "BuildRecord"(status);
CREATE INDEX CONCURRENTLY idx_build_records_work_order ON "BuildRecord"("workOrderId");
CREATE INDEX CONCURRENTLY idx_operations_build_record ON "BuildRecordOperation"("buildRecordId");
CREATE INDEX CONCURRENTLY idx_photos_build_record ON "BuildRecordPhoto"("buildRecordId");

-- Update table statistics
ANALYZE;
```

#### Application Tuning
```bash
# Configure PM2 for optimal performance
pm2 start ecosystem.config.js --max-memory-restart 1G
pm2 set pm2:autodump true
pm2 set pm2:deep-monitoring true
```

## Compliance Checklist

### AS9100D Requirements
- [ ] Electronic signature implementation compliant
- [ ] Audit trail maintains data integrity
- [ ] Records retention policy configured (25 years)
- [ ] Access controls properly implemented
- [ ] Regular backup procedures established

### FAA Part 43 Requirements
- [ ] Maintenance record format compliance
- [ ] Proper identification and documentation
- [ ] Signature requirements met
- [ ] Record retention compliance

### 21 CFR Part 11 Requirements
- [ ] Electronic signature validation
- [ ] User authentication and authorization
- [ ] Audit trail completeness
- [ ] System validation documentation
- [ ] Change control procedures

## Support

### Getting Help
- **Documentation**: Check `/docs` directory for detailed guides
- **Logs**: Review application logs in `/var/log/mes/`
- **Community**: Join our discussion forum at [forum-link]
- **Support**: Contact support@company.com for technical assistance

### Reporting Issues
1. Check existing documentation and troubleshooting guides
2. Review system logs for error messages
3. Create support ticket with:
   - Detailed error description
   - Steps to reproduce
   - System environment details
   - Relevant log entries

---

*Setup Guide Version: 1.0*
*Last Updated: January 2024*