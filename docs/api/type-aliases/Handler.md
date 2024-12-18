[@ai16z/eliza v0.1.5-alpha.5](../index.md) / Handler

# Type Alias: Handler()

> **Handler**: (`runtime`, `message`, `state`?, `options`?, `callback`?) => `Promise`\<`unknown`\>

Handler function type for processing messages

## Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

• **message**: [`Memory`](../interfaces/Memory.md)

• **state?**: [`State`](../interfaces/State.md)

• **options?**

• **callback?**: [`HandlerCallback`](HandlerCallback.md)

## Returns

`Promise`\<`unknown`\>

## Defined in

[packages/core/src/types.ts:372](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L372)
