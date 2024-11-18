[@ai16z/eliza v1.0.0](../index.md) / DatabaseAdapter

# Class: `abstract` DatabaseAdapter

An abstract class representing a database adapter for managing various entities
like accounts, memories, actors, goals, and rooms.

## Implements

- [`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md)

## Constructors

### new DatabaseAdapter()

> **new DatabaseAdapter**(): [`DatabaseAdapter`](DatabaseAdapter.md)

#### Returns

[`DatabaseAdapter`](DatabaseAdapter.md)

## Properties

### db

> **db**: `any`

The database instance.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`db`](../interfaces/IDatabaseAdapter.md#db)

#### Defined in

[packages/core/src/database.ts:21](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L21)

## Methods

### getAccountById()

> `abstract` **getAccountById**(`userId`): `Promise`\<[`Account`](../interfaces/Account.md)\>

Retrieves an account by its ID.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user account to retrieve.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)\>

A Promise that resolves to the Account object or null if not found.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getAccountById`](../interfaces/IDatabaseAdapter.md#getAccountById)

#### Defined in

[packages/core/src/database.ts:27](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L27)

---

### createAccount()

> `abstract` **createAccount**(`account`): `Promise`\<`boolean`\>

Creates a new account in the database.

#### Parameters

• **account**: [`Account`](../interfaces/Account.md)

The account object to create.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves when the account creation is complete.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`createAccount`](../interfaces/IDatabaseAdapter.md#createAccount)

#### Defined in

[packages/core/src/database.ts:34](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L34)

---

### getMemories()

> `abstract` **getMemories**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Retrieves memories based on the specified parameters.

#### Parameters

• **params**

An object containing parameters for the memory retrieval.

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.count?**: `number`

• **params.unique?**: `boolean`

• **params.tableName**: `string`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getMemories`](../interfaces/IDatabaseAdapter.md#getMemories)

#### Defined in

[packages/core/src/database.ts:41](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L41)

---

### getMemoriesByRoomIds()

> `abstract` **getMemoriesByRoomIds**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Parameters

• **params**

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.roomIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

• **params.tableName**: `string`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getMemoriesByRoomIds`](../interfaces/IDatabaseAdapter.md#getMemoriesByRoomIds)

#### Defined in

[packages/core/src/database.ts:48](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L48)

---

### getMemoryById()

> `abstract` **getMemoryById**(`id`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Parameters

• **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getMemoryById`](../interfaces/IDatabaseAdapter.md#getMemoryById)

#### Defined in

[packages/core/src/database.ts:54](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L54)

---

### getCachedEmbeddings()

> `abstract` **getCachedEmbeddings**(`params`): `Promise`\<`object`[]\>

Retrieves cached embeddings based on the specified query parameters.

#### Parameters

• **params**

An object containing parameters for the embedding retrieval.

• **params.query_table_name**: `string`

• **params.query_threshold**: `number`

• **params.query_input**: `string`

• **params.query_field_name**: `string`

• **params.query_field_sub_name**: `string`

• **params.query_match_count**: `number`

#### Returns

`Promise`\<`object`[]\>

A Promise that resolves to an array of objects containing embeddings and levenshtein scores.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getCachedEmbeddings`](../interfaces/IDatabaseAdapter.md#getCachedEmbeddings)

#### Defined in

[packages/core/src/database.ts:61](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L61)

---

### log()

> `abstract` **log**(`params`): `Promise`\<`void`\>

Logs an event or action with the specified details.

#### Parameters

• **params**

An object containing parameters for the log entry.

• **params.body**

• **params.userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.type**: `string`

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the log entry has been saved.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`log`](../interfaces/IDatabaseAdapter.md#log)

#### Defined in

[packages/core/src/database.ts:87](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L87)

---

### getActorDetails()

> `abstract` **getActorDetails**(`params`): `Promise`\<[`Actor`](../interfaces/Actor.md)[]\>

Retrieves details of actors in a given room.

#### Parameters

• **params**

An object containing the roomId to search for actors.

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Actor`](../interfaces/Actor.md)[]\>

A Promise that resolves to an array of Actor objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getActorDetails`](../interfaces/IDatabaseAdapter.md#getActorDetails)

#### Defined in

[packages/core/src/database.ts:99](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L99)

---

### searchMemories()

> `abstract` **searchMemories**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories based on embeddings and other specified parameters.

#### Parameters

• **params**

An object containing parameters for the memory search.

• **params.tableName**: `string`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.embedding**: `number`[]

• **params.match_threshold**: `number`

• **params.match_count**: `number`

• **params.unique**: `boolean`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`searchMemories`](../interfaces/IDatabaseAdapter.md#searchMemories)

#### Defined in

[packages/core/src/database.ts:106](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L106)

---

### updateGoalStatus()

> `abstract` **updateGoalStatus**(`params`): `Promise`\<`void`\>

Updates the status of a specific goal.

#### Parameters

• **params**

An object containing the goalId and the new status.

• **params.goalId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.status**: [`GoalStatus`](../enumerations/GoalStatus.md)

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal status has been updated.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`updateGoalStatus`](../interfaces/IDatabaseAdapter.md#updateGoalStatus)

#### Defined in

[packages/core/src/database.ts:120](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L120)

---

### searchMemoriesByEmbedding()

> `abstract` **searchMemoriesByEmbedding**(`embedding`, `params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories by embedding and other specified parameters.

#### Parameters

• **embedding**: `number`[]

The embedding vector to search with.

• **params**

Additional parameters for the search.

• **params.match_threshold?**: `number`

• **params.count?**: `number`

• **params.roomId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.unique?**: `boolean`

• **params.tableName**: `string`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`searchMemoriesByEmbedding`](../interfaces/IDatabaseAdapter.md#searchMemoriesByEmbedding)

#### Defined in

[packages/core/src/database.ts:131](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L131)

---

### createMemory()

> `abstract` **createMemory**(`memory`, `tableName`, `unique`?): `Promise`\<`void`\>

Creates a new memory in the database.

#### Parameters

• **memory**: [`Memory`](../interfaces/Memory.md)

The memory object to create.

• **tableName**: `string`

The table where the memory should be stored.

• **unique?**: `boolean`

Indicates if the memory should be unique.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the memory has been created.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`createMemory`](../interfaces/IDatabaseAdapter.md#createMemory)

#### Defined in

[packages/core/src/database.ts:150](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L150)

---

### removeMemory()

> `abstract` **removeMemory**(`memoryId`, `tableName`): `Promise`\<`void`\>

Removes a specific memory from the database.

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the memory to remove.

• **tableName**: `string`

The table from which the memory should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the memory has been removed.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeMemory`](../interfaces/IDatabaseAdapter.md#removeMemory)

#### Defined in

[packages/core/src/database.ts:162](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L162)

---

### removeAllMemories()

> `abstract` **removeAllMemories**(`roomId`, `tableName`): `Promise`\<`void`\>

Removes all memories associated with a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room whose memories should be removed.

• **tableName**: `string`

The table from which the memories should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when all memories have been removed.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeAllMemories`](../interfaces/IDatabaseAdapter.md#removeAllMemories)

#### Defined in

[packages/core/src/database.ts:170](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L170)

---

### countMemories()

> `abstract` **countMemories**(`roomId`, `unique`?, `tableName`?): `Promise`\<`number`\>

Counts the number of memories in a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room for which to count memories.

• **unique?**: `boolean`

Specifies whether to count only unique memories.

• **tableName?**: `string`

Optional table name to count memories from.

#### Returns

`Promise`\<`number`\>

A Promise that resolves to the number of memories.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`countMemories`](../interfaces/IDatabaseAdapter.md#countMemories)

#### Defined in

[packages/core/src/database.ts:179](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L179)

---

### getGoals()

> `abstract` **getGoals**(`params`): `Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

Retrieves goals based on specified parameters.

#### Parameters

• **params**

An object containing parameters for goal retrieval.

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.onlyInProgress?**: `boolean`

• **params.count?**: `number`

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

A Promise that resolves to an array of Goal objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getGoals`](../interfaces/IDatabaseAdapter.md#getGoals)

#### Defined in

[packages/core/src/database.ts:190](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L190)

---

### updateGoal()

> `abstract` **updateGoal**(`goal`): `Promise`\<`void`\>

Updates a specific goal in the database.

#### Parameters

• **goal**: [`Goal`](../interfaces/Goal.md)

The goal object with updated properties.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been updated.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`updateGoal`](../interfaces/IDatabaseAdapter.md#updateGoal)

#### Defined in

[packages/core/src/database.ts:202](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L202)

---

### createGoal()

> `abstract` **createGoal**(`goal`): `Promise`\<`void`\>

Creates a new goal in the database.

#### Parameters

• **goal**: [`Goal`](../interfaces/Goal.md)

The goal object to create.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been created.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`createGoal`](../interfaces/IDatabaseAdapter.md#createGoal)

#### Defined in

[packages/core/src/database.ts:209](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L209)

---

### removeGoal()

> `abstract` **removeGoal**(`goalId`): `Promise`\<`void`\>

Removes a specific goal from the database.

#### Parameters

• **goalId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the goal to remove.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been removed.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeGoal`](../interfaces/IDatabaseAdapter.md#removeGoal)

#### Defined in

[packages/core/src/database.ts:216](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L216)

---

### removeAllGoals()

> `abstract` **removeAllGoals**(`roomId`): `Promise`\<`void`\>

Removes all goals associated with a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room whose goals should be removed.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when all goals have been removed.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeAllGoals`](../interfaces/IDatabaseAdapter.md#removeAllGoals)

#### Defined in

[packages/core/src/database.ts:223](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L223)

---

### getRoom()

> `abstract` **getRoom**(`roomId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

Retrieves the room ID for a given room, if it exists.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to retrieve.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

A Promise that resolves to the room ID or null if not found.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getRoom`](../interfaces/IDatabaseAdapter.md#getRoom)

#### Defined in

[packages/core/src/database.ts:230](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L230)

---

### createRoom()

> `abstract` **createRoom**(`roomId`?): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

Creates a new room with an optional specified ID.

#### Parameters

• **roomId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Optional UUID to assign to the new room.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`\>

A Promise that resolves to the UUID of the created room.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`createRoom`](../interfaces/IDatabaseAdapter.md#createRoom)

#### Defined in

[packages/core/src/database.ts:237](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L237)

---

### removeRoom()

> `abstract` **removeRoom**(`roomId`): `Promise`\<`void`\>

Removes a specific room from the database.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to remove.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the room has been removed.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeRoom`](../interfaces/IDatabaseAdapter.md#removeRoom)

#### Defined in

[packages/core/src/database.ts:244](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L244)

---

### getRoomsForParticipant()

> `abstract` **getRoomsForParticipant**(`userId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves room IDs for which a specific user is a participant.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of room IDs.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getRoomsForParticipant`](../interfaces/IDatabaseAdapter.md#getRoomsForParticipant)

#### Defined in

[packages/core/src/database.ts:251](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L251)

---

### getRoomsForParticipants()

> `abstract` **getRoomsForParticipants**(`userIds`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves room IDs for which specific users are participants.

#### Parameters

• **userIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

An array of UUIDs of the users.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of room IDs.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getRoomsForParticipants`](../interfaces/IDatabaseAdapter.md#getRoomsForParticipants)

#### Defined in

[packages/core/src/database.ts:258](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L258)

---

### addParticipant()

> `abstract` **addParticipant**(`userId`, `roomId`): `Promise`\<`boolean`\>

Adds a user as a participant to a specific room.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user to add as a participant.

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room to which the user will be added.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`addParticipant`](../interfaces/IDatabaseAdapter.md#addParticipant)

#### Defined in

[packages/core/src/database.ts:266](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L266)

---

### removeParticipant()

> `abstract` **removeParticipant**(`userId`, `roomId`): `Promise`\<`boolean`\>

Removes a user as a participant from a specific room.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user to remove as a participant.

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room from which the user will be removed.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`removeParticipant`](../interfaces/IDatabaseAdapter.md#removeParticipant)

#### Defined in

[packages/core/src/database.ts:274](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L274)

---

### getParticipantsForAccount()

#### getParticipantsForAccount(userId)

> `abstract` **getParticipantsForAccount**(`userId`): `Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

Retrieves participants associated with a specific account.

##### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the account.

##### Returns

`Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

A Promise that resolves to an array of Participant objects.

##### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getParticipantsForAccount`](../interfaces/IDatabaseAdapter.md#getParticipantsForAccount)

##### Defined in

[packages/core/src/database.ts:281](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L281)

#### getParticipantsForAccount(userId)

> `abstract` **getParticipantsForAccount**(`userId`): `Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

Retrieves participants associated with a specific account.

##### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the account.

##### Returns

`Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

A Promise that resolves to an array of Participant objects.

##### Implementation of

`IDatabaseAdapter.getParticipantsForAccount`

##### Defined in

[packages/core/src/database.ts:288](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L288)

---

### getParticipantsForRoom()

> `abstract` **getParticipantsForRoom**(`roomId`): `Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

Retrieves participants for a specific room.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the room for which to retrieve participants.

#### Returns

`Promise`\<\`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]\>

A Promise that resolves to an array of UUIDs representing the participants.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getParticipantsForRoom`](../interfaces/IDatabaseAdapter.md#getParticipantsForRoom)

#### Defined in

[packages/core/src/database.ts:295](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L295)

---

### getParticipantUserState()

> `abstract` **getParticipantUserState**(`roomId`, `userId`): `Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getParticipantUserState`](../interfaces/IDatabaseAdapter.md#getParticipantUserState)

#### Defined in

[packages/core/src/database.ts:297](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L297)

---

### setParticipantUserState()

> `abstract` **setParticipantUserState**(`roomId`, `userId`, `state`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **state**: `"FOLLOWED"` \| `"MUTED"`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`setParticipantUserState`](../interfaces/IDatabaseAdapter.md#setParticipantUserState)

#### Defined in

[packages/core/src/database.ts:301](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L301)

---

### createRelationship()

> `abstract` **createRelationship**(`params`): `Promise`\<`boolean`\>

Creates a new relationship between two users.

#### Parameters

• **params**

An object containing the UUIDs of the two users (userA and userB).

• **params.userA**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userB**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves to a boolean indicating success or failure of the creation.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`createRelationship`](../interfaces/IDatabaseAdapter.md#createRelationship)

#### Defined in

[packages/core/src/database.ts:312](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L312)

---

### getRelationship()

> `abstract` **getRelationship**(`params`): `Promise`\<[`Relationship`](../interfaces/Relationship.md)\>

Retrieves a relationship between two users if it exists.

#### Parameters

• **params**

An object containing the UUIDs of the two users (userA and userB).

• **params.userA**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userB**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Relationship`](../interfaces/Relationship.md)\>

A Promise that resolves to the Relationship object or null if not found.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getRelationship`](../interfaces/IDatabaseAdapter.md#getRelationship)

#### Defined in

[packages/core/src/database.ts:322](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L322)

---

### getRelationships()

> `abstract` **getRelationships**(`params`): `Promise`\<[`Relationship`](../interfaces/Relationship.md)[]\>

Retrieves all relationships for a specific user.

#### Parameters

• **params**

An object containing the UUID of the user.

• **params.userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Relationship`](../interfaces/Relationship.md)[]\>

A Promise that resolves to an array of Relationship objects.

#### Implementation of

[`IDatabaseAdapter`](../interfaces/IDatabaseAdapter.md).[`getRelationships`](../interfaces/IDatabaseAdapter.md#getRelationships)

#### Defined in

[packages/core/src/database.ts:332](https://github.com/ai16z/eliza/blob/main/packages/core/src/database.ts#L332)
