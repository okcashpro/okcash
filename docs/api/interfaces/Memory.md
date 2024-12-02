[@ai16z/eliza v0.1.4-alpha.3](../index.md) / Memory

# Interface: Memory

Represents a stored memory/message

## Properties

### id?

> `optional` **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Optional unique identifier

#### Defined in

[packages/core/src/types.ts:323](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L323)

***

### userId

> **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated user ID

#### Defined in

[packages/core/src/types.ts:326](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L326)

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated agent ID

#### Defined in

[packages/core/src/types.ts:329](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L329)

***

### createdAt?

> `optional` **createdAt**: `number`

Optional creation timestamp

#### Defined in

[packages/core/src/types.ts:332](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L332)

***

### content

> **content**: [`Content`](Content.md)

Memory content

#### Defined in

[packages/core/src/types.ts:335](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L335)

***

### embedding?

> `optional` **embedding**: `number`[]

Optional embedding vector

#### Defined in

[packages/core/src/types.ts:338](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L338)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Associated room ID

#### Defined in

[packages/core/src/types.ts:341](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L341)

***

### unique?

> `optional` **unique**: `boolean`

Whether memory is unique

#### Defined in

[packages/core/src/types.ts:344](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L344)

***

### similarity?

> `optional` **similarity**: `number`

Embedding similarity score

#### Defined in

[packages/core/src/types.ts:347](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L347)
