/**
 * UI AST Analyzer
 * Analyzes TypeScript/TSX code using patterns to detect issues
 * Issue #430 - UI Extension Validation & Testing Framework
 */

/**
 * AST Analysis Result
 */
export interface ASTAnalysisResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  analysis: {
    nonAntDesignComponents: string[];
    hardcodedColors: Array<{ color: string; line: number; context: string }>;
    unsafeImports: string[];
    componentCount: number;
    importsAnalysis: {
      totalImports: number;
      antDesignImports: number;
      externalImports: number;
      localImports: number;
    };
  };
}

/**
 * AST Analyzer
 * Analyzes TypeScript/TSX code for common issues
 */
export class ASTAnalyzer {
  private readonly antDesignComponents = [
    'Button',
    'Input',
    'Select',
    'DatePicker',
    'TimePicker',
    'Form',
    'Modal',
    'Message',
    'Notification',
    'Popover',
    'Tooltip',
    'Dropdown',
    'Menu',
    'Breadcrumb',
    'Tabs',
    'Card',
    'Collapse',
    'Spin',
    'Progress',
    'Slider',
    'Switch',
    'Checkbox',
    'Radio',
    'Rate',
    'Upload',
    'List',
    'Table',
    'Pagination',
    'Avatar',
    'Badge',
    'Tag',
    'Alert',
    'Divider',
    'Empty',
    'Result',
    'Space',
    'Statistic',
    'Tree',
    'TreeSelect',
  ];

  /**
   * Analyze TypeScript/TSX code
   */
  analyzeCode(code: string): ASTAnalysisResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Analyze imports
    const importsAnalysis = this.analyzeImports(code);

    // Check for non-Ant Design components
    const nonAntDesignComponents = this.findNonAntDesignComponents(code);
    if (nonAntDesignComponents.length > 0) {
      warnings.push(
        `Found ${nonAntDesignComponents.length} non-Ant Design component(s): ${nonAntDesignComponents.slice(0, 3).join(', ')}${nonAntDesignComponents.length > 3 ? '...' : ''}`
      );
    }

    // Check for hardcoded colors
    const hardcodedColors = this.findHardcodedColors(code);
    if (hardcodedColors.length > 0) {
      warnings.push(
        `Found ${hardcodedColors.length} hardcoded color(s) (should use theme tokens instead)`
      );
    }

    // Check for unsafe imports
    const unsafeImports = this.findUnsafeImports(code);
    if (unsafeImports.length > 0) {
      errors.push(
        `Unsafe imports detected: ${unsafeImports.join(', ')} (security risk)`
      );
    }

    // Count components
    const componentCount = this.countComponents(code);

    const isValid = errors.length === 0 && unsafeImports.length === 0;

