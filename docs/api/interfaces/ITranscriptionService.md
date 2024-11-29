[@ai16z/eliza v0.1.4-alpha.3](../index.md) / ITranscriptionService

# Interface: ITranscriptionService

## Extends

- [`Service`](../classes/Service.md)

## Accessors

### serviceType

#### Get Signature

> **get** **serviceType**(): [`ServiceType`](../enumerations/ServiceType.md)

##### Returns

[`ServiceType`](../enumerations/ServiceType.md)

#### Inherited from

[`Service`](../classes/Service.md).[`serviceType`](../classes/Service.md#serviceType-1)

#### Defined in

[packages/core/src/types.ts:947](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L947)

## Methods

### initialize()

> `abstract` **initialize**(`runtime`): `Promise`\<`void`\>

Add abstract initialize method that must be implemented by derived classes

#### Parameters

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Service`](../classes/Service.md).[`initialize`](../classes/Service.md#initialize)

#### Defined in

[packages/core/src/types.ts:952](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L952)

***

### transcribeAttachment()

> **transcribeAttachment**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1044](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1044)

***

### transcribeAttachmentLocally()

> **transcribeAttachmentLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1045](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1045)

***

### transcribe()

> **transcribe**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1048](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1048)

***

### transcribeLocally()

> **transcribeLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1049](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1049)
