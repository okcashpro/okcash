[@ai16z/eliza v0.1.5-alpha.5](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1123](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1123)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1124](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1124)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1125](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1125)

***

### schema?

> `optional` **schema**: `ZodSchema`

#### Defined in

[packages/core/src/generation.ts:1126](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1126)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1127](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1127)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1128](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1128)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1129](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1129)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1130](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1130)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1131](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1131)
