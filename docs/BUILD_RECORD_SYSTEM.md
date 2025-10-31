# Electronic Build Book & Assembly Build Record System

## Overview

The Electronic Build Book & Assembly Build Record System is a comprehensive manufacturing execution system (MES) component designed for aerospace manufacturing environments. It provides AS9100D and FAA Part 43 compliant documentation, electronic signatures, photo documentation, deviation tracking, and automated build book generation.

## Features

### Core Capabilities
- **Electronic Build Records**: Digital tracking of assembly operations with full audit trails
- **Electronic Signatures**: Secure digital signature workflows with role-based access
- **Photo Documentation**: Integrated camera capture with annotation tools
- **Deviation Management**: Comprehensive deviation tracking and approval workflows
- **Automated Build Books**: AS9100 compliant PDF generation with customizable templates
- **As-Built Configuration**: Real-time tracking of actual vs. designed configurations
- **Traceability**: Complete part and operation traceability for regulatory compliance

### Compliance & Standards
- AS9100D (Aerospace Quality Management System)
- FAA Part 43 (Maintenance, Rebuilding, and Alteration Requirements)
- ISO 9001 (Quality Management System)
- 21 CFR Part 11 (Electronic Records and Signatures)

### Scale & Performance
- Handles 25,000+ part assemblies
- Real-time operation tracking
- Concurrent multi-user support
- High-availability architecture

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/TS)    │◄──►│   (Node.js/TS)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐          ┌─────▼─────┐
   │ Camera  │            │ Services  │          │  Prisma   │
   │ Capture │            │ Layer     │          │   ORM     │
   └─────────┘            └───────────┘          └───────────┘
```

### Database Schema

The system extends the existing MES database with six new models:

1. **BuildRecord** - Main assembly record
2. **BuildRecordOperation** - Individual operation tracking
3. **BuildDeviation** - Deviation documentation
4. **BuildRecordPhoto** - Photo documentation
5. **BuildRecordDocument** - Document attachments
6. **BuildRecordSignature** - Electronic signatures

### Service Layer

- **BuildRecordService** - Core build record operations
- **BuildBookPDFService** - Automated PDF generation
- **PhotoCaptureService** - Photo capture and processing
- **AsBuiltConfigurationService** - Configuration tracking

## User Roles & Permissions

### Operator
- Create and start build records
- Complete operations
- Capture photos with annotations
- Record part usage and tool information
- Sign off on completed operations

### Inspector
- Review and inspect completed operations
- Add inspection photos and notes
- Provide inspector signatures
- Create and manage deviations

### Engineer
- Approve engineering deviations
- Review as-built configurations
- Manage build book templates
- Analyze operation performance

### Quality Manager
- Final quality approval
- Deviation approval authority
- System configuration
- Compliance reporting

### Production Manager
- Overall production oversight
- System administration
- Performance analytics
- Resource allocation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Camera access for photo capture
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation

1. **Database Setup**
   ```bash
   # Run Prisma migrations
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Backend Configuration**
   ```bash
   # Install dependencies
   npm install

   # Configure environment variables
   cp .env.example .env
   # Edit .env with your database URL and secrets

   # Start backend server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mes_db"

# Authentication
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="24h"

# File Storage
UPLOAD_PATH="/uploads"
MAX_FILE_SIZE="10485760" # 10MB

# PDF Generation
PDF_TEMPLATE_PATH="/templates"
COMPANY_LOGO_PATH="/assets/logo.png"

# Camera Settings
CAMERA_RESOLUTION="1920x1080"
PHOTO_QUALITY="0.9"
```

## User Guides

### For Operators

#### Creating a Build Record
1. Navigate to **Build Records** → **Create New**
2. Select the work order from the dropdown
3. Confirm operator assignment
4. Click **Create Build Record**

#### Starting an Operation
1. Open the build record detail page
2. Click on the pending operation
3. Click **Start Operation**
4. Begin physical work

#### Completing an Operation
1. Ensure all work is finished
2. Click **Complete Operation**
3. Fill in required fields:
   - **Notes**: Operation summary
   - **Tools Used**: List all tools
   - **Parts Used**: Record actual parts with serial numbers
4. Click **Complete**

#### Capturing Photos
1. Click **Add Photo** on any operation
2. Choose **Capture** or **Upload**
3. For capture:
   - Select camera
   - Position for clear view
   - Click **Capture Photo**
4. Add annotations if needed:
   - Select drawing tool (line, arrow, text, circle, rectangle)
   - Draw on the image
   - Add text labels
5. Fill in photo metadata:
   - **Caption**: Descriptive title
   - **Category**: Progress, Issue, Inspection, etc.
   - **Tags**: Searchable keywords
   - **Notes**: Additional context
6. Click **Save Photo**

#### Electronic Signatures
1. Complete the operation first
2. Click **Sign Off**
3. Review operation details
4. Provide digital signature
5. Confirm certification checkboxes:
   - ✓ I am certified for this operation type
   - ✓ Work meets quality standards
   - ✓ I accept responsibility
6. Add comments if needed
7. Click **Submit Signature**

### For Inspectors

#### Performing Inspections
1. Review completed operations
2. Conduct physical inspection
3. Document findings with photos
4. Add inspection notes
5. Provide inspector signature

#### Managing Deviations
1. Click **Report Deviation** when issues are found
2. Fill in deviation details:
   - **Type**: Process, Material, Design, etc.
   - **Severity**: Low, Medium, High, Critical
   - **Description**: Detailed issue description
   - **Root Cause**: Why it occurred
   - **Corrective Action**: Immediate fix
   - **Preventive Action**: Prevention measures
