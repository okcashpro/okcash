# Function: generateText()

> **generateText**(`opts`): `Promise`\<`string`\>

Send a message to the model for a text generateText - receive a string back and parse how you'd like

## Parameters

• **opts**

The options for the generateText request.

• **opts.context**: `string`

The context of the message to be completed.

• **opts.modelClass**: `string`

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

• **opts.stop?**: `string`[]

A list of strings to stop the generateText at.

## Returns

`Promise`\<`string`\>

The completed message.

## Defined in

[core/src/core/generation.ts:30](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/generation.ts#L30)
