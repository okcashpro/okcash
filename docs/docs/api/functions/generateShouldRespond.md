# Function: generateShouldRespond()

> **generateShouldRespond**(`opts`): `Promise`\<`"RESPOND"` \| `"IGNORE"` \| `"STOP"` \| `null`\>

Sends a message to the model to determine if it should respond to the given context.

## Parameters

• **opts**

The options for the generateText request

• **opts.context**: `string`

The context to evaluate for response

• **opts.modelClass**: `string`

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

## Returns

`Promise`\<`"RESPOND"` \| `"IGNORE"` \| `"STOP"` \| `null`\>

Promise resolving to "RESPOND", "IGNORE", "STOP" or null

## Defined in

[core/src/core/generation.ts:251](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/generation.ts#L251)
