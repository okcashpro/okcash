---
sidebar_position: 6
---

# Configuration

This guide covers the configuration options available in Eliza.

> **Note:** Requires Node.js 20+

## Initial Setup
- Copy .env.example to .env and fill in the appropriate values
- Edit the TWITTER environment variables to add your bot's username and password

### Linux Installation

You might need these

```bash
pnpm install --include=optional sharp
```

## Environment Variables

### Model Provider Tokens
```bash
# Required - At least one model provider
OPENAI_API_KEY="sk-*"     # OpenAI API key
ANTHROPIC_API_KEY="sk-*"  # Claude API key (optional)

# Model Selection
XAI_MODEL="gpt-4o-mini"   # Model selection
# Available options:
XAI_MODEL=gpt-4o                                        # OpenAI GPT-4 Turbo
XAI_MODEL=gpt-4o-mini                                   # OpenAI GPT-4
XAI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo # Llama 70B
XAI_MODEL=meta-llama/Meta-Llama-3.1-405B-Instruct      # Llama 405B
XAI_MODEL=grok-beta                                     # Grok

### Platform Integration
# Required for each enabled client
DISCORD_TOKEN="your-discord-token"
TELEGRAM_BOT_TOKEN="your-telegram-token"
TWITTER_USERNAME="your-twitter-username"
TWITTER_PASSWORD="your-twitter-password"

### Optional Features
# Voice Support
ELEVENLABS_XI_API_KEY="your-elevenlabs-key"
ELEVENLABS_MODEL_ID="eleven_multilingual_v2"
ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000

# Local AI Support
LOCALAI_URL="http://localhost:8080"
LOCALAI_TOKEN="your-token"
```

## Runtime Configuration

Initialize a runtime with:

```typescript
import { createAgentRuntime, Database } from "eliza";
import { initializeDatabase, ModelProvider } from "eliza";

// Initialize database
const db = initializeDatabase();  // Uses SQLite by default

// Get token for model provider (supports character-specific keys)
const token = getTokenForProvider(ModelProvider.OPENAI, character);

// Create runtime with default configuration
const runtime = await createAgentRuntime(
    character,
    db,
    token,
    "./elizaConfig.yaml"  // Optional, defaults to this path
);
```

The runtime configuration includes:
- Database adapter (SQLite/PostgreSQL/Supabase)
- Model provider token
- Character configuration
- Built-in providers:
  - timeProvider
  - boredomProvider
- Default actions:
  - All default actions
  - followRoom/unfollowRoom
  - muteRoom/unmuteRoom
  - imageGeneration
- Custom actions from elizaConfig.yaml
- Optional evaluators

## Database Configuration

Choose between SQLite (development) and PostgreSQL/Supabase (production).

### Environment Variables
```bash
Optional - defaults to SQLite
POSTGRES_URL="postgres://user:pass@host:5432/db"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_API_KEY="your-service-key"
```

### Database Adapters
```typescript
// SQLite (default for development)
import { initializeDatabase } from "eliza";
const db = initializeDatabase();  // Creates ./db.sqlite

// PostgreSQL
const db = new PostgresDatabaseAdapter({
    connectionString: process.env.POSTGRES_URL
});
// Supabase
const db = new SupabaseDatabaseAdapter(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_API_KEY
);
```

## Token Providers

Configure model-specific tokens:

```typescript
const token = getTokenForProvider(ModelProvider.OPENAI, character);
```

Tokens can be set in environment variables or character-specific settings:

```json
{
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "character-specific-key",
      "CLAUDE_API_KEY": "character-specific-key"
    }
  }
}
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
## Memory Management
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

try {
    const clients = await initializeClients(character, runtime);
    prettyConsole.success(`✅ Clients successfully started for character ${character.name}`);
} catch (error) {
    prettyConsole.error(`❌ Error starting clients for ${character.name}: ${error}`);
}
```

### Client-Specific Error Handling

Each client has built-in error handling:

```typescript
// Telegram Example
const botToken = runtime.getSetting("TELEGRAM_BOT_TOKEN");
if (!botToken) {
    prettyConsole.error(`❌ Telegram bot token is not set for character ${character.name}`);
    return null;
}
try {
    const telegramClient = new Client.TelegramClient(runtime, botToken);
    await telegramClient.start();
    prettyConsole.success(`✅ Telegram client successfully started for character ${character.name}`);
    return telegramClient;
} catch (error) {
    prettyConsole.error(`❌ Error creating/starting Telegram client for ${character.name}:`, error);
    return null;
}
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

## Validation
```bash
# Python
python examples/validate.py
# JavaScript
node examples/validate.mjs
```

## Development Commands
```bash
pnpm run dev    # Start the server
pnpm run shell  # Start interactive shell
```

## Next Steps
See the [Advanced Features](./advanced) guide for customizing actions, providers, and more.
