# Class: SqliteDatabaseAdapter

An abstract class representing a database adapter for managing various entities
like accounts, memories, actors, goals, and rooms.

## Extends

- [`DatabaseAdapter`](DatabaseAdapter.md)

## Constructors

### new SqliteDatabaseAdapter()

> **new SqliteDatabaseAdapter**(`db`): [`SqliteDatabaseAdapter`](SqliteDatabaseAdapter.md)

#### Parameters

• **db**: `Database`

#### Returns

[`SqliteDatabaseAdapter`](SqliteDatabaseAdapter.md)

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`constructor`](DatabaseAdapter.md#constructors)

#### Defined in

[packages/core/src/adapters/sqlite.ts:70](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L70)

## Properties

### db

> **db**: `any`

The database instance.

#### Inherited from

[`DatabaseAdapter`](DatabaseAdapter.md).[`db`](DatabaseAdapter.md#db)

#### Defined in

[packages/core/src/core/database.ts:21](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/database.ts#L21)

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`addParticipant`](DatabaseAdapter.md#addparticipant)

#### Defined in

[packages/core/src/adapters/sqlite.ts:591](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L591)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`countMemories`](DatabaseAdapter.md#countmemories)

#### Defined in

[packages/core/src/adapters/sqlite.ts:464](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L464)

***

### createAccount()

> **createAccount**(`account`): `Promise`\<`boolean`\>

Creates a new account in the database.

#### Parameters

• **account**: [`Account`](../interfaces/Account.md)

The account object to create.

#### Returns

`Promise`\<`boolean`\>

A Promise that resolves when the account creation is complete.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`createAccount`](DatabaseAdapter.md#createaccount)

#### Defined in

[packages/core/src/adapters/sqlite.ts:102](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L102)

***

### createGoal()

> **createGoal**(`goal`): `Promise`\<`void`\>

Creates a new goal in the database.

#### Parameters

• **goal**: [`Goal`](../interfaces/Goal.md)

The goal object to create.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been created.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`createGoal`](DatabaseAdapter.md#creategoal)

#### Defined in

[packages/core/src/adapters/sqlite.ts:531](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L531)

***

### createMemory()

> **createMemory**(`memory`, `tableName`): `Promise`\<`void`\>

Creates a new memory in the database.

#### Parameters

• **memory**: [`Memory`](../interfaces/Memory.md)

The memory object to create.

• **tableName**: `string`

The table where the memory should be stored.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the memory has been created.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`createMemory`](DatabaseAdapter.md#creatememory)

#### Defined in

[packages/core/src/adapters/sqlite.ts:195](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L195)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`createRelationship`](DatabaseAdapter.md#createrelationship)

#### Defined in

[packages/core/src/adapters/sqlite.ts:615](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L615)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`createRoom`](DatabaseAdapter.md#createroom)

#### Defined in

[packages/core/src/adapters/sqlite.ts:556](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L556)

***

### getAccountById()

> **getAccountById**(`userId`): `Promise`\<[`Account`](../interfaces/Account.md)\>

Retrieves an account by its ID.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the user account to retrieve.

#### Returns

`Promise`\<[`Account`](../interfaces/Account.md)\>

A Promise that resolves to the Account object or null if not found.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getAccountById`](DatabaseAdapter.md#getaccountbyid)

#### Defined in

[packages/core/src/adapters/sqlite.ts:88](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L88)

***

### getActorDetails()

> **getActorDetails**(`params`): `Promise`\<[`Actor`](../interfaces/Actor.md)[]\>

Retrieves details of actors in a given room.

#### Parameters

• **params**

An object containing the roomId to search for actors.

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Actor`](../interfaces/Actor.md)[]\>

A Promise that resolves to an array of Actor objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getActorDetails`](DatabaseAdapter.md#getactordetails)

#### Defined in

[packages/core/src/adapters/sqlite.ts:123](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L123)

***

### getCachedEmbeddings()

> **getCachedEmbeddings**(`opts`): `Promise`\<`object`[]\>

Retrieves cached embeddings based on the specified query parameters.

#### Parameters

• **opts**

• **opts.query\_field\_name**: `string`

• **opts.query\_field\_sub\_name**: `string`

• **opts.query\_input**: `string`

• **opts.query\_match\_count**: `number`

• **opts.query\_table\_name**: `string`

• **opts.query\_threshold**: `number`

#### Returns

`Promise`\<`object`[]\>

A Promise that resolves to an array of objects containing embeddings and levenshtein scores.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getCachedEmbeddings`](DatabaseAdapter.md#getcachedembeddings)

#### Defined in

[packages/core/src/adapters/sqlite.ts:335](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L335)

***

### getGoals()

> **getGoals**(`params`): `Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

Retrieves goals based on specified parameters.

#### Parameters

• **params**

An object containing parameters for goal retrieval.

• **params.count?**: `number`

• **params.onlyInProgress?**: `boolean`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Goal`](../interfaces/Goal.md)[]\>

A Promise that resolves to an array of Goal objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getGoals`](DatabaseAdapter.md#getgoals)

#### Defined in

[packages/core/src/adapters/sqlite.ts:484](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L484)

***

### getMemories()

> **getMemories**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

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

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getMemories`](DatabaseAdapter.md#getmemories)

#### Defined in

[packages/core/src/adapters/sqlite.ts:397](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L397)

***

### getMemoriesByRoomIds()

> **getMemoriesByRoomIds**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Parameters

• **params**

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.roomIds**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`[]

• **params.tableName**: `string`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getMemoriesByRoomIds`](DatabaseAdapter.md#getmemoriesbyroomids)

#### Defined in

[packages/core/src/adapters/sqlite.ts:150](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L150)

***

### getMemoryById()

> **getMemoryById**(`memoryId`): `Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Parameters

• **memoryId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)\>

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getMemoryById`](DatabaseAdapter.md#getmemorybyid)

#### Defined in

[packages/core/src/adapters/sqlite.ts:179](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L179)

***

### getParticipantsForAccount()

> **getParticipantsForAccount**(`userId`): `Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

Retrieves participants associated with a specific account.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The UUID of the account.

#### Returns

`Promise`\<[`Participant`](../interfaces/Participant.md)[]\>

A Promise that resolves to an array of Participant objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getParticipantsForAccount`](DatabaseAdapter.md#getparticipantsforaccount)

#### Defined in

[packages/core/src/adapters/sqlite.ts:30](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L30)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`getParticipantsForRoom`](DatabaseAdapter.md#getparticipantsforroom)

#### Defined in

[packages/core/src/adapters/sqlite.ts:40](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L40)

***

### getParticipantUserState()

> **getParticipantUserState**(`roomId`, `userId`): `Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`"FOLLOWED"` \| `"MUTED"`\>

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getParticipantUserState`](DatabaseAdapter.md#getparticipantuserstate)

#### Defined in

[packages/core/src/adapters/sqlite.ts:46](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L46)

***

### getRelationship()

> **getRelationship**(`params`): `Promise`\<[`Relationship`](../interfaces/Relationship.md)\>

Retrieves a relationship between two users if it exists.

#### Parameters

• **params**

An object containing the UUIDs of the two users (userA and userB).

• **params.userA**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.userB**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Relationship`](../interfaces/Relationship.md)\>

A Promise that resolves to the Relationship object or null if not found.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getRelationship`](DatabaseAdapter.md#getrelationship)

#### Defined in

[packages/core/src/adapters/sqlite.ts:630](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L630)

***

### getRelationships()

> **getRelationships**(`params`): `Promise`\<[`Relationship`](../interfaces/Relationship.md)[]\>

Retrieves all relationships for a specific user.

#### Parameters

• **params**

An object containing the UUID of the user.

• **params.userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<[`Relationship`](../interfaces/Relationship.md)[]\>

A Promise that resolves to an array of Relationship objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`getRelationships`](DatabaseAdapter.md#getrelationships)

#### Defined in

[packages/core/src/adapters/sqlite.ts:648](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L648)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`getRoom`](DatabaseAdapter.md#getroom)

#### Defined in

[packages/core/src/adapters/sqlite.ts:22](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L22)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`getRoomsForParticipant`](DatabaseAdapter.md#getroomsforparticipant)

#### Defined in

[packages/core/src/adapters/sqlite.ts:572](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L572)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`getRoomsForParticipants`](DatabaseAdapter.md#getroomsforparticipants)

#### Defined in

[packages/core/src/adapters/sqlite.ts:578](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L578)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`log`](DatabaseAdapter.md#log)

#### Defined in

[packages/core/src/adapters/sqlite.ts:379](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L379)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeAllGoals`](DatabaseAdapter.md#removeallgoals)

#### Defined in

[packages/core/src/adapters/sqlite.ts:551](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L551)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeAllMemories`](DatabaseAdapter.md#removeallmemories)

#### Defined in

[packages/core/src/adapters/sqlite.ts:459](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L459)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeGoal`](DatabaseAdapter.md#removegoal)

#### Defined in

[packages/core/src/adapters/sqlite.ts:546](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L546)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeMemory`](DatabaseAdapter.md#removememory)

#### Defined in

[packages/core/src/adapters/sqlite.ts:454](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L454)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeParticipant`](DatabaseAdapter.md#removeparticipant)

#### Defined in

[packages/core/src/adapters/sqlite.ts:603](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L603)

***

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

[`DatabaseAdapter`](DatabaseAdapter.md).[`removeRoom`](DatabaseAdapter.md#removeroom)

#### Defined in

[packages/core/src/adapters/sqlite.ts:567](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L567)

***

### searchMemories()

> **searchMemories**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories based on embeddings and other specified parameters.

#### Parameters

• **params**

An object containing parameters for the memory search.

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.embedding**: `number`[]

• **params.match\_count**: `number`

• **params.match\_threshold**: `number`

• **params.roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.tableName**: `string`

• **params.unique**: `boolean`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`searchMemories`](DatabaseAdapter.md#searchmemories)

#### Defined in

[packages/core/src/adapters/sqlite.ts:235](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L235)

***

### searchMemoriesByEmbedding()

> **searchMemoriesByEmbedding**(`embedding`, `params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Searches for memories by embedding and other specified parameters.

#### Parameters

• **embedding**: `number`[]

The embedding vector to search with.

• **params**

Additional parameters for the search.

• **params.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.count?**: `number`

• **params.match\_threshold?**: `number`

• **params.roomId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.tableName**: `string`

• **params.unique?**: `boolean`

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A Promise that resolves to an array of Memory objects.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`searchMemoriesByEmbedding`](DatabaseAdapter.md#searchmemoriesbyembedding)

#### Defined in

[packages/core/src/adapters/sqlite.ts:281](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L281)

***

### setParticipantUserState()

> **setParticipantUserState**(`roomId`, `userId`, `state`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **state**: `"FOLLOWED"` \| `"MUTED"`

#### Returns

`Promise`\<`void`\>

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`setParticipantUserState`](DatabaseAdapter.md#setparticipantuserstate)

#### Defined in

[packages/core/src/adapters/sqlite.ts:59](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L59)

***

### updateGoal()

> **updateGoal**(`goal`): `Promise`\<`void`\>

Updates a specific goal in the database.

#### Parameters

• **goal**: [`Goal`](../interfaces/Goal.md)

The goal object with updated properties.

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal has been updated.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`updateGoal`](DatabaseAdapter.md#updategoal)

#### Defined in

[packages/core/src/adapters/sqlite.ts:518](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L518)

***

### updateGoalStatus()

> **updateGoalStatus**(`params`): `Promise`\<`void`\>

Updates the status of a specific goal.

#### Parameters

• **params**

An object containing the goalId and the new status.

• **params.goalId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **params.status**: [`GoalStatus`](../enumerations/GoalStatus.md)

#### Returns

`Promise`\<`void`\>

A Promise that resolves when the goal status has been updated.

#### Overrides

[`DatabaseAdapter`](DatabaseAdapter.md).[`updateGoalStatus`](DatabaseAdapter.md#updategoalstatus)

#### Defined in

[packages/core/src/adapters/sqlite.ts:371](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/adapters/sqlite.ts#L371)
