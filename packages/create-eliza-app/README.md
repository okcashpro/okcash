# create-eliza-app

A minimal CLI tool to scaffold ELIZA applications with zero configuration. Get started building your own ELIZA-style chatbot in seconds.

<!-- automd:badges color="yellow" license name="create-eliza-app" codecov bundlephobia packagephobia -->

[![npm version](https://img.shields.io/npm/v/defu?color=yellow)](https://npmjs.com/package/defu)
[![npm downloads](https://img.shields.io/npm/dm/defu?color=yellow)](https://npm.chart.dev/defu)
[![bundle size](https://img.shields.io/bundlephobia/minzip/defu?color=yellow)](https://bundlephobia.com/package/defu)

<!-- /automd -->

## Usage

You can create a new ELIZA app with your preferred package manager:

<!-- automd:pm-x version="latest" name="create-eliza-app" args="path" <flags>" -->

```sh
# npm
npx create-eliza-app@latest path

# pnpm
pnpm dlx create-eliza-app@latest path

# bun
bunx create-eliza-app@latest path

# deno
deno run -A npm:create-eliza-app@latest path
```

<!-- /automd -->

## Options

```bash
# Basic usage (creates in current directory)
pnpm create eliza-app

# Create in specific directory
pnpm create eliza-app --dir my-project

# Use a custom template
pnpm create eliza-app --name custom-template

# Use a different template registry
pnpm create eliza-app --registry https://my-registry.com/templates
```

## Command Line Arguments

-   `--name`: Name of the template to use (default: "eliza")
-   `--dir`: Directory where the project will be created (default: current directory)
-   `--registry`: Custom registry URL for templates

## Getting Started

Once your project is created:

1. Navigate to the project directory:

    ```bash
    cd your-project-name
    ```

2. Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

3. Install dependencies:

    ```bash
    pnpm install
    ```

4. Start the development server:
    ```bash
    pnpm start
    ```

<!-- automd:with-automd -->

---

_🤖 auto updated with [automd](https://automd.unjs.io)_

<!-- /automd -->
