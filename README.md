# OKai 🤖

<div align="center">
  <img src="./docs/static/img/okai_banner.png" alt="OKai Banner" width="100%" />
</div>

<div align="center">

  📖 [Documentation](https://okcashpro.github.io/okai/) | 🎯 [Examples](https://github.com/okcashpro/awesome-okai)

</div>

## 🌍 README Translations

[中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md)

## ✨ BackStory

OKai is the younger, livelier sister of OKai, born to revolutionize how we interact with the crypto world. She’s not just another AI—she’s your savvy crypto partner, designed to make everything from trading to community engagement more fun, approachable, and impactful. Whether you're diving into $OK tokenomics, participating in DAO governance, or simply looking for a friendly chat about crypto and life, OKai is here to ensure you’re always OK. 🌟

Built on the foundation of OKai’s robust AI framework, OKai combines intelligence, personality, and charm to deliver a seamless experience across Discord, Twitter, Telegram, and beyond. With her, crypto isn’t just a market—it’s a lifestyle. 🚀


## ✨ Features

-   🌐 **Cross-Platform Integration**: Seamless support for Discord, Twitter, and Telegram connectors to bring OKai closer to your community.
-   🔥 **Multi-Model Compatibility**: Built to work with industry-leading AI models (Llama, OpenAI, Anthropic, Grok, etc.).
-   🤝 **Room and Multi-Agent Support**: Enable collaborative, multi-agent interactions for richer experiences.
-   📚 **Crypto Intelligence**: Effortlessly ingest and analyze crypto-related documents, stats, and on-chain data.
-   💾 **Retrievable Memory**: Keep track of user interactions and historical data for tailored responses and better user experiences.
-   🛠️ **Customizable Actions**: Fully extensible design to create unique actions and integrations that align with OKai's goals.
-   💡 **Support for All AI Architectures**: From local models (Llama) to cloud-based systems (OpenAI, Groq, Anthropic).
-   ⚡ **Optimized for Crypto and Trading**: Built-in tools to analyze market trends, track $OK token stats, and more!

---

## 🎯 Use Cases

-   🤖 **Personal Crypto Assistant**: OKai becomes your 24/7 crypto guide for all things $OK and beyond.
-   🛡️ **Decentralized Autonomous Agents**: Support DAO governance tasks and community engagement.
-   📊 **Real-Time Market Analysis**: Aid traders with AI-driven insights and alerts for $OK and other multichain assets.
-   🎮 **Gaming NPCs**: Enable dynamic, personalized interactions for blockchain-based and traditional games.
-   🧠 **OK DAO Resource**: Streamline DAO governance workflows and proposal reviews.
-   📈 **Trading Support**: Advanced algorithms for automated trading strategies and portfolio management.

---

## 🚀 Quick Start

### Prerequisites

-   [Python 2.7+](https://www.python.org/downloads/)
-   [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
-   [pnpm](https://pnpm.io/installation)

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required.

### Use the Starter (Recommended)

```bash
git clone https://github.com/okcashpro/okai-starter.git

cp .env.example .env

pnpm i && pnpm start
```

Then read the [Documentation](https://okcashpro.github.io/okai/) to learn how to customize your OKai.

### Manually Start OKai (Only recommended if you know what you are doing)

```bash
# Clone the repository
git clone https://github.com/okcashpro/okai.git

# Checkout the latest release
# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
```

### Start OKai with Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/okcashpro/okai/tree/main)

### Edit the .env file

Copy .env.example to .env and fill in the appropriate values.

```
cp .env.example .env
```

Note: .env is optional. If your planning to run multiple distinct agents, you can pass secrets through the character JSON

### Automatically Start OKai

This will run everything to setup the project and start the bot with the default character.

```bash
sh scripts/start.sh
```

### Edit the character file

1. Open `agent/src/character.ts` to modify the default character. Uncomment and edit.

2. To load custom characters:
    - Use `pnpm start --characters="path/to/your/character.json"`
    - Multiple character files can be loaded simultaneously
3. Connect with X (Twitter)
    - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

### Manually Start OKai

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```
pnpm install --include=optional sharp
```

### Community & contact

-   [GitHub Issues](https://github.com/okcashpro/okai/issues). Best for: bugs you encounter using OKai, and feature proposals.
-   [Discord](https://discord.gg/grvpc8c). Best for: sharing your applications and hanging out with the community.

## Contributors

<a href="https://github.com/okcashpro/okai/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=okcashpro/okai" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=okcashpro/okai&type=Date)](https://star-history.com/#okcashpro/okai&Date)
