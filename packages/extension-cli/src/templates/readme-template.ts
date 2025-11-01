/**
 * README.md Template
 */

export function createReadme(name: string, type: string): string {
  return `# extension-${name}

A MachShop ${type} extension for [description].

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Deployment

\`\`\`bash
mach-ext validate
mach-ext deploy production
\`\`\`

## Documentation

- [Extension Manifest Guide](../extension-sdk/MANIFEST_IMPLEMENTATION.txt)
- [Lifecycle Management](../extension-sdk/LIFECYCLE_GUIDE.md)
- [Extension Routing](../extension-sdk/EXTENSION_ROUTING_GUIDE.md)

## License

MIT
`;
}
