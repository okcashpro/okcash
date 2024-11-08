# Interface: CreateAndBuyContent

Represents the content of a message, including its main text (`content`), any associated action (`action`), and the source of the content (`source`), if applicable.

## Extends

- [`Content`](Content.md)

## Properties

### deployerPrivateKey

> **deployerPrivateKey**: `string`

#### Defined in

[packages/core/src/actions/pumpfun.ts:23](https://github.com/ai16z/eliza/blob/main/packages/core/src/actions/pumpfun.ts#L23)

***

### tokenMetadata

> **tokenMetadata**: `CreateTokenMetadata`

#### Defined in

[packages/core/src/actions/pumpfun.ts:24](https://github.com/ai16z/eliza/blob/main/packages/core/src/actions/pumpfun.ts#L24)

***

### buyAmountSol

> **buyAmountSol**: `string` \| `number`

#### Defined in

[packages/core/src/actions/pumpfun.ts:25](https://github.com/ai16z/eliza/blob/main/packages/core/src/actions/pumpfun.ts#L25)

***

### priorityFee

> **priorityFee**: `object`

#### unitLimit

> **unitLimit**: `number`

#### unitPrice

> **unitPrice**: `number`

#### Defined in

[packages/core/src/actions/pumpfun.ts:26](https://github.com/ai16z/eliza/blob/main/packages/core/src/actions/pumpfun.ts#L26)

***

### allowOffCurve

> **allowOffCurve**: `boolean`

#### Defined in

[packages/core/src/actions/pumpfun.ts:30](https://github.com/ai16z/eliza/blob/main/packages/core/src/actions/pumpfun.ts#L30)

***

### text

> **text**: `string`

#### Inherited from

[`Content`](Content.md).[`text`](Content.md#text)

#### Defined in

[packages/core/src/core/types.ts:13](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L13)

***

### action?

> `optional` **action**: `string`

#### Inherited from

[`Content`](Content.md).[`action`](Content.md#action)

#### Defined in

[packages/core/src/core/types.ts:14](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L14)

***

### source?

> `optional` **source**: `string`

#### Inherited from

[`Content`](Content.md).[`source`](Content.md#source)

#### Defined in

[packages/core/src/core/types.ts:15](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L15)

***

### url?

> `optional` **url**: `string`

#### Inherited from

[`Content`](Content.md).[`url`](Content.md#url)

#### Defined in

[packages/core/src/core/types.ts:16](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L16)

***

### inReplyTo?

> `optional` **inReplyTo**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Inherited from

[`Content`](Content.md).[`inReplyTo`](Content.md#inreplyto)

#### Defined in

[packages/core/src/core/types.ts:17](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L17)

***

### attachments?

> `optional` **attachments**: [`Media`](../type-aliases/Media.md)[]

#### Inherited from

[`Content`](Content.md).[`attachments`](Content.md#attachments)

#### Defined in

[packages/core/src/core/types.ts:18](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L18)
