[@ai16z/eliza v1.0.0](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:867](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L867)

---

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:868](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L868)

---

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:869](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L869)

---

### schema?

> `optional` **schema**: `ZodSchema`

#### Defined in

[packages/core/src/generation.ts:870](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L870)

---

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:871](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L871)

---

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:872](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L872)

---

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:873](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L873)

---

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:874](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L874)

---

### experimental_providerMetadata?

> `optional` **experimental_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:875](https://github.com/ai16z/eliza/blob/main/packages/core/src/generation.ts#L875)
