# Class: MemoryManager

Manage memories in the database.

## Implements

- `IMemoryManager`

## Constructors

### new MemoryManager()

> **new MemoryManager**(`opts`): [`MemoryManager`](MemoryManager.md)

Constructs a new MemoryManager instance.

#### Parameters

• **opts**

Options for the manager.

• **opts.runtime**: `IAgentRuntime`

The AgentRuntime instance associated with this manager.

• **opts.tableName**: `string`

The name of the table this manager will operate on.

#### Returns

[`MemoryManager`](MemoryManager.md)

## Properties

### runtime

> **runtime**: `IAgentRuntime`

The AgentRuntime instance associated with this manager.

#### Implementation of

`IMemoryManager.runtime`

***

### tableName

> **tableName**: `string`

The name of the database table this manager operates on.

#### Implementation of

`IMemoryManager.tableName`

## Methods

### addEmbeddingToMemory()

> **addEmbeddingToMemory**(`memory`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

Adds an embedding vector to a memory object. If the memory already has an embedding, it is returned as is.

#### Parameters

• **memory**: [`Memory`](../interfaces/Memory.md)

The memory object to add an embedding to.

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

A Promise resolving to the memory object, potentially updated with an embedding vector.

#### Implementation of

`IMemoryManager.addEmbeddingToMemory`

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

`IMemoryManager.countMemories`

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

`IMemoryManager.createMemory`

***

### getMemories()

> **getMemories**(`opts`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Retrieves a list of memories by user IDs, with optional deduplication.

#### Parameters

• **opts**

Options including user IDs, count, and uniqueness.

• **opts.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.count?**: `number` = `10`

The number of memories to retrieve.

• **opts.end?**: `number`

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to retrieve memories for.

• **opts.start?**: `number`

• **opts.unique?**: `boolean` = `true`

Whether to retrieve unique memories only.

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise resolving to an array of Memory objects.

#### Implementation of

`IMemoryManager.getMemories`

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

`IMemoryManager.removeAllMemories`

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

`IMemoryManager.removeMemory`

***

### searchMemoriesByEmbedding()

> **searchMemoriesByEmbedding**(`embedding`, `opts`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories similar to a given embedding vector.

#### Parameters

• **embedding**: `number`[]

The embedding vector to search with.

• **opts**

Options including match threshold, count, user IDs, and uniqueness.

• **opts.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **opts.count?**: `number`

The maximum number of memories to retrieve.

• **opts.match\_threshold?**: `number`

The similarity threshold for matching memories.

• **opts.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The room ID to retrieve memories for.

• **opts.unique?**: `boolean`

Whether to retrieve unique memories only.

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise resolving to an array of Memory objects that match the embedding.

#### Implementation of

`IMemoryManager.searchMemoriesByEmbedding`
