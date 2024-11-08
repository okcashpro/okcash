# Interface: IBrowserService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:621](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L621)

---

### closeBrowser()

> **closeBrowser**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:622](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L622)

---

### getPageContent()

> **getPageContent**(`url`, `runtime`): `Promise`\<`object`\>

#### Parameters

• **url**: `string`

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Returns

`Promise`\<`object`\>

##### title

> **title**: `string`

##### description

> **description**: `string`

##### bodyContent

> **bodyContent**: `string`

#### Defined in

[packages/core/src/types.ts:623](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L623)
