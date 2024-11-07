# Function: composeActionExamples()

> **composeActionExamples**(`actionsData`, `count`): `string`

Composes a set of example conversations based on provided actions and a specified count.
It randomly selects examples from the provided actions and formats them with generated names.

## Parameters

• **actionsData**: [`Action`](../interfaces/Action.md)[]

An array of `Action` objects from which to draw examples.

• **count**: `number`

The number of examples to generate.

## Returns

`string`

A string containing formatted examples of conversations.

## Defined in

[core/src/core/actions.ts:18](https://github.com/ai16z/eliza/blob/c537cb3e848b54fcb914d8ef84924fa5fdeaec66/core/src/core/actions.ts#L18)
