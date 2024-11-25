[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Memory

# Interface: Memory

Represents a stored memory/message

## Properties

### id?

> `optional` **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Optional unique identifier

#### Defined in

[packages/core/src/types.ts:306](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L306)

***

### userId

> **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated user ID

#### Defined in

[packages/core/src/types.ts:309](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L309)

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated agent ID

#### Defined in

[packages/core/src/types.ts:312](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L312)

***

### createdAt?

> `optional` **createdAt**: `number`

Optional creation timestamp

#### Defined in

[packages/core/src/types.ts:315](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L315)

***

### content

> **content**: [`Content`](Content.md)

Memory content

#### Defined in

[packages/core/src/types.ts:318](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L318)

***

### embedding?

> `optional` **embedding**: `number`[]

Optional embedding vector

#### Defined in

[packages/core/src/types.ts:321](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L321)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated room ID

#### Defined in

[packages/core/src/types.ts:324](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L324)

***

### unique?

> `optional` **unique**: `boolean`

Whether memory is unique

#### Defined in

[packages/core/src/types.ts:327](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L327)

***

### similarity?

> `optional` **similarity**: `number`

Embedding similarity score

#### Defined in

[packages/core/src/types.ts:330](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L330)
