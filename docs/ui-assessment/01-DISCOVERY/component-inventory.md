# Frontend Component Inventory & Dependencies

## Overview

The MachShop MES frontend contains **153 component files** organized into **31 feature-based directories**. Built with React 18 + TypeScript, the application leverages modern libraries for complex manufacturing workflows including data visualization (D3), rich text editing (Lexical), and visual routing (ReactFlow).

## Frontend Technology Stack

### Core Framework & Build Tools
- **React**: 18.2.0 (latest stable)
- **TypeScript**: Full type safety throughout
- **Vite**: 4.x build tool (fast HMR, ES modules)
- **React Router DOM**: 6.20.1 (modern routing)

### UI Framework & Design System
- **Ant Design**: 5.12.8 (enterprise-grade components)
- **Ant Design Icons**: 5.2.6 (comprehensive icon set)
- **Custom Styling**: CSS-in-JS patterns

### State Management & Data Flow
- **Zustand**: 4.4.7 (lightweight state management)
- **React Hook Form**: 7.48.2 (performant forms)
- **React Query (TanStack)**: 5.14.2 (server state management)
- **Hookform Resolvers**: 3.3.2 (form validation)
- **Zod**: 3.22.4 (schema validation)

### Specialized Libraries for MES Workflows

#### Visual & Interactive Components
- **ReactFlow**: 11.11.4 (visual routing editor, process diagrams)
- **D3**: 7.9.0 (data visualization, traceability graphs)
- **Recharts**: 2.8.0 (dashboard charts, analytics)
- **React Konva**: 18.2.10 (2D canvas graphics)
- **React Signature Canvas**: 1.0.6 (electronic signatures)

