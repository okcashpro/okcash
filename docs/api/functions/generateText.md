# Function: generateText()

> **generateText**(`opts`): `Promise`\<`string`\>

Send a message to the model for a text generateText - receive a string back and parse how you'd like

## Parameters

• **opts**

The options for the generateText request.

• **opts.context**: `string`

The context of the message to be completed.

• **opts.modelClass**: `string`

• **opts.runtime**: `IAgentRuntime`

• **opts.stop?**: `string`[]

A list of strings to stop the generateText at.

## Returns

`Promise`\<`string`\>

The completed message.
