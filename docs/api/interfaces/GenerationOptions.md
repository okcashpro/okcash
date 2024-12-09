[@ai16z/eliza v0.1.5-alpha.3](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1058](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1058)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1059](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1059)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1060](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1060)

***

### schema?

> `optional` **schema**: `ZodType`\<`any`, `ZodTypeDef`, `any`\>

#### Defined in

[packages/core/src/generation.ts:1061](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1061)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1062](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1062)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1063](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1063)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1064](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1064)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1065](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1065)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1066](https://github.com/monilpat/eliza/blob/main/packages/core/src/generation.ts#L1066)
