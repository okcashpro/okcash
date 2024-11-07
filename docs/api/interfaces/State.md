---
id: "State"
title: "Interface: State"
sidebar_label: "State"
sidebar_position: 0
custom_edit_url: null
---

Represents the state of the conversation or context in which the agent is operating, including information about users, messages, goals, and other relevant data.

## Indexable

▪ [key: `string`]: `unknown`

## Properties

### actionExamples

• `Optional` **actionExamples**: `string`

---

### actionNames

• `Optional` **actionNames**: `string`

---

### actions

• `Optional` **actions**: `string`

---

### actionsData

• `Optional` **actionsData**: [`Action`](Action.md)[]

---

### actors

• **actors**: `string`

---

### actorsData

• `Optional` **actorsData**: [`Actor`](Actor.md)[]

---

### agentId

• `Optional` **agentId**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`

---

### agentName

• `Optional` **agentName**: `string`

---

### goals

• `Optional` **goals**: `string`

---

### goalsData

• `Optional` **goalsData**: [`Goal`](Goal.md)[]

---

### providers

• `Optional` **providers**: `string`

---

### recentFacts

• `Optional` **recentFacts**: `string`

---

### recentFactsData

• `Optional` **recentFactsData**: [`Memory`](Memory.md)[]

---

### recentMessages

• **recentMessages**: `string`

---

### recentMessagesData

• **recentMessagesData**: [`Memory`](Memory.md)[]

---

### relevantFacts

• `Optional` **relevantFacts**: `string`

---

### relevantFactsData

• `Optional` **relevantFactsData**: [`Memory`](Memory.md)[]

---

### responseData

• `Optional` **responseData**: [`Content`](Content.md)

---

### room_id

• **room_id**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`

---

### senderName

• `Optional` **senderName**: `string`

---

### user_id

• `Optional` **user_id**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`
