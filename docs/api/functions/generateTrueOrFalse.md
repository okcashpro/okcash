# Function: generateTrueOrFalse()

> **generateTrueOrFalse**(`opts`): `Promise`\<`boolean`\>

Sends a message to the model and parses the response as a boolean value

## Parameters

• **opts**

The options for the generateText request

• **opts.context**: `string` = `""`

The context to evaluate for the boolean response

• **opts.modelClass**: `string`

• **opts.runtime**: `IAgentRuntime`

## Returns

`Promise`\<`boolean`\>

Promise resolving to a boolean value parsed from the model's response
