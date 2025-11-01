/**
 * Core to Extension Migration Types
 * Defines interfaces for analyzing, classifying, and migrating core services to extensions
 */

/**
 * Service Classification
 * Classifies whether a service should remain core or be migrated to extension
 */
export interface ServiceClassification {
  serviceId: string;
  serviceName: string;
  filePath: string;
  classification: 'core' | 'extension' | 'hybrid';
  reasoning: string;
  confidence: number; // 0-100
  category: 'business_logic' | 'integration' | 'utility' | 'infrastructure' | 'custom';
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  dependents: string[];
  estimatedEffort: number; // Story points
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
  technicalDebt: string[];
}

/**
 * Service Dependency Information
 */
export interface ServiceDependency {
  source: string;
  target: string;
  type: 'direct' | 'indirect' | 'circular';
  weight: number; // Importance/coupling strength
  canRemove: boolean; // Can this dependency be removed
  breakingChange: boolean; // Breaking if removed
}

/**
 * Dependency Graph for Services
 */
export interface DependencyGraph {
  services: Map<string, ServiceInfo>;
  dependencies: ServiceDependency[];
  circularDependencies: string[][];
  orphanedServices: string[];
  rootServices: string[]; // Entry point services
}

/**
 * Detailed Service Information
 */
export interface ServiceInfo {
  id: string;
  name: string;
  filePath: string;
  description?: string;
  exports: string[];
  imports: string[];
  methods: ServiceMethod[];
  properties: ServiceProperty[];
  interfaces: ServiceInterface[];
  testCoverage: number;
  linesOfCode: number;
  complexity: number; // Cyclomatic complexity
  lastModified: Date;
  maintainer?: string;
}

/**
 * Service Method Information
 */
export interface ServiceMethod {
  name: string;
  signature: string;
  isPublic: boolean;
  parameters: MethodParameter[];
  returnType: string;
  dependencies: string[];
  testCoverage: number;
}

/**
 * Method Parameter
 */
export interface MethodParameter {
  name: string;
  type: string;
  optional: boolean;
  default?: unknown;
}

/**
 * Service Property
 */
export interface ServiceProperty {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  readonly: boolean;
}

/**
 * Service Interface
 */
export interface ServiceInterface {
  name: string;
  methods: string[];
  properties: string[];
}

/**
 * Migration Plan for a Service
 */
export interface ServiceMigrationPlan {
  serviceId: string;
  serviceName: string;
  targetPhase: number;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  estimatedEffort: number;
  estimatedRisk: 'low' | 'medium' | 'high' | 'critical';
  prerequisites: string[];
  blockedBy: string[];
  parallelizable: string[];
  migrationSteps: MigrationStep[];
  rollbackStrategy: RollbackStrategy;
  testingStrategy: TestingStrategy;
  deploymentStrategy: DeploymentStrategy;
  estimatedDuration: number; // Days
  estimatedCost: number; // Man-hours
}

/**
 * Single Migration Step
 */
export interface MigrationStep {
  sequence: number;
  name: string;
  description: string;
  action: 'extract' | 'wrap' | 'refactor' | 'test' | 'validate' | 'deploy' | 'monitor';
  estimatedDuration: number; // Hours
  successCriteria: string[];
  rollbackProcedure?: string;
}

/**
 * Rollback Strategy
 */
export interface RollbackStrategy {
  automated: boolean;
  triggers: RollbackTrigger[];
  procedure: string;
  estimatedTime: number; // Minutes
}

/**
 * Rollback Trigger
 */
export interface RollbackTrigger {
  condition: 'error_rate' | 'latency' | 'failure_count' | 'manual' | 'health_check';
  threshold: number;
  window: number; // Time window in seconds
}

/**
 * Testing Strategy for Migration
 */
export interface TestingStrategy {
  unitTestsGenerated: boolean;
  integrationTestsRequired: boolean;
  e2eTestsRequired: boolean;
  regressionTestsRequired: boolean;
  performanceTestsRequired: boolean;
  securityTestsRequired: boolean;
  testDataRequired: boolean;
  estimatedTestCoverage: number;
}

/**
 * Deployment Strategy
 */
export interface DeploymentStrategy {
  strategy: 'blue_green' | 'canary' | 'rolling' | 'immediate';
  stages: DeploymentStage[];
  healthChecks: HealthCheck[];
  monitoringPeriod: number; // Hours
}

/**
 * Deployment Stage
 */
