# Function: generateMessageResponse()

> **generateMessageResponse**(`opts`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Send a message to the model for generateText.

## Parameters

• **opts**

The options for the generateText request.

• **opts.context**: `string`

The context of the message to be completed.

• **opts.modelClass**: `string`

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

## Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

The completed message.

## Defined in

[core/src/core/generation.ts:524](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/generation.ts#L524)
