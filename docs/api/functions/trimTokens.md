[@ai16z/eliza v0.1.4-alpha.3](../index.md) / trimTokens

# Function: trimTokens()

> **trimTokens**(`context`, `maxTokens`, `model`): `string`

Truncate the context to the maximum length allowed by the model.

## Parameters

• **context**: `string`

The text to truncate

• **maxTokens**: `number`

Maximum number of tokens to keep

• **model**: `TiktokenModel`

The tokenizer model to use

## Returns

`string`

The truncated text

## Defined in

[packages/core/src/generation.ts:423](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L423)
