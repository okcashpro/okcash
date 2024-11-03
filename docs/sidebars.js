/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "category",
      label: "Getting Started",
      items: ["quickstart", "installation"],
      collapsed: false,
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: [
        "core/character-files",
        "core/agents",
        "core/providers",
        "core/actions",
        "core/evaluators",
      ],
    },
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: [
        "guides/basic-usage",
        "guides/configuration",
        "guides/characterfile",
        "guides/advanced",
        "guides/secrets-management",
        "guides/local-development",
      ],
    },
    {
      type: "category",
      label: "Advanced Topics",
      collapsed: false,
      items: [
        "advanced/fine-tuning",
        "advanced/infrastructure",
        "advanced/trust-engine",
        "advanced/autonomous-trading",
      ],
    },
    {
      type: "category",
      label: "Community",
      collapsed: false,
      items: [
        "community/project-overview",
        "community/spaces-notes",
        "community/development-notes",
        "community/contributing",
      ],
    },
  ],
};

export default sidebars;
