[@ai16z/eliza v0.1.5-alpha.5](../index.md) / generateTrueOrFalse

# Function: generateTrueOrFalse()

> **generateTrueOrFalse**(`opts`): `Promise`\<`boolean`\>

Sends a message to the model and parses the response as a boolean value

## Parameters

• **opts**

The options for the generateText request

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

• **opts.context**: `string` = `""`

The context to evaluate for the boolean response

• **opts.modelClass**: `string`

## Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean value parsed from the model's response

## Defined in

[packages/core/src/generation.ts:709](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L709)