export interface DeploymentStage {
  name: string;
  percentRollout: number;
  duration: number; // Hours
  targetEnvironment: string;
  successCriteria: string[];
}

/**
 * Health Check Definition
 */
export interface HealthCheck {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  expectedStatus: number;
  timeout: number; // Seconds
  interval: number; // Seconds
  failureThreshold: number;
}

/**
 * Impact Analysis Result
 */
export interface ImpactAnalysis {
  service: string;
  affectedServices: string[];
  affectedEndpoints: string[];
  affectedDatabases: string[];
  affectedIntegrations: string[];
  dataMigrationRequired: boolean;
  schemaMigrationRequired: boolean;
  dataLossRisk: boolean;
  performanceImpact: 'positive' | 'neutral' | 'negative';
  securityImpact: 'positive' | 'neutral' | 'negative';
  estimatedDowntime: number; // Minutes
  rollbackComplexity: 'low' | 'medium' | 'high';
  risks: RiskAssessment[];
  mitigations: string[];
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  owner?: string;
}

/**
 * Extension Wrapper for Migrated Service
 */
export interface ExtensionServiceWrapper {
  serviceId: string;
  extensionId: string;
  originalService: string;
  wrapperVersion: string;
  exposedMethods: string[];
  hiddenMethods: string[];
  hooks: HookDefinition[];
  interceptors: InterceptorDefinition[];
  compatibility: CompatibilityInfo;
}

/**
 * Hook Definition
 */
export interface HookDefinition {
  hookName: string;
  triggerEvent: string;
  handlerSignature: string;
  priority: number;
  async: boolean;
}

/**
 * Interceptor Definition
 */
export interface InterceptorDefinition {
  name: string;
  method: string;
  before?: boolean;
  after?: boolean;
  errorHandler?: boolean;
}

/**
 * Compatibility Information
 */
export interface CompatibilityInfo {
  originalVersion: string;
  wrapperVersion: string;
  backwardCompatible: boolean;
  apiChanges: ApiChange[];
  deprecatedMethods: string[];
  newMethods: string[];
}

/**
 * API Change
 */
export interface ApiChange {
  method: string;
  changeType: 'signature' | 'behavior' | 'performance' | 'removal';
  description: string;
  migrationPath?: string;
}

/**
 * Migration Report
 */
export interface MigrationReport {
  generatedAt: Date;
  totalServices: number;
  coreServices: number;
  extensionServices: number;
  hybridServices: number;
  unclassified: number;
  totalPhases: number;
  totalEstimatedEffort: number; // Story points
  totalEstimatedRisk: number; // 0-100
  criticalRisks: RiskAssessment[];
  migrationPlans: ServiceMigrationPlan[];
  timeline: MigrationTimeline;
  recommendations: string[];
}

/**
 * Migration Timeline
 */
export interface MigrationTimeline {
  startDate: Date;
  endDate: Date;
  phases: MigrationPhase[];
  milestones: Milestone[];
}

/**
 * Migration Phase
 */
export interface MigrationPhase {
  phaseNumber: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  services: string[];
  estimatedEffort: number;
  deliverables: string[];
}

/**
 * Milestone
 */
export interface Milestone {
  date: Date;
  name: string;
  description: string;
  successCriteria: string[];
}

/**
 * Automated Test Generation Request
 */
export interface TestGenerationRequest {
  service: string;
  methods: string[];
  testType: 'unit' | 'integration' | 'e2e';
  includeEdgeCases: boolean;
  includeErrorScenarios: boolean;
  targetCoverage: number; // Percentage
}

/**
 * Generated Test Suite
 */
export interface GeneratedTestSuite {
  service: string;
  tests: GeneratedTest[];
  coverage: number;
  estimatedRunTime: number; // Milliseconds
}

/**
 * Generated Test
 */
export interface GeneratedTest {
  name: string;
  testType: 'unit' | 'integration' | 'e2e';
  method: string;
  inputs: TestInput[];
  expectedOutput: unknown;
  assertions: string[];
  setup?: string;
  teardown?: string;
}

/**
 * Test Input
 */
export interface TestInput {
  paramName: string;
  paramType: string;
  value: unknown;
  isEdgeCase: boolean;
}

/**
 * Core Extension Migration Error
 */
export class MigrationError extends Error {
  constructor(
    public code: string,
    public service: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`Migration error [${code}] for service ${service}`);
    this.name = 'MigrationError';
  }
}
