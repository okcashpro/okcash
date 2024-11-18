[@ai16z/eliza v1.0.0](../index.md) / IBrowserService

# Interface: IBrowserService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:641](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L641)

---

### closeBrowser()

> **closeBrowser**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/types.ts:642](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L642)

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

[packages/core/src/types.ts:643](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L643)
