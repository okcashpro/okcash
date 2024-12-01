[@ai16z/eliza v0.1.4-alpha.3](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1032](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1032)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1033](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1033)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1034](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1034)

***

### schema?

> `optional` **schema**: `ZodType`\<`any`, `ZodTypeDef`, `any`\>

#### Defined in

[packages/core/src/generation.ts:1035](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1035)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1036](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1036)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1037](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1037)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1038](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1038)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1039](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1039)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1040](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L1040)
