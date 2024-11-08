# Type Alias: Validator()

> **Validator**: (`runtime`, `message`, `state`?) => `Promise`\<`boolean`\>

Represents the type of a validator function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to a boolean indicating whether the validation passed.

## Parameters

• **runtime**: `IAgentRuntime`

• **message**: [`Memory`](../interfaces/Memory.md)

• **state?**: [`State`](../interfaces/State.md)

## Returns

`Promise`\<`boolean`\>
