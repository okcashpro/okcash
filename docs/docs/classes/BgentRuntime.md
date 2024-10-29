---
id: "BgentRuntime"
title: "Class: BgentRuntime"
sidebar_label: "BgentRuntime"
sidebar_position: 0
custom_edit_url: null
---

Represents the runtime environment for an agent, handling message processing,
action registration, and interaction with external services like OpenAI and Supabase.

## Constructors

### constructor

• **new BgentRuntime**(`opts`): [`BgentRuntime`](BgentRuntime.md)

Creates an instance of BgentRuntime.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` | The options for configuring the BgentRuntime. |
| `opts.actions?` | [`Action`](../interfaces/Action.md)[] | Optional custom actions. |
| `opts.agentId?` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | Optional ID of the agent. |
| `opts.conversationLength?` | `number` | The number of messages to hold in the recent message cache. |
| `opts.databaseAdapter` | [`DatabaseAdapter`](DatabaseAdapter.md) | The database adapter used for interacting with the database. |
| `opts.debugMode?` | `boolean` | If true, debug messages will be logged. |
| `opts.embeddingModel?` | `string` | The model to use for embedding. |
| `opts.evaluators?` | [`Evaluator`](../interfaces/Evaluator.md)[] | Optional custom evaluators. |
| `opts.fetch?` | `unknown` | Custom fetch function to use for making requests. |
| `opts.model?` | `string` | The model to use for completion. |
| `opts.providers?` | [`Provider`](../interfaces/Provider.md)[] | Optional context providers. |
| `opts.serverUrl?` | `string` | The URL of the worker. |
| `opts.token` | `string` | The JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker. |

#### Returns

[`BgentRuntime`](BgentRuntime.md)

## Properties

### actions

• **actions**: [`Action`](../interfaces/Action.md)[] = `[]`

Custom actions that the agent can perform.

___

### agentId

• **agentId**: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` = `zeroUuid`

The ID of the agent

___

### databaseAdapter

• **databaseAdapter**: [`DatabaseAdapter`](DatabaseAdapter.md)

The database adapter used for interacting with the database.

___

### debugMode

• **debugMode**: `boolean`

Indicates if debug messages should be logged.

___

### descriptionManager

• **descriptionManager**: [`MemoryManager`](MemoryManager.md)

Store and recall descriptions of users based on conversations.

___

### embeddingModel

• **embeddingModel**: `string` = `"text-embedding-3-small"`

The model to use for embedding.

___

### evaluators

• **evaluators**: [`Evaluator`](../interfaces/Evaluator.md)[] = `[]`

Evaluators used to assess and guide the agent's responses.

___

### factManager

• **factManager**: [`MemoryManager`](MemoryManager.md)

Manage the fact and recall of facts.

___

### fetch

• **fetch**: (`input`: `RequestInfo` \| `URL`, `init?`: `RequestInit`\<`CfProperties`\<`unknown`\>\>) => `Promise`\<`Response`\>(`input`: `RequestInfo`, `init?`: `RequestInit`\<`CfProperties`\<`unknown`\>\>) => `Promise`\<`Response`\>(`input`: `RequestInfo`, `init?`: `RequestInit`\<`RequestInitCfProperties`\>) => `Promise`\<`Response`\> = `fetch`

Fetch function to use
Some environments may not have access to the global fetch function and need a custom fetch override.

#### Type declaration

▸ (`input`, `init?`): `Promise`\<`Response`\>

Fetch function to use
Some environments may not have access to the global fetch function and need a custom fetch override.

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` \| `URL` |
| `init?` | `RequestInit`\<`CfProperties`\<`unknown`\>\> |

##### Returns

`Promise`\<`Response`\>

▸ (`input`, `init?`): `Promise`\<`Response`\>

Fetch function to use
Some environments may not have access to the global fetch function and need a custom fetch override.

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit`\<`CfProperties`\<`unknown`\>\> |

##### Returns

