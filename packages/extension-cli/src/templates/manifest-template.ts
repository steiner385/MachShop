/**
 * Extension Manifest Template
 *
 * Generates extension.manifest.json for new projects.
 */

export interface ManifestOptions {
  typescript?: boolean;
  includeTests?: boolean;
  includeDocs?: boolean;
}

/**
 * Create extension manifest
 */
export function createManifest(
  name: string,
  type: string,
  options: ManifestOptions = {}
): Record<string, unknown> {
  const manifest: Record<string, unknown> = {
    name,
    type,
    version: '1.0.0',
    description: `${type} extension: ${name}`,
    author: 'Your Name',
    license: 'MIT',
    keywords: [type],
    main: options.typescript ? 'dist/index.js' : 'src/index.js',
    types: options.typescript ? 'dist/index.d.ts' : undefined,

    // Extension metadata
    extension: {
      id: name,
      displayName: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: `${type} extension: ${name}`,
      category: type,
      version: '1.0.0',
      minimumVersion: '1.0.0',
      maximumVersion: '*',
      tags: [type, 'extension'],
    },

    // Permissions required
    permissions: [],

    // Dependencies
    dependencies: [],

    // Entry points
    entryPoints: {
      main: options.typescript ? 'dist/index.js' : 'src/index.js',
    },

    // Scripts
    scripts: {
      dev: 'mach-ext dev',
      test: 'mach-ext test',
      build: 'tsc',
      validate: 'mach-ext validate',
      deploy: 'mach-ext deploy production',
    },

    // Repository
    repository: {
      type: 'git',
      url: 'https://github.com/example/extension-' + name,
    },

    // Bugs
    bugs: {
      url: 'https://github.com/example/extension-' + name + '/issues',
    },

    // Homepage
    homepage: 'https://github.com/example/extension-' + name,
  };

  return manifest;
}
