[@ai16z/eliza v0.1.4-alpha.3](../index.md) / embed

# Function: embed()

> **embed**(`runtime`, `input`): `Promise`\<`number`[]\>

Generate embeddings for input text using configured model provider

## Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

The agent runtime containing model configuration

• **input**: `string`

The text to generate embeddings for

## Returns

`Promise`\<`number`[]\>

Array of embedding numbers

## Defined in

[packages/core/src/embedding.ts:79](https://github.com/ai16z/eliza/blob/main/packages/core/src/embedding.ts#L79)
