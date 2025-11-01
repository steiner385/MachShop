/**
 * Project Structure Template
 *
 * Creates the directory structure for new extension projects.
 */

import path from 'path';
import fs from 'fs-extra';

/**
 * Create project directory structure
 */
export function createProjectStructure(
  targetDir: string,
  extensionType: string,
  useTypeScript: boolean
): void {
  // Create base directories
  const dirs = [
    targetDir,
    path.join(targetDir, 'src'),
    path.join(targetDir, 'src', '__tests__'),
    path.join(targetDir, 'src', 'components'),
    path.join(targetDir, 'src', 'utils'),
    path.join(targetDir, 'dist'),
    path.join(targetDir, '.github'),
    path.join(targetDir, '.github', 'workflows'),
  ];

  dirs.forEach((dir) => {
    fs.ensureDirSync(dir);
  });

  // Create type-specific directories
  switch (extensionType) {
    case 'ui-component':
      fs.ensureDirSync(path.join(targetDir, 'src', 'styles'));
      break;
    case 'business-logic':
      fs.ensureDirSync(path.join(targetDir, 'src', 'handlers'));
      break;
    case 'data-model':
      fs.ensureDirSync(path.join(targetDir, 'src', 'models'));
      fs.ensureDirSync(path.join(targetDir, 'src', 'migrations'));
      break;
    case 'integration':
      fs.ensureDirSync(path.join(targetDir, 'src', 'adapters'));
      fs.ensureDirSync(path.join(targetDir, 'src', 'mappers'));
      break;
    case 'compliance':
      fs.ensureDirSync(path.join(targetDir, 'src', 'rules'));
      fs.ensureDirSync(path.join(targetDir, 'src', 'validators'));
      break;
    case 'infrastructure':
      fs.ensureDirSync(path.join(targetDir, 'src', 'services'));
      fs.ensureDirSync(path.join(targetDir, 'src', 'config'));
      break;
  }
}
