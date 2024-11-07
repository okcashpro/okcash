# Function: generateTrueOrFalse()

> **generateTrueOrFalse**(`opts`): `Promise`\<`boolean`\>

Sends a message to the model and parses the response as a boolean value

## Parameters

• **opts**

The options for the generateText request

• **opts.context**: `string` = `""`

The context to evaluate for the boolean response

• **opts.modelClass**: `string`

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

## Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean value parsed from the model's response

## Defined in

[core/src/core/generation.ts:352](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/generation.ts#L352)
