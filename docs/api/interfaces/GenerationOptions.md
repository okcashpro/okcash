[@ai16z/eliza v0.1.3](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:884](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L884)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:885](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L885)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:886](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L886)

***

### schema?

> `optional` **schema**: `ZodSchema`

#### Defined in

[packages/core/src/generation.ts:887](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L887)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:888](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L888)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:889](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L889)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:890](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L890)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:891](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L891)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:892](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L892)
