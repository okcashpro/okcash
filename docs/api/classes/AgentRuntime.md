# Class: AgentRuntime

Represents the runtime environment for an agent, handling message processing,
action registration, and interaction with external services like OpenAI and Supabase.

## Implements

- `IAgentRuntime`

## Constructors

### new AgentRuntime()

> **new AgentRuntime**(`opts`): [`AgentRuntime`](AgentRuntime.md)

Creates an instance of AgentRuntime.

#### Parameters

• **opts**

The options for configuring the AgentRuntime.

• **opts.actions?**: [`Action`](../interfaces/Action.md)[]

Optional custom actions.

• **opts.agentId?**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

Optional ID of the agent.

• **opts.character?**: `Character`

• **opts.conversationLength?**: `number`

The number of messages to hold in the recent message cache.

• **opts.databaseAdapter**: `IDatabaseAdapter`

The database adapter used for interacting with the database.

• **opts.evaluators?**: [`Evaluator`](../interfaces/Evaluator.md)[]

Optional custom evaluators.

• **opts.fetch?**: `unknown`

Custom fetch function to use for making requests.

• **opts.imageGenModel?**: `ImageGenModel`

• **opts.modelProvider**: `ModelProvider`

• **opts.providers?**: [`Provider`](../interfaces/Provider.md)[]

Optional context providers.

• **opts.serverUrl?**: `string`

The URL of the worker.

• **opts.speechModelPath?**: `string`

• **opts.token**: `string`

The JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker.

#### Returns

[`AgentRuntime`](AgentRuntime.md)

## Properties

### actions

> **actions**: [`Action`](../interfaces/Action.md)[] = `[]`

Custom actions that the agent can perform.

#### Implementation of

`IAgentRuntime.actions`

***

### agentId

> **agentId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The ID of the agent

#### Implementation of

`IAgentRuntime.agentId`

***

### character

> **character**: `Character`

The character to use for the agent

#### Implementation of

`IAgentRuntime.character`

***

### databaseAdapter

> **databaseAdapter**: `IDatabaseAdapter`

The database adapter used for interacting with the database.

#### Implementation of

`IAgentRuntime.databaseAdapter`

***

### descriptionManager

> **descriptionManager**: `IMemoryManager`

Store and recall descriptions of users based on conversations.

#### Implementation of

`IAgentRuntime.descriptionManager`

***

### documentsManager

> **documentsManager**: `IMemoryManager`

Hold large documents that can be referenced

***

### evaluators

> **evaluators**: [`Evaluator`](../interfaces/Evaluator.md)[] = `[]`

Evaluators used to assess and guide the agent's responses.

***

### factManager

> **factManager**: `IMemoryManager`

Manage the fact and recall of facts.

#### Implementation of

`IAgentRuntime.factManager`

***

### fetch()

> **fetch**: (`input`, `init`?) => `Promise`\<`Response`\>(`input`, `init`?) => `Promise`\<`Response`\>

Fetch function to use
Some environments may not have access to the global fetch function and need a custom fetch override.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/fetch)

#### Parameters

• **input**: `RequestInfo` \| `URL`

• **init?**: `RequestInit`

#### Returns

`Promise`\<`Response`\>

#### Parameters

• **input**: `string` \| `Request` \| `URL`

• **init?**: `RequestInit`

#### Returns

`Promise`\<`Response`\>

***

### fragmentsManager

> **fragmentsManager**: `IMemoryManager`

Searchable document fragments

***

### imageGenModel

> **imageGenModel**: `ImageGenModel` = `ImageGenModel.TogetherAI`

The model to use for image generation.

#### Implementation of

`IAgentRuntime.imageGenModel`

***

### llamaService

> **llamaService**: `LlamaService` = `null`

Local Llama if no OpenAI key is present

#### Implementation of

`IAgentRuntime.llamaService`

***

### loreManager

> **loreManager**: `IMemoryManager`

Manage the creation and recall of static information (documents, historical game lore, etc)

#### Implementation of

`IAgentRuntime.loreManager`

***

### messageManager

> **messageManager**: `IMemoryManager`

Store messages that are sent and received by the agent.

#### Implementation of

`IAgentRuntime.messageManager`

***

### modelProvider

> **modelProvider**: `ModelProvider` = `ModelProvider.LLAMALOCAL`

The model to use for generateText.

#### Implementation of

`IAgentRuntime.modelProvider`

***

