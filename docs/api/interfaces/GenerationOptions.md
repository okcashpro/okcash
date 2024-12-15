[@ai16z/eliza v0.1.5-alpha.5](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1235](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1235)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1236](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1236)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1237](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1237)

***

### schema?

> `optional` **schema**: `ZodSchema`

#### Defined in

[packages/core/src/generation.ts:1238](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1238)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1239](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1239)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1240](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1240)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1241](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1241)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1242](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1242)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1243](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1243)
