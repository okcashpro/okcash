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

[packages/core/src/types.ts:251](https://github.com/ai16z/eliza/blob/8b230e97279ce98a641d3338cbfa78f13130c60e/packages/core/src/types.ts#L251)
