---
sidebar_position: 4
---

# Actions

Actions are executable behaviors that agents can perform in response to messages. They allow agents to interact with external systems, modify their behavior, and perform tasks beyond simple message responses.

## Overview

Each Action has:

- A unique name and similar variations (similes)
- A validation function
- A handler function
- A description
- Example usage patterns

## Built-in Actions

### Basic Conversation Actions

#### CONTINUE

- Continues the conversation when additional context is needed
- Used for natural conversation flow
- Prevents over-dominating conversations
- Limited to maximum of 3 continues in a row

#### IGNORE

- Disengages from conversation when appropriate
- Used for:
  - Handling aggressive/inappropriate users
  - After natural conversation endings
  - When agent should stop responding
  - Following goodbyes or closings

#### NONE

- Default action when just responding normally
- No additional behaviors needed
- Basic conversational responses

### Room Management Actions

#### FOLLOW_ROOM

- Actively follows a conversation/channel
- Participates without needing explicit mentions
- Used when:
  - Explicitly asked to participate
  - Topic is highly relevant
  - Input would be valuable

#### UNFOLLOW_ROOM

- Stops following a previously followed room
- Only responds when explicitly mentioned
- Used when:
  - Asked to reduce participation
  - Agent is being too disruptive
  - Input is no longer needed

#### MUTE_ROOM & UNMUTE_ROOM

- Completely mutes/unmutes a room
- More strict than follow/unfollow
- Used for temporary or permanent disengagement

### External Integrations

#### ASK_CLAUDE

- Forwards complex queries to Claude AI
- Handles:
  - Code review/debugging
  - Content creation
  - Complex analysis
  - Detailed explanations

#### IMAGE_GENERATION

- Creates images from text descriptions
- Supports multiple providers
- Includes image captioning
- Returns base64 encoded images

### Trading/Financial Actions

#### SWAP

- Executes token swaps on Solana
- Handles slippage and validation
- Supports:
  - Quote fetching
  - Transaction simulation
  - Error handling

#### TAKE_ORDER

- Records trading orders
- Processes user conviction levels
- Manages order book updates

## Creating Custom Actions

To create a custom action, implement the Action interface:

```typescript
interface Action {
  name: string;
  similes: string[];
  description: string;
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback,
  ) => Promise<any>;
  examples: ActionExample[][];
}
```

Example custom action:

```typescript
const customAction: Action = {
  name: "CUSTOM_ACTION",
  similes: ["ALTERNATIVE_NAME"],
  description: "Describes what the action does",
  validate: async (runtime, message) => {
    // Validation logic
    return true;
  },
  handler: async (runtime, message, state, options, callback) => {
    // Action implementation
    return result;
  },
  examples: [
    // Usage examples
  ],
};
```

## Handler Callback

Actions can use the callback parameter to:

- Send intermediate responses
- Update conversation state
- Add attachments
- Trigger other actions

## Best Practices

1. **Validation**

   - Always validate input parameters
   - Check for required permissions
   - Verify preconditions
   - Handle edge cases

2. **Error Handling**

   - Implement proper error catching
   - Provide informative error messages
   - Handle network failures gracefully
   - Clean up resources on failure

3. **Examples**

   - Provide clear usage examples
   - Show expected inputs/outputs
   - Demonstrate error cases
   - Include edge cases

4. **State Management**
   - Keep track of action state
   - Clean up after completion
   - Handle interruptions
   - Maintain consistency

## Testing Actions

Test your actions using the example format:

```typescript
const examples = [
  [
    {
      user: "{{user1}}",
      content: { text: "Input message" },
    },
    {
      user: "{{user2}}",
      content: {
        text: "Response",
        action: "ACTION_NAME",
      },
    },
  ],
];
```

## Related
