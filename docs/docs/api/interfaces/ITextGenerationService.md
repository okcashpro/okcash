# Interface: ITextGenerationService

## Extends

- `Service`

## Methods

### getEmbeddingResponse()

> **getEmbeddingResponse**(`input`): `Promise`\<`number`[]\>

#### Parameters

• **input**: `string`

#### Returns

`Promise`\<`number`[]\>

#### Defined in

[packages/core/src/types.ts:608](https://github.com/ai16z/eliza/blob/8b230e97279ce98a641d3338cbfa78f13130c60e/packages/core/src/types.ts#L608)

***

### initializeModel()

> **initializeModel**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:591](https://github.com/ai16z/eliza/blob/8b230e97279ce98a641d3338cbfa78f13130c60e/packages/core/src/types.ts#L591)

***

### queueMessageCompletion()

> **queueMessageCompletion**(`context`, `temperature`, `stop`, `frequency_penalty`, `presence_penalty`, `max_tokens`): `Promise`\<`any`\>

#### Parameters

• **context**: `string`

• **temperature**: `number`

• **stop**: `string`[]

• **frequency\_penalty**: `number`

• **presence\_penalty**: `number`

• **max\_tokens**: `number`

#### Returns

`Promise`\<`any`\>

#### Defined in

[packages/core/src/types.ts:592](https://github.com/ai16z/eliza/blob/8b230e97279ce98a641d3338cbfa78f13130c60e/packages/core/src/types.ts#L592)

***

### queueTextCompletion()

> **queueTextCompletion**(`context`, `temperature`, `stop`, `frequency_penalty`, `presence_penalty`, `max_tokens`): `Promise`\<`string`\>

#### Parameters

• **context**: `string`

• **temperature**: `number`

• **stop**: `string`[]

• **frequency\_penalty**: `number`

• **presence\_penalty**: `number`

• **max\_tokens**: `number`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:600](https://github.com/ai16z/eliza/blob/8b230e97279ce98a641d3338cbfa78f13130c60e/packages/core/src/types.ts#L600)
