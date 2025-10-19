# Installation Qualification (IQ)
## MES Electronic Signature System

**Document Version:** 1.0
**Date:** October 15, 2025
**Status:** DRAFT
**Classification:** Confidential - Validation Document

---

## 1. INTRODUCTION

### 1.1 Purpose
This Installation Qualification (IQ) document verifies that the MES Electronic Signature System has been installed correctly according to specifications and is ready for operational qualification testing.

### 1.2 Scope
This IQ covers:
- Hardware and software installation verification
- System configuration validation
- Security settings verification
- Database schema validation
- Network connectivity testing
- User access control setup

### 1.3 Regulatory Compliance
- 21 CFR Part 11 - Electronic Records; Electronic Signatures
- ISO 9001:2015 - Quality Management Systems
- AS9100D - Aerospace Quality Management

---

## 2. SYSTEM OVERVIEW

### 2.1 System Information
| Item | Specification |
|------|--------------|
| **System Name** | MES Electronic Signature System |
| **Version** | 1.0.0 |
| **Installation Date** | [To be completed] |
| **Installation Location** | [Customer Site / Cloud Infrastructure] |
| **Database** | PostgreSQL 14+ |
| **Backend Runtime** | Node.js 18+ |
| **Frontend Framework** | React 18+ |

### 2.2 System Components
1. **Backend API Server** - Express.js application
2. **Frontend Web Application** - React SPA
3. **PostgreSQL Database** - Data persistence
4. **Redis Cache** (optional) - Session management
5. **Biometric Reader** (optional) - Fingerprint capture

---

## 3. PREREQUISITES

### 3.1 Hardware Requirements
| Component | Minimum Specification | Verified |
|-----------|----------------------|----------|
| CPU | 4 cores @ 2.5 GHz | ☐ |
| RAM | 8 GB | ☐ |
| Storage | 100 GB SSD | ☐ |
| Network | 1 Gbps Ethernet | ☐ |
| Biometric Reader | USB fingerprint scanner (optional) | ☐ |

### 3.2 Software Requirements
| Software | Version | Verified |
|----------|---------|----------|
| Operating System | Ubuntu 22.04 LTS or Windows Server 2019+ | ☐ |
| Node.js | 18.x or higher | ☐ |
| PostgreSQL | 14.x or higher | ☐ |
| Nginx/Apache | Latest stable | ☐ |
| SSL Certificate | Valid TLS 1.2+ certificate | ☐ |

### 3.3 Network Requirements
| Requirement | Specification | Verified |
|-------------|--------------|----------|
| HTTPS Support | TLS 1.2 or higher | ☐ |
| Firewall Rules | Ports 443 (HTTPS), 5432 (PostgreSQL internal) | ☐ |
| DNS Configuration | Valid domain name | ☐ |

---

## 4. INSTALLATION PROCEDURES

### 4.1 IQ-001: Database Installation
**Objective**: Verify PostgreSQL database installed correctly

**Test Steps**:
1. Connect to PostgreSQL server
   ```bash
   psql -U postgres -h localhost
   ```
2. Verify version
   ```sql
   SELECT version();
   ```
3. Create MES database
   ```sql
   CREATE DATABASE mes_production;
   ```
4. Verify database created
   ```sql
   \l mes_production
   ```

**Expected Results**:
- ☐ PostgreSQL version 14.x or higher
- ☐ Database `mes_production` created
- ☐ Connection successful

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.2 IQ-002: Database Schema Installation
**Objective**: Verify Prisma schema applied successfully

**Test Steps**:
1. Run Prisma migration
   ```bash
   npx prisma migrate deploy
   ```
2. Verify all tables created
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
3. Verify `electronic_signatures` table exists with correct columns
   ```sql
   \d electronic_signatures
   ```
4. Verify `fai_reports` table exists (Sprint 3)
   ```sql
   \d fai_reports
   ```
5. Verify `fai_characteristics` table exists (Sprint 3)
   ```sql
   \d fai_characteristics
   ```

**Expected Results**:
- ☐ All 25+ tables created
- ☐ `electronic_signatures` table has 20+ columns
- ☐ `fai_reports` table exists with Form 1/2 JSON fields
- ☐ `fai_characteristics` table exists with measurement fields
- ☐ All foreign key constraints applied
- ☐ All indexes created

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.3 IQ-003: Backend Application Installation
**Objective**: Verify backend API server installed and running

**Test Steps**:
1. Install Node.js dependencies
   ```bash
   npm install
   ```
2. Build TypeScript code
   ```bash
   npm run build
   ```
