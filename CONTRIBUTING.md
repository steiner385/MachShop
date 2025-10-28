# Contributing to MES

Thank you for your interest in contributing to the Manufacturing Execution System!

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [File Organization Standards](#file-organization-standards)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to professional standards of collaboration and respect. All contributors are expected to:
- Be respectful and constructive in communication
- Focus on technical merit and project goals
- Welcome newcomers and help them learn our processes

## Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- PostgreSQL 15 or higher
- Redis 7.x
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/your-org/manufacturing-execution-system.git
cd manufacturing-execution-system

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(routing): Add visual drag-and-drop editor

Implemented a React Flow-based visual editor for routing creation
with support for parallel operations and conditional paths.

Closes #123
```

## File Organization Standards

### Directory Structure
Our project follows the 5S methodology for organization:

```
/
├── .github/           # GitHub workflows and templates
├── docs/             # All project documentation
│   ├── archive/      # Historical documentation and completed work
│   ├── testing/      # Test strategies, results, and guides
│   ├── development/  # Implementation plans and progress tracking
│   ├── deployment/   # Deployment guides and configurations
│   ├── adr/          # Architecture Decision Records
│   ├── integration/  # Integration documentation
│   ├── roadmaps/     # Product and technical roadmaps
│   ├── specs/        # Specifications and requirements
│   └── sprints/      # Sprint planning and retrospectives
├── frontend/         # React frontend application
├── prisma/           # Database schema and migrations
├── scripts/          # Utility scripts
│   ├── database/     # Database-related scripts
│   └── validation/   # Validation and testing scripts
├── src/              # Backend source code
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic services
│   ├── middleware/   # Express middleware
│   └── tests/        # Test files
└── README.md         # Project overview
```

### File Organization Rules

**DO:**
- Place all documentation in `docs/` subdirectories
- Place all scripts in `scripts/` subdirectories
- Use descriptive, kebab-case filenames
- Archive completed work documentation to `docs/archive/`
- Keep the project root clean (only essential config files)

**DON'T:**
- Place documentation files in the project root
- Commit test artifacts (coverage/, test-results/, playwright-report/)
- Commit log files or temporary files
- Create duplicate documentation

### Where to Put Files

| File Type | Location | Example |
|-----------|----------|---------|
| Completed phase docs | `docs/archive/` | `PHASE_1_COMPLETION.md` |
| Test analysis/results | `docs/testing/` | `e2e-test-strategy.md` |
| Implementation plans | `docs/development/` | `routing-implementation-plan.md` |
| Database scripts | `scripts/database/` | `migrate-all-databases.sh` |
| User guides | `docs/` (root) | `ROUTING_VISUAL_EDITOR_GUIDE.md` |
| API documentation | `docs/` (root) | `API_REFERENCE.md` |
| Architecture docs | `docs/` (root) | `SYSTEM_ARCHITECTURE.md` |

## Coding Standards

### TypeScript
- Use TypeScript strict mode
- Define explicit types for function parameters and return values
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes, types for unions/primitives

### React
- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused on a single responsibility
- Use TypeScript for prop types

#### Code Quality
- Run linters before committing: `npm run lint`
- Format code with Prettier: `npm run format`
- Ensure TypeScript compilation: `npm run typecheck`
- Write meaningful variable and function names

### Dependency Management

**CRITICAL RULE**: Always save dependencies to package.json

#### Adding New Dependencies

**Production Dependencies** (code that runs in production):
```bash
npm install --save <package-name>
```

**Development Dependencies** (build tools, testing, linting):
```bash
npm install --save-dev <package-name>
```

#### Rules

1. **Always use `--save` or `--save-dev`** - Never install without saving to package.json
2. **Choose the right category**:
   - `dependencies`: Runtime code (Express, Prisma, JWT, etc.)
   - `devDependencies`: Build/test tools (TypeScript, Jest, ESLint, etc.)
3. **Pin major versions**: Use `^X.Y.Z` to allow minor/patch updates
4. **Validate before committing**: Run `npm run validate:deps`

#### Automated Checks

- **Pre-commit hook**: Validates all imports have corresponding package.json entries
- **Dependabot**: Automatically creates PRs for dependency updates weekly
- **npm audit**: Security vulnerability scanning in CI/CD

#### Troubleshooting

**"Cannot find module" error:**
1. Check if package is in package.json
2. Run `npm install`
3. If missing, run `npm install --save <package>`

**Pre-commit hook failing:**
1. Run `npm run validate:deps` to see missing packages
2. Add them with `npm install --save` or `npm install --save-dev`
3. Commit again

For detailed dependency management guidelines, see `.claude/conventions/dependency-management.md`

## Testing Requirements

### Test Coverage
- Minimum 80% code coverage for new code
- Write unit tests for all business logic
- Write E2E tests for critical user workflows
- Update tests when modifying existing functionality

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Test File Organization
- Unit tests: Co-located with source files (`*.test.ts`)
- E2E tests: `src/tests/e2e/*.spec.ts`
- Test helpers: `src/tests/helpers/`

## Pull Request Process

### Before Submitting
1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `npm test && npm run test:e2e`
4. Update documentation as needed
5. Lint and format your code
6. Write a clear PR description

### PR Requirements
- [ ] All tests passing
- [ ] Code coverage maintained or improved
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No merge conflicts with `main`
- [ ] Files organized according to standards (nothing in root)

### PR Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] User guides updated
- [ ] Files organized properly (docs/ and scripts/)

## Screenshots (if applicable)

## Related Issues
Closes #<issue_number>
```

### Review Process
1. Submit PR with complete description
2. Address automated checks (CI/CD)
3. Respond to reviewer feedback
4. Obtain approval from at least one maintainer
5. Squash and merge when approved

## Definition of Done

A task is considered complete when:
- [ ] Code is written and follows standards
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Files are organized correctly (no clutter in root)
- [ ] Code is reviewed and approved
- [ ] CI/CD pipeline passes
- [ ] Changes are merged to main

## Questions or Problems?

- **Technical Issues**: Create a GitHub issue
- **Security Issues**: Email security@company.com
- **General Questions**: Ask in team chat or discussions

---

Thank you for contributing to make MES better!
