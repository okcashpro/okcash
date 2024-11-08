# Interface: IBrowserService

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:599](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L599)

***

### closeBrowser()

> **closeBrowser**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/core/types.ts:600](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L600)

***

### getPageContent()

> **getPageContent**(`url`): `Promise`\<`object`\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<`object`\>

##### title

> **title**: `string`

##### description

> **description**: `string`

##### bodyContent

> **bodyContent**: `string`

#### Defined in

[packages/core/src/core/types.ts:601](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L601)
