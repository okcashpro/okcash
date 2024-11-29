[@ai16z/eliza v0.1.4-alpha.3](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:982](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L982)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:983](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L983)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:984](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L984)

***

### schema?

> `optional` **schema**: `ZodType`\<`any`, `ZodTypeDef`, `any`\>

#### Defined in

[packages/core/src/generation.ts:985](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L985)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:986](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L986)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:987](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L987)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:988](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L988)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:989](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L989)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:990](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L990)
