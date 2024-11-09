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

[packages/core/src/types.ts:592](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L592)

---

### processVideo()

> **processVideo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:593](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L593)

---

### fetchVideoInfo()

> **fetchVideoInfo**(`url`): `Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<[`Media`](../type-aliases/Media.md)\>

#### Defined in

[packages/core/src/types.ts:594](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L594)

---

### downloadVideo()

> **downloadVideo**(`videoInfo`): `Promise`\<`string`\>

#### Parameters

• **videoInfo**: [`Media`](../type-aliases/Media.md)

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:595](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L595)
