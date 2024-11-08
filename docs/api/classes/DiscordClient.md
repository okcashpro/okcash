# Class: DiscordClient

## Extends

- `EventEmitter`

## Constructors

### new DiscordClient()

> **new DiscordClient**(`runtime`): [`DiscordClient`](DiscordClient.md)

#### Parameters

• **runtime**: [`IAgentRuntime`](../interfaces/IAgentRuntime.md)

#### Returns

[`DiscordClient`](DiscordClient.md)

#### Overrides

`EventEmitter.constructor`

#### Defined in

[packages/core/src/clients/discord/index.ts:34](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/discord/index.ts#L34)

## Properties

### apiToken

> **apiToken**: `string`

#### Defined in

[packages/core/src/clients/discord/index.ts:27](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/discord/index.ts#L27)

***

### character

> **character**: [`Character`](../type-aliases/Character.md)

#### Defined in

[packages/core/src/clients/discord/index.ts:30](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/discord/index.ts#L30)

## Methods

### handleReactionAdd()

> **handleReactionAdd**(`reaction`, `user`): `Promise`\<`void`\>

#### Parameters

• **reaction**: `MessageReaction`

• **user**: `User`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/clients/discord/index.ts:121](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/discord/index.ts#L121)

***

### handleReactionRemove()

> **handleReactionRemove**(`reaction`, `user`): `Promise`\<`void`\>

#### Parameters

• **reaction**: `MessageReaction`

• **user**: `User`

#### Returns

`Promise`\<`void`\>

#### Defined in

[packages/core/src/clients/discord/index.ts:195](https://github.com/ai16z/eliza/blob/main/packages/core/src/clients/discord/index.ts#L195)
