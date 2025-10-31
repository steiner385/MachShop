/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a set of docs in the sidebar
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/introduction',
        'getting-started/quick-start',
        'getting-started/authentication',
        'getting-started/making-requests',
        'getting-started/first-api-call',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/authentication-flow',
        'guides/error-handling',
        'guides/pagination',
        'guides/rate-limiting',
        'guides/webhooks-guide',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/overview',
        'api-reference/work-orders',
        'api-reference/operations',
        'api-reference/quality',
        'api-reference/inventory',
      ],
    },
    {
      type: 'category',
      label: 'Webhooks',
      items: [
        'webhooks/overview',
        'webhooks/events',
        'webhooks/receiving-events',
        'webhooks/testing',
        'webhooks/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Plugins & Extensions',
      items: [
        'plugins/overview',
        'plugins/plugin-manifest',
        'plugins/hooks-reference',
        'plugins/ui-plugins',
        'plugins/testing',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/system-overview',
        'architecture/data-models',
        'architecture/authentication-flow',
        'architecture/plugin-system',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/documentation',
        'contributing/style-guide',
        'contributing/code-examples',
      ],
    },
  ],
};

module.exports = sidebars;
