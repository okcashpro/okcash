---
id: "getProviders"
title: "Function: getProviders"
sidebar_label: "getProviders"
sidebar_position: 0
custom_edit_url: null
---

▸ **getProviders**(`runtime`, `message`, `state?`): `Promise`\<`string`\>

Formats provider outputs into a string which can be injected into the context.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `runtime` | [`BgentRuntime`](../classes/BgentRuntime.md) | The Eliza runtime object. |
| `message` | [`Message`](../interfaces/Message.md) | The incoming message object. |
| `state?` | [`State`](../interfaces/State.md) | The current state object. |

#### Returns

`Promise`\<`string`\>

A string that concatenates the outputs of each provider.
