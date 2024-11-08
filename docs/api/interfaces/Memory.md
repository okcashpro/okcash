# Interface: Memory

Represents a memory record, which could be a message or any other piece of information remembered by the system, including its content, associated user IDs, and optionally, its embedding vector for similarity comparisons.

## Properties

### id?

> `optional` **id**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:165](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L165)

***

### userId

> **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:166](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L166)

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:167](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L167)

***

### createdAt?

> `optional` **createdAt**: `number`

#### Defined in

[packages/core/src/core/types.ts:168](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L168)

***

### content

> **content**: [`Content`](Content.md)

#### Defined in

[packages/core/src/core/types.ts:169](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L169)

***

### embedding?

> `optional` **embedding**: `number`[]

#### Defined in

[packages/core/src/core/types.ts:170](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L170)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:171](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L171)

***

### unique?

> `optional` **unique**: `boolean`

#### Defined in

[packages/core/src/core/types.ts:172](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L172)
