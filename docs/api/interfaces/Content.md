[@ai16z/eliza v1.0.0](../index.md) / Content

# Interface: Content

Represents the content of a message, including its main text (`content`), any associated action (`action`), and the source of the content (`source`), if applicable.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### text

> **text**: `string`

#### Defined in

[packages/core/src/types.ts:12](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L12)

---

### action?

> `optional` **action**: `string`

#### Defined in

[packages/core/src/types.ts:13](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L13)

---

### source?

> `optional` **source**: `string`

#### Defined in

[packages/core/src/types.ts:14](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L14)

---

### url?

> `optional` **url**: `string`

#### Defined in

[packages/core/src/types.ts:15](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L15)

---

### inReplyTo?

> `optional` **inReplyTo**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:16](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L16)

---

### attachments?

> `optional` **attachments**: [`Media`](../type-aliases/Media.md)[]

#### Defined in

[packages/core/src/types.ts:17](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L17)
