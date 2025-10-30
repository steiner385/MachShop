#!/bin/bash

# Prisma Documented Schema Build Process
# Combines documented modular schema files into single schema.prisma

echo "🔨 Building documented Prisma schema from modules..."

OUTPUT_FILE="./prisma/schema.documented.prisma"
MODULES_DIR="prisma/modular/modules/documented"

# Create temporary build directory
mkdir -p ./prisma/build

# Start with base configuration from first module file
FIRST_MODULE_FILE=$(find "$MODULES_DIR" -name "*.prisma" | head -1)
if [ -f "$FIRST_MODULE_FILE" ]; then
  echo "   📄 Extracting schema header from $(basename "$FIRST_MODULE_FILE")"

  # Extract header from first module (up to first model/enum)
  awk '
    /^(model|enum)/ { exit }
    { print }
  ' "$FIRST_MODULE_FILE" > "$OUTPUT_FILE"

  echo "" >> "$OUTPUT_FILE"
  echo "// Auto-generated from documented modular schema files" >> "$OUTPUT_FILE"
  echo "// Generated: $(date)" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
fi

# Process all module files (skip header for each)
for module_file in "$MODULES_DIR"/*.prisma; do
  if [ -f "$module_file" ]; then
    module_name=$(basename "$module_file")
    echo "   ✓ Adding $module_name"

    # Skip header lines (until first model/enum), add content
    awk '
      /^(model|enum)/ { found_content = 1 }
      found_content { print }
      /^\/\/ ====================================================================/ && !found_content { print; found_content = 1; next }
      found_content && /^\/\/ ====================================================================/ { print }
    ' "$module_file" >> "$OUTPUT_FILE"

    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "✅ Documented schema built successfully: $OUTPUT_FILE"
echo "📊 $(grep -c '^model ' "$OUTPUT_FILE") models, $(grep -c '^enum ' "$OUTPUT_FILE") enums"

# Validate the built schema
echo "🔍 Validating documented schema..."
if npx prisma validate --schema="$OUTPUT_FILE"; then
  echo "✅ Schema validation passed"
else
  echo "❌ Schema validation failed"
  exit 1
fi

echo "📋 Documentation statistics:"
echo "   - $(grep -c '/\*\*' "$OUTPUT_FILE") table documentation blocks"
echo "   - $(grep -c '///' "$OUTPUT_FILE") field documentation lines"
