/**
 * Documentation Generator Implementation (#489)
 * Comprehensive documentation and testing guides
 */

import {
  FormDocumentation,
  FormTemplate,
  TestScenario,
  TestDataSet,
  ComplianceChecklist,
  Example,
  APIDocumentation,
  CodeExample,
} from '../types';

export class DocumentationGenerator {
  public generateFormDocumentation(form: FormTemplate): FormDocumentation {
    return {
      formId: form.id,
      title: form.name,
      description: form.description,
      overview: this.generateOverview(form),
      userGuide: this.generateUserGuide(form),
      developerGuide: this.generateDeveloperGuide(form),
      adminGuide: this.generateAdminGuide(form),
      testScenarios: this.generateTestScenarios(form),
      testData: this.generateTestData(form),
    };
  }

  private generateOverview(form: FormTemplate): string {
    return `
# ${form.name}

## Form Overview

${form.description}

### Key Features
- Comprehensive form for ${form.category} operations
- Multi-site configuration support
- Full audit trail and data integrity
- WCAG 2.1 AA accessibility compliance

### Manufacturing Domain
Domain: ${form.manufacturingDomain}
Use Cases: ${form.useCases.join(', ')}

### Tags
${form.tags.map((t) => `- ${t}`).join('\n')}
    `.trim();
  }

  private generateUserGuide(form: FormTemplate) {
    return {
      quickStart: this.generateQuickStart(form),
      fieldDescriptions: this.generateFieldDescriptions(form),
      workflowInstructions: this.generateWorkflowInstructions(form),
      examples: this.generateExamples(form),
    };
  }

  private generateQuickStart(form: FormTemplate): string {
    return `
# Quick Start Guide

## Getting Started with ${form.name}

### Step 1: Access the Form
1. Navigate to the Forms menu
2. Select "${form.name}" from the available forms
3. Click "New" to create a new entry

### Step 2: Fill Required Fields
Complete all required fields marked with an asterisk (*):
- These fields must be completed before submission
- Help text is available by hovering over the field label

### Step 3: Review & Submit
1. Review all entered information
2. Click "Validate" to check for errors
3. Click "Submit" to save the form

### Step 4: Confirmation
- You will receive a confirmation message
- A unique form ID will be generated
- You can print or email the submission

## Common Tasks
- **Edit existing entry**: Click "Edit" on an existing form
- **View history**: Click "History" to see all modifications
- **Export data**: Click "Export" to download form data
    `.trim();
  }

  private generateFieldDescriptions(form: FormTemplate): Record<string, any> {
    const descriptions: Record<string, any> = {};

    for (const elem of form.canvasElements) {
      descriptions[elem.id] = {
        name: elem.name,
        type: elem.type,
        required: (elem.props as any).required || false,
        description: `Field for ${elem.name} in ${form.name}`,
        validationRules: [],
        examples: [],
      };
    }

    return descriptions;
  }

  private generateWorkflowInstructions(form: FormTemplate): string {
    return `
# Workflow Instructions

## Form Processing Workflow

### 1. Creation Phase
- Form is created and saved as draft
- Initial data validation is performed
- User can make edits before submission

### 2. Submission Phase
- Form is submitted and locked for editing
- Automatic workflow triggers may execute
- Notifications are sent to relevant users

### 3. Approval Phase (if required)
- Form may be routed for approval
- Approvers can review and approve
- Comments can be added during approval

### 4. Completion Phase
- Form is marked as complete
- Historical records are created
- Data is available for reporting

## Quality Gates
- All required fields must be completed
- Validation rules must be satisfied
- Required approvals must be obtained
- Audit trail must be complete
    `.trim();
  }

  private generateExamples(form: FormTemplate): Example[] {
    return [
      {
        name: `Basic ${form.name} Entry`,
        description: `Step-by-step guide to creating a basic ${form.name}`,
        steps: [
          'Access the form from the menu',
          'Fill in the header section with basic information',
          'Complete the details section with required data',
          'Review all entered information',
          'Click Submit to save the form',
        ],
        expectedResult: 'Form is successfully saved and a confirmation ID is generated',
      },
      {
        name: `Advanced ${form.name} with Workflow`,
        description: `Create a ${form.name} with workflow integration`,
        steps: [
          'Create a new ${form.name}',
          'Select workflow trigger from dropdown',
          'Configure workflow parameters',
          'Submit the form to trigger workflow',
        ],
        expectedResult: 'Form is submitted and workflow executes automatically',
      },
    ];
  }

  private generateDeveloperGuide(form: FormTemplate): any {
    return {
      architecture: this.generateArchitectureGuide(form),
      apiReference: this.generateAPIReference(form),
      codeExamples: this.generateCodeExamples(form),
      dataModel: this.generateDataModel(form),
    };
  }

