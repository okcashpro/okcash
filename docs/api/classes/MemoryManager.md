[@ai16z/eliza v0.1.4-alpha.3](../index.md) / MemoryManager

# Class: MemoryManager

Manage memories in the database.

## Implements

- [`IMemoryManager`](../interfaces/IMemoryManager.md)

## Constructors

### new MemoryManager()

> **new MemoryManager**(`opts`): [`MemoryManager`](MemoryManager.md)

Constructs a new MemoryManager instance.

#### Parameters

• **opts**

Options for the manager.

• **opts.tableName**: `string`

The name of the table this manager will operate on.

• **opts.runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

The AgentRuntime instance associated with this manager.

#### Returns

[`MemoryManager`](MemoryManager.md)

#### Defined in

[packages/core/src/memory.ts:36](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L36)

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

The AgentRuntime instance associated with this manager.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`runtime`](../interfaces/IMemoryManager.md#runtime)

#### Defined in

[packages/core/src/memory.ts:23](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L23)

***

### tableName

> **tableName**: `string`

The name of the database table this manager operates on.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`tableName`](../interfaces/IMemoryManager.md#tableName)

#### Defined in

[packages/core/src/memory.ts:28](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L28)

## Methods

### addEmbeddingToMemory()

> **addEmbeddingToMemory**(`memory`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

Adds an embedding vector to a memory object if one doesn't already exist.
The embedding is generated from the memory's text content using the runtime's
embedding model. If the memory has no text content, an error is thrown.

#### Parameters

• **memory**: [`Memory`](../interfaces/Memory.md)

The memory object to add an embedding to

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

The memory object with an embedding vector added

#### Throws

Error if the memory content is empty

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`addEmbeddingToMemory`](../interfaces/IMemoryManager.md#addEmbeddingToMemory)

#### Defined in

[packages/core/src/memory.ts:55](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L55)

***

### getMemories()

> **getMemories**(`opts`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Retrieves a list of memories by user IDs, with optional deduplication.

#### Parameters

• **opts**

Options including user IDs, count, and uniqueness.

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to retrieve memories for.

• **opts.count?**: `number` = `10`

The number of memories to retrieve.

• **opts.unique?**: `boolean` = `true`

Whether to retrieve unique memories only.

• **opts.start?**: `number`

• **opts.end?**: `number`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise resolving to an array of Memory objects.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`getMemories`](../interfaces/IMemoryManager.md#getMemories)

#### Defined in

[packages/core/src/memory.ts:90](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L90)

***

### getCachedEmbeddings()

> **getCachedEmbeddings**(`content`): `Promise`\<`object`[]\>

#### Parameters

• **content**: `string`

#### Returns

`Promise`\<`object`[]\>

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`getCachedEmbeddings`](../interfaces/IMemoryManager.md#getCachedEmbeddings)

#### Defined in

[packages/core/src/memory.ts:114](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L114)

***

### searchMemoriesByEmbedding()

> **searchMemoriesByEmbedding**(`embedding`, `opts`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories similar to a given embedding vector.

#### Parameters

• **embedding**: `number`[]

The embedding vector to search with.

• **opts**

Options including match threshold, count, user IDs, and uniqueness.

• **opts.match\_threshold?**: `number`

The similarity threshold for matching memories.

• **opts.count?**: `number`

The maximum number of memories to retrieve.

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to retrieve memories for.

• **opts.unique?**: `boolean`

Whether to retrieve unique memories only.

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise resolving to an array of Memory objects that match the embedding.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`searchMemoriesByEmbedding`](../interfaces/IMemoryManager.md#searchMemoriesByEmbedding)

#### Defined in

[packages/core/src/memory.ts:140](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L140)

***

### createMemory()

> **createMemory**(`memory`, `unique`): `Promise`\<`void`\>

Creates a new memory in the database, with an option to check for similarity before insertion.

#### Parameters

• **memory**: [`Memory`](../interfaces/Memory.md)

The memory object to create.

• **unique**: `boolean` = `false`

Whether to check for similarity before insertion.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the operation completes.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`createMemory`](../interfaces/IMemoryManager.md#createMemory)

#### Defined in

[packages/core/src/memory.ts:175](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L175)

***

### getMemoriesByRoomIds()

> **getMemoriesByRoomIds**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Parameters

• **params**

• **params.roomIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`getMemoriesByRoomIds`](../interfaces/IMemoryManager.md#getMemoriesByRoomIds)

#### Defined in

[packages/core/src/memory.ts:195](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L195)

***

### getMemoryById()

> **getMemoryById**(`id`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Parameters

• **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`getMemoryById`](../interfaces/IMemoryManager.md#getMemoryById)

#### Defined in

[packages/core/src/memory.ts:203](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L203)

***

### removeMemory()

> **removeMemory**(`memoryId`): `Promise`\<`void`\>

Removes a memory from the database by its ID.

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The ID of the memory to remove.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the operation completes.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`removeMemory`](../interfaces/IMemoryManager.md#removeMemory)

#### Defined in

[packages/core/src/memory.ts:214](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L214)

***

### removeAllMemories()

> **removeAllMemories**(`roomId`): `Promise`\<`void`\>

Removes all memories associated with a set of user IDs.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to remove memories for.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the operation completes.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`removeAllMemories`](../interfaces/IMemoryManager.md#removeAllMemories)

#### Defined in

[packages/core/src/memory.ts:226](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L226)

***

### countMemories()

> **countMemories**(`roomId`, `unique`): `Promise`\<`number`\>

Counts the number of memories associated with a set of user IDs, with an option for uniqueness.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to count memories for.

• **unique**: `boolean` = `true`

Whether to count unique memories only.

#### Returns

`Promise`\<`number`\>

A Promise resolving to the count of memories.

#### Implementation of

[`IMemoryManager`](../interfaces/IMemoryManager.md).[`countMemories`](../interfaces/IMemoryManager.md#countMemories)

#### Defined in

[packages/core/src/memory.ts:239](https://github.com/ai16z/eliza/blob/main/packages/core/src/memory.ts#L239)
