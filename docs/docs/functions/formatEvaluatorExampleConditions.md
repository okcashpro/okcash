---
id: "formatEvaluatorExampleConditions"
title: "Function: formatEvaluatorExampleConditions"
sidebar_label: "formatEvaluatorExampleConditions"
sidebar_position: 0
custom_edit_url: null
---

▸ **formatEvaluatorExampleConditions**(`evaluators`): `string`

Generates a string describing the conditions under which each evaluator example is relevant.

#### Parameters

| Name         | Type                                        | Description                                              |
| :----------- | :------------------------------------------ | :------------------------------------------------------- |
| `evaluators` | [`Evaluator`](../interfaces/Evaluator.md)[] | An array of evaluator objects, each containing examples. |

#### Returns

`string`

A string that describes the conditions for each evaluator example, formatted with the evaluator name, example number, and condition.
