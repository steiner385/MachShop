// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MES Developer Portal',
  tagline: 'Build integrations and plugins for Manufacturing Execution System',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://developers.mes.company.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'steiner385',
  projectName: 'MachShop',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is in Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/steiner385/MachShop/tree/main/developer-portal/',
          routeBasePath: '/',
          remarkPlugins: [require('remark-math')],
          rehypePlugins: [require('rehype-katex')],
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/steiner385/MachShop/tree/main/developer-portal/',
          routeBasePath: '/changelog',
          blogTitle: 'API Changelog',
          blogDescription: 'All API changes, deprecations, and feature releases',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'MES Developer Portal',
        logo: {
          alt: 'MES Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          {
            label: 'API Reference',
            position: 'left',
            to: '/api-reference',
          },
          {
            label: 'Guides',
            position: 'left',
            to: '/guides/authentication',
          },
          {
            label: 'Changelog',
            position: 'left',
            to: '/changelog',
          },
          {
            href: 'https://github.com/steiner385/MachShop',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/',
              },
              {
                label: 'API Reference',
                to: '/api-reference',
              },
              {
                label: 'Webhooks',
                to: '/webhooks',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/steiner385/MachShop/discussions',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/mes-developers',
              },
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/mes-api',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Status Page',
                href: 'https://status.mes.company.com',
              },
              {
                label: 'Support',
                href: 'mailto:developers@mes.company.com',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/steiner385/MachShop',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} MES Developer Portal. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['typescript', 'python', 'csharp', 'java', 'bash'],
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 70,
        max: 1030,
        min: 640,
        steps: 2,
        disableInlineStyle: false,
      },
    ],
  ],
};

module.exports = config;
