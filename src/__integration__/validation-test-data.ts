/**
 * Validation Test Data and Fixtures
 *
 * Provides test data sets for all validation regression test scenarios.
 * Includes valid, invalid, and edge case manifests for comprehensive validation testing.
 */

export const validManifestFixtures = {
  /**
   * Minimal valid manifest with only required fields
   */
  minimal: {
    id: 'minimal-extension',
    name: 'Minimal Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Complete manifest with all supported fields
   */
  complete: {
    id: 'complete-extension',
    name: 'Complete Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    description: 'A complete extension demonstrating all features',
    author: 'Test Author',
    license: 'MIT',
    homepage: 'https://example.com',
    repository: {
      type: 'git',
      url: 'https://github.com/example/repo',
    },
    capabilities: [
      {
        id: 'cap:read',
        description: 'Read capability',
        required: true,
      },
      {
        id: 'cap:write',
        description: 'Write capability',
        required: false,
      },
    ],
    ui_components: [
      {
        id: 'dashboard-widget',
        type: 'widget',
        name: 'Dashboard Widget',
        slot: 'dashboard-main',
        permissions: ['read:dashboard'],
        category: 'dashboard',
      },
      {
        id: 'settings-page',
        type: 'page',
        name: 'Extension Settings',
        permissions: ['admin:extension'],
      },
      {
        id: 'confirmation-modal',
        type: 'modal',
        name: 'Confirmation Modal',
      },
      {
        id: 'data-form',
        type: 'form',
        name: 'Data Entry Form',
      },
    ],
    navigation: [
      {
        id: 'main-nav',
        label: 'Main Navigation',
        path: '/extension/main',
        group: 'primary',
        icon: 'icon-home',
        permissions: ['read:navigation'],
      },
      {
        id: 'admin-nav',
        label: 'Administration',
        path: '/extension/admin',
        group: 'admin',
        icon: 'icon-settings',
        permissions: ['admin:system'],
      },
      {
        id: 'external-link',
        label: 'External Link',
        href: 'https://example.com/docs',
        group: 'resources',
      },
    ],
    configurations: {
      theme: 'light',
      compact: false,
      maxItems: 100,
    },
  },

  /**
   * Simple navigation extension
   */
  navigationOnly: {
    id: 'nav-extension',
    name: 'Navigation Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    description: 'Extension providing navigation items',
    navigation: [
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        group: 'analytics',
        icon: 'icon-chart',
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        group: 'main',
        icon: 'icon-gauge',
      },
    ],
  },

  /**
   * Simple component override extension
   */
  componentOverrideOnly: {
    id: 'override-extension',
    name: 'Component Override Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    description: 'Extension providing component overrides',
    ui_components: [
      {
        id: 'custom-form',
        type: 'form',
        name: 'Custom Data Form',
        permissions: ['write:data'],
      },
      {
        id: 'custom-widget',
        type: 'widget',
        name: 'Custom Widget',
        slot: 'main-slot',
      },
    ],
  },

  /**
   * Extension with many components (stress test)
   */
  manyComponents: {
    id: 'many-components',
    name: 'Many Components Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: Array.from({ length: 50 }, (_, i) => ({
      id: `component-${i}`,
      type: (
        ['widget', 'page', 'modal', 'form'][i % 4] as
          | 'widget'
          | 'page'
          | 'modal'
          | 'form'
      ),
      name: `Component ${i}`,
      slot: i % 2 === 0 ? `slot-${i}` : undefined,
    })),
  },

  /**
   * Extension with semantic versioning variations
   */
  versionVariations: [
    { version: '0.0.1', description: 'Single digits' },
    { version: '1.0.0', description: 'Standard version' },
    { version: '1.2.3', description: 'Multiple digits' },
    { version: '10.20.30', description: 'Large numbers' },
    { version: '1.0.0-alpha', description: 'Prerelease' },
    { version: '1.0.0-beta.1', description: 'Beta with number' },
    { version: '1.0.0-rc.1', description: 'Release candidate' },
  ],

  /**
   * Extension with various permission configurations
   */
  permissions: {
    id: 'permissions-extension',
    name: 'Permissions Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [
      {
        id: 'public-widget',
        type: 'widget',
        name: 'Public Widget',
        // No permissions - public
      },
      {
        id: 'user-widget',
        type: 'widget',
        name: 'User Widget',
        permissions: ['read:data'],
      },
      {
        id: 'admin-widget',
        type: 'widget',
        name: 'Admin Widget',
        permissions: ['admin:system', 'admin:users'],
      },
    ],
    navigation: [
      {
        id: 'public-nav',
        label: 'Public',
        path: '/public',
        // No permissions
      },
      {
        id: 'user-nav',
        label: 'User Area',
        path: '/user',
        permissions: ['read:profile'],
      },
      {
        id: 'admin-nav',
        label: 'Administration',
        path: '/admin',
        permissions: ['admin:system'],
      },
    ],
  },
};

