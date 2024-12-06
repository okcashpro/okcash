[@ai16z/eliza v0.1.5-alpha.3](../index.md) / State

# Interface: State

Represents the current state/context of a conversation

## Indexable

 \[`key`: `string`\]: `unknown`

## Properties

### userId?

> `optional` **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of user who sent current message

#### Defined in

[packages/core/src/types.ts:240](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L240)

***

### agentId?

> `optional` **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of agent in conversation

#### Defined in

[packages/core/src/types.ts:243](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L243)

***

### bio

> **bio**: `string`

Agent's biography

#### Defined in

[packages/core/src/types.ts:246](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L246)

***

### lore

> **lore**: `string`

Agent's background lore

#### Defined in

[packages/core/src/types.ts:249](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L249)

***

### messageDirections

> **messageDirections**: `string`

Message handling directions

#### Defined in

[packages/core/src/types.ts:252](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L252)

***

### postDirections

> **postDirections**: `string`

Post handling directions

#### Defined in

[packages/core/src/types.ts:255](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L255)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Current room/conversation ID

#### Defined in

[packages/core/src/types.ts:258](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L258)

***

### agentName?

> `optional` **agentName**: `string`

Optional agent name

#### Defined in

[packages/core/src/types.ts:261](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L261)

***

### senderName?

> `optional` **senderName**: `string`

Optional message sender name

#### Defined in

[packages/core/src/types.ts:264](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L264)

***

### actors

> **actors**: `string`

String representation of conversation actors

#### Defined in

[packages/core/src/types.ts:267](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L267)

***

### actorsData?

> `optional` **actorsData**: [`Actor`](Actor.md)[]

Optional array of actor objects

#### Defined in

[packages/core/src/types.ts:270](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L270)

***

### goals?

> `optional` **goals**: `string`

Optional string representation of goals

#### Defined in

[packages/core/src/types.ts:273](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L273)

***

### goalsData?

> `optional` **goalsData**: [`Goal`](Goal.md)[]

Optional array of goal objects

#### Defined in

[packages/core/src/types.ts:276](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L276)

***

### recentMessages

> **recentMessages**: `string`

Recent message history as string

#### Defined in

[packages/core/src/types.ts:279](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L279)

***

### recentMessagesData

> **recentMessagesData**: [`Memory`](Memory.md)[]

Recent message objects

#### Defined in

[packages/core/src/types.ts:282](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L282)

***

### actionNames?

> `optional` **actionNames**: `string`

Optional valid action names

#### Defined in

[packages/core/src/types.ts:285](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L285)

***

### actions?

> `optional` **actions**: `string`

Optional action descriptions

#### Defined in

[packages/core/src/types.ts:288](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L288)

***

### actionsData?

> `optional` **actionsData**: [`Action`](Action.md)[]

Optional action objects

#### Defined in

[packages/core/src/types.ts:291](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L291)

***

### actionExamples?

> `optional` **actionExamples**: `string`

Optional action examples

#### Defined in

[packages/core/src/types.ts:294](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L294)

***

### providers?

> `optional` **providers**: `string`

Optional provider descriptions

#### Defined in

[packages/core/src/types.ts:297](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L297)

***

### responseData?

> `optional` **responseData**: [`Content`](Content.md)

Optional response content

#### Defined in

[packages/core/src/types.ts:300](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L300)

***

### recentInteractionsData?

> `optional` **recentInteractionsData**: [`Memory`](Memory.md)[]

Optional recent interaction objects

#### Defined in

[packages/core/src/types.ts:303](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L303)

***

### recentInteractions?

> `optional` **recentInteractions**: `string`

Optional recent interactions string

#### Defined in

[packages/core/src/types.ts:306](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L306)

***

### formattedConversation?

> `optional` **formattedConversation**: `string`

Optional formatted conversation

#### Defined in

[packages/core/src/types.ts:309](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L309)

***

### knowledge?

> `optional` **knowledge**: `string`

Optional formatted knowledge

#### Defined in

[packages/core/src/types.ts:312](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L312)

***

### knowledgeData?

> `optional` **knowledgeData**: [`KnowledgeItem`](../type-aliases/KnowledgeItem.md)[]

Optional knowledge data

#### Defined in

[packages/core/src/types.ts:314](https://github.com/monilpat/eliza/blob/main/packages/core/src/types.ts#L314)
