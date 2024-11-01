---
id: "Validator"
title: "Type alias: Validator"
sidebar_label: "Validator"
sidebar_position: 0
custom_edit_url: null
---

Ƭ **Validator**: (`runtime`: [`AgentRuntime`](../classes/AgentRuntime.md), `message`: [`Message`](../interfaces/Message.md), `state?`: [`State`](../interfaces/State.md)) => `Promise`\<`boolean`\>

Represents the type of a validator function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to a boolean indicating whether the validation passed.

#### Type declaration

▸ (`runtime`, `message`, `state?`): `Promise`\<`boolean`\>

##### Parameters

| Name      | Type                                         |
| :-------- | :------------------------------------------- |
| `runtime` | [`AgentRuntime`](../classes/AgentRuntime.md) |
| `message` | [`Message`](../interfaces/Message.md)        |
| `state?`  | [`State`](../interfaces/State.md)            |

##### Returns

`Promise`\<`boolean`\>
