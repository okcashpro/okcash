# Interface: IImageRecognitionService

## Methods

### describeImage()

> **describeImage**(`imageUrl`): `Promise`\<`object`\>

#### Parameters

• **imageUrl**: `string`

#### Returns

`Promise`\<`object`\>

##### description

> **description**: `string`

##### title

> **title**: `string`

#### Defined in

[core/src/core/types.ts:545](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L545)

***

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:544](https://github.com/ai16z/eliza/blob/c96957e5a5d17e343b499dd4d46ce403856ac5bc/core/src/core/types.ts#L544)
