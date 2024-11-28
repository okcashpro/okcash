import { themes as prismThemes } from "prism-react-renderer";

const config = {
  title: "eliza",
  tagline: "Flexible, scalable AI agents for everyone",
  favicon: "img/favicon.ico",
  url: "https://ai16z.github.io",
  baseUrl: "/eliza/",
  organizationName: "ai16z",
  projectName: "eliza",
  deploymentBranch: "gh-pages",
  trailingSlash: true,
  onBrokenLinks: "ignore",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],
  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../packages/core/src/index.ts"],
        tsconfig: "../tsconfig.json",
        out: "./api",
        skipErrorChecking: true,
        excludeExternals: false,
        excludePrivate: true,
        excludeProtected: false,
        excludeInternal: false,
        excludeNotDocumented: false,
        plugin: ["typedoc-plugin-markdown"],
        hideGenerator: true,
        cleanOutputDir: true,
        categorizeByGroup: true,
        pretty: true,
        includeVersion: true,
        sort: ["source-order", "required-first", "visibility"],
        gitRevision: "main",
        readme: "none",
        commentStyle: "all",
        preserveAnchorCasing: true,
        hideBreadcrumbs: false,
        preserveWatchOutput: true,
        disableSources: false,
        validation: {
          notExported: true,
          invalidLink: true,
          notDocumented: false,
        },
        exclude: [
          "**/_media/**",
          "**/node_modules/**",
          "**/dist/**",
          "**/*.test.ts",
          "**/*.spec.ts",
        ],
        watch: false,
        treatWarningsAsErrors: true,
        treatValidationWarningsAsErrors: true,
        searchInComments: true,
        navigationLinks: {
          GitHub: "https://github.com/ai16z/eliza",
          Documentation: "/docs/intro",
        },
      },
    ],
    require.resolve("docusaurus-lunr-search"),
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "api",
        path: "api",
        routeBasePath: "api",
      },
    ],
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/ai16z/eliza/tree/main/docs/",
          routeBasePath: "docs",
          exclude: ["**/_media/**"],
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
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
              href: "https://discord.gg/ai16z",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/ai16zdao",
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
  },
};

export default config;
