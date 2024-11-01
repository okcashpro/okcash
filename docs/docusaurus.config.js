// @ts-check
import { themes as prismThemes } from "prism-react-renderer";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "eliza",
  tagline: "The flexible, scalable AI agent for everyone",
  favicon: "img/favicon.ico",
  url: "https://docs.ai16z.ai",
  baseUrl: "/",
  organizationName: "ai16z",
  projectName: "eliza",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    // TypeDoc plugin for API documentation
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["src/index.ts"],
        tsconfig: "../core/tsconfig.json",
        out: "./api", // Changed to output directly to api folder
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
      // ... rest of themeConfig remains the same
    }),
};

export default config;
