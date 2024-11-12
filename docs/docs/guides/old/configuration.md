# Configuration

## Overview

The framework provides multiple layers of configuration to customize agent behavior, system settings, and runtime environments. This guide covers all configuration aspects: character files, environment variables, action configuration, and runtime settings.

## Key Components

### 1. Environment Setup

Create a `.env` file in your project root:

```bash
# Model API Keys
OPENAI_API_KEY=your-key
CLAUDE_API_KEY=your-key

# Database Configuration
DATABASE_URL=your-db-url
POSTGRES_URL=your-postgres-url  # Optional, defaults to SQLite

# Client-Specific Tokens
DISCORD_API_TOKEN=your-token
DISCORD_APPLICATION_ID=your-id
TELEGRAM_BOT_TOKEN=your-token
TWITTER_USERNAME=your-username
```

### 2. Character Configuration

Create character files in the `characters` directory:

```json
{
  "name": "AgentName",
  "clients": ["discord", "twitter", "telegram"],
  "modelProvider": "openai",
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "your-key"
    },
    "voice": {
      "model": "en_US-male-medium"
    }
  },
  "bio": ["Biography elements..."],
  "lore": ["Character background..."],
  "knowledge": ["Factual information..."],
  "topics": ["Relevant topics..."],
  "style": {
    "all": ["Style guidelines..."],
    "chat": ["Chat-specific style..."],
    "post": ["Post-specific style..."]
  }
}
```

### 3. Custom Actions

Define custom actions in `elizaConfig.yaml`:

```yaml
actions:
  - name: customAction
    path: ./actions/customAction.ts
  - name: anotherAction
    path: ./custom_actions/anotherAction.ts
```

## Usage Guide

### 1. Basic Setup

```typescript
import { createAgentRuntime } from "@your-org/agent-framework";
import { SqliteDatabaseAdapter } from "@your-org/agent-framework/adapters";

// Initialize runtime
const runtime = await createAgentRuntime({
  character: characterConfig,
  configPath: "./elizaConfig.yaml",
  databaseAdapter: new SqliteDatabaseAdapter("./db.sqlite"),
});
```

### 2. Running Multiple Characters

```bash
# Start with specific character file
pnpm run dev --characters=./characters/agent1.json,./characters/agent2.json
```

### 3. Client Configuration

```typescript
// Discord client example
const discordClient = new DiscordClient(runtime);
await discordClient.start();

// Telegram client example
const telegramClient = new TelegramClient(runtime, botToken);
await telegramClient.start();
```

## Configuration Options

### 1. Model Providers

```typescript
const modelProviders = {
  openai: {
    small: "gpt-3.5-turbo",
    large: "gpt-4",
  },
  anthropic: {
    small: "claude-3-haiku",
    large: "claude-3-opus",
  },
  "llama-cloud": {
    small: "llama-7b",
    large: "llama-70b",
  },
};
```

### 2. Database Options

```typescript
// SQLite (default)
const dbAdapter = new SqliteDatabaseAdapter("./db.sqlite");

// PostgreSQL
const dbAdapter = new PostgresDatabaseAdapter({
  connectionString: process.env.POSTGRES_URL,
});
```

### 3. Custom Provider Configuration

```typescript
// Add custom provider
runtime.providers.push({
  name: "customProvider",
  get: async (runtime, message, state) => {
    // Provider implementation
    return data;
  },
});
```

## Best Practices

### 1. Security

- Store sensitive credentials in `.env` file
- Use character-specific secrets for per-agent credentials
- Never commit secrets to version control
- Rotate API keys regularly

### 2. Character Configuration

- Break bio and lore into smaller chunks for variety
- Use RAG (knowledge array) for factual information
- Keep message examples diverse and representative
- Update knowledge regularly

### 3. Performance

```typescript
// Optimize context length
const settings = {
  maxContextLength: 4000, // Adjust based on model
  maxTokens: 1000, // Limit response length
  temperature: 0.7, // Adjust response randomness
};
```

### 4. Error Handling

```typescript
try {
  const runtime = await createAgentRuntime(config);
} catch (error) {
  if (error.code === "CONFIG_NOT_FOUND") {
    console.error("Configuration file missing");
  } else if (error.code === "INVALID_CHARACTER") {
    console.error("Character file validation failed");
  }
}
```

## Troubleshooting

### Common Issues

1. **Missing Configuration**

```typescript
if (!fs.existsSync("./elizaConfig.yaml")) {
  console.error("Missing elizaConfig.yaml - copy from example");
}
```

2. **Invalid Character File**

```typescript
// Validate character file
if (!character.name || !character.bio || !character.style) {
  throw new Error("Invalid character configuration");
}
```

3. **Model Provider Issues**

```typescript
// Fallback to local model
if (!process.env.OPENAI_API_KEY) {
  console.log("Using local model fallback");
  runtime.modelProvider = "llama-local";
}
```

## Next Steps

After basic configuration:

1. Configure custom actions
2. Set up client integrations
3. Customize character behavior
4. Optimize model settings
5. Implement error handling

For more detailed information on specific components, refer to their respective documentation sections.
