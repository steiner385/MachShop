# MachShop Feature Documentation

This directory contains detailed documentation for major MachShop MES features and systems.

## Available Documentation

### [Unit of Measure System](./unit-of-measure-system.md)
Comprehensive documentation for the standardized UOM lookup table system implemented across all manufacturing operations.

**Key Features:**
- 53 standard manufacturing units (EA, KG, LB, GAL, etc.)
- Dual-field architecture for backward compatibility
- Automatic FK resolution across 21+ database tables
- Case-insensitive UOM code handling
- 97.7% successful production migration

**Related Files:**
- [Technical Implementation Guide](../development/uom-implementation-guide.md)
- [Migration Reports](../generated/uom-migration-*)

## Developer Resources

### [Development Guides](../development/)
Technical implementation guides for developers working with MachShop features.

### [Generated Documentation](../generated/)
Auto-generated documentation including:
- Database schema documentation
- API documentation
- Migration reports
- Coverage reports

## Contributing

When adding new features to MachShop:

1. Create feature documentation in this directory
2. Add technical implementation guide in `../development/`
3. Update the main README.md with feature description
4. Include example usage and best practices
5. Document any migration requirements

## Support

For questions about documented features:
- Check the technical implementation guides
- Review generated migration reports
- Consult the main MachShop documentation
- Create GitHub issues for clarification

*Last updated: October 30, 2025*