# Interface: IImageDescriptionService

## Extends

- `Service`

## Methods

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:570](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L570)

***

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

[packages/core/src/types.ts:571](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L571)