export const invalidManifestFixtures = {
  /**
   * Missing required id field
   */
  missingId: {
    name: 'No ID Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  } as any,

  /**
   * Invalid id format (uppercase)
   */
  invalidIdUppercase: {
    id: 'INVALID-ID',
    name: 'Invalid Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Invalid id format (special characters)
   */
  invalidIdSpecialChars: {
    id: 'invalid@id!',
    name: 'Invalid Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Missing required name field
   */
  missingName: {
    id: 'test-extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  } as any,

  /**
   * Name exceeds maximum length
   */
  nameTooLong: {
    id: 'test-extension',
    name: 'x'.repeat(101),
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Invalid version format
   */
  invalidVersion: {
    id: 'test-extension',
    name: 'Test Extension',
    version: 'not-a-version',
    manifest_version: '2.0.0',
  },

  /**
   * Invalid homepage URL
   */
  invalidHomepage: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    homepage: 'not-a-url',
  },

  /**
   * Duplicate component IDs
   */
  duplicateComponents: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [
      {
        id: 'duplicate',
        type: 'widget',
        name: 'Component 1',
      },
      {
        id: 'duplicate',
        type: 'widget',
        name: 'Component 2',
      },
    ],
  },

  /**
   * Duplicate navigation IDs
   */
  duplicateNavigation: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    navigation: [
      {
        id: 'duplicate-nav',
        label: 'Nav Item 1',
        path: '/nav1',
      },
      {
        id: 'duplicate-nav',
        label: 'Nav Item 2',
        path: '/nav2',
      },
    ],
  },

  /**
   * Component missing id
   */
  componentMissingId: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [
      {
        type: 'widget',
        name: 'Widget',
      },
    ],
  } as any,

  /**
   * Component missing type
   */
  componentMissingType: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [
      {
        id: 'component',
        name: 'Component',
      },
    ],
  } as any,

  /**
   * Component with invalid type
   */
  componentInvalidType: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [
      {
        id: 'component',
        type: 'invalid-type',
        name: 'Component',
      },
    ],
  },

  /**
   * Navigation item missing id
   */
  navigationMissingId: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    navigation: [
      {
        label: 'Navigation Item',
        path: '/nav',
      },
    ],
  } as any,

  /**
   * Navigation item missing label
   */
  navigationMissingLabel: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    navigation: [
      {
        id: 'nav-item',
        path: '/nav',
      },
    ],
  } as any,

  /**
   * Navigation item missing both path and href
   */
  navigationMissingTarget: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    navigation: [
      {
        id: 'nav-item',
        label: 'Navigation Item',
      },
    ],
  },

  /**
   * Capability missing id
   */
  capabilityMissingId: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    capabilities: [
      {
        description: 'Some capability',
      },
    ],
  } as any,

  /**
   * Capability with invalid id format
   */
  capabilityInvalidId: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    capabilities: [
      {
        id: 'INVALID@ID!',
        description: 'Invalid capability',
      },
    ],
  },
};

