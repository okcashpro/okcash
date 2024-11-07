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

[core/src/core/generation.ts:249](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/generation.ts#L249)
