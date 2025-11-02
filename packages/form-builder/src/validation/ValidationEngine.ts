/**
 * Validation Engine for Form Builder
 * Handles field and form-level validation with support for custom validators
 */

import {
  FieldConfig,
  ValidationRule,
  ValidationType,
  FormValidationError,
  ValidationContext,
  ValidationResult,
  CustomValidator,
  VisibilityCondition,
  VisibilityOperator,
} from '../types';

/**
 * Validation engine for processing field and form validations
 */
export class ValidationEngine {
  private customValidators: Map<string, CustomValidator> = new Map();

  /**
   * Register a custom validator
   */
  public registerCustomValidator(name: string, validator: CustomValidator): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate a single field
   */
  public async validateField(
    field: FieldConfig,
    value: unknown,
    formValues: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: FormValidationError[] = [];

    // Skip validation if field is hidden or disabled
    if (field.hidden || field.disabled) {
      return { fieldId: field.id, isValid: true, errors: [] };
    }

    // Check visibility condition
    if (field.visibilityCondition) {
      const isVisible = this.evaluateVisibilityCondition(field.visibilityCondition, formValues);
      if (!isVisible) {
        return { fieldId: field.id, isValid: true, errors: [] };
      }
    }

    // Validate basic rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        const ruleErrors = await this.validateRule(field, rule, value, formValues);
        errors.push(...ruleErrors);
      }
    }

    // Validate conditional rules
    if (field.conditionalValidations) {
      for (const conditional of field.conditionalValidations) {
        const conditionMet = this.evaluateVisibilityCondition(conditional.condition, formValues);
        if (conditionMet) {
          for (const rule of conditional.rules) {
            const ruleErrors = await this.validateRule(field, rule, value, formValues);
            errors.push(...ruleErrors);
          }
        }
      }
    }

    return {
      fieldId: field.id,
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate cross-field validations
   */
  public async validateCrossField(
    fields: Map<string, FieldConfig>,
    formValues: Record<string, unknown>
  ): Promise<FormValidationError[]> {
    const errors: FormValidationError[] = [];

    for (const field of fields.values()) {
      if (field.crossFieldValidations) {
        for (const validation of field.crossFieldValidations) {
          // Get all field values involved
          const fieldValues = validation.fields.reduce(
            (acc, fieldId) => {
              acc[fieldId] = formValues[fieldId];
              return acc;
            },
            {} as Record<string, unknown>
          );

          // Evaluate the rule
          const isValid = await this.validateCrossFieldRule(
            field,
            validation.fields,
            fieldValues,
            validation.rule,
            formValues
          );

          if (!isValid) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message: validation.message,
              code: 'CROSS_FIELD_VALIDATION_FAILED',
              rule: ValidationType.CROSS_FIELD,
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate entire form
   */
  public async validateForm(
    fields: Map<string, FieldConfig>,
    formValues: Record<string, unknown>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate individual fields
    for (const field of fields.values()) {
      const result = await this.validateField(field, formValues[field.id], formValues);
      results.push(result);
    }

    // Validate cross-field validations
    const crossFieldErrors = await this.validateCrossField(fields, formValues);
    if (crossFieldErrors.length > 0) {
      // Add cross-field errors to the first affected field's result
      for (const error of crossFieldErrors) {
        const resultIndex = results.findIndex((r) => r.fieldId === error.fieldId);
        if (resultIndex >= 0) {
          results[resultIndex].errors.push(error);
          results[resultIndex].isValid = false;
        }
      }
    }

    return results;
  }

  /**
   * Validate a single rule
   */
  private async validateRule(
    field: FieldConfig,
    rule: ValidationRule,
    value: unknown,
    formValues: Record<string, unknown>
  ): Promise<FormValidationError[]> {
    const errors: FormValidationError[] = [];

    switch (rule.type) {
      case ValidationType.REQUIRED:
        if (!this.isValuePresent(value)) {
          errors.push({
            fieldId: field.id,
            fieldName: field.name || field.id,
            message: rule.message || `${field.label || field.name} is required`,
            code: 'REQUIRED_VALIDATION_FAILED',
            rule: ValidationType.REQUIRED,
          });
        }
        break;

      case ValidationType.MIN_LENGTH:
        if (typeof value === 'string' && (rule.value as number)) {
          if (value.length < (rule.value as number)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message:
                rule.message ||
                `${field.label || field.name} must be at least ${rule.value} characters`,
              code: 'MIN_LENGTH_VALIDATION_FAILED',
              rule: ValidationType.MIN_LENGTH,
            });
          }
        }
        break;

      case ValidationType.MAX_LENGTH:
        if (typeof value === 'string' && (rule.value as number)) {
          if (value.length > (rule.value as number)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message:
                rule.message ||
                `${field.label || field.name} must be at most ${rule.value} characters`,
              code: 'MAX_LENGTH_VALIDATION_FAILED',
              rule: ValidationType.MAX_LENGTH,
            });
          }
        }
        break;

      case ValidationType.PATTERN:
        if (typeof value === 'string' && rule.value) {
          const pattern = new RegExp(rule.value as string);
          if (!pattern.test(value)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message:
                rule.message ||
                `${field.label || field.name} format is invalid`,
              code: 'PATTERN_VALIDATION_FAILED',
              rule: ValidationType.PATTERN,
            });
          }
        }
        break;

      case ValidationType.EMAIL:
        if (this.isValuePresent(value)) {
          if (!this.isValidEmail(value as string)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message: rule.message || `${field.label || field.name} must be a valid email`,
              code: 'EMAIL_VALIDATION_FAILED',
              rule: ValidationType.EMAIL,
            });
          }
        }
        break;

      case ValidationType.URL:
        if (this.isValuePresent(value)) {
          if (!this.isValidUrl(value as string)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message: rule.message || `${field.label || field.name} must be a valid URL`,
              code: 'URL_VALIDATION_FAILED',
              rule: ValidationType.URL,
            });
          }
        }
        break;

      case ValidationType.PHONE:
        if (this.isValuePresent(value)) {
          if (!this.isValidPhone(value as string)) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message: rule.message || `${field.label || field.name} must be a valid phone`,
              code: 'PHONE_VALIDATION_FAILED',
              rule: ValidationType.PHONE,
            });
          }
        }
        break;

      case ValidationType.MIN_VALUE:
        if (typeof value === 'number' && typeof rule.value === 'number') {
          if (value < rule.value) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message:
                rule.message ||
                `${field.label || field.name} must be at least ${rule.value}`,
              code: 'MIN_VALUE_VALIDATION_FAILED',
              rule: ValidationType.MIN_VALUE,
            });
          }
        }
        break;

      case ValidationType.MAX_VALUE:
        if (typeof value === 'number' && typeof rule.value === 'number') {
          if (value > rule.value) {
            errors.push({
              fieldId: field.id,
              fieldName: field.name || field.id,
              message:
                rule.message ||
                `${field.label || field.name} must be at most ${rule.value}`,
              code: 'MAX_VALUE_VALIDATION_FAILED',
              rule: ValidationType.MAX_VALUE,
            });
          }
        }
        break;

      case ValidationType.CUSTOM:
        if (rule.value && typeof rule.value === 'string') {
          const customValidator = this.customValidators.get(rule.value);
          if (customValidator) {
            const result = await customValidator(value, field, formValues);
            if (result === false || (typeof result === 'object' && result !== null && 'message' in result)) {
              if (typeof result === 'object' && result !== null && 'message' in result) {
                errors.push(result as FormValidationError);
              } else {
                errors.push({
                  fieldId: field.id,
                  fieldName: field.name || field.id,
                  message: rule.message || `${field.label || field.name} validation failed`,
                  code: 'CUSTOM_VALIDATION_FAILED',
                  rule: ValidationType.CUSTOM,
                });
              }
            }
          }
        }
        break;
    }

    return errors;
  }

  /**
   * Validate cross-field rule
   */
  private async validateCrossFieldRule(
    field: FieldConfig,
    fieldIds: string[],
    fieldValues: Record<string, unknown>,
    rule: ValidationRule,
    formValues: Record<string, unknown>
  ): Promise<boolean> {
    // Basic cross-field rules can be implemented here
    // For now, support custom validators
    if (rule.type === ValidationType.CUSTOM && rule.value && typeof rule.value === 'string') {
      const customValidator = this.customValidators.get(rule.value);
      if (customValidator) {
        const result = await customValidator(fieldValues, field, formValues);
        return result !== false && !(typeof result === 'object' && result !== null && 'message' in result);
      }
    }

    return true;
  }

  /**
   * Evaluate visibility condition
   */
  private evaluateVisibilityCondition(
    condition: VisibilityCondition,
    formValues: Record<string, unknown>
  ): boolean {
    const fieldValue = formValues[condition.fieldId];

    switch (condition.operator) {
      case VisibilityOperator.EQUALS:
        return fieldValue === condition.value;
      case VisibilityOperator.NOT_EQUALS:
        return fieldValue !== condition.value;
      case VisibilityOperator.CONTAINS:
        return typeof fieldValue === 'string' && typeof condition.value === 'string'
          ? fieldValue.includes(condition.value)
          : false;
      case VisibilityOperator.GREATER_THAN:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue > condition.value
          : false;
      case VisibilityOperator.LESS_THAN:
        return typeof fieldValue === 'number' && typeof condition.value === 'number'
          ? fieldValue < condition.value
          : false;
      case VisibilityOperator.IS_TRUE:
        return fieldValue === true;
      case VisibilityOperator.IS_FALSE:
        return fieldValue === false;
      case VisibilityOperator.IN_ARRAY:
        return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
      case VisibilityOperator.BETWEEN:
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value;
          return typeof fieldValue === 'number'
            ? fieldValue >= min && fieldValue <= max
            : false;
        }
        return false;
      default:
        return true;
    }
  }

  /**
   * Helper: Check if value is present
   */
  private isValuePresent(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Helper: Validate email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Helper: Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Validate phone
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
}
