# Interface: IMemoryManager

## Properties

### constructor

> **constructor**: `Function`

#### Defined in

[core/src/core/types.ts:448](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L448)

***

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[core/src/core/types.ts:445](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L445)

***

### tableName

> **tableName**: `string`

#### Defined in

[core/src/core/types.ts:446](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L446)

## Methods

### addEmbeddingToMemory()

> **addEmbeddingToMemory**(`memory`): `Promise`\<[`Memory`](Memory.md)\>

#### Parameters

• **memory**: [`Memory`](Memory.md)

#### Returns

`Promise`\<[`Memory`](Memory.md)\>

#### Defined in

[core/src/core/types.ts:450](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L450)

***

### countMemories()

> **countMemories**(`roomId`, `unique`?): `Promise`\<`number`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **unique?**: `boolean`

#### Returns

`Promise`\<`number`\>

#### Defined in

[core/src/core/types.ts:480](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L480)

***

### createMemory()

> **createMemory**(`memory`, `unique`?): `Promise`\<`void`\>

#### Parameters

• **memory**: [`Memory`](Memory.md)

• **unique?**: `boolean`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:477](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L477)

***

### getCachedEmbeddings()

> **getCachedEmbeddings**(`content`): `Promise`\<`object`[]\>

#### Parameters

• **content**: `string`

#### Returns

`Promise`\<`object`[]\>

#### Defined in

[core/src/core/types.ts:459](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L459)

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

[core/src/core/types.ts:451](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L451)

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

[core/src/core/types.ts:463](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L463)

***

### getMemoryById()

> **getMemoryById**(`id`): `Promise`\<[`Memory`](Memory.md)\>

#### Parameters

• **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Memory`](Memory.md)\>

#### Defined in

[core/src/core/types.ts:462](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L462)

***

### removeAllMemories()

> **removeAllMemories**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:479](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L479)

***

### removeMemory()

> **removeMemory**(`memoryId`): `Promise`\<`void`\>

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:478](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L478)

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

[core/src/core/types.ts:467](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L467)
