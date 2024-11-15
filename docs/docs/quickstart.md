---
sidebar_position: 2
---

# Quickstart Guide

## Prerequisites

Before getting started with Eliza, ensure you have:

- [Node.js 23.1.0](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)
- Git for version control
- A code editor ([VS Code](https://code.visualstudio.com/) or [VSCodium](https://vscodium.com) recommended)
- [CUDA Toolkit](https://developer.nvidia.com/cuda-toolkit) (optional, for GPU acceleration)

## Installation

1. **Clone and Install**

Please be sure to check what the [latest available stable version tag](https://github.com/ai16z/eliza/tags) is.

```bash
# Clone the repository
git clone https://github.com/ai16z/eliza.git
# Enter directory
cd eliza
# Switch to tagged release
git checkout v0.0.10

# Install dependencies
pnpm install
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

You set which model to use inside the character JSON file

### Local inference

#### For llama_local inference:

1. Set `XAI_MODEL` to your chosen model
2. Leave `X_SERVER_URL` and `XAI_API_KEY` blank
3. The system will automatically download the model from Hugging Face
4. `LOCAL_LLAMA_PROVIDER` can be blank

Note: llama_local requires a GPU, it currently will not work with CPU inference

#### For Ollama inference:

- If `OLLAMA_SERVER_URL` is left blank, it defaults to `localhost:11434`
- If `OLLAMA_EMBEDDING_MODE` is left blank, it defaults to `mxbai-embed-large`

## Create Your First Agent

1. **Create a Character File**
   Check out `characters/trump.character.json` or `characters/tate.character.json` as a template you can use to copy and customize your agent's personality and behavior.
   Additionally you can read `packages/core/src/defaultCharacter.ts`

You can also load a specific characters only:

```bash
pnpm start --character="characters/trump.character.json"
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
TWITTER_COOKIES=  # Account cookies (auth_token and CT0)
```

### Telegram Bot
1. Create a bot
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
pnpm start
```

### Run Multiple Agents

```bash
pnpm start --characters="characters/trump.character.json,characters/tate.character.json"
```

## Common Issues & Solutions

1. **Node.js Version**

   - Ensure Node.js 23.1.0 is installed
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

4. **Exit Status 1**
   If you see
   ```
   ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @ai16z/agent@0.0.1 start: node --loader ts-node/esm src/index.ts "--isRoot"
   Exit status 1
   ELIFECYCLE Command failed with exit code 1.
   ```

   You can try these steps, which aim to add `@types/node` to various parts of the project

    ```
    # Add dependencies to workspace root
    pnpm add -w -D ts-node typescript @types/node

    # Add dependencies to the agent package specifically
    pnpm add -D ts-node typescript @types/node --filter "@ai16z/agent"

    # Also add to the core package since it's needed there too
    pnpm add -D ts-node typescript @types/node --filter "@ai16z/eliza"

    # First clean everything
    pnpm clean

    # Install all dependencies recursively
    pnpm install -r

    # Build the project
    pnpm build

    # Then try to start
    pnpm start
    ```
5. **Better sqlite3 was compiled against a different Node.js version**
   If you see

   ```
   Error starting agents: Error: The module '.../eliza-agents/dv/eliza/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
   was compiled against a different Node.js version using
   NODE_MODULE_VERSION 131. This version of Node.js requires
   NODE_MODULE_VERSION 127. Please try re-compiling or re-installing
   ```

   You can try this, which will attempt to rebuild better-sqlite3.

   ```bash
   pnpm rebuild better-sqlite3
   ```

## Next Steps

Once you have your agent running, explore:

1. 🤖 [Understand Agents](./core/agents.md)
2. 📝 [Create Custom Characters](./core/characterfile.md)
3. ⚡ [Add Custom Actions](./core/actions.md)
4. 🔧 [Advanced Configuration](./guides/configuration.md)

For detailed API documentation, troubleshooting, and advanced features, check out our [full documentation](https://ai16z.github.io/eliza/).

Join our [Discord community](https://discord.gg/ai16z) for support and updates!
