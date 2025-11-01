#!/bin/bash
# Setup Schema Documentation CI/CD Hooks
# Issue #167: SDK & Extensibility: Automated Data Dictionary & CI/CD Integration

set -e

echo "🔧 Setting up Schema Documentation Hooks..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .git directory exists
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    exit 1
fi

# Ensure hooks directory exists
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit Hook: Schema Validation
# Validates schema changes before commit

set -e

# Check if schema.prisma was modified
if git diff --cached --name-only | grep -q "prisma/schema.prisma"; then
    echo "🔍 Validating schema changes..."

    # Run validation
    if ! npx ts-node scripts/schema-validation-hook.ts; then
        echo ""
        echo -e "\033[0;31m❌ Schema validation failed\033[0m"
        echo "Fix schema errors before committing."
        echo ""
        exit 1
    fi
fi

exit 0
EOF

# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push Hook: Schema Validation
# Validates schema changes before pushing

set -e

# Check if schema.prisma was modified
if git diff origin/main..HEAD --name-only | grep -q "prisma/schema.prisma" 2>/dev/null || \
   git diff HEAD~1..HEAD --name-only | grep -q "prisma/schema.prisma" 2>/dev/null; then
    echo "🔍 Validating schema changes before push..."

    # Run validation
    if ! npx ts-node scripts/schema-validation-hook.ts; then
        echo ""
        echo -e "\033[0;31m❌ Schema validation failed\033[0m"
        echo "Fix schema errors before pushing."
        echo ""
        exit 1
    fi
fi

exit 0
EOF

# Create post-commit hook for auto-generating docs
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
# Post-commit Hook: Schema Documentation Generation
# Automatically generates documentation after committing schema changes

# Check if schema was just committed
if git diff HEAD~1..HEAD --name-only | grep -q "prisma/schema.prisma"; then
    echo "📝 Updating schema documentation..."

    # Generate documentation
    if npx ts-node scripts/schema-extractor.ts > /dev/null 2>&1; then
        echo "✅ Schema documentation updated"

        # Stage generated files if they changed
        if ! git diff --quiet docs/generated/ 2>/dev/null; then
            git add docs/generated/ 2>/dev/null || true
        fi
    else
        echo "⚠️  Could not auto-generate documentation"
        echo "   Run 'npm run schema:extract' manually to update docs"
    fi
fi

exit 0
EOF

# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x .git/hooks/post-commit

echo -e "${GREEN}✅ Git Hooks Installed${NC}"
echo ""
echo "Hooks created:"
echo "  - .git/hooks/pre-commit       (validates schema before commit)"
echo "  - .git/hooks/pre-push         (validates schema before push)"
echo "  - .git/hooks/post-commit      (generates documentation after commit)"
echo ""

# Add npm scripts to package.json if not present
if ! grep -q '"schema:extract"' package.json 2>/dev/null; then
    echo "📦 Adding npm scripts to package.json..."

    # Using node to safely add scripts
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!pkg.scripts) pkg.scripts = {};

pkg.scripts['schema:extract'] = 'ts-node scripts/schema-extractor.ts';
pkg.scripts['schema:validate'] = 'ts-node scripts/schema-validation-hook.ts';
pkg.scripts['schema:setup-hooks'] = 'bash scripts/setup-schema-hooks.sh';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ Scripts added');
"
else
    echo -e "${YELLOW}ℹ️  Schema scripts already in package.json${NC}"
fi

echo ""
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo ""
echo "You can now use:"
echo "  npm run schema:extract       Generate schema documentation"
echo "  npm run schema:validate      Validate schema changes"
echo "  npm run schema:setup-hooks   Re-setup hooks"
echo ""
echo "Schema hooks will now:"
echo "  1. Validate on every commit"
echo "  2. Auto-generate docs after commit"
echo "  3. Validate before push"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
