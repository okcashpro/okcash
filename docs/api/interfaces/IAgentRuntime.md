# Interface: IAgentRuntime

## Properties

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:509](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L509)

***

### serverUrl

> **serverUrl**: `string`

#### Defined in

[packages/core/src/types.ts:510](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L510)

***

### databaseAdapter

> **databaseAdapter**: [`IDatabaseAdapter`](IDatabaseAdapter.md)

#### Defined in

[packages/core/src/types.ts:511](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L511)

***

### token

> **token**: `string`

#### Defined in

[packages/core/src/types.ts:512](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L512)

***

### modelProvider

> **modelProvider**: [`ModelProviderName`](../enumerations/ModelProviderName.md)

#### Defined in

[packages/core/src/types.ts:513](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L513)

***

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[packages/core/src/types.ts:514](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L514)

***

### providers

> **providers**: [`Provider`](Provider.md)[]

#### Defined in

[packages/core/src/types.ts:515](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L515)

***

### actions

> **actions**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/types.ts:516](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L516)

***

### evaluators

> **evaluators**: [`Evaluator`](Evaluator.md)[]

#### Defined in

[packages/core/src/types.ts:517](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L517)

***

### messageManager

> **messageManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:519](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L519)

***

### descriptionManager

> **descriptionManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:520](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L520)

***

### loreManager

> **loreManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:521](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L521)

***

### factManager

> **factManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:522](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L522)

***

### services

> **services**: `Map`\<[`ServiceType`](../enumerations/ServiceType.md), `Service`\>

#### Defined in

[packages/core/src/types.ts:525](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L525)

## Methods

### registerMemoryManager()

> **registerMemoryManager**(`manager`): `void`

#### Parameters

• **manager**: [`IMemoryManager`](IMemoryManager.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:526](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L526)

***

### getMemoryManager()

> **getMemoryManager**(`name`): [`IMemoryManager`](IMemoryManager.md)

#### Parameters

• **name**: `string`

#### Returns

[`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:528](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L528)

***

### getService()

> **getService**\<`Service`\>(`service`): `Service`

#### Type Parameters

• **Service**

#### Parameters

• **service**: `string`

#### Returns

`Service`

#### Defined in

[packages/core/src/types.ts:530](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L530)

***

### registerService()

> **registerService**(`service`): `void`

#### Parameters

• **service**: `Service`

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:532](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L532)

***

### getSetting()

> **getSetting**(`key`): `string`

#### Parameters

• **key**: `string`

#### Returns

`string`

#### Defined in

[packages/core/src/types.ts:534](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L534)

***

### getConversationLength()

> **getConversationLength**(): `number`

#### Returns

`number`

#### Defined in

[packages/core/src/types.ts:537](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L537)

***

### processActions()

> **processActions**(`message`, `responses`, `state`?, `callback`?): `Promise`\<`void`\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **responses**: [`Memory`](Memory.md)[]

• **state?**: [`State`](State.md)

• **callback?**: [`HandlerCallback`](../type-aliases/HandlerCallback.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:538](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L538)

***

### evaluate()

> **evaluate**(`message`, `state`?): `Promise`\<`string`[]\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[packages/core/src/types.ts:544](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L544)

***

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:545](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L545)

***

### ensureUserExists()

> **ensureUserExists**(`userId`, `userName`, `name`, `source`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userName**: `string`

• **name**: `string`

• **source**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:546](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L546)

***

### registerAction()

> **registerAction**(`action`): `void`

#### Parameters

• **action**: [`Action`](Action.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:552](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L552)

***

### ensureConnection()

> **ensureConnection**(`userId`, `roomId`, `userName`?, `userScreenName`?, `source`?): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **userName?**: `string`

• **userScreenName?**: `string`

• **source?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:553](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L553)

***

### ensureParticipantInRoom()

> **ensureParticipantInRoom**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:560](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L560)

***

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:561](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L561)

***

### composeState()

> **composeState**(`message`, `additionalKeys`?): `Promise`\<[`State`](State.md)\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **additionalKeys?**

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:562](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L562)

***

### updateRecentMessageState()

> **updateRecentMessageState**(`state`): `Promise`\<[`State`](State.md)\>

#### Parameters

• **state**: [`State`](State.md)

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:566](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L566)
