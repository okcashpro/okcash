[@ai16z/eliza v0.1.4-alpha.3](../index.md) / IAgentRuntime

# Interface: IAgentRuntime

## Properties

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Properties

#### Defined in

[packages/core/src/types.ts:983](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L983)

***

### serverUrl

> **serverUrl**: `string`

#### Defined in

[packages/core/src/types.ts:984](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L984)

***

### databaseAdapter

> **databaseAdapter**: [`IDatabaseAdapter`](IDatabaseAdapter.md)

#### Defined in

[packages/core/src/types.ts:985](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L985)

***

### token

> **token**: `string`

#### Defined in

[packages/core/src/types.ts:986](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L986)

***

### modelProvider

> **modelProvider**: [`ModelProviderName`](../enumerations/ModelProviderName.md)

#### Defined in

[packages/core/src/types.ts:987](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L987)

***

### imageModelProvider

> **imageModelProvider**: [`ModelProviderName`](../enumerations/ModelProviderName.md)

#### Defined in

[packages/core/src/types.ts:988](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L988)

***

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[packages/core/src/types.ts:989](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L989)

***

### providers

> **providers**: [`Provider`](Provider.md)[]

#### Defined in

[packages/core/src/types.ts:990](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L990)

***

### actions

> **actions**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/types.ts:991](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L991)

***

### evaluators

> **evaluators**: [`Evaluator`](Evaluator.md)[]

#### Defined in

[packages/core/src/types.ts:992](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L992)

***

### plugins

> **plugins**: [`Plugin`](../type-aliases/Plugin.md)[]

#### Defined in

[packages/core/src/types.ts:993](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L993)

***

### messageManager

> **messageManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:995](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L995)

***

### descriptionManager

> **descriptionManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:996](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L996)

***

### documentsManager

> **documentsManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:997](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L997)

***

### knowledgeManager

> **knowledgeManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:998](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L998)

***

### loreManager

> **loreManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:999](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L999)

***

### cacheManager

> **cacheManager**: [`ICacheManager`](ICacheManager.md)

#### Defined in

[packages/core/src/types.ts:1001](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1001)

***

### services

> **services**: `Map`\<[`ServiceType`](../enumerations/ServiceType.md), [`Service`](../classes/Service.md)\>

#### Defined in

[packages/core/src/types.ts:1003](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1003)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:1005](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1005)

***

### registerMemoryManager()

> **registerMemoryManager**(`manager`): `void`

#### Parameters

• **manager**: [`IMemoryManager`](IMemoryManager.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:1007](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1007)

***

### getMemoryManager()

> **getMemoryManager**(`name`): [`IMemoryManager`](IMemoryManager.md)

#### Parameters

• **name**: `string`

#### Returns

[`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/types.ts:1009](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1009)

***

### getService()

> **getService**\<`T`\>(`service`): `T`

#### Type Parameters

• **T** *extends* [`Service`](../classes/Service.md)

#### Parameters

• **service**: [`ServiceType`](../enumerations/ServiceType.md)

#### Returns

`T`

#### Defined in

[packages/core/src/types.ts:1011](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1011)

***

### registerService()

> **registerService**(`service`): `void`

#### Parameters

• **service**: [`Service`](../classes/Service.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:1013](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1013)

***

### getSetting()

> **getSetting**(`key`): `string`

#### Parameters

• **key**: `string`

#### Returns

`string`

#### Defined in

[packages/core/src/types.ts:1015](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1015)

***

### getConversationLength()

> **getConversationLength**(): `number`

Methods

#### Returns

`number`

#### Defined in

[packages/core/src/types.ts:1018](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1018)

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

[packages/core/src/types.ts:1020](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1020)

***

### evaluate()

> **evaluate**(`message`, `state`?, `didRespond`?): `Promise`\<`string`[]\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

• **didRespond?**: `boolean`

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[packages/core/src/types.ts:1027](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1027)

***

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:1033](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1033)

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

[packages/core/src/types.ts:1035](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1035)

***

### registerAction()

> **registerAction**(`action`): `void`

#### Parameters

• **action**: [`Action`](Action.md)

#### Returns

`void`

#### Defined in

[packages/core/src/types.ts:1042](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1042)

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

[packages/core/src/types.ts:1044](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1044)

***

### ensureParticipantInRoom()

> **ensureParticipantInRoom**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:1052](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1052)

***

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:1054](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1054)

***

### composeState()

> **composeState**(`message`, `additionalKeys`?): `Promise`\<[`State`](State.md)\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **additionalKeys?**

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:1056](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1056)

***

### updateRecentMessageState()

> **updateRecentMessageState**(`state`): `Promise`\<[`State`](State.md)\>

#### Parameters

• **state**: [`State`](State.md)

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/types.ts:1061](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1061)
