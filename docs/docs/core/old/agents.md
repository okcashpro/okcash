---
sidebar_position: 2
---

# Agents

Agents are the core components of the Eliza framework that handle autonomous interactions. Each agent runs in a runtime environment and can interact through various clients (Discord, Telegram, etc.) while maintaining consistent behavior and memory.

## Overview

- What agents are in Eliza
- How they interact with the system
- Core components and workflow

## Architecture

### Agent Runtime

- Base environment for the agent
- Message processing
- Action handling
- Provider integration
- Memory management

### Key Components

#### 1. Clients

- Discord
- Telegram
- Direct (REST API)
- Available connectors
- Client-specific features (e.g., voice, attachments)

#### 2. Providers

- Inject context into agent responses
- Types of providers:
  - Time
  - Wallet
  - Custom data/state
- How to use providers for extended functionality

#### 3. Actions

- Executable behaviors
- Built-in actions:
  - Follow/unfollow rooms
  - Generate images
  - Transcribe media
  - Process attachments
- Creating custom actions

#### 4. Evaluators

- Response assessment
- Goal tracking
- Fact extraction
- Memory building
- Long-term memory management

### Memory System

#### Types of Memory

- Message history
- Factual memory
- Knowledge base
- Relationship tracking

#### RAG Integration

- Vector search for relevant information
- Knowledge embedding
- Contextual recall

## Configuration

- Model settings
- Runtime options
- Client configuration
- Memory settings
- Provider setup

## Best Practices

### Performance

- Model selection
- Context management
- Memory optimization
- Client-specific considerations

### Development

- Local development setup
- Testing agents
- Debugging tools
- Monitoring and logging

### Scaling

- Multiple agent management
- Resource considerations
- Infrastructure recommendations

## Examples

### Basic Agent Setup

```typescript
// Example code for basic agent configuration
```

### Adding Custom Functionality

```typescript
// Example of extending agent capabilities
```

### Client Integration

```typescript
// Example of connecting to different platforms
```

## Troubleshooting

- Common issues
- Debug strategies
- Performance optimization
- Error handling

## Related

- [Character Files](../characterfile)
- [API Reference](/api/classes/AgentRuntime)
