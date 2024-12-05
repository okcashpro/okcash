# Eliza Client Development Guide

This guide outlines the process of creating a new client for the Eliza framework. It is based on the implementation of the Slack and Discord clients.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Core Components](#core-components)
3. [Implementation Steps](#implementation-steps)
4. [Testing and Validation](#testing-and-validation)
5. [Integration with Eliza Core](#integration-with-eliza-core)

## Project Structure

A typical Eliza client package should have the following structure:

```
packages/client-[platform]/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                 # Main client implementation
│   ├── environment.ts           # Environment validation
│   ├── messages.ts              # Message handling
│   ├── events.ts               # Event handling
│   ├── types/
│   │   └── [platform]-types.ts  # Platform-specific types
│   ├── utils/
│   │   └── [platform]-utils.ts  # Utility functions
│   ├── providers/
│   │   └── [platform]-client.provider.ts
│   ├── actions/                # Platform-specific actions
│   │   ├── chat_with_attachments.ts
│   │   ├── summarize_conversation.ts
│   │   └── transcribe_media.ts
│   ├── examples/              # Standalone examples
│   │   └── standalone-example.ts
│   └── tests/                 # Test files
```

## Core Components

### 1. Client Interface
The main client class must implement the ElizaClient interface:

```typescript
export const [Platform]ClientInterface: ElizaClient = {
    start: async (runtime: IAgentRuntime | undefined) => {
        if (!runtime) {
            throw new Error("Runtime is required");
        }
        await validate[Platform]Config(runtime);
        
        const client = new [Platform]Client(runtime);
        await client.initialize();
        return client;
    },
    stop: async (runtime: IAgentRuntime | undefined) => {
        if (!runtime) {
            throw new Error("Runtime is required");
        }
        elizaLogger.info("Stopping [Platform] client");
    },
};
```

### 2. Configuration Types
Define platform-specific configuration in types/[platform]-types.ts:

```typescript
export interface [Platform]Config {
    // Platform-specific configuration
    apiToken: string;
    // Other required fields
}

export interface [Platform]ClientContext {
    client: any;
    config: [Platform]Config;
}
```

### 3. Message Manager
Implement message handling in messages.ts:

```typescript
export class MessageManager {
    constructor(client: any, config: [Platform]Config, runtime: IAgentRuntime) {
        // Initialize message handling
    }

    async handleMessage(event: any) {
        // 1. Validate message
        // 2. Process message content
        // 3. Create memory
        // 4. Generate response
        // 5. Send response
        // 6. Update state
    }
}
```

## Implementation Steps

1. **Package Setup**
   ```bash
   mkdir packages/client-[platform]
   cd packages/client-[platform]
   pnpm init
   ```

2. **Dependencies**
   Add to package.json:
   ```json
   {
     "dependencies": {
       "@ai16z/eliza": "workspace:*",
       "[platform-sdk]": "^x.x.x"
     }
   }
   ```

3. **Environment Configuration**
   Create environment.ts:
   ```typescript
   import { z } from "zod";
   import { IAgentRuntime } from "@ai16z/eliza";

   export const [platform]EnvSchema = z.object({
       // Define required environment variables
   });

   export async function validate[Platform]Config(runtime: IAgentRuntime) {
       // Validate configuration
   }
   ```

4. **Event Handling**
   Implement platform-specific event handling:
   ```typescript
   export class EventHandler {
       constructor(config: [Platform]Config, client: any) {
           // Initialize event handling
       }

       setupEventListeners() {
           // Set up event listeners
       }
   }
   ```

5. **Action Implementation**
   Create platform-specific actions:
   ```typescript
   export const [action_name] = {
       name: "action_name",
       description: "Action description",
       examples: [],
       handler: async (
           runtime: IAgentRuntime,
           message: Memory,
           state: State,
           options: any,
           callback: HandlerCallback
       ) => {
           // Implement action
       }
   };
   ```

## Testing and Validation

1. **Unit Tests**
   Create tests for each component:
   ```typescript
   describe('[Platform]Client', () => {
       // Test cases
   });
   ```

2. **Integration Tests**
   Create standalone examples:
   ```typescript
   async function main() {
       // Initialize client
       // Test functionality
   }
   ```

## Integration with Eliza Core

1. **Register Client**
   Add to agent/src/index.ts:
   ```typescript
   import { [Platform]ClientInterface } from "@ai16z/client-[platform]";
   ```

2. **Update Character Configuration**
   Add platform-specific configuration to character.json:
   ```json
   {
     "clientConfig": {
       "[platform]": {
         // Platform-specific settings
       }
     }
   }
   ```

## Best Practices

1. **Error Handling**
   - Use try-catch blocks for all async operations
   - Log errors with elizaLogger
   - Implement retry mechanisms for API calls

2. **State Management**
   - Use runtime.composeState for state management
   - Maintain conversation context
   - Handle user sessions properly

3. **Memory Management**
   - Create memories for all significant events
   - Use proper UUIDs for message and room IDs
   - Maintain thread/conversation relationships

4. **Security**
   - Never expose API keys or tokens
   - Validate all incoming data
   - Implement rate limiting where appropriate

## Deployment

1. **Environment Setup**
   ```bash
   # Required environment variables
   [PLATFORM]_API_TOKEN=xxx
   [PLATFORM]_APP_ID=xxx
   # Other platform-specific variables
   ```

2. **Build and Run**
   ```bash
   pnpm build
   pnpm start
   ```

## Troubleshooting

Common issues and solutions:
1. Connection issues
2. Event handling problems
3. Message processing errors
4. State management issues

## Additional Resources

- Platform API Documentation
- Eliza Core Documentation
- Example Implementations 