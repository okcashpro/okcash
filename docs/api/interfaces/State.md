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

___

### actionNames

• `Optional` **actionNames**: `string`

___

### actions

• `Optional` **actions**: `string`

___

### actionsData

• `Optional` **actionsData**: [`Action`](Action.md)[]

___

### actors

• **actors**: `string`

___

### actorsData

• `Optional` **actorsData**: [`Actor`](Actor.md)[]

___

### agentId

• `Optional` **agentId**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`

___

### agentName

• `Optional` **agentName**: `string`

___

### goals

• `Optional` **goals**: `string`

___

### goalsData

• `Optional` **goalsData**: [`Goal`](Goal.md)[]

___

### providers

• `Optional` **providers**: `string`

___

### recentFacts

• `Optional` **recentFacts**: `string`

___

### recentFactsData

• `Optional` **recentFactsData**: [`Memory`](Memory.md)[]

___

### recentMessages

• **recentMessages**: `string`

___

### recentMessagesData

• **recentMessagesData**: [`Memory`](Memory.md)[]

___

### relevantFacts

• `Optional` **relevantFacts**: `string`

___

### relevantFactsData

• `Optional` **relevantFactsData**: [`Memory`](Memory.md)[]

___

### responseData

• `Optional` **responseData**: [`Content`](Content.md)

___

### room\_id

• **room\_id**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`

___

### senderName

• `Optional` **senderName**: `string`

___

### user\_id

• `Optional` **user\_id**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`
