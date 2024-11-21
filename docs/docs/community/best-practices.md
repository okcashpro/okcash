---
sidebar_position: 5
title: Best Practices
---

# Best Practices for Pull Requests and Contributions

This guide provides essential best practices for submitting Pull Requests (PRs) and contributing effectively to the project. By adhering to these practices, contributors ensure a more efficient workflow, maintain code quality, and facilitate smooth collaboration within the community.

## Pre-Review with AI

Before submitting a Pull Request (PR), we strongly recommend conducting a pre-review using an AI tool, such as [Coderabbit](https://www.coderabbit.ai/), [Sweep](https://www.coderabbit.ai/), [Cursor](https://www.cursor.so/), or language models like OpenAI's ChatGPT, Claude, etc. This preliminary step helps identify potential issues and provides recommendations for improvement before human intervention. Addressing AI-generated feedback allows contributors to enhance the quality of their submission, ensuring that the subsequent human review is more focused, efficient, and substantive.

## Checklist for Each New PR

When creating a new PR, a checklist is automatically included through the PR template. Each item in this checklist must be addressed before the PR can be marked as "Ready for Review"; otherwise, the PR should remain in a draft (WIP) state. Here are some best practices we recommend:

1. **Merge Latest Main**: Ensure your branch is up to date by merging the latest `main` branch (`git merge origin/main`).
2. **Run Tests**: Execute all tests (`pnpm test`) to verify that existing functionalities remain intact and unaffected by your changes.
3. **Draft PR**: If the work is incomplete or requires early feedback, initiate a Draft PR to communicate progress and invite community input.
4. **Review Actions**: Complete all actions outlined in the PR template to ensure that each checklist item has been appropriately addressed.
5. **Category Prefix**: Apply a category prefix to the PR title (e.g., `fix`, `feat`, `refactor`, `docs`) to maintain uniformity and adhere to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This ensures that all contributions are consistent, facilitating better traceability and comprehensibility of changes.

Moreover, each PR should address only a single issue to enhance clarity and manageability. Once a PR is approved, it will be merged by a core developer.

## Pull Request Templates

We offer three PR templates to streamline contributions. The [default template](/.github/pull_request_template.md) is used for changes categorized as `fix`, `feat`, and `refactor`. Additionally, there is a [docs](/.github/pull_request_template/docs.md) template for documentation updates and an [other](/.github/pull_request_template/other.md) template for changes that do not impact production code. If you wish to change the template while previewing a PR, you can do so by adding one of the following parameters to the URL:

- `template=docs.md`
- `template=other.md`

## Squashing Commits

Each PR should be consolidated into a single commit within the `main` branch. This practice contributes to a streamlined commit history, making it easier to comprehend the evolution of the codebase. If a PR contains multiple commits, squash them into a single commit before marking the PR as "Ready for Review." Maintaining a concise and coherent project history is crucial for effective long-term maintenance.

## Linting Your Code

Always execute the linter on your changes before submitting a PR. Linting ensures conformity to the project's style guidelines and helps identify common errors that could otherwise lead to inconsistencies or defects. Proper linting practices improve code readability and facilitate a more efficient review process.

## Running Tests

It is imperative to run all existing tests (`pnpm test`) before creating a PR to ensure that your modifications do not introduce regressions or new bugs. This practice preserves the stability and reliability of the codebase, ensuring that the integration of your changes does not disrupt existing functionality.

## Branching Strategy

All new features and bug fixes must target the `main` branch, except when they are specific to a previously released version. In such scenarios, the bug fix PR should target the respective release branch. If necessary, changes will be backported from the `main` branch to a release branch, excluding any modifications that involve consensus-breaking features or API changes.