export const codeQualityFixtures = {
  /**
   * Code with console.log statement
   */
  consoleLog: `
export function initialize() {
  console.log("Debug message");
  setupExtension();
}
`,

  /**
   * Code with console.error (acceptable in some contexts)
   */
  consoleError: `
export function handleError(error) {
  console.error("An error occurred:", error);
  reportError(error);
}
`,

  /**
   * Code with empty catch block
   */
  emptyCatchBlock: `
try {
  await operation();
} catch (error) {
}
`,

  /**
   * Code with proper error handling
   */
  properErrorHandling: `
try {
  await operation();
} catch (error) {
  logger.error("Operation failed", error);
  throw error;
}
`,

  /**
   * Code with proper error handling and recovery
   */
  errorHandlingWithRecovery: `
async function loadData() {
  try {
    return await fetchData();
  } catch (error) {
    logger.error("Failed to load data", error);
    return loadCachedData();
  }
}
`,

  /**
   * Code without quality issues
   */
  cleanCode: `
export async function initialize() {
  try {
    await setupExtension();
  } catch (error) {
    logger.error("Failed to initialize", error);
    throw error;
  }
}

export async function cleanup() {
  try {
    await teardownExtension();
  } catch (error) {
    logger.error("Failed to cleanup", error);
  }
}
`,
};

export const securityFixtures = {
  /**
   * XSS vulnerability: innerHTML with user input
   */
  xssInnerHTML: `element.innerHTML = userInput;`,

  /**
   * XSS vulnerability: innerHTML with concatenation
   */
  xssInnerHTMLConcat: `element.innerHTML = '<div>' + userInput + '</div>';`,

  /**
   * Safe: textContent with user input
   */
  safeTextContent: `element.textContent = userInput;`,

  /**
   * Safe: using DOM methods
   */
  safeDOMMethod: `
const newElement = document.createElement('div');
newElement.textContent = userInput;
element.appendChild(newElement);
`,

  /**
   * SQL injection: string concatenation
   */
  sqlInjectionConcat: `const query = "SELECT * FROM users WHERE id = " + userId;`,

  /**
   * SQL injection: template literal
   */
  sqlInjectionTemplate: `const query = \`SELECT * FROM users WHERE id = \${userId}\`;`,

  /**
   * Safe: parameterized query
   */
  safeParameterizedQuery: `
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);
`,

  /**
   * Safe: ORM query
   */
  safeOrmQuery: `const user = await db.user.findById(userId);`,

  /**
   * Hardcoded API key
   */
  hardcodedApiKey: `const API_KEY = "sk-1234567890abcdef";`,

  /**
   * Hardcoded password
   */
  hardcodedPassword: `const password = "admin123456";`,

  /**
   * Safe: environment variable
   */
  safeEnvironmentVariable: `const apiKey = process.env.API_KEY;`,

  /**
   * Safe: configuration from config file
   */
  safeConfigFile: `const config = require('./config'); const apiKey = config.apiKey;`,
};

export const edgeCaseFixtures = {
  /**
   * Valid hyphenated ID
   */
  validHyphenatedId: {
    id: 'my-valid-extension-name',
    name: 'Valid Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Valid ID with numbers
   */
  validIdWithNumbers: {
    id: 'extension-123',
    name: 'Numeric Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Single digit version numbers
   */
  singleDigitVersion: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '0.0.1',
    manifest_version: '2.0.0',
  },

  /**
   * Maximum length name (100 characters)
   */
  maximumLengthName: {
    id: 'test-extension',
    name: 'x'.repeat(100),
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Minimum length name (1 character)
   */
  minimumLengthName: {
    id: 'test-extension',
    name: 'X',
    version: '1.0.0',
    manifest_version: '2.0.0',
  },

  /**
   * Empty array components (valid)
   */
  emptyComponentsArray: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    ui_components: [],
  },

  /**
   * Empty array navigation (valid)
   */
  emptyNavigationArray: {
    id: 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    manifest_version: '2.0.0',
    navigation: [],
  },

  /**
   * Comment that looks like attack
   */
  commentLooksLikeAttack: `
// This would be an XSS attack: element.innerHTML = userInput;
// But it's just a comment so it's fine
const safeCode = "hello";
`,
};

export const testDataSummary = {
  validManifests: Object.keys(validManifestFixtures).length,
  invalidManifests: Object.keys(invalidManifestFixtures).length,
  codeQualityScenarios: Object.keys(codeQualityFixtures).length,
  securityScenarios: Object.keys(securityFixtures).length,
  edgeCaseScenarios: Object.keys(edgeCaseFixtures).length,
  total:
    Object.keys(validManifestFixtures).length +
    Object.keys(invalidManifestFixtures).length +
    Object.keys(codeQualityFixtures).length +
    Object.keys(securityFixtures).length +
    Object.keys(edgeCaseFixtures).length,
};
