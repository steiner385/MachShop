module.exports = {
  stories: [
    '../packages/**/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  env: (config) => ({
    ...config,
    STORYBOOK_DOCS_ENABLED: 'true',
  }),
};