`Promise`\<`Response`\>

▸ (`input`, `init?`): `Promise`\<`Response`\>

Fetch function to use
Some environments may not have access to the global fetch function and need a custom fetch override.

##### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `RequestInfo` |
| `init?` | `RequestInit`\<`RequestInitCfProperties`\> |

##### Returns

`Promise`\<`Response`\>

___

### loreManager

• **loreManager**: [`MemoryManager`](MemoryManager.md)

Manage the creation and recall of static information (documents, historical game lore, etc)

___

### messageManager

• **messageManager**: [`MemoryManager`](MemoryManager.md)

Store messages that are sent and received by the agent.

___

### model

• **model**: `string` = `"gpt-3.5-turbo-0125"`

The model to use for completion.

___

### providers

• **providers**: [`Provider`](../interfaces/Provider.md)[] = `[]`

Context providers used to provide context for message generation.

___

### serverUrl

• **serverUrl**: `string` = `"http://localhost:7998"`

The base URL of the server where the agent's requests are processed.

___

### token

• **token**: ``null`` \| `string`

Authentication token used for securing requests.

## Methods

### completion

▸ **completion**(`opts`): `Promise`\<`string`\>

Send a message to the OpenAI API for completion.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `opts` | `Object` | `undefined` | The options for the completion request. |
| `opts.context` | `undefined` \| `string` | `""` | The context of the message to be completed. |
| `opts.frequency_penalty` | `undefined` \| `number` | `0.0` | The frequency penalty to apply to the completion. |
| `opts.model` | `undefined` \| `string` | `undefined` | The model to use for completion. |
| `opts.presence_penalty` | `undefined` \| `number` | `0.0` | The presence penalty to apply to the completion. |
| `opts.stop` | `undefined` \| `never`[] | `[]` | A list of strings to stop the completion at. |
| `opts.temperature` | `undefined` \| `number` | `0.7` | The temperature to apply to the completion. |

#### Returns

`Promise`\<`string`\>

The completed message.

___

### composeState

▸ **composeState**(`message`, `additionalKeys?`): `Promise`\<\{ `actionConditions`: `string` ; `actionExamples`: `string` ; `actionNames`: `string` ; `actions`: `string` ; `actors`: `string` ; `actorsData`: [`Actor`](../interfaces/Actor.md)[] ; `agentId`: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` ; `agentName`: `undefined` \| `string` ; `evaluatorConditions`: `string` ; `evaluatorExamples`: `string` ; `evaluatorNames`: `string` ; `evaluators`: `string` ; `evaluatorsData`: [`Evaluator`](../interfaces/Evaluator.md)[] ; `goals`: `string` ; `goalsData`: [`Goal`](../interfaces/Goal.md)[] ; `lore`: `string` ; `loreData`: [`Memory`](../interfaces/Memory.md)[] ; `providers`: `string` ; `recentFacts`: `string` ; `recentFactsData`: [`Memory`](../interfaces/Memory.md)[] ; `recentMessages`: `string` ; `recentMessagesData`: [`Memory`](../interfaces/Memory.md)[] ; `relevantFacts`: `string` ; `relevantFactsData`: [`Memory`](../interfaces/Memory.md)[] ; `room_id`: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` ; `senderName`: `undefined` \| `string`  }\>

Compose the state of the agent into an object that can be passed or used for response generation.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `message` | [`Message`](../interfaces/Message.md) | The message to compose the state from. |
| `additionalKeys` | `Object` | - |

#### Returns

