# Interface: ITextGenerationService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### getInstance()

> **getInstance**(): [`ITextGenerationService`](ITextGenerationService.md)

#### Returns

[`ITextGenerationService`](ITextGenerationService.md)

#### Defined in

[packages/core/src/types.ts:599](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L599)

---

### initializeModel()

> **initializeModel**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:600](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L600)

---

### queueMessageCompletion()

> **queueMessageCompletion**(`context`, `temperature`, `stop`, `frequency_penalty`, `presence_penalty`, `max_tokens`): `Promise`\<`any`\>

#### Parameters

• **context**: `string`

• **temperature**: `number`

• **stop**: `string`[]

• **frequency_penalty**: `number`

• **presence_penalty**: `number`

• **max_tokens**: `number`

#### Returns

`Promise`\<`any`\>

#### Defined in

[packages/core/src/types.ts:601](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L601)

---

### queueTextCompletion()

> **queueTextCompletion**(`context`, `temperature`, `stop`, `frequency_penalty`, `presence_penalty`, `max_tokens`): `Promise`\<`string`\>

#### Parameters

• **context**: `string`

• **temperature**: `number`

• **stop**: `string`[]

• **frequency_penalty**: `number`

• **presence_penalty**: `number`

• **max_tokens**: `number`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:609](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L609)

---

### getEmbeddingResponse()

> **getEmbeddingResponse**(`input`): `Promise`\<`number`[]\>

#### Parameters

• **input**: `string`

#### Returns

`Promise`\<`number`[]\>

#### Defined in

[packages/core/src/types.ts:617](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L617)
