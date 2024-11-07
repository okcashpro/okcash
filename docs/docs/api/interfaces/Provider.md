# Interface: Provider

Represents a provider, which is used to retrieve information or perform actions on behalf of the agent, such as fetching data from an external API or service.

## Properties

### get()

> **get**: (`runtime`, `message`, `state`?) => `Promise`\<`any`\>

#### Parameters

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

#### Returns

`Promise`\<`any`\>

#### Defined in

[core/src/core/types.ts:233](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L233)
