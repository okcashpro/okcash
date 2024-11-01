---
id: "formatEvaluatorExamples"
title: "Function: formatEvaluatorExamples"
sidebar_label: "formatEvaluatorExamples"
sidebar_position: 0
custom_edit_url: null
---

▸ **formatEvaluatorExamples**(`evaluators`): `string`

Formats evaluator examples into a readable string, replacing placeholders with generated names.

#### Parameters

| Name         | Type                                        | Description                                                        |
| :----------- | :------------------------------------------ | :----------------------------------------------------------------- |
| `evaluators` | [`Evaluator`](../interfaces/Evaluator.md)[] | An array of evaluator objects, each containing examples to format. |

#### Returns

`string`

A string that presents each evaluator example in a structured format, including context, messages, and outcomes, with placeholders replaced by generated names.
