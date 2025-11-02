/**
 * AI Services Type Definitions (Issue #400)
 * Natural language processing, machine learning, and AI assistant capabilities
 */

// ========== AI Configuration ==========

export interface AIServiceConfig {
  apiKey: string;
  model: string; // 'claude-3-opus', 'claude-3-sonnet', etc.
  maxTokens: number;
  temperature: number;
  topP: number;
  systemPrompt: string;
  safetyLevel: 'strict' | 'balanced' | 'permissive';
  auditLogging: boolean;
  dataPrivacy: 'local' | 'cloud' | 'hybrid';
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  template: string;
  examples: Example[];
  category: PromptCategory;
  createdAt: Date;
  updatedAt: Date;
  performanceMetrics?: {
    avgLatency: number;
    successRate: number;
    userSatisfaction: number;
  };
}

export type PromptCategory =
  | 'workflow-generation'
  | 'form-generation'
  | 'rule-generation'
  | 'data-mapping'
  | 'documentation'
  | 'code-review'
  | 'conflict-detection'
  | 'chatbot'
  | 'recommendations';

export interface Example {
  input: string;
  output: string;
  context?: Record<string, unknown>;
}

// ========== AI Agent Service ==========

export interface AIAgentRequest<T = unknown> {
  requestId: string;
  timestamp: Date;
  userId: string;
  tenantId: string;
  category: PromptCategory;
  query: string;
  context: AIContext;
  constraints?: AIConstraints;
  metadata?: Record<string, unknown>;
  payload?: T;
}

export interface AIAgentResponse<T = unknown> {
  requestId: string;
  success: boolean;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: T;
  error?: AIError;
  confidence?: number; // 0-1 confidence score
  explanation?: string;
  alternatives?: T[];
  auditTrail?: AuditEntry[];
}

export interface AIContext {
  workflowDefinitions?: Record<string, unknown>[];
  existingForms?: Record<string, unknown>[];
  existingRules?: Record<string, unknown>[];
  dataModels?: DataModel[];
  deployedExtensions?: string[];
  governanceRules?: GovernanceRule[];
  userPreferences?: UserPreferences;
  recentActions?: string[];
}

export interface AIConstraints {
  maxComplexity?: number;
  requiredCompliance?: string[];
  forbiddenPatterns?: string[];
  performanceTargets?: {
    maxLatency?: number;
    minThroughput?: number;
  };
  resourceLimits?: {
    maxMemory?: number;
    maxConnections?: number;
  };
}

export interface AIError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  retryable: boolean;
  context?: Record<string, unknown>;
}

export interface DataModel {
  id: string;
  name: string;
  description: string;
  fields: DataField[];
  relationships?: DataRelationship[];
  constraints?: ModelConstraint[];
}

export interface DataField {
  id: string;
  name: string;
  type: DataFieldType;
  description?: string;
  required: boolean;
  unique?: boolean;
  validation?: FieldValidation;
}

export type DataFieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'decimal'
  | 'enum'
  | 'json'
  | 'array'
  | 'reference';

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  allowedValues?: unknown[];
  customValidator?: string;
}

export interface DataRelationship {
  source: string;
  target: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cardinality: string;
}

export interface ModelConstraint {
  type: string;
  description: string;
  expression: string;
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  type: 'compliance' | 'safety' | 'performance' | 'security';
  expression: string;
  enforced: boolean;
  severity: 'warning' | 'error';
}

export interface UserPreferences {
  language: string;
  assistanceLevel: 'basic' | 'intermediate' | 'advanced';
  autoApprove: boolean;
  preferredStyle?: string;
  customRules?: Record<string, unknown>;
}

// ========== Workflow Generation ==========

export interface WorkflowGenerationRequest extends AIAgentRequest {
  description: string;
  targetDomain?: string;
  parallelizationHint?: boolean;
  errorHandling?: 'strict' | 'tolerant' | 'adaptive';
}

export interface GeneratedWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    confidence: number;
    reasoning: string;
    alternatives?: GeneratedWorkflow[];
  };
  validation: ValidationResult;
  complianceCheck: ComplianceCheckResult;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  inputs?: string[];
  outputs?: string[];
}

export type NodeType =
  | 'trigger'
  | 'decision'
  | 'action'
  | 'parallel'
  | 'loop'
  | 'condition'
  | 'notification'
  | 'integration'
  | 'end';

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  data?: Record<string, unknown>;
}

// ========== Form Generation ==========

export interface FormGenerationRequest extends AIAgentRequest {
  dataModel?: DataModel;
  existingData?: unknown[];
  usagePatterns?: string[];
  targetDevices?: ('desktop' | 'tablet' | 'mobile')[];
  accessibility?: AccessibilityRequirements;
}

export interface GeneratedForm {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  validationConfig: FormValidationConfig[];
  layout: FormLayoutConfig;
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    confidence: number;
    suggestedImprovements: string[];
  };
  validationResult: ValidationResult;
  accessibilityScore: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  visible?: string; // Visibility condition
}

export interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  validation?: FieldValidationRule[];
  options?: SelectOption[];
  defaultValue?: unknown;
  helpText?: string;
  conditional?: ConditionalField;
}

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'file'
  | 'currency'
  | 'percentage'
  | 'custom';

export interface FieldValidationRule {
  type: ValidationType;
  message: string;
  params?: Record<string, unknown>;
}

