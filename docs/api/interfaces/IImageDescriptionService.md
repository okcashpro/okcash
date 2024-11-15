[@ai16z/eliza v1.0.0](../index.md) / IImageDescriptionService

# Interface: IImageDescriptionService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### getInstance()

> **getInstance**(): [`IImageDescriptionService`](IImageDescriptionService.md)

#### Returns

[`IImageDescriptionService`](IImageDescriptionService.md)

#### Defined in

[packages/core/src/types.ts:583](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L583)

***

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:584](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L584)

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

[packages/core/src/types.ts:585](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L585)
