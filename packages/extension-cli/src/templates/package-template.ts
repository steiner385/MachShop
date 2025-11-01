/**
 * Package.json Template
 */

export interface PackageOptions {
  typescript?: boolean;
}

export function createPackageJson(
  name: string,
  type: string,
  options: PackageOptions = {}
): Record<string, unknown> {
  return {
    name: `extension-${name}`,
    version: '1.0.0',
    description: `MachShop ${type} extension`,
    main: options.typescript ? 'dist/index.js' : 'src/index.js',
    types: options.typescript ? 'dist/index.d.ts' : undefined,
    scripts: {
      dev: 'mach-ext dev',
      test: 'mach-ext test',
      build: options.typescript ? 'tsc' : 'echo "No build needed"',
      validate: 'mach-ext validate',
      lint: 'eslint src --ext .ts,.js',
    },
    keywords: [type, 'extension', 'machshop'],
    author: '',
    license: 'MIT',
    devDependencies: options.typescript
      ? {
          typescript: '^5.0.0',
          '@types/node': '^20.0.0',
          eslint: '^8.0.0',
          vitest: '^0.34.0',
        }
      : {
          eslint: '^8.0.0',
          vitest: '^0.34.0',
        },
  };
}
