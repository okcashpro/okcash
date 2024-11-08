# Interface: IMemoryManager

## Properties

### constructor

> **constructor**: `Function`

#### Defined in

[packages/core/src/core/types.ts:462](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L462)

***

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/core/types.ts:459](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L459)

***

### tableName

> **tableName**: `string`

#### Defined in

[packages/core/src/core/types.ts:460](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L460)

## Methods

### addEmbeddingToMemory()

> **addEmbeddingToMemory**(`memory`): `Promise`\<[`Memory`](Memory.md)\>

#### Parameters

• **memory**: [`Memory`](Memory.md)

#### Returns

`Promise`\<[`Memory`](Memory.md)\>

#### Defined in

[packages/core/src/core/types.ts:464](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L464)

***

### countMemories()

> **countMemories**(`roomId`, `unique`?): `Promise`\<`number`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **unique?**: `boolean`

#### Returns

`Promise`\<`number`\>

#### Defined in

[packages/core/src/core/types.ts:494](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L494)

***

### createMemory()

> **createMemory**(`memory`, `unique`?): `Promise`\<`void`\>

#### Parameters

• **memory**: [`Memory`](Memory.md)

• **unique?**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:491](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L491)

***

### getCachedEmbeddings()

> **getCachedEmbeddings**(`content`): `Promise`\<`object`[]\>

#### Parameters

• **content**: `string`

#### Returns

`Promise`\<`object`[]\>

#### Defined in

[packages/core/src/core/types.ts:473](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L473)

***

### getMemories()

> **getMemories**(`opts`): `Promise`\<[`Memory`](Memory.md)[]\>

#### Parameters

• **opts**

• **opts.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.count?**: `number`

• **opts.end?**: `number`

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.start?**: `number`

• **opts.unique?**: `boolean`

#### Returns

`Promise`\<[`Memory`](Memory.md)[]\>

#### Defined in

[packages/core/src/core/types.ts:465](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L465)

***

### getMemoriesByRoomIds()

> **getMemoriesByRoomIds**(`params`): `Promise`\<[`Memory`](Memory.md)[]\>

#### Parameters

• **params**

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.roomIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

#### Returns

`Promise`\<[`Memory`](Memory.md)[]\>

#### Defined in

[packages/core/src/core/types.ts:477](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L477)

***

### getMemoryById()

> **getMemoryById**(`id`): `Promise`\<[`Memory`](Memory.md)\>

#### Parameters

• **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Memory`](Memory.md)\>

#### Defined in

[packages/core/src/core/types.ts:476](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L476)

***

### removeAllMemories()

> **removeAllMemories**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:493](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L493)

***

### removeMemory()

> **removeMemory**(`memoryId`): `Promise`\<`void`\>

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:492](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L492)

***

### searchMemoriesByEmbedding()

> **searchMemoriesByEmbedding**(`embedding`, `opts`): `Promise`\<[`Memory`](Memory.md)[]\>

#### Parameters

• **embedding**: `number`[]

• **opts**

• **opts.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.count?**: `number`

• **opts.match\_threshold?**: `number`

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.unique?**: `boolean`

#### Returns

`Promise`\<[`Memory`](Memory.md)[]\>

#### Defined in

[packages/core/src/core/types.ts:481](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L481)
