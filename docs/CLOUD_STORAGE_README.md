# 🚀 Enterprise Cloud Storage & Enhanced File Management

A comprehensive, enterprise-grade cloud storage system supporting S3/MinIO with advanced features including file deduplication, versioning, multipart uploads, CDN integration, backup/lifecycle management, and comprehensive analytics.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Services Overview](#-services-overview)
- [Development Setup](#-development-setup)
- [Configuration](#-configuration)
- [API Usage](#-api-usage)
- [Monitoring & Analytics](#-monitoring--analytics)
- [Deployment](#-deployment)

## ✨ Features

### Core Storage Features
- **Dual Provider Support**: AWS S3 and MinIO (cloud + on-premise)
- **Multipart Uploads**: Handle files from 5MB to 5TB efficiently
- **File Deduplication**: SHA-256 based content deduplication with significant space savings
- **Version Control**: Complete file versioning with history tracking and restoration
- **CDN Integration**: Content delivery with caching, compression, and global distribution
- **Backup & Recovery**: Automated backups with lifecycle management and disaster recovery

### Enterprise Features
- **Storage Analytics**: Comprehensive metrics, monitoring, and alerting
- **Lifecycle Policies**: Automated tiering between storage classes (Standard → Warm → Cold → Archive)
- **Cost Optimization**: Intelligent recommendations and automated space optimization
- **Security**: Encryption at rest and in transit, signed URLs, access controls
- **Performance**: Optimized uploads, resumable transfers, progress tracking

## 🚀 Quick Start

### 1. Start Development Environment

```bash
# Start MinIO and supporting services
docker-compose -f docker-compose.storage.yml up -d

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start the application
npm run dev
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Configure storage settings
STORAGE_PROVIDER_TYPE=minio
STORAGE_PROVIDER_ENDPOINT=http://localhost:9000
STORAGE_PROVIDER_ACCESS_KEY=mes_admin
STORAGE_PROVIDER_SECRET_KEY=mes_password_2024
STORAGE_PROVIDER_BUCKET=mes-storage
```

### 3. Basic Usage

```typescript
import { CloudStorageService } from './src/services/CloudStorageService';

const storageService = new CloudStorageService();

// Upload a file
const file = await storageService.uploadFile(
  buffer,
  'document.pdf',
  'application/pdf'
);

// Download a file
const fileContent = await storageService.downloadFile(file.id);

// Generate signed URL
const url = await storageService.generateSignedUrl(file.id, 'download', 3600);
```

## 🏗 Services Overview

### CloudStorageService
**Primary storage operations with S3/MinIO support**

```typescript
// File operations
await cloudStorageService.uploadFile(buffer, fileName, mimeType, options);
await cloudStorageService.downloadFile(fileId, userId);
await cloudStorageService.deleteFile(fileId, permanent);
await cloudStorageService.generateSignedUrl(fileId, action, expiration);

// Management operations
await cloudStorageService.copyFile(sourceId, destinationKey);
await cloudStorageService.moveFile(fileId, newKey);
await cloudStorageService.getStorageStatistics();
```

### FileDeduplicationService
**Intelligent space optimization through content deduplication**

```typescript
// Find and process duplicates
const duplicates = await deduplicationService.findDuplicateFiles();
const result = await deduplicationService.performDeduplication(checksum, 'soft');
const stats = await deduplicationService.getDeduplicationStatistics();

// Bulk operations
const bulkResult = await deduplicationService.bulkDeduplication('soft', 50);

// Integrity verification
const integrity = await deduplicationService.verifyFileIntegrity(fileId);
```

### MultipartUploadService
**Large file handling with progress tracking**

```typescript
// Initialize multipart upload
const upload = await multipartUploadService.initializeUpload({
  fileName: 'large-file.zip',
  fileSize: 2147483648, // 2GB
  mimeType: 'application/zip',
  userId: 'user123'
});

// Upload parts
await multipartUploadService.uploadPart(upload.id, 1, chunkBuffer);

// Complete upload
const result = await multipartUploadService.completeUpload(upload.id);

// Track progress
const progress = await multipartUploadService.getUploadProgress(upload.id);
```

### FileVersioningService
**Complete version control with restoration capabilities**

```typescript
// Create new version
const version = await versioningService.createVersion({
  fileId: 'file123',
  buffer: newContent,
  userId: 'user123',
  versionNotes: 'Updated content'
});

// Get version history
const history = await versioningService.getFileVersions(fileId);

// Restore to previous version
const restored = await versioningService.restoreVersion(versionId, userId);

// Compare versions
const comparison = await versioningService.compareVersions(oldId, newId);
```

### CDNIntegrationService
**Content delivery with caching and optimization**

```typescript
// Generate CDN URLs
const cdnUrl = await cdnService.generateCDNUrl(fileId, {
  width: 800,
  height: 600,
  quality: 85,
  format: 'webp'
});

// Batch URL generation
const urls = await cdnService.generateBatchCDNUrls(fileIds, options);

// Cache management
const purgeResult = await cdnService.purgeCDNCache(fileIds);
const warmupResult = await cdnService.warmupCDNCache(fileIds);

// Analytics
const analytics = await cdnService.getCDNAnalytics(startDate, endDate);
```

### BackupLifecycleService
**Automated backups and lifecycle management**

```typescript
// Create backup schedule
const schedule = await backupService.createBackupSchedule(
  'Daily Backup',
  {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
    compression: true,
    encryption: true
  },
  userId
);

// Execute backup
const backup = await backupService.executeBackup(schedule.id);

// Restore from backup
const restore = await backupService.restoreFromBackup({
  backupId: backup.backupId,
  overwriteExisting: false
});

// Lifecycle policies
const lifecycle = await backupService.executeLifecyclePolicies();
```

### StorageAnalyticsService
**Comprehensive monitoring and analytics**

```typescript
// Get comprehensive analytics
const analytics = await analyticsService.getComprehensiveAnalytics(
  startDate,
  endDate
);

// Individual metrics
const storage = await analyticsService.getStorageMetrics();
const dedup = await analyticsService.getDeduplicationMetrics();
const versions = await analyticsService.getVersioningMetrics();
const access = await analyticsService.getAccessPatterns(startDate, endDate);
const performance = await analyticsService.getPerformanceMetrics(startDate, endDate);

// Alerting
const alerts = await analyticsService.checkAlerts(alertConfig);
```

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- MinIO (via Docker Compose)

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd manufacturing-execution-system
   npm install
   ```

2. **Start Infrastructure**
   ```bash
   # Start MinIO, Redis, and Nginx CDN
   docker-compose -f docker-compose.storage.yml up -d

   # Verify MinIO is running
   curl http://localhost:9000/minio/health/live
   ```

3. **Database Setup**
   ```bash
   # Run migrations
   npx prisma migrate dev

   # Generate Prisma client
   npx prisma generate
   ```

4. **Configure Environment**
   ```bash
   # Required environment variables
   DATABASE_URL="postgresql://user:pass@localhost:5432/mes"

   # Storage Configuration
   STORAGE_PROVIDER_TYPE=minio
   STORAGE_PROVIDER_ENDPOINT=http://localhost:9000
   STORAGE_PROVIDER_ACCESS_KEY=mes_admin
   STORAGE_PROVIDER_SECRET_KEY=mes_password_2024
   STORAGE_PROVIDER_BUCKET=mes-storage
   STORAGE_PROVIDER_REGION=us-east-1

   # CDN Configuration (optional)
   CDN_ENABLED=true
   CDN_DOMAIN=localhost:8080
   CDN_PROVIDER=custom

   # Feature Flags
   CLOUD_STORAGE_ENABLED=true
   ENABLE_DEDUPLICATION=true
   ENABLE_VERSIONING=true
   ENABLE_ENCRYPTION=true
   ```

### Development Tools

**MinIO Console**: http://localhost:9001
- Username: `mes_admin`
- Password: `mes_password_2024`

**CDN Endpoint**: http://localhost:8080/cdn/
**Cache Purge**: http://localhost:8080/purge/

## 📊 Monitoring & Analytics

### Storage Metrics
- **Storage Usage**: Total files, size, growth rates
- **Storage Class Distribution**: Cost optimization insights
- **Deduplication Savings**: Space and cost savings
- **Version Overhead**: Versioning storage costs

### Performance Metrics
- **Upload/Download Speeds**: Average transfer rates
- **Success/Error Rates**: System reliability
- **CDN Performance**: Cache hit ratios, bandwidth savings
- **Access Patterns**: Hot/cold file analysis

### Cost Analysis
- **Monthly Cost Estimates**: By storage class
- **Optimization Recommendations**: Automated suggestions
- **Lifecycle Savings**: Cost reduction through tiering
- **Deduplication ROI**: Space savings impact

### Alerting
Configure alerts for:
- Storage usage thresholds
- Error rate escalations
- Cost budget overruns
- Performance degradation
- Security events

## 🚀 Deployment

### Production Configuration

1. **Storage Provider Setup**
   ```bash
   # AWS S3 Configuration
   STORAGE_PROVIDER_TYPE=s3
   STORAGE_PROVIDER_REGION=us-west-2
   STORAGE_PROVIDER_ACCESS_KEY=<aws-access-key>
   STORAGE_PROVIDER_SECRET_KEY=<aws-secret-key>
   STORAGE_PROVIDER_BUCKET=mes-production-storage
   ```

2. **CDN Configuration**
   ```bash
   # CloudFront/Cloudflare Setup
   CDN_ENABLED=true
   CDN_PROVIDER=cloudfront
   CDN_DOMAIN=cdn.yourdomain.com
   CDN_CACHE_MAX_AGE=86400
   ```

3. **Security Settings**
   ```bash
   ENABLE_ENCRYPTION=true
   ENABLE_SIGNED_URLS=true
   SIGNED_URL_EXPIRATION=3600
   ```

### Docker Production Deployment

```dockerfile
# Dockerfile.storage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.storage
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - STORAGE_PROVIDER_TYPE=s3
      # ... other environment variables
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=mes_production
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## 📚 API Documentation

### REST Endpoints

#### File Upload
```bash
# Single file upload
POST /api/files/upload
Content-Type: multipart/form-data

# Enhanced cloud upload
POST /api/files/enhanced/single
{
  "enableCloudStorage": true,
  "enableDeduplication": true,
  "enableVersioning": true,
  "metadata": {...}
}
```

#### File Management
```bash
# Get file info
GET /api/files/:id

# Download file
GET /api/files/:id/download

# Delete file
DELETE /api/files/:id

# Get file versions
GET /api/files/:id/versions
```

#### Analytics
```bash
# Storage analytics
GET /api/analytics/storage

# Deduplication stats
GET /api/analytics/deduplication

# Performance metrics
GET /api/analytics/performance?start=2024-01-01&end=2024-01-31
```

## 🔧 Configuration Reference

### Storage Classes
- **STANDARD**: Default, immediate access, highest cost
- **WARM**: Infrequent access, lower cost, slight retrieval delay
- **COLD**: Rare access, very low cost, longer retrieval time
- **ARCHIVE**: Long-term storage, lowest cost, significant retrieval time

### Lifecycle Rules
```typescript
{
  "transitions": [
    { "storageClass": "WARM", "afterDays": 30 },
    { "storageClass": "COLD", "afterDays": 90 },
    { "storageClass": "ARCHIVE", "afterDays": 365 }
  ],
  "expiration": { "afterDays": 2555 } // 7 years
}
```

### Backup Schedules
```typescript
{
  "schedule": "0 2 * * *", // Daily at 2 AM
  "retentionDays": 30,
  "compression": true,
  "encryption": true,
  "incrementalBackup": true
}
```

## 🎯 Best Practices

### Performance
- Enable deduplication for space optimization
- Use multipart uploads for files >5MB
- Implement lifecycle policies for cost optimization
- Cache frequently accessed files via CDN

### Security
- Always enable encryption for sensitive data
- Use signed URLs for temporary access
- Implement proper access controls
- Regular security audits and monitoring

### Cost Optimization
- Monitor storage class distribution
- Implement automated lifecycle policies
- Enable deduplication to reduce storage
- Use CDN to reduce bandwidth costs

### Monitoring
- Set up alerts for cost and usage thresholds
- Monitor error rates and performance metrics
- Track deduplication and versioning overhead
- Regular analytics review for optimization

## 🆘 Troubleshooting

### Common Issues

**MinIO Connection Failed**
```bash
# Check MinIO health
curl http://localhost:9000/minio/health/live

# Verify credentials
mc config host add local http://localhost:9000 mes_admin mes_password_2024
```

**Database Connection Issues**
```bash
# Check Prisma connection
npx prisma db pull

# Reset database
npx prisma migrate reset
```

**CDN Not Working**
```bash
# Check Nginx status
docker logs mes-nginx-cdn

# Test CDN endpoint
curl http://localhost:8080/health
```

### Support
For technical support and questions:
- Check the logs: `docker-compose logs -f`
- Review configuration files
- Consult the API documentation
- Check GitHub Issues for known problems

---

🎉 **Congratulations!** You now have a production-ready, enterprise-grade cloud storage system with comprehensive file management capabilities.