  private generateArchitectureGuide(form: FormTemplate): string {
    return `
# Architecture Guide

## Form Architecture

### Component Structure
- **Canvas Editor**: Main form editing interface
- **Validation Engine**: Validates form data
- **State Management**: Manages form state with Zustand
- **API Service**: Handles backend communication

### Data Flow
1. User interacts with Canvas Editor
2. State is updated in FormStore
3. Validation is performed
4. Changes are sent to API Service
5. Backend processes and responds

### Multi-Site Support
- Forms inherit from global template
- Site-specific overrides are possible
- Version management ensures consistency
- Synchronization keeps all sites updated
    `.trim();
  }

  private generateAPIReference(form: FormTemplate): APIDocumentation[] {
    return [
      {
        method: 'POST',
        endpoint: `/api/forms/${form.id}/submit`,
        description: 'Submit form data',
        parameters: [
          { name: 'formId', type: 'string', required: true, description: 'Form ID' },
          { name: 'data', type: 'object', required: true, description: 'Form data' },
        ],
        requestBody: {
          example: { field1: 'value1', field2: 'value2' },
          schema: { type: 'object' },
        },
        responseBody: {
          example: { dataId: 'data_123', timestamp: 1234567890 },
          schema: { type: 'object' },
        },
        errorCodes: [
          { code: '400', description: 'Invalid form data' },
          { code: '401', description: 'Unauthorized' },
          { code: '500', description: 'Server error' },
        ],
      },
      {
        method: 'GET',
        endpoint: `/api/forms/${form.id}`,
        description: 'Get form configuration',
        parameters: [{ name: 'formId', type: 'string', required: true, description: 'Form ID' }],
        responseBody: {
          example: form,
          schema: { type: 'object' },
        },
        errorCodes: [
          { code: '404', description: 'Form not found' },
          { code: '401', description: 'Unauthorized' },
        ],
      },
    ];
  }

  private generateCodeExamples(form: FormTemplate): CodeExample[] {
    return [
      {
        language: 'typescript',
        title: 'Submit Form Data',
        description: 'Example of submitting form data to the API',
        code: `
const api = new FormAPIService();
const response = await api.submitFormData('${form.id}', {
  field1: 'value1',
  field2: 'value2'
});

if (response.success) {
  console.log('Form submitted:', response.data?.dataId);
} else {
  console.error('Error:', response.error?.message);
}
        `.trim(),
      },
      {
        language: 'typescript',
        title: 'Create Form from Template',
        description: 'Create a new form from a template',
        code: `
const templateManager = new TemplateManager();
const template = templateManager.getTemplate('${form.id}');

if (template) {
  const api = new FormAPIService();
  const response = await api.createForm(template);
  console.log('Form created:', response.data?.id);
}
        `.trim(),
      },
    ];
  }

  private generateDataModel(form: FormTemplate): any {
    return {
      entities: [
        {
          name: form.name,
          fields: form.canvasElements.map((e) => e.name),
          relationships: [],
        },
      ],
      diagram: 'Form → Fields → Data',
    };
  }

  private generateAdminGuide(form: FormTemplate): any {
    return {
      configuration: this.generateConfigurationGuide(form),
      permissions: this.generatePermissionsGuide(form),
      multiSiteSetup: this.generateMultiSiteGuide(form),
      troubleshooting: this.generateTroubleshootingGuide(form),
    };
  }

  private generateConfigurationGuide(form: FormTemplate): string {
    return `
# Configuration Guide

## Configuring ${form.name}

### Global Configuration
1. Navigate to Admin > Forms > ${form.name}
2. Update form properties
3. Configure validation rules
4. Set up workflow integration
5. Save and publish changes

### Site-Specific Configuration
1. Navigate to Admin > Multi-Site
2. Select site and form
3. Configure site-specific overrides
4. Set permissions for site users
5. Sync changes to site

### Field Configuration
- Add/remove fields from the form
- Configure field properties
- Set validation rules
- Define field dependencies
- Configure conditional visibility
    `.trim();
  }

  private generatePermissionsGuide(form: FormTemplate): any[] {
    return [
      {
        permission: 'form:view',
        description: 'View form and submitted data',
        roles: ['viewer', 'operator', 'supervisor', 'admin'],
      },
      {
        permission: 'form:submit',
        description: 'Submit form data',
        roles: ['operator', 'supervisor', 'admin'],
      },
      {
        permission: 'form:approve',
        description: 'Approve submitted forms',
        roles: ['supervisor', 'admin'],
      },
      {
        permission: 'form:configure',
        description: 'Configure form and fields',
        roles: ['admin'],
      },
    ];
  }

