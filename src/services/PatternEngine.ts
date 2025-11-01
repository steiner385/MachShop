/**
 * Pattern Engine (Issue #149)
 * Core engine for parsing, validating, and generating serial numbers from pattern templates
 * Pattern Syntax: {COMPONENT:CONFIG}
 */

import {
  PatternComponent,
  ParsedPattern,
  PatternMetadata,
  SyntaxValidation,
  GenerationContext,
  CheckDigitResult,
  CheckAlgorithm,
  RandomType,
} from '../types/serialNumberFormat';

export class PatternEngine {
  private readonly COMPONENT_REGEX = /\{([A-Z_]+)(?::([^\}]+))?\}/g;
  private readonly VALID_COMPONENTS = [
    'PREFIX',
    'YYYY',
    'YY',
    'MM',
    'DD',
    'WW',
    'SEQ',
    'RANDOM',
    'SITE',
    'PART',
    'CHECK',
    'UUID',
  ];

  /**
   * Parse a pattern template into components
   */
  parsePattern(pattern: string): ParsedPattern {
    if (!pattern || typeof pattern !== 'string') {
      return {
        rawPattern: pattern || '',
        components: [],
        isDeterministic: false,
        metadata: this.getEmptyMetadata(),
      };
    }

    const components: PatternComponent[] = [];
    const syntax = this.validatePatternSyntax(pattern);

    if (!syntax.isValid) {
      // Return parsed pattern with errors noted, but continue parsing
      return {
        rawPattern: pattern,
        components: [],
        isDeterministic: false,
        metadata: this.getEmptyMetadata(),
      };
    }

    // Find all matches - create new regex to avoid state issues with global flag
    const regex = /\{([A-Z_]+)(?::([^\}]+))?\}/g;
    let match: RegExpExecArray | null;
    const matches: Array<{ match: RegExpExecArray; position: number }> = [];

    while ((match = regex.exec(pattern)) !== null) {
      matches.push({ match, position: match.index });
    }

    // Extract components with their positions
    matches.forEach((item, idx) => {
      const match = item.match;
      const componentType = match[1];
      const config = match[2];

      components.push({
        type: componentType as any,
        position: idx,
        rawText: match[0],
        config: this.parseConfig(componentType, config),
        length: this.getComponentLength(componentType, config),
      });
    });

    // Calculate metadata
    const metadata = this.calculatePatternMetadata(components);

    return {
      rawPattern: pattern,
      components,
      fixedLength: metadata.isDeterministic ? metadata.minLength : undefined,
      isDeterministic: metadata.isDeterministic,
      metadata,
    };
  }

  /**
   * Extract components from a pattern
   */
  extractComponents(pattern: string): PatternComponent[] {
    const parsed = this.parsePattern(pattern);
    return parsed.components;
  }

  /**
   * Validate pattern syntax
   */
  validatePatternSyntax(pattern: string): SyntaxValidation {
    if (!pattern || typeof pattern !== 'string') {
      return {
        isValid: false,
        errors: [{ position: 0, message: 'Pattern is empty or invalid', component: '' }],
      };
    }

    const errors: SyntaxValidation['errors'] = [];
    let match: RegExpExecArray | null;

    while ((match = this.COMPONENT_REGEX.exec(pattern)) !== null) {
      const componentType = match[1];
      const config = match[2];

      // Check if component is valid
      if (!this.VALID_COMPONENTS.includes(componentType)) {
        errors.push({
          position: match.index,
          message: `Unknown component type: ${componentType}`,
          component: match[0],
        });
      }

      // Validate component-specific config
      const configError = this.validateComponentConfig(componentType, config);
      if (configError) {
        errors.push({
          position: match.index,
          message: configError,
          component: match[0],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a serial number from a pattern
   */
  generateSerial(pattern: string, context: GenerationContext): string {
    const parsed = this.parsePattern(pattern);

    if (!parsed.isDeterministic && parsed.components.some(c => c.type === 'RANDOM')) {
      // Has random components, will vary
    }

    let serial = pattern;

    // Replace each component with generated value
    // Process in reverse order to avoid index shifting issues
    for (let i = parsed.components.length - 1; i >= 0; i--) {
      const component = parsed.components[i];
      const value = this.generateComponentValue(component, context);
      // Use a function to avoid global regex issues
      serial = serial.replace(component.rawText, value);
    }

    return serial;
  }

  /**
   * Build a serial from parsed pattern
   */
  buildSerial(parsedPattern: ParsedPattern, context: GenerationContext): string {
    let serial = parsedPattern.rawPattern;

    // Process in reverse order to avoid index shifting issues
    for (let i = parsedPattern.components.length - 1; i >= 0; i--) {
      const component = parsedPattern.components[i];
      const value = this.generateComponentValue(component, context);
      serial = serial.replace(component.rawText, value);
    }

    return serial;
  }

  /**
   * Validate a serial against a pattern
   */
  validateAgainstPattern(serial: string, pattern: string): boolean {
    try {
      const parsed = this.parsePattern(pattern);

      // Create a regex from the pattern
      let regex = this.patternToRegex(parsed);
      return regex.test(serial);
    } catch {
      return false;
    }
  }

  /**
   * Get pattern metadata
   */
  getPatternMetadata(pattern: string): PatternMetadata {
    const parsed = this.parsePattern(pattern);
    return parsed.metadata;
  }

  // ============= Private Helper Methods =============

  private getEmptyMetadata(): PatternMetadata {
    return {
      hasSequential: false,
      hasRandom: false,
      hasCheckDigit: false,
      hasDate: false,
      estimatedLength: 0,
      maxLength: 0,
      minLength: 0,
    };
  }

  private parseConfig(componentType: string, config?: string): Record<string, string | number> {
    if (!config) return {};

    const result: Record<string, string | number> = {};
    const parts = config.split(':');

    switch (componentType) {
      case 'PREFIX':
        result.value = config;
        break;
      case 'SEQ':
        result.length = parseInt(parts[0], 10) || 4;
        break;
      case 'RANDOM':
        result.type = parts[0] || 'alphanumeric';
        result.length = parseInt(parts[1], 10) || 4;
        break;
      case 'SITE':
        result.code = config;
        break;
      case 'PART':
        result.length = parseInt(config, 10) || 4;
        break;
      case 'CHECK':
        result.algorithm = config || 'luhn';
        break;
    }

    return result;
  }

  private validateComponentConfig(componentType: string, config?: string): string | null {
    if (!config) {
      // Check if component requires config
      if (['PREFIX', 'SEQ', 'RANDOM', 'SITE', 'PART', 'CHECK'].includes(componentType)) {
        return `${componentType} requires a configuration value`;
      }
      return null;
    }

    switch (componentType) {
      case 'SEQ': {
        const length = parseInt(config, 10);
        if (isNaN(length) || length < 1 || length > 8) {
          return 'SEQ length must be between 1 and 8';
        }
        break;
      }
      case 'RANDOM': {
        const parts = config.split(':');
        const type = parts[0];
        const length = parseInt(parts[1], 10);

        if (!['alpha', 'numeric', 'alphanumeric'].includes(type)) {
          return `RANDOM type must be 'alpha', 'numeric', or 'alphanumeric', got '${type}'`;
        }

        if (isNaN(length) || length < 1 || length > 32) {
          return 'RANDOM length must be between 1 and 32';
        }
        break;
      }
      case 'PART': {
        const length = parseInt(config, 10);
        if (isNaN(length) || length < 1 || length > 32) {
          return 'PART length must be between 1 and 32';
        }
        break;
      }
      case 'CHECK': {
        const algorithm = config;
        if (!['luhn', 'mod10', 'custom'].includes(algorithm)) {
          return `CHECK algorithm must be 'luhn', 'mod10', or 'custom', got '${algorithm}'`;
        }
        break;
      }
    }

    return null;
  }

  private getComponentLength(componentType: string, config?: string): number | undefined {
    switch (componentType) {
      case 'YYYY':
        return 4;
      case 'YY':
        return 2;
      case 'MM':
      case 'DD':
      case 'WW':
        return 2;
      case 'SEQ':
      case 'RANDOM':
      case 'PART': {
        const configObj = this.parseConfig(componentType, config);
        return configObj.length as number | undefined;
      }
      case 'UUID':
        return 36; // Standard UUID length without hyphens would be 32, with hyphens is 36
      case 'CHECK':
        return 1;
      case 'PREFIX':
      case 'SITE':
      default:
        return undefined;
    }
  }

  private calculatePatternMetadata(components: PatternComponent[]): PatternMetadata & { isDeterministic: boolean } {
    const metadata: PatternMetadata & { isDeterministic: boolean } = {
      hasSequential: false,
      hasRandom: false,
      hasCheckDigit: false,
      hasDate: false,
      estimatedLength: 0,
      maxLength: 0,
      minLength: 0,
      isDeterministic: true,
    };

    let fixedLength = 0;
    let minLength = 0;
    let maxLength = 0;

    components.forEach(component => {
      const length = component.length;

      switch (component.type) {
        case 'SEQ':
          metadata.hasSequential = true;
          metadata.isDeterministic = true;
          if (length) fixedLength += length;
          break;
        case 'RANDOM':
          metadata.hasRandom = true;
          metadata.isDeterministic = false;
          if (length) fixedLength += length;
          break;
        case 'CHECK':
          metadata.hasCheckDigit = true;
          fixedLength += 1;
          break;
        case 'YYYY':
        case 'YY':
        case 'MM':
        case 'DD':
        case 'WW':
          metadata.hasDate = true;
          if (length) fixedLength += length;
          break;
        case 'UUID':
          if (length) fixedLength += length;
          break;
        case 'PREFIX':
        case 'SITE':
          const configLength = (component.config?.value as string | number)?.toString().length || 0;
          if (configLength > 0) fixedLength += configLength;
          break;
        case 'PART':
          if (length) fixedLength += length;
          break;
      }

      minLength = fixedLength;
      maxLength = fixedLength;
    });

    metadata.minLength = minLength;
    metadata.maxLength = maxLength;
    metadata.estimatedLength = fixedLength;

    return metadata;
  }

  private generateComponentValue(component: PatternComponent, context: GenerationContext): string {
    const now = context.timestamp || new Date();

    switch (component.type) {
      case 'PREFIX':
        return (component.config?.value as string) || '';

      case 'YYYY':
        return now.getFullYear().toString();

      case 'YY':
        return now.getFullYear().toString().slice(-2);

      case 'MM':
        return (now.getMonth() + 1).toString().padStart(2, '0');

      case 'DD':
        return now.getDate().toString().padStart(2, '0');

      case 'WW': {
        const weekNumber = this.getWeekNumber(now);
        return weekNumber.toString().padStart(2, '0');
      }

      case 'SEQ': {
        const length = (component.config?.length as number) || 4;
        // This will be replaced by actual sequence from database
        return '0'.repeat(length);
      }

      case 'RANDOM': {
        const length = (component.config?.length as number) || 4;
        const type = (component.config?.type as RandomType) || 'alphanumeric';
        return this.generateRandomString(length, type);
      }

      case 'SITE':
        return context.siteId || (component.config?.code as string) || '';

      case 'PART':
        return context.partId || '';

      case 'CHECK': {
        const algorithm = (component.config?.algorithm as CheckAlgorithm) || 'luhn';
        // Check digit generation will be done separately
        return '';
      }

      case 'UUID':
        return this.generateUUID();

      default:
        return '';
    }
  }

  private generateRandomString(length: number, type: RandomType): string {
    const alphaChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numericChars = '0123456789';
    const alphanumericChars = alphaChars + numericChars;

    let chars: string;
    switch (type) {
      case 'alpha':
        chars = alphaChars;
        break;
      case 'numeric':
        chars = numericChars;
        break;
      case 'alphanumeric':
      default:
        chars = alphanumericChars;
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private patternToRegex(parsed: ParsedPattern): RegExp {
    let pattern = parsed.rawPattern;

    // Escape special regex characters in the pattern
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace each component with appropriate regex
    parsed.components.forEach(component => {
      const escapedRaw = component.rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let regex: string;

      switch (component.type) {
        case 'YYYY':
          regex = '\\d{4}';
          break;
        case 'YY':
          regex = '\\d{2}';
          break;
        case 'MM':
        case 'DD':
        case 'WW':
          regex = '\\d{2}';
          break;
        case 'SEQ': {
          const length = (component.config?.length as number) || 4;
          regex = `\\d{${length}}`;
          break;
        }
        case 'RANDOM': {
          const type = (component.config?.type as RandomType) || 'alphanumeric';
          const length = (component.config?.length as number) || 4;
          const charClass =
            type === 'alpha' ? '[A-Z]' : type === 'numeric' ? '[0-9]' : '[A-Z0-9]';
          regex = `${charClass}{${length}}`;
          break;
        }
        case 'UUID':
          regex = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
          break;
        case 'CHECK':
          regex = '[0-9A-Z]';
          break;
        default:
          regex = '.+';
      }

      pattern = pattern.replace(escapedRaw, regex);
    });

    return new RegExp(`^${pattern}$`);
  }
}

// Export singleton instance
export const patternEngine = new PatternEngine();
