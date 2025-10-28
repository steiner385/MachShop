# Dependency Management Convention for Claude Code

## 🚨 CRITICAL RULE: Always Save Dependencies to package.json

When installing npm packages in Claude Code sessions, **ALWAYS** use:
- `npm install --save <package>` for production dependencies
- `npm install --save-dev <package>` for development dependencies

**NEVER** run `npm install <package>` without `--save` or `--save-dev`

## Why This Matters

Missing dependencies in package.json causes:
- "Cannot find module" errors on new systems
- CI/CD build failures
- "Works on my machine" problems
- Broken deployments
- Wasted developer time

## Production vs. Development Dependencies

### Production Dependencies (`--save`)
Code that runs in production:
- Express, Prisma, authentication libraries
- Database drivers, ORMs
- Logging, monitoring tools
- Email, file handling libraries
- Any package imported in `src/` code

### Development Dependencies (`--save-dev`)
Tools used only during development/build:
- TypeScript, ts-node, tsx
- Testing frameworks (Jest, Supertest)
- Linting/formatting (ESLint, Prettier)
- Type definitions (@types/*)
- Build tools, dev servers

## Examples

### ✅ Correct Usage
```bash
# Installing a production dependency
npm install --save express-validator

# Installing a dev dependency
npm install --save-dev @types/express-validator

# Installing multiple packages at once
npm install --save zod date-fns uuid

# Installing with specific version
npm install --save jsonwebtoken@^9.0.2
```

### ❌ Incorrect Usage
```bash
# Missing --save flag (DON'T DO THIS!)
npm install express-validator

# Using global install for project dependency (WRONG!)
npm install -g typescript

# Installing without specifying prod vs dev (AMBIGUOUS!)
npm install some-package
```

## Workflow for Adding Dependencies

1. **Identify if production or dev dependency**
   - Does it run in production? → `--save`
   - Only for development/build? → `--save-dev`

2. **Install with correct flag**
   ```bash
   npm install --save <package>        # or
   npm install --save-dev <package>
   ```

3. **Verify it was added to package.json**
   ```bash
   # Check it appears in package.json
   cat package.json | grep <package>
   ```

4. **Validate before committing**
   ```bash
   npm run validate:deps
   ```

## Validation Commands

Before completing any session where dependencies were added:

```bash
# 1. Validate all dependencies are declared
npm run validate:deps

# 2. Verify clean install works
rm -rf node_modules && npm install

# 3. Run tests to ensure nothing broke
npm test

# 4. Check for security vulnerabilities
npm audit
```

## Pre-commit Hook

A pre-commit hook automatically validates dependencies before every commit:
- Scans all import statements in code
- Checks package.json for corresponding entries
- Blocks commit if dependencies are missing
- Provides helpful error messages

If the pre-commit hook fails:
1. Run `npm run validate:deps` to see which packages are missing
2. Add them with `npm install --save <package>` or `npm install --save-dev <package>`
3. Try committing again

## Common Scenarios

### Scenario 1: Adding a new library
```bash
# Want to use express-validator for input validation
npm install --save express-validator
npm install --save-dev @types/express-validator

# Then import in code
import { body, validationResult } from 'express-validator';
```

### Scenario 2: Adding a testing library
```bash
# Want to use supertest for API testing
npm install --save-dev supertest @types/supertest

# Then use in test files
import request from 'supertest';
```

### Scenario 3: Updating dependencies
```bash
# Update all dependencies to latest compatible versions
npm update

# Update a specific package
npm update express

# Check for outdated packages
npm outdated
```

## Troubleshooting

### "Cannot find module 'xyz'" error
**Cause**: Package is imported in code but not in package.json

**Fix**:
```bash
# Check if package exists in package.json
cat package.json | grep xyz

# If missing, add it
npm install --save xyz  # or --save-dev if dev dependency
```

### Pre-commit hook failing
**Cause**: You added code that imports a package not in package.json

**Fix**:
```bash
# See which packages are missing
npm run validate:deps

# Add the missing packages
npm install --save <package>    # for production deps
npm install --save-dev <package>  # for dev deps

# Commit again
git commit -m "your message"
```

### Dependency version conflicts
**Cause**: Multiple packages require incompatible versions of a dependency

**Fix**:
```bash
# See the dependency tree
npm ls <package-name>

# Force resolution (use carefully)
npm install --force

# Or update conflicting packages
npm update
```

## Best Practices

1. **Pin major versions**: Use `^X.Y.Z` format (e.g., `^9.0.2`)
   - Allows minor and patch updates
   - Prevents breaking changes from major version bumps

2. **Keep dependencies up to date**: Review Dependabot PRs weekly
   - Security patches are critical
   - Minor updates usually safe
   - Test before merging major updates

3. **Audit regularly**: Check for vulnerabilities
   ```bash
   npm audit
   npm audit fix  # Auto-fix if possible
   ```

4. **Remove unused dependencies**:
   ```bash
   npm run deps:check-unused
   ```

5. **Document why unusual dependencies are needed**: Add comments in package.json

## Auto-Reminder for Claude Code

**When suggesting an npm install command, Claude Code should ALWAYS include the `--save` or `--save-dev` flag.**

Example patterns:
- ❌ "Run `npm install express-validator`"
- ✅ "Run `npm install --save express-validator`"
- ✅ "Run `npm install --save-dev @types/express-validator`"

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ DEPENDENCY MANAGEMENT QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Production:    npm install --save <package>             │
│ Development:   npm install --save-dev <package>         │
│                                                          │
│ Validate:      npm run validate:deps                    │
│ Audit:         npm audit                                │
│ Update:        npm update                               │
│ Check unused:  npm run deps:check-unused               │
│                                                          │
│ Clean install: rm -rf node_modules && npm install      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Related Documentation

- See [Issue #110](https://github.com/steiner385/MachShop/issues/110) for full dependency management policy
- See `CONTRIBUTING.md` for contribution guidelines
- See `.github/dependabot.yml` for automated update configuration
