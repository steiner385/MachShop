/**
 * Extension Scaffold Generator Command
 *
 * Generates a new extension project with all necessary files, configuration,
 * and boilerplate code for quick onboarding.
 */

import path from 'path';
import fs from 'fs-extra';
import { createProjectStructure } from '../templates/project-structure';
import { createManifest } from '../templates/manifest-template';
import { createPackageJson } from '../templates/package-template';
import { createReadme } from '../templates/readme-template';
import { getExtensionTemplate } from '../templates/extension-templates';

export interface GenerateOptions {
  type: string;
  directory: string;
  typescript?: boolean;
  withTests?: boolean;
  withDocs?: boolean;
}

/**
 * Generate extension scaffold
 */
export async function generateExtension(
  name: string,
  options: GenerateOptions
): Promise<void> {
  try {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Extension name is required');
    }

    // Normalize extension name (kebab-case)
    const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
    const targetDir = path.join(options.directory, `extension-${normalizedName}`);

    // Check if directory already exists
    if (fs.existsSync(targetDir)) {
      throw new Error(`Directory ${targetDir} already exists`);
    }

    console.log(`\n📦 Generating extension scaffold...`);
    console.log(`   Name: ${normalizedName}`);
    console.log(`   Type: ${options.type}`);
    console.log(`   Location: ${targetDir}\n`);

    // Create project structure
    console.log('📁 Creating project structure...');
    createProjectStructure(targetDir, options.type, options.typescript);

    // Create manifest
    console.log('📋 Creating extension manifest...');
    const manifest = createManifest(normalizedName, options.type, {
      typescript: options.typescript,
      includeTests: options.withTests,
      includeDocs: options.withDocs,
    });
    fs.writeJsonSync(
      path.join(targetDir, 'extension.manifest.json'),
      manifest,
      { spaces: 2 }
    );

    // Create package.json
    console.log('📦 Creating package.json...');
    const packageJson = createPackageJson(normalizedName, options.type, {
      typescript: options.typescript,
    });
    fs.writeJsonSync(
      path.join(targetDir, 'package.json'),
      packageJson,
      { spaces: 2 }
    );

    // Create README
    console.log('📝 Creating documentation...');
    const readme = createReadme(normalizedName, options.type);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);

    // Create extension template files
    console.log('🎨 Creating extension template...');
    const extensionTemplate = getExtensionTemplate(options.type, {
      typescript: options.typescript,
      extensionName: normalizedName,
    });
    fs.writeFileSync(
      path.join(
        targetDir,
        'src',
        `index.${options.typescript ? 'ts' : 'js'}`
      ),
      extensionTemplate
    );

    // Create test files if requested
    if (options.withTests) {
      console.log('🧪 Creating test files...');
      const testTemplate = `
// Test suite for ${normalizedName} extension
describe('${normalizedName}', () => {
  it('should initialize successfully', () => {
    expect(true).toBe(true);
  });
});
`;
      fs.writeFileSync(
        path.join(
          targetDir,
          'src',
          `__tests__/index.test.${options.typescript ? 'ts' : 'js'}`
        ),
        testTemplate
      );
    }

    // Create example files if requested
    if (options.withDocs) {
      console.log('📚 Creating example files...');
      const exampleTemplate = `
# ${normalizedName} Extension

This is an example extension implementing the ${options.type} pattern.

## Usage

\`\`\`typescript
import { ${normalizedName} } from './extension-${normalizedName}';

const ext = new ${normalizedName}();
await ext.initialize();
\`\`\`

## Development

\`\`\`bash
npm install
npm run dev
npm test
\`\`\`
`;
      fs.writeFileSync(
        path.join(targetDir, 'EXAMPLES.md'),
        exampleTemplate
      );
    }

    // Create .gitignore
    console.log('🔧 Creating configuration files...');
    const gitignore = `
node_modules/
dist/
build/
*.log
.DS_Store
.env
.env.local
coverage/
.nyc_output/
`;
    fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore.trim());

    // Create tsconfig.json if TypeScript
    if (options.typescript) {
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          declaration: true,
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', '**/*.test.ts'],
      };
      fs.writeJsonSync(
        path.join(targetDir, 'tsconfig.json'),
        tsconfig,
        { spaces: 2 }
      );
    }

    console.log(`\n✅ Extension scaffold created successfully!\n`);
    console.log(`📖 Next steps:`);
    console.log(`   1. cd ${path.relative('.', targetDir)}`);
    console.log(`   2. npm install`);
    console.log(`   3. npm run dev`);
    console.log(`   4. mach-ext validate`);
    console.log(`\n`);
  } catch (error) {
    console.error(`\n❌ Error generating extension: ${error.message}\n`);
    process.exit(1);
  }
}
