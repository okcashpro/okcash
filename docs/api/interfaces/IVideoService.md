[@ai16z/eliza v0.1.4-alpha.3](../index.md) / IVideoService

# Interface: IVideoService

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

[packages/core/src/types.ts:927](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L927)

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

[packages/core/src/types.ts:932](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L932)

***

### isVideoUrl()

> **isVideoUrl**(`url`): `boolean`

#### Parameters

• **url**: `string`

#### Returns

`boolean`

#### Defined in

[packages/core/src/types.ts:1033](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1033)

***

### fetchVideoInfo()

> **fetchVideoInfo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:1034](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1034)

***

### downloadVideo()

> **downloadVideo**(`videoInfo`): `Promise`\<`string`\>

#### Parameters

• **videoInfo**: [`Media`](../type-aliases/Media.md)

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1035](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1035)

***

### processVideo()

> **processVideo**(`url`, `runtime`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:1036](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L1036)