#### Rich Content & Documents
- **Lexical**: 0.37.0 (Meta's rich text editor framework)
- **Monaco Editor**: 4.7.0 (VS Code editor for work instructions)
- **jsPDF**: 3.0.3 + jsPDF AutoTable 5.0.2 (PDF generation)
- **XLSX**: 0.18.5 (Excel file handling)

#### Manufacturing-Specific Features
- **React Table**: 7.8.0 (complex data grids)
- **React Window**: 1.8.8 (virtualization for large datasets)
- **React Virtualized Auto Sizer**: 1.0.20 (responsive virtualization)
- **DND Kit**: 6.3.1 + 10.0.0 (drag-and-drop for kitting, staging)

#### Real-time & Integration
- **Socket.io Client**: 4.7.4 (real-time notifications, collaboration)
- **Axios**: 1.12.2 (HTTP client for API integration)
- **Day.js**: 1.11.10 (date/time handling)
- **Lodash**: 4.17.21 (utility functions)
- **UUID**: 9.0.1 (unique identifiers)

### Testing Infrastructure
- **Vitest**: 1.0.4 (fast unit testing)
- **React Testing Library**: 14.1.2 (component testing)
- **User Event**: 14.5.1 (user interaction testing)
- **Jest DOM**: 6.1.5 (DOM testing utilities)
- **Coverage V8**: 1.0.4 (code coverage reporting)

## Component Directory Analysis (31 Directories)

### Production & Manufacturing (8 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **WorkOrders** | 8+ | Work order management | Execution, scheduling, status tracking |
| **Execution** | 6+ | Shop floor execution | Real-time operation tracking, data collection |
| **Routing** | 5+ | Process routing | Visual routing editor (ReactFlow) |
| **Operations** | 4+ | Manufacturing operations | Operation definitions, sequences |
| **Scheduling** | 3+ | Production scheduling | Capacity planning, resource allocation |
| **Parameters** | 2+ | Process parameters | Configuration, data collection templates |
| **TimeTracking** | 3+ | Labor time tracking | Shop floor time capture |
| **Staging** | 2+ | Material staging | Kit staging, work cell preparation |

### Quality Management (4 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **SPC** | 4+ | Statistical Process Control | Control charts, capability analysis |
| **FAI** | 3+ | First Article Inspection | AS9102 compliance, FAI reports |
| **Signatures** | 2+ | Electronic signatures | Digital approval workflows |
| **Torque** | 2+ | Torque management | Digital torque specifications |

### Materials & Traceability (4 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **Materials** | 5+ | Material management | Inventory, lot tracking |
| **Traceability** | 4+ | Material traceability | Genealogy graphs (D3), serial tracking |
| **Kits** | 3+ | Kit management | Kitting workflows, shortage resolution |
| **LLP** | 2+ | Life-Limited Parts | Back-to-birth traceability |

### User Interface & Experience (7 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **Layout** | 6+ | Application layout | MainLayout, headers, navigation |
| **Navigation** | 4+ | Navigation systems | Breadcrumbs, menus, routing |
| **Dashboard** | 5+ | Dashboard components | KPIs, metrics, charts (Recharts) |
| **Common** | 8+ | Shared UI components | Buttons, forms, utilities |
| **Search** | 3+ | Global search | Cross-module search functionality |
| **Site** | 2+ | Multi-site support | Site selection, configuration |
| **Auth** | 4+ | Authentication | Login, RBAC, protected routes |

### Content & Documentation (2 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **WorkInstructions** | 6+ | Digital work instructions | Rich text editor (Lexical), versioning |
| **BuildRecords** | 2+ | Electronic build records | AS9100 compliance documentation |

### System Administration (6 directories)
| Directory | Components | Purpose | Key Features |
|-----------|------------|---------|--------------|
| **Admin** | 7+ | System administration | User management, system config |
| **Personnel** | 3+ | Personnel management | Staff, certifications, skills |
| **Approvals** | 2+ | Approval workflows | Multi-level approvals |
| **Equipment** | 4+ | Equipment management | Maintenance, hierarchy |
| **ECO** | 2+ | Engineering Change Orders | Change management workflows |
| **Collaboration** | 3+ | Real-time collaboration | WebSocket-based features |

## Component Architecture Patterns

### Shared Component Library (`Common/`)
- **8+ reusable components** used across modules
- Form components, data display, utility functions
- Ant Design wrapper components for consistency
- Custom hooks and utilities

### Feature-Based Organization
- Each directory corresponds to a major MES capability
- Self-contained components with minimal cross-dependencies
- Clear separation of concerns

### Test Coverage Patterns
- **Testing co-location**: Most directories have `__tests__` subdirectories
- **React Testing Library**: Component behavior testing
- **Unit + Integration**: Both component and workflow testing

## Specialized Component Analysis

### Critical Complex Components

#### 1. ReactFlow Routing Editor (`Routing/`)
- **Purpose**: Visual process routing creation/editing
- **Complexity**: High (drag-and-drop, node management)
- **Dependencies**: ReactFlow 11.11.4, DND Kit
- **Assessment Priority**: High (critical for manufacturing engineering)

#### 2. D3 Traceability Visualization (`Traceability/`)
- **Purpose**: Material genealogy graphs, part traceability
- **Complexity**: High (custom D3 implementations)
- **Dependencies**: D3 7.9.0, custom graph algorithms
- **Assessment Priority**: High (regulatory compliance)

#### 3. Lexical Work Instructions Editor (`WorkInstructions/`)
- **Purpose**: Rich text work instruction authoring
- **Complexity**: Medium-High (plugins, formatting)
- **Dependencies**: Lexical 0.37.0 ecosystem
- **Assessment Priority**: Medium (content creation)

#### 4. Monaco Code Editor Integration
- **Purpose**: Advanced text editing (work instructions, scripts)
- **Complexity**: Medium (VS Code engine integration)
- **Dependencies**: Monaco Editor 4.7.0
- **Assessment Priority**: Medium (developer-like features)

#### 5. Real-time Collaboration (`Collaboration/`)
- **Purpose**: Multi-user editing, notifications
- **Complexity**: High (WebSocket synchronization)
- **Dependencies**: Socket.io Client 4.7.4
- **Assessment Priority**: High (concurrent operations)

## Component Dependencies & Integration Points

### API Integration Patterns
- **Axios HTTP Client**: All components use centralized API client
- **React Query**: Server state management and caching
- **Error Boundaries**: Component-level error handling

### State Management Patterns
- **Zustand Stores**: Feature-specific state (AuthStore, etc.)
- **Local Component State**: React hooks for UI state
- **Form State**: React Hook Form + Zod validation

### Cross-Component Communication
- **React Router**: Route-based navigation
- **Global Search**: Cross-module search integration
- **Site Context**: Multi-site data filtering
- **RBAC Integration**: Role-based component rendering

## Assessment Implications

### Strengths Identified ✅
- **Modern Stack**: React 18, TypeScript, latest libraries
- **Feature Organization**: Clear separation of concerns
- **Specialized Tools**: Purpose-built for manufacturing
- **Test Infrastructure**: Comprehensive testing setup
- **Enterprise UI**: Ant Design for consistency

### Assessment Focus Areas 🔍

#### High Priority (P0/P1)
1. **ReactFlow Routing Editor**: Complex visual component
2. **D3 Traceability Graphs**: Custom data visualization
3. **Real-time Collaboration**: WebSocket reliability
4. **Electronic Signatures**: Compliance-critical
5. **Work Order Execution**: Core production workflow

#### Medium Priority (P2)
1. **Lexical Rich Text Editor**: Content creation tools
2. **Monaco Code Editor**: Advanced editing features
3. **Dashboard Components**: KPI visualization
4. **Material Kitting**: Complex workflow orchestration

#### Low Priority (P3)
1. **Administrative Components**: Lower usage frequency
2. **Common Utilities**: Well-established patterns
3. **Basic Form Components**: Standard Ant Design usage

### Potential Issues to Investigate

#### Library Version Compatibility
- **Lexical 0.37.0**: Relatively new framework, stability assessment
- **ReactFlow 11.11.4**: Complex visual component, performance
- **D3 7.9.0**: Custom implementations, maintainability
- **Socket.io**: Real-time reliability, connection handling

#### Complex Component Testing
- **Visual Components**: ReactFlow, D3 may need specialized testing
- **Real-time Features**: WebSocket connections, race conditions
- **Rich Text Editing**: Content creation workflows
- **File Handling**: PDF generation, Excel export

#### Performance Considerations
- **Large Datasets**: React Window virtualization effectiveness
- **Complex Visualizations**: D3 rendering performance
- **Real-time Updates**: WebSocket message handling
- **Form Validation**: Zod schema performance

## Testing Strategy Implications

### Automated Testing Priorities
1. **Core Production Paths**: Work Orders, Execution, Quality
2. **Complex Interactions**: Drag-and-drop, visual editing
3. **Form Validation**: Zod schema testing
4. **API Integration**: Axios error handling

### Manual Testing Requirements
1. **Visual Components**: ReactFlow routing editor
2. **Rich Text Editing**: Lexical editor functionality
3. **Real-time Features**: Collaboration, notifications
4. **Cross-browser Compatibility**: Specialized libraries

### Accessibility Testing Focus
1. **Complex Visualizations**: D3 graphs, ReactFlow
2. **Rich Text Editors**: Lexical, Monaco accessibility
3. **Form Components**: React Hook Form + ARIA
4. **Data Tables**: Large dataset navigation

## Dependencies Risk Assessment

### High Risk Dependencies
- **Lexical**: Newer framework, evolving API
- **ReactFlow**: Complex library, potential performance issues
- **Socket.io**: Network reliability, error handling

### Medium Risk Dependencies
- **D3**: Custom implementations, maintenance burden
- **Monaco Editor**: Large bundle size, initialization complexity
- **React Konva**: Canvas rendering, browser compatibility

### Low Risk Dependencies
- **Ant Design**: Stable, well-maintained
- **React Router DOM**: Standard, mature
- **Zustand**: Simple, reliable state management

## Next Steps for Assessment

### Phase 2: Automated Testing Setup
1. Install accessibility testing dependencies (axe-core, pa11y)
2. Configure visual regression testing for complex components
3. Set up performance monitoring for specialized libraries

### Phase 3: Component-Specific Testing
1. **ReactFlow**: Visual editor functionality, accessibility
2. **D3 Visualizations**: Graph rendering, interaction testing
3. **Lexical Editor**: Rich text creation, formatting
4. **Real-time Features**: WebSocket connection reliability

### Phase 4: Integration Testing
1. Cross-component navigation flows
2. API integration error handling
3. State management consistency
4. Form validation completeness

---

**Assessment Date**: October 31, 2025
**Component Files**: 153 total files
**Component Directories**: 31 feature-based directories
**Testing Infrastructure**: Vitest + React Testing Library
**Specialized Libraries**: 12 manufacturing-specific integrations