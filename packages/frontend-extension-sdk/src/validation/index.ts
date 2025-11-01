/**
 * Validation Module
 *
 * Provides contract validation, widget slot validation, and compliance checking.
 * Ensures extensions adhere to SDK contracts and design system requirements.
 */

import type React from 'react';

export interface ComponentContract {
  name: string;
  requiredProps: string[];
  optionalProps?: string[];
  requiredPermissions?: string[];
  allowedComponents?: string[];
  designTokensRequired?: boolean;
}

export interface WidgetContract {
  slotId: string;
  maxWidth?: number;
  maxHeight?: number;
  requiredPermissions?: string[];
  allowedComponentTypes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

/**
 * Validate component against contract
 */
export function validateComponentContract(
  component: any,
  contract: ComponentContract
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required props
  contract.requiredProps.forEach((prop) => {
    if (!(prop in component.props)) {
      errors.push({
        field: prop,
        message: `Required prop '${prop}' is missing`,
        code: 'MISSING_REQUIRED_PROP',
      });
    }
  });

  // Check optional props for best practices
  if (contract.optionalProps) {
    contract.optionalProps.forEach((prop) => {
      if (prop in component.props) {
        // Prop is provided, which is good
      }
    });
  }

  // Check for recommended props that are missing
  const recommendedProps = contract.optionalProps || [];
  const providedProps = Object.keys(component.props);
  const missingRecommended = recommendedProps.filter((p) => !providedProps.includes(p));

  if (missingRecommended.length > 0) {
    warnings.push({
      field: 'optional_props',
      message: `Missing recommended props: ${missingRecommended.join(', ')}`,
      suggestion: `Consider providing these props for better functionality: ${missingRecommended.join(', ')}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate widget in slot
 */
export function validateWidgetInSlot(
  widget: any,
  slotContract: WidgetContract,
  userPermissions: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check permissions
  if (slotContract.requiredPermissions) {
    const hasPermission = slotContract.requiredPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      errors.push({
        field: 'permissions',
        message: `User does not have required permissions for this slot`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
  }

  // Check dimensions if specified
  if (slotContract.maxWidth && widget.props?.width > slotContract.maxWidth) {
    errors.push({
      field: 'width',
      message: `Widget width exceeds maximum allowed (${widget.props.width}px > ${slotContract.maxWidth}px)`,
      code: 'DIMENSION_EXCEEDED',
    });
  }

  if (slotContract.maxHeight && widget.props?.height > slotContract.maxHeight) {
    errors.push({
      field: 'height',
      message: `Widget height exceeds maximum allowed (${widget.props.height}px > ${slotContract.maxHeight}px)`,
      code: 'DIMENSION_EXCEEDED',
    });
  }

  // Check allowed component types
  if (slotContract.allowedComponentTypes) {
    const componentType = widget.type?.name || 'Unknown';
    if (!slotContract.allowedComponentTypes.includes(componentType)) {
      warnings.push({
        field: 'component_type',
        message: `Component type '${componentType}' not in allowed list`,
        suggestion: `Use one of these component types: ${slotContract.allowedComponentTypes.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a component contract validator
 */
export function createComponentValidator(contract: ComponentContract) {
  return (component: any): ValidationResult => {
    return validateComponentContract(component, contract);
  };
}

/**
 * Create a widget validator
 */
export function createWidgetValidator(slotContract: WidgetContract) {
  return (widget: any, userPermissions: string[]): ValidationResult => {
    return validateWidgetInSlot(widget, slotContract, userPermissions);
  };
}

/**
 * Validate manifest schema
 */
export function validateManifestSchema(manifest: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required manifest fields
  const requiredFields = ['name', 'version', 'description'];
  requiredFields.forEach((field) => {
    if (!manifest[field]) {
      errors.push({
        field,
        message: `Required manifest field '${field}' is missing`,
        code: 'MISSING_MANIFEST_FIELD',
      });
    }
  });

  // Check version format
  if (manifest.version && !manifest.version.match(/^\d+\.\d+\.\d+/)) {
    errors.push({
      field: 'version',
      message: `Version must follow semantic versioning (e.g., 1.0.0)`,
      code: 'INVALID_VERSION_FORMAT',
    });
  }

  // Check for recommended fields
  if (!manifest.author) {
    warnings.push({
      field: 'author',
      message: `Author information is missing`,
      suggestion: `Add author field to manifest for better extension metadata`,
    });
  }

  if (!manifest.license) {
    warnings.push({
      field: 'license',
      message: `License information is missing`,
      suggestion: `Specify a license (e.g., MIT, Apache-2.0) for your extension`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Ant Design component usage
 */
export function validateAntDesignUsage(componentCode: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for non-Ant Design components
  const problematicPatterns = [
    { pattern: /<div className="[^"]*button/i, message: 'Use Button component instead of div with button styling' },
    {
      pattern: /<div className="[^"]*modal/i,
      message: 'Use Modal component instead of div with modal styling',
    },
    { pattern: /<div className="[^"]*form/i, message: 'Use Form component instead of div with form styling' },
  ];

  problematicPatterns.forEach((rule) => {
    if (rule.pattern.test(componentCode)) {
      warnings.push({
        field: 'antd_usage',
        message: rule.message,
        suggestion: 'Import and use the corresponding Ant Design component instead',
      });
    }
  });

  // Check for hardcoded styling that could use theme tokens
  if (componentCode.includes('style={{') && /backgroundColor|color|padding|margin|fontSize/.test(componentCode)) {
    warnings.push({
      field: 'hardcoded_styles',
      message: 'Found hardcoded inline styles that could use Ant Design theme tokens',
      suggestion: 'Use theme tokens from useTheme hook for consistency',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run all validations
 */
export function validateComponent(
  component: React.ReactNode,
  contract: ComponentContract,
  code: string
): ValidationResult {
  const contractResult = validateComponentContract(component, contract);
  const antdResult = validateAntDesignUsage(code);

  return {
    valid: contractResult.valid && antdResult.valid,
    errors: [...contractResult.errors, ...antdResult.errors],
    warnings: [...contractResult.warnings, ...antdResult.warnings],
  };
}
