[@ai16z/eliza v0.1.5-alpha.5](../index.md) / Action

# Interface: Action

Represents an action the agent can perform

## Properties

### similes

> **similes**: `string`[]

Similar action descriptions

#### Defined in

[packages/core/src/types.ts:402](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L402)

***

### description

> **description**: `string`

Detailed description

#### Defined in

[packages/core/src/types.ts:405](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L405)

***

### examples

> **examples**: [`ActionExample`](ActionExample.md)[][]

Example usages

#### Defined in

[packages/core/src/types.ts:408](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L408)

***

### handler

> **handler**: [`Handler`](../type-aliases/Handler.md)

Handler function

#### Defined in

[packages/core/src/types.ts:411](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L411)

***

### name

> **name**: `string`

Action name

#### Defined in

[packages/core/src/types.ts:414](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L414)

***

### validate

> **validate**: [`Validator`](../type-aliases/Validator.md)

Validation function

#### Defined in

[packages/core/src/types.ts:417](https://github.com/ai16z/eliza/blob/main/packages/core/src/types.ts#L417)
