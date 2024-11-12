---
sidebar_position: 5
---

# Evaluators

Evaluators are components that assess and extract information from conversations, helping agents build long-term memory and track goal progress. They analyze conversations to extract facts, update goals, and maintain agent state.

## Overview

Evaluators help agents:

- Extract useful information from conversations
- Track progress toward goals
- Build long-term memory
- Maintain context awareness

## Built-in Evaluators

### Fact Evaluator

The fact evaluator extracts factual information from conversations for long-term memory storage.

```typescript
interface Fact {
  claim: string;
  type: "fact" | "opinion" | "status";
  in_bio: boolean;
  already_known: boolean;
}
```

#### Fact Types

- `fact`: True statements about the world or character that don't change
- `status`: Facts that are true but may change over time
- `opinion`: Non-factual opinions, thoughts, feelings, or recommendations

#### Example Facts:

```json
[
  {
    "claim": "User lives in Oakland",
    "type": "fact",
    "in_bio": false,
    "already_known": false
  },
  {
    "claim": "User completed marathon in 3 hours",
    "type": "fact",
    "in_bio": false,
    "already_known": false
  },
  {
    "claim": "User is proud of their achievement",
    "type": "opinion",
    "in_bio": false,
    "already_known": false
  }
]
```

### Goal Evaluator

The goal evaluator tracks progress on agent goals and objectives.

```typescript
interface Goal {
  id: string;
  name: string;
  status: "IN_PROGRESS" | "DONE" | "FAILED";
  objectives: Objective[];
}

interface Objective {
  description: string;
  completed: boolean;
}
```

#### Goal Updates

- Monitors conversation for goal progress
- Updates objective completion status
- Marks goals as complete when all objectives are done
- Marks goals as failed when they cannot be completed

#### Example Goal:

```json
{
  "id": "goal-123",
  "name": "Complete Marathon Training",
  "status": "IN_PROGRESS",
  "objectives": [
    {
      "description": "Run 30 miles per week",
      "completed": true
    },
    {
      "description": "Complete practice half-marathon",
      "completed": false
    }
  ]
}
```

## Creating Custom Evaluators

To create a custom evaluator, implement the Evaluator interface:

```typescript
interface Evaluator {
  name: string;
  similes: string[];
  description: string;
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
  ) => Promise<any>;
  examples: EvaluatorExample[];
}
```

Example custom evaluator:

```typescript
const customEvaluator: Evaluator = {
  name: "CUSTOM_EVALUATOR",
  similes: ["ALTERNATE_NAME"],
  description: "Evaluates something in the conversation",
  validate: async (runtime, message) => {
    // Determine if evaluation should run
    return true;
  },
  handler: async (runtime, message, state, options) => {
    // Evaluation logic
    return evaluationResult;
  },
  examples: [
    // Example inputs and outputs
  ],
};
```

## Best Practices

### Fact Extraction

1. **Avoid Duplication**

   - Check for existing facts
   - Only store new information
   - Mark duplicates as already_known

2. **Proper Categorization**

   - Distinguish between facts/opinions/status
   - Check if fact exists in bio
   - Include relevant context

3. **Quality Control**
   - Remove corrupted facts
   - Validate fact format
   - Ensure facts are meaningful

### Goal Tracking

1. **Clear Objectives**

   - Break goals into measurable objectives
   - Define completion criteria
   - Track partial progress

2. **Status Updates**

   - Only update changed goals
   - Include complete objectives list
   - Preserve unchanged data

3. **Failure Handling**
   - Define failure conditions
   - Record failure reasons
   - Allow goal adaptation

## Memory Integration

Evaluators work with the memory system to:

1. Store extracted facts
2. Update goal states
3. Build long-term context
4. Maintain conversation history

Example memory integration:

```typescript
// Store new fact
const factMemory = await runtime.factManager.addEmbeddingToMemory({
  userId: agentId,
  content: { text: fact },
  roomId,
  createdAt: Date.now(),
});

await runtime.factManager.createMemory(factMemory, true);
```

## Related
