# Interface: IAgentRuntime

## Properties

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:499](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L499)

***

### serverUrl

> **serverUrl**: `string`

#### Defined in

[packages/core/src/core/types.ts:500](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L500)

***

### databaseAdapter

> **databaseAdapter**: [`IDatabaseAdapter`](IDatabaseAdapter.md)

#### Defined in

[packages/core/src/core/types.ts:501](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L501)

***

### token

> **token**: `string`

#### Defined in

[packages/core/src/core/types.ts:502](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L502)

***

### modelProvider

> **modelProvider**: [`ModelProvider`](../enumerations/ModelProvider.md)

#### Defined in

[packages/core/src/core/types.ts:503](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L503)

***

### imageGenModel

> **imageGenModel**: [`ImageGenModel`](../enumerations/ImageGenModel.md)

#### Defined in

[packages/core/src/core/types.ts:504](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L504)

***

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[packages/core/src/core/types.ts:505](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L505)

***

### providers

> **providers**: [`Provider`](Provider.md)[]

#### Defined in

[packages/core/src/core/types.ts:506](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L506)

***

### actions

> **actions**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/core/types.ts:507](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L507)

***

### messageManager

> **messageManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/core/types.ts:509](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L509)

***

### descriptionManager

> **descriptionManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/core/types.ts:510](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L510)

***

### factManager

> **factManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/core/types.ts:511](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L511)

***

### loreManager

> **loreManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[packages/core/src/core/types.ts:512](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L512)

***

### imageDescriptionService

> **imageDescriptionService**: [`IImageRecognitionService`](IImageRecognitionService.md)

#### Defined in

[packages/core/src/core/types.ts:513](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L513)

***

### transcriptionService

> **transcriptionService**: [`ITranscriptionService`](ITranscriptionService.md)

#### Defined in

[packages/core/src/core/types.ts:514](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L514)

***

### videoService

> **videoService**: [`IVideoService`](IVideoService.md)

#### Defined in

[packages/core/src/core/types.ts:515](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L515)

***

### llamaService

> **llamaService**: [`ILlamaService`](ILlamaService.md)

#### Defined in

[packages/core/src/core/types.ts:516](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L516)

***

### browserService

> **browserService**: [`IBrowserService`](IBrowserService.md)

#### Defined in

[packages/core/src/core/types.ts:517](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L517)

***

### speechService

> **speechService**: [`ISpeechService`](ISpeechService.md)

#### Defined in

[packages/core/src/core/types.ts:518](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L518)

***

### pdfService

> **pdfService**: [`IPdfService`](IPdfService.md)

#### Defined in

[packages/core/src/core/types.ts:519](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L519)

## Methods

### getSetting()

> **getSetting**(`key`): `string`

#### Parameters

• **key**: `string`

#### Returns

`string`

#### Defined in

[packages/core/src/core/types.ts:521](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L521)

***

### getConversationLength()

> **getConversationLength**(): `number`

#### Returns

`number`

#### Defined in

[packages/core/src/core/types.ts:524](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L524)

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

[packages/core/src/core/types.ts:525](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L525)

***

### evaluate()

> **evaluate**(`message`, `state`?): `Promise`\<`string`[]\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[packages/core/src/core/types.ts:531](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L531)

***

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:532](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L532)

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

[packages/core/src/core/types.ts:533](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L533)

***

### registerAction()

> **registerAction**(`action`): `void`

#### Parameters

• **action**: [`Action`](Action.md)

#### Returns

`void`

#### Defined in

[packages/core/src/core/types.ts:539](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L539)

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

[packages/core/src/core/types.ts:540](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L540)

***

### ensureParticipantInRoom()

> **ensureParticipantInRoom**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:547](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L547)

***

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:548](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L548)

***

### composeState()

> **composeState**(`message`, `additionalKeys`?): `Promise`\<[`State`](State.md)\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **additionalKeys?**

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/core/types.ts:549](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L549)

***

### updateRecentMessageState()

> **updateRecentMessageState**(`state`): `Promise`\<[`State`](State.md)\>

#### Parameters

• **state**: [`State`](State.md)

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[packages/core/src/core/types.ts:553](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L553)