3. Start backend server
   ```bash
   npm start
   ```
4. Verify server responds
   ```bash
   curl http://localhost:3001/health
   ```
5. Verify response contains:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "environment": "production"
   }
   ```

**Expected Results**:
- ☐ Dependencies installed without errors
- ☐ TypeScript compilation successful (0 errors)
- ☐ Server starts on port 3001
- ☐ Health check returns HTTP 200 OK
- ☐ Version matches expected

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.4 IQ-004: Frontend Application Installation
**Objective**: Verify frontend web application installed and accessible

**Test Steps**:
1. Navigate to frontend directory
   ```bash
   cd frontend
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Build production bundle
   ```bash
   npm run build
   ```
4. Serve production build (via Nginx or similar)
5. Access application via browser: `https://[domain]`
6. Verify login page loads
7. Verify no console errors

**Expected Results**:
- ☐ Dependencies installed without errors
- ☐ Build completes successfully
- ☐ Application accessible via HTTPS
- ☐ Login page displays correctly
- ☐ No JavaScript errors in console

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.5 IQ-005: SSL/TLS Certificate Installation
**Objective**: Verify HTTPS encryption properly configured

**Test Steps**:
1. Access application via HTTPS: `https://[domain]`
2. Verify SSL certificate valid (no browser warnings)
3. Check certificate details:
   - Issuer
   - Expiration date
   - Subject Alternative Names
4. Verify TLS version (must be 1.2 or higher)
   ```bash
   openssl s_client -connect [domain]:443 -tls1_2
   ```
5. Verify HTTP redirects to HTTPS

**Expected Results**:
- ☐ Valid SSL/TLS certificate installed
- ☐ Certificate not expired
- ☐ TLS 1.2 or higher supported
- ☐ No mixed content warnings
- ☐ HTTP automatically redirects to HTTPS

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.6 IQ-006: Database Backup Configuration
**Objective**: Verify automated backup system configured

**Test Steps**:
1. Verify backup script installed
   ```bash
   ls -l /opt/mes/backup/database-backup.sh
   ```
2. Verify cron job configured
   ```bash
   crontab -l | grep database-backup
   ```
3. Manually execute backup
   ```bash
   /opt/mes/backup/database-backup.sh
   ```
4. Verify backup file created
   ```bash
   ls -lh /opt/mes/backups/
   ```
5. Verify backup file encrypted
   ```bash
   file /opt/mes/backups/[latest-backup].gpg
   ```

**Expected Results**:
- ☐ Backup script installed and executable
- ☐ Cron job scheduled for daily execution (3 AM)
- ☐ Manual backup executes successfully
- ☐ Backup file created with timestamp
- ☐ Backup file encrypted (GPG format)
- ☐ Old backups rotated (30-day retention)

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.7 IQ-007: User Account Configuration
**Objective**: Verify initial user accounts created with correct roles

**Test Steps**:
1. Access database
2. Verify admin user created
   ```sql
   SELECT id, username, email, roles, isActive
   FROM users WHERE username = 'admin';
   ```
3. Verify test users created for each role:
   - Operator
   - Supervisor
   - Quality Inspector
   - Engineer
   - Manager
4. Verify password complexity meets requirements
5. Verify user accounts active

**Expected Results**:
- ☐ Admin user created with all permissions
- ☐ Test users created for each role
- ☐ Passwords hashed with bcrypt (not plain text)
- ☐ All test accounts active
- ☐ Usernames unique

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.8 IQ-008: API Endpoint Verification
**Objective**: Verify all signature-related API endpoints accessible

**Test Steps**:
1. Test signature creation endpoint
   ```bash
   curl -X POST https://[domain]/api/v1/signatures \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [token]"
   ```
2. Test signature verification endpoint
   ```bash
   curl https://[domain]/api/v1/signatures/verify
   ```
3. Test signature list endpoint
   ```bash
   curl https://[domain]/api/v1/signatures
   ```
4. Test FAI endpoints (Sprint 3)
   ```bash
   curl https://[domain]/api/v1/fai
   ```
5. Verify authentication required (401 without token)

**Expected Results**:
- ☐ All endpoints return valid responses (200/201)
- ☐ Unauthenticated requests return 401
- ☐ Invalid data returns 400 with error details
- ☐ API versioning correct (`/api/v1/`)

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.9 IQ-009: Biometric Reader Configuration (Optional)
**Objective**: Verify fingerprint reader hardware installed and functional

**Test Steps**:
1. Connect USB fingerprint reader
2. Verify device recognized by OS
   ```bash
   lsusb | grep -i finger
   ```
