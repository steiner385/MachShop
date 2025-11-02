import '../manufacturing-operations/src/styles/globals.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  docs: {
    autodocs: true,
  },
  a11y: {
    config: {
      rules: [
        {
          id: 'color-contrast',
          enabled: true,
        },
        {
          id: 'heading-order',
          enabled: true,
        },
        {
          id: 'image-alt',
          enabled: true,
        },
      ],
    },
  },
};

export const decorators = [
  (Story) => (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <Story />
    </div>
  ),
];

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: ['light', 'dark'],
    },
  },
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en-US',
    toolbar: {
      icon: 'globe',
      items: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
    },
  },
};
