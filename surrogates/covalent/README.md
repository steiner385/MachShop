# Covalent Training & Certification Management Surrogate

> Mock Covalent API for integration testing training and certification management without access to live system

**Issue #244**: Testing Infrastructure - Training & Certification Management Surrogates (Covalent)

## 🎯 Overview

This project provides a comprehensive mock/surrogate system for Covalent training and certification management APIs. It enables:

- **Integration Testing**: Test MES operator qualification validation without external dependencies
- **CI/CD Pipeline**: Automated testing in continuous integration environments
- **Development**: Rapid development and testing of certification workflows
- **AS9100 Compliance**: Support for aerospace quality management requirements
- **Operator Qualification**: Verify operators qualified before work order execution

## ✨ Features

### Core Capabilities

✅ **Personnel Management**
- Employee records and demographics
- Department and shift assignments
- Employment status tracking
- Certification history

✅ **Skills & Competencies**
- Skill definitions and categories
- Skill levels (Novice, Intermediate, Expert, Master)
- Skill requirements by operation
- Skill matrix management

✅ **Training Programs**
- Course catalog with prerequisites
- Multiple delivery methods (In-person, Online, Hybrid, Self-paced)
- Training enrollment and completion tracking
- Instructor assignments

✅ **Certifications**
- Certification lifecycle management
- Issuance, expiration, renewal, suspension, revocation
- Certification number assignment
- Expiration date tracking
- Multi-status support

✅ **Operator Qualification**
- Real-time operator certification checks
- Missing skills identification
- Expiring certification alerts (30, 14, 7 days)
- Compliance verification

✅ **Alerts & Notifications**
- Expiring certifications (30-day window)
- Expired certifications
- Missing required skills
- Webhook notifications

✅ **Data Management**
- Realistic test data (100+ employees, varied statuses)
- Database reset capabilities
- State inspection endpoints
- Webhook event logging

✅ **Error Simulation**
- HTTP error responses (400, 404, 500)
- Business logic errors (expired certs, missing skills)
- Timeout simulation
- Edge case handling

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/steiner385/MachShop.git
cd surrogates/covalent

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Local Development

```bash
# Start development server (with hot reload)
npm run dev

# Server will be available at http://localhost:3001
# Swagger documentation at http://localhost:3001/api/docs
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker
npm run docker:run

# Or use Docker Compose
npm run docker:compose

# Server will be available at http://localhost:3001
```

## 📚 API Documentation

### Swagger/OpenAPI

Interactive API documentation available at: `http://localhost:3001/api/docs`

### Health Check

**GET** `/health`
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Personnel Endpoints

#### Get All Personnel
**GET** `/api/personnel?status=ACTIVE`

#### Get Personnel by ID
**GET** `/api/personnel/{id}`

#### Create Personnel
**POST** `/api/personnel`
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "jobTitle": "Operator",
  "department": "Manufacturing",
  "shift": "Day",
  "employmentStatus": "ACTIVE"
}
```

### Qualification Check

#### Verify Operator Qualification
**POST** `/api/qualifications/check`

Request:
```json
{
  "personnelId": "uuid-123",
  "operationId": "OP-WELD-001"
}
```

Response:
```json
{
  "personnelId": "uuid-123",
  "operationId": "OP-WELD-001",
  "qualified": true,
  "reason": "Operator qualified for operation",
  "expiringCertifications": [
    {
      "certificationId": "cert-456",
      "certificationName": "AWS D17.1 Welding",
      "daysUntilExpiration": 15
    }
  ],
  "certificationDetails": [
    {
      "id": "cert-456",
      "name": "AWS D17.1 Welding",
      "status": "EXPIRING_SOON",
      "expirationDate": "2024-01-30T00:00:00Z"
    }
  ]
}
```

### Certification Endpoints

#### Get All Certifications
**GET** `/api/certifications`

#### Get Certification by ID
**GET** `/api/certifications/{id}`

#### Get Certifications for Personnel
**GET** `/api/certifications/personnel/{personnelId}`

#### Create Certification
**POST** `/api/certifications`
```json
{
  "personnelId": "uuid-123",
  "certificationTypeId": "type-456",
  "certificationName": "AWS D17.1 Welding",
  "issuer": "Covalent Training",
  "expirationDate": "2026-01-15T00:00:00Z"
}
```

### Alerts

#### Get Expiring Certifications
**GET** `/api/alerts/expiring`

Returns certifications expiring within 30 days.

### Admin Endpoints

#### Get Database State
**GET** `/api/admin/state`

Returns full database state including statistics.

#### Initialize with Test Data
**POST** `/api/admin/initialize`

Resets database and loads realistic test data (100+ employees, varied certification statuses).

#### Reset Database
**POST** `/api/admin/reset`

Full reset:
```bash
curl -X POST http://localhost:3001/api/admin/reset \
  -H "Content-Type: application/json" \
  -d '{}'
