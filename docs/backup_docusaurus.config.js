// @ts-check
import { themes as prismThemes } from "prism-react-renderer";
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "eliza",
  tagline: "The flexible, scalable AI agent for everyone",
  favicon: "img/favicon.ico",

  // GitHub Pages Configuration
  url: "https://ai16z.github.io",
  baseUrl: "/eliza/",
  organizationName: "ai16z",
  projectName: "eliza",
  deploymentBranch: "gh-pages",
  trailingSlash: true,
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  markdown: {
    mermaid: true,
  },
  themes: [
    "@docusaurus/theme-mermaid",
    // Any other themes...
  ],
  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../packages/core/src/index.ts"],
        tsconfig: "../packages/core/src/tsconfig.json",
        out: "./api",
        skipErrorChecking: true,
        excludeExternals: true,
        excludeProtected: true,
        excludePrivate: true,
        stripInternal: true, // Add this
        excludeNotDocumented: true, // Add this
        cleanOutputDir: true,
        hideGenerator: true,
        exclude: ["**/_media/**", "**/node_modules/**"],
        excludeReferences: true,
      },
    ],
    // Search functionality
    require.resolve("docusaurus-lunr-search"),
    // Separate API docs plugin instance
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "api",
        path: "api",
        routeBasePath: "api",
        sidebarPath: "./sidebars.api.js",
      },
    ],
  ],
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/ai16z/eliza/tree/main/docs/",
          routeBasePath: "docs",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Enable dark mode by default
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      // Add sidebar configuration
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      navbar: {
        title: "eliza",
        logo: {
          alt: "Eliza Logo",
          src: "img/favicon.ico",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Documentation",
          },
          {
            type: "doc",
            docsPluginId: "api",
            position: "left",
            label: "API",
            docId: "index",
          },
          {
            href: "https://github.com/ai16z/eliza",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "General",
                href: "./",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Discord",
                href: "https://discord.gg/NQHKW7US",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/pmairca",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/ai16z/eliza",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ai16z.ai`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};
export default config;
