# Interface: Memory

Represents a memory record, which could be a message or any other piece of information remembered by the system, including its content, associated user IDs, and optionally, its embedding vector for similarity comparisons.

## Properties

### id?

> `optional` **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:170](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L170)

***

### userId

> **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:171](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L171)

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:172](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L172)

***

### createdAt?

> `optional` **createdAt**: `number`

#### Defined in

[packages/core/src/types.ts:173](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L173)

***

### content

> **content**: [`Content`](Content.md)

#### Defined in

[packages/core/src/types.ts:174](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L174)

***

### embedding?

> `optional` **embedding**: `number`[]

#### Defined in

[packages/core/src/types.ts:175](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L175)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:176](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L176)

***

### unique?

> `optional` **unique**: `boolean`

#### Defined in

[packages/core/src/types.ts:177](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L177)
