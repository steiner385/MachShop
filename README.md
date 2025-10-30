# Manufacturing Execution System (MES)
## Jet Engine Component Manufacturing

[![Test Coverage](https://codecov.io/gh/steiner385/MachShop/branch/main/graph/badge.svg)](https://codecov.io/gh/steiner385/MachShop)
[![CI](https://github.com/steiner385/MachShop/workflows/Test%20Coverage%20CI/badge.svg)](https://github.com/steiner385/MachShop/actions)
[![Coverage Goal](https://img.shields.io/badge/Coverage%20Goal-50%25-blue)](https://github.com/steiner385/MachShop/issues?q=label%3A%22type%3A+test-coverage%22)

A comprehensive Manufacturing Execution System designed for aerospace manufacturing, providing production management, quality control, and traceability for jet engine components.

**Current Status:** Active Development - Core features implemented with ongoing sprint-based enhancements.

## 🧪 Test Coverage Initiative

We are systematically achieving **50% test coverage** across the entire application through a structured 6-epic approach:

- **Current Coverage**: [View Latest Report](https://codecov.io/gh/steiner385/MachShop)
- **Progress Tracking**: [Epic Issues](https://github.com/steiner385/MachShop/issues?q=label%3Aepic)
- **Implementation Issues**: [Test Coverage Tasks](https://github.com/steiner385/MachShop/issues?q=label%3A%22type%3A+test-coverage%22)

### Coverage Milestones
- **Milestone 1 (10%)**: Simple services & core components
- **Milestone 2 (20%)**: Critical business services
- **Milestone 3 (30%)**: Infrastructure & feature components
- **Milestone 4 (40%)**: Complex business logic
- **Milestone 5 (50%)**: Complete coverage target
- **Milestone 6**: Polish & optimization

## 🚀 Features

### Implemented Core Capabilities
- **Work Order Management**: Production lifecycle management and execution tracking
- **Quality Control**: Inspection plans, FAI reports, measurements, and NCR management
- **Material Traceability**: Genealogy tracking and material transaction management
- **Unit of Measure System**: Standardized UOM lookup table with 53 manufacturing units (EA, KG, LB, GAL, etc.) and automatic FK resolution across 21+ tables
- **Routing Management**: Multi-site routing with dependencies and lifecycle management (Sprint 4)
- **Electronic Signatures**: 21 CFR Part 11 compliant signature capture
- **Digital Work Instructions**: Versioned work instructions with rich-text editing
- **Equipment Management**: ISA-95 compliant equipment hierarchy and tracking
- **Process Segments**: Reusable process definitions with ISA-95 compliance
- **Personnel Management**: Skills, certifications, and work center assignments
- **Production Scheduling**: Schedule management and constraint tracking

### Compliance & Security
- **AS9100 Aerospace Quality Standard** compliance
- **ITAR Export Control** compliance
- **Role-based Access Control** with comprehensive audit trails
- **Data Encryption** at rest and in transit

### Integration Capabilities (Framework Implemented)
- **Integration Framework**: Adapter pattern for external systems
- **Supported Integrations**: Oracle Fusion, IBM Maximo, Teamcenter, ShopFloor Connect, Predator DNC/PDM, Covalent, Indysoft
- **ISA-95 B2M Integration**: Business-to-Manufacturing messaging
- **Equipment Integration**: Proficy Historian, L2 Equipment adapters
- **CMM/QIF Support**: Quality measurement data exchange
- **API-First Design**: RESTful APIs with OpenAPI specification

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: PostgreSQL 15 with Prisma ORM (93 models, 4,199 lines schema)
- **Caching**: Redis for session management and performance
- **Event Bus**: Apache Kafka for event-driven architecture (dependency installed)

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Ant Design for enterprise components
- **State Management**: Zustand for lightweight state management
- **Build Tool**: Vite for fast development and builds

### Testing
- **Unit Tests**: Vitest with comprehensive coverage
- **E2E Tests**: Playwright for cross-browser testing
- **API Tests**: Supertest for endpoint validation

### DevOps
- **Containerization**: Docker with multi-stage builds (docker-compose.yml configured)
- **Orchestration**: Kubernetes configurations available (k8s/, helm/)
- **CI/CD**: GitHub Actions workflows configured (.github/)
- **Monitoring**: OpenTelemetry instrumentation, Prometheus, Grafana (configs available)
- **Observability**: Distributed tracing with Jaeger support

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 15 or higher
- Redis 7.x
- Docker (optional, for containerized deployment)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/manufacturing-execution-system.git
cd manufacturing-execution-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
# Create database
createdb mes_development

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Development Server
```bash
npm run dev
```

The system will start:
- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:5173

### 6. API Documentation
Visit http://localhost:3001/api-docs for interactive API documentation

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 📚 Documentation

### API Documentation
- **OpenAPI Spec**: `/openapi.yaml`
- **Interactive Docs**: http://localhost:3001/api-docs

### Project Documentation
- **Requirements**: `docs/REQUIREMENTS.md`
- **Use Cases**: `docs/USE_CASES.md`
- **Test Cases**: `docs/TEST_CASES.md`
- **Architecture**: `docs/SYSTEM_ARCHITECTURE.md`
- **Technology Stack**: `docs/TECHNOLOGY_STACK.md`
- **Implementation Roadmap**: `docs/MES_IMPLEMENTATION_ROADMAP.md`

### Sprint Documentation
- **Sprint Progress**: `docs/sprints/`
- **Latest**: Sprint 4 completed (Multi-site Routing Management with enhancements)

### Deployment Documentation
- **Deployment Guide**: `docs/deployment/DEPLOYMENT_GUIDE.md`
- **Docker Quick Start**: `docs/deployment/DOCKER_QUICK_START.md`
- **Database Migration**: `docs/deployment/DATABASE_MIGRATION_GUIDE.md`

## 🏗️ Architecture

### System Overview (Hybrid Monolith + Microservices)
```
┌──────────────────────┐
│   Frontend (React)   │  Port: 5173
│   Vite Dev Server    │
└──────────┬───────────┘
           │ HTTP API Calls
           ▼
┌──────────────────────┐
│  Backend API         │  Port: 3001
│  (Express Monolith)  │
│  ─────────────────   │
│  • Work Orders       │
│  • Quality/NCRs      │
│  • Materials         │
│  • Traceability      │
│  • Routing           │
│  • Process Segments  │
│  • Equipment         │
│  • Personnel         │
│  • FAI Reports       │
│  • Work Instructions │
│  • Signatures        │
│  • Integration Svc   │
└──────────┬───────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌─────────┐  ┌────────┐  ┌────────┐
│PostgreSQL  │Redis   │  │Kafka   │
│(Primary DB)│(Cache) │  │(Events)│
│93 Models   │Session │  │Planned │
└─────────┘  └────────┘  └────────┘
```

**Note**: Microservices architecture is partially implemented in `/services` directory with plans for full migration. Current deployment uses monolithic backend with shared database.

### Database Schema (ISA-95 Compliant)
- **93 Prisma Models** across 4,199 lines
- **Equipment Hierarchy**: Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment
- **Personnel Hierarchy**: Classes, qualifications, certifications, skills
- **Material Hierarchy**: Classes, definitions, lots, sublots, genealogy
- **Process Segments**: ISA-95 routing and process definitions
- **Product Definitions**: Parts, BOMs, specifications, configurations

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication support
- Session management with Redis

### Data Protection
- AES-256 encryption at rest
- TLS 1.3 for data in transit
- GDPR compliance features
- Comprehensive audit logging

### Compliance
- AS9100 aerospace quality standard
- ITAR export control compliance
- SOX financial reporting compliance
- ISO 9001:2015 quality management

## 🚀 Deployment

### Local Development (Recommended)
```bash
# Start both backend and frontend
npm run dev

# Backend runs on port 3001
# Frontend runs on port 5173
```

### Docker Deployment (Available)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Kubernetes Deployment (Configurations Available)
```bash
# Deploy to Kubernetes (when ready for production)
kubectl apply -f k8s/
```

### Production Configuration
See `docs/deployment/DEPLOYMENT_GUIDE.md` for detailed production deployment instructions.

## 📊 Monitoring

### Health Checks
- **API Health**: `GET /health`
- **Database**: Connection pool monitoring via Prisma
- **Redis**: Cache performance metrics (when configured)
- **OpenTelemetry**: Distributed tracing instrumentation (available)

### Metrics
- Application performance metrics
- Business KPIs and manufacturing metrics
- Security and audit metrics
- Infrastructure monitoring

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement the feature
5. Run tests and ensure coverage
6. Submit a pull request

### Code Standards
- TypeScript strict mode
- ESLint and Prettier for code formatting
- Conventional commits for git messages
- Test coverage minimum 80%

### Pull Request Process
1. Ensure all tests pass
2. Update documentation as needed
3. Add unit and integration tests
4. Request code review
5. Address review feedback

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

### Documentation
- **API Reference**: http://localhost:3000/api-docs
- **User Guides**: `/docs` directory
- **FAQ**: See project wiki

### Contact
- **Technical Issues**: Create GitHub issue
- **Security Issues**: security@company.com
- **General Support**: support@company.com

## 🗺️ Roadmap & Implementation Status

### Completed (Sprint 1-4)
- ✅ ISA-95 compliant database schema (93 models)
- ✅ Core manufacturing workflows (Work Orders, Quality, Materials)
- ✅ Material traceability and genealogy tracking
- ✅ Equipment hierarchy and management
- ✅ Personnel management with certifications
- ✅ Process segment definitions
- ✅ Digital work instructions with versioning
- ✅ Electronic signatures (21 CFR Part 11)
- ✅ FAI (First Article Inspection) reports
- ✅ Multi-site routing management with dependencies (Sprint 4)
- ✅ Production scheduling framework
- ✅ Integration framework (12+ adapter types)

### In Progress
- 🔄 Microservices migration (services/ directory scaffolded)
- 🔄 Advanced analytics dashboards
- 🔄 Real-time shop floor data collection
- 🔄 OEE calculation and monitoring

### Planned (Sprint 5+)
- 📋 Advanced scheduling optimization
- 📋 Mobile application support
- 📋 IoT sensor integration
- 📋 Predictive maintenance
- 📋 Complete microservices deployment
- 📋 Cloud-native production deployment

---

## Quick Commands Reference

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Testing
npm test                   # Run unit tests
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report
npm run test:e2e          # Run end-to-end tests

# Database
npm run db:migrate         # Run database migrations
npm run db:seed           # Seed database with test data
npm run db:reset          # Reset database

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Format code with Prettier
npm run typecheck         # Run TypeScript checks

# Documentation
npm run docs:api          # Serve API documentation
npm run docs:build        # Build documentation
```

Built with ❤️ for aerospace manufacturing excellence.