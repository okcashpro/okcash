# Function: generateTextArray()

> **generateTextArray**(`opts`): `Promise`\<`string`[]\>

Send a message to the model and parse the response as a string array

## Parameters

• **opts**

The options for the generateText request

• **opts.context**: `string`

The context/prompt to send to the model

• **opts.modelClass**: `string`

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

## Returns

`Promise`\<`string`[]\>

Promise resolving to an array of strings parsed from the model's response

## Defined in

[core/src/core/generation.ts:404](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/generation.ts#L404)
