# 21 CFR Part 11 Validation Plan
## MES Electronic Signature System

**Document Version:** 1.0
**Date:** October 15, 2025
**Status:** DRAFT
**Classification:** Confidential - Compliance Document

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose
This validation plan establishes the strategy and procedures for validating the MES Electronic Signature System for compliance with 21 CFR Part 11 - Electronic Records; Electronic Signatures.

### 1.2 Scope
This validation covers:
- Electronic signature capture and authentication
- Password verification and encryption
- Biometric signature support (fingerprint)
- Signature integrity and hash verification
- Audit trail and traceability
- Signature invalidation procedures

### 1.3 Regulatory Basis
- **21 CFR Part 11** - FDA regulation on electronic records and signatures
- **Subpart B** - Electronic Signatures (§11.50 - §11.70)
- **Subpart C** - Electronic Signatures - Signature Manifestations (§11.100, §11.200, §11.300)

---

## 2. SYSTEM DESCRIPTION

### 2.1 Electronic Signature System Overview
The MES Electronic Signature System provides three levels of signature security:

#### 2.1.1 Signature Types
- **BASIC**: Username + Password authentication
- **ADVANCED**: Username + Password + 2FA (TOTP)
- **QUALIFIED**: Username + Password + 2FA + Biometric + Digital Certificate

#### 2.1.2 Signature Levels (Authority Levels)
- **OPERATOR**: Manufacturing operator signatures
- **SUPERVISOR**: Supervisor review and approval
- **QUALITY**: Quality inspector approval
- **ENGINEER**: Engineering approval
- **MANAGER**: Management approval

### 2.2 Key Technical Components
- **Backend Service**: `ElectronicSignatureService.ts`
- **Database Models**: Prisma schema with `ElectronicSignature` model
- **Frontend Components**: `SignatureModal`, `BiometricCapture`, `SignatureDisplay`
- **API Endpoints**: `/api/v1/signatures/*`
- **Cryptography**: SHA-256 hashing, bcrypt password verification

### 2.3 Data Flow
1. User initiates signature action on document/record
2. System displays signature modal with authentication requirements
3. User provides credentials (username/password + optional 2FA + biometric)
4. System verifies credentials against user database
5. System captures signature data and generates SHA-256 hash
6. System stores signature record with timestamp, IP address, user agent
7. System links signature to signed entity (work instruction, FAI, NCR, etc.)
8. System creates immutable audit trail entry

---

## 3. VALIDATION REQUIREMENTS

### 3.1 21 CFR Part 11 Requirements Mapping

#### §11.10 Controls for Closed Systems
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.10(a) System validation | This validation plan | VT-001 |
| §11.10(b) Generate accurate and complete copies | PDF export with signatures | VT-002 |
| §11.10(c) Protection of records | Database encryption, backups | VT-003 |
| §11.10(d) Limit system access | User authentication, roles | VT-004 |
| §11.10(e) Audit trail | `AuditLog` table, immutable | VT-005 |
| §11.10(f) Operational system checks | Input validation, error handling | VT-006 |
| §11.10(g) Authority checks | Signature level enforcement | VT-007 |
| §11.10(h) Device checks | Biometric reader validation | VT-008 |
| §11.10(i) Education and training | User training program | VT-009 |

#### §11.50 Signature Manifestations
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.50(a) Signed record must contain | Signature display shows all info | VT-010 |
| §11.50(b) Signature information displayed | `SignatureDisplay` component | VT-011 |

#### §11.70 Signature/Record Linking
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.70 Signatures linked to records | `signedEntityType`, `signedEntityId` | VT-012 |
| §11.70 Signatures cannot be excised | Soft delete only, audit trail | VT-013 |

#### §11.100 General Requirements (Electronic Signatures)
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.100(a) Unique to one individual | User ID unique constraint | VT-014 |
| §11.100(b) User verification | Password + 2FA + Biometric | VT-015 |
| §11.100(c) Signature not reused | New signature per action | VT-016 |

#### §11.200 Electronic Signature Components
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.200(a)(1) Two distinct components | Username + Password | VT-017 |
| §11.200(a)(2) Biometric component | Fingerprint capture | VT-018 |
| §11.200(a)(3) Executed by one individual | Single-user session | VT-019 |

