---
id: "composeActionExamples"
title: "Function: composeActionExamples"
sidebar_label: "composeActionExamples"
sidebar_position: 0
custom_edit_url: null
---

▸ **composeActionExamples**(`actionsData`, `count`): `string`

Composes a set of example conversations based on provided actions and a specified count.
It randomly selects examples from the provided actions and formats them with generated names.

#### Parameters

| Name          | Type                                  | Description                                               |
| :------------ | :------------------------------------ | :-------------------------------------------------------- |
| `actionsData` | [`Action`](../interfaces/Action.md)[] | An array of `Action` objects from which to draw examples. |
| `count`       | `number`                              | The number of examples to generate.                       |

#### Returns

`string`

A string containing formatted examples of conversations.
