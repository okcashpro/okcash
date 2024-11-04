---
sidebar_position: 1
---

# Introduction

![](/img/eliza_banner.jpg)

_As seen powering [@DegenSpartanAI](https://x.com/degenspartanai) and [@MarcAIndreessen](https://x.com/pmairca)_

## What is Eliza?

Eliza is a flexible, production-ready framework for building intelligent agents. It provides a comprehensive set of tools and abstractions that enable developers to create sophisticated AI agents tailored to their specific needs.

As a batteries-included framework, Eliza comes with:
- Built-in database integration through Supabase and SQLite
- Production-ready deployment options via Cloudflare
- Extensive content processing capabilities
- Multi-platform deployment support

## Key Features

### 🤖 Multi-Agent Architecture
- Create unlimited unique characters using [characterfile](https://github.com/lalalune/characterfile/)
- Run multiple agents simultaneously with different personalities
- Support for both stateful and stateless patterns
- Extensible action and evaluator system

### 🧠 Memory and Knowledge
- Full conversational and document RAG memory
- Process various content types:
  - Link scraping and analysis
  - PDF parsing and understanding
  - Audio transcription
  - Video content extraction
  - Conversation summarization
- Built-in knowledge tools:
  ```bash
  npx folder2knowledge <path/to/folder>
  npx knowledge2character <character-file> <knowledge-file>
  npx tweets2character
  ```

### 🔌 Platform Integration
- Discord integration with voice channel support
- Twitter connector for social media interactions
- Extensible client system for custom integrations

### 🛠 Model Support
- Default: Nous Hermes Llama 3.1B for local inference
- Cloud options:
  - OpenAI models for scalable deployment
  - Claude integration for complex queries
- LocalAI compatibility for custom models

### 💾 Database Support
- SQLite for local development
- Supabase for production deployment
- Custom database adapter support

## Core Concepts

Eliza is built around several key concepts that enable flexible and powerful agent development:

1. **Actions**: Define behaviors and responses
2. **Evaluators**: Process and analyze interactions
3. **State & Context**: Maintain coherent interactions
4. **Memories**: Store and retrieve interaction data
5. **Messages**: Handle core communication
6. **Goals**: Track objectives and tasks
7. **Relationships**: Manage entity connections
8. **Database Adapters**: Handle data persistence

For details on these concepts, see the [Key Concepts](../api/concepts) guide.

## Ready to Start?

1. [Quickstart Guide](./quickstart) - Get up and running quickly
2. [Installation Guide](./installation) - Detailed setup instructions
3. [Character Files](./guides/characterfile) - Learn to create AI personalities

## Community and Support

- [GitHub](https://github.com/ai16z/eliza) - Source code and issues
- [Discord](https://discord.gg/ai16z) - Real-time discussion
- [Twitter](https://x.com/ai16zdao) - Updates and announcements
