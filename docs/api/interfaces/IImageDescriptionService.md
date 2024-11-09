# Interface: IImageDescriptionService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:576](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L576)

---

### describeImage()

> **describeImage**(`imageUrl`): `Promise`\<`object`\>

#### Parameters

• **imageUrl**: `string`

#### Returns

`Promise`\<`object`\>

##### title

> **title**: `string`

##### description

> **description**: `string`

#### Defined in

[packages/core/src/types.ts:577](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L577)
