# @machshop/extension-cli

🛠️ **MachShop Extension Developer CLI** - Build, validate, test, and deploy extensions with ease.

## Features

✨ **Extension Scaffolding** - Generate new extension projects from templates
🔍 **Manifest Validation** - Validate extensions against official schema
🚀 **Dev Server** - Local development server with hot reloading
🧪 **Testing Utilities** - Run tests with multiple output formats
📦 **Deployment Tools** - Deploy extensions to any environment
🎯 **6 Extension Types** - UI Components, Business Logic, Data Models, Integrations, Compliance, Infrastructure

## Quick Start

```bash
# Install globally
npm install -g @machshop/extension-cli

# Generate new extension
mach-ext generate my-extension --typescript --with-tests

# Start development
cd extension-my-extension
mach-ext dev --watch --hot

# Run tests
mach-ext test --coverage

# Deploy
mach-ext deploy production
```

## Commands

| Command | Description |
|---------|-------------|
| `generate <name>` | Scaffold new extension project |
| `validate [path]` | Validate extension manifest |
| `dev` | Start local development server |
| `test [path]` | Run extension tests |
| `deploy <env>` | Deploy to target environment |

## Extension Types

- **ui-component** - React UI components
- **business-logic** - Business logic handlers
- **data-model** - Custom data models
- **integration** - External system connectors
- **compliance** - Compliance and validation rules
- **infrastructure** - Infrastructure services

## Documentation

📖 See [CLI_GUIDE.md](./CLI_GUIDE.md) for comprehensive documentation

## Requirements

- Node.js 16+
- npm or yarn

## Development

```bash
# Build from source
npm run build

# Run CLI in development
npm run dev -- generate test-ext

# Run tests
npm test

# Lint code
npm run lint
```

## Contributing

Contributions welcome! Please ensure:
- All tests pass
- Code is linted
- Changes are documented

## License

MIT

## Support

- 📚 [Documentation](./CLI_GUIDE.md)
- 🐛 [Report Issues](https://github.com/steiner385/MachShop/issues)
- 💬 [Community Forum](https://machshop.community)
