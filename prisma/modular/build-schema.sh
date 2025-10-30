#!/bin/bash

# Prisma Schema Build Process
# Combines modular schema files into single schema.prisma

echo "🔨 Building Prisma schema from modules..."

OUTPUT_FILE="./prisma/schema.prisma"
MODULES_DIR="./prisma/modular/modules"

# Create temporary build directory
mkdir -p ./prisma/build

# Start with base configuration
cat > "$OUTPUT_FILE" << 'EOF'
// This file is auto-generated from modular schema files
// Do not edit directly - modify source files in ./prisma/modular/modules/
// Run 'npm run schema:build' to regenerate

EOF

# Add modules in dependency order
MODULES=(
  "core-foundation.prisma"
  "user-management.prisma"
  "security-access.prisma"
  "material-management.prisma"
  "operations-routing.prisma"
  "parts-bom.prisma"
  "routing-templates.prisma"
  "work-orders.prisma"
  "production-scheduling.prisma"
  "equipment-assets.prisma"
  "quality-management.prisma"
  "time-tracking.prisma"
  "document-management.prisma"
  "audit-compliance.prisma"
  "cost-tracking.prisma"
  "integration-external.prisma"
  "enums.prisma"
  "miscellaneous.prisma"
)

for module in "${MODULES[@]}"; do
  MODULE_FILE="$MODULES_DIR/$module"
  if [ -f "$MODULE_FILE" ]; then
    echo "   ✓ Adding $module"

    # Skip the header for non-first modules
    if [ "$module" != "core-foundation.prisma" ]; then
      tail -n +20 "$MODULE_FILE" >> "$OUTPUT_FILE"
    else
      cat "$MODULE_FILE" >> "$OUTPUT_FILE"
    fi

    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "✅ Schema built successfully: $OUTPUT_FILE"
echo "📊 $(grep -c '^model ' "$OUTPUT_FILE") models, $(grep -c '^enum ' "$OUTPUT_FILE") enums"

# Validate the built schema
npx prisma validate || {
  echo "❌ Schema validation failed"
  exit 1
}

echo "✅ Schema validation passed"
