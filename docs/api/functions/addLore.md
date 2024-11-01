---
id: "addLore"
title: "Function: addLore"
sidebar_label: "addLore"
sidebar_position: 0
custom_edit_url: null
---

▸ **addLore**(`params`): `Promise`\<`void`\>

Adds a piece of lore to the lore database. Lore can include static information like documents, historical facts, game lore, etc.

#### Parameters

| Name                   | Type                                                       | Default value | Description                                                                 |
| :--------------------- | :--------------------------------------------------------- | :------------ | :-------------------------------------------------------------------------- |
| `params`               | `Object`                                                   | `undefined`   | The parameters for adding lore.                                             |
| `params.content`       | [`Content`](../interfaces/Content.md)                      | `undefined`   | The actual content of the lore.                                             |
| `params.embedContent?` | [`Content`](../interfaces/Content.md)                      | `undefined`   | Optional content used to generate an embedding if different from `content`. |
| `params.room_id?`      | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | `zeroUuid`    | The room ID associated with the lore, defaults to a zero UUID.              |
| `params.runtime`       | [`AgentRuntime`](../classes/AgentRuntime.md)               | `undefined`   | The runtime environment of the agent.                                       |
| `params.source`        | `string`                                                   | `undefined`   | The source of the lore content.                                             |
| `params.user_id?`      | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | `zeroUuid`    | The user ID associated with the lore, defaults to a zero UUID.              |

#### Returns

`Promise`\<`void`\>

A promise that resolves when the lore has been added successfully.
