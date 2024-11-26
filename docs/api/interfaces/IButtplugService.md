[@ai16z/eliza v1.0.0](../index.md) / IButtplugService

# Interface: IButtplugService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### vibrate()

> **vibrate**(`strength`, `duration`): `Promise`\<`void`\>

#### Parameters

• **strength**: `number`

• **duration**: `number`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/plugin-buttplug/src/index.ts:14](https://github.com/ai16z/eliza/blob/main/packages/plugin-buttplug/src/index.ts#L14)

---

### rotate()

> **rotate**(`strength`, `duration`): `Promise`\<`void`\>

#### Parameters

• **strength**: `number`

• **duration**: `number`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/plugin-buttplug/src/index.ts:15](https://github.com/ai16z/eliza/blob/main/packages/plugin-buttplug/src/index.ts#L15)

---

---

### getBatteryLevel()

> **getBatteryLevel**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Defined in

[packages/plugin-buttplug/src/index.ts:17](https://github.com/ai16z/eliza/blob/main/packages/plugin-buttplug/src/index.ts#L17)

---

### isConnected()

> **isConnected**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/plugin-buttplug/src/index.ts:15](https://github.com/ai16z/eliza/blob/main/packages/plugin-buttplug/src/index.ts#L15)

---

### getDevices()

> **getDevices**(): `any`[]

#### Returns

`any`[]

#### Defined in

[packages/plugin-buttplug/src/index.ts:16](https://github.com/ai16z/eliza/blob/main/packages/plugin-buttplug/src/index.ts#L16)
