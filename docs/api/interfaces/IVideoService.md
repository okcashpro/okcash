[@ai16z/eliza v0.1.3](../index.md) / IVideoService

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

[packages/core/src/types.ts:580](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L580)

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

[packages/core/src/types.ts:585](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L585)

***

### getInstance()

> **getInstance**(): [`IVideoService`](IVideoService.md)

#### Returns

[`IVideoService`](IVideoService.md)

#### Defined in

[packages/core/src/types.ts:675](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L675)

***

### isVideoUrl()

> **isVideoUrl**(`url`): `boolean`

#### Parameters

• **url**: `string`

#### Returns

`boolean`

#### Defined in

[packages/core/src/types.ts:676](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L676)

***

### processVideo()

> **processVideo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:677](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L677)

***

### fetchVideoInfo()

> **fetchVideoInfo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:678](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L678)

***

### downloadVideo()

> **downloadVideo**(`videoInfo`): `Promise`\<`string`\>

#### Parameters

• **videoInfo**: [`Media`](../type-aliases/Media.md)

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:679](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L679)
