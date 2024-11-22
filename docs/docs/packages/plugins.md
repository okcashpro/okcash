# 🧩 Plugins

## Overview

Eliza's plugin system provides a modular way to extend the core functionality with additional features, actions, evaluators, and providers. Plugins are self-contained modules that can be easily added or removed to customize your agent's capabilities.

## Core Plugin Concepts

### Plugin Structure

Each plugin in Eliza must implement the `Plugin` interface with the following properties:

```typescript
interface Plugin {
  name: string; // Unique identifier for the plugin
  description: string; // Brief description of plugin functionality
  actions?: Action[]; // Custom actions provided by the plugin
  evaluators?: Evaluator[]; // Custom evaluators for behavior assessment
  providers?: Provider[]; // Context providers for message generation
  services?: Service[]; // Additional services (optional)
}
```

### Available Plugins

#### 1. Bootstrap Plugin (`@eliza/plugin-bootstrap`)

The bootstrap plugin provides essential baseline functionality:

**Actions:**

- `continue` - Continue the current conversation flow
- `followRoom` - Follow a room for updates
- `unfollowRoom` - Unfollow a room
- `ignore` - Ignore specific messages
- `muteRoom` - Mute notifications from a room
- `unmuteRoom` - Unmute notifications from a room

**Evaluators:**

- `fact` - Evaluate factual accuracy
- `goal` - Assess goal completion

**Providers:**

- `boredom` - Manages engagement levels
- `time` - Provides temporal context
- `facts` - Supplies factual information

#### 2. Image Generation Plugin (`@eliza/plugin-image-generation`)

Enables AI image generation capabilities:

**Actions:**

- `GENERATE_IMAGE` - Create images based on text descriptions
- Supports multiple image generation services (Anthropic, Together)
- Auto-generates captions for created images

#### 3. Node Plugin (`@eliza/plugin-node`)

Provides core Node.js-based services:

**Services:**

- `BrowserService` - Web browsing capabilities
- `ImageDescriptionService` - Image analysis
- `LlamaService` - LLM integration
- `PdfService` - PDF processing
- `SpeechService` - Text-to-speech
- `TranscriptionService` - Speech-to-text
- `VideoService` - Video processing

#### 4. Solana Plugin (`@eliza/plugin-solana`)

Integrates Solana blockchain functionality:

**Evaluators:**

- `trustEvaluator` - Assess transaction trust scores

**Providers:**

- `walletProvider` - Wallet management
- `trustScoreProvider` - Transaction trust metrics

## Using Plugins

### Installation

1. Install the desired plugin package:

```bash
pnpm add @eliza/plugin-[name]
```

2. Import and register the plugin in your character configuration:

```typescript
import { bootstrapPlugin } from "@eliza/plugin-bootstrap";
import { imageGenerationPlugin } from "@eliza/plugin-image-generation";

const character = {
  // ... other character config
  plugins: [bootstrapPlugin, imageGenerationPlugin],
};
```

### Writing Custom Plugins

Create a new plugin by implementing the Plugin interface:

```typescript
import { Plugin, Action, Evaluator, Provider } from "@ai16z/eliza";

const myCustomPlugin: Plugin = {
  name: "my-custom-plugin",
  description: "Adds custom functionality",
  actions: [
    /* custom actions */
  ],
  evaluators: [
    /* custom evaluators */
  ],
  providers: [
    /* custom providers */
  ],
  services: [
    /* custom services */
  ],
};
```

## Best Practices

1. **Modularity**: Keep plugins focused on specific functionality
2. **Dependencies**: Clearly document any external dependencies
3. **Error Handling**: Implement robust error handling
4. **Documentation**: Provide clear documentation for actions and evaluators
5. **Testing**: Include tests for plugin functionality

## Plugin Development Guidelines

### Action Development

- Implement the `Action` interface
- Provide clear validation logic
- Include usage examples
- Handle errors gracefully

### Evaluator Development

- Implement the `Evaluator` interface
- Define clear evaluation criteria
- Include validation logic
- Document evaluation metrics

### Provider Development

- Implement the `Provider` interface
- Define context generation logic
- Handle state management
- Document provider capabilities

## Common Issues & Solutions

### Plugin Loading Issues

```typescript
// Check if plugins are loaded correctly
if (character.plugins) {
  console.log("Plugins are: ", character.plugins);
  const importedPlugins = await Promise.all(
    character.plugins.map(async (plugin) => {
      const importedPlugin = await import(plugin);
      return importedPlugin;
    }),
  );
  character.plugins = importedPlugins;
}
```

### Service Registration

```typescript
// Proper service registration
registerService(service: Service): void {
    const serviceType = (service as typeof Service).serviceType;
    if (this.services.has(serviceType)) {
        console.warn(`Service ${serviceType} is already registered`);
        return;
    }
    this.services.set(serviceType, service);
}
```

## Future Extensions

The plugin system is designed to be extensible. Future additions may include:

- Database adapters
- Authentication providers
- Custom model providers
- External API integrations
- Workflow automation
- Custom UI components

## Contributing

To contribute a new plugin:

1. Follow the plugin structure guidelines
2. Include comprehensive documentation
3. Add tests for all functionality
4. Submit a pull request
5. Update the plugin registry

For detailed API documentation and examples, see the [API Reference](/api).
