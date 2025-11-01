/**
 * Validation Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateComponentContract,
  validateWidgetInSlot,
  validateManifestSchema,
  validateAntDesignUsage,
  type ComponentContract,
  type WidgetContract,
} from '../validation';

describe('Validation Module', () => {
  describe('validateComponentContract', () => {
    it('should pass when all required props are provided', () => {
      const contract: ComponentContract = {
        name: 'TestComponent',
        requiredProps: ['id', 'title'],
      };

      const component = {
        props: {
          id: '123',
          title: 'Test',
        },
      };

      const result = validateComponentContract(component, contract);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required props are missing', () => {
      const contract: ComponentContract = {
        name: 'TestComponent',
        requiredProps: ['id', 'title', 'description'],
      };

      const component = {
        props: {
          id: '123',
          title: 'Test',
          // missing 'description'
        },
      };

      const result = validateComponentContract(component, contract);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('description');
    });

    it('should warn about missing optional props', () => {
      const contract: ComponentContract = {
        name: 'TestComponent',
        requiredProps: ['id'],
        optionalProps: ['className', 'style'],
      };

      const component = {
        props: {
          id: '123',
          // missing optional props
        },
      };

      const result = validateComponentContract(component, contract);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateWidgetInSlot', () => {
    it('should pass valid widgets', () => {
      const slotContract: WidgetContract = {
        slotId: 'dashboard',
        maxWidth: 800,
        requiredPermissions: ['dashboard.view'],
      };

      const widget = {
        type: { name: 'DashboardWidget' },
        props: { width: 400 },
      };

      const userPermissions = ['dashboard.view', 'dashboard.edit'];

      const result = validateWidgetInSlot(widget, slotContract, userPermissions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when user lacks permissions', () => {
      const slotContract: WidgetContract = {
        slotId: 'admin',
        requiredPermissions: ['admin.access'],
      };

      const widget = { type: { name: 'AdminWidget' } };
      const userPermissions = ['user.view'];

      const result = validateWidgetInSlot(widget, slotContract, userPermissions);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should fail when widget exceeds max dimensions', () => {
      const slotContract: WidgetContract = {
        slotId: 'small-slot',
        maxWidth: 400,
        maxHeight: 300,
      };

      const widget = {
        type: { name: 'WideWidget' },
        props: { width: 600 },
      };

      const result = validateWidgetInSlot(widget, slotContract, []);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DIMENSION_EXCEEDED');
    });
  });

  describe('validateManifestSchema', () => {
    it('should pass valid manifest', () => {
      const manifest = {
        name: 'my-extension',
        version: '1.0.0',
        description: 'My extension',
      };

      const result = validateManifestSchema(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing required fields', () => {
      const manifest = {
        name: 'my-extension',
        // missing version and description
      };

      const result = validateManifestSchema(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid version format', () => {
      const manifest = {
        name: 'my-extension',
        version: '1.0', // Invalid: should be x.y.z
        description: 'Test',
      };

      const result = validateManifestSchema(manifest);

      expect(result.valid).toBe(false);
      const versionError = result.errors.find((e) => e.field === 'version');
      expect(versionError).toBeDefined();
    });

    it('should warn about missing optional metadata', () => {
      const manifest = {
        name: 'my-extension',
        version: '1.0.0',
        description: 'Test',
        // missing author and license
      };

      const result = validateManifestSchema(manifest);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateAntDesignUsage', () => {
    it('should pass code using Ant Design components', () => {
      const code = `
        import { Button, Form, Input } from '@machshop/frontend-extension-sdk';

        export function MyComponent() {
          return (
            <Form>
              <Form.Item>
                <Input placeholder="Enter text" />
              </Form.Item>
              <Button type="primary">Submit</Button>
            </Form>
          );
        }
      `;

      const result = validateAntDesignUsage(code);

      expect(result.errors).toHaveLength(0);
    });

    it('should warn about custom button styling', () => {
      const code = `
        <div className="custom-button">Click me</div>
      `;

      const result = validateAntDesignUsage(code);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about hardcoded styles', () => {
      const code = `
        <div style={{
          backgroundColor: '#1890ff',
          padding: '10px',
          marginTop: '20px'
        }}>
          Content
        </div>
      `;

      const result = validateAntDesignUsage(code);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
