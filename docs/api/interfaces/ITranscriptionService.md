# Interface: ITranscriptionService

## Extends

- [`Service`](../classes/Service.md)

## Methods

### transcribeAttachment()

> **transcribeAttachment**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:583](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L583)

---

### transcribeAttachmentLocally()

> **transcribeAttachmentLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:584](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L584)

---

### transcribe()

> **transcribe**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:587](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L587)

---

### transcribeLocally()

> **transcribeLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:588](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L588)