### providers

> **providers**: [`Provider`](../interfaces/Provider.md)[] = `[]`

Context providers used to provide context for message generation.

#### Implementation of

`IAgentRuntime.providers`

***

### serverUrl

> **serverUrl**: `string` = `"http://localhost:7998"`

The base URL of the server where the agent's requests are processed.

#### Implementation of

`IAgentRuntime.serverUrl`

***

### token

> **token**: `string`

Authentication token used for securing requests.

#### Implementation of

`IAgentRuntime.token`

## Methods

### composeState()

> **composeState**(`message`, `additionalKeys`): `Promise`\<[`State`](../interfaces/State.md)\>

Compose the state of the agent into an object that can be passed or used for response generation.

#### Parameters

• **message**: [`Memory`](../interfaces/Memory.md)

The message to compose the state from.

• **additionalKeys** = `{}`

#### Returns

`Promise`\<[`State`](../interfaces/State.md)\>

The state of the agent.

#### Implementation of

`IAgentRuntime.composeState`

***

### ensureParticipantExists()

> **ensureParticipantExists**(`userId`, `roomId`): `Promise`\<`void`\>

Ensure the existence of a participant in the room. If the participant does not exist, they are added to the room.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The user ID to ensure the existence of.

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

#### Throws

An error if the participant cannot be added.

#### Implementation of

`IAgentRuntime.ensureParticipantExists`

***

### ensureRoomExists()

> **ensureRoomExists**(`roomId`): `Promise`\<`void`\>

Ensure the existence of a room between the agent and a user. If no room exists, a new room is created and the user
and agent are added as participants. The room ID is returned.

#### Parameters

• **roomId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

#### Returns

`Promise`\<`void`\>

The room ID of the room between the agent and the user.

#### Throws

An error if the room cannot be created.

#### Implementation of

`IAgentRuntime.ensureRoomExists`

***

### ensureUserExists()

> **ensureUserExists**(`userId`, `userName`, `name`, `email`?, `source`?): `Promise`\<`void`\>

Ensure the existence of a user in the database. If the user does not exist, they are added to the database.

#### Parameters

• **userId**: \`$\{string\}-$\{string\}-$\{string\}-$\{string\}-$\{string\}\`

The user ID to ensure the existence of.

• **userName**: `string`

The user name to ensure the existence of.

• **name**: `string`

• **email?**: `string`

• **source?**: `string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`IAgentRuntime.ensureUserExists`

***

### evaluate()

> **evaluate**(`message`, `state`?): `Promise`\<`string`[]\>

Evaluate the message and state using the registered evaluators.

#### Parameters

• **message**: [`Memory`](../interfaces/Memory.md)

The message to evaluate.

• **state?**: [`State`](../interfaces/State.md)

The state of the agent.

#### Returns

`Promise`\<`string`[]\>

The results of the evaluation.

#### Implementation of

`IAgentRuntime.evaluate`

***

### getConversationLength()

> **getConversationLength**(): `number`

Get the number of messages that are kept in the conversation buffer.

#### Returns

`number`

The number of recent messages to be kept in memory.

#### Implementation of

`IAgentRuntime.getConversationLength`

***

### processActions()

> **processActions**(`message`, `responses`, `state`?, `callback`?): `Promise`\<`void`\>

Process the actions of a message.

#### Parameters

• **message**: [`Memory`](../interfaces/Memory.md)

The message to process.

• **responses**: [`Memory`](../interfaces/Memory.md)[]

• **state?**: [`State`](../interfaces/State.md)

• **callback?**: `HandlerCallback`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`IAgentRuntime.processActions`

***

### registerAction()

> **registerAction**(`action`): `void`

Register an action for the agent to perform.

#### Parameters

• **action**: [`Action`](../interfaces/Action.md)

The action to register.

#### Returns

`void`

#### Implementation of

`IAgentRuntime.registerAction`

***

### registerContextProvider()

> **registerContextProvider**(`provider`): `void`

Register a context provider to provide context for message generation.

#### Parameters

• **provider**: [`Provider`](../interfaces/Provider.md)

The context provider to register.

#### Returns

`void`

***

### registerEvaluator()

> **registerEvaluator**(`evaluator`): `void`

Register an evaluator to assess and guide the agent's responses.

#### Parameters

• **evaluator**: [`Evaluator`](../interfaces/Evaluator.md)

The evaluator to register.

#### Returns

`void`
