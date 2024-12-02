[@ai16z/eliza v0.1.4-alpha.3](../index.md) / State

# Interface: State

Represents the current state/context of a conversation

## Indexable

 \[`key`: `string`\]: `unknown`

## Properties

### userId?

> `optional` **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of user who sent current message

#### Defined in

[packages/core/src/types.ts:238](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L238)

***

### agentId?

> `optional` **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

ID of agent in conversation

#### Defined in

[packages/core/src/types.ts:241](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L241)

***

### bio

> **bio**: `string`

Agent's biography

#### Defined in

[packages/core/src/types.ts:244](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L244)

***

### lore

> **lore**: `string`

Agent's background lore

#### Defined in

[packages/core/src/types.ts:247](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L247)

***

### messageDirections

> **messageDirections**: `string`

Message handling directions

#### Defined in

[packages/core/src/types.ts:250](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L250)

***

### postDirections

> **postDirections**: `string`

Post handling directions

#### Defined in

[packages/core/src/types.ts:253](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L253)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Current room/conversation ID

#### Defined in

[packages/core/src/types.ts:256](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L256)

***

### agentName?

> `optional` **agentName**: `string`

Optional agent name

#### Defined in

[packages/core/src/types.ts:259](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L259)

***

### senderName?

> `optional` **senderName**: `string`

Optional message sender name

#### Defined in

[packages/core/src/types.ts:262](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L262)

***

### actors

> **actors**: `string`

String representation of conversation actors

#### Defined in

[packages/core/src/types.ts:265](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L265)

***

### actorsData?

> `optional` **actorsData**: [`Actor`](Actor.md)[]

Optional array of actor objects

#### Defined in

[packages/core/src/types.ts:268](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L268)

***

### goals?

> `optional` **goals**: `string`

Optional string representation of goals

#### Defined in

[packages/core/src/types.ts:271](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L271)

***

### goalsData?

> `optional` **goalsData**: [`Goal`](Goal.md)[]

Optional array of goal objects

#### Defined in

[packages/core/src/types.ts:274](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L274)

***

### recentMessages

> **recentMessages**: `string`

Recent message history as string

#### Defined in

[packages/core/src/types.ts:277](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L277)

***

### recentMessagesData

> **recentMessagesData**: [`Memory`](Memory.md)[]

Recent message objects

#### Defined in

[packages/core/src/types.ts:280](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L280)

***

### actionNames?

> `optional` **actionNames**: `string`

Optional valid action names

#### Defined in

[packages/core/src/types.ts:283](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L283)

***

### actions?

> `optional` **actions**: `string`

Optional action descriptions

#### Defined in

[packages/core/src/types.ts:286](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L286)

***

### actionsData?

> `optional` **actionsData**: [`Action`](Action.md)[]

Optional action objects

#### Defined in

[packages/core/src/types.ts:289](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L289)

***

### actionExamples?

> `optional` **actionExamples**: `string`

Optional action examples

#### Defined in

[packages/core/src/types.ts:292](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L292)

***

### providers?

> `optional` **providers**: `string`

Optional provider descriptions

#### Defined in

[packages/core/src/types.ts:295](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L295)

***

### responseData?

> `optional` **responseData**: [`Content`](Content.md)

Optional response content

#### Defined in

[packages/core/src/types.ts:298](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L298)

***

### recentInteractionsData?

> `optional` **recentInteractionsData**: [`Memory`](Memory.md)[]

Optional recent interaction objects

#### Defined in

[packages/core/src/types.ts:301](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L301)

***

### recentInteractions?

> `optional` **recentInteractions**: `string`

Optional recent interactions string

#### Defined in

[packages/core/src/types.ts:304](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L304)

***

### formattedConversation?

> `optional` **formattedConversation**: `string`

Optional formatted conversation

#### Defined in

[packages/core/src/types.ts:307](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L307)

***

### knowledge?

> `optional` **knowledge**: `string`

Optional formatted knowledge

#### Defined in

[packages/core/src/types.ts:310](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L310)

***

### knowledgeData?

> `optional` **knowledgeData**: [`KnowledgeItem`](../type-aliases/KnowledgeItem.md)[]

Optional knowledge data

#### Defined in

[packages/core/src/types.ts:312](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L312)
