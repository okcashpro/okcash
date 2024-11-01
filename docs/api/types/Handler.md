---
id: "Handler"
title: "Type alias: Handler"
sidebar_label: "Handler"
sidebar_position: 0
custom_edit_url: null
---

Ƭ **Handler**: (`runtime`: [`BgentRuntime`](../classes/BgentRuntime.md), `message`: [`Message`](../interfaces/Message.md), `state?`: [`State`](../interfaces/State.md), `options?`: \{ `[key: string]`: `unknown`;  }) => `Promise`\<`unknown`\>

Represents the type of a handler function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to any type.

#### Type declaration

▸ (`runtime`, `message`, `state?`, `options?`): `Promise`\<`unknown`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `runtime` | [`BgentRuntime`](../classes/BgentRuntime.md) |
| `message` | [`Message`](../interfaces/Message.md) |
| `state?` | [`State`](../interfaces/State.md) |
| `options?` | `Object` |

##### Returns

`Promise`\<`unknown`\>
