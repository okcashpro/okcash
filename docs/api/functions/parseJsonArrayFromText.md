---
id: "parseJsonArrayFromText"
title: "Function: parseJsonArrayFromText"
sidebar_label: "parseJsonArrayFromText"
sidebar_position: 0
custom_edit_url: null
---

▸ **parseJsonArrayFromText**(`text`): `null` \| `any`[]

Parses a JSON array from a given text. The function looks for a JSON block wrapped in triple backticks
with `json` language identifier, and if not found, it searches for an array pattern within the text.
It then attempts to parse the JSON string into a JavaScript object. If parsing is successful and the result
is an array, it returns the array; otherwise, it returns null.

#### Parameters

| Name   | Type     | Description                                                    |
| :----- | :------- | :------------------------------------------------------------- |
| `text` | `string` | The input text from which to extract and parse the JSON array. |

#### Returns

`null` \| `any`[]

An array parsed from the JSON string if successful; otherwise, null.
