# Class: PostgresDatabaseAdapter

## Extends

- `DatabaseAdapter`

## Constructors

### new PostgresDatabaseAdapter()

> **new PostgresDatabaseAdapter**(`connectionConfig`): [`PostgresDatabaseAdapter`](PostgresDatabaseAdapter.md)

#### Parameters

• **connectionConfig**: `any`

#### Returns

[`PostgresDatabaseAdapter`](PostgresDatabaseAdapter.md)

#### Overrides

`DatabaseAdapter.constructor`

#### Defined in

[core/src/adapters/postgres.ts:19](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L19)

## Properties

### db

> **db**: `any`

The database instance.

#### Inherited from

`DatabaseAdapter.db`

#### Defined in

[core/src/core/database.ts:21](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/core/database.ts#L21)

## Methods

### addParticipant()

> **addParticipant**(`userId`, `roomId`): `Promise`\<`boolean`\>

Adds a user as a participant to a specific room.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user to add as a participant.

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to which the user will be added.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure.

#### Overrides

`DatabaseAdapter.addParticipant`

#### Defined in

[core/src/adapters/postgres.ts:681](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L681)

---

### countMemories()

> **countMemories**(`roomId`, `unique`, `tableName`): `Promise`\<`number`\>

Counts the number of memories in a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room for which to count memories.

• **unique**: `boolean` = `true`

Specifies whether to count only unique memories.

• **tableName**: `string` = `""`

Optional table name to count memories from.

#### Returns

`Promise`\<`number`\>

A Promise that resolves to the number of memories.

#### Overrides

`DatabaseAdapter.countMemories`

#### Defined in

[core/src/adapters/postgres.ts:752](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L752)

---

### createAccount()

> **createAccount**(`account`): `Promise`\<`boolean`\>

Creates a new account in the database.

#### Parameters

• **account**: `Account`

The account object to create.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves when the account creation is complete.

#### Overrides

`DatabaseAdapter.createAccount`

#### Defined in

[core/src/adapters/postgres.ts:186](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L186)

---

### createGoal()

> **createGoal**(`goal`): `Promise`\<`void`\>

Creates a new goal in the database.

#### Parameters

• **goal**: `Goal`

The goal object to create.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been created.

#### Overrides

`DatabaseAdapter.createGoal`

#### Defined in

[core/src/adapters/postgres.ts:454](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L454)

---

### createMemory()

> **createMemory**(`memory`, `tableName`): `Promise`\<`void`\>

Creates a new memory in the database.

#### Parameters

• **memory**: `Memory`

The memory object to create.

• **tableName**: `string`

The table where the memory should be stored.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the memory has been created.

#### Overrides

`DatabaseAdapter.createMemory`

#### Defined in

[core/src/adapters/postgres.ts:253](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L253)

---

### createRelationship()

> **createRelationship**(`params`): `Promise`\<`boolean`\>

Creates a new relationship between two users.

#### Parameters

• **params**

An object containing the UUIDs of the two users (userA and userB).

• **params.userA**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userB**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure of the creation.

#### Overrides

`DatabaseAdapter.createRelationship`

#### Defined in

[core/src/adapters/postgres.ts:505](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L505)

---

### createRoom()

> **createRoom**(`roomId`?): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

Creates a new room with an optional specified ID.

#### Parameters

• **roomId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Optional UUID to assign to the new room.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

A Promise that resolves to the UUID of the created room.

#### Overrides

`DatabaseAdapter.createRoom`

#### Defined in

[core/src/adapters/postgres.ts:483](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L483)

---

### getAccountById()

> **getAccountById**(`userId`): `Promise`\<`Account`\>

Retrieves an account by its ID.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user account to retrieve.

#### Returns

`Promise`\<`Account`\>

A Promise that resolves to the Account object or null if not found.

#### Overrides

`DatabaseAdapter.getAccountById`

#### Defined in

[core/src/adapters/postgres.ts:162](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L162)

---

### getActorById()

> **getActorById**(`params`): `Promise`\<`Actor`[]\>

#### Parameters

• **params**

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`Actor`[]\>

#### Defined in

[core/src/adapters/postgres.ts:210](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L210)

---

### getActorDetails()

> **getActorDetails**(`params`): `Promise`\<`Actor`[]\>

Retrieves details of actors in a given room.

#### Parameters

• **params**

An object containing the roomId to search for actors.

• **params.roomId**: `string`

#### Returns

`Promise`\<`Actor`[]\>

A Promise that resolves to an array of Actor objects.

#### Overrides

`DatabaseAdapter.getActorDetails`

#### Defined in

[core/src/adapters/postgres.ts:810](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L810)

---

### getCachedEmbeddings()

> **getCachedEmbeddings**(`opts`): `Promise`\<`object`[]\>

Retrieves cached embeddings based on the specified query parameters.

#### Parameters

• **opts**

• **opts.query_field_name**: `string`

• **opts.query_field_sub_name**: `string`

• **opts.query_input**: `string`

• **opts.query_match_count**: `number`

• **opts.query_table_name**: `string`

• **opts.query_threshold**: `number`

#### Returns

`Promise`\<`object`[]\>

A Promise that resolves to an array of objects containing embeddings and levenshtein scores.

#### Overrides

`DatabaseAdapter.getCachedEmbeddings`

#### Defined in

[core/src/adapters/postgres.ts:559](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L559)

---

### getGoals()

> **getGoals**(`params`): `Promise`\<`Goal`[]\>

Retrieves goals based on specified parameters.

#### Parameters

• **params**

An object containing parameters for goal retrieval.

• **params.count?**: `number`

• **params.onlyInProgress?**: `boolean`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`Goal`[]\>

A Promise that resolves to an array of Goal objects.

#### Overrides

`DatabaseAdapter.getGoals`

#### Defined in

[core/src/adapters/postgres.ts:396](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L396)

---

### getMemories()

> **getMemories**(`params`): `Promise`\<`Memory`[]\>

Retrieves memories based on the specified parameters.

#### Parameters

• **params**

An object containing parameters for the memory retrieval.

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.count?**: `number`

• **params.end?**: `number`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.start?**: `number`

• **params.tableName**: `string`

• **params.unique?**: `boolean`

#### Returns

`Promise`\<`Memory`[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

`DatabaseAdapter.getMemories`

#### Defined in

[core/src/adapters/postgres.ts:334](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L334)

---

### getMemoriesByRoomIds()

> **getMemoriesByRoomIds**(`params`): `Promise`\<`Memory`[]\>

#### Parameters

• **params**

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.roomIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

• **params.tableName**: `string`

#### Returns

`Promise`\<`Memory`[]\>

#### Overrides

`DatabaseAdapter.getMemoriesByRoomIds`

#### Defined in

[core/src/adapters/postgres.ts:103](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L103)

---

### getMemoryById()

> **getMemoryById**(`id`): `Promise`\<`Memory`\>

#### Parameters

• **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`Memory`\>

#### Overrides

`DatabaseAdapter.getMemoryById`

#### Defined in

[core/src/adapters/postgres.ts:232](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L232)

---

### getParticipantsForAccount()

> **getParticipantsForAccount**(`userId`): `Promise`\<`Participant`[]\>

Retrieves participants associated with a specific account.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the account.

#### Returns

`Promise`\<`Participant`[]\>

A Promise that resolves to an array of Participant objects.

#### Overrides

`DatabaseAdapter.getParticipantsForAccount`

#### Defined in

[core/src/adapters/postgres.ts:72](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L72)

---

### getParticipantsForRoom()

> **getParticipantsForRoom**(`roomId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves participants for a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room for which to retrieve participants.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of UUIDs representing the participants.

#### Overrides

`DatabaseAdapter.getParticipantsForRoom`

#### Defined in

[core/src/adapters/postgres.ts:149](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L149)

---

### getParticipantUserState()

> **getParticipantUserState**(`roomId`, `userId`): `Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Overrides

`DatabaseAdapter.getParticipantUserState`

#### Defined in

[core/src/adapters/postgres.ts:87](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L87)

---

### getRelationship()

> **getRelationship**(`params`): `Promise`\<`Relationship`\>

Retrieves a relationship between two users if it exists.

#### Parameters

• **params**

An object containing the UUIDs of the two users (userA and userB).

• **params.userA**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userB**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`Relationship`\>

A Promise that resolves to the Relationship object or null if not found.

#### Overrides

`DatabaseAdapter.getRelationship`

#### Defined in

[core/src/adapters/postgres.ts:529](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L529)

---

### getRelationships()

> **getRelationships**(`params`): `Promise`\<`Relationship`[]\>

Retrieves all relationships for a specific user.

#### Parameters

• **params**

An object containing the UUID of the user.

• **params.userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`Relationship`[]\>

A Promise that resolves to an array of Relationship objects.

#### Overrides

`DatabaseAdapter.getRelationships`

#### Defined in

[core/src/adapters/postgres.ts:546](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L546)

---

### getRoom()

> **getRoom**(`roomId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

Retrieves the room ID for a given room, if it exists.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to retrieve.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

A Promise that resolves to the room ID or null if not found.

#### Overrides

`DatabaseAdapter.getRoom`

#### Defined in

[core/src/adapters/postgres.ts:59](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L59)

---

### getRoomsForParticipant()

> **getRoomsForParticipant**(`userId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves room IDs for which a specific user is a participant.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of room IDs.

#### Overrides

`DatabaseAdapter.getRoomsForParticipant`

#### Defined in

[core/src/adapters/postgres.ts:784](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L784)

---

### getRoomsForParticipants()

> **getRoomsForParticipants**(`userIds`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves room IDs for which specific users are participants.

#### Parameters

• **userIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

An array of UUIDs of the users.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of room IDs.

#### Overrides

`DatabaseAdapter.getRoomsForParticipants`

#### Defined in

[core/src/adapters/postgres.ts:797](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L797)

---

### log()

> **log**(`params`): `Promise`\<`void`\>

Logs an event or action with the specified details.

#### Parameters

• **params**

An object containing parameters for the log entry.

• **params.body**

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.type**: `string`

• **params.userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the log entry has been saved.

#### Overrides

`DatabaseAdapter.log`

#### Defined in

[core/src/adapters/postgres.ts:595](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L595)

---

### removeAllGoals()

> **removeAllGoals**(`roomId`): `Promise`\<`void`\>

Removes all goals associated with a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room whose goals should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when all goals have been removed.

#### Overrides

`DatabaseAdapter.removeAllGoals`

#### Defined in

[core/src/adapters/postgres.ts:773](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L773)

---

### removeAllMemories()

> **removeAllMemories**(`roomId`, `tableName`): `Promise`\<`void`\>

Removes all memories associated with a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room whose memories should be removed.

• **tableName**: `string`

The table from which the memories should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when all memories have been removed.

#### Overrides

`DatabaseAdapter.removeAllMemories`

#### Defined in

[core/src/adapters/postgres.ts:740](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L740)

---

### removeGoal()

> **removeGoal**(`goalId`): `Promise`\<`void`\>

Removes a specific goal from the database.

#### Parameters

• **goalId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the goal to remove.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been removed.

#### Overrides

`DatabaseAdapter.removeGoal`

#### Defined in

[core/src/adapters/postgres.ts:474](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L474)

---

### removeMemory()

> **removeMemory**(`memoryId`, `tableName`): `Promise`\<`void`\>

Removes a specific memory from the database.

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the memory to remove.

• **tableName**: `string`

The table from which the memory should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the memory has been removed.

#### Overrides

`DatabaseAdapter.removeMemory`

#### Defined in

[core/src/adapters/postgres.ts:728](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L728)

---

### removeParticipant()

> **removeParticipant**(`userId`, `roomId`): `Promise`\<`boolean`\>

Removes a user as a participant from a specific room.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user to remove as a participant.

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room from which the user will be removed.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure.

#### Overrides

`DatabaseAdapter.removeParticipant`

#### Defined in

[core/src/adapters/postgres.ts:697](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L697)

---

### removeRoom()

> **removeRoom**(`roomId`): `Promise`\<`void`\>

Removes a specific room from the database.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to remove.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the room has been removed.

#### Overrides

`DatabaseAdapter.removeRoom`

#### Defined in

[core/src/adapters/postgres.ts:496](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L496)

---

### searchMemories()

> **searchMemories**(`params`): `Promise`\<`Memory`[]\>

Searches for memories based on embeddings and other specified parameters.

#### Parameters

• **params**

An object containing parameters for the memory search.

• **params.embedding**: `number`[]

• **params.match_count**: `number`

• **params.match_threshold**: `number`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.tableName**: `string`

• **params.unique**: `boolean`

#### Returns

`Promise`\<`Memory`[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

`DatabaseAdapter.searchMemories`

#### Defined in

[core/src/adapters/postgres.ts:291](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L291)

---

### searchMemoriesByEmbedding()

> **searchMemoriesByEmbedding**(`embedding`, `params`): `Promise`\<`Memory`[]\>

Searches for memories by embedding and other specified parameters.

#### Parameters

• **embedding**: `number`[]

The embedding vector to search with.

• **params**

Additional parameters for the search.

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.count?**: `number`

• **params.match_threshold?**: `number`

• **params.roomId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.tableName**: `string`

• **params.unique?**: `boolean`

#### Returns

`Promise`\<`Memory`[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

`DatabaseAdapter.searchMemoriesByEmbedding`

#### Defined in

[core/src/adapters/postgres.ts:612](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L612)

---

### setParticipantUserState()

> **setParticipantUserState**(`roomId`, `userId`, `state`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **state**: `"FOLLOWED"` \| `"MUTED"`

#### Returns

`Promise`\<`void`\>

#### Overrides

`DatabaseAdapter.setParticipantUserState`

#### Defined in

[core/src/adapters/postgres.ts:133](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L133)

---

### testConnection()

> **testConnection**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[core/src/adapters/postgres.ts:37](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L37)

---

### updateGoal()

> **updateGoal**(`goal`): `Promise`\<`void`\>

Updates a specific goal in the database.

#### Parameters

• **goal**: `Goal`

The goal object with updated properties.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been updated.

#### Overrides

`DatabaseAdapter.updateGoal`

#### Defined in

[core/src/adapters/postgres.ts:437](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L437)

---

### updateGoalStatus()

> **updateGoalStatus**(`params`): `Promise`\<`void`\>

Updates the status of a specific goal.

#### Parameters

• **params**

An object containing the goalId and the new status.

• **params.goalId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.status**: `GoalStatus`

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal status has been updated.

#### Overrides

`DatabaseAdapter.updateGoalStatus`

#### Defined in

[core/src/adapters/postgres.ts:713](https://github.com/ai16z/eliza/blob/d62ba1b3bd238d14ac669409dda20e8446e34da9/core/src/adapters/postgres.ts#L713)
