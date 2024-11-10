# Interface: State

Represents the state of the conversation or context in which the agent is operating, including information about users, messages, goals, and other relevant data.

## Indexable

\[`key`: `string`\]: `unknown`

## Properties

### userId?

> `optional` **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:135](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L135)

---

### agentId?

> `optional` **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:136](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L136)

---

### bio

> **bio**: `string`

#### Defined in

[packages/core/src/types.ts:137](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L137)

---

### lore

> **lore**: `string`

#### Defined in

[packages/core/src/types.ts:138](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L138)

---

### messageDirections

> **messageDirections**: `string`

#### Defined in

[packages/core/src/types.ts:139](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L139)

---

### postDirections

> **postDirections**: `string`

#### Defined in

[packages/core/src/types.ts:140](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L140)

---

### roomId

> **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Defined in

[packages/core/src/types.ts:141](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L141)

---

### agentName?

> `optional` **agentName**: `string`

#### Defined in

[packages/core/src/types.ts:142](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L142)

---

### senderName?

> `optional` **senderName**: `string`

#### Defined in

[packages/core/src/types.ts:143](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L143)

---

### actors

> **actors**: `string`

#### Defined in

[packages/core/src/types.ts:144](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L144)

---

### actorsData?

> `optional` **actorsData**: [`Actor`](Actor.md)[]

#### Defined in

[packages/core/src/types.ts:145](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L145)

---

### goals?

> `optional` **goals**: `string`

#### Defined in

[packages/core/src/types.ts:146](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L146)

---

### goalsData?

> `optional` **goalsData**: [`Goal`](Goal.md)[]

#### Defined in

[packages/core/src/types.ts:147](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L147)

---

### recentMessages

> **recentMessages**: `string`

#### Defined in

[packages/core/src/types.ts:148](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L148)

---

### recentMessagesData

> **recentMessagesData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/types.ts:149](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L149)

---

### actionNames?

> `optional` **actionNames**: `string`

#### Defined in

[packages/core/src/types.ts:150](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L150)

---

### actions?

> `optional` **actions**: `string`

#### Defined in

[packages/core/src/types.ts:151](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L151)

---

### actionsData?

> `optional` **actionsData**: [`Action`](Action.md)[]

#### Defined in

[packages/core/src/types.ts:152](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L152)

---

### actionExamples?

> `optional` **actionExamples**: `string`

#### Defined in

[packages/core/src/types.ts:153](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L153)

---

### providers?

> `optional` **providers**: `string`

#### Defined in

[packages/core/src/types.ts:154](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L154)

---

### responseData?

> `optional` **responseData**: [`Content`](Content.md)

#### Defined in

[packages/core/src/types.ts:155](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L155)

---

### recentInteractionsData?

> `optional` **recentInteractionsData**: [`Memory`](Memory.md)[]

#### Defined in

[packages/core/src/types.ts:156](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L156)

---

### recentInteractions?

> `optional` **recentInteractions**: `string`

#### Defined in

[packages/core/src/types.ts:157](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L157)