    return {
      isValid,
      errors,
      warnings,
      analysis: {
        nonAntDesignComponents,
        hardcodedColors,
        unsafeImports,
        componentCount,
        importsAnalysis,
      },
    };
  }

  /**
   * Analyze imports in code
   */
  private analyzeImports(code: string): {
    totalImports: number;
    antDesignImports: number;
    externalImports: number;
    localImports: number;
  } {
    const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"](.+?)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    const antDesignImports = imports.filter((imp) => imp.startsWith('antd')).length;
    const localImports = imports.filter((imp) => imp.startsWith('.') || imp.startsWith('/')).length;
    const externalImports = imports.filter(
      (imp) => !imp.startsWith('antd') && !imp.startsWith('.') && !imp.startsWith('/')
    ).length;

    return {
      totalImports: imports.length,
      antDesignImports,
      externalImports,
      localImports,
    };
  }

  /**
   * Find non-Ant Design components
   */
  private findNonAntDesignComponents(code: string): string[] {
    const components = new Set<string>();

    // Look for component usage patterns (PascalCase)
    const componentRegex = /<\s*([A-Z][a-zA-Z0-9]*)/g;
    let match;

    while ((match = componentRegex.exec(code)) !== null) {
      const componentName = match[1];

      // Skip React built-in components
      if (['Fragment', 'Suspense', 'StrictMode'].includes(componentName)) {
        continue;
      }

      // Skip if it's an Ant Design component
      if (!this.antDesignComponents.includes(componentName)) {
        components.add(componentName);
      }
    }

    return Array.from(components);
  }

  /**
   * Find hardcoded colors in code
   */
  private findHardcodedColors(code: string): Array<{
    color: string;
    line: number;
    context: string;
  }> {
    const colors: Array<{ color: string; line: number; context: string }> = [];
    const lines = code.split('\n');

    // Patterns for hardcoded colors
    const colorPatterns = [
      /#[0-9a-fA-F]{3,8}\b/g, // Hex colors
      /rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g, // RGB colors
      /rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g, // RGBA colors
    ];

    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        return;
      }

      // Look for color patterns
      colorPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          // Skip if it's in a string that might be intentional (like in a comment or constant)
          if (!line.includes('// ') || line.indexOf(match[0]) < line.indexOf('// ')) {
            colors.push({
              color: match[0],
              line: index + 1,
              context: line.trim().substring(0, 60),
            });
          }
        }
      });
    });

    return colors;
  }

  /**
   * Find unsafe imports
   */
  private findUnsafeImports(code: string): string[] {
    const unsafePackages = [
      'eval',
      'vm',
      'child_process',
      'fs',
      'path',
      'os',
      'net',
      'http',
      'https',
    ];

    const unsafeImports: string[] = [];
    const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"](.+?)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      if (unsafePackages.some((pkg) => importPath.includes(pkg))) {
        unsafeImports.push(importPath);
      }
    }

    return unsafeImports;
  }

  /**
   * Count components in code
   */
  private countComponents(code: string): number {
    // Count function/const declarations that return JSX
    const componentRegex = /(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/g;
    let count = 0;
    let match;

    while ((match = componentRegex.exec(code)) !== null) {
      // Check if this function returns JSX
      const afterDeclaration = code.substring(match.index + match[0].length);
      if (afterDeclaration.includes('return') && afterDeclaration.includes('<')) {
        count++;
      }
    }

    return count;
  }

  /**
   * Analyze component props
   */
  analyzeComponentProps(componentCode: string, componentName: string): {
    isValid: boolean;
    errors: string[];
    props: Array<{
      name: string;
      type: string;
      required: boolean;
      hasDefault: boolean;
    }>;
  } {
    const errors: string[] = [];
    const props: Array<{
      name: string;
      type: string;
      required: boolean;
      hasDefault: boolean;
    }> = [];

    // Find component function signature
    const componentRegex = new RegExp(
      `(?:export\\s+)?(?:const|function)\\s+${componentName}\\s*\\(([^)]*)\\)`,
      'm'
    );
    const match = componentRegex.exec(componentCode);

    if (!match) {
      errors.push(`Component "${componentName}" not found`);
      return { isValid: false, errors, props: [] };
    }

    // Parse props from signature
    const propsSignature = match[1];
    if (propsSignature.includes('interface') || propsSignature.includes('type')) {
      // Props defined inline or as type reference
      const propLines = propsSignature.split('\n');
      propLines.forEach((line) => {
        const propMatch = /(\w+)\s*(\?)?:\s*([^,;}]+)/g.exec(line);
        if (propMatch) {
          props.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            required: !propMatch[2],
            hasDefault: line.includes('='),
          });
        }
      });
    }

    if (props.length === 0) {
      errors.push(`No props found for component "${componentName}"`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      props,
    };
  }

  /**
   * Detect potential security issues
   */
  detectSecurityIssues(code: string): {
    issues: Array<{ type: string; description: string; severity: 'high' | 'medium' | 'low' }>;
  } {
    const issues: Array<{ type: string; description: string; severity: 'high' | 'medium' | 'low' }> = [];

    // Check for dangerouslySetInnerHTML
    if (code.includes('dangerouslySetInnerHTML')) {
      issues.push({
        type: 'XSS Risk',
        description: 'Use of dangerouslySetInnerHTML detected (XSS vulnerability)',
        severity: 'high',
      });
    }

    // Check for eval
    if (code.includes('eval(')) {
      issues.push({
        type: 'Code Injection',
        description: 'Use of eval() detected (code injection vulnerability)',
        severity: 'high',
      });
    }

    // Check for Function constructor
    if (code.includes('new Function(')) {
      issues.push({
        type: 'Code Injection',
        description: 'Use of Function constructor detected',
        severity: 'high',
      });
    }

    // Check for innerHTML
    if (code.includes('.innerHTML')) {
      issues.push({
        type: 'XSS Risk',
        description: 'Use of innerHTML detected (potential XSS)',
        severity: 'medium',
      });
    }

    // Check for missing input validation
    if (code.includes('onChange') && !code.includes('validate')) {
      issues.push({
        type: 'Input Validation',
        description: 'onChange handler found without apparent input validation',
        severity: 'low',
      });
    }

    return { issues };
  }
}