3. Install device drivers (if required)
4. Test device capture via SDK test application
5. Verify device responds in MES application

**Expected Results**:
- ☐ Device recognized by operating system
- ☐ Drivers installed successfully
- ☐ Test capture successful
- ☐ Device accessible from MES application
- ☐ Quality score calculated correctly

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail ☐ N/A (biometric not required)

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

### 4.10 IQ-010: Logging and Monitoring
**Objective**: Verify logging and monitoring systems configured

**Test Steps**:
1. Verify application logs directory exists
   ```bash
   ls -ld /var/log/mes/
   ```
2. Generate test log entry
3. Verify log file created with timestamp
   ```bash
   ls -lh /var/log/mes/app-*.log
   ```
4. Verify log rotation configured
   ```bash
   cat /etc/logrotate.d/mes
   ```
5. Verify monitoring agent installed (if applicable)

**Expected Results**:
- ☐ Log directory exists with correct permissions
- ☐ Application logging to file
- ☐ Log entries include timestamp, level, message
- ☐ Log rotation configured (daily, 30-day retention)
- ☐ Monitoring agent reporting metrics

**Actual Results**:
```
[To be completed during testing]
```

**Pass / Fail**: ☐ Pass ☐ Fail

**Tested By**: _________________ Date: _______
**Reviewed By**: _________________ Date: _______

---

## 5. CONFIGURATION VERIFICATION

### 5.1 Environment Variables
Verify all required environment variables configured:

| Variable | Expected Value | Verified |
|----------|---------------|----------|
| `NODE_ENV` | `production` | ☐ |
| `DATABASE_URL` | PostgreSQL connection string | ☐ |
| `JWT_SECRET` | Secure random string (32+ chars) | ☐ |
| `CORS_ALLOWED_ORIGINS` | Application domain | ☐ |
| `PORT` | 3001 | ☐ |
| `UPLOAD_DIR` | `/opt/mes/uploads` | ☐ |

### 5.2 Security Settings
| Setting | Expected Configuration | Verified |
|---------|----------------------|----------|
| Password Min Length | 12 characters | ☐ |
| Password Complexity | Uppercase, lowercase, number, special | ☐ |
| Session Timeout | 30 minutes | ☐ |
| Max Login Attempts | 3 attempts | ☐ |
| Account Lockout Duration | 15 minutes | ☐ |
| 2FA Enabled | For ADVANCED/QUALIFIED signatures | ☐ |

---

## 6. INSTALLATION SUMMARY

### 6.1 Test Results Summary
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| IQ-001 | Database Installation | ☐ Pass ☐ Fail | |
| IQ-002 | Database Schema | ☐ Pass ☐ Fail | |
| IQ-003 | Backend Installation | ☐ Pass ☐ Fail | |
| IQ-004 | Frontend Installation | ☐ Pass ☐ Fail | |
| IQ-005 | SSL/TLS Certificate | ☐ Pass ☐ Fail | |
| IQ-006 | Backup Configuration | ☐ Pass ☐ Fail | |
| IQ-007 | User Accounts | ☐ Pass ☐ Fail | |
| IQ-008 | API Endpoints | ☐ Pass ☐ Fail | |
| IQ-009 | Biometric Reader | ☐ Pass ☐ Fail ☐ N/A | |
| IQ-010 | Logging & Monitoring | ☐ Pass ☐ Fail | |

### 6.2 Overall IQ Result
☐ **PASS** - System installation verified, proceed to OQ
☐ **FAIL** - Deviations require corrective action before OQ

---

## 7. DEVIATIONS AND CORRECTIVE ACTIONS

### 7.1 Deviations Log
| Deviation ID | Test ID | Description | Impact | Status |
|--------------|---------|-------------|--------|--------|
| DEV-001 | | | | |
| DEV-002 | | | | |

### 7.2 Corrective Actions
| Action ID | Deviation ID | Corrective Action | Completed By | Date |
|-----------|--------------|-------------------|--------------|------|
| CA-001 | | | | |
| CA-002 | | | | |

---

## 8. APPROVAL SIGNATURES

**Installation Qualification Complete and Approved:**

**QA Engineer**: _________________________ Date: __________
**System Administrator**: ________________ Date: __________
**Validation Lead**: _____________________ Date: __________
**System Owner**: _______________________ Date: __________

---

**Document Control**
- **Version**: 1.0
- **Effective Date**: [To be completed]
- **Next Review**: [12 months from effective date]
- **Status**: DRAFT
