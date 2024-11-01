---
id: "getLore"
title: "Function: getLore"
sidebar_label: "getLore"
sidebar_position: 0
custom_edit_url: null
---

▸ **getLore**(`params`): `Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

Retrieves lore from the lore database based on a search query. This function uses embedding to find similar lore entries.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `params` | `Object` | `undefined` | The parameters for retrieving lore. |
| `params.count?` | `number` | `undefined` | The maximum number of lore entries to retrieve. |
| `params.match_threshold?` | `number` | `undefined` | The similarity threshold for matching lore entries, lower values mean more strict matching. |
| `params.message` | `string` | `undefined` | The search query message to find relevant lore. |
| `params.room_id?` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | `zeroUuid` | - |
| `params.runtime` | [`BgentRuntime`](../classes/BgentRuntime.md) | `undefined` | The runtime environment of the agent. |

#### Returns

`Promise`\<[`Memory`](../interfaces/Memory.md)[]\>

A promise that resolves to an array of lore entries that match the search query.