```

Partial reset:
```bash
curl -X POST http://localhost:3001/api/admin/reset \
  -H "Content-Type: application/json" \
  -d '{
    "includePersonnel": true,
    "includeCertifications": true,
    "includeTraining": false
  }'
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Integration Tests

```bash
# Run integration tests only
npm test -- --testNamePattern="integration"
```

### Example Test

```typescript
import { request } from 'supertest';
import app from './index';

describe('Operator Qualification Check', () => {
  it('should verify operator qualified for operation', async () => {
    // Create test personnel
    const personnel = await request(app)
      .post('/api/personnel')
      .send({
        firstName: 'Test',
        lastName: 'Operator',
        email: 'test@company.com',
        jobTitle: 'Operator',
        department: 'Manufacturing'
      });

    // Create certification
    await request(app)
      .post('/api/certifications')
      .send({
        personnelId: personnel.body.id,
        certificationName: 'AWS D17.1',
        expirationDate: '2026-01-15T00:00:00Z'
      });

    // Check qualification
    const result = await request(app)
      .post('/api/qualifications/check')
      .send({
        personnelId: personnel.body.id,
        operationId: 'OP-WELD-001'
      });

    expect(result.body.qualified).toBe(true);
  });
});
```

## 📋 Use Cases

### Use Case 1: Operator Qualification Check

1. Operator badges in to start work order WO-12345
2. MES queries Covalent surrogate: `POST /api/qualifications/check`
3. Surrogate verifies:
   - Operator certified for operation (Turbine Assembly)
   - Certification current (not expired)
   - Required skills present
4. MES allows work order to start
5. Integration test verifies qualification passed

### Use Case 2: Expired Certification Block

1. Operator with expired certification attempts work
2. MES checks `/api/qualifications/check`
3. Surrogate returns `qualified: false`
4. MES blocks operation and displays message
5. Integration test verifies blocking logic

### Use Case 3: Expiring Certification Alert

1. Check `/api/alerts/expiring` for 30-day window
2. Alert system notifies operators
3. Operators enroll in renewal training
4. Integration test validates alert workflow

## 🔧 Configuration

### Environment Variables

```bash
NODE_ENV=development          # development|production
PORT=3001                    # Server port
LOG_LEVEL=INFO               # ERROR|WARN|INFO|DEBUG
```

### Docker Configuration

Edit `docker-compose.yml` to modify:
- Port mappings
- Environment variables
- Volume mounts
- Network configuration

## 📊 Database State

The surrogate maintains in-memory state with the following collections:

```typescript
{
  personnel: PersonnelRecord[];           // 100+ employees
  skills: Skill[];                        // Skill definitions
  skillMatrix: SkillMatrix[];             // Operation requirements
  trainingPrograms: TrainingProgram[];    // Course catalog
  trainingEnrollments: TrainingEnrollment[]; // Training records
  certifications: Certification[];        // Personnel certifications
  certificationTypes: CertificationType[]; // Cert type definitions
  webhookLogs: WebhookEvent[];           // Notification logs
  lastReset: string;                      // Last reset timestamp
}
```

