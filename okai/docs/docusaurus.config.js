import { themes as prismThemes } from "prism-react-renderer";
import dotenv from "dotenv";

dotenv.config();

const config = {
  title: "okai",
  tagline: "Flexible, scalable AI agents for everyone",
  favicon: "img/favicon.ico",
  url: "https://okcashpro.github.io",
  baseUrl: "/okai/",
  organizationName: "OK",
  projectName: "okai",
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
      "@docusaurus/plugin-content-docs",
      {
        id: "community",
        path: "community",
        routeBasePath: "community",
        sidebarItemsGenerator: async function ({defaultSidebarItemsGenerator, ...args}) {
          const sidebarItems = await defaultSidebarItemsGenerator(args);
          return sidebarItems.map(item => {
            if (item.type === 'category') {
              switch(item.label.toLowerCase()) {
                case 'streams':
                  item.label = '📺 ' + item.label;
                  break;
                case 'development':
                  item.label = '💻 ' + item.label;
                  break;
                case 'the_arena':
                  item.label = '🏟️ ' + item.label;
                  break;
                default:
                  item.label = '📄 ' + item.label;
              }
            }
            return item;
          })
          .sort((a, b) => {
            const labelA = a.label || ''; // Ensure `label` exists
            const labelB = b.label || ''; // Ensure `label` exists
            return labelA.localeCompare(labelB, undefined, { numeric: true });
          });
        }
      }
    ],
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../packages/core/src/index.ts"],
        tsconfig: "../packages/core/tsconfig.json",
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
          GitHub: "https://github.com/okcashpro/okai",
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
          editUrl: "https://github.com/okcashpro/okai/tree/main/docs/",
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
      title: "okai",
      logo: {
        alt: "OKai Logo",
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
          type: "doc",
          docsPluginId: "community",
          position: "left",
          label: "Community",
          docId: "index",
        },
        {
          href: "https://github.com/okcashpro/okai",
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
              href: "https://discord.gg/grvpc8c",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/OKdao",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/okcashpro/okai",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OK`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
  customFields: {
    GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
  },
};

export default config;
