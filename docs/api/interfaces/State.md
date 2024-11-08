# Interface: State

Represents the state of the conversation or context in which the agent is operating, including information about users, messages, goals, and other relevant data.

## Indexable

 \[`key`: `string`\]: `unknown`

## Properties

### userId?

> `optional` **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:131](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L131)

***

### agentId?

> `optional` **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:132](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L132)

***

### bio

> **bio**: `string`

#### Defined in

[packages/core/src/core/types.ts:133](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L133)

***

### lore

> **lore**: `string`

#### Defined in

[packages/core/src/core/types.ts:134](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L134)

***

### messageDirections

> **messageDirections**: `string`

#### Defined in

[packages/core/src/core/types.ts:135](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L135)

***

### postDirections

> **postDirections**: `string`

#### Defined in

[packages/core/src/core/types.ts:136](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L136)

***

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/core/types.ts:137](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L137)

***

### agentName?

> `optional` **agentName**: `string`

#### Defined in

[packages/core/src/core/types.ts:138](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L138)

***

### senderName?

> `optional` **senderName**: `string`

#### Defined in

[packages/core/src/core/types.ts:139](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L139)

***

### actors

> **actors**: `string`

#### Defined in

[packages/core/src/core/types.ts:140](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L140)

***

### actorsData?

> `optional` **actorsData**: [`Actor`](Actor.md)[]

#### Defined in

[packages/core/src/core/types.ts:141](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L141)

***

### goals?

> `optional` **goals**: `string`

#### Defined in

[packages/core/src/core/types.ts:142](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L142)

***

### goalsData?

> `optional` **goalsData**: [`Goal`](Goal.md)[]

#### Defined in

[packages/core/src/core/types.ts:143](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L143)

***

### recentMessages

> **recentMessages**: `string`

#### Defined in

[packages/core/src/core/types.ts:144](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L144)

***

### recentMessagesData

> **recentMessagesData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/core/types.ts:145](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L145)

***

### recentFacts?

> `optional` **recentFacts**: `string`

#### Defined in

[packages/core/src/core/types.ts:146](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L146)

***

### recentFactsData?

> `optional` **recentFactsData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/core/types.ts:147](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L147)

***

### relevantFacts?

> `optional` **relevantFacts**: `string`

#### Defined in

[packages/core/src/core/types.ts:148](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L148)

***

### relevantFactsData?

> `optional` **relevantFactsData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/core/types.ts:149](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L149)

***

### actionNames?

> `optional` **actionNames**: `string`

#### Defined in

[packages/core/src/core/types.ts:150](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L150)

***

### actions?

> `optional` **actions**: `string`

#### Defined in

[packages/core/src/core/types.ts:151](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L151)

***

### actionsData?

> `optional` **actionsData**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/core/types.ts:152](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L152)

***

### actionExamples?

> `optional` **actionExamples**: `string`

#### Defined in

[packages/core/src/core/types.ts:153](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L153)

***

### providers?

> `optional` **providers**: `string`

#### Defined in

[packages/core/src/core/types.ts:154](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L154)

***

### responseData?

> `optional` **responseData**: [`Content`](Content.md)

#### Defined in

[packages/core/src/core/types.ts:155](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L155)

***

### recentInteractionsData?

> `optional` **recentInteractionsData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/core/types.ts:156](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L156)

***

### recentInteractions?

> `optional` **recentInteractions**: `string`

#### Defined in

[packages/core/src/core/types.ts:157](https://github.com/ai16z/eliza/blob/main/packages/core/src/core/types.ts#L157)
