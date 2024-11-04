---
sidebar_position: 5
---

# Basic Usage

This guide covers the fundamental concepts and patterns for using Eliza in your applications.

## Prerequisites

- Node.js 20+ required
- PNPM for package management

## Installation

```bash
pnpm install eliza

# Database adapters
pnpm install sqlite-vss better-sqlite3 # for SQLite (local development)
pnpm install @supabase/supabase-js # for Supabase (production)

# Optional - for Linux
pnpm install --include=optional sharp
```

## Environment Setup

Copy .env.example to .env and configure:

```bash
# Required
OPENAI_API_KEY="sk-*" # OpenAI API key, starting with sk-
XAI_MODEL="gpt-4o-mini" # Model selection (see below)

# Model Selection Options
XAI_MODEL=gpt-4o-mini                                   # OpenAI GPT-4
XAI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo # Llama 70B
XAI_MODEL=meta-llama/Meta-Llama-3.1-405B-Instruct      # Llama 405B
XAI_MODEL=grok-beta                                     # Grok  

# Optional - Model Configuration
LOCALAI_URL="http://localhost:8080"
LOCALAI_TOKEN="your-token"
ANTHROPIC_API_KEY="your-claude-api-key"

# Optional - Database (for production)
POSTGRES_URL="postgres://user:pass@host:5432/db"  # Add this line
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_SERVICE_API_KEY="your-supabase-service-api-key"

# Optional - Platform Integration
DISCORD_TOKEN="your-discord-token"
TELEGRAM_BOT_TOKEN="your-telegram-token"
TWITTER_USERNAME="your-twitter-username"
TWITTER_PASSWORD="your-twitter-password"

# Optional - Voice Support
ELEVENLABS_XI_API_KEY="your-elevenlabs-key"
ELEVENLABS_MODEL_ID="eleven_multilingual_v2"
ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000
```

## Creating an Agent Runtime

Initialize with SQLite (local development):

```typescript
import { createAgentRuntime, Database } from "eliza";
import { initializeDatabase, ModelProvider } from "eliza";

// Initialize database (SQLite locally, Postgres in production)
const db = initializeDatabase();

// Get token for model provider (supports character-specific keys)
const token = getTokenForProvider(ModelProvider.OPENAI, character);

// Create runtime with default configuration
const runtime = await createAgentRuntime(
  character,
  db,
  token,
  "./elizaConfig.yaml"
);
```

For production with Supabase:

```typescript
import { SupabaseDatabaseAdapter } from "eliza";

const db = new SupabaseDatabaseAdapter(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_API_KEY
);
```

## Working with Characters

You can either:
- Modify the default character in `src/core/defaultCharacter.ts`
- Create a custom character file:

```json
{
  "name": "character_name",
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "optional-character-specific-key",
      "CLAUDE_API_KEY": "optional-character-specific-key"
    }
  },
  "bio": [],
  "lore": [],
  "knowledge": [],
  "messageExamples": [],
  "postExamples": [],
  "topics": [],
  "style": {},
  "adjectives": [],
  "clients": ["discord", "telegram", "twitter"]
}
```

Load characters:

```bash
node --loader ts-node/esm src/index.ts --characters="path/to/your/character.json"
```

## Basic Memory Management

Process documents and text:

```typescript
// Basic document processing
await runtime.processDocument("path/to/document.pdf");
await runtime.processUrl("https://example.com");
await runtime.processText("Important information");
```

Use built-in knowledge tools:

```bash
npx folder2knowledge <path/to/folder>
npx knowledge2character <character-file> <knowledge-file>
```

## Platform Integration

Before initializing clients, ensure:
1. The desired clients are configured in your character file's `clients` array
2. Required environment variables are set for each platform:
   - Discord: DISCORD_TOKEN
   - Telegram: TELEGRAM_BOT_TOKEN
   - Twitter: TWITTER_USERNAME and TWITTER_PASSWORD

For help with setting up your Discord Bot, check out: https://discordjs.guide/preparations/setting-up-a-bot-application.html

Initialize all configured clients:

```typescript
import { initializeClients } from "eliza";

// Initialize all configured clients
const clients = await initializeClients(character, runtime);
```

## Development Commands

```bash
pnpm run dev    # Start the server
pnpm run shell  # Start interactive shell
```
## Runtime Components

The runtime includes these built-in components:

### Actions
- Default actions from defaultActions
- followRoom/unfollowRoom
- muteRoom/unmuteRoom
- imageGeneration
- Custom actions from elizaConfig.yaml

### Providers
- timeProvider
- boredomProvider

See [Advanced Features](./advanced) for adding custom actions and providers.
## Next Steps

- Learn about [Configuration](./configuration) options
- Explore [Advanced Features](./advanced) including:
  - Audio/video processing
  - Advanced memory management
  - Custom actions and evaluators
- Read about [Character Files](./characterfile)

For API details, see the [API Reference](../api).
