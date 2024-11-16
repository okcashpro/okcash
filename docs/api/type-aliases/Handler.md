[@ai16z/eliza v1.0.0](../index.md) / Handler

# Type Alias: Handler()

> **Handler**: (`runtime`, `message`, `state`?, `options`?, `callback`?) => `Promise`\<`unknown`\>

Represents the type of a handler function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to any type.

## Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

• **message**: [`Memory`](../interfaces/Memory.md)

• **state?**: [`State`](../interfaces/State.md)

• **options?**

• **callback?**: [`HandlerCallback`](HandlerCallback.md)

## Returns

`Promise`\<`unknown`\>

## Defined in

[packages/core/src/types.ts:190](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L190)
