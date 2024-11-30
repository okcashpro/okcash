[@ai16z/eliza v0.1.4-alpha.3](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1016](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1016)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1017](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1017)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1018](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1018)

***

### schema?

> `optional` **schema**: `ZodType`\<`any`, `ZodTypeDef`, `any`\>

#### Defined in

[packages/core/src/generation.ts:1019](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1019)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1020](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1020)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1021](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1021)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1022](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1022)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1023](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1023)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1024](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1024)
