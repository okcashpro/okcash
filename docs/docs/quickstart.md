---
sidebar_position: 2
---

# Quickstart Guide

## Prerequisites

Before getting started with Eliza, ensure you have:

- [Node.js 22+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)
- Git for version control
- A code editor (VS Code recommended)
- CUDA Toolkit (optional, for GPU acceleration)

## Installation

1. **Clone and Install**
```bash
# Clone the repository
git clone https://github.com/ai16z/eliza.git
cd eliza

# Install dependencies
pnpm install

# Install optional Sharp package if needed
pnpm install --include=optional sharp
```

2. **Configure Environment**
```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and add your values:
```bash
# Required environment variables
DISCORD_APPLICATION_ID=  # For Discord integration
DISCORD_API_TOKEN=      # Bot token
OPENAI_API_KEY=        # OpenAI API key (starting with sk-*)
ELEVENLABS_XI_API_KEY= # API key from elevenlabs (for voice)
```

## Choose Your Model

Eliza supports multiple AI models:

- **Llama**: Set `XAI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`
- **Grok**: Set `XAI_MODEL=grok-beta`
- **OpenAI**: Set `XAI_MODEL=gpt-4o-mini` or `gpt-4o`

For local inference:
1. Set `XAI_MODEL` to your chosen model
2. Leave `X_SERVER_URL` and `XAI_API_KEY` blank
3. The system will automatically download the model from Hugging Face

## Create Your First Agent

1. **Edit the Character File**
Check out `src/core/defaultCharacter.ts` to customize your agent's personality and behavior.

You can also load custom characters:
```bash
pnpm start --characters="path/to/your/character.json"
```

2. **Start the Agent**
```bash
pnpm start
```

## Platform Integration

### Discord Bot Setup
1. Create a new application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot and get your token
3. Add bot to your server using OAuth2 URL generator
4. Set `DISCORD_API_TOKEN` and `DISCORD_APPLICATION_ID` in your `.env`

### Twitter Integration
Add to your `.env`:
```bash
TWITTER_USERNAME=  # Account username
TWITTER_PASSWORD=  # Account password
TWITTER_EMAIL=    # Account email
TWITTER_COOKIES=  # Account cookies
```

### Telegram Bot
1. Create a bot through [@BotFather](https://t.me/botfather)
2. Add your bot token to `.env`:
```bash
TELEGRAM_BOT_TOKEN=your_token_here
```

## Optional: GPU Acceleration

If you have an NVIDIA GPU:

```bash
# Install CUDA support
npx --no node-llama-cpp source download --gpu cuda

# Ensure CUDA Toolkit, cuDNN, and cuBLAS are installed
```

## Basic Usage Examples

### Chat with Your Agent
```bash
# Start chat interface
pnpm run shell
```

### Run Multiple Agents
```bash
pnpm start --characters="agent1.json,agent2.json"
```

## Common Issues & Solutions

1. **Node.js Version**
   - Ensure Node.js 22+ is installed
   - Use `node -v` to check version
   - Consider using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions

2. **Sharp Installation**
   If you see Sharp-related errors:
   ```bash
   pnpm install --include=optional sharp
   ```

3. **CUDA Setup**
   - Verify CUDA Toolkit installation
   - Check GPU compatibility
   - Ensure proper environment variables are set

## Next Steps

Once you have your agent running, explore:

1. 🤖 [Understand Agents](./core/agents.md)
2. 📝 [Create Custom Characters](./core/characterfile.md)
3. ⚡ [Add Custom Actions](./core/actions.md)
4. 🔧 [Advanced Configuration](./guides/configuration.md)

For detailed API documentation, troubleshooting, and advanced features, check out our [full documentation](https://ai16z.github.io/eliza/).

Join our [Discord community](https://discord.gg/ai16z) for support and updates!
