# Type Alias: Validator()

> **Validator**: (`runtime`, `message`, `state`?) => `Promise`\<`boolean`\>

Represents the type of a validator function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to a boolean indicating whether the validation passed.

## Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

• **message**: [`Memory`](../interfaces/Memory.md)

• **state?**: [`State`](../interfaces/State.md)

## Returns

`Promise`\<`boolean`\>

## Defined in

[core/src/core/types.ts:189](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L189)
