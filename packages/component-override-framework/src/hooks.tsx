/**
 * Component Override Hooks
 *
 * React hooks for registering and using component overrides.
 *
 * @module component-override-framework/hooks
 */

import * as React from 'react';
import { useExtensionContext } from '@machshop/frontend-extension-sdk';
import {
  ComponentOverrideDeclaration,
  ComponentContract,
  ValidationResult,
  CompatibilityCheckResult,
} from './types';
import { useComponentOverrideStore } from './store';
import { validateOverride, checkCompatibility, createFallbackWrapper } from './validator';

/**
 * Hook to register a component override
 *
 * @param override - Override declaration
 * @returns Override registration result
 *
 * @example
 * ```typescript
 * const result = useRegisterComponentOverride({
 *   contractId: 'core:production-page',
 *   component: CustomProductionPage,
 *   extensionId: 'my-extension',
 *   siteId: 'site-123',
 *   fallback: DefaultProductionPage,
 * });
 * ```
 */
export function useRegisterComponentOverride(
  override: Omit<ComponentOverrideDeclaration, 'id' | 'createdAt' | 'modifiedAt'>
): {
  id: string;
  validation: ValidationResult;
  compatibility: CompatibilityCheckResult;
  registered: boolean;
} {
  const context = useExtensionContext();
  const { registerContract, registerOverride, getContract } = useComponentOverrideStore();
  const [result, setResult] = React.useState<{
    id: string;
    validation: ValidationResult;
    compatibility: CompatibilityCheckResult;
    registered: boolean;
  }>({
    id: '',
    validation: { valid: true, errors: [], warnings: [] },
    compatibility: {
      compatible: true,
      issues: [],
      suggestions: [],
      riskLevel: 'low',
    },
    registered: false,
  });

  React.useEffect(() => {
    const contract = getContract(override.contractId);
    if (!contract) {
      setResult((prev) => ({
        ...prev,
        validation: {
          valid: false,
          errors: [
            {
              code: 'CONTRACT_NOT_FOUND',
              message: `Contract not found: ${override.contractId}`,
              severity: 'critical',
            },
          ],
          warnings: [],
        },
      }));
      return;
    }

    const fullOverride: ComponentOverrideDeclaration = {
      ...override,
      id: `override-${Date.now()}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    const validation = validateOverride(fullOverride, contract);
    const compatibility = checkCompatibility(fullOverride, contract);

    const id = registerOverride(fullOverride);

    setResult({
      id,
      validation,
      compatibility,
      registered: validation.valid && compatibility.compatible,
    });
  }, [override, registerOverride, getContract]);

  return result;
}

/**
 * Hook to get a component override
 *
 * @param contractId - Contract ID
 * @param siteId - Site ID
 * @returns The override component or undefined
 */
export function useComponentOverride(
  contractId: string,
  siteId: string
): React.ComponentType<any> | undefined {
  const { getActiveOverride } = useComponentOverrideStore();

  return React.useMemo(() => {
    const override = getActiveOverride(contractId, siteId);
    return override?.component;
  }, [contractId, siteId, getActiveOverride]);
}

/**
 * Hook to wrap a component with override support
 *
 * @param contractId - Contract ID
 * @param defaultComponent - Default component to use
 * @param fallbackComponent - Optional fallback for errors
 * @returns The component to render (override, default, or fallback)
 */
export function useOverridableComponent<P extends object>(
  contractId: string,
  defaultComponent: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  const context = useExtensionContext();
  const override = useComponentOverride(contractId, context.siteId);
  const { recordUsage, recordError } = useComponentOverrideStore();

  React.useEffect(() => {
    if (override) {
      recordUsage(`override-${contractId}`);
    }
  }, [override, contractId, recordUsage]);

  if (override) {
    if (fallbackComponent) {
      return createFallbackWrapper(
        override,
        fallbackComponent,
        (error) => {
          recordError(`override-${contractId}`, error, true);
          context.logger.error(`Component override failed, using fallback: ${error.message}`);
        }
      );
    }
    return override;
  }

  return defaultComponent;
}

/**
 * Hook to manage override validation
 *
 * @param override - Override declaration
 * @param contract - Component contract
 * @returns Validation and compatibility results
 */
export function useOverrideValidation(
  override: ComponentOverrideDeclaration,
  contract: ComponentContract
): {
  validation: ValidationResult;
  compatibility: CompatibilityCheckResult;
  canUseOverride: boolean;
  warnings: string[];
} {
  const [results, setResults] = React.useState<{
    validation: ValidationResult;
    compatibility: CompatibilityCheckResult;
  }>({
    validation: { valid: true, errors: [], warnings: [] },
    compatibility: {
      compatible: true,
      issues: [],
      suggestions: [],
      riskLevel: 'low',
    },
  });

  React.useEffect(() => {
    const validation = validateOverride(override, contract);
    const compatibility = checkCompatibility(override, contract);
    setResults({ validation, compatibility });
  }, [override, contract]);

  const warnings = React.useMemo(() => {
    const allWarnings: string[] = [];

    results.validation.warnings.forEach((w) => {
      allWarnings.push(w.message);
    });

    results.compatibility.suggestions.forEach((s) => {
      allWarnings.push(s);
    });

    return allWarnings;
  }, [results]);

  return {
    validation: results.validation,
    compatibility: results.compatibility,
    canUseOverride: results.validation.valid && results.compatibility.compatible,
    warnings,
  };
}

/**
 * Hook to record override analytics
 *
 * @param overrideId - Override ID
 */
export function useOverrideAnalytics(overrideId: string) {
  const { getRegistryEntry, recordUsage, recordError } = useComponentOverrideStore();

  const recordComponentUsage = React.useCallback(() => {
    recordUsage(overrideId);
  }, [overrideId, recordUsage]);

  const recordComponentError = React.useCallback(
    (error: Error, usingFallback: boolean) => {
      recordError(overrideId, error, usingFallback);
    },
    [overrideId, recordError]
  );

  const getMetrics = React.useCallback(() => {
    const entry = getRegistryEntry(overrideId);
    return entry?.metrics || { renderTime: 0, memoryUsage: 0, errorRate: 0 };
  }, [overrideId, getRegistryEntry]);

  return {
    recordComponentUsage,
    recordComponentError,
    getMetrics,
  };
}
