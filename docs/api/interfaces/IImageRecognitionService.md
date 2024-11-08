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

[packages/core/src/core/types.ts:558](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L558)

***

### initialize()

> **initialize**(`modelId`?, `device`?): `Promise`\<`void`\>

#### Parameters

• **modelId?**: `string`

• **device?**: `string`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:557](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L557)
