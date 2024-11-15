[@ai16z/eliza v1.0.0](../index.md) / IVideoService

# Interface: IVideoService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### isVideoUrl()

> **isVideoUrl**(`url`): `boolean`

#### Parameters

• **url**: `string`

#### Returns

`boolean`

#### Defined in

[packages/core/src/types.ts:600](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L600)

***

### processVideo()

> **processVideo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:601](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L601)

***

### fetchVideoInfo()

> **fetchVideoInfo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:602](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L602)

***

### downloadVideo()

> **downloadVideo**(`videoInfo`): `Promise`\<`string`\>

#### Parameters

• **videoInfo**: [`Media`](../type-aliases/Media.md)

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:603](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L603)