export type ValidationType =
  | 'required'
  | 'email'
  | 'phone'
  | 'url'
  | 'pattern'
  | 'minLength'
  | 'maxLength'
  | 'minValue'
  | 'maxValue'
  | 'custom';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface ConditionalField {
  dependsOn: string;
  condition: string;
  visibility: 'show' | 'hide' | 'disable';
}

export interface FormLayoutConfig {
  columns: number;
  spacing: number;
  alignment: 'left' | 'center' | 'right';
  responsive: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface FormValidationConfig {
  level: 'field' | 'section' | 'form';
  trigger: 'onBlur' | 'onChange' | 'onSubmit';
  async?: boolean;
}

export interface AccessibilityRequirements {
  wcagLevel: 'A' | 'AA' | 'AAA';
  keyboardNavigation: boolean;
  screenReaderOptimized: boolean;
  colorContrast: boolean;
  focusIndicators: boolean;
  labels: boolean;
}

// ========== Rule Generation ==========

export interface RuleGenerationRequest extends AIAgentRequest {
  description: string;
  triggerType?: TriggerType;
  targetDomain?: string;
  frequency?: 'realtime' | 'periodic' | 'event-driven';
}

export interface GeneratedRule {
  id: string;
  name: string;
  description: string;
  triggers: RuleTrigger[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    confidence: number;
    alternatives?: GeneratedRule[];
  };
  validation: ValidationResult;
  performanceAnalysis: PerformanceAnalysis;
}

export type TriggerType =
  | 'data-change'
  | 'threshold'
  | 'schedule'
  | 'manual'
  | 'workflow-event'
  | 'external-event'
  | 'duration'
  | 'state-change';

export interface RuleTrigger {
  id: string;
  type: TriggerType;
  source: string;
  condition?: string;
  parameters?: Record<string, unknown>;
}

export interface RuleCondition {
  id: string;
  expression: string;
  operator: 'and' | 'or';
  negated?: boolean;
  timeout?: number;
}

export interface RuleAction {
  id: string;
  type: ActionType;
  target: string;
  parameters?: Record<string, unknown>;
  async?: boolean;
  retry?: RetryPolicy;
}

export type ActionType =
  | 'notify'
  | 'alert'
  | 'update'
  | 'create'
  | 'delete'
  | 'execute'
  | 'escalate'
  | 'block'
  | 'approve'
  | 'transform';

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
}

export interface PerformanceAnalysis {
  estimatedLatency: number;
  complexity: 'low' | 'medium' | 'high';
  resourceIntensity: number;
  optimizationSuggestions: string[];
}

// ========== Data Integration & Mapping ==========

export interface DataMappingRequest extends AIAgentRequest {
  sourceSchema: DataModel;
  targetSchema: DataModel;
  existingMappings?: FieldMapping[];
  sampleData?: unknown[];
}

export interface GeneratedDataMapping {
  mappings: FieldMapping[];
  transformations: Transformation[];
  validations: MappingValidation[];
  metadata: {
    confidence: number;
    warnings: string[];
    suggestions: string[];
  };
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformationType?: string;
  conditional?: boolean;
  bidirectional?: boolean;
}

export interface Transformation {
  id: string;
  sourceField: string;
  targetField: string;
  function: string;
  parameters?: Record<string, unknown>;
}

export interface MappingValidation {
  type: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

// ========== AI Chatbot & Assistance ==========

export interface ChatbotRequest extends AIAgentRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  intent?: string;
  entities?: EntityExtraction[];
}

export interface ChatbotResponse extends AIAgentResponse {
  message: string;
  intent: string;
  entities: EntityExtraction[];
  suggestedActions?: SuggestedAction[];
  followUpQuestions?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface EntityExtraction {
  type: string;
  value: string;
  confidence: number;
  span: { start: number; end: number };
}

export interface SuggestedAction {
  action: string;
  description: string;
  confidence: number;
  command?: Record<string, unknown>;
}

// ========== Validation & Safety ==========

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score: number; // 0-100
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  fix?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion: string;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  standards: ComplianceCheckDetail[];
  violations: Violation[];
  recommendations: string[];
}

export interface ComplianceCheckDetail {
  standard: string; // 'FDA', 'WCAG', 'ISO9001', 'IEC61508', 'AS9100'
  status: 'compliant' | 'partial' | 'non-compliant';
  details: string[];
}

export interface Violation {
  code: string;
  standard: string;
  severity: 'low' | 'high' | 'critical';
  description: string;
  remediation: string;
}

// ========== Audit & Tracking ==========

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  tenantId: string;
  operation: string;
  operationType: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject';
  resourceType: string;
  resourceId: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  status: 'success' | 'failure';
  error?: string;
}

export interface CostTracking {
  timestamp: Date;
  requestId: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  userId: string;
  tenantId: string;
}

// ========== Recommendations & Anomaly Detection ==========

export interface RecommendationRequest extends AIAgentRequest {
  type: RecommendationType;
  targetElement: string;
  analysisScope?: 'local' | 'global' | 'industry';
}

export type RecommendationType =
  | 'optimization'
  | 'best-practice'
  | 'security'
  | 'performance'
  | 'compliance'
  | 'cost-reduction'
  | 'risk-mitigation';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementationSteps: string[];
  confidence: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: string;
  riskScore: number;
  recommendations: Recommendation[];
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  affectedElements: string[];
  suggestedAction: string;
}

export type AnomalyType =
  | 'unusual-pattern'
  | 'performance-degradation'
  | 'security-risk'
  | 'data-quality-issue'
  | 'compliance-drift'
  | 'resource-constraint';
