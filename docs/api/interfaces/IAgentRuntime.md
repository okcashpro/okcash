[@ai16z/eliza v1.0.0](../index.md) / IAgentRuntime

# Interface: IAgentRuntime

## Properties

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Properties

#### Defined in

[packages/core/src/types.ts:532](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L532)

---

### serverUrl

> **serverUrl**: `string`

#### Defined in

[packages/core/src/types.ts:533](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L533)

---

### databaseAdapter

> **databaseAdapter**: [`IDatabaseAdapter`](IDatabaseAdapter.md)

#### Defined in

[packages/core/src/types.ts:534](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L534)

---

### token

> **token**: `string`

#### Defined in

[packages/core/src/types.ts:535](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L535)

---

### modelProvider

> **modelProvider**: [`ModelProviderName`](../enumerations/ModelProviderName.md)

#### Defined in

[packages/core/src/types.ts:536](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L536)

---

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[packages/core/src/types.ts:537](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L537)

---

### providers

> **providers**: [`Provider`](Provider.md)[]

#### Defined in

[packages/core/src/types.ts:538](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L538)

---

### actions

> **actions**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/types.ts:539](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L539)

---

### evaluators

> **evaluators**: [`Evaluator`](Evaluator.md)[]

#### Defined in

[packages/core/src/types.ts:540](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L540)

---

### messageManager

> **messageManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:542](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L542)

---

### descriptionManager

> **descriptionManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:543](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L543)

---

### loreManager

> **loreManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:544](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L544)

---

### services

> **services**: `Map`\<[`ServiceType`](../enumerations/ServiceType.md), [`Service`](../classes/Service.md)\>

#### Defined in

[packages/core/src/types.ts:546](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L546)

## Methods

### registerMemoryManager()

> **registerMemoryManager**(`manager`): `void`

#### Parameters

• **manager**: [`IMemoryManager`](IMemoryManager.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:547](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L547)

---

### getMemoryManager()

> **getMemoryManager**(`name`): [`IMemoryManager`](IMemoryManager.md)

#### Parameters

• **name**: `string`

#### Returns

[`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:549](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L549)

---

### getService()

> **getService**(`service`): _typeof_ [`Service`](../classes/Service.md)

#### Parameters

• **service**: `string`

#### Returns

_typeof_ [`Service`](../classes/Service.md)

#### Defined in

[packages/core/src/types.ts:551](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L551)

---

### registerService()

> **registerService**(`service`): `void`

#### Parameters

• **service**: [`Service`](../classes/Service.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:553](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L553)

---

### getSetting()

> **getSetting**(`key`): `string`

#### Parameters

• **key**: `string`

#### Returns

`string`

#### Defined in

[packages/core/src/types.ts:555](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L555)

---

### getConversationLength()

> **getConversationLength**(): `number`

Methods

#### Returns

`number`

#### Defined in

[packages/core/src/types.ts:558](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L558)

---

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

[packages/core/src/types.ts:559](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L559)

---

### evaluate()

> **evaluate**(`message`, `state`?, `didRespond`?): `Promise`\<`string`[]\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

• **didRespond?**: `boolean`

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[packages/core/src/types.ts:565](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L565)

---

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:570](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L570)

---

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

[packages/core/src/types.ts:571](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L571)

---

### registerAction()

> **registerAction**(`action`): `void`

#### Parameters

• **action**: [`Action`](Action.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:577](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L577)

---

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

[packages/core/src/types.ts:578](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L578)

---

### ensureParticipantInRoom()

> **ensureParticipantInRoom**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:585](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L585)

---

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:586](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L586)

---

### composeState()

> **composeState**(`message`, `additionalKeys`?): `Promise`\<[`State`](State.md)\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **additionalKeys?**

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:587](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L587)

---

### updateRecentMessageState()

> **updateRecentMessageState**(`state`): `Promise`\<[`State`](State.md)\>

#### Parameters

• **state**: [`State`](State.md)

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:591](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L591)
