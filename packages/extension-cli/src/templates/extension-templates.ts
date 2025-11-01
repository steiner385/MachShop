/**
 * Extension Template Code Generation
 */

export interface ExtensionTemplateOptions {
  typescript?: boolean;
  extensionName?: string;
}

export function getExtensionTemplate(
  type: string,
  options: ExtensionTemplateOptions = {}
): string {
  const { typescript, extensionName } = options;
  const ts = typescript ? '.ts' : '.js';

  switch (type) {
    case 'ui-component':
      return getUiComponentTemplate(typescript, extensionName);
    case 'business-logic':
      return getBusinessLogicTemplate(typescript, extensionName);
    case 'data-model':
      return getDataModelTemplate(typescript, extensionName);
    case 'integration':
      return getIntegrationTemplate(typescript, extensionName);
    case 'compliance':
      return getComplianceTemplate(typescript, extensionName);
    case 'infrastructure':
      return getInfrastructureTemplate(typescript, extensionName);
    default:
      return getDefaultTemplate(typescript);
  }
}

function getUiComponentTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'UIComponent'} Extension
 *
 * React component extension for MachShop
 */

import React, { useState } from 'react';

export interface Props {
  title?: string;
  onAction?: (action: string) => void;
}

export const Component: React.FC<Props> = ({ title, onAction }) => {
  const [count, setCount] = useState(0);

  return (
    <div className="extension-component">
      <h2>{title || 'Extension Component'}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default Component;
`;
  } else {
    return `
/**
 * ${name || 'UIComponent'} Extension
 */

import React, { useState } from 'react';

export const Component = ({ title, onAction }) => {
  const [count, setCount] = useState(0);

  return (
    <div className="extension-component">
      <h2>{title || 'Extension Component'}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default Component;
`;
  }
}

function getBusinessLogicTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'BusinessLogic'} Extension
 */

export interface Context {
  userId: string;
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function execute(
  context: Context
): Promise<ExecutionResult> {
  try {
    // Your business logic here
    console.log('Executing with context:', context);

    return {
      success: true,
      data: { message: 'Execution successful' },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export function validate(input: unknown): boolean {
  // Validate input before execution
  return typeof input === 'object' && input !== null;
}
`;
  } else {
    return `
/**
 * ${name || 'BusinessLogic'} Extension
 */

export async function execute(context) {
  try {
    console.log('Executing with context:', context);
    return {
      success: true,
      data: { message: 'Execution successful' },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export function validate(input) {
  return typeof input === 'object' && input !== null;
}
`;
  }
}

function getDataModelTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'DataModel'} Extension
 */

export interface Model {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Repository {
  async create(data: Partial<Model>): Promise<Model> {
    // Implement create logic
    throw new Error('Not implemented');
  }

  async read(id: string): Promise<Model | null> {
    // Implement read logic
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<Model>): Promise<Model> {
    // Implement update logic
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // Implement delete logic
    throw new Error('Not implemented');
  }
}
`;
  } else {
    return `
/**
 * ${name || 'DataModel'} Extension
 */

export class Repository {
  async create(data) {
    throw new Error('Not implemented');
  }

  async read(id) {
    throw new Error('Not implemented');
  }

  async update(id, data) {
    throw new Error('Not implemented');
  }

  async delete(id) {
    throw new Error('Not implemented');
  }
}
`;
  }
}

function getIntegrationTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'Integration'} Extension
 */

export interface IntegrationConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export class Adapter {
  constructor(private config: IntegrationConfig) {}

  async sync(): Promise<void> {
    // Implement sync logic
  }

  async transform(data: unknown): Promise<unknown> {
    // Implement transformation logic
    return data;
  }

  async validate(data: unknown): Promise<boolean> {
    // Implement validation logic
    return true;
  }
}
`;
  } else {
    return `
/**
 * ${name || 'Integration'} Extension
 */

export class Adapter {
  constructor(config) {
    this.config = config;
  }

  async sync() {
    // Implement sync logic
  }

  async transform(data) {
    return data;
  }

  async validate(data) {
    return true;
  }
}
`;
  }
}

function getComplianceTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'Compliance'} Extension
 */

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  compliant: boolean;
  violations: Array<{ rule: string; message: string }>;
}

export async function validate(data: unknown): Promise<ValidationResult> {
  // Implement compliance validation
  return {
    compliant: true,
    violations: [],
  };
}
`;
  } else {
    return `
/**
 * ${name || 'Compliance'} Extension
 */

export async function validate(data) {
  return {
    compliant: true,
    violations: [],
  };
}
`;
  }
}

function getInfrastructureTemplate(typescript: boolean, name?: string): string {
  if (typescript) {
    return `
/**
 * ${name || 'Infrastructure'} Extension
 */

export interface ServiceConfig {
  name: string;
  version: string;
  port?: number;
}

export class Service {
  constructor(private config: ServiceConfig) {}

  async initialize(): Promise<void> {
    console.log('Initializing service:', this.config.name);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down service:', this.config.name);
  }

  async health(): Promise<boolean> {
    return true;
  }
}
`;
  } else {
    return `
/**
 * ${name || 'Infrastructure'} Extension
 */

export class Service {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    console.log('Initializing service:', this.config.name);
  }

  async shutdown() {
    console.log('Shutting down service:', this.config.name);
  }

  async health() {
    return true;
  }
}
`;
  }
}

function getDefaultTemplate(typescript: boolean): string {
  if (typescript) {
    return `
/**
 * Extension Entry Point
 */

export function initialize(): void {
  console.log('Extension initialized');
}

export function shutdown(): void {
  console.log('Extension shutdown');
}
`;
  } else {
    return `
/**
 * Extension Entry Point
 */

export function initialize() {
  console.log('Extension initialized');
}

export function shutdown() {
  console.log('Extension shutdown');
}
`;
  }
}