  private generateMultiSiteGuide(form: FormTemplate): string {
    return `
# Multi-Site Setup Guide

## Configuring ${form.name} for Multiple Sites

### Global Template
- Define global form structure
- Set standard fields and validation
- Configure default workflows

### Site Inheritance
- Sites inherit from global template
- Sites can override specific fields
- Custom validation can be added
- Site permissions control access

### Synchronization
- Global updates sync to all sites
- Site-specific changes are preserved
- Conflict resolution is available
- Version history is maintained

### Rollout Strategies
- Immediate: Deploy to all sites instantly
- Staged: Deploy to sites in phases
- Canary: Test with subset first
- Scheduled: Deploy at specific time
    `.trim();
  }

  private generateTroubleshootingGuide(form: FormTemplate): any[] {
    return [
      {
        issue: 'Form validation errors',
        symptoms: ['Form cannot be submitted', 'Error messages displayed'],
        causes: ['Required fields are empty', 'Invalid data format', 'Validation rule violations'],
        solutions: [
          'Review error messages carefully',
          'Complete all required fields',
          'Check data format matches field type',
          'Contact administrator if issue persists',
        ],
      },
      {
        issue: 'Sync failures',
        symptoms: ['Pending sync status', 'Sites not updated', 'Conflicts detected'],
        causes: ['Network connectivity issue', 'Site offline', 'Conflicting changes'],
        solutions: [
          'Check network connectivity',
          'Verify site is online',
          'Resolve conflicts manually',
          'Retry sync operation',
        ],
      },
    ];
  }

  public generateTestScenarios(form: FormTemplate): TestScenario[] {
    return [
      {
        id: 'form_001',
        name: 'Create basic form entry',
        description: `Test creating a basic ${form.name} entry`,
        category: 'functional',
        steps: [
          { step: 1, action: 'Access the form' },
          { step: 2, action: 'Fill all required fields' },
          { step: 3, action: 'Click Submit' },
        ],
        expectedResults: ['Form is submitted', 'Confirmation message is displayed'],
      },
      {
        id: 'form_002',
        name: 'Validate form requirements',
        description: 'Test form validation',
        category: 'functional',
        steps: [
          { step: 1, action: 'Leave required field empty' },
          { step: 2, action: 'Attempt to submit' },
        ],
        expectedResults: ['Validation error is shown', 'Form cannot be submitted'],
      },
      {
        id: 'form_003',
        name: 'Multi-site synchronization',
        description: 'Test form sync across sites',
        category: 'integration',
        steps: [
          { step: 1, action: 'Update global form' },
          { step: 2, action: 'Trigger sync' },
          { step: 3, action: 'Verify all sites receive update' },
        ],
        expectedResults: ['All sites are synchronized', 'No conflicts occur'],
      },
      {
        id: 'form_004',
        name: 'Accessibility compliance',
        description: 'Test WCAG 2.1 AA compliance',
        category: 'accessibility',
        steps: [
          { step: 1, action: 'Test keyboard navigation' },
          { step: 2, action: 'Test screen reader compatibility' },
          { step: 3, action: 'Test color contrast' },
        ],
        expectedResults: ['All elements are keyboard accessible', 'Screen reader works correctly'],
      },
    ];
  }

  public generateTestData(form: FormTemplate): Record<string, TestDataSet> {
    return {
      basic: {
        name: 'Basic test data',
        description: 'Minimal valid data for basic testing',
        data: [
          {
            field1: 'Test Value 1',
            field2: 'Test Value 2',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      comprehensive: {
        name: 'Comprehensive test data',
        description: 'Complete dataset with all fields',
        data: form.canvasElements.reduce(
          (acc, elem) => {
            return [
              {
                ...acc[0],
                [elem.id]: `Test Value for ${elem.name}`,
              },
            ];
          },
          [{}]
        ),
      },
      edge_cases: {
        name: 'Edge case data',
        description: 'Data that tests boundary conditions',
        data: [
          {
            // Empty values
            field1: '',
            field2: null,
          },
          {
            // Maximum values
            field1: 'A'.repeat(1000),
            field2: Number.MAX_SAFE_INTEGER,
          },
        ],
      },
    };
  }

  public generateComplianceChecklist(form: FormTemplate): ComplianceChecklist {
    return {
      wcag2_1_aa: true,
      fda_21_cfr_part_11: form.manufacturingDomain === 'Quality',
      iso_9001_2015: form.manufacturingDomain === 'Quality',
      iec_61508_2010: form.manufacturingDomain === 'Equipment',
      dataPrivacy: true,
      accessControl: true,
      auditTrail: true,
    };
  }
}
