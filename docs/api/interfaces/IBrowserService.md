# Interface: IBrowserService

## Methods

### closeBrowser()

> **closeBrowser**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:600](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L600)

***

### getPageContent()

> **getPageContent**(`url`): `Promise`\<`object`\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<`object`\>

##### bodyContent

> **bodyContent**: `string`

##### description

> **description**: `string`

##### title

> **title**: `string`

#### Defined in

[packages/core/src/core/types.ts:601](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L601)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:599](https://github.com/ai16z/eliza/blob/d30d0a6e4929f1f9ad2fee78a425cc005922c069/packages/core/src/core/types.ts#L599)
