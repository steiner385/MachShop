#!/bin/bash

# Generate Data Dictionary Documentation
# This script generates comprehensive database documentation from the Prisma schema

set -e

echo "🚀 MachShop Data Dictionary Generation"
echo "======================================"

# Configuration
SCHEMA_PATH="./prisma/schema.prisma"
OUTPUT_DIR="./docs/generated"
TOOLS_DIR="./src/tools"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi

    # Check if tsx is available
    if ! command -v npx &> /dev/null; then
        log_error "npx is required but not installed"
        exit 1
    fi

    # Check if Prisma schema exists
    if [ ! -f "$SCHEMA_PATH" ]; then
        log_error "Prisma schema not found at $SCHEMA_PATH"
        exit 1
    fi

    # Check if tools directory exists
    if [ ! -d "$TOOLS_DIR" ]; then
        log_error "Tools directory not found at $TOOLS_DIR"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create output directory
create_output_dir() {
    log_info "Preparing output directory..."

    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"

    # Create data dictionary assets directory
    mkdir -p "$OUTPUT_DIR/../data-dictionary/assets/data"

    log_success "Output directory prepared: $OUTPUT_DIR"
}

# Generate documentation
generate_documentation() {
    log_info "Generating comprehensive data dictionary..."

    # Run the data dictionary generator
    npx tsx "$TOOLS_DIR/generate-data-dictionary.ts" \
        --schema "$SCHEMA_PATH" \
        --output "$OUTPUT_DIR" \
        --formats all \
        --verbose

    if [ $? -eq 0 ]; then
        log_success "Data dictionary generation completed"
    else
        log_error "Data dictionary generation failed"
        exit 1
    fi
}

# Copy generated files to data dictionary assets
copy_to_assets() {
    log_info "Copying metadata to data dictionary assets..."

    # Copy JSON metadata for interactive use
    if [ -f "$OUTPUT_DIR/schema-metadata.json" ]; then
        cp "$OUTPUT_DIR/schema-metadata.json" "$OUTPUT_DIR/../data-dictionary/assets/data/"
        log_success "Metadata copied to assets directory"
    fi
}

# Update existing ERD if Prisma generate is available
update_erd() {
    log_info "Updating ERD documentation..."

    # Check if prisma generate can update ERD
    if command -v prisma &> /dev/null; then
        log_info "Running Prisma generate to update ERD..."
        npx prisma generate
        log_success "ERD updated via Prisma generate"
    else
        log_warning "Prisma CLI not available, ERD update skipped"
    fi
}

# Generate summary report
generate_summary() {
    log_info "Generating documentation summary..."

    echo "# Data Dictionary Generation Summary" > "$OUTPUT_DIR/generation-log.md"
    echo "" >> "$OUTPUT_DIR/generation-log.md"
    echo "**Generated:** $(date)" >> "$OUTPUT_DIR/generation-log.md"
    echo "**Schema Path:** $SCHEMA_PATH" >> "$OUTPUT_DIR/generation-log.md"
    echo "**Output Directory:** $OUTPUT_DIR" >> "$OUTPUT_DIR/generation-log.md"
    echo "" >> "$OUTPUT_DIR/generation-log.md"
    echo "## Generated Files" >> "$OUTPUT_DIR/generation-log.md"

    # List generated files with sizes
    for file in "$OUTPUT_DIR"/*.{md,html,csv,json}; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            size=$(du -h "$file" | cut -f1)
            echo "- **$filename** ($size)" >> "$OUTPUT_DIR/generation-log.md"
        fi
    done

    log_success "Summary report generated"
}

# Validate generated files
validate_output() {
    log_info "Validating generated documentation..."

    local required_files=(
        "schema-tables.md"
        "data-dictionary.html"
        "schema-export.csv"
        "schema-metadata.json"
        "schema-relationships.md"
        "schema-summary.md"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [ ! -f "$OUTPUT_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "All expected files generated successfully"
    else
        log_warning "Missing files: ${missing_files[*]}"
    fi

    # Check file sizes to ensure they're not empty
    for file in "${required_files[@]}"; do
        if [ -f "$OUTPUT_DIR/$file" ]; then
            size=$(stat -c%s "$OUTPUT_DIR/$file" 2>/dev/null || stat -f%z "$OUTPUT_DIR/$file")
            if [ "$size" -lt 100 ]; then
                log_warning "$file appears to be empty or very small ($size bytes)"
            fi
        fi
    done
}

# Show completion message
show_completion() {
    echo ""
    echo "🎉 Data Dictionary Generation Complete!"
    echo "======================================"
    echo ""
    echo "📁 Generated files are available in: $OUTPUT_DIR"
    echo ""
    echo "📖 Quick access:"
    echo "   • Main documentation: $OUTPUT_DIR/schema-tables.md"
    echo "   • Interactive HTML: $OUTPUT_DIR/data-dictionary.html"
    echo "   • CSV export: $OUTPUT_DIR/schema-export.csv"
    echo "   • JSON metadata: $OUTPUT_DIR/schema-metadata.json"
    echo ""
    echo "🌐 To view the interactive data dictionary:"
    echo "   open $OUTPUT_DIR/data-dictionary.html"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    create_output_dir
    generate_documentation
    copy_to_assets
    update_erd
    generate_summary
    validate_output
    show_completion
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --validate     Only validate existing documentation"
        echo "  --quick        Skip ERD update for faster generation"
        echo ""
        echo "Environment Variables:"
        echo "  SCHEMA_PATH    Path to Prisma schema (default: ./prisma/schema.prisma)"
        echo "  OUTPUT_DIR     Output directory (default: ./docs/generated)"
        echo ""
        exit 0
        ;;
    --validate)
        log_info "Validating existing documentation..."
        validate_output
        exit 0
        ;;
    --quick)
        log_info "Quick mode: Skipping ERD update"
        check_prerequisites
        create_output_dir
        generate_documentation
        copy_to_assets
        generate_summary
        validate_output
        show_completion
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        log_info "Use --help for usage information"
        exit 1
        ;;
esac