---
id: "Provider"
title: "Interface: Provider"
sidebar_label: "Provider"
sidebar_position: 0
custom_edit_url: null
---

Represents a provider, which is used to retrieve information or perform actions on behalf of the agent, such as fetching data from an external API or service.

## Properties

### get

• **get**: (`runtime`: [`BgentRuntime`](../classes/BgentRuntime.md), `message`: [`Message`](Message.md), `state?`: [`State`](State.md)) => `Promise`\<`unknown`\>

#### Type declaration

▸ (`runtime`, `message`, `state?`): `Promise`\<`unknown`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `runtime` | [`BgentRuntime`](../classes/BgentRuntime.md) |
| `message` | [`Message`](Message.md) |
| `state?` | [`State`](State.md) |

##### Returns

`Promise`\<`unknown`\>