`Promise`\<\{ `actionConditions`: `string` ; `actionExamples`: `string` ; `actionNames`: `string` ; `actions`: `string` ; `actors`: `string` ; `actorsData`: [`Actor`](../interfaces/Actor.md)[] ; `agentId`: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` ; `agentName`: `undefined` \| `string` ; `evaluatorConditions`: `string` ; `evaluatorExamples`: `string` ; `evaluatorNames`: `string` ; `evaluators`: `string` ; `evaluatorsData`: [`Evaluator`](../interfaces/Evaluator.md)[] ; `goals`: `string` ; `goalsData`: [`Goal`](../interfaces/Goal.md)[] ; `lore`: `string` ; `loreData`: [`Memory`](../interfaces/Memory.md)[] ; `providers`: `string` ; `recentFacts`: `string` ; `recentFactsData`: [`Memory`](../interfaces/Memory.md)[] ; `recentMessages`: `string` ; `recentMessagesData`: [`Memory`](../interfaces/Memory.md)[] ; `relevantFacts`: `string` ; `relevantFactsData`: [`Memory`](../interfaces/Memory.md)[] ; `room_id`: \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` ; `senderName`: `undefined` \| `string`  }\>

The state of the agent.

___

### embed

▸ **embed**(`input`): `Promise`\<`number`[]\>

Send a message to the OpenAI API for embedding.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `string` | The input to be embedded. |

#### Returns

`Promise`\<`number`[]\>

The embedding of the input.

___

### ensureParticipantExists

▸ **ensureParticipantExists**(`user_id`, `room_id`): `Promise`\<`void`\>

Ensure the existence of a participant in the room. If the participant does not exist, they are added to the room.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `user_id` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | The user ID to ensure the existence of. |
| `room_id` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | - |

#### Returns

`Promise`\<`void`\>

**`Throws`**

An error if the participant cannot be added.

___

### ensureRoomExists

▸ **ensureRoomExists**(`user_id`, `room_id?`): `Promise`\<\`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`\>

Ensure the existence of a room between the agent and a user. If no room exists, a new room is created and the user
and agent are added as participants. The room ID is returned.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `user_id` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | The user ID to create a room with. |
| `room_id?` | \`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\` | - |

#### Returns

`Promise`\<\`$\{string}-$\{string}-$\{string}-$\{string}-$\{string}\`\>

The room ID of the room between the agent and the user.

**`Throws`**

An error if the room cannot be created.

___

### evaluate

▸ **evaluate**(`message`, `state?`): `Promise`\<`string`[]\>

Evaluate the message and state using the registered evaluators.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `message` | [`Message`](../interfaces/Message.md) | The message to evaluate. |
| `state?` | [`State`](../interfaces/State.md) | The state of the agent. |

#### Returns

`Promise`\<`string`[]\>

The results of the evaluation.

___

### getConversationLength

▸ **getConversationLength**(): `number`

Get the number of messages that are kept in the conversation buffer.

#### Returns

`number`

The number of recent messages to be kept in memory.

___

### processActions

▸ **processActions**(`message`, `content`, `state?`): `Promise`\<`unknown`\>

Process the actions of a message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `message` | [`Message`](../interfaces/Message.md) | The message to process. |
| `content` | [`Content`](../interfaces/Content.md) | The content of the message to process actions from. |
| `state?` | [`State`](../interfaces/State.md) | - |

#### Returns

`Promise`\<`unknown`\>

___

### registerAction

▸ **registerAction**(`action`): `void`

Register an action for the agent to perform.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `action` | [`Action`](../interfaces/Action.md) | The action to register. |

#### Returns

`void`

___

### registerContextProvider

▸ **registerContextProvider**(`provider`): `void`

Register a context provider to provide context for message generation.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `provider` | [`Provider`](../interfaces/Provider.md) | The context provider to register. |

#### Returns

`void`

___

### registerEvaluator

▸ **registerEvaluator**(`evaluator`): `void`

Register an evaluator to assess and guide the agent's responses.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `evaluator` | [`Evaluator`](../interfaces/Evaluator.md) | The evaluator to register. |

#### Returns

`void`

___

### retrieveCachedEmbedding

▸ **retrieveCachedEmbedding**(`input`): `Promise`\<``null`` \| `number`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `input` | `string` |

#### Returns

`Promise`\<``null`` \| `number`[]\>
