# Basic Usage

## Overview

This guide covers the fundamental concepts and basic usage of the agent framework. We'll explore how to initialize and configure agents, handle different types of interactions, and leverage core capabilities.

## Getting Started

### Installation

First, install the package using npm or pnpm:

```bash
npm install @your-org/agent-framework
# or
pnpm install @your-org/agent-framework
```

### Basic Setup

Here's a minimal example to create and start an agent:

```typescript
import { AgentRuntime, createAgentRuntime } from "@your-org/agent-framework";
import { SqliteDatabaseAdapter } from "@your-org/agent-framework/adapters";

// Initialize database
const db = new SqliteDatabaseAdapter(new Database("./db.sqlite"));

// Create runtime with basic configuration
const runtime = await createAgentRuntime({
  character: {
    name: "Assistant",
    modelProvider: "anthropic",
    // Add character details
  },
  db,
  token: process.env.API_TOKEN,
});
```

## Core Concepts

### Agents

Agents are autonomous entities that can:

- Process incoming messages
- Generate contextual responses
- Take actions based on input
- Maintain conversation state
- Handle multiple communication channels

### Clients

The framework supports multiple client types:

- Discord
- Telegram
- Twitter
- Direct API

Each client handles platform-specific message formatting and interaction patterns.

### Actions

Actions are discrete tasks that agents can perform:

```typescript
const action = {
  name: "SUMMARIZE",
  description: "Summarize content or conversations",
  handler: async (runtime, message, state) => {
    // Action implementation
  },
};

runtime.registerAction(action);
```

### Providers

Providers supply contextual information to agents:

- Time awareness
- User relationships
- System state
- External data sources

## Common Use Cases

### Chat Interactions

```typescript
// Handle incoming chat message
runtime.on("message", async (message) => {
  const response = await runtime.handleMessage(message);
  // Process response
});
```

### Voice Integration

For platforms supporting voice (e.g., Discord):

```typescript
// Handle voice channel join
runtime.on("voiceStateUpdate", async (oldState, newState) => {
  if (newState.channelId) {
    await runtime.joinVoiceChannel(newState.channelId);
  }
});
```

### Media Processing

The framework can handle various media types:

- Images (with description generation)
- Audio (with transcription)
- Documents (with text extraction)
- Videos (with summarization)

```typescript
// Process attachment
const media = await runtime.processAttachment({
  type: "image",
  url: "https://example.com/image.jpg",
});
```

## Configuration Options

### Character Configuration

Define agent personality and behavior:

```typescript
const character = {
  name: "Assistant",
  bio: "A helpful AI assistant",
  style: {
    tone: "professional",
    personality: "friendly",
    language: "en",
  },
  topics: ["technology", "science", "general"],
  // Additional character settings
};
```

### Runtime Settings

Configure runtime behavior:

```typescript
const settings = {
  maxContextLength: 2000,
  responseTimeout: 30000,
  modelProvider: "anthropic",
  temperature: 0.7,
  // Additional runtime settings
};
```

## Best Practices

1. **Error Handling**

   - Implement proper error catching
   - Provide graceful fallbacks
   - Log errors for debugging

2. **Resource Management**

   - Monitor memory usage
   - Implement rate limiting
   - Cache frequently accessed data

3. **Security**

   - Validate input
   - Sanitize output
   - Implement proper authentication

4. **Performance**
   - Use appropriate model sizes
   - Implement caching strategies
   - Optimize database queries

## Example Implementation

Here's a complete example bringing together the core concepts:

```typescript
import { AgentRuntime, createAgentRuntime } from "@your-org/agent-framework";
import { DiscordClient } from "@your-org/agent-framework/clients/discord";

async function main() {
  // Initialize runtime
  const runtime = await createAgentRuntime({
    character: {
      name: "Helper",
      bio: "A helpful assistant",
      modelProvider: "anthropic",
      style: {
        tone: "friendly",
        personality: "helpful",
      },
    },
    settings: {
      maxContextLength: 2000,
      temperature: 0.7,
    },
  });

  // Add custom action
  runtime.registerAction({
    name: "HELP",
    description: "Provide help information",
    handler: async (runtime, message, state) => {
      return {
        text: "Here's how I can help...",
        action: "HELP_RESPONSE",
      };
    },
  });

  // Initialize Discord client
  const discord = new DiscordClient(runtime);

  // Start listening
  discord.start();
}

main().catch(console.error);
```

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**

   - Verify API tokens
   - Check network connectivity
   - Confirm service status

2. **Response Timeouts**

   - Adjust timeout settings
   - Check rate limits
   - Verify model availability

3. **Memory Issues**
   - Monitor heap usage
   - Implement garbage collection
   - Optimize data structures

## Next Steps

After mastering basic usage, explore:

- Advanced configuration options
- Custom action development
- Integration with external services
- Performance optimization techniques

For more detailed information, refer to the specific component documentation and API reference.