### Test Data

On initialization, creates:
- **120 personnel records** with varied statuses:
  - Active employees (90%)
  - Inactive employees (10%)
  - Various job titles and departments
  - Different shifts
- **Certifications** with realistic status distribution:
  - Current (60%)
  - Expiring Soon (20%)
  - Expired (15%)
  - Suspended (5%)
- **Skill matrices** for operations
- **Training programs** with prerequisites
- **Skills** with requirements by operation

## 🔐 AS9100 Compliance

Supports aerospace quality management requirements:

✅ **Documented Training Requirements**
- Skill definitions
- Competency levels
- Operation requirements

✅ **Competence Verification Records**
- Personnel records
- Certification tracking
- Assessment records

✅ **Skill Assessment Criteria**
- Skill levels
- Required certifications
- Assessment tracking

✅ **Training Effectiveness Evaluation**
- Training completion records
- Assessment scores
- Certification validation

## 🛠️ Development

### Project Structure

```
surrogates/covalent/
├── src/
│   ├── index.ts              # Main Express app
│   ├── models/
│   │   └── types.ts          # TypeScript type definitions
│   ├── services/
│   │   └── database.service.ts # In-memory database
│   ├── utils/
│   │   ├── logger.ts         # Logging utility
│   │   └── test-data.ts      # Test data generation
│   └── middleware/           # Express middleware (future)
├── tests/                    # Integration tests
├── docker/
│   └── docker-compose.yml   # Docker Compose config
├── Dockerfile               # Docker image definition
├── package.json            # npm dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

### Code Style

- **Language**: TypeScript (strict mode)
- **Linter**: ESLint
- **Formatter**: Prettier
- **Testing**: Jest + Supertest

### Build Commands

```bash
npm run build              # Compile TypeScript
npm run lint              # Run ESLint
npm run format            # Format with Prettier
npm test                  # Run tests
npm run docker:build     # Build Docker image
```

## 📈 Monitoring & Logging

### Logs

All requests and errors are logged to console with timestamp and level.

### Database Inspection

Get full database state:
```bash
curl http://localhost:3001/api/admin/state | jq
```

### Webhook Logs

View webhook event logs:
```bash
curl http://localhost:3001/api/admin/state | jq '.webhookLogs'
```

## ⚠️ Known Limitations

1. **In-Memory Storage**: Data persists only while server running
2. **Single Instance**: No distributed state across multiple instances
3. **No Authentication**: Demo endpoints without API key validation (future enhancement)
4. **No Rate Limiting**: No rate limit enforcement (future enhancement)
5. **No Database Persistence**: State resets on server restart

## 🔮 Future Enhancements

- [ ] PostgreSQL persistent storage
- [ ] Webhook event delivery and retry logic
- [ ] API key authentication
- [ ] Rate limiting
- [ ] Multi-instance support with shared state
- [ ] Audit logging
- [ ] Advanced error simulation
- [ ] Performance metrics
- [ ] GraphQL API
- [ ] Real-time updates with WebSockets

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
lsof -i :3001

# Kill process using port
kill -9 <PID>

# Try different port
PORT=3002 npm run dev
```

### Docker Build Fails

```bash
# Clear Docker build cache
docker system prune -a

# Rebuild
npm run docker:build
```

### Tests Failing

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests with verbose output
npm test -- --verbose
```

## 📖 References

- [Covalent Training Management](https://www.covalent.com/)
- [AS9100 Quality Standards](https://www.as9100.org/)
- [Express.js Documentation](https://expressjs.com/)
- [OpenAPI/Swagger Specification](https://swagger.io/)

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please ensure:
- Tests pass (`npm test`)
- Code formatted (`npm run format`)
- No linting errors (`npm run lint`)
- TypeScript strict mode compliance

---

**Issue #244**: Testing Infrastructure - Training & Certification Management Surrogates
**Status**: Active Development
**Last Updated**: January 2024