#### §11.300 Controls for Identification Codes/Passwords
| Requirement | Implementation | Validation Test |
|-------------|----------------|-----------------|
| §11.300(a) Unique combinations | Username unique | VT-020 |
| §11.300(b) User identity periodically checked | Session timeout, re-auth | VT-021 |
| §11.300(c) Loss management procedures | Password reset, account lockout | VT-022 |
| §11.300(d) Transaction safeguards | Session tokens, HTTPS | VT-023 |
| §11.300(e) Device token use | Biometric template encryption | VT-024 |

---

## 4. VALIDATION TEST CASES

### 4.1 VT-001: System Validation Documentation
**Objective**: Verify comprehensive validation documentation exists
**Test Steps**:
1. Review validation plan completeness
2. Verify IQ (Installation Qualification) document
3. Verify OQ (Operational Qualification) test cases
4. Verify PQ (Performance Qualification) test cases

**Acceptance Criteria**:
- ✅ All validation documents complete and approved
- ✅ Traceability matrix maps requirements to tests

---

### 4.2 VT-002: Accurate and Complete Copies
**Objective**: Verify system can produce accurate copies of signed records
**Test Steps**:
1. Sign a work instruction with ADVANCED signature
2. Export work instruction to PDF
3. Verify PDF contains all signature information
4. Verify signature hash matches original

**Acceptance Criteria**:
- ✅ PDF includes: signer name, timestamp, signature type, signature hash
- ✅ Signature integrity verifiable from PDF

---

### 4.3 VT-003: Record Protection
**Objective**: Verify electronic records are protected from unauthorized access
**Test Steps**:
1. Verify database encryption at rest
2. Verify backup procedures
3. Attempt to directly modify signature record (should fail)
4. Verify audit trail captures modification attempts

**Acceptance Criteria**:
- ✅ Database uses encryption (AES-256)
- ✅ Backups performed daily and encrypted
- ✅ Direct database modifications logged

---

### 4.4 VT-004: System Access Controls
**Objective**: Verify only authorized users can sign documents
**Test Steps**:
1. Attempt to sign document without authentication (should fail)
2. Attempt to sign document with invalid credentials (should fail)
3. Attempt to sign document with inactive user account (should fail)
4. Sign document with valid, active user (should succeed)

**Acceptance Criteria**:
- ✅ Unauthenticated requests rejected (401 Unauthorized)
- ✅ Invalid credentials rejected with error message
- ✅ Inactive users cannot sign
- ✅ Valid users can sign successfully

---

### 4.5 VT-005: Audit Trail
**Objective**: Verify complete audit trail for all signature events
**Test Steps**:
1. Create signature on work instruction
2. Verify audit log entry created with: user ID, timestamp, action, IP address
3. Invalidate signature
4. Verify invalidation logged with reason and timestamp
5. Attempt to delete audit log (should be immutable)

**Acceptance Criteria**:
- ✅ All signature events logged automatically
- ✅ Audit trail includes: who, what, when, where
- ✅ Audit logs cannot be modified or deleted

---

### 4.6 VT-006: Operational System Checks
**Objective**: Verify system performs appropriate checks during signature operations
**Test Steps**:
1. Attempt to sign non-existent document (should fail)
2. Provide malformed signature data (should fail with validation error)
3. Exceed maximum signature attempts (should lock out)
4. Sign valid document with valid data (should succeed)

**Acceptance Criteria**:
- ✅ Input validation prevents invalid data
- ✅ Error messages clear and actionable
- ✅ System gracefully handles edge cases

---

### 4.7 VT-007: Authority Checks
**Objective**: Verify signature level enforcement
**Test Steps**:
1. Attempt to apply MANAGER signature as OPERATOR user (should fail)
2. Apply appropriate signature level for user role (should succeed)
3. Verify signature level stored correctly in database

**Acceptance Criteria**:
- ✅ Users can only apply signatures at or below their authority level
- ✅ Signature level mismatch rejected with error

---

### 4.8 VT-008: Biometric Device Checks
**Objective**: Verify biometric capture quality validation
**Test Steps**:
1. Capture fingerprint with quality score below threshold (should fail)
2. Capture fingerprint with quality score above threshold (should succeed)
3. Verify biometric template encrypted in database
4. Verify biometric score stored for audit purposes

**Acceptance Criteria**:
- ✅ Low-quality biometric captures rejected
- ✅ Minimum quality score: 80%
- ✅ Biometric data encrypted

