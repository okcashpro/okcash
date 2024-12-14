[@ai16z/eliza v0.1.5-alpha.5](../index.md) / State

# Interface: State

Represents the current state/context of a conversation

## Indexable

 \[`key`: `string`\]: `unknown`

## Properties

### userId?

> `optional` **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of user who sent current message

#### Defined in

[packages/core/src/types.ts:246](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L246)

***

### agentId?

> `optional` **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of agent in conversation

#### Defined in

[packages/core/src/types.ts:249](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L249)

***

### bio

> **bio**: `string`

Agent's biography

#### Defined in

[packages/core/src/types.ts:252](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L252)

***

### lore

> **lore**: `string`

Agent's background lore

#### Defined in

[packages/core/src/types.ts:255](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L255)

***

### messageDirections

> **messageDirections**: `string`

Message handling directions

#### Defined in

[packages/core/src/types.ts:258](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L258)

***

### postDirections

> **postDirections**: `string`

Post handling directions

#### Defined in

[packages/core/src/types.ts:261](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L261)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Current room/conversation ID

#### Defined in

[packages/core/src/types.ts:264](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L264)

***

### agentName?

> `optional` **agentName**: `string`

Optional agent name

#### Defined in

[packages/core/src/types.ts:267](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L267)

***

### senderName?

> `optional` **senderName**: `string`

Optional message sender name

#### Defined in

[packages/core/src/types.ts:270](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L270)

***

### actors

> **actors**: `string`

String representation of conversation actors

#### Defined in

[packages/core/src/types.ts:273](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L273)

***

### actorsData?

> `optional` **actorsData**: [`Actor`](Actor.md)[]

Optional array of actor objects

#### Defined in

[packages/core/src/types.ts:276](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L276)

***

### goals?

> `optional` **goals**: `string`

Optional string representation of goals

#### Defined in

[packages/core/src/types.ts:279](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L279)

***

### goalsData?

> `optional` **goalsData**: [`Goal`](Goal.md)[]

Optional array of goal objects

#### Defined in

[packages/core/src/types.ts:282](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L282)

***

### recentMessages

> **recentMessages**: `string`

Recent message history as string

#### Defined in

[packages/core/src/types.ts:285](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L285)

***

### recentMessagesData

> **recentMessagesData**: [`Memory`](Memory.md)[]

Recent message objects

#### Defined in

[packages/core/src/types.ts:288](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L288)

***

### actionNames?

> `optional` **actionNames**: `string`

Optional valid action names

#### Defined in

[packages/core/src/types.ts:291](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L291)

***

### actions?

> `optional` **actions**: `string`

Optional action descriptions

#### Defined in

[packages/core/src/types.ts:294](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L294)

***

### actionsData?

> `optional` **actionsData**: [`Action`](Action.md)[]

Optional action objects

#### Defined in

[packages/core/src/types.ts:297](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L297)

***

### actionExamples?

> `optional` **actionExamples**: `string`

Optional action examples

#### Defined in

[packages/core/src/types.ts:300](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L300)

***

### providers?

> `optional` **providers**: `string`

Optional provider descriptions

#### Defined in

[packages/core/src/types.ts:303](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L303)

***

### responseData?

> `optional` **responseData**: [`Content`](Content.md)

Optional response content

#### Defined in

[packages/core/src/types.ts:306](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L306)

***

### recentInteractionsData?

> `optional` **recentInteractionsData**: [`Memory`](Memory.md)[]

Optional recent interaction objects

#### Defined in

[packages/core/src/types.ts:309](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L309)

***

### recentInteractions?

> `optional` **recentInteractions**: `string`

Optional recent interactions string

#### Defined in

[packages/core/src/types.ts:312](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L312)

***

### formattedConversation?

> `optional` **formattedConversation**: `string`

Optional formatted conversation

#### Defined in

[packages/core/src/types.ts:315](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L315)

***

### knowledge?

> `optional` **knowledge**: `string`

Optional formatted knowledge

#### Defined in

[packages/core/src/types.ts:318](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L318)

***

### knowledgeData?

> `optional` **knowledgeData**: [`KnowledgeItem`](../type-aliases/KnowledgeItem.md)[]

Optional knowledge data

#### Defined in

[packages/core/src/types.ts:320](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L320)
