# Function: getProviders()

> **getProviders**(`runtime`, `message`, `state`?): `Promise`\<`string`\>

Formats provider outputs into a string which can be injected into the context.

## Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

The AgentRuntime object.

• **message**: [`Memory`](../interfaces/Memory.md)

The incoming message object.

• **state?**: [`State`](../interfaces/State.md)

The current state object.

## Returns

`Promise`\<`string`\>

A string that concatenates the outputs of each provider.

## Defined in

[core/src/core/providers.ts:13](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/providers.ts#L13)