---

### 4.9 VT-015: Multi-Factor User Verification
**Objective**: Verify multi-factor authentication for ADVANCED/QUALIFIED signatures
**Test Steps**:
1. Initiate ADVANCED signature
2. Enter valid username and password
3. Enter invalid 2FA code (should fail)
4. Enter valid 2FA code (should succeed)
5. For QUALIFIED: verify biometric also required

**Acceptance Criteria**:
- ✅ BASIC signature requires only username/password
- ✅ ADVANCED signature requires username/password + 2FA
- ✅ QUALIFIED signature requires username/password + 2FA + biometric

---

### 4.10 VT-017: Two Distinct Components
**Objective**: Verify electronic signatures use at least two distinct identification components
**Test Steps**:
1. Attempt to sign with only username (should fail)
2. Attempt to sign with only password (should fail)
3. Sign with both username and password (should succeed)

**Acceptance Criteria**:
- ✅ Both username and password required
- ✅ Single component insufficient for signature

---

### 4.11 VT-020: Unique User Combinations
**Objective**: Verify username uniqueness enforced
**Test Steps**:
1. Attempt to create user with existing username (should fail)
2. Verify database unique constraint on username
3. Attempt to sign with another user's credentials (should fail)

**Acceptance Criteria**:
- ✅ Duplicate usernames prevented
- ✅ Each signature uniquely identifies signer

---

### 4.12 VT-023: Transaction Safeguards
**Objective**: Verify cryptographic protection of signature data
**Test Steps**:
1. Capture network traffic during signature (should be encrypted)
2. Verify HTTPS used for all signature API calls
3. Verify signature hash generated using SHA-256
4. Attempt to replay signature (should fail)

**Acceptance Criteria**:
- ✅ All API calls use HTTPS (TLS 1.2+)
- ✅ Signature hash uses SHA-256
- ✅ Replay attacks prevented

---

## 5. VALIDATION EXECUTION

### 5.1 Validation Phases
1. **Installation Qualification (IQ)** - Weeks 5-6 (Sprint 3)
2. **Operational Qualification (OQ)** - Weeks 7-8 (Sprint 4)
3. **Performance Qualification (PQ)** - Weeks 9-10 (Sprint 5)

### 5.2 Validation Team
- **Validation Lead**: QA Manager
- **System Owner**: Product Owner / CTO
- **Quality Assurance**: QA Engineer
- **Development**: Tech Lead / Senior Developer
- **Compliance**: Compliance Specialist

### 5.3 Test Execution Schedule
| Phase | Test Cases | Duration | Responsible |
|-------|-----------|----------|-------------|
| IQ | VT-001 to VT-003 | 1 week | QA Engineer |
| OQ | VT-004 to VT-012 | 2 weeks | QA Engineer + Developer |
| PQ | VT-013 to VT-024 | 2 weeks | QA Manager + Team |

---

## 6. DEVIATION MANAGEMENT

### 6.1 Deviation Handling
If any validation test fails:
1. Document deviation with test case ID, description, impact
2. Perform root cause analysis
3. Implement corrective action
4. Re-execute failed test
5. Update validation report

### 6.2 Deviation Approval
All deviations require approval from:
- QA Manager
- System Owner
- Compliance Specialist

---

## 7. VALIDATION REPORT

### 7.1 Report Contents
Upon completion, validation report shall include:
- Executive summary of validation results
- Test case execution results (pass/fail)
- Deviations and corrective actions
- Traceability matrix (requirements → tests → results)
- Signature approval page

### 7.2 Approval Signatures
**Validated by:**
- QA Manager: ______________________ Date: _______
- System Owner: ____________________ Date: _______
- Compliance Specialist: ____________ Date: _______

---

## 8. MAINTENANCE AND REVALIDATION

### 8.1 Change Control
Any changes to the electronic signature system require:
1. Change request with impact assessment
2. Risk analysis
3. Partial or full revalidation (based on impact)
4. Approval before implementation

### 8.2 Periodic Review
Validation documentation reviewed annually or when:
- Regulatory requirements change
- System undergoes major upgrade
- Audit findings require revalidation

---

**Document Control**
- **Version**: 1.0
- **Author**: MES Development Team
- **Approved By**: [Pending]
- **Effective Date**: [Pending]
- **Next Review**: [12 months from effective date]
