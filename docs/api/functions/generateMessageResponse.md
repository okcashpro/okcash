# Function: generateMessageResponse()

> **generateMessageResponse**(`opts`): `Promise`\<[`Content`](../interfaces/Content.md)\>

Send a message to the model for generateText.

## Parameters

• **opts**

The options for the generateText request.

• **opts.context**: `string`

The context of the message to be completed.

• **opts.modelClass**: `string`

• **opts.runtime**: `IAgentRuntime`

## Returns

`Promise`\<[`Content`](../interfaces/Content.md)\>

The completed message.
