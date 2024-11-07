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

[core/src/core/types.ts:544](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L544)

***

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[core/src/core/types.ts:543](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/types.ts#L543)
