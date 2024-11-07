# Interface: IAgentRuntime

## Properties

### actions

> **actions**: [`Action`](Action.md)[]

#### Defined in

[core/src/core/types.ts:494](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L494)

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[core/src/core/types.ts:486](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L486)

***

### browserService

> **browserService**: [`IBrowserService`](IBrowserService.md)

#### Defined in

[core/src/core/types.ts:504](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L504)

***

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[core/src/core/types.ts:492](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L492)

***

### databaseAdapter

> **databaseAdapter**: [`IDatabaseAdapter`](IDatabaseAdapter.md)

#### Defined in

[core/src/core/types.ts:488](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L488)

***

### descriptionManager

> **descriptionManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[core/src/core/types.ts:497](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L497)

***

### factManager

> **factManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[core/src/core/types.ts:498](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L498)

***

### imageDescriptionService

> **imageDescriptionService**: [`IImageRecognitionService`](IImageRecognitionService.md)

#### Defined in

[core/src/core/types.ts:500](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L500)

***

### imageGenModel

> **imageGenModel**: [`ImageGenModel`](../enumerations/ImageGenModel.md)

#### Defined in

[core/src/core/types.ts:491](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L491)

***

### llamaService

> **llamaService**: [`ILlamaService`](ILlamaService.md)

#### Defined in

[core/src/core/types.ts:503](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L503)

***

### loreManager

> **loreManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[core/src/core/types.ts:499](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L499)

***

### messageManager

> **messageManager**: [`IMemoryManager`](IMemoryManager.md)

#### Defined in

[core/src/core/types.ts:496](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L496)

***

### modelProvider

> **modelProvider**: [`ModelProvider`](../enumerations/ModelProvider.md)

#### Defined in

[core/src/core/types.ts:490](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L490)

***

### pdfService

> **pdfService**: [`IPdfService`](IPdfService.md)

#### Defined in

[core/src/core/types.ts:506](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L506)

***

### providers

> **providers**: [`Provider`](Provider.md)[]

#### Defined in

[core/src/core/types.ts:493](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L493)

***

### serverUrl

> **serverUrl**: `string`

#### Defined in

[core/src/core/types.ts:487](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L487)

***

### speechService

> **speechService**: [`ISpeechService`](ISpeechService.md)

#### Defined in

[core/src/core/types.ts:505](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L505)

***

### token

> **token**: `string`

#### Defined in

[core/src/core/types.ts:489](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L489)

***

### transcriptionService

> **transcriptionService**: [`ITranscriptionService`](ITranscriptionService.md)

#### Defined in

[core/src/core/types.ts:501](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L501)

***

### videoService

> **videoService**: [`IVideoService`](IVideoService.md)

#### Defined in

[core/src/core/types.ts:502](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L502)

## Methods

### composeState()

> **composeState**(`message`, `additionalKeys`?): `Promise`\<[`State`](State.md)\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **additionalKeys?**

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[core/src/core/types.ts:536](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L536)

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

[core/src/core/types.ts:527](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L527)

***

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:519](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L519)

***

### ensureParticipantInRoom()

> **ensureParticipantInRoom**(`userId`, `roomId`): `Promise`\<`void`\>

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:534](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L534)

***

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:535](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L535)

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

[core/src/core/types.ts:520](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L520)

***

### evaluate()

> **evaluate**(`message`, `state`?): `Promise`\<`string`[]\>

#### Parameters

• **message**: [`Memory`](Memory.md)

• **state?**: [`State`](State.md)

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[core/src/core/types.ts:518](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L518)

***

### getConversationLength()

> **getConversationLength**(): `number`

#### Returns

`number`

#### Defined in

[core/src/core/types.ts:511](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L511)

***

### getSetting()

> **getSetting**(`key`): `string`

#### Parameters

• **key**: `string`

#### Returns

`string`

#### Defined in

[core/src/core/types.ts:508](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L508)

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

[core/src/core/types.ts:512](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L512)

***

### registerAction()

> **registerAction**(`action`): `void`

#### Parameters

• **action**: [`Action`](Action.md)

#### Returns

`void`

#### Defined in

[core/src/core/types.ts:526](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L526)

***

### updateRecentMessageState()

> **updateRecentMessageState**(`state`): `Promise`\<[`State`](State.md)\>

#### Parameters

• **state**: [`State`](State.md)

#### Returns

`Promise`\<[`State`](State.md)\>

#### Defined in

[core/src/core/types.ts:540](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L540)