3. Attach supporting photos/documents
4. Submit for engineering review

### For Managers

#### Build Book Generation
1. Ensure build record is completed
2. Navigate to build record detail
3. Click **Generate Build Book**
4. Select or customize template
5. Review preview
6. Generate final PDF

#### Template Management
1. Go to **Build Books** → **Templates**
2. Click **Create New Template**
3. Configure template settings:
   - **Header/Footer**: Company branding
   - **Sections**: Include/exclude sections
   - **Styling**: Colors, fonts, layout
   - **Compliance**: Regulatory standards
4. Save and set as default if needed

## API Documentation

### Authentication
All API endpoints require authentication via JWT token:
```
Authorization: Bearer <token>
```

### Build Records API

#### Create Build Record
```http
POST /api/build-records
Content-Type: application/json

{
  "workOrderId": "string",
  "operatorId": "string"
}
```

#### Get Build Record
```http
GET /api/build-records/{id}
```

#### List Build Records
```http
GET /api/build-records?page=1&limit=10&status=IN_PROGRESS&search=ENG123
```

#### Start Operation
```http
POST /api/build-records/{id}/operations/{operationId}/start
Content-Type: application/json

{
  "operatorId": "string"
}
```

#### Complete Operation
```http
POST /api/build-records/{id}/operations/{operationId}/complete
Content-Type: application/json

{
  "notes": "string",
  "toolsUsed": ["string"],
  "partsUsed": [
    {
      "partNumber": "string",
      "quantity": number,
      "serialNumbers": ["string"]
    }
  ]
}
```

#### Electronic Signature
```http
POST /api/build-records/{id}/operations/{operationId}/sign
Content-Type: application/json

{
  "signatureType": "OPERATOR|INSPECTOR|ENGINEER|QUALITY|FINAL_APPROVAL",
  "comments": "string",
  "signatureData": "data:image/png;base64,...",
  "metadata": {
    "certificationConfirmed": boolean,
    "qualityChecked": boolean,
    "acceptsResponsibility": boolean
  }
}
```

### Build Books API

#### Generate Build Book
```http
POST /api/build-books/generate/{buildRecordId}
Content-Type: application/json

{
  "templateId": "string", // optional
  "templateSettings": {} // optional custom settings
}
```

#### Create Template
```http
POST /api/build-books/templates
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "isDefault": boolean,
  "settings": {
    "header": {...},
    "footer": {...},
    "sections": {...},
    "styling": {...},
    "content": {...},
    "compliance": {...}
  }
}
```

### Photos API

#### Upload Photo
```http
POST /api/build-records/{id}/photos
Content-Type: multipart/form-data

photo: File
caption: string
category: string
operationId: string (optional)
tags: string[] (JSON)
notes: string (optional)
```

### Deviations API

#### Create Deviation
```http
POST /api/build-records/{id}/deviations
Content-Type: application/json

{
  "type": "PROCESS|MATERIAL|DESIGN|TOOLING|MEASUREMENT|DOCUMENTATION|OTHER",
  "category": "QUALITY|SAFETY|COMPLIANCE|EFFICIENCY|CUSTOMER",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "title": "string",
  "description": "string",
  "rootCause": "string",
  "correctiveAction": "string",
  "preventiveAction": "string"
}
```

## Security & Compliance

### Data Security
- JWT-based authentication
- Role-based access control (RBAC)
- Encrypted data transmission (HTTPS/TLS)
- Secure file storage with access controls
- Audit logging for all operations

### 21 CFR Part 11 Compliance
- Electronic signature validation
- Non-repudiation mechanisms
- Audit trail integrity
- User authentication and authorization
- System validation documentation

### Data Retention
- Build records: 25 years (aerospace requirement)
- Photos and documents: 25 years
- Audit logs: 7 years minimum
- Electronic signatures: Permanent retention

## Troubleshooting

### Common Issues

#### Camera Not Working
- Check browser permissions for camera access
- Verify camera drivers are installed
- Try different browsers (Chrome recommended)
- Check for conflicting applications using camera

#### PDF Generation Fails
- Verify all required data is present
- Check file system permissions
- Ensure adequate disk space
- Review error logs for specific issues

#### Signature Validation Errors
- Confirm user has required certifications
- Check role-based permissions
- Verify operation is completed
- Ensure signature pad is working

#### Performance Issues
- Check database connection
- Review server resources (CPU, memory)
- Optimize large file uploads
- Consider implementing pagination

### Support Contacts
- **Technical Support**: support@company.com
- **System Administration**: admin@company.com
- **Compliance Questions**: quality@company.com

## Development

### Adding New Features
1. Create feature branch from `main`
2. Implement backend services in `/src/services`
3. Add API endpoints in `/src/routes`
4. Create frontend components in `/frontend/src/components`
5. Write comprehensive tests
6. Update documentation
7. Submit pull request

### Testing
```bash
# Backend unit tests
npm test

# Frontend component tests
cd frontend && npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name feature_name

# Deploy to production
npx prisma migrate deploy
```

## Appendices

### Regulatory References
- AS9100D: Aerospace Quality Management Systems
- FAA Part 43: Maintenance, Rebuilding, and Alteration
- 21 CFR Part 11: Electronic Records and Electronic Signatures
- ISO 9001: Quality Management Systems

### File Formats Supported
- **Images**: JPEG, PNG, TIFF, BMP
- **Documents**: PDF, DOC, DOCX, TXT
- **Build Books**: PDF (AS9100 compliant format)

### Browser Compatibility
| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| IE | Any | Not Supported |

---

*Last Updated: January 2024*
*Document Version: 1.0*