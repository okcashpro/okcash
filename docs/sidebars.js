/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: "category",
      label: "Getting Started",
      items: ["intro", "quickstart", "installation"],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/basic-usage",
        "guides/configuration",
        "guides/characterfile",
        "guides/advanced",
      ],
    },
  ],
};

export default sidebars;
