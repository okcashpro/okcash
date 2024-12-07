[@ai16z/eliza v0.1.5-alpha.3](../index.md) / Provider

# Interface: Provider

Provider for external data/services

## Properties

### get()

> **get**: (`runtime`, `message`, `state`?) => `Promise`\<`any`\>

Data retrieval function

#### Parameters

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

#### Returns

`Promise`\<`any`\>

#### Defined in

[packages/core/src/types.ts:459](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L459